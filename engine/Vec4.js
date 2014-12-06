var Vec4 = function(x,y,z,w) {
	this.x = x;
	this.y = y;
	this.z = z;
	this.w = w;
	return this;
};

Vec4.prototype.plus = function(b) {
	return new Vec4(this.x + b.x, this.y + b.y, this.z + b.z, this.z + b.z);
};

Vec4.prototype.minus = function(b) {
	return new Vec4(this.x - b.x, this.y - b.y, this.z - b.z, this.w - b.w);
};

Vec4.prototype.times = function(s) {
	return new Vec4(this.x * s, this.y * s, this.z * s, this.w * s);
};

Vec4.prototype.dot = function(b) {
	return this.x * b.x + this.y * b.y + this.z * b.z + this.w * b.w;
};

Vec4.prototype.normalized = function() {
	var invMag = Math.sqrt(this.dot(this));
	if (invMag == 0.0) {
		return new Vec4(1, 0, 0);
	} else {
		invMag = 1.0 / invMag;
		return this.times(invMag);
	}
}


exports = Vec4
