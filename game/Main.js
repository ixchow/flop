var Mat4 = engine.Mat4;
var Vec2 = engine.Vec2;

var Overlays = game.Overlays;

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

var SwitchRadius = 0.3;

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
var TileSwitch = {
	char:'s',
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
[ TileEmpty, TileSwitch, TileSolid, TileBL, TileBR, TileTR, TileTL ].forEach(function(t){
	AllTiles[t.char] = t;
});

function linkOverlays() {
	//multiple overlays may define an 's', but only one can have the 'p'
	var pToOverlay = Overlays.pToOverlay = {};
	var sFromOverlay = Overlays.sFromOverlay = {};
	Overlays.startPosition = null;

	Overlays.forEach(function(ov, ovi) {
		var b = ov.str;
		ov.idx = ovi;

		assert(b.length === (Size.x + 1) * Size.y);

		var x = 0;
		var y = Size.y - 1;
		for (var i = 0; i < b.length; ++i) {
			var c = b[i];
			if (c === '\n') {
				x = 0;
				y -= 1;
				continue;
			}
			var idx = x + "," + y;
			if (c === 's') {
				if (!(idx in sFromOverlay)) {
					sFromOverlay[idx] = [];
				}
				sFromOverlay[idx].push(ov);
			} else if (c === 'p') {
				if (idx in pToOverlay) {
					console.warn("Two overlays with p at " + idx);
				} else {
					pToOverlay[idx] = ov;
				}
			}
			x += 1;
		}
	});

	for (var idx in sFromOverlay) {
		if (!(idx in pToOverlay)) {
			console.warn("Overlay(s) with s at " + idx + " have no matching p");
		}
	}
	for (var idx in pToOverlay) {
		if (!(idx in sFromOverlay)) {
			if (Overlays.startPosition) {
				console.warn("Conflicting start position " + idx);
			} else {
				console.log("Starting at " + idx);
				var s = idx.split(",");
				Overlays.startPosition = {x:parseInt(s[0]), y:parseInt(s[1])};
			}
		}
	}
	if (Overlays.startPosition === null) {
		console.error("No start position!");
	}
}

function Main() {
	var ext = gl.getExtension("OES_texture_float");
	if (ext === null) {
		console.log("Sorry, you need floating point textures.");
	}

	linkOverlays();

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


	window.m = this; //DEBUG

	//for transition testing:
	this.t = 0.0;

	this.resize();

	this.mouseTile = {x:-2, y:-2};
	this.mouseDown = false;
	this.editTile = null;

	//------------------------------------

	this.player = {
		pos:{x:4, y:12},
		rot:0.0,
		vel:{x:0, y:0},
		down:{x:0, y:-1},
		jump:{
			armed:false,
			launch:0.0, //counts down during launch
		},
		goLeft:false,
		goRight:false,
		goDown:false,
		goUp:false
	};

	//board consists of references to (possibly empty) tiles:
	this.board = new Array(Size.x * Size.y);
	this.switches = {};

	this.path = [Overlays.startPosition.x + "," + Overlays.startPosition.y];
	this.rebuildFromPath();

	return this;
}

Main.prototype.doOverlay = function(idx) {
	this.path.push(idx);

	//set up player info:
	var pos;
	var s = idx.split(",");
	pos = {x:parseInt(s[0]), y:parseInt(s[1])};

	this.player.pos.x = pos.x + 0.5;
	this.player.pos.y = pos.y + 0.5;
	this.player.vel.x = 0.0;
	this.player.vel.y = 0.0;

	//actually load overlay:

	if (!(idx in Overlays.pToOverlay)) {
		console.warn("No overlay for " + idx);
		//this.board[pos.y * Size.y + pos.x] = TileEmpty;
	} else {
		var str = Overlays.pToOverlay[idx].str;
		assert(str.length === (Size.x + 1) * Size.y);

		var x = 0;
		var y = Size.y - 1;
		for (var i = 0; i < str.length; ++i) {
			var c = str[i];
			if (c === '\n') {
				x = 0;
				y -= 1;
				continue;
			}
			if (c === '.') {
				//generally, skip '.' character:
				if (pos === Overlays.startPosition) {
					//unless it's the first overlay
					this.board[y * Size.x + x] = AllTiles[' '];
				}
			} else if (c === 'p') {
				//'p' is just an entrance marker
				this.board[y * Size.x + x] = AllTiles[' '];
			} else if (AllTiles[c]) {
				this.board[y * Size.x + x] = AllTiles[c];
			} else {
				console.warn("Unknown character '" + c + "' in board.");
			}
			x += 1;
		}

	}
};

Main.prototype.rebuildFromPath = function() {
	var path = this.path;
	this.path = [];
	//clear board...
	for (var i = 0; i < this.board.length; ++i) {
		this.board[i] = TileSolid;
	}

	path.forEach(function(idx){
		this.doOverlay(idx);
	}, this);

	this.startTransition();
};

Main.prototype.startTransition = function() {
	var slots = [];
	for (var y = 0; y < Size.y; ++y) {
		for (var x = 0; x < Size.x; ++x) {
			this.board[y * Size.x + x].triangles.forEach(function(t){
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

	//deal with switches:
	for (var idx in this.switches) {
		this.switches[idx].current = false;
	}
	for (var y = 0; y < Size.y; ++y) {
		for (var x = 0; x < Size.x; ++x) {
			if (this.board[y * Size.x + x] === TileSwitch) {
				var idx = x + "," + y;
				if (idx in this.switches) {
					this.switches[idx].current = true;
				} else {
					this.switches[idx] = {
						x:x+0.5,
						y:y+0.5,
						fade:0.0,
						current:true
					};
				}
			}
		}
	}

	//run the transition:
	this.t = 0.0;
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
		this.mouseDown = true;
		//editing actions...
		if (this.mouseTile.x >= 0 && this.mouseTile.x < Size.x
		 && this.mouseTile.y >= 0 && this.mouseTile.y < Size.y) {
		 	if (this.editTile) {
				//draw
				var idx = this.path[this.path.length-1];
				var overlay = Overlays.pToOverlay[idx];
				var i = (Size.y - 1 - this.mouseTile.y) * (Size.x + 1) + this.mouseTile.x;
				if (overlay.str[i] != this.editTile.char) {
					overlay.str = overlay.str.substr(0,i) + this.editTile.char + overlay.str.substr(i+1);
					var old = {x:this.player.pos.x, y:this.player.pos.y};
					this.rebuildFromPath();
					this.player.pos.x = old.x;
					this.player.pos.y = old.y;
				}
			} else {
				//warp
				this.player.pos.x = worldMouse.x;
				this.player.pos.y = worldMouse.y;
				this.player.vel.x = 0.0;
				this.player.vel.y = 0.0;
			}
		}
	} else {
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
		this.player.goUp = isDown;
	} else if (id === 'Down') {
		this.player.goDown = isDown;
	}
	var me = this;
	function setTile(code, tile) {
		if (id === code) {
			if (isDown) {
				me.editTile = tile;
			}
			if (!isDown && me.editTile === tile) {
				me.editTile = null;
			}
		}
	}
	setTile('U+0051', TileTL);
	setTile('U+0057', TileTR);
	setTile('U+0045', TileSolid);
	setTile('U+0041', TileBL);
	setTile('U+0053', TileBR);
	setTile('U+0044', TileEmpty);
	setTile('U+005A', TileSwitch);
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

Main.prototype.sweepVsBoard = function(sweep, ignore) {
	var minx = 0;
	var maxx = Size.x - 1;
	var miny = 0;
	var maxy = Size.y - 1;
	var isect = null;
	for (var y = miny; y <= maxy; ++y) {
		for (var x = minx; x <= maxx; ++x) {
			var t = this.board[y * Size.x + x];
			if (t.hull.length === 0) continue;
			if (ignore && (y * Size.y + x) in ignore) continue;
			var xfSweep = {
				a:{x:sweep.a.x - x, y:sweep.a.y - y},
				b:{x:sweep.b.x - x, y:sweep.b.y - y},
				r:sweep.r
			};
			var test = sweptCircleVsHull(xfSweep, t.hull);
			if (test && (!isect || test.t < isect.t)) {
				isect = test;
				isect.idx = y * Size.y + x;
			}
		}
	}
	return isect;
};

var LogCount = 0;

var Sqrt2_2 = Math.sqrt(2.0) / 2.0;

Main.prototype.groundCheckCapsules = function() {
	var pos = this.player.pos;
	var down = this.player.down;
	var right = {x:-down.y, y:down.x};
	var amt = 0.1;

	var d1 = {x:down.x, y:down.y};
	var d2 = {x:Sqrt2_2 * (down.x + right.x), y:Sqrt2_2 * (down.y + right.y)};
	var d3 = {x:Sqrt2_2 * (down.x - right.x), y:Sqrt2_2 * (down.y - right.y)};
	return [
		{
			a:{x:pos.x, y:pos.y},
			b:{x:pos.x + amt * d1.x, y:pos.y + amt * d1.y},
			r:PlayerRadius,
			dir:d1
		},
		{
			a:{x:pos.x, y:pos.y},
			b:{x:pos.x + amt * d2.x, y:pos.y + amt * d2.y},
			r:PlayerRadius,
			dir:d2,
			rightRamp:true
		},
		{
			a:{x:pos.x, y:pos.y},
			b:{x:pos.x + amt * d3.x, y:pos.y + amt * d3.y},
			r:PlayerRadius,
			dir:d3,
			leftRamp:true
		}
	];
}

Main.prototype.resolveMotion = function(pos, vel, elapsed, path) {
	var remain = elapsed;
	var iter = 0;

	var ignore = {};

	if (path) {
		path.push({x:pos.x, y:pos.y});
	}

	while (remain > 0.0 && iter < 10) {
		var sweep = {
			a:{x:pos.x, y:pos.y},
			b:{x:pos.x+vel.x * remain, y:pos.y+vel.y * remain},
			r:PlayerRadius
		};
		var isect = this.sweepVsBoard(sweep, ignore);
		if (isect) {
			if (isect.t > 0.0) ignore = {};

			ignore[isect.idx] = true;

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

		if (path) {
			path.push({x:pos.x, y:pos.y});
		}

		++iter;
	}

	if (remain > 0.0) {
		console.log(remain);
	}

};

Main.prototype.triggerSwitch = function(idx) {
	if (!(idx in Overlays.pToOverlay)) {
		console.log("adding overlay at " + idx);
		var s = idx.split(",");
		var sx = parseInt(s[0]);
		var sy = parseInt(s[1]);
		var str = "";
		for (var y = Size.y - 1; y >= 0; --y) {
			for (var x = 0; x < Size.x; ++x) {
				if (sx == x && sy == y) {
					str += 'p';
				} else {
					str += '.';
				}
			}
			str += '\n';
		}
		Overlays.push({str:str});
		linkOverlays();
	}
	this.doOverlay(idx);
	this.startTransition();
};

Main.prototype.update = function(elapsed) {
	//---------------------------------------
	//transition:
	this.t += elapsed / 0.6;
	if (this.t > 1.0) this.t = 1.0;

	//---------------------------------------
	//switches:
	for (var idx in this.switches) {
		var sw = this.switches[idx];
		if (sw.current) {
			sw.fade += elapsed / 0.6;
			if (sw.fade > 1.0) sw.fade = 1.0;
		} else {
			sw.fade -= elapsed / 0.8;
			if (sw.fade < 0.0) sw.fade = 0.0;
		}
	}

	//---------------------------------------
	//Player:
	var player = this.player;

	//(a) Are we on the ground? because if so we should modify motion.
	var onGround = false;
	var rightRamp = false;
	var leftRamp = false;
	var flatRamp = false;

	function checkGround() {
		onGround = false;
		rightRamp = false;
		leftRamp = false;
		flatRamp = false;

		var toCheck = this.groundCheckCapsules();
		toCheck.forEach(function(c){
			var nearby = {};
			while (1) {
				var isect = this.sweepVsBoard(c, nearby);
				if (isect) {
					var dot = c.dir.x * isect.ox + c.dir.y * isect.oy;
					if (c.rightRamp || c.leftRamp) {
						if (dot < -0.99) {
							if (c.rightRamp) rightRamp = true;
							if (c.leftRamp) leftRamp = true;
						}
					} else {
						if (dot < -0.5) {
							onGround = true;
						}
						if (dot < -0.99) {
							flatRamp = true;
						}
					}
					nearby[isect.idx] = isect;
				} else {
					break;
				}
			}
		}, this);
	}

	checkGround.call(this);

	/* Only with magic shoes
	if ((!leftRamp && !flatRamp && rightRamp) && onGround) {
		player.down = {
			x:Sqrt2_2 * (player.down.x - player.down.y),
			y:Sqrt2_2 * (player.down.y + player.down.x)
		};
		checkGround.call(this);
	}
	if ((leftRamp && !flatRamp && !rightRamp) && onGround) {
		player.down = {
			x:Sqrt2_2 * (player.down.x + player.down.y),
			y:Sqrt2_2 * (player.down.y - player.down.x)
		};
		checkGround.call(this);
	}
	//some basic fix-up to prevent too much rotation:
	if (Math.abs(player.down.x) > 0.9) {
		player.down.x = Math.sign(player.down.x);
		player.down.y = 0.0;
	}
	if (Math.abs(player.down.y) > 0.9) {
		player.down.x = 0.0;
		player.down.y = Math.sign(player.down.y);
	}
	*/


	var relVel = {
		x: -player.down.y * player.vel.x + player.down.x * player.vel.y,
		y: -player.down.x * player.vel.x +-player.down.y * player.vel.y
	};

	if (player.jump.launch > 0.0) {
		if (!player.goUp) {
			if (relVel.y > 0.0) {
				relVel.y *= 0.5;
			}
			player.jump.launch = 0.0;
		}
		player.jump.launch -= elapsed;
		if (player.jump.launch < 0.0) {
			player.jump.launch = 0.0;
		}
	}
	var leftRight = (player.goRight ? 1.0 : 0.0) + (player.goLeft ?-1.0 : 0.0);
	var wantVel = 3.0 * leftRight;
	if (onGround) {
		//on the ground!
		var wantDir = {x:1.0, y:0.0};
		if (wantVel < 0.0 && leftRamp) {
			wantDir = {x:Sqrt2_2, y:-Sqrt2_2};
		}
		if (wantVel >= 0.0 && rightRamp) {
			wantDir = {x:Sqrt2_2, y: Sqrt2_2};
		}
		var blend = (1.0 - Math.pow(0.5, elapsed / 0.05));

		var proj = wantDir.x * relVel.x + wantDir.y * relVel.y;

		proj = (wantVel - proj) * blend;
		relVel.x += wantDir.x * proj;
		relVel.y += wantDir.y * proj;

		if (player.jump.armed) {
			if (player.goUp) {
				relVel.y = Math.max(relVel.y, 5.0);
				player.jump.armed = false;
				player.jump.launch = 0.7; //time during which jump can be cancelled?
			}
		} else {
			if (player.jump.launch === 0.0) {
				if (!player.goUp) {
					player.jump.armed = true;
				}
			}
		}
	} else {
		//not on the ground!
		relVel.y -= Gravity * elapsed;

		var AirControl = 2.5;

		if (wantVel > 0.0 && relVel.x < wantVel) {
			relVel.x += AirControl * elapsed;
			if (relVel.x > wantVel) relVel.x = wantVel;
		}
		if (wantVel < 0.0 && relVel.x > wantVel) {
			relVel.x -= AirControl * elapsed;
			if (relVel.x < wantVel) relVel.x = wantVel;
		}
		if (player.goDown && relVel.y > -2.0) {
			relVel.y -= 0.5 * AirControl * elapsed;
			if (relVel.y < -2.0) relVel.y = -2.0;
		}

	}

	player.vel.x =-player.down.y * relVel.x +-player.down.x * relVel.y;
	player.vel.y = player.down.x * relVel.x +-player.down.y * relVel.y;


	//(b) check player motion against level, arrest any velocity into level
	(function movePlayer(){
		this.resolveMotion(player.pos, player.vel, elapsed);
	}).call(this);

	//see if player triggers any switches
	(function checkSwitch(){
		for (var idx in this.switches) {
			var sw = this.switches[idx];
			if (sw.current && sw.fade == 1.0) {
				var to = {
					x:sw.x - this.player.pos.x,
					y:sw.y - this.player.pos.y
				};
				var disSq = to.x * to.x + to.y * to.y;
				if (disSq < PlayerRadius * PlayerRadius) {
					//trigger that switch! woaaah!
					this.triggerSwitch(idx);
					break;
				}
			}
		}
	}).call(this);

	//respawn player if fell off the screen
	(function checkRespawn(){
		var dot =-Infinity;
		[ {x:0.0, y:0.0},
			{x:Size.x, y:0.0},
			{x:Size.x, y:Size.y},
			{x:0.0, y:Size.y}
		].forEach(function(pt) {
			var test = (pt.x - player.pos.x) * player.down.x + (pt.y - player.pos.y) * player.down.y;
			if (test > dot) dot = test;
		}, this);
		var velDot = player.vel.x * player.down.x + player.vel.y * player.down.y;
		if (dot < -2.0 && velDot > 0.0) {
			//need respawn!
			var s = this.path[this.path.length-1].split(",");
			player.pos.x = parseInt(s[0]) + 0.5;
			player.pos.y = parseInt(s[1]) + 0.5;
			player.vel.x = 0.0;
			player.vel.y = 0.0;
		}
	}).call(this);




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

	var MVP = new Mat4(
		this.scale.x, 0.0, 0.0, 0.0,
		0.0, this.scale.y, 0.0, 0.0,
		0.0, 0.0, 1.0, 0.0,
		-this.scale.x * Size.x * 0.5, -this.scale.y * Size.y * 0.5, 0.0, 1.0
	);

	//draw switches:
	(function(){
		var s = shaders.debug;
		gl.useProgram(s);
		gl.uniformMatrix4fv(s.uMVP.location, false, MVP);

		//a top-right corner:
		var corner = new Array(8);
		for (var a = 0; a < corner.length; ++a) {
			var ang = 0.5 * Math.PI * a / (corner.length - 1);
			corner[a] = {x:Math.cos(ang), y:Math.sin(ang)};
		}
		var verts2 = [];
		var colors = [];
		for (var idx in this.switches) {
			var sw = this.switches[idx];
			var amt = sw.fade;

			function mix(a,b,t) {
				return (b - a) * t + a;
			}

			var left = mix(0.0, sw.x, amt);
			var right = mix(Size.x, sw.x, amt);
			var bottom = mix(0.0, sw.y, amt);
			var top = mix(Size.y, sw.y, amt);
			var r = mix(0.7, SwitchRadius, amt);
			var col = 0xffffff88;

			for (var i = 0; i < corner.length; ++i) {
				var x = r * corner[i].x;
				var y = r * corner[i].y;
				if (i == 0 && verts2.length) {
					verts2.push(verts2[verts2.length-2], verts2[verts2.length-1]);
					colors.push(colors[colors.length-1]);
					verts2.push(left - x, bottom - y);
					colors.push(col);
				}
				verts2.push(left - x, bottom - y);
				colors.push(col);
				verts2.push(left - x, top + y);
				colors.push(col);
			}
			for (var i = corner.length - 1; i >= 0; --i) {
				var x = r * corner[i].x;
				var y = r * corner[i].y;
				verts2.push(right + x, bottom - y);
				colors.push(col);
				verts2.push(right + x, top + y);
				colors.push(col);
			}
		}

		if (verts2.length == 0) return;

		verts2 = new Float32Array(verts2);
		colors = new Uint32Array(colors);
		
		var vertsBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertsBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, verts2, gl.STREAM_DRAW);
		gl.vertexAttribPointer(s.aVertex.location, 2, gl.FLOAT, false, 0, 0);

		var colorsBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STREAM_DRAW);
		gl.vertexAttribPointer(s.aColor.location, 4, gl.UNSIGNED_BYTE, true, 0, 0);

		gl.enableVertexAttribArray(s.aVertex.location);
		gl.enableVertexAttribArray(s.aColor.location);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, verts2.length / 2);
		gl.disableVertexAttribArray(s.aVertex.location);
		gl.disableVertexAttribArray(s.aColor.location);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.deleteBuffer(vertsBuffer);
		gl.deleteBuffer(colorsBuffer);

	}).call(this);


	var s = shaders.tile;
	gl.useProgram(s);

	gl.uniformMatrix4fv(s.uMVP.location, false, MVP);
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


/*
	(function testLevelCollision() {
		var pos = {x:this.testRay.a.x, y:this.testRay.a.y};
		var vel = {x:this.testRay.b.x - this.testRay.a.x, y:this.testRay.b.y - this.testRay.a.y};

		var path = [];
		this.resolveMotion(pos, vel, 1.0, path);
		for (var i = 0; i + 1 < path.length; ++i) {
			var sweep = {
				a:path[i], b:path[i+1], r:PlayerRadius
			};
			drawCapsule(sweep);
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
