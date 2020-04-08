/**
 * Simple mesh manipulation scene.
 * 
 * This scene shows the gizmo manager's ability, and allows manipulating meshes in XR (VR/AR).
 * 
 * Right squeeze Will enable physics. A second squeeze will reset the scene.
 * Selecting a mesh will enable the gizmo manager. A left squeeze will enable/disable the gizmo
 * 
 * Created by Raanan Weber (@RaananW)
 */

var createScene = async function () {
    // Create scene
    var scene = new BABYLON.Scene(engine);
    var camera = new BABYLON.ArcRotateCamera("camera1", 0, Math.PI / 3, 3, new BABYLON.Vector3(0, 0, 0), scene);
    var light = new BABYLON.DirectionalLight("light", new BABYLON.Vector3(0, -0.5, 1.0), scene);
    light.position = new BABYLON.Vector3(0, 5, -2);
    camera.attachControl(canvas);

    const environment = scene.createDefaultEnvironment();

    const getRandomPosition = (meshToPosition) => {
        // 4 meters radius, 2 meter high
        const radius = 4;
        const height = 2;
        meshToPosition.position.set(
            -radius + (radius * 2 * Math.random()),
            (height * 2 * Math.random()) + 0.2,
            -radius + (radius * 2 * Math.random())
        )
    }

    const configureMesh = (mesh) => {
        const material = new BABYLON.StandardMaterial("sphere material", scene);
        material.diffuseColor = BABYLON.Color3.Random();
        mesh.material = material;
        getRandomPosition(mesh);
        if (meshes.indexOf(mesh) === -1) {
            meshes.push(mesh)
        }
    }

    // create 15 random meshes 
    const meshes = [];

    for (let i = 0; i < 3; i++) {
        var icoSphere = BABYLON.Mesh.CreateIcoSphere("ico", { radius: 0.1 + (Math.random() / 2), flat: true, subdivisions: 1 }, scene);
        configureMesh(icoSphere);
    }

    for (let i = 0; i < 3; i++) {
        var sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { radius: 0.1 + (Math.random() / 2) }, scene);
        configureMesh(sphere);
    }

    for (let i = 0; i < 3; i++) {
        var box = BABYLON.MeshBuilder.CreateBox("box", { size: 0.1 + (Math.random() / 2) }, scene);
        configureMesh(box);
    }

    for (let i = 0; i < 3; i++) {
        var torus = BABYLON.MeshBuilder.CreateTorus("torus", { diameter: 0.1 + (Math.random() / 2), thickness: (Math.random() / 2) }, scene);
        configureMesh(torus);
    }

    const resetMeshes = () => {
        meshes.forEach(mesh => {
            if (mesh.physicsImpostor) {
                mesh.physicsImpostor.dispose();
                mesh.physicsImpostor = undefined;
            }
            configureMesh(mesh);
        });
    }

    let gizmoMode = 0;

    // Initialize GizmoManager
    var gizmoManager = new BABYLON.GizmoManager(scene)
    // Restrict gizmos to only spheres
    gizmoManager.attachableMeshes = meshes;

    gizmoManager.boundingBoxGizmoEnabled = true;

    // physics
    scene.enablePhysics(undefined, new BABYLON.AmmoJSPlugin());

    const groundNoParent = environment.ground.clone();
    groundNoParent.isVisible = false;
    groundNoParent.parent = undefined;
    groundNoParent.setAbsolutePosition(environment.ground.getAbsolutePosition());
    groundNoParent.material = undefined;
    groundNoParent.physicsImpostor = new BABYLON.PhysicsImpostor(groundNoParent, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.5 });


    const enablePhysicsOnMeshes = () => {
        meshes.forEach((mesh) => {
            let impostorType = BABYLON.PhysicsImpostor.BoxImpostor;
            switch (mesh.name) {
                case 'sphere':
                    impostorType = BABYLON.PhysicsImpostor.SphereImpostor;
                    break;
                case 'iso':
                case 'torus':
                    impostorType = BABYLON.PhysicsImpostor.MeshImpostor;
                    break;
                case 'box':
                    impostorType = BABYLON.PhysicsImpostor.BoxImpostor;
                    break;
            }
            mesh.physicsImpostor = new BABYLON.PhysicsImpostor(mesh, impostorType, {
                mass: Math.random(),
                friction: Math.random(),
                restitution: Math.random()
            }, scene)
        })
    }

    let enabled = false;

    scene.onPointerObservable.add((eventData) => {
        if (eventData.type === BABYLON.PointerEventTypes.POINTERDOUBLETAP) {
            if (!enabled) {
                enablePhysicsOnMeshes();
                gizmoManager.positionGizmoEnabled = false;
                gizmoManager.rotationGizmoEnabled = false;
                gizmoManager.scaleGizmoEnabled = false;
                gizmoManager.boundingBoxGizmoEnabled = false;
                enabled = true;
            } else {
                resetMeshes();
                enabled = false;
            }
        } 
    })

    // XR mode
    // Enable XR
    const mode = await navigator.xr.isSessionSupported("immersive-ar") ? "ar" : "vr";
    const xr = await scene.createDefaultXRExperienceAsync({
        floorMeshes: [environment.ground],
        uiOptions: { sessionMode: "immersive-" + mode }
    });

    // get the features manager
    const fm = xr.baseExperience.featuresManager;

    // enable physics on the motion controllers
    const xrPhysics = fm.enableFeature(BABYLON.WebXRFeatureName.PHYSICS_CONTROLLERS, "latest", {
        xrInput: xr.input,
        physicsProperties: {
            restitution: 0.5,
            impostorSize: 0.15
        },
        enableHeadsetImpostor: true
    });

    fm.enableFeature(BABYLON.WebXRFeatureName.BACKGROUND_REMOVER);

    // instead of motion controllers, use xr events.
    // This is enabled for Hololens and other non-gamepad-enabled contexts. 
    const onSqueeze = (event) => {
        if (event.inputSource.handedness === 'right') {
            if (!enabled) {
                enablePhysicsOnMeshes();
                gizmoManager.boundingBoxGizmoEnabled = false;
                enabled = true;
            } else {
                resetMeshes();
                enabled = false;
                gizmoManager.boundingBoxGizmoEnabled = true;
            }
        } else {
            gizmoManager.boundingBoxGizmoEnabled = !gizmoManager.boundingBoxGizmoEnabled;
        }
    }

    xr.baseExperience.sessionManager.onXRSessionInit.add(() => {
        xr.baseExperience.sessionManager.session.addEventListener('squeeze', onSqueeze);
    });

    xr.baseExperience.sessionManager.onXRSessionEnded.add(() => {
        xr.baseExperience.sessionManager.session.removeEventListener('squeeze', onSqueeze);
    });

    // necessary until https://github.com/BabylonJS/Babylon.js/issues/7974
    scene.constantlyUpdateMeshUnderPointer = true;
    return scene;
};
