export function setupPlayer(scene, canvas, playerStartX, playerStartZ) {
    const BABYLON = window.BABYLON;
    const camera = new BABYLON.UniversalCamera("MainCamera", new BABYLON.Vector3(playerStartX, 0.45, playerStartZ), scene);
    camera.attachControl(canvas, true);
    camera.keysUp = [];
    camera.keysDown = [];
    camera.keysLeft = [];
    camera.keysRight = [];
    camera.angularSensibility = 3000;
    camera.minZ = 0.05;
    camera.fov = 0.8;
    return camera;
}

export function setupMinimap(scene) {
    const BABYLON = window.BABYLON;
    const mmCamera = new BABYLON.FreeCamera("minimap", new BABYLON.Vector3(0, 20, 0), scene);
    mmCamera.setTarget(BABYLON.Vector3.Zero());
    mmCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
    const orthographicSize = 10;
    mmCamera.orthoLeft = -orthographicSize;
    mmCamera.orthoRight = orthographicSize;
    mmCamera.orthoTop = orthographicSize;
    mmCamera.orthoBottom = -orthographicSize;
    mmCamera.viewport = new BABYLON.Viewport(0.75, 0.75, 0.25, 0.25);

    const playerMarkerMat = new BABYLON.StandardMaterial("playerMarkerMat", scene);
    playerMarkerMat.diffuseColor = new BABYLON.Color3(0, 0, 0); 
    playerMarkerMat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);

    const playerMarker = BABYLON.MeshBuilder.CreateCylinder("playerMarker", { height: 0.1, diameter: 0.8 }, scene);
    playerMarker.material = playerMarkerMat;
    playerMarker.enableEdgesRendering();

    return { mmCamera, playerMarker };
}
