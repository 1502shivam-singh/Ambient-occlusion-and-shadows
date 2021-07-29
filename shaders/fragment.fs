  #include <packing>

  precision mediump float;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;
  uniform vec2 u_fragMouse;
	
  uniform sampler2D tDiffuse;
  uniform sampler2D tDepth;
  uniform sampler2D u_texture;
  uniform float u_cameraNear;
  uniform float u_cameraFar;

  varying vec2 vUv;
  varying float transfer;
  varying float value;
  varying vec3 vColor;
  varying vec3 camPos;

  #define NUM_OCTAVES 5

  float hash(float n) {
    return fract(sin(n) * 1e4);
  }
  float hash(vec2 p) {
    return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x))));
  }

  float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), u);
  }

  float fbm(float x) {
    float v = 0.0;
    float a = 0.5;
    float shift = float(100);
    for (int i = 0; i < NUM_OCTAVES; ++i) {
      v += a * noise(x);
      x = x * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u * u * (3.0 - 2.0 * u);

    float res = mix(
      mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
      mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
    return res * res;
  }

	float readDepth( sampler2D depthSampler, vec2 coord ) {
		float fragCoordZ = texture2D( depthSampler, coord ).x;
		float viewZ = perspectiveDepthToViewZ( fragCoordZ, u_cameraNear, u_cameraFar );
		return viewZToOrthographicDepth( viewZ, u_cameraNear, u_cameraFar );
	}

  void main() {
    vec2 px = gl_FragCoord.xy / u_resolution;
    vec2 mouse = u_fragMouse;
    // vec3 texture = texture2D(tDiffuse, vUv).rgb;
	  float depth = readDepth(tDepth, vUv);
	  float diffuse = readDepth(tDiffuse, vUv);
	  // lowp float depthTex = texture2D(tDepth, vUv).x;
    // This code section related to setting the mouse position and the circle size with accordance to the aspect ratio comment if you want perfect [0,1] range
    px.x *= (u_resolution.x / u_resolution.y);
    mouse.x *= (u_resolution.x / u_resolution.y);

    float r_tex = texture2D(u_texture, vUv.xy).r;
    float g_tex = texture2D(u_texture, vUv.xy).g;
    float b_tex = texture2D(u_texture, vUv.xy).b;

    float circle = step(1.0/20.0, distance(px, mouse));

    // gl_FragColor.rgb = vec3(r_tex,g_tex,b_tex)*(1.0-depth);

    // gl_FragColor.rgb = (depth)*vec3(1.0, 1.0, 1.0);
    gl_FragColor.rgb = vec3(depth);

    gl_FragColor.a = 1.0;
  }

  /*
   Previous issue - 
    depth was always 0.0, updating version of three.js fixed this,
    lesson - keep updated framework versions
  */