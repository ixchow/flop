import subprocess
import os.path

class BuildResult:
	def __init__(self):
		self.html = ""
		self.js = ""

class BuildJS:
	"""This will somehow build javascript files"""
	def __init__(self, path):
		self.path = path
		self.namespace = path[0:path.rfind('.')].replace('/','.')
	def build(self):
		print 'Building ' + self.path
		result = BuildResult()
		with open(self.path, 'rb') as f:
			result.js += "%s = (function(exports) {\n" % self.namespace
			result.js += f.read()
			result.js += "\nreturn exports;\n"
			result.js += "})({});\n"
		return result

class BuildNamespace:
	def __init__(self, path):
		self.path = path
	def build(self):
		print 'Building ' + self.path
		result = BuildResult()
		result.js = 'window.%s = {};\n' % self.path.replace('/','.')
		return result

class BuildMesh:
	"""This will somehow build meshes from blender files"""
	blender = None
	def __init__(self, path):
		self.path = path
		self.namespace = path[0:path.rfind('.')].replace('/','.')
		self.tmp_path = "tmp/" + self.namespace + ".mesh"
		if BuildMesh.blender == None:
			if subprocess.call(['which', '-s', 'blender']) == 0:
				BuildMesh.blender = 'blender'
			else:
				blender_paths = [
					'/Applications/blender.app/Contents/MacOS/blender',
					'~/Blender/blender.app/Contents/MacOS/blender',
					'~/blender-2.71-linux-glibc211-x86_64/blender'
					]
				for blender_path in blender_paths:
					blender_path = os.path.expanduser(blender_path)
					if os.path.isfile(blender_path):
						BuildMesh.blender = blender_path
						break

			if BuildMesh.blender == None:
				raise Exception("blender not found on $PATH or in [" + ', '.join(blender_paths) + "]")
			else:
				print "Using blender '" + BuildMesh.blender + "'."
				

	def build(self):
		print 'Building ' + self.path
		result = BuildResult()
		blender_cmd = [BuildMesh.blender, "--background", self.path, "--python", "tools/blend-to-js.py", "--", self.tmp_path]
		if os.path.exists(self.tmp_path) and os.path.getmtime(self.tmp_path) >= os.path.getmtime(self.path):
			print ' (using existing ' + self.tmp_path + ')'
		elif subprocess.call(blender_cmd) != 0:
			raise Exception("Failed to execute `" + " ".join(blender_cmd) + "`")
		with open(self.tmp_path, 'rb') as f:
			result.js = "window." + self.namespace + " = " + f.read() + ";\n";
		return result

class BuildShader:
	"""Builds a shader by copying to a script tag and setting a type."""
	def __init__(self, path):
		self.path = path
		if path.endswith('.fs.glsl'):
			self.shader_type = "fragment"
		elif path.endswith('.vs.glsl'):
			self.shader_type = "vertex"
		else:
			assert(False)
		self.namespace = path[0:path.rfind('.')].replace('/','.')
	def build(self):
		print 'Building ' + self.path
		result = BuildResult()
		with open(self.path, 'rb') as f:
			result.html += '<script id="' + self.namespace + '" type="x-shader/x-' + self.shader_type + '">\n';
			result.html += f.read()
			result.html += '</script>\n';
		#No js; will get assembled by engine.init
		#result.js += "%s = (function(exports) {\n" % self.namespace
		#result.js += f.read()
		#result.js += "\nreturn exports;\n"
		#result.js += "})({});\n"
		return result


class BuildMML:
	def __init__(self, path):
		self.path = path
		self.namespace = path[0:path.rfind('.')].replace('/','.')
	def build(self):
		print 'Building ' + self.path
		result = BuildResult()
		with open(self.path, 'rb') as f:
			mml = f.read()
			mml = mml.replace("\n", " ")
			result.js = '{0} = engine.mml("{1}");\n'.format(self.namespace, mml)
		return result
