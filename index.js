window.addEventListener('resize', onWindowResize, false);

let screenWidth = window.innerWidth;
let screenHeight = window.innerHeight;

document.querySelector(".container").style.width = 8 * screenWidth + "px";
const canvas = document.querySelector('.homeCanvas');

const colArr = ["gray", "blue", "white", "pink", "yellow", "grey", "green"];

for (let i = 0; i < 8; i++) {
  document.querySelector(".block" + i).style.width = screenWidth + "px";
  document.querySelector(".block" + i).style.height = screenHeight + "px";
  document.querySelector(".block" + i).style.backgroundColor = colArr[i];
}

let xPos = 0;
const section = 8 // Change here for more full screen divs
let containerSize = screenWidth * section;
const easing = "slow(0.7, 2, true)";
// --------------- scroll system (touch and scroll based) start -------------------- //
if (screenWidth > 700) {
  $('.container').on('mousewheel', function (event) {
    // console.log(event.deltaX, event.deltaY, event.deltaFactor);
    const smoothness = 5;
    const deltaY = event.deltaY;
    const xdiff = deltaY * smoothness;

    if (deltaY > 0) {
      // scroll up
      // console.log($(".homeCanvas").offset().left);
      // translateX should go towards +ve value
      xPos + xdiff < 0 ? xPos += xdiff : xPos = 0;
      gsap.to(".container", {
        x: xPos,
        ease: easing
      });
    } else {
      // scroll dow
      // translateX should go towards -ve value
      xPos + xdiff >= -screenWidth * 7 ? xPos += xdiff : xPos = -screenWidth * (section - 1);
      gsap.to(".container", {
        x: xPos,
        ease: easing
      });
    }
  });
} else {
  const container = document.querySelector(".container");
  let yPos = 0;
  const factor = 0.1;

  $(".container").swipe({
    swipeStatus: function (event, phase, direction, distance, duration, fingers, fingerData, currentDirection) {

      const additive = distance * factor;
      const posX = event.changedTouches[0].pageX,
        posY = event.changedTouches[0].pageY;
      const travel = posX;

      // if (duration / 1000 < 0.95) 
      {
        // -------------------- Basic vertical scroll system for a touch device ------------------------------------
        if (direction === "up") {
          yPos - additive > (-screenHeight * 7) ? yPos -= additive : yPos = -screenHeight * (section - 1);
          gsap.to(".container", {
            y: yPos
          });
        } else if (direction === "down") {
          yPos + additive < 0 ? yPos += additive : yPos = 0;
          gsap.to(".container", {
            y: yPos
          });
        }
      }
    },
    threshold: 200,
    maxTimeThreshold: 5000,
    fingers: 'all'
  });
}
// --------------- scroll system (touch and scroll based) end ---------------------- //

let camera, mesh, plane, scene, renderer, material, uniforms, canvasWidth, canvasHeight, controls, target;
let targetScene, targetCamera, targetMaterial, sphereMesh, planeMesh;
let targetUniforms;

let params = {
  format: THREE.DepthFormat,
  type: THREE.UnsignedShortType
};

let formats = {
  DepthFormat: THREE.DepthFormat,
  DepthStencilFormat: THREE.DepthStencilFormat
};
let types = {
  UnsignedShortType: THREE.UnsignedShortType,
  UnsignedIntType: THREE.UnsignedIntType,
  UnsignedInt248Type: THREE.UnsignedInt248Type
};

let mouse = {
  x: 0.0,
  y: 0.0
};
let fragMouse = {
  x: 0.0,
  y: 0.0
};

let getShaderSource = function (url) {
  return $.ajax({
    url: url,
    method: "get",
    async: false,
    xhr: function () {
      xhr = new window.XMLHttpRequest();
      xhr.onprogress = (e) => {
        if (e.lengthComputable) {
          var completedPercentage = (e.loaded * 100) / e.total;
        } else {
          contentLength = parseInt(e.target.getResponseHeader('x-decompressed-content-length'), 10);
          var completedPercentage = (e.loaded * 100) / contentLength;
        }
        console.log('progress', e.loaded / e.total * 100)
      };
      return xhr;
    },
    success: function () {
      console.log("loaded shader");
    },
    error: function(){
      console.log("Failure");
    }
  }).responseText;
}

function getRandom(a, b) {
  return a + (b - a) * Math.random();
}

// --------------- To initialise the WebGL renderer to a html5 canvas pass width and height of canvas start ------------ //
if (screenWidth > 700) {
  canvasHeight = screenHeight;
  canvasWidth = screenWidth;///2;
} else {
  canvasHeight = screenHeight / 2;
  canvasWidth = screenWidth;
  $(".homeCanvas").swipe({
    swipeStatus: function (event, phase, direction, distance, duration, fingers, fingerData, currentDirection) {

      let ctx = {
        x: (event.changedTouches[0].pageX),
        y: (event.changedTouches[0].pageY)
      };

      const canvasOffset = {
        left: $(".homeCanvas").offset().left,
        top: $(".homeCanvas").offset().top
      };

      // Now ctx has the canvas coords in its length and height parameters
      ctx.x = ((ctx.x - canvasOffset.left) / canvasWidth)
      ctx.y = ((ctx.y - canvasOffset.top) / canvasHeight)

      gsap.to(mouse, 2, {
        x: ctx.x * (canvasWidth / canvasHeight) - (canvasWidth / canvasHeight) / 2,
        y: (1.0 - ctx.y) - 0.5,
        onUpdate: () => {
          uniforms.u_mouse.value.x = mouse.x;
          uniforms.u_mouse.value.y = mouse.y;
          targetMaterial.uniforms.u_mouse.value.x = mouse.x;
          targetMaterial.uniforms.u_mouse.value.y = mouse.y;
        }
      });

      gsap.to(fragMouse, 2, {
        x: ctx.x,
        y: (1.0 - ctx.y),
        onUpdate: () => {
          uniforms.u_fragMouse.value.x = fragMouse.x;
          uniforms.u_fragMouse.value.y = fragMouse.y;
          targetMaterial.uniforms.u_fragMouse.value.x = fragMouse.x;
          targetMaterial.uniforms.u_fragMouse.value.y = fragMouse.y;
        }
      });
    },
    threshold: 200,
    maxTimeThreshold: 5000,
    fingers: 'all'
  });
}
// Below are the functions responsible for the universal mouse detection system in canvas for shader operations
// for both mobile and desktop 
canvas.addEventListener("mousemove", function (event) {
  let ctx = {
    x: (event.clientX),
    y: (event.clientY)
  };
  //  x lies in width range i.e. x2 - x1 = width, need to be mapped to [-planeWidth/2, planeWidth/2] where planeWidth = width/height for current case 
  //  y lies in height range i.e. y2 - y1 = height, need to be mapped to [-planeHeight/2, planeHeight/2] where planeHeight = 1 for current case

  const canvasOffset = {
    left: $(".homeCanvas").offset().left,
    top: $(".homeCanvas").offset().top
  };
  // Now ctx has the canvas coords in its length and height parameters

  ctx.x = ((ctx.x - canvasOffset.left) / canvasWidth);
  ctx.y = ((ctx.y - canvasOffset.top) / canvasHeight);
  // Now in the range [0,1]

  gsap.to(mouse, 2, {
    x: ctx.x * (canvasWidth / canvasHeight) - (canvasWidth / canvasHeight) / 2,
    y: (1.0 - ctx.y) - 0.5,
    onUpdate: () => {
      uniforms.u_mouse.value.x = mouse.x;
      uniforms.u_mouse.value.y = mouse.y;
      targetMaterial.uniforms.u_mouse.value.x = mouse.x;
      targetMaterial.uniforms.u_mouse.value.y = mouse.y;
    }
  });

  // u_fragMouse is actually a transfored vector from the coordinate system of NDC (-1, 1) to the coord system 0 to 1, for the mouse coordinates
  // The reason being that vertices in vertex shader are passed in NDC, but when in fragment shader, here the st vector has frame coordinates 
  // in 0 to 1 field, with origin at bottom left. So, for matching mouse coords with the fragment coord use the mcoord vector
  gsap.to(fragMouse, 2, {
    x: ctx.x,
    y: (1.0 - ctx.y),
    onUpdate: () => {
      uniforms.u_fragMouse.value.x = fragMouse.x;
      uniforms.u_fragMouse.value.y = fragMouse.y;
      targetMaterial.uniforms.u_fragMouse.value.x = fragMouse.x;
      targetMaterial.uniforms.u_fragMouse.value.y = fragMouse.y;
    }
  });
});

init(canvasWidth, canvasHeight, 0); // 1536 x 754 |||| 1920 x 942 -> 960,471
animate(); // The draw loop

function init(width, height, camChoice) {
  renderer = new THREE.WebGLRenderer({
    canvas, alpha: true
  });
  // renderer.shadowMap.enabled = true;
  // renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // renderer.autoClearColor = false;

  if (camChoice === 0) { // For perspective projection
    // Make the far point too much, and you wont see no ambient occlusion no more
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2.8);
    
    console.log(camera.position.z);
    
    setupRenderTarget(width, height);
    // length and width are put lesser for the use case of this effect, put in values in accordance with your need
    // var geometry = new THREE.PlaneBufferGeometry(width / height, 1, 300, 300);

    const radius = 0.5;
    const widthSegments = 500;
    const heightSegments = 500;
    geometry = new THREE.SphereBufferGeometry(radius, widthSegments, heightSegments);

    // Snippet to look under a buffergeometry and add custom attributes for each vertex
    const count = geometry.attributes.position.count;
    console.log(geometry.attributes)
    const attrArray = new THREE.BufferAttribute(new Float32Array(count), 1);
    
    for (let i = 0; i < attrArray.count; i++) {
      attrArray.array[i] = getRandom(0, 1)
    }

    geometry.addAttribute("aSize", attrArray, 1);

    // camera.position.z = 1.8;
    camera.position.set(0.0, 1.9, 0.0);
    camera.lookAt(new THREE.Vector3(0.0, 0.0, 0.0));

    // Remember to uncomment line in vertex shader with u_zpos variable and comment pos line 
  } else { // For orthographic projection
    camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);
    camera.position.z = 5;
    console.log(camera.position.z);
    // For reference - A 8*8 plane is present in a cartesian plane between points (-4,4) and (4,-4)
    geometry = new THREE.PlaneBufferGeometry(width / 4, height / 1.2, 5, 5); // - in case of orthographic projection matrix
    // Remember to uncomment line in vertex shader with pos variable and comment u_zpos line
  }

  scene = new THREE.Scene();
  renderer.setSize(width, height);

  uniforms = {
    u_time: {
      type: "f",
      value: 1.0
    },
    u_resolution: {
      type: "v2",
      value: new THREE.Vector2()
    },
    u_mouse: {
      type: "v2",
      value: new THREE.Vector2()
    },
    u_fragMouse: {
      type: "v2",
      value: new THREE.Vector2()
    },
    u_texture: {
      value: new THREE.TextureLoader().load("asset/tex2.jpg")
    }, // new THREE.VideoTexture( video )},
    u_scale: {
      type: "v2",
      value: new THREE.Vector2()
    },
    u_zpos: {
      type: "f",
      value: 0.0
    }
  };
  
  material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: getShaderSource("shaders/depthVertex.vs"), // vertexShader,
    fragmentShader: getShaderSource("shaders/depthFragment.fs"), // fragmentShader,
    // wireframe: true,
    side: THREE.DoubleSide
  });

  mesh = new THREE.Mesh(geometry, material);

  // const helper = new THREE.CameraHelper( camera );
  // scene.add( helper );
  let planeGeometry = new THREE.PlaneBufferGeometry(width / height, 1, 300, 300);
  let planeMaterial = new THREE.MeshBasicMaterial({color: 0xfff123, wireframe: false});
  plane = new THREE.Mesh(planeGeometry, planeMaterial);
  // plane.position.set(0.0, 0.2, 0.0);
  plane.position.set(0.0, 0.2, 0.0);
  plane.scale.set(5,5,0);
  plane.rotation.x -= Math.PI/2;
  scene.add(mesh);
  scene.add(plane);

  renderer.setPixelRatio(window.devicePixelRatio);
  // renderer.setClearColor(new THREE.Color( 0xff0000 ), 1.0);
  setupRenderScene(width, height);

  onWindowResize();
  window.addEventListener('resize', onWindowResize, false);
}

function setupRenderTarget(targetWidth, targetHeight) {
  if ( target ) target.dispose();

  const format = parseFloat( params.format );
  const type = parseFloat( params.type );

  target = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight );
  target.texture.format = THREE.RGBAFormat;
  target.texture.minFilter = THREE.NearestFilter;
  target.texture.magFilter = THREE.NearestFilter;
  target.texture.generateMipmaps = false;
  target.stencilBuffer = ( format === THREE.DepthStencilFormat ) ? true : false;
  target.depthBuffer = true;
  target.depthTexture = new THREE.DepthTexture();
  target.depthTexture.format = format;
  target.depthTexture.type = type;
}

function setupRenderScene(width, height) {

  //------------------------------Setup post processing stage------------------------------//

  targetCamera = new THREE.PerspectiveCamera(70, width / height, 0.1, 5.0);
    
  controls = new THREE.OrbitControls(targetCamera, renderer.domElement);
  controls.enableDamping = true;

  targetCamera.position.z = 1.8;
  controls.update();

  let planeGeometry = new THREE.PlaneBufferGeometry(width / height, 1, 300, 300);
  let planeMaterial = new THREE.MeshBasicMaterial({color: 0xfff123, wireframe: false});

  targetScene = new THREE.Scene();
  renderer.setSize(width, height);

  targetUniforms = {
    u_time: {
      type: "f",
      value: 1.0
    },
    u_resolution: {
      type: "v2",
      value: new THREE.Vector2()
    },
    u_mouse: {
      type: "v2",
      value: new THREE.Vector2()
    },
    u_fragMouse: {
      type: "v2",
      value: new THREE.Vector2()
    },
    tDepth: {
      value: null
    },
    tDiffuse: {
      value: null
    },
    u_cameraNear: {
      value: camera.near
    },
    u_cameraFar: {
      value: camera.far
    },
    u_texture: {
      value: new THREE.TextureLoader().load("asset/tex2.jpg")
    },
  };
  
  targetMaterial = new THREE.ShaderMaterial({
    uniforms: targetUniforms,
    vertexShader: getShaderSource("shaders/vertex.vs"),
    fragmentShader: getShaderSource("shaders/fragment.fs"),
    // wireframe: true,
    side: THREE.DoubleSide
  });

  let deformMaterial = new THREE.ShaderMaterial({
    uniforms: targetUniforms,
    vertexShader: getShaderSource("shaders/depthVertex.vs"),
    fragmentShader: getShaderSource("shaders/depthFragment.fs"),
    // wireframe: true,
    side: THREE.DoubleSide
  });

  planeMesh = new THREE.Mesh(planeGeometry, targetMaterial);
  planeMesh.position.set(0.0, -0.7, 0.0);
  planeMesh.rotation.x -= Math.PI/2;
  // planeMesh.scale.set(2,2,0);

  sphereMesh = new THREE.Mesh(geometry, deformMaterial);

  // const helper = new THREE.CameraHelper( targetCamera );
  // targetScene.add( helper );

  targetScene.add(sphereMesh);
  targetScene.add(planeMesh);

  renderer.setPixelRatio(window.devicePixelRatio);

}

function FillMeshToScreen(width, height) {
  const yfovRad = (camera.fov * Math.PI / 180);

  const hypo = (height / 2) / Math.tan(yfovRad / 2);

  // console.log(Math.pow(hypo,2), Math.pow(width/2,2));
  // let closeZ = Math.sqrt(Math.pow(hypo,2)-Math.pow(width/2,2));  -- Lines in testing

  let closeZ = hypo;
  console.log(closeZ);

  uniforms.u_zpos.value = camera.position.z - closeZ;
  targetMaterial.uniforms.u_cameraFar.value = camera.far;

  if (closeZ > camera.far) {
    camera.far = closeZ + 200;
    targetMaterial.uniforms.u_cameraFar.value = camera.far;
  }
}

function onWindowResize(event) {
  screenWidth = window.innerWidth;
  screenHeight = window.innerHeight;
  if (screenWidth > 700) {
    canvasHeight = screenHeight;
    canvasWidth = screenWidth; /// 2;
  } else {
    canvasHeight = screenHeight / 2;
    canvasWidth = screenWidth;
  }
  const dpr = renderer.getPixelRatio();
  target.setSize(canvasWidth * dpr, canvasHeight * dpr);
  renderer.setSize(canvasWidth, canvasHeight);

  // MaintainScale(width, height);
  uniforms.u_resolution.value.x = renderer.domElement.width;
  uniforms.u_resolution.value.y = renderer.domElement.height;
  targetMaterial.uniforms.u_resolution.value.x = renderer.domElement.width;
  targetMaterial.uniforms.u_resolution.value.y = renderer.domElement.height;
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  uniforms.u_time.value += 0.05;
  // mesh.rotation.z += 0.005;

  renderer.setRenderTarget(target);
  mesh.position.y += Math.sin(uniforms.u_time.value)*0.01;
  // plane.position.y += Math.sin(uniforms.u_time.value)*0.01;
  renderer.render(scene, camera);

  targetMaterial.uniforms.tDiffuse.value = target.texture;
  // console.log(target.texture);
  targetMaterial.uniforms.tDepth.value = target.depthTexture;
  targetMaterial.uniforms.u_time.value += 0.05;



  renderer.setRenderTarget(null);
  // renderer.render(scene, camera);
  sphereMesh.position.y += Math.sin(uniforms.u_time.value)*0.01;
  // planeMesh.position.y += Math.sin(uniforms.u_time.value)*0.01;

  renderer.render(targetScene, targetCamera);
  controls.update();
}

function render() {
  
}