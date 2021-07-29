  precision mediump float;

  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;

  varying vec3 camPos;
  // uniform sampler2D tDiffuse;
  // uniform sampler2D tDepth;
  // uniform float u_cameraNear;
  // uniform float u_cameraFar;

  // #if NUM_HEMI_LIGHTS > 0
  //   struct HemisphereLight {
  //     vec3 direction;
  //     vec3 groundColor;
  //     vec3 skyColor;
  //    };
  
  //    uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
  // #endif

  // #if NUM_POINT_LIGHTS > 0
  //   struct PointLight {
  //     vec3 color;
  //     float decay;
  //     float distance;
  //     vec3 position;
  //     float shadow;
  //     float shadowBias;
  //     float shadowMapSize;
  //     float shadowRadius;
  //    };
  
  //    uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
  // #endif

// color: {}
// decay: {}
// distance: {}
// position: {}
// shadow: {}
// shadowBias: {}
// shadowMapSize: {}
// shadowRadius: {}

  varying vec2 vUv;
  // varying float transfer;
  // varying float value;
  varying vec3 vColor;

  mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;

    return mat4(oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s, 0.0,
      oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s, 0.0,
      oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c, 0.0,
      0.0, 0.0, 0.0, 1.0);
  }

  vec3 rotate(vec3 v, vec3 axis, float angle) {
    mat4 m = rotationMatrix(axis, angle);
    return (m * vec4(v, 1.0)).xyz;
  }

  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
  }

  vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    //   x0 = x0 - 0.0 + 0.0 * C.xxx;
    //   x1 = x0 - i1  + 1.0 * C.xxx;
    //   x2 = x0 - i2  + 2.0 * C.xxx;
    //   x3 = x0 - 1.0 + 3.0 * C.xxx;
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy; // -1.0+3.0*C.x = -0.5 = -D.y

    // Permutations
    i = mod289(i);
    vec4 p = permute(permute(permute(
          i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
        i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
      i.x + vec4(0.0, i1.x, i2.x, 1.0));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
    float n_ = 0.142857142857; // 1.0/7.0
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z); //  mod(p,7*7)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_); // mod(j,N)

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
    //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    // Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1),
      dot(p2, x2), dot(p3, x3)));
  }

  highp float rand(vec2 co) {
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt = dot(co.xy, vec2(a, b));
    highp float sn = mod(dt, 3.14);
    return fract(sin(sn) * c);
  }

  float noise(float v, vec2 _st) {
    float f = rand(vec2(fract(v)));
    return mix(rand(vec2(v) + 0.2), rand(vec2(v)), smoothstep(0.1, 1.0, f));
  }

  /*
      Available functions -
      snoise - simplex noise snoise(vec3 v)
      taylorInvSqrt - taylor inverse square root for finding square root of 1/f(x) 
  */
  const float amplitude = 0.125;
  const float frequency = .1;
  const float PI = 3.14159;
  // float value = 0.0;
  float Gaussian_h = 0.1; // 0.25;    // For mobile
  float Gaussian_sd = 0.09;
  float radius = 1.5;

	// float readDepth( sampler2D depthSampler, vec2 coord ) {
	// 	float fragCoordZ = texture2D( depthSampler, coord ).x;
	// 	float viewZ = perspectiveDepthToViewZ( fragCoordZ, u_cameraNear, u_cameraFar );
	// 	return viewZToOrthographicDepth( viewZ, u_cameraNear, u_cameraFar );
	// }

  void main()
  {
		vUv = uv;
		vec3 pos = position;
    camPos = cameraPosition;
		// pos = rotate(pos, vec3(0.0,1.0,0.0), u_time);
		// pos *= sin(u_time);
		// vColor = vec3(sin(u_time));
	  // float depth = readDepth(tDepth, vUv);
    // if(distance(u_mouse,pos.xy)<=0.3) 
    // {
  	// 	vColor = vec3(1.0, 0.4, 0.3)*depth;
    // }
    // else
    // {
    // }
  	vColor = vec3(1.0, 0.0, 0.0);

		gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }



  // void main() 
  // {
  //   vUv = uv;
  //   // vec3 pos = vec3(position.x, position.y, u_zpos);
  //   vec3 pos = vec3(position);
    
  //   value = aSize;
  //   vec4 ecPosition = modelViewMatrix * vec4( pos, 1.0 );
  //   // vec3 ecPosition = vec3(modelViewMatrix * pos);
  //   float magnitude = distance(pos, vec3(0.0));
  //   // pos = rotate(pos, vec3(1.0,1.0,0.0), 3.14);
  //   // vec3 pos = position;
  //   // For scaling down the x - coordinate system according to the aspect ratio 
  //   // for unstretched shapes meshes (scaling x axis for devices with longer width
  //   // and scaling y axis for devices with longer heights, mobile - this needs to be done)

  //   // float noiseFreq = 2.5;
  //   // float noiseAmp = 0.15;
  //   // vec3 noisePos = vec3(pos.x * noiseFreq + u_time, pos.y, pos.z);
  //   vec3 tnorm = normalize(normalMatrix * normal);

  //   // vec3 LightPosition_bulge = 2.0*normalize(normal);
  //   vec3 LightPosition_bulge = vec3(0.0, 0.0, 2.0);
  //   vec3 lightVec_bulge = normalize(LightPosition_bulge - vec3(ecPosition));
  //   float costheta_bulge = dot(tnorm, lightVec_bulge);
  //   float colorMix_bulge = 0.5 + 0.5 * costheta_bulge; 

  //   // vec3 LightPosition = vec3(-3.0, 3.0, -3.0);
  //   vec3 lightVec = normalize(hemisphereLights[0].direction - vec3(ecPosition));
  //   float costheta = dot(tnorm, lightVec);
  //   float colorMix = 0.5 + 0.5 * costheta;

  //   vec3 gColor = vec3(0.0, 0.0, 0.0);
  //   vec3 sColor = vec3(1.0, 0.0, 1.0);
  //   vec3 gColor_bulge = vec3(0.0, 0.0, 0.0);
  //   vec3 sColor_bulge = vec3(1.0, 0.0, 0.0);

  //   if(distance(u_mouse,pos.xy)<=0.3) 
  //   {
  //     float vertexDistance = distance(u_mouse, pos.xy);
  //     float height = ((Gaussian_h+0.05)* exp(-(0.5*pow((vertexDistance)/Gaussian_sd, 2.0))));
  //     // multiply height with random vertex attribute 'aSize' per vertex, to create the noise bump effect 
  //     pos = (length(pos) + (height)*aSize)*normalize(normal);
  //     Color = mix(gColor_bulge, sColor_bulge, colorMix_bulge);
  //     // Color = mix(hemisphereLights[0].groundColor, hemisphereLights[0].skyColor, colorMix);
  //     // Color = pointLights[0].color*pointLights[0].shadow;
  //   }
  //   else
  //   {
  //     Color = mix(hemisphereLights[0].groundColor, hemisphereLights[0].skyColor, colorMix);
  //     // Color = pointLights[0].color;
  //   }

  //   // pos.z += snoise(noisePos) * noiseAmp;
  //   // pos = normalize(normal)*magnitude*sin(aSize);
  //   // value = length(u_mouse) * 5.0;
  //   // transfer = snoise(noisePos) * noiseAmp;

  //   // float distance = length(pos);
  //   // pos -= snoise(noisePos) * sin(-PI * distance * frequency + u_time);

  //   // gl_Position =  projectionMatrix * viewMatrix * modelMatrix* vec4(u_scale, 1.0, 1.0) * vec4( pos, 1.0 );
  //   gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos.xyz, 1.0);
  //   // gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position.xy,u_zpos, 1.0);
  //   // gl_PointSize = aSize*(1.0/-mvPosition.z);
  // }