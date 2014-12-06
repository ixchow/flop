var Mat4 = function() {
	var mat4 = null;
	if (arguments.length == 16) {
		mat4 = new Float32Array(arguments);
	} else if (arguments.length == 4) {
		mat4 = new Float32Array([
			arguments[0].x, arguments[0].y, arguments[0].z, arguments[0].w,
			arguments[1].x, arguments[1].y, arguments[1].z, arguments[1].w,
			arguments[2].x, arguments[2].y, arguments[2].z, arguments[2].w,
			arguments[3].x, arguments[3].y, arguments[3].z, arguments[3].w
			]);
	} else if (arguments.length == 1) {
		mat4 = new Float32Array([
			arguments[0], 0.0, 0.0, 0.0,
			0.0, arguments[0], 0.0, 0.0,
			0.0, 0.0, arguments[0], 0.0,
			0.0, 0.0, 0.0, arguments[0]
			]);
	} else {
		throw "Invalid arguments to Mat4 constructor";
	}

	mat4.times = function(b) {
		if (b.length == 16) {
			var ret = new Mat4(0.0);
			for (var c = 0; c < 4; ++c) {
				for (var r = 0; r < 4; ++r) {
					for (var i = 0; i < 4; ++i) {
						ret[c * 4 + r] += this[i * 4 + r] * b[c * 4 + i];
					}
				}
			}
			return ret;
		} else if (b instanceof engine.Vec4) {
			return new engine.Vec4(
				this[0] * b.x + this[4] * b.y + this[8] * b.z + this[12] * b.w,
				this[1] * b.x + this[5] * b.y + this[9] * b.z + this[13] * b.w,
				this[2] * b.x + this[6] * b.y + this[10] * b.z + this[14] * b.w,
				this[3] * b.x + this[7] * b.y + this[11] * b.z + this[15] * b.w
			);
		} else {
			console.log(b)
			throw "Can't multiply Mat4 by that.";
		}
	};

	return mat4;
};

exports = Mat4;
