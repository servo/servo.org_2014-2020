/**
 * Simple tennis game with Babylon.js and WebXR.
 * 
 * Physics using Ammo.js
 * 
 * Use the left hand to controll the ball, and the right hand to play :-)
 * 
 * Created by Raanan Weber, @RaananW
 */

var createScene = async function () {
    // Create scene
    var scene = new BABYLON.Scene(engine);

    // Lights and camera
    var light = new BABYLON.DirectionalLight("light", new BABYLON.Vector3(0, -0.5, 1.0), scene);
    light.position = new BABYLON.Vector3(0, 5, -6);
    var camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 4 + 0.8, 6, new BABYLON.Vector3(0, 1, 0), scene);
    camera.attachControl(canvas, true);

    // Default Environment
    var environment = scene.createDefaultEnvironment({ enableGroundShadow: true, });
    environment.setMainColor(BABYLON.Color3.FromHexString("#74b9ff"));

    // Shadows
    var shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 32;

    // physics
    scene.enablePhysics(undefined, new BABYLON.AmmoJSPlugin());

    // clone the ground to create parentless impostor
    const groundNoParent = BABYLON.MeshBuilder.CreateBox('physicsground', {
        width: 10,
        depth: 20,
        height: 0.2
    });
    groundNoParent.position.y = -0.095
    //groundNoParent.isVisible = false;
    groundNoParent.parent = undefined;
    groundNoParent.setAbsolutePosition(environment.ground.getAbsolutePosition());
    groundNoParent.physicsImpostor = new BABYLON.PhysicsImpostor(groundNoParent, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.85 });

    groundNoParent.receiveShadows = true;
    // Enable XR
    const mode = await navigator.xr.isSessionSupported("immersive-ar") ? "ar" : "vr";
    const xr = await scene.createDefaultXRExperienceAsync({
        floorMeshes: [environment.ground],
        uiOptions: { sessionMode: "immersive-" + mode }
    });

    xr.pointerSelection.detach();

    // create the net
    const netHeight = 0.6;
    const net = BABYLON.MeshBuilder.CreateBox('net', { width: 5, height: netHeight, depth: 0.1 });
    net.position.y = netHeight / 2;
    const material = new BABYLON.GridMaterial("groundMaterial", scene);
    material.gridRatio = 0.02;
    material.majorUnitFrequency = 1;
    material.opacity = 0.9;
    material.backFaceCulling = false;
    net.material = material;
    net.physicsImpostor = new BABYLON.PhysicsImpostor(net, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.2 });

    // bounding walls
    const wall = BABYLON.MeshBuilder.CreateBox('net', { width: 8, height: 3, depth: 0.3 });
    wall.position.z = 8;
    wall.position.y = 1.5;
    const wallRight = wall.clone();
    wallRight.rotate(BABYLON.Axis.Y, Math.PI / 2);
    wallRight.position.set(4, 1.5, 4);
    const wallLeft = wallRight.clone();
    wallLeft.rotate(BABYLON.Axis.Y, Math.PI);
    wallLeft.position.x = -4;

    [wall, wallLeft, wallRight].forEach(mesh => {
        mesh.physicsImpostor = new BABYLON.PhysicsImpostor(mesh, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 });
    });

    // create the ball
    let ball = BABYLON.MeshBuilder.CreateSphere("ball", {
        diameter: 0.2,
        segments: 8
    });
    ball.position.y = 2;
    ball.position.z = -1;
    ball.isVisible = false;
    shadowGenerator.addShadowCaster(ball);
    ball.physicsImpostor = new BABYLON.PhysicsImpostor(ball, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 1, restitution: 0.9 });
    let observer;
    // create the racket
    const racket = BABYLON.MeshBuilder.CreateDisc('racket', {
        radius: 0.2,
    });
    racket.rotate(BABYLON.Axis.X, Math.PI / 2);
    racket.rotate(BABYLON.Axis.Y, Math.PI / 2);
    racket.bakeCurrentTransformIntoVertices();
    racket.material = material;
    racket.isVisible = false;
    racket.physicsImpostor = new BABYLON.PhysicsImpostor(racket, BABYLON.PhysicsImpostor.MeshImpostor, { mass: 0, restitution: 0.9 });
    shadowGenerator.addShadowCaster(racket);
    const tmpVec = new BABYLON.Vector3();
    const tmpRay = new BABYLON.Ray();
    tmpRay.origin = new BABYLON.Vector3();
    tmpRay.direction = new BABYLON.Vector3();
    let lastTimestamp = 0;
    const oldPos = new BABYLON.Vector3();
    xr.input.onControllerAddedObservable.add((controller) => {
        ball.isVisible = true;
        racket.isVisible = true;

        if (controller.inputSource.handedness === 'right') {
            const handle = BABYLON.MeshBuilder.CreateCylinder('handle', {
                height: 0.4, diameter: 0.02, tessellation: 8
            });
            handle.rotate(BABYLON.Axis.X, Math.PI / 2);
            handle.position.z += 0.2;
            handle.parent = controller.grip || controller.pointer;
            shadowGenerator.addShadowCaster(handle);
            const frameObserver = xr.baseExperience.sessionManager.onXRFrameObservable.add(() => {
                controller.getWorldPointerRayToRef(tmpRay, true);
                racket.position.copyFrom(handle.absolutePosition);
                racket.position.addInPlace(tmpRay.direction.scaleInPlace(0.2));
                racket.rotationQuaternion.copyFrom(handle.parent.rotationQuaternion);
            });

            xr.input.onControllerRemovedObservable.add(() => {
                racket.isVisible = false;
                xr.baseExperience.sessionManager.onXRFrameObservable.remove(frameObserver);
            });
        }

        const onLeftHandPressed = () => {
            observer = xr.baseExperience.sessionManager.onXRFrameObservable.add(() => {
                const delta = (xr.baseExperience.sessionManager.currentTimestamp - lastTimestamp);
                lastTimestamp = xr.baseExperience.sessionManager.currentTimestamp;
                controller.getWorldPointerRayToRef(tmpRay, true);
                tmpRay.direction.scaleInPlace(1.2);
                const position = controller.grip ? controller.grip.position : controller.pointer.position;
                tmpVec.copyFrom(position);
                tmpVec.addInPlace(tmpRay.direction);
                tmpVec.subtractToRef(oldPos, tmpVec);
                tmpVec.scaleInPlace(1000 / delta);
                ball.position.copyFrom(position);
                ball.position.addInPlace(tmpRay.direction);
                oldPos.copyFrom(ball.position);
                ball.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
                ball.physicsImpostor.setAngularVelocity(BABYLON.Vector3.Zero());
            })
        }

        const onLeftHandReleased = () => {
            // throw a ball, if exists
            if (observer) {
                xr.baseExperience.sessionManager.onXRFrameObservable.remove(observer);
                observer = null;
                ball.physicsImpostor.setLinearVelocity(tmpVec);
            }
        }


        controller.onMeshLoadedObservable.addOnce((rootMesh) => {
            shadowGenerator.addShadowCaster(rootMesh, true);
        });
        if (controller.inputSource.handedness === 'left') {
            if (controller.inputSource.gamepad) {
                controller.onMotionControllerInitObservable.add(() => {
                    const component = controller.motionController.getMainComponent();
                    component.onButtonStateChangedObservable.add(() => {
                        if (component.changes.pressed) {
                            if (component.pressed) {
                                onLeftHandPressed();
                            } else {
                                onLeftHandReleased();
                            }
                        }
                    })
                });
            } else {
                // use the squeeze event if no gamepad available
                xr.baseExperience.sessionManager.session.addEventListener('squeezestart', onLeftHandPressed);
                xr.baseExperience.sessionManager.session.addEventListener('squeezeend', onLeftHandReleased);
                xr.baseExperience.sessionManager.onXRSessionEnded.addOnce(() => {
                    // probably unneeded, as the session ended, but clean up just in case.
                    xr.baseExperience.sessionManager.session.removeEventListener('squeezestart', onLeftHandPressed);
                    xr.baseExperience.sessionManager.session.removeEventListener('squeezeend', onLeftHandReleased);
                })
            }
        }
    });

    const fm = xr.baseExperience.featuresManager;
    fm.enableFeature(BABYLON.WebXRFeatureName.BACKGROUND_REMOVER);

    // necessary until https://github.com/BabylonJS/Babylon.js/issues/7974
    scene.constantlyUpdateMeshUnderPointer = true;
    return scene;
};
