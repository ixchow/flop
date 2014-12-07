uniform mat4 uMVP;

attribute vec2 aVertex;
attribute vec4 aColor;

varying vec4 vColor;

void main() {
	vColor = aColor;
	gl_Position = uMVP * vec4(aVertex, 0.0, 1.0);
}
