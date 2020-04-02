/**
 * WebXR Golie training
 * 
 * This demo was made to display a few of Babylon.js' WebXR features:
 * 
 * - The WebXR motion controller repository was integrated - any supported controller is fully supported
 * - WebXR controllers can have physics impostors attached to them with one line of code.
 * - Teleportation is still working - you can teleport to a different location. Not that it will help you win the game ;-)
 * - You can play this game with the WebXR emulator. Thou I am pretty sure it will be VERY hard.
 * 
 * If you have any questions contact RaananW at babylon's forum or on twitter 
 */


var createScene = async function () {
    // Create scene
    var scene = new BABYLON.Scene(engine);

    // Lights and camera
    var light = new BABYLON.DirectionalLight("light", new BABYLON.Vector3(0, -0.5, 1.0), scene);
    light.position = new BABYLON.Vector3(0, 5, -6);
    var camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 4, 3.8, new BABYLON.Vector3(0, 1, 0), scene);
    camera.attachControl(canvas, true);
    scene.activeCamera.beta += 0.8;

    // Default Environment
    var environment = scene.createDefaultEnvironment({ enableGroundShadow: true });
    environment.setMainColor(BABYLON.Color3.FromHexString("#74b9ff"))
    environment.ground.parent.position.y = 0;
    environment.ground.position.y = 0

    // Shadows
    var shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 32;

    // GUI
    var plane = BABYLON.Mesh.CreatePlane("plane", 1);
    plane.position = new BABYLON.Vector3(0.4, 1.58, 0.4)
    var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(plane);
    var panel = new BABYLON.GUI.StackPanel();
    advancedTexture.addControl(panel);
    var header = new BABYLON.GUI.TextBlock();
    header.text = "Goalie Trainer";
    header.height = "100px";
    header.color = "white";
    header.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    header.fontSize = "120"
    panel.addControl(header);
    var easyButton = BABYLON.GUI.Button.CreateSimpleButton("onoff", "Easy");
    easyButton.onPointerClickObservable.add(() => {
        gameConfig = easyConfig;
        throwBalls = !throwBalls;
        if (throwBalls) {
            score = 0;
            easyButton.background = "red";
            header.text = "Score: " + score;
            easyButton.textBlock.text = 'end';
            hardButton.isVisible = false;
        } else {
            easyButton.background = "green";
            easyButton.textBlock.text = 'Easy';
            hardButton.textBlock.text = 'Hard';
            header.text = "Goalie Trainer";
            hardButton.isVisible = true;
        }
    });
    easyButton.width = 0.5;
    easyButton.height = "80px";
    easyButton.color = "white";
    easyButton.background = "green";
    easyButton.fontSize = 60;
    panel.addControl(easyButton);

    var hardButton = BABYLON.GUI.Button.CreateSimpleButton("onoff", "Hard");
    hardButton.onPointerClickObservable.add(() => {
        gameConfig = hardConfig;
        throwBalls = !throwBalls;
        if (throwBalls) {
            score = 0;
            easyButton.background = "red";
            header.text = "Score: " + score;
            easyButton.textBlock.text = 'Stop';
            hardButton.isVisible = false;
        }
    });
    hardButton.width = 0.5;
    hardButton.height = "80px";
    hardButton.color = "white";
    hardButton.background = "green";
    hardButton.fontSize = 60;
    panel.addControl(hardButton);

    // game configuration
    const easyConfig = {
        ballSize: 0.5,
        forceFactor: 1,
        heightFactor: 1
    }

    const hardConfig = {
        ballSize: 0.3,
        forceFactor: 1.35,
        heightFactor: 0.925
    }

    let gameConfig = {
        ...easyConfig
    }


    // physics
    scene.enablePhysics(undefined, new BABYLON.AmmoJSPlugin());

    // clone the ground to create parentless impostor
    const groundNoParent = environment.ground.clone();
    groundNoParent.isVisible = false;
    groundNoParent.parent = undefined;
    groundNoParent.setAbsolutePosition(environment.ground.getAbsolutePosition());
    groundNoParent.material = undefined;
    groundNoParent.physicsImpostor = new BABYLON.PhysicsImpostor(groundNoParent, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.5 });

    // build the goal
    const goalHeight = 2;
    const goalWidth = 3;
    const goalDepth = 0.8;
    const rightPole = BABYLON.BoxBuilder.CreateBox("goal", { width: 0.1, height: goalHeight, depth: 0.1 });
    const leftPole = rightPole.clone();
    rightPole.position.set(goalWidth / 2, goalHeight / 2, -5);
    leftPole.position.set(-goalWidth / 2, goalHeight / 2, -5);
    const upperPole = BABYLON.BoxBuilder.CreateBox("goal", { width: goalWidth, height: 0.1, depth: 0.1 });
    upperPole.position.set(0, goalHeight, -5);

    let goal = BABYLON.BoxBuilder.CreateBox("goal", { width: 3, height: 2, depth: 0.098 });
    goal.position.y = 1;
    goal.position.z = -5;
    const material = new BABYLON.GridMaterial("groundMaterial", scene);
    material.gridRatio = 0.1;
    material.majorUnitFrequency = 1;
    material.opacity = 0.9;
    goal.material = material;

    shadowGenerator.addShadowCaster(rightPole);
    shadowGenerator.addShadowCaster(leftPole);
    shadowGenerator.addShadowCaster(upperPole);
    shadowGenerator.addShadowCaster(goal);

    rightPole.physicsImpostor = new BABYLON.PhysicsImpostor(rightPole, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 })
    leftPole.physicsImpostor = new BABYLON.PhysicsImpostor(leftPole, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 })
    upperPole.physicsImpostor = new BABYLON.PhysicsImpostor(upperPole, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 })
    goal.physicsImpostor = new BABYLON.PhysicsImpostor(goal, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 })


    let counter = 0;
    const spheres = [];

    // Enable XR
    var xr = await scene.createDefaultXRExperienceAsync({ floorMeshes: [environment.ground] });

    // Add controllers to shadow.
    xr.input.onControllerAddedObservable.add((controller) => {
        // future safe
        if (controller.onMeshLoadedObservable) {
            controller.onMeshLoadedObservable.addOnce((rootMesh) => {
                shadowGenerator.addShadowCaster(rootMesh, true);
            });
        } else {
            controller.onMotionControllerProfileLoaded.addOnce((motionController) => {
                motionController.onModelLoadedObservable.addOnce(() => {
                    shadowGenerator.addShadowCaster(motionController.rootMesh, true);
                });
            });
        }
    });

    // get the features manager
    const fm = xr.baseExperience.featuresManager;

    // enable physics on the motion controllers
    const xrPhysics = fm.enableFeature(BABYLON.WebXRFeatureName.PHYSICS_CONTROLLERS, "latest", {
        xrInput: xr.input,
        physicsProperties: {
            restitution: 0.5,
            impostorSize: 0.15
        }
    });

    let throwBalls = false;
    let score = 0;

    // XR loop - throwing balls only when inside the session
    xr.baseExperience.sessionManager.onXRFrameObservable.add(() => {
        if (!throwBalls) return;
        // throw a ball every 2 seconds
        if (counter++ === 120 && spheres.length < 10) {
            counter = 0;
            const sphere = BABYLON.SphereBuilder.CreateSphere("sphere", { diameter: gameConfig.ballSize }, scene);
            shadowGenerator.addShadowCaster(sphere);
            spheres.push(sphere);
            sphere.position.z = 5;
            sphere.position.y = 0.2;
            sphere.position.x += Math.random() * 2;
            sphere.position.x -= Math.random() * 2;
            sphere.physicsImpostor = new BABYLON.PhysicsImpostor(sphere, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 0.7, restitution: 0.5 });
            // shoot the ball up
            sphere.physicsImpostor.applyImpulse(new BABYLON.Vector3(0, 6.5 * gameConfig.heightFactor, 0), BABYLON.Vector3.Zero());
            let sphereTouchedGround = 0;
            // goal? bad for you...
            sphere.physicsImpostor.registerOnPhysicsCollide(goal.physicsImpostor, (collider, collidedAgainst) => {
                if (sphere.hitGoal) return;
                score--;
                header.text = "Score: " + score;
                sphere.hitGoal = true;
            });

            // a ball that touched the ground more than 4 times is considered a win
            sphere.physicsImpostor.registerOnPhysicsCollide(groundNoParent.physicsImpostor, (collider, collidedAgainst) => {
                sphereTouchedGround++;
                if (sphereTouchedGround > 4 || sphere.hitGoal) {
                    score += sphere.hitGoal ? 0 : 1;
                    header.text = "Score: " + score;
                    sphere.dispose();
                }
            });
            // shoot the ball forward after a second
            setTimeout(() => {
                sphere.physicsImpostor.applyImpulse(new BABYLON.Vector3(0, 0, -(8 * gameConfig.forceFactor) - Math.random() + Math.random() - Math.random()), BABYLON.Vector3.Zero());
            }, 1000);
        }

        // check the spheres array and filter it
        const alive = spheres.filter((s) => s.position.y > 0 && !s.isDisposed());

        spheres.forEach((s) => {
            if (s.position.y < 0) {
                score += s.hitGoal ? 0 : 1;
                header.text = "Score: " + score;
                s.dispose();
            }
        });

        spheres.splice(0, spheres.length, ...alive);
    });

    return scene;
};
