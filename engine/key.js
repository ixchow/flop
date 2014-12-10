function send(e, isDown) {
	var id;
	if ('code' in e) {
		id = e.code;
	} else if ('key' in e) {
		id = e.key;
	} else {
		id = e.keyIdentifier;
	}
	engine.CurrentScene && engine.CurrentScene.key && engine.CurrentScene.key(id, isDown);
}


exports = {
	down: function(e) {
		send(e, true);
		e.preventDefault();
		return false;
	},
	up: function(e) {
		send(e, false);
		e.preventDefault();
		return false;
	}
};
