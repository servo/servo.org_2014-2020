var createScene = function () {
    // Playground needs to return at least an empty scene and default camera
    var scene = new BABYLON.Scene(engine);
    var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10), scene);

    // Async call
    BABYLON.SceneLoader.Append("https://www.babylonjs.com/Scenes/Espilit/",
        "Espilit.babylon", scene, async function () {
           var xr = await scene.createDefaultXRExperienceAsync({floorMeshes: [scene.getMeshByName("Sols")]});
        });

    return scene;
};
