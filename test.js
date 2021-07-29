var scene,camera,renderer;
var plane, temp, vnh, point;
var radius = 10;
var currentQ = new THREE.Quaternion();
var initedBoxes = false;

var init = function()
{
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.z = 25;

    var controls = new THREE.OrbitControls( camera );
    const canvas = document.querySelector('.homeCanvas');
    
    renderer = new THREE.WebGLRenderer({canvas});
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    window.onresize = function() 
    {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }

    initLights();
    initSphere();
    initBoxes();

    renderer.setAnimationLoop(function()
    {
        update();
        render();
    });
}

var initLights = function()
{
    var ambientLight = new THREE.AmbientLight( 0x555555 );
    scene.add( ambientLight );
    light1 = new THREE.SpotLight( 0xffffff, 2, 200, 10 );
    light1.position.set( -30, 30, 40 );
    light1.castShadow = true;
    light1.shadow.mapSize.x = 2048;
    light1.shadow.mapSize.y = 2048;
    light1.shadow.camera.near = 0.1;
    scene.add(light1);

    light1Helper = new THREE.SpotLightHelper(light1, 0xffffff);
    scene.add(light1Helper);
}

var initSphere = function()
{
    var geometry = new THREE.IcosahedronGeometry( radius, 3 );
    var material = new THREE.MeshPhongMaterial( {color: 0x999999, wireframe:false} );

    material.shininess = 0;
    sphere = new THREE.Mesh( geometry, material );
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    scene.add(sphere);

    tempGeo = new THREE.Geometry();
    tempGeo.copy(geometry);
    temp = new THREE.Mesh( tempGeo, material );

    var pGeo = new THREE.PlaneGeometry(200, 200, 1, 1);
    plane = new THREE.Mesh( pGeo, material );
    plane.receiveShadow = true;
    plane.position.y = -radius - 10;
    plane.rotation.x = -90 * Math.PI/180;
    scene.add(plane);
}

var initBoxes = function(){
    initedBoxes = true;
    var bufferGeometry = new THREE.BoxBufferGeometry(1,1,1);
    var geometry = new THREE.InstancedBufferGeometry();
    geometry.index = bufferGeometry.index;
    geometry.attributes.position = bufferGeometry.attributes.position;
    // geometry.attributes.normal = bufferGeometry.attributes.normal;

    // per instance data
    var offsets = [];
    var orientations = [];
    var colors = [];
    var vector = new THREE.Vector4();
    var x, y, z, w;
    var cscale = chroma.scale(['#ff0000','#00ff00','#0000ff']).classes(10);

    for(var i=0; i<sphere.geometry.faces.length; i++){
        center = getCenter(sphere.geometry.faces[i]);
        x = center.x;
        y = center.y;
        z = center.z;
        vector.set( x, y, z, 0 ).normalize();

        offsets.push( x + vector.x, y + vector.y, z + vector.z );

        // rotate

        rotation = getRotation(sphere.geometry.faces[i].normal);
        vector.copy(rotation).normalize();

        orientations.push( vector.x, vector.y, vector.z, vector.w );

        var color = chroma(cscale(THREE.Math.randFloat(0,1))).brighten(1).hex();
        color = new THREE.Color(color);
        colors.push(color.r, color.g, color.b);
    }
    offsetAttribute = new THREE.InstancedBufferAttribute( new Float32Array( offsets ), 3 );
    orientationAttribute = new THREE.InstancedBufferAttribute( new Float32Array( orientations ), 4 );
    colorAttribute = new THREE.InstancedBufferAttribute( new Float32Array( colors ), 3 );

    geometry.addAttribute( 'offset', offsetAttribute );
    geometry.addAttribute( 'orientation', orientationAttribute );
    geometry.addAttribute( 'color', colorAttribute );

    var material = new THREE.ShaderMaterial( {
        lights: true,
        uniforms: THREE.UniformsUtils.merge([
            // THREE.UniformsLib["shadowmap"],
            THREE.UniformsLib["lights"],
            {
                lightPosition: {type: 'v3', value: light1.position},
                time: {type: 'f', value: 0}
            }
        ]),
        vertexShader:
        [
            'attribute vec3 offset;',
            'attribute vec4 orientation;',
            'attribute vec3 color;',

            'varying vec3 pos;',
            'varying vec3 vNormal;',
            'varying vec3 vWorldPosition;',
            'varying vec3 vColor;',
            'varying vec3 vLightDir;',
                                    
            'uniform vec3 lightPosition;',
    
            'vec3 applyQuaternionToVector( vec4 q, vec3 v ){',
                'return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v );',
            '}',

            THREE.ShaderChunk["common"],
            THREE.ShaderChunk["shadowmap_pars_vertex"],

            'void main() {',
                'vColor = color;',

                'vec3 vPosition = applyQuaternionToVector( orientation, position );',
                'pos = vPosition + offset;',
                
                'vNormal = normalMatrix * vec3(normal + normalize(offset) * 0.3);',

                'vec4 worldPosition = modelMatrix * vec4(pos, 1.0);',
                'vWorldPosition = worldPosition.xyz;',

                'vLightDir = mat3(viewMatrix) * (lightPosition - vWorldPosition);',

                'gl_Position = projectionMatrix * viewMatrix * worldPosition;',
                THREE.ShaderChunk["shadowmap_vertex"],
            '}'
        ].join('\n')
        ,
        fragmentShader:
        [
            THREE.ShaderChunk['common'],
            THREE.ShaderChunk['packing'],
            'varying vec3 pos;',
            'varying vec3 vNormal;',
            'varying vec3 vWorldPosition;',
            'varying vec3 vColor;',
            'varying vec3 vLightDir;',

THREE.ShaderChunk['shadowmap_pars_fragment'],
            'void main() {',
                'vec3 lightDirection = normalize(vLightDir);',
                
                'float c = max(0.0, dot(vNormal, lightDirection)) * 2.;',
                // 'gl_FragColor = vec4(vColor.r + c , vColor.g + c , vColor.b + c , 1.);',
                'gl_FragColor = vec4(.3+c , .3+c , .3+c , 1.);',
                THREE.ShaderChunk['shadowmap_fragment'],
            '}'
        ].join('\n')
    });

    boxes = new THREE.Mesh( geometry, material );
    boxes.castShadow = true;
    boxes.receiveShadow = true;

    boxes.customDepthMaterial = new THREE.ShaderMaterial({
        vertexShader:
        [
            'attribute vec3 offset;',
            'attribute vec4 orientation;',

            'varying vec3 vWorldPosition;',

            'vec3 applyQuaternionToVector( vec4 q, vec3 v ){',
                'return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v );',
            '}',

            'void main() {',
                'vec3 vPosition = applyQuaternionToVector( orientation, position );',
                'vec3 pos = vPosition + offset;',

                'vec4 worldPosition = modelMatrix * vec4(pos, 1.0);',
                'vWorldPosition = worldPosition.xyz;',
                
                'gl_Position = projectionMatrix * viewMatrix * worldPosition;',
            '}',
        ].join('\n')
        ,
        fragmentShader: THREE.ShaderLib.distanceRGBA.fragmentShader,
        uniforms: material.uniforms
    });
    scene.add(boxes);
}

// find center position from 3 vertices
function getCenter(face){
    var centroid = new THREE.Vector3(0,0,0);
    centroid.add(sphere.geometry.vertices[face.a]);
    centroid.add(sphere.geometry.vertices[face.b]);
    centroid.add(sphere.geometry.vertices[face.c]);
    centroid.divideScalar(3);
    return centroid;
}

function getRotation(normal){
    var planeVector1 = new THREE.Vector3(0,1,0);
    var matrix1 = new THREE.Matrix4();
    var quaternion = new THREE.Quaternion().setFromUnitVectors(planeVector1, normal);
    var matrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);
    var a = new THREE.Euler( );
    a.setFromRotationMatrix ( matrix, 'XYZ' )
    // return a.toVector3();
    return quaternion;
}	

// noise.seed(Math.random());
var update = function(){

    // animate vertices of sphere with noise
    for(var i=0; i<sphere.geometry.vertices.length; i++){
        var p = sphere.geometry.vertices[i];
        var tp = temp.geometry.vertices[i];
    }
    
    sphere.geometry.verticesNeedUpdate = true;
    sphere.geometry.normalsNeedUpdate = true;
    sphere.geometry.computeVertexNormals();
    sphere.geometry.computeFaceNormals();

    
    // animate boxes
    if(initedBoxes){
        for(var i=0; i<sphere.geometry.faces.length; i++){
            center = getCenter(sphere.geometry.faces[i]);
            x = center.x;
            y = center.y;
            z = center.z;
            offsetAttribute.setXYZ(i, center.x, center.y, center.z);

            rotation = getRotation(sphere.geometry.faces[i].normal);
            currentQ.copy(rotation).normalize();
            orientationAttribute.setXYZW( i, currentQ.x, currentQ.y, currentQ.z, currentQ.w );
        }
        offsetAttribute.needsUpdate = true;
        orientationAttribute.needsUpdate = true;
    }
}


var animate = function(){
    draw();
}

var render = function(){
    renderer.render( scene, camera );
}

init();