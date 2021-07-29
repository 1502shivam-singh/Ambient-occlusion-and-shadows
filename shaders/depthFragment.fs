#include <packing>

precision mediump float;

uniform float u_time;
uniform sampler2D u_texture;

varying vec2 vUv;

void main() 
{
	float r_tex = texture2D(u_texture, vUv.xy).r;
    float g_tex = texture2D(u_texture, vUv.xy).g;
    float b_tex = texture2D(u_texture, vUv.xy).b;

	// gl_FragColor.rgb = vec3(r_tex, g_tex, b_tex);
	gl_FragColor.rgb = vec3(0.3, 0.5, 0.1);
	gl_FragColor.a = 1.0;
}