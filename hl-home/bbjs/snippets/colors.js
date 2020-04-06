var createScene = async function () {

    // This creates a basic Babylon Scene object (non-mesh)
    var scene = new BABYLON.Scene(engine);

    // This creates and positions a free camera (non-mesh)
    var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -5), scene);

    // This targets the camera to scene origin
    camera.setTarget(BABYLON.Vector3.Zero());

    // This attaches the camera to the canvas
    camera.attachControl(canvas, true);

    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

    // Default intensity is 1. Let's dim the light a small amount
    light.intensity = 0.7;

    // Our built-in 'sphere' shape.
    var sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 1.4, segments: 32}, scene);

    // Move the sphere upward 1/2 its height
    sphere.position.y = 1;

    sphere.material = new BABYLON.StandardMaterial("sphereMat", scene);

    const environment = scene.createDefaultEnvironment();

    // GUI
    var plane = BABYLON.Mesh.CreatePlane("plane", 1);
    plane.position = new BABYLON.Vector3(1.4, 1.5, 0.4)
    var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(plane);
    var panel = new BABYLON.GUI.StackPanel();    
    advancedTexture.addControl(panel);  
    var header = new BABYLON.GUI.TextBlock();
    header.text = "Color GUI";
    header.height = "100px";
    header.color = "white";
    header.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    header.fontSize = "120"
    panel.addControl(header); 
    var picker = new BABYLON.GUI.ColorPicker();
    picker.value = sphere.material.diffuseColor;
    picker.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    picker.height = "350px";
    picker.width = "350px";
    picker.onValueChangedObservable.add(function(value) {
        sphere.material.diffuseColor.copyFrom(value);
    });
    panel.addControl(picker);

    // XR
    const xrHelper = await scene.createDefaultXRExperienceAsync({
        floorMeshes: [environment.ground]
    });

    // necessary until https://github.com/BabylonJS/Babylon.js/issues/7974
    scene.constantlyUpdateMeshUnderPointer = true;
    return scene;

};
