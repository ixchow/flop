var Mat4 = engine.Mat4;
var Vec2 = engine.Vec2;


var Size = {x:32, y:15};
var Triangles = Size.x * Size.y * 2;
var TexSize = 64;

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

	window.m = this; //DEBUG

	//for transition testing:
	this.t = 0.0;

	this.resize();

	this.mouseTile = {x:-2, y:-2};
	this.mouseDown = false;
	this.editTile = TileEmpty;

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
	this.t = 1.0;
};

Main.prototype.mouse = function(x, y, isDown) {
	this.mouseTile = {
		x: Math.floor((x * 2.0 / engine.Size.x - 1.0) / this.scale.x + Size.x * 0.5),
		y: Math.floor((y * 2.0 / engine.Size.y - 1.0) / this.scale.y + Size.y * 0.5)};
	if (isDown) {
		if (this.mouseTile.x >= 0 && this.mouseTile.x < Size.x
		 && this.mouseTile.y >= 0 && this.mouseTile.y < Size.y) {
		 	var i = this.mouseTile.y * Size.x + this.mouseTile.x;
			if (this.board[i] !== this.editTile) {
				this.board[i] = this.editTile;
				this.setBoard(this.board);
			}
		}
	} else {
		this.mouseDown = false;
	}
};

Main.prototype.keydown = function(e) {
	//console.log(e.keyIdentifier);
	var id = e.keyIdentifier;
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
	}
};

Main.prototype.enter = function() {
};

Main.prototype.update = function(elapsed) {
	this.t += elapsed / 0.6;
	if (this.t > 1.0) this.t = 1.0;
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
	gl.drawArrays(gl.TRIANGLES, 0, this.tileBuffer.verts);
	gl.disableVertexAttribArray(s.aData.location);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, null);
};

exports = Main;
