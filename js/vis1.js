/**
 * Vis 1 Task 1 Framework
 * Copyright (C) TU Wien
 *   Institute of Visual Computing and Human-Centered Technology
 *   Research Unit of Computer Graphics
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are not permitted.
 *
 * Main script for Vis1 exercise. Loads the volume, initializes the scene, and contains the paint function.
 *
 * @author Manuela Waldner
 * @author Laura Luidolt
 * @author Diana Schalko
 */
let renderer, camera, scene, orbitCamera;
let canvasWidth, canvasHeight = 0;
let container = null;
let volume = null;
let fileInput = null;
let volumetricRenderingShader = null;

/**
 * Load all data and initialize UI here.
 */
function init() {
    // volume viewer
    container = document.getElementById("viewContainer");
    canvasWidth = window.innerWidth * 0.7;
    canvasHeight = window.innerHeight * 0.7;

    // WebGL renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( canvasWidth, canvasHeight );
    container.appendChild( renderer.domElement );

    // read and parse volume file
    fileInput = document.getElementById("upload");
    fileInput.addEventListener('change', readFile);

    //testShader = new TestShader([255.0, 255.0, 0.0]);
    volumetricRenderingShader = new VolumetricRenderingShader();
}

/**
 * Handles the file reader. No need to change anything here.
 */
function readFile(){
    let reader = new FileReader();
    reader.onloadend = function () {
        console.log("data loaded: ");

        let data = new Uint16Array(reader.result);
        volume = new Volume(data);

        resetVis();
    };
    reader.readAsArrayBuffer(fileInput.files[0]);
}

/**
 * Construct the THREE.js scene and update histogram when a new volume is loaded by the user.
 *
 * Currently, renders the bounding box of the volume.
 */
async function resetVis(){
    // create new empty scene and perspective camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, canvasWidth / canvasHeight, 0.1, 1000 );

    // dummy scene: we render a box and attach our color test shader as material
    /*const testCube = new THREE.BoxGeometry(volume.width, volume.height, volume.depth);
    const testMaterial = testShader.material;
    await testShader.load(); // this function needs to be called explicitly, and only works within an async function!
    const testMesh = new THREE.Mesh(testCube, testMaterial);*/
    //scene.add(testMesh);

    // Prepare Volume-Data as 3D Texture
    const texture3d = new THREE.Data3DTexture(volume.voxels, volume.width, volume.height, volume.depth);
    texture3d.format = THREE.RedFormat;
    texture3d.type = THREE.FloatType;
    // texture3d.minFilter = texture3d.magFilter = THREE.LinearFilter;
    // texture3d.unpackAlignment = 1;
    texture3d.needsUpdate = true;

    // our camera orbits around an object centered at (0,0,0)
    orbitCamera = new OrbitCamera(camera, new THREE.Vector3(0,0,0), 1.5, renderer.domElement);

    // Set Shader Uniforms according to volume
    await volumetricRenderingShader.load();
    volumetricRenderingShader.setUniform('data', texture3d);
    volumetricRenderingShader.setUniform('camera_position', camera.position);
    volumetricRenderingShader.setUniform('xWidth', volume.width);
    volumetricRenderingShader.setUniform('yHeight', volume.height);
    volumetricRenderingShader.setUniform('zDepth', volume.depth);
    // Only render the back side of the bounding box (the back side is used as a reference point)
    volumetricRenderingShader.material.side = THREE.BackSide;

    const boundingBoxGeometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    // boundingBoxGeometry.translate( volume.width / 2 - 0.5, volume.height / 2 - 0.5, volume.depth / 2 - 0.5 );
    const boundingBox = new THREE.Mesh(boundingBoxGeometry, volumetricRenderingShader.material);
    scene.add(boundingBox);

    // init paint loop
    requestAnimationFrame(paint);
}

/**
 * Render the scene and update all necessary shader information.
 */
function paint(){
    if (volume) {
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
    }
}
