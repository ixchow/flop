
def minify(input):
	import subprocess

	if subprocess.call(['which', '-s', 'uglifyjs']) == 0:
		jscmd = ['uglifyjs']
	else:
		print "!!! WARNING !!! uglifyjs is not installed; skipping js minification"
		print "!!! Try `npm install -g uglify-js`"
		jscmd = ['cat']

	p = subprocess.Popen(jscmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE)
	output, err = p.communicate(input)
	p.wait
	return output
