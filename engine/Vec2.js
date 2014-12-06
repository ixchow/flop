var Vec2 = function(x,y) {
	this.x = x;
	this.y = y;
	return this;
};

Vec2.prototype.plus = function(b) {
	return new Vec2(this.x + b.x, this.y + b.y);
};

Vec2.prototype.minus = function(b) {
	return new Vec2(this.x - b.x, this.y - b.y);
};

Vec2.prototype.times = function(s) {
	return new Vec2(s * this.x, s * this.y);
}

Vec2.prototype.dot = function(b) {
	return this.x * b.x + this.y * b.y;
}

Vec2.prototype.perpendicular = function() {
	return new Vec2(-this.y, this.x);
}

Vec2.prototype.normalized = function() {
	var invMag = Math.sqrt(this.dot(this));
	if (invMag == 0.0) {
		return new Vec2(1, 0);
	} else {
		invMag = 1.0 / invMag;
		return this.times(invMag);
	}
}

Vec2.equals = function(a, b) {
	return a.x == b.x && a.y == b.y;
}

exports = Vec2;
