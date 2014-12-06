
// Calling this make a new prop.  A prop is a function:
//  () -> get the value
//  (v) -> set the value
//  (fn) -> register a value-change listener
function prop(v) {
	var value = v;
	var callbacks = [];
	return function() {
		if (arguments.length == 0) {
			return value;
		} else if (typeof arguments[0] == 'function') {
			callbacks.push(arguments[0]);
		} else {
			value = arguments[0];
			callbacks.forEach(function(c) {
				c(value);
			});
		}
	}
}

function supports_html5_storage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}

function lsprop(read, normalize) {
	return function(name, initialValue) {

		if (supports_html5_storage) {
			initialValue = read(localStorage.getItem(name) || initialValue);
		}

		var p = prop(normalize(initialValue));
		if (supports_html5_storage) {
			p(function(v) {
				localStorage.setItem(name, normalize(v));
			});
		}

		return p;
	}
}

exports = {
	bool: lsprop(function(v) { return v == 'true' }, function(v) { return !!v }),
	float: lsprop(function(v) { return parseFloat(v) }, function(v) { return v })
}