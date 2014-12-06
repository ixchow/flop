exports = function() {
	var scripts = document.getElementsByTagName("script");
	var programNames = {};

	function getProgram(id) {
		var path = id.split('.');
		var name = path.pop();
		//Walk to parent of desired program:
		var par = window;
		path.forEach(function(n) {
			if (!par.hasOwnProperty(n)) {
				par[n] = {}; //create objects all the way up...
			}
			par = par[n];
		});

		//Create program if needed:
		if (!par.hasOwnProperty(name)) {
			par[name] = gl.createProgram();
		} else {
			//TODO: check if par[name] is {}
		}

		return par[name];
	}

	function readScript(script) {
		var ret = "";
		var currentChild = script.firstChild;
	 
		while(currentChild) {
			if (currentChild.nodeType == currentChild.TEXT_NODE) {
				ret += currentChild.textContent;
			}
			currentChild = currentChild.nextSibling;
		}
		return ret;
	}

	//Attach fragment and vertex shaders from scripts:
	for (var i = 0; i < scripts.length; ++i) {
		var script = scripts[i];
		var shaderType = undefined;
		var id = script.id;

		if (script.type == "x-shader/x-fragment") {
			shaderType = gl.FRAGMENT_SHADER;
			if (id.substr(id.length-3,3) != ".fs") {
				console.error("Shader has id '" + id + "'; expecting suffix '.fs'");
				return false;
			}
		} else if (script.type == "x-shader/x-vertex") {
			shaderType = gl.VERTEX_SHADER;
			if (id.substr(id.length-3,3) != ".vs") {
				console.error("Shader has id '" + id + "'; expecting suffix '.vs'");
				return false;
			}
		} else {
			continue;
		}
		id = id.substr(0, id.length-3);
		programNames[id] = id;

		var program = getProgram(id);
		var shader = gl.createShader(shaderType);
		var source = readScript(script);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error("Failed to compile shader " + script.id + ": " + gl.getShaderInfoLog(shader));
			return false;
		}
		gl.attachShader(program, shader);
	}

	//Now that shaders are attached, link programs:
	for (name in programNames) {
		var program = getProgram(name);

		gl.bindAttribLocation(program, 0, "aVertex");

		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error("Unable to link shader program '" + name + "'");
			return false;
		}

		var na = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
		for (var i = 0; i < na; ++i) {
			var a = gl.getActiveAttrib(program, i);
			program[a.name] = {
				location:gl.getAttribLocation(program, a.name),
				type:a.type,
				size:a.size
			};
		}

		var nu = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
		for (var i = 0; i < nu; ++i) {
			var u = gl.getActiveUniform(program, i);
			program[u.name] = {
				location:gl.getUniformLocation(program, u.name),
				type:a.type,
				size:a.size
			};
		}
	}

	return true;
};
