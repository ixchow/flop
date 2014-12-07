uniform mat4 uMVP;
uniform vec4 uColor0;
uniform vec4 uColor1;
uniform sampler2D uPosTex;
uniform sampler2D uRotTex;

uniform vec4 uTransition;

attribute vec4 aData;

varying vec4 vColor;

void main() {
	vec4 posFromTo = texture2D(uPosTex, aData.zw);
	vec4 rotFromTo = texture2D(uRotTex, aData.zw);

	float dis = min(
		length(uTransition.xy - posFromTo.xy),
		length(uTransition.xy - posFromTo.zw)
		);
	float len = length(posFromTo.xy - posFromTo.zw) + 1.0;

	float t = clamp((dis * uTransition.z + uTransition.w) / len, 0.0, 1.0);

	vec2 rot = mix(rotFromTo.xy, rotFromTo.zw, t);
	vec2 xd = vec2(cos(rot.x), sin(rot.x));
	vec2 yd = vec2(-xd.y, xd.x);

	vec2 pos = mix(posFromTo.xy, posFromTo.zw, t);
	pos += xd * aData.x + yd * aData.y;
	vColor = vec4(aData.zw, 0.0, 1.0); //mix(uColor0, uColor1, aData.z);
	gl_Position = uMVP * vec4(pos, 0.0, 1.0);
}
