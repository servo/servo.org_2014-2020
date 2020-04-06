var createScene = async function () {
    var pushButtonCore;
    var index = 0; 

    var scene = new BABYLON.Scene(engine);

    var camera = new BABYLON.FreeCamera("cam", BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);

    var light = new BABYLON.HemisphericLight("sun", new BABYLON.Vector3(0,1,0), scene);
    var anchor = new BABYLON.TransformNode("");

    var panel = new BABYLON.GUI.CylinderPanel();
    panel.margin = 0.75;
    panel.linkToTransformNode(anchor);
    panel.position.z = -1.5;

    // Create the 3D UI manager
    var manager = new BABYLON.GUI.GUI3DManager(scene);
    manager.addControl(panel);

    // The first parameter can be used to specify which mesh to import. Here we import all meshes
    BABYLON.SceneLoader.ImportMesh("", "https://david.blob.core.windows.net/babylonjs/MRTK/", "pushButton.glb", scene, function (newMeshes) {
        pushButtonCore = newMeshes[0];
        makePushButtons();
        pushButtonCore.setEnabled(false);
    });

    function makePushButton(mesh, hoverColor) {
        var cylinder = mesh.getChildMeshes(false, (node) => { return node.name.indexOf("Cylinder") !== -1 })[0];
        var cylinderMat = cylinder.material.clone();
        cylinderMat.albedoColor = new BABYLON.Color3(0.5, 0.19, 0);
        cylinder.material = cylinderMat;
        var pushButton = new BABYLON.GUI.MeshButton3D(mesh, "pushButton" + index);
        pushButton.pointerEnterAnimation = () => {
            cylinder.material.albedoColor = hoverColor;
        };
        pushButton.pointerOutAnimation = () => {
             cylinder.material.albedoColor = new BABYLON.Color3(0.5, 0.19, 0);
        };
        pushButton.pointerDownAnimation = () => {
            cylinder.position.y = 0;
        }
        pushButton.pointerUpAnimation = () => {
            cylinder.position.y = 0.21;
        }
        pushButton.onPointerDownObservable.add(() => {
            console.log(pushButton.name + " pushed.");
        });
        panel.addControl(pushButton);
        index++;
    }

    function makePushButtons() {
        var color;
        var newPushButton;
        var colors = [{r: 0.25, g:0, b:0}, {r: 0, g:0.25, b:0}, {r: 0, g:0, b:0.25},
                      {r: 0.25, g:0.25, b:0}, {r: 0, g:0.25, b:0.25}, {r: 0.25, g:0, b:0.25}];

        panel.blockLayout = true;
        for (var i = 0; i < 10; i++) {
            newPushButton = pushButtonCore.clone("pushButton" + index);
            color = new BABYLON.Color3(colors[i % 6].r, colors[i % 6].g, colors[i % 6].b);
            makePushButton(newPushButton, color);
        }
        panel.blockLayout = false;
    }

    const ar_supported = await navigator.xr.isSessionSupported("immersive-ar");
    const xr = await scene.createDefaultXRExperienceAsync({
        floorMeshes: [],
        uiOptions: {
            sessionMode: ar_supported ? "immersive-ar" : "immersive-vr"
        },
        inputOptions: { doNotLoadControllerMeshes: false}
    });
    
    // necessary until https://github.com/BabylonJS/Babylon.js/issues/7974
    scene.constantlyUpdateMeshUnderPointer = true;
    return scene;
}
