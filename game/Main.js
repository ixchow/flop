var Mat4 = engine.Mat4;
var Vec2 = engine.Vec2;

function assert(cond) {
	if (!cond) {
		throw new Error("Assertion Failed.");
	}
}

var Gravity = 5.0;
var MaxVel = 10.0;

var Size = {x:32, y:15};
var Triangles = Size.x * Size.y * 2;
var TexSize = 64;

var PlayerRadius = 0.4;
var PlayerHeight = 0.5;

var Mid = 1.0 - Math.sqrt(2.0) / 2.0;
var TileSolid = {
	char:'#',
	triangles:[{x:Mid, y:Mid, r:0.0}, {x:1.0-Mid, y:1.0-Mid, r:Math.PI}],
	//counterclockwise convex hull:
	hull:[{x:0.0, y:0.0}, {x:1.0, y:0.0}, {x:1.0, y:1.0}, {x:0.0, y:1.0}]
};
var TileEmpty = {
	char:' ',
	triangles:[],
	hull:[]
};
var TileBL = {
	char:'L',
	triangles:[{x:Mid, y:Mid, r:0.0}],
	hull:[{x:0.0, y:0.0}, {x:1.0, y:0.0}, {x:0.0, y:1.0}]
};
var TileBR = {
	char:'J',
	triangles:[{x:1.0-Mid, y:Mid, r:0.5 * Math.PI}],
	hull:[{x:0.0, y:0.0}, {x:1.0, y:0.0}, {x:1.0, y:1.0}]
};
var TileTR = {
	char:'\\',
	triangles:[{x:1.0-Mid, y:1.0-Mid, r:Math.PI}],
	hull:[{x:1.0, y:0.0}, {x:1.0, y:1.0}, {x:0.0, y:1.0}]
};
var TileTL = {
	char:'/',
	triangles:[{x:Mid, y:1.0-Mid, r:-0.5 * Math.PI}],
	hull:[{x:0.0, y:0.0}, {x:1.0, y:1.0}, {x:0.0, y:1.0}]
};

var AllTiles = {};
[ TileEmpty, TileSolid, TileBL, TileBR, TileTR, TileTL ].forEach(function(t){
	AllTiles[t.char] = t;
});

var StartBoard =
 "       #/ J                     \n"
+"       #  # J#L ##L             \n"
+"      /#\\ # # # # #             \n"
+"       #  / \\#/ ##/             \n"
+"                /               \n"
+"##########   ##           ######\n"
+"#############   J##   #####/ \\##\n"
+"######         J#     ##/     ##\n"
+"#######       J##   ####      ##\n"
+"########     J##### #        J##\n"
+"##################     #########\n"
+"##################   #      \\###\n"
+"#########################L  J###\n"
+"################################\n"
+"################################\n";

function Main() {
	var ext = gl.getExtension("OES_texture_float");
	if (ext === null) {
		console.log("Sorry, you need floating point textures.");
	}

	//build tile triangles:
	var data = [];
	for (var i = 0; i < Triangles; ++i) {
		var coord = {
			x: ((i % TexSize) + 0.5) / TexSize,
			y: (Math.floor(i / TexSize) + 0.5) / TexSize
		};
		data.push(0.0 - Mid, 0.0 - Mid, coord.x, coord.y);
		data.push(1.0 - Mid, 0.0 - Mid, coord.x, coord.y);
		data.push(0.0 - Mid, 1.0 - Mid, coord.x, coord.y);
	}
	if (data.length != Size.x * Size.y * 2 * 3 * 4) {
		throw new Error("data isn't the right length");
	}

	data = new Float32Array(data);

	this.tileBuffer = gl.createBuffer();

	gl.bindBuffer(gl.ARRAY_BUFFER, this.tileBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	this.tileBuffer.verts = data.length / 4;

	//TODO: build tile shadow triangles

	//build transformation textures:

	var pos = new Float32Array(4 * TexSize * TexSize);
	var rot = new Float32Array(4 * TexSize * TexSize);
	var i = 0;
	for (var y = 0; y < Size.y; ++y) {
		for (var x = 0; x < Size.x; ++x) {
			pos[i*4+0] = x + Mid;
			pos[i*4+1] = y + Mid;
			pos[i*4+2] = x + 1 - Mid;
			pos[i*4+3] = y + 1 - Mid;
			rot[i*4+0] = 0.0;
			rot[i*4+1] = 0.0;
			rot[i*4+2] = Math.PI;
			rot[i*4+3] = 0.0;
			++i;
			pos[i*4+0] = x + 1 - Mid;
			pos[i*4+1] = y + 1 - Mid;
			pos[i*4+2] = x + Mid;
			pos[i*4+3] = y + Mid;
			rot[i*4+0] = Math.PI;
			rot[i*4+1] = 0.0;
			rot[i*4+2] = 0.0;
			rot[i*4+3] = 0.0;
			++i;
		}
	}

	this.pos = pos;
	this.posTex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, this.posTex);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TexSize, TexSize, 0, gl.RGBA, gl.FLOAT, pos);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.bindTexture(gl.TEXTURE_2D, null);

	this.rot = rot;
	this.rotTex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, this.rotTex);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TexSize, TexSize, 0, gl.RGBA, gl.FLOAT, rot);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.bindTexture(gl.TEXTURE_2D, null);

	//-------------------------------------------

	//board consists of references to (possibly empty) tiles:
	this.board = new Array(Size.x * Size.y);

	for (var i = 0; i < this.board.length; ++i) {
		this.board[i] = TileSolid;
	}

	(function loadBoard(){
		var x = 0;
		var y = Size.y - 1;
		for (var i = 0; i < StartBoard.length; ++i) {
			var c = StartBoard[i];
			if (c === '\n') {
				x = 0;
				y -= 1;
			} else if (AllTiles[c]) {
				this.board[y * Size.x + x] = AllTiles[c];
				x += 1;
			} else {
				console.warn("Unknown character '" + c + "' in board.");
				x += 1;
			}
		}
	}).call(this);

	this.setBoard(this.board);

	window.m = this; //DEBUG

	//for transition testing:
	this.t = 0.0;

	this.resize();

	this.mouseTile = {x:-2, y:-2};
	this.mouseDown = false;
	this.editTile = TileEmpty;

	//------------------------------------

	this.player = {
		pos:{x:4, y:12},
		rot:0.0,
		vel:{x:0, y:0},
		down:{x:0, y:-1},
		goLeft:false,
		goRight:false,
		duck:false,
		jump:false
	};

	return this;
}

Main.prototype.setBoard = function(newBoard) {
	var slots = [];
	for (var y = 0; y < Size.y; ++y) {
		for (var x = 0; x < Size.x; ++x) {
			newBoard[y * Size.x + x].triangles.forEach(function(t){
				slots.push({x:t.x + x, y:t.y + y, r:t.r});
			});
		}
	}
	var r = engine.MersenneTwister.random;
	//shuffle slots:
	for (var i = 0; i < slots.length; ++i) {
		var j = (r() * (slots.length - i)) | 0 + i;
		var temp = slots[i]; slots[i] = slots[j]; slots[j] = temp;
	}

	//assign current triangles to new slots:
	var si = 0;
	for (var t = 0; t < Triangles; ++t) {
		var s = slots[si++];
		if (si >= slots.length) si -= slots.length;
		this.pos[4*t+0] = this.pos[4*t+2];
		this.pos[4*t+1] = this.pos[4*t+3];
		this.pos[4*t+2] = s.x + 0.1 * (r() - 0.5);
		this.pos[4*t+3] = s.y + 0.1 * (r() - 0.5);
		this.rot[4*t+0] = this.rot[4*t+2];
		this.rot[4*t+1] = this.rot[4*t+3];
		this.rot[4*t+2] = s.r + 0.2 * (r() - 0.5);
		this.rot[4*t+3] = 0.0;
	}

	//re-upload textures:
	gl.bindTexture(gl.TEXTURE_2D, this.posTex);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TexSize, TexSize, 0, gl.RGBA, gl.FLOAT, this.pos);
	gl.bindTexture(gl.TEXTURE_2D, null);

	gl.bindTexture(gl.TEXTURE_2D, this.rotTex);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TexSize, TexSize, 0, gl.RGBA, gl.FLOAT, this.rot);
	gl.bindTexture(gl.TEXTURE_2D, null);

	//run the transition:
	this.t = 0.0;

	//TEST:
	this.testRay = {a:{x:0.0, y:0.0}, b:{x:1.0, y:0.0}};
	this.testCapsule = {a:{x:5.0, y:2.0}, b:{x:10.0, y:3.0}, r:2.0};
	this.testHull = [
		{x:5,y:6},
		{x:11,y:7},
		{x:3,y:12}
	];
};

Main.prototype.mouse = function(x, y, isDown) {
	var worldMouse = {
		x: (x * 2.0 / engine.Size.x - 1.0) / this.scale.x + Size.x * 0.5,
		y: (y * 2.0 / engine.Size.y - 1.0) / this.scale.y + Size.y * 0.5
	};
	this.mouseTile = {
		x: Math.floor(worldMouse.x),
		y: Math.floor(worldMouse.y)
	};
	if (isDown) {
		this.testRay.a = worldMouse;
	/*
		if (this.mouseTile.x >= 0 && this.mouseTile.x < Size.x
		 && this.mouseTile.y >= 0 && this.mouseTile.y < Size.y) {
		 	var i = this.mouseTile.y * Size.x + this.mouseTile.x;
			if (this.board[i] !== this.editTile) {
				this.board[i] = this.editTile;
				this.setBoard(this.board);
			}
		}
	*/
	} else {
		this.testRay.b = worldMouse;
		this.mouseDown = false;
	}
};

Main.prototype.key = function(id, isDown) {
	//console.log(id);
	if (id === 'Left') {
		this.player.goLeft = isDown;
	} else if (id === 'Right') {
		this.player.goRight = isDown;
	} else if (id === 'Up') {
		this.player.jump = isDown;
	} else if (id === 'Down') {
		this.player.duck = isDown;
	}
	if (isDown) {
		if (id === 'U+0051') {
			this.editTile = TileTL;
		} else if (id === 'U+0057') {
			this.editTile = TileTR;
		} else if (id === 'U+0045') {
			this.editTile = TileSolid;
		} else if (id === 'U+0041') {
			this.editTile = TileBL;
		} else if (id === 'U+0053') {
			this.editTile = TileBR;
		} else if (id === 'U+0044') {
			this.editTile = TileEmpty;
		} else if (id === 'Enter') {
			//dump board as string
			var out = "";
			for (var y = Size.y - 1; y >= 0; --y) {
				for (var x = 0; x < Size.x; ++x) {
					out += this.board[y * Size.x + x].char;
				}
				out += "\n";
			}
			console.log(out);
		}
	}
};

Main.prototype.enter = function() {
};

//ray is {a:{}, b:{}}, circle is {x:,y:,r:}
function rayVsCircle(ray, circle) {
	//want t such that (t * (b - a) + a - c)^2 = r^2
	var b_a = {x:ray.b.x - ray.a.x, y:ray.b.y - ray.a.y};
	var a_c = {x:ray.a.x - circle.x, y:ray.a.y - circle.y};
	var a = b_a.x * b_a.x + b_a.y * b_a.y;// t^2 * (b - a) * (b - a)
	var b = 2.0 * (b_a.x * a_c.x + b_a.y * a_c.y);// t * 2.0 * (b - a) * (a - c)
	var c = a_c.x * a_c.x + a_c.y * a_c.y - circle.r * circle.r;

	var t = Infinity;
	if (c <= 0.0) {
		//ray starts inside circle
		//check if ray is leaving...
		var dot = b_a.x * a_c.x + b_a.y * a_c.y;
		if (dot > 0.0) return null;
		var lenSq = a_c.x * a_c.x + a_c.y * a_c.y;
		if (lenSq <= 0.001 * 0.001) {
			return {t:0.0, ox:1.0, oy:0.0};
		} else {
			var fac = 1.0 / Math.sqrt(lenSq);
			return {t:0.0, ox:fac * a_c.x, oy:fac * a_c.y};
		}
	} else if (a <= 0.01 * 0.01) {
		return null; //ray doesn't go anywhere
	} else {
		var d = b * b - 4.0 * a * c;

		if (d < 0.0) return null;
		var m = -b / (2.0 * a);
		var delta = Math.sqrt(d) / (2.0 * a);

		t = m - delta;
		if (t < 0.0 || t > 1.0) t = m + delta;
		assert(!isNaN(t)); //DEBUG
	}
	if (t < 0.0 || t > 1.0) return null;

	var pt = {x:b_a.x * t + a_c.x, y:b_a.y * t + a_c.y};

	return {t:t, ox:pt.x/circle.r, oy:pt.y/circle.r};
}

/* untested
//ray is {a:{},b:{}}, line is {a:{}, b:{}}
function rayVsLine(ray, line) {
	var along = {x:line.b.x - line.a.x, y:line.b.y - line.a.y};
	var perp = {x:-along.y, y:along.x};
	var aDot = (ray.a.x - line.a.x) * perp.x + (ray.a.y - line.a.y) * perp.y;
	var bDot = (ray.b.x - line.a.x) * perp.x + (ray.b.y - line.a.y) * perp.y;
	if ((aDot < 0.0 && bDot < 0.0) || (aDot > 0.0 && bDot > 0.0)) return null;

	var t;
	if (Math.abs(bDot - aDot) < 0.01) {
		t = 0.0;
	} else {
		t = (0.0 - aDot) / (bDot - aDot);
	}

	var pt = {
		x:(ray.b.x - ray.a.x) * t + ray.a.x,
		y:(ray.b.y - ray.a.y) * t + ray.a.y
	};

	var ptAlong = along.x * (pt.x - line.a.x) + along.y * (pt.y - line.a.y);
	if (ptAlong < 0.0) return null;
	var lenSq = along.x * along.x + along.y * along.y;
	if (ptAlong > lenSq) return null;

	var fac = 1.0 / Math.sqrt(lenSq);
	if (aDot < 0.0) fac = -fac;

	return { t:t, ox:fac * perp.x, oy: fac * perp.y };
}*/

//ray is {a:{x:,y:}, b:{x:,y:}}, capsule is {a:{x:,y:}, b:{x:,y:}, r:}
//returns null or {ox:, oy:, t:}
function rayVsCapsule(ray, capsule) {

	var along = {x:capsule.b.x - capsule.a.x, y:capsule.b.y - capsule.a.y};

	var raDot = along.x * (ray.a.x - capsule.a.x) + along.y * (ray.a.y - capsule.a.y);
	var rbDot = along.x * (ray.b.x - capsule.a.x) + along.y * (ray.b.y - capsule.a.y);
	var cbDot = along.x * along.x + along.y * along.y;


	var isect = null;
	if (raDot < 0.0 || rbDot < 0.0) {
		//if ray starts or ends outside middle segment, test low endpoint
		var test = rayVsCircle(ray, {x:capsule.a.x, y:capsule.a.y, r:capsule.r});
		if (test && (!isect || test.t < isect.t)) {
			isect = test;
		}
	}
	if (raDot > cbDot || rbDot > cbDot) {
		//if ray starts or ends outside the max of the middle segment,
		//test high endpoint
		var test = rayVsCircle(ray, {x:capsule.b.x, y:capsule.b.y, r:capsule.r});
		if (test && (!isect || test.t < isect.t)) {
			isect = test;
		}
	}
	if (!((raDot < 0.0 && rbDot < 0.0) || (raDot > cbDot && rbDot > cbDot))) {
		//if ray doesn't avoid middle segment entirely, test it.
		var perp = {x:-along.y, y:along.x};
		var lenSq = perp.x * perp.x + perp.y * perp.y;
		var fac = 1.0 / Math.sqrt(lenSq);
		perp.x *= fac; perp.y *= fac;
		var raPerp = perp.x * (ray.a.x - capsule.a.x) + perp.y * (ray.a.y - capsule.a.y);
		var rbPerp = perp.x * (ray.b.x - capsule.a.x) + perp.y * (ray.b.y - capsule.a.y);
		var t = Infinity;
		if (Math.abs(raPerp) <= capsule.r) {
			//isect right at start!
			//make sure ray is actually going in:
			if ((raPerp > 0.0 && rbPerp < raPerp) || (raPerp < 0.0 && rbPerp > raPerp)) {
				t = 0.0;
			}
		} else if (raPerp > capsule.r && rbPerp < capsule.r) {
			t = (capsule.r - raPerp) / (rbPerp - raPerp);
		} else if (raPerp <-capsule.r && rbPerp >-capsule.r) {
			t = (-capsule.r - raPerp) / (rbPerp - raPerp);
		}
		var tDot = t * (rbDot - raDot) + raDot;
		if (tDot > 0.0 && tDot < cbDot) {
			var test = {t:t, ox:perp.x, oy:perp.y};
			test.ox *= Math.sign(raPerp);
			test.oy *= Math.sign(raPerp);
			if (!isect || test.t <= isect.t) {
				isect = test;
			}
		}
	}

	assert(!isect || !isNaN(isect.t));
	return isect;
}

//swept circle is {a:{xy}, b:{xy}, r:}, hull is [{x:,y:}, ... ] in counterclockwise order
//returns null or {ox:,oy:,t:} for collision
function sweptCircleVsHull(sweep, hull) {
	var isect = null;
	var p = hull.length - 1;
	for (var i = 0; i < hull.length; ++i) {
		var test = rayVsCapsule({a:sweep.a, b:sweep.b}, {a:hull[p], b:hull[i], r:sweep.r});
		if (test && (!isect || test.t < isect.t)) {
			isect = test;
		}
		p = i;
	}
	return isect;
}

Main.prototype.sweepVsBoard = function(sweep) {
	var minx = 0;
	var maxx = Size.x - 1;
	var miny = 0;
	var maxy = Size.y - 1;
	var isect = null;
	for (var y = miny; y <= maxy; ++y) {
		for (var x = minx; x <= maxx; ++x) {
			var t = this.board[y * Size.x + x];
			if (t.hull.length === 0) continue;
			var xfSweep = {
				a:{x:sweep.a.x - x, y:sweep.a.y - y},
				b:{x:sweep.b.x - x, y:sweep.b.y - y},
				r:sweep.r
			};
			var test = sweptCircleVsHull(xfSweep, t.hull);
			if (test && (!isect || test.t < isect.t)) {
				isect = test;
			}
		}
	}
	return isect;
};

var LogCount = 0;

Main.prototype.groundCheckCapsules = function() {
	var pos = this.player.pos;
	return [
	{
		a:{x:pos.x - 0.45 * PlayerRadius, y:pos.y},
		b:{x:pos.x - 0.45 * PlayerRadius, y:pos.y - PlayerRadius},
		r:0.4 * PlayerRadius
	},
	{
		a:{x:pos.x + 0.45 * PlayerRadius, y:pos.y},
		b:{x:pos.x + 0.45 * PlayerRadius, y:pos.y - PlayerRadius},
		r:0.4 * PlayerRadius
	}
	];
}

Main.prototype.update = function(elapsed) {
	this.t += elapsed / 0.6;
	if (this.t > 1.0) this.t = 1.0;

	var player = this.player;


	//(a) Are we on the ground? because if so we should modify motion.
	var onGround = this.groundCheckCapsules().some(function(c){
		return this.sweepVsBoard(c) !== null;
	}, this);
	
	var wantVel = 0.0;
	if (player.goLeft && !player.goRight) {
		wantVel = -2.0;
	}
	if (player.goRight && !player.goLeft) {
		wantVel =  2.0;
	}
	if (onGround) {
		//on the ground!
		player.vel.x += (wantVel - player.vel.x) * (1.0 - Math.pow(0.5, elapsed / 0.05));
		if (player.jump) {
			player.vel.y += 5.0;
			player.jump = false;
		}
	} else {
		//not on the ground!
		player.vel.x += (wantVel - player.vel.x) * (1.0 - Math.pow(0.5, elapsed / 0.05));
	}


	//(b) check player motion against level, arrest any velocity into level
	(function movePlayer(){

		var pos = player.pos;
		var vel = player.vel;

		var remain = elapsed;
		var iter = 0;

		while (remain > 0.0 && iter < 10) {
			var sweep = {
				a:{x:pos.x, y:pos.y},
				b:{x:pos.x+vel.x * remain, y:pos.y+vel.y * remain},
				r:PlayerRadius
			};
			var isect = this.sweepVsBoard(sweep);
			if (isect) {
				pos.x += vel.x * remain * isect.t;
				pos.y += vel.y * remain * isect.t;
				var dot = vel.x * isect.ox + vel.y * isect.oy;
				vel.x -= dot * isect.ox;
				vel.y -= dot * isect.oy;

				remain *= 1.0 - isect.t;
			} else {
				pos.x += vel.x * remain;
				pos.y += vel.y * remain;
				remain = 0.0;
			}

			//drawCapsule(sweep);
			++iter;
		}

		if (remain > 0.0) {
			console.log(remain);
		}
	}).call(this);




	player.pos.x = Math.max(0.0, player.pos.x);
	player.pos.y = Math.max(0.0, player.pos.y);
	player.pos.x = Math.min(Size.x, player.pos.x);
	player.pos.y = Math.min(Size.y, player.pos.y);

	player.vel.x += Gravity * player.down.x * elapsed;
	player.vel.y += Gravity * player.down.y * elapsed;

	//collision detection
	var playerTile = {
		x:player.pos.x | 0,
		y:player.pos.y | 0
	};


	var lenSq = player.vel.x * player.vel.x + player.vel.y * player.vel.y;
	if (lenSq > MaxVel * MaxVel) {
		var fac = MaxVel / Math.sqrt(lenSq);
		player.vel.x *= fac;
		player.vel.y *= fac;
	} if (lenSq < 0.01 * 0.01) {
		player.vel.x = 0.0;
		player.vel.y = 0.0;
	}
};

Main.prototype.resize = function() {
	var aspect = engine.Size.x / engine.Size.y;
	var scale = 2.0 * aspect / (Size.x + 2);
	if (scale * (Size.y + 2) > 2.0) {
		scale = 2.0 / (Size.y + 2);
	}
	this.scale = {
		x:scale / aspect,
		y:scale
	};
};

Main.prototype.draw = function() {
	gl.clearColor(0.2, 0.6, 0.2, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.disable(gl.DEPTH_TEST);
	gl.disable(gl.BLEND);

	var s = shaders.tile;
	gl.useProgram(s);

	gl.uniformMatrix4fv(s.uMVP.location, false, new Mat4(
		this.scale.x, 0.0, 0.0, 0.0,
		0.0, this.scale.y, 0.0, 0.0,
		0.0, 0.0, 1.0, 0.0,
		-this.scale.x * Size.x * 0.5, -this.scale.y * Size.y * 0.5, 0.0, 1.0
	));
	//gl.uniform4f(s.uColor0.location, 1.0, 0.5, 0.5, 1.0);
	//gl.uniform4f(s.uColor1.location, 0.7, 1.0, 0.25, 1.0);
	gl.uniform1i(s.uPosTex.location, 0);
	gl.uniform1i(s.uRotTex.location, 1);
	gl.uniform1f(s.uT.location, 0.5 - 0.5 * Math.cos(this.t * Math.PI));

/*
	var mt = new engine.MersenneTwister(0x62344722);

	var data3 = [];
	for (var y = 0; y < Size.y; ++y) {
		for (var x = 0; x < Size.x; ++x) {
			var t = mt.real();
			data3.push(x, y, t);
			data3.push(x + 1, y, t);
			data3.push(x, y + 1, t);

			t = mt.real();
			data3.push(x, y + 1, t);
			data3.push(x + 1, y, t);
			data3.push(x + 1, y + 1, t);
		}
	}

	data3 = new Float32Array(data3);
	*/

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, this.rotTex);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, this.posTex);
	gl.bindBuffer(gl.ARRAY_BUFFER, this.tileBuffer);
	gl.vertexAttribPointer(s.aData.location, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(s.aData.location);
	//gl.drawArrays(gl.TRIANGLES, 0, this.tileBuffer.verts);
	gl.disableVertexAttribArray(s.aData.location);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, null);

	//---------------------------------------------
	//draw for debug purposes:
	var verts2 = [];
	//Level hulls:
	for (var y = 0; y < Size.y; ++y) {
		for (var x = 0; x < Size.x; ++x) {
			var h = this.board[y * Size.x + x].hull;
			var p = h.length - 1;
			for (var i = 0; i < h.length; ++i) {
				verts2.push(x + h[p].x, y + h[p].y);
				verts2.push(x + h[i].x, y + h[i].y);
				p = i;
			}
		}
	}


	function drawCircle(c) {
		var first = null;
		function next(v, isEnd) {
			if (first === null) {
				first = {x:v.x, y:v.y};
				verts2.push(v.x, v.y);
			} else if (!isEnd) {
				verts2.push(v.x, v.y);
				verts2.push(v.x, v.y);
			} else {
				verts2.push(v.x, v.y);
				verts2.push(v.x, v.y);
				verts2.push(first.x, first.y);
			}
		}
		for (var a = 0; a <= 32; ++a) {
			var ang = a * Math.PI / 32 * 2.0;

			var v = { x:Math.cos(ang) * c.r + c.x, y:Math.sin(ang) * c.r + c.y};
			next(v, a == 32);
		}
	}

	function drawHull(h) {
		var first = null;
		function next(v, isEnd) {
			if (first === null) {
				first = {x:v.x, y:v.y};
				verts2.push(v.x, v.y);
			} else if (!isEnd) {
				verts2.push(v.x, v.y);
				verts2.push(v.x, v.y);
			} else {
				verts2.push(v.x, v.y);
				verts2.push(v.x, v.y);
				verts2.push(first.x, first.y);
			}
		}
		for (var i = 0; i < h.length; ++i) {
			next(h[i], i + 1 == h.length);
		}
	}



	function drawCapsule(c) {
		var first = null;
		function next(v, isEnd) {
			if (first === null) {
				first = {x:v.x, y:v.y};
				verts2.push(v.x, v.y);
			} else if (!isEnd) {
				verts2.push(v.x, v.y);
				verts2.push(v.x, v.y);
			} else {
				verts2.push(v.x, v.y);
				verts2.push(v.x, v.y);
				verts2.push(first.x, first.y);
			}
		}
		var along = {x:c.b.x-c.a.x, y:c.b.y-c.a.y};
		var lenSq = along.x * along.x + along.y * along.y;
		if (lenSq > 0.01 * 0.01) {
			var fac = 1.0 / Math.sqrt(lenSq);
			along.x *= fac; along.y *= fac;
		} else {
			along.x = 1.0; along.y = 0.0;
		}
		var perp = {x:-along.y, y:along.x};
		for (var a = 0; a <= 16; ++a) {
			var ang = a * Math.PI / 32 * 2.0;

			var v = { x:Math.cos(ang) * c.r, y:Math.sin(ang) * c.r };
			next({
				x: v.x * perp.x - v.y * along.x + c.a.x,
				y: v.x * perp.y - v.y * along.y + c.a.y
			}, false);
		}
		for (var a = 16; a <= 32; ++a) {
			var ang = a * Math.PI / 32 * 2.0;

			var v = { x:Math.cos(ang) * c.r, y:Math.sin(ang) * c.r };
			next({
				x: v.x * perp.x - v.y * along.x + c.b.x,
				y: v.x * perp.y - v.y * along.y + c.b.y
			}, a == 32);
		}
	}

	//Player:
	(function(){
		var player = this.player;
		drawCircle({x:player.pos.x, y:player.pos.y, r:PlayerRadius});
		//ground check capsule(s?)
		this.groundCheckCapsules().forEach(function(c){
			drawCapsule(c);
		});
	}).call(this);


	/*(function testLevelCollision() {

		var pos = {x:this.testRay.a.x, y:this.testRay.a.y};
		var vel = {x:this.testRay.b.x - this.testRay.a.x, y:this.testRay.b.y - this.testRay.a.y};

		var remain = 1.0;
		var iter = 0;

		while (remain > 0.0 && iter < 10) {
			var sweep = {
				a:{x:pos.x, y:pos.y},
				b:{x:pos.x+vel.x * remain, y:pos.y+vel.y * remain},
				r:PlayerRadius
			};
			var isect = this.sweepVsBoard(sweep);
			if (isect) {
				if (isect.t > 1.0) {
					console.log(isect);
				}
				pos.x += vel.x * remain * isect.t;
				pos.y += vel.y * remain * isect.t;
				var dot = vel.x * isect.ox + vel.y * isect.oy;
				vel.x -= dot * isect.ox;
				vel.y -= dot * isect.oy;

				sweep.b.x = pos.x;
				sweep.b.y = pos.y;

				remain *= 1.0 - isect.t;
			} else {
				pos.x += vel.x * remain;
				pos.y += vel.y * remain;
				remain = 0.0;
			}

			drawCapsule(sweep);
			++iter;
		}

		if (remain > 0.0) {
			console.log(remain);
		}

	}).call(this);
	*/

/*
	(function testHullCollision() {

		//drawCapsule(this.testCapsule);
		//var isect = rayVsCapsule(this.testRay, this.testCapsule);
		//var testCircle = {x:this.testCapsule.b.x, y:this.testCapsule.b.y, r:this.testCapsule.r};
		//drawCircle(testCircle);
		//var isect = rayVsCircle(this.testRay, testCircle);

		drawHull(this.testHull);
		var isect = sweptCircleVsHull(
			{a:this.testRay.a, b:this.testRay.b, r:0.75},
			this.testHull);


		if (isect) {
			var pt = {
				x:isect.t * (this.testRay.b.x - this.testRay.a.x) + this.testRay.a.x,
				y:isect.t * (this.testRay.b.y - this.testRay.a.y) + this.testRay.a.y
			};
			drawCapsule({a:this.testRay.a, b:pt, r:0.75});
		} else {
			drawCapsule({a:this.testRay.a, b:this.testRay.b, r:0.75});
		}

	}).call(this);
*/


	var s = shaders.debug;
	gl.useProgram(s);
	gl.uniformMatrix4fv(s.uMVP.location, false, new Mat4(
		this.scale.x, 0.0, 0.0, 0.0,
		0.0, this.scale.y, 0.0, 0.0,
		0.0, 0.0, 1.0, 0.0,
		-this.scale.x * Size.x * 0.5, -this.scale.y * Size.y * 0.5, 0.0, 1.0
	));

	verts2 = new Float32Array(verts2);

	var buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, verts2, gl.STREAM_DRAW);

	gl.vertexAttribPointer(s.aVertex.location, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(s.aVertex.location);
	gl.vertexAttrib4f(s.aColor.location, 1.0, 0.0, 1.0, 1.0);
	gl.drawArrays(gl.LINES, 0, verts2.length / 2);
	gl.disableVertexAttribArray(s.aVertex.location);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.deleteBuffer(buffer);
};

exports = Main;
