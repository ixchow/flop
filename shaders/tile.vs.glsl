uniform mat4 uMVP;
uniform vec4 uColor0;
uniform vec4 uColor1;

attribute vec3 aData;

varying vec4 vColor;

void main() {
	vColor = mix(uColor0, uColor1, aData.z);
	gl_Position = uMVP * vec4(aData.x, aData.y, 0.0, 1.0);
}
