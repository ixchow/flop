//Define some properties on engine:
//engine.Tick controls how often the fixed-step update ('tick()') is called:
engine.Tick = 1.0 / 60.0;

//engine.DesiredAspect controls what sizes the game's canvas can take on:
//engine.DesiredAspect = {x:16, y:9}; //be exactly this aspect ratio
engine.DesiredAspect = undefined; //fill the #game div
//engine.DesiredAspect = [{x:1, y:2}, {x:4,y:3}]; //pick whichever aspect ratio fits best

//engine.Size is read-only and reflects the current size of the canvas:
var Size = {x:NaN, y:NaN};
Object.defineProperty(engine, "Size", {
	configurable:false, enumerable:true,
	get:function(){ return Size; }
});


//engine.CurrentScene is the scene all events are sent to:
var CurrentScene = null;
Object.defineProperty(engine, "CurrentScene", {
	configurable:false,
	enumerable:true,
	get:function(){ return CurrentScene; },
	set:function(val){
		if (CurrentScene !== null) {
			CurrentScene.leave && CurrentScene.leave();
		}
		CurrentScene = val;
		if (CurrentScene !== null) {
			CurrentScene.enter && CurrentScene.enter();
		}
	}
});

//----------------------------------------------------

exports.init = function(onstart) {
	//engine.music.init();
	//engine.sfx.init();
	//engine.text.init();

	//--------------------------
	//initialize canvas and WebGL:
	var canvas = document.getElementById("canvas");

	canvas.onmousemove = engine.mouse.move;
	canvas.onmousedown = engine.mouse.down;
	canvas.onmouseup = engine.mouse.up;

	window.addEventListener('keydown', function(e) {
		CurrentScene && CurrentScene.keydown && CurrentScene.keydown(e);
	});

	//based on:
	// https://developer.mozilla.org/en-US/docs/WebGL/Getting_started_with_WebGL

	window.gl = null;
	try {
		var attribs = {};
		attribs.antialias = false;
		gl = canvas.getContext("webgl", attribs) || canvas.getcontext("experimental-webgl", attribs);
	}
	catch(e) {
		console.log("Exception creating webgl context: " + e);
	}

	if (!gl) {
		alert("Unable to initialize WebGL.");
		//TODO: some sort of error handling that's a bit more graceful.
		return;
	}

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	//----------------------------------
	//resizing behavior:

	//The idea is that the canvas fits inside the frame, and has its width and height changed [shrunk] to satisfy desired properties.
	function resized() {
		var game = document.getElementById("game");
		var game_style = getComputedStyle(game);
		var max_size = {x:game.clientWidth, y:game.clientHeight};
		max_size.x -= parseInt(game_style.getPropertyValue("padding-left")) + parseInt(game_style.getPropertyValue("padding-right"));
		max_size.y -= parseInt(game_style.getPropertyValue("padding-top")) + parseInt(game_style.getPropertyValue("padding-bottom"));

		//Lower limit to size:
		max_size.x = Math.max(100, max_size.x);
		max_size.y = Math.max(100, max_size.y);

		var best_size = {x:0, y:0};
		function tryAspect(a) {
			var mul = Math.floor(max_size.x / a.x);
			if (a.y * mul > max_size.y) {
				mul = Math.floor(max_size.y / a.y);
			}
			var test_size = {x:a.x * mul, y:a.y * mul};
			if (test_size.x * test_size.y > best_size.x * best_size.y) {
				best_size.x = test_size.x;
				best_size.y = test_size.y;
			}
		}

		if (engine.DesiredAspect === undefined) {
			//great!
			best_size.x = Math.floor(max_size.x);
			best_size.y = Math.floor(max_size.y);
		} else if ('forEach' in engine.DesiredAspect) {
			engine.DesiredAspect.forEach(tryAspect);
		} else {
			tryAspect(engine.DesiredAspect);
		}
		if (best_size.x != Size.x || best_size.y != Size.y) {
			console.log("New size is: " + best_size.x + " x " + best_size.y);
			Size.x = best_size.x;
			Size.y = best_size.y;
			canvas.style.width = Size.x + "px";
			canvas.style.height = Size.y + "px";
			canvas.width = Size.x;
			canvas.height = Size.y;
			gl.viewport(0,0,Size.x,Size.y);
			//Notify current scene, if there is one:
			CurrentScene && CurrentScene.resize && CurrentScene.resize();
		}
		//engine.text.resize(Size);
	}

	window.addEventListener('resize', resized);
	resized();

	//--------------------------
	//init various openGL data:
	if (!engine.initShaders()) return;
	if (!engine.initMeshes()) return;

	//--------------------------
	//set up scene handling:
	var requestAnimFrame =
		window.requestAnimationFrame
		|| window.webkitRequestAnimationFrame
		|| window.mozRequestAnimationFrame
		|| window.oRequestAnimationFrame
		|| window.msRequestAnimationFrame
	;

	if (!requestAnimFrame) {
		alert("browser does not appear to support requestAnimationFrame");
		return;
	}

	//TODO: first scene should probably wait for resources to be loaded
	// before handing control over to the game.

	onstart();

	var previous = NaN;
	var acc = 0.0;
	function animate(timestamp) {
		if (!CurrentScene) return;

		if (isNaN(previous)) {
			previous = timestamp;
		}
		var elapsed = (timestamp - previous) / 1000.0;
		previous = timestamp;

		//Run tick (fixed timestep):
		acc += elapsed;
		while (acc > engine.Tick * 0.5) {
			acc -= engine.Tick;
			CurrentScene.tick && CurrentScene.tick();
			if (!CurrentScene) return;
		}

		//Run update (variable timestep):
		CurrentScene.update && CurrentScene.update(elapsed);
		if (!CurrentScene) return;

		//Draw:
		CurrentScene.draw();
		if (!CurrentScene) return;

		requestAnimFrame(animate);
	}

	requestAnimFrame(animate);

	//---------------------------------------------------

	console.log("LDFw");
};
