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

// histogram stuff
let hMargin = {top: 10, right: 30, bottom: 30, left: 40}
let hWidth = 450 - hMargin.left - hMargin.right, hHeight = 390 - hMargin.top - hMargin.bottom;
let x, y, min, max, binMaxLen, bins, xAxis, yAxis, histogram, densityData, canvas, bars, svg;

// color picker
let isoColor1 = [255, 56, 56];
let isoColor2 = [56, 255, 56];

let isoAlpha1 = 1.0;
let isoAlpha2 = 1.0;

let isoValue1 = 0.3;
let isoValue2 = 0.5;

let usingSecondIsoPlain = false;

let compositingMethod = VolumetricRenderingShader.RAYCAST_METHOD_MIP;

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

    // Render Targets for the first render pass
    backSide = new THREE.WebGLRenderTarget(canvasHeight, canvasWidth);
    frontSide = new THREE.WebGLRenderTarget(canvasHeight, canvasWidth);

    // read and parse volume file
    fileInput = document.getElementById("upload");
    fileInput.addEventListener('change', readFile);

    // Create Shader Objects
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

        densityData = volume.voxels;

        initHistogram();

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
    console.log(orbitCamera);

    // Prepare Shader
    volumetricRenderingShader.setCompositingMethod(compositingMethod);
    volumetricRenderingShader.setIsoValue(isoValue1);
    volumetricRenderingShader.setIsoAlpha(isoAlpha1);
    volumetricRenderingShader.setIsoColor(new THREE.Vector3(isoColor1[0]/255, isoColor1[1]/255, isoColor1[2]/255));

    volumetricRenderingShader.setSecondIsoValue(isoValue2);
    volumetricRenderingShader.setSecondIsoAlpha(isoAlpha2);
    volumetricRenderingShader.setSecondIsoColor(new THREE.Vector3(isoColor2[0]/255, isoColor2[1]/255, isoColor2[2]/255));

    setUIElementTextAndValues();

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
        volumetricRenderingShader.setCameraPosition(new THREE.Vector3(orbitCamera.camera.position.x, orbitCamera.camera.position.y, orbitCamera.camera.position.z));

        // second render pass (renders the final image by raycasting)
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
    }
}

function onChangeCompositing() {
    let val = document.getElementsByName('compositing_method')[0].value;

    let firstHitSettingsContainer = document.getElementById('first_hit_settings');

    switch (val) {
        case 'mip': default:
            compositingMethod = VolumetricRenderingShader.RAYCAST_METHOD_MIP;
            firstHitSettingsContainer.classList.add('hidden');
            break;
        case 'first_hit':
            compositingMethod = VolumetricRenderingShader.RAYCAST_METHOD_FIRST_HIT;
            firstHitSettingsContainer.classList.remove('hidden');
            break;
    }

    volumetricRenderingShader.setCompositingMethod(compositingMethod);

    paint();
}

function onChangeFirstHitShadingCB() {
    let val = document.getElementsByName('first_hit_shading')[0].checked;
    volumetricRenderingShader.enableFirstHitShading(val);

    paint();
}

function onChangeIsoValue(plainNumber) {

    if (plainNumber === 1) {
        let val = parseFloat(document.getElementsByName('iso_value')[0].value);
        isoValue1 = val;

        volumetricRenderingShader.setIsoValue(val);
        let htmlOutput = document.getElementById('iso_value_output');
        htmlOutput.innerText = val;

        svg.select(".circle1")
            .transition()
            .ease(d3.easeLinear)
            .duration(50)
            .attr("cx", x(parseFloat(val)));

        svg.select(".alpharect1")
            .transition()
            .ease(d3.easeLinear)
            .duration(50)
            .attr("x", x(parseFloat(val)) - ((x(bins[0].x1) - x(bins[0].x0) - 1)/4))
    } else {
        let val = parseFloat(document.getElementsByName('iso_value2')[0].value);
        isoValue2 = val;

        volumetricRenderingShader.setSecondIsoValue(val);
        let htmlOutput = document.getElementById('iso_value_output2');
        htmlOutput.innerText = val;

        svg.select(".circle2")
            .transition()
            .ease(d3.easeLinear)
            .duration(50)
            .attr("cx", x(parseFloat(val)));

        svg.select(".alpharect2")
            .transition()
            .ease(d3.easeLinear)
            .duration(50)
            .attr("x", x(parseFloat(val)) - ((x(bins[0].x1) - x(bins[0].x0) - 1)/4))
    }

    paint();
}

function onChangeColor(plainNumber) {

    if (plainNumber === 1) {
        let col = document.getElementById('colorPicker').value;

        isoColor1 = hexToRGB(col);
        volumetricRenderingShader.setIsoColor(new THREE.Vector3(isoColor1[0]/255, isoColor1[1]/255, isoColor1[2]/255));

        svg.select(".circle1")
            .style("fill", col);

        svg.select(".alpharect1")
            .style("fill", col);
    } else {
        let col = document.getElementById('colorPicker2').value;

        isoColor2 = hexToRGB(col);
        volumetricRenderingShader.setSecondIsoColor(new THREE.Vector3(isoColor2[0]/255, isoColor2[1]/255, isoColor2[2])/255);

        svg.select(".circle2")
            .style("fill", col);

        svg.select(".alpharect2")
            .style("fill", col);
    }

    paint();
}

function onChangeIsoAlpha(plainNumber) {

    if (plainNumber === 1) {
        let alpha = parseFloat(document.getElementsByName('iso_alpha')[0].value);

        isoAlpha1 = alpha;
        volumetricRenderingShader.setIsoAlpha(alpha);
        let htmlOutput = document.getElementById('iso_alpha_output');
        htmlOutput.innerText = alpha;

        svg.select(".circle1")
            .transition()
            .ease(d3.easeLinear)
            .duration(50)
            .attr("cy", y(isoAlpha1));
        svg.select(".alpharect1")
            .transition()
            .ease(d3.easeLinear)
            .duration(50)
            .attr("height", hHeight - y(isoAlpha1))
            .attr("transform", "translate(" + x(bins[0].x0) + "," + y(isoAlpha1) + ")")

    } else {
        let alpha = parseFloat(document.getElementsByName('iso_alpha2')[0].value);

        isoAlpha2 = alpha;
        volumetricRenderingShader.setSecondIsoAlpha(alpha);
        let htmlOutput = document.getElementById('iso_alpha_output2');
        htmlOutput.innerText = alpha;

        svg.select(".circle2")
            .transition()
            .ease(d3.easeLinear)
            .duration(50)
            .attr("cy", y(isoAlpha2));
        svg.select(".alpharect2")
            .transition()
            .ease(d3.easeLinear)
            .duration(50)
            .attr("height", hHeight - y(isoAlpha2))
            .attr("transform", "translate(" + x(bins[0].x0) + "," + y(isoAlpha2) + ")")
    }

    paint();
}

function hexToRGB(hex) {
    return hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i
        ,(m, r, g, b) => '#' + r + r + g + g + b + b)
        .substring(1).match(/.{2}/g)
        .map(x => parseInt(x, 16));
}

function RGBToHex(r, g, b) {
    return '#' + [r, g, b].map(v => {
        const hex = v.toString(16);
        return hex.length === 1 ? '0' + hex : hex
    }).join('');
}

function normalizeRGB(rgb) {
    rgb[0] /= 255;
    rgb[1] /= 255;
    rgb[2] /= 255;
    return rgb;
}

function toggleSecondIsoPlain() {
    let secondIsoButton = document.getElementById('second_iso_toggle');
    let secondIsoOptions = document.getElementById('secondIsoOptions');

    if (!usingSecondIsoPlain) {
        secondIsoButton.innerText = "Zweite Oberfläche entfernen";
        secondIsoOptions.classList.remove('hideSecondIso');
        addSecondPlainToHistogram();
        volumetricRenderingShader.enableSecondIsoPlain(true);
    } else {
        secondIsoButton.innerText = "Zweite Oberfläche hinzufügen";
        secondIsoOptions.classList.add('hideSecondIso');
        svg.select(".circle2").remove();
        svg.select(".alpharect2").remove();
        volumetricRenderingShader.enableSecondIsoPlain(false);
    }

    usingSecondIsoPlain = !usingSecondIsoPlain;
}

function addSecondPlainToHistogram() {
    svg.append("circle")
        .classed("circle2", true)
        .attr("r", hHeight / 50)
        .style("fill", RGBToHex(isoColor2[0], isoColor2[1], isoColor2[2]))
        .attr("cx", x(isoValue2))
        .attr("cy", y(isoAlpha2));

    svg.append("rect")
        .classed("alpharect2", true)
        .attr("width", (x(bins[0].x1) - x(bins[0].x0) - 1)/2)
        .attr("height", hHeight - y(isoAlpha2))
        .attr("x", x(isoValue2) - ((x(bins[0].x1) - x(bins[0].x0) - 1)/4))
        .attr("transform", "translate(" + x(bins[0].x0) + "," + y(isoAlpha2) + ")")
        .attr("fill", RGBToHex(isoColor2[0], isoColor2[1], isoColor2[2]))
}

function initHistogram() {
    d3.select("svg").remove();

    svg = d3.select("#chart")
        .append("svg")
        .attr("width", hWidth + hMargin.left + hMargin.right)
        .attr("height", hHeight + hMargin.top + hMargin.bottom)
        .append("g")
        .attr("transform", "translate(" + hMargin.left + "," + hMargin.top + ")");

    x = d3.scaleLinear()
        .domain([0, 1 /*d3.max(densityData)*/])
        .range([0, hWidth]);
    svg.append("g")
        .attr("transform", "translate(0," + hHeight + ")")
        .call(d3.axisBottom(x));

    histogram = d3.histogram()
        .value(function(d) { return d; })
        .domain(x.domain())
        .thresholds(x.ticks(100));

    bins = histogram(densityData);

    binMaxLen = d3.max(bins, function(d) { return d.length; })

    y = d3.scaleLinear()
    y = d3.scaleSqrt()
        .domain([0, 1 /*d3.max(bins, function(d) { return d.length; })*/])
        .range([hHeight, 0]);

    svg.append("g")
        .call(d3.axisLeft(y));

    svg.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
        .attr("x", x)
        .attr("transform", function(d) { return "translate(" + x(d.x0) + "," + y(d.length/binMaxLen) + ")"; })
        .attr("width", function(d) { return x(d.x1) - x(d.x0) - 1; })
        .style("fill", "steelblue");

    svg.selectAll("rect")
        .transition()
        .ease(d3.easeLinear)
        .duration(500)
        .attr("height", function(d) { return hHeight - y(d.length/binMaxLen); })

    svg.append("circle")
        .classed("circle1", true)
        .attr("r", hHeight / 50)
        .style("fill", RGBToHex(isoColor1[0], isoColor1[1], isoColor1[2]))
        .attr("cx", x(isoValue1))
        .attr("cy", y(isoAlpha1));

    svg.append("rect")
        .classed("alpharect1", true)
        .attr("width", (x(bins[0].x1) - x(bins[0].x0) - 1)/2)
        .attr("height", hHeight - y(isoAlpha1))
        .attr("x", x(isoValue1) - ((x(bins[0].x1) - x(bins[0].x0) - 1)/4))
        .attr("transform", "translate(" + x(bins[0].x0) + "," + y(isoAlpha1) + ")")
        .attr("fill", RGBToHex(isoColor1[0], isoColor1[1], isoColor1[2]));

    if (usingSecondIsoPlain) {
        addSecondPlainToHistogram();
    }
}

function setUIElementTextAndValues() {
    document.getElementById('iso_value').value = isoValue1;
    document.getElementById('iso_value_output').innerText = isoValue1;
    document.getElementById('iso_alpha').value = isoAlpha1;
    document.getElementById('iso_alpha_output').innerText = isoAlpha1;
    document.getElementById('colorPicker').value = RGBToHex(isoColor1[0], isoColor1[1], isoColor1[2]);

    document.getElementById('iso_value2').value = isoValue2;
    document.getElementById('iso_value_output2').innerText = isoValue2;
    document.getElementById('iso_alpha2').value = isoAlpha2;
    document.getElementById('iso_alpha_output2').innerText = isoAlpha2;
    document.getElementById('colorPicker2').value = RGBToHex(isoColor2[0], isoColor2[1], isoColor2[2]);
}