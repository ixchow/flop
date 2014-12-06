var Vec3 = function(x,y,z) {
	this.x = x;
	this.y = y;
	this.z = z;
	return this;
};

Vec3.prototype.plus = function(b) {
	return new Vec3(this.x + b.x, this.y + b.y, this.z + b.z);
};

Vec3.prototype.minus = function(b) {
	return new Vec3(this.x - b.x, this.y - b.y, this.z - b.z);
};

Vec3.prototype.times = function(s) {
	return new Vec3(this.x * s, this.y * s, this.z * s);
};

Vec3.prototype.dot = function(b) {
	return this.x * b.x + this.y * b.y + this.z * b.z;
};

Vec3.prototype.cross = function(b) {
	return new Vec3(
		this.y * b.z - this.z * b.y,
		this.z * b.x - this.x * b.z,
		this.x * b.y - this.y * b.x
	);
};

Vec3.prototype.normalized = function() {
	var invMag = Math.sqrt(this.dot(this));
	if (invMag == 0.0) {
		return new Vec3(1, 0, 0);
	} else {
		invMag = 1.0 / invMag;
		return this.times(invMag);
	}
}


exports = Vec3
