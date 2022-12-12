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
let backSideScene, frontSideScene;
let backSide, frontSide;
let backSideShader, frontSideShader;

let compositingMethod = VolumetricRenderingShader.RAYCAST_METHOD_MIP;
let isoValue = 0.3;

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

    backSide = new THREE.WebGLRenderTarget(canvasHeight, canvasWidth);
    frontSide = new THREE.WebGLRenderTarget(canvasHeight, canvasWidth);

    // read and parse volume file
    fileInput = document.getElementById("upload");
    fileInput.addEventListener('change', readFile);

    //testShader = new TestShader([255.0, 255.0, 0.0]);
    volumetricRenderingShader = new VolumetricRenderingShader();
    backSideShader = new FirstPassShader(THREE.BackSide);
    frontSideShader = new FirstPassShader(THREE.FrontSide);
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

        // console.log('Volume Data: ', volume);

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
    backSideScene = new THREE.Scene();
    frontSideScene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, canvasWidth / canvasHeight, 0.1, 1000 );

    // Prepare Volume-Data as 3D Texture
    const texture3d = new THREE.Data3DTexture(volume.voxels, volume.width, volume.height, volume.depth);
    texture3d.format = THREE.RedFormat;
    texture3d.type = THREE.FloatType;
    texture3d.needsUpdate = true;
    texture3d.minFilter = THREE.LinearFilter;
    texture3d.magFilter = THREE.LinearFilter;

    // our camera orbits around an object centered at (0,0,0)
    orbitCamera = new OrbitCamera(camera, new THREE.Vector3(0,0,0), 2*volume.max, renderer.domElement);

    // Prepare Shader
    volumetricRenderingShader.setCompositingMethod(compositingMethod);
    if (compositingMethod === VolumetricRenderingShader.RAYCAST_METHOD_FIRST_HIT) {
        volumetricRenderingShader.setIsoValue(isoValue);
    }

    // Set Shader Uniforms according to volume
    await volumetricRenderingShader.load();
    volumetricRenderingShader.setUniform('data', texture3d);
    volumetricRenderingShader.setUniform('canvasWidth', canvasWidth);
    volumetricRenderingShader.setUniform('canvasHeight', canvasHeight);
    volumetricRenderingShader.setUniform('volumeScale', volume.max);

    await frontSideShader.load();
    await backSideShader.load();

    const boundingBoxGeometry = new THREE.BoxGeometry(volume.width, volume.height, volume.depth);

    const backSideBoundingBox = new THREE.Mesh(boundingBoxGeometry, backSideShader.material);
    const frontSideBoundingBox = new THREE.Mesh(boundingBoxGeometry, frontSideShader.material);
    const mainSceneBoundingBox = new THREE.Mesh(boundingBoxGeometry, volumetricRenderingShader.material);

    backSideScene.add(backSideBoundingBox);
    frontSideScene.add(frontSideBoundingBox);
    scene.add(mainSceneBoundingBox);

    // init paint loop
    requestAnimationFrame(paint);
}

/**
 * Render the scene and update all necessary shader information.
 */
function paint(){
    if (volume) {
        // first render pass (render the front and back side of the bounding box with their interpolated coordinates as the color value)
        renderer.setRenderTarget(backSide);
        renderer.render(backSideScene, camera);
        renderer.setRenderTarget(frontSide);
        renderer.render(frontSideScene, camera);

        // pass the rendered front and back faces to the raycasting shader, it is used to determine the ray directions
        volumetricRenderingShader.setUniform('backSideTexture', backSide.texture);
        volumetricRenderingShader.setUniform('frontSideTexture', frontSide.texture);

        // second render pass (renders the final image by raycasting)
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
    }
}

function onChangeCompositing() {
    let val = document.getElementsByName('compositing_method')[0].value;

    let shadingCheckbox = document.getElementsByName('first_hit_shading')[0];
    let shadingCheckboxLabel = document.getElementsByName('first_hit_shading_label')[0];

    switch (val) {
        case 'mip': default:
            compositingMethod = VolumetricRenderingShader.RAYCAST_METHOD_MIP;
            shadingCheckbox.classList.add('hidden');
            shadingCheckboxLabel.classList.add('hidden');
            break;
        case 'first_hit':
            compositingMethod = VolumetricRenderingShader.RAYCAST_METHOD_FIRST_HIT;
            shadingCheckbox.classList.remove('hidden');
            shadingCheckboxLabel.classList.remove('hidden');
            break;
    }

    volumetricRenderingShader.setCompositingMethod(compositingMethod);
    if (compositingMethod === VolumetricRenderingShader.RAYCAST_METHOD_FIRST_HIT) {
        volumetricRenderingShader.setIsoValue(isoValue);
    }

    paint();
}

function onChangeFirstHitShadingCB() {
    let val = document.getElementsByName('first_hit_shading')[0].checked;
    volumetricRenderingShader.enableFirstHitShading(val);

    paint();
}