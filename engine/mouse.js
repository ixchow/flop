var isDown = false;
var canvas = null;

function send(e) {
	if (!canvas) canvas = document.getElementById("canvas");
	var rect = canvas.getBoundingClientRect();
	var x = (e.clientX - rect.left) | 0;
	var y = engine.Size.y - 1 - ((e.clientY - rect.top) | 0);
	engine.CurrentScene.mouse && engine.CurrentScene.mouse(x, y, isDown);
}

exports = {
	move: function(e) {
		send(e);
		return false;
	},
	down: function(e) {
		isDown = true;
		send(e);
		return false;
	},
	up: function(e) {
		isDown = false;
		send(e);
		return false;
	}
}
