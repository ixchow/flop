import bpy
import math
import sys
import json

filename = None
for i in range(0, len(sys.argv)):
	if sys.argv[i] == '--':
		if len(sys.argv) == i + 2:
			filename = sys.argv[i+1]

if filename == None:
	print("Please pass '-- <outfile>' after the script name", file=sys.stderr)
	bpy.ops.wm.quit_blender()

#Attrib conversion function:
def to_normalized_uint8(val):
	val = int(val * 255 + 0.5)
	if val < 0: val = 0
	if val > 255: val = 255
	return val


#Write a mesh with just position:
def mesh_data(obj):
	bpy.context.scene.layers = obj.layers
	try:
		bpy.ops.object.mode_set(mode='OBJECT')
	except:
		print("Ignoring error setting mode to object")
		
	obj.data = obj.data.copy() #"make single user" (?)
	try:
		bpy.ops.object.convert(target='MESH', keep_original=False) #apply modifiers:
	except:
		print("Ignoring error applying modifiers")
	#First, triangulate the mesh:
	bpy.ops.object.select_all(action='DESELECT')
	obj.select = True
	bpy.context.scene.objects.active = obj
	bpy.ops.object.mode_set(mode='EDIT')
	bpy.ops.mesh.select_all(action='SELECT')

	#use_beauty went away in 2.70, now use:
	bpy.ops.mesh.quads_convert_to_tris(quad_method='BEAUTY', ngon_method='BEAUTY')
	bpy.ops.object.mode_set(mode='OBJECT')

	#Consider possibly using code to bake color:
	try:
		bpy.ops.mesh.vertex_color_add()
		bpy.context.scene.render.bake_type = 'FULL'
		bpy.context.scene.render.use_bake_to_vertex_color = True
		bpy.ops.object.bake_image()
	except:
		print("Ignoring error during bake")

	verts = []
	#if do_flags & BakeTransform:
	if True:
		for poly in obj.data.polygons:
			assert(len(poly.vertices) == 3)
			for vi in poly.vertices:
				xf = obj.data.vertices[vi].co
				verts.append((xf[0],xf[1],xf[2]))
	# else:
	# 	for poly in obj.data.polygons:
	# 		assert(len(poly.vertices) == 3)
	# 		for vi in poly.vertices:
	# 			verts.append(tuple(obj.data.vertices[vi].co))

	#if do_flags & DoColor:
	colors = []
	for poly in obj.data.polygons:
		assert(len(poly.vertices) == 3)
		if True: #do_flags & BakeColor:
			vcs = obj.data.vertex_colors[-1].data
			for idx in poly.loop_indices:
				col = tuple(map(to_normalized_uint8, vcs[idx].color))
				assert(len(col) == 3)
				colors.append((col[0], col[1], col[2], 255))
			
		#else:
		#	mat = obj.material_slots[poly.material_index].material
		#	if mat.use_transparency:
		#		alpha = mat.alpha
		#	else:
		#		alpha = 1.0
		#	color = tuple(mat.diffuse_color) + (alpha,)
		#	color = tuple(map(to_normalized_uint8, color))

		#	for vi in poly.vertices:
		#		colors.append(color)
	
	#if do_flags & DoTexture0:
	#	texcoords = []
	#	assert(len(obj.data.uv_layers) == 1)
	#	uvs = obj.data.uv_layers[0].data
	#	for poly in obj.data.polygons:
	#		for v in poly.loop_indices:
	#			uv = uvs[v].uv
	#			texcoords.append((uv[0], 1.0 - uv[1])) #upper-left pixel origin

	
	#this code would trim trailing zeros from 1D or 2D attribs:
	#shrink_attrib(verts)
	#if do_flags & DoColor:
	#	shrink_attrib(colors)
	#if do_flags & DoTexture0:
	#	shrink_attrib(texcoords)

	#TODO: consider tristripping

	data = {'verts3' : [], 'colors4' : [] }

	def matrix_to_Mat4(m):
		return "new engine.Mat4(" \
			+ ",".join(map(str,m.col[0])) + ", " \
			+ ",".join(map(str,m.col[1])) + ", " \
			+ ",".join(map(str,m.col[2])) + ", " \
			+ ",".join(map(str,m.col[3])) + ")" \

	data['localToParent'] = matrix_to_Mat4(obj.matrix_local)
	data['localToWorld'] = matrix_to_Mat4(obj.matrix_world)
	data['emit'] = 'engine.emitMesh';

	for v in verts:
		data['verts3'].extend(v)
	for c in colors:
		data['colors4'].extend(c)

	assert(len(data['verts3']) / 3 == len(data['colors4']) / 4)

	data['colors4'] = 'new Uint8Array([' + ', '.join(map(str,data['colors4'])) + '])'

	return data

data = {}
for obj in bpy.data.objects:
	if obj.type == 'MESH':
		if obj.name[0].startswith('.'):
			print("Skipping " + obj.name)
			continue
		print("Exporting " + obj.name)
		path = []
		at = obj
		while at != None:
			path.append(at.name)
			at = at.parent
		obj_data = data
		while len(path):
			key = path.pop()
			if key not in obj_data:
				obj_data[key] = {}
			obj_data = obj_data[key]
		mesh = mesh_data(obj)
		for k, v in mesh.items():
			obj_data[k] = v


#Using our own dump function so we can create Float32Arrays directly:
def dump(out, data):
	def write(s):
		out.write(bytes(s, "UTF-8"))
	write("{\n")
	first = True
	for k, v in sorted(data.items()):
		if first:
			first = False
		else:
			write(",\n")
		write(k + ":")
		if type(v) == dict:
			dump(out, v)
		elif type(v) == str:
			write(v)
		elif type(v) == list:
			write("new Float32Array([")
			for i in range(0,len(v)):
				if i > 0: write(",")
				if i % 6 == 0: write("\n")
				write("%8g" % v[i])
			write("])")
		else:
			raise Exception("Don't know how to deal with something that isn't a list or dict.")
	write("}")

with open(filename, 'wb') as f:
	dump(f, data)
