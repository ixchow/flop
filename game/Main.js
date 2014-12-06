var Mat4 = engine.Mat4;

function Main() {
	return this;
}

Main.prototype.enter = function() {
};

Main.prototype.update = function(elapsed) {
};

Main.prototype.resize = function() {
/*
	if (!selectFb) {
		selectFb = gl.createFramebuffer();
		selectFb.colorTex = gl.createTexture();
		selectFb.depthRb = gl.createRenderbuffer();
	}
	selectFb.width = engine.Size.x;
	selectFb.height = engine.Size.y;

	gl.bindRenderbuffer(gl.RENDERBUFFER, selectFb.depthRb);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, selectFb.width, selectFb.height);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);

	gl.bindTexture(gl.TEXTURE_2D, selectFb.colorTex);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, selectFb.width, selectFb.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.bindTexture(gl.TEXTURE_2D, null);

	gl.bindFramebuffer(gl.FRAMEBUFFER, selectFb);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, selectFb.colorTex, 0);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, selectFb.depthRb);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
*/
};

Main.prototype.draw = function() {
	gl.clearColor(0.2, 0.6, 0.2, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	var s = shaders.tile;
	var size = {x:40, y:20};
	gl.uniformMatrix4fv(s.uMVP.location, false, new Mat4([
		2.0 / size.x, 0.0, 0.0, 0.0,
		0.0, 2.0 / size.y, 0.0, 0.0,
		0.0, 0.0, 1.0, 0.0,
		-1.0, -1.0, 0.0, 1.0
	]));
	gl.uniform4f(s.uColor0.location, 1.0, 0.5, 0.5, 1.0);
	gl.uniform4f(s.uColor1.location, 0.7, 1.0, 0.25, 1.0);

	var mt = new engine.MersenneTwister(0x62344722);

	var data3 = [];
	for (var y = 0; y < size.x; ++y) {
		for (var x = 0; x < size.y; ++x) {
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

	var buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, data3, gl.STREAM_DRAW);
	gl.vertexAttribPointer(s.aData.location, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(s.aData.location);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, data3.length / 3);
	gl.disableVertexAttribArray(s.aData.location);
	gl.deleteBuffer(buffer);
	delete buffer;

};

exports = Main;
