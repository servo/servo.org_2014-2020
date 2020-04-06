var createScene = function () {
    // Playground needs to return at least an empty scene and default camera
    var scene = new BABYLON.Scene(engine);
    var camera = new BABYLON.Camera("camera1", BABYLON.Vector3.Zero(), scene);

    // Async call
    BABYLON.SceneLoader.Append("https://www.babylonjs.com/Scenes/Mansion/",
        "Mansion.babylon", scene, async function  () {
            var xr = await scene.createDefaultXRExperienceAsync({floorMeshes: [scene.getMeshByName("Allée")]});
        });

    // necessary until https://github.com/BabylonJS/Babylon.js/issues/7974
    scene.constantlyUpdateMeshUnderPointer = true;
    return scene;
};
