uniform mat4 uMVP;
uniform vec4 uColor0;
uniform vec4 uColor1;
uniform sampler2D uPosTex;
uniform sampler2D uRotTex;
uniform sampler2D uColTex;
uniform sampler2D uColorsTex;

uniform vec4 uTransition;

attribute vec4 aData;

varying vec4 vColor;

void main() {
	vec4 posFromTo = texture2D(uPosTex, aData.zw);
	vec4 rotFromTo = texture2D(uRotTex, aData.zw);
	vec4 colFromTo = texture2D(uColTex, aData.zw);

	float dis = min(
		length(uTransition.xy - posFromTo.xy),
		length(uTransition.xy - posFromTo.zw)
		);
	float len = length(posFromTo.xy - posFromTo.zw);

	float t = clamp((dis * uTransition.z + uTransition.w) / (len + 0.5), 0.0, 1.0);

	float smooth_t = t * t * (3.0 - 2.0 * t);

	vec2 rot = mix(rotFromTo.xy, rotFromTo.zw, smooth_t);
	vec2 xd = vec2(cos(rot.x), sin(rot.x));
	vec2 yd = vec2(-xd.y, xd.x);

	vec2 pos = mix(posFromTo.xy, posFromTo.zw, smooth_t);
	pos.y += (0.25 - (t - 0.5) * (t - 0.5)) * 0.5 * len;

	pos += xd * aData.x + yd * aData.y;

	if (t < 0.5) {
		vColor = mix(
			texture2D(uColorsTex, vec2(0.25, colFromTo.y)),
			texture2D(uColorsTex, vec2(0.75, colFromTo.y)),
			colFromTo.x
		);
	} else {
		vColor = mix(
			texture2D(uColorsTex, vec2(0.25, colFromTo.w)),
			texture2D(uColorsTex, vec2(0.75, colFromTo.w)),
			colFromTo.z
		);
	}
	gl_Position = uMVP * vec4(pos, 0.0, 1.0);
}
