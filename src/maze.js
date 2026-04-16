import { mapLayout } from './constants.js';

export function createMaze(scene, wallMaterial) {
    const BABYLON = window.BABYLON;
    const wallsToMerge = [];
    let playerStartX = 0;
    let playerStartZ = 0;

    for (let r = 0; r < mapLayout.length; r++) {
        for (let c = 0; c < mapLayout[r].length; c++) {
            const tile = mapLayout[r][c];
            const x = c;
            const z = -r;

            if (tile === 1) { // Wall
                const box = BABYLON.MeshBuilder.CreateBox("wall_" + r + "_" + c, { size: 1 }, scene);
                box.position.set(x, 0.5, z);
                wallsToMerge.push(box);
            } else if (tile === 4) { // Player Start
                playerStartX = x;
                playerStartZ = z;
            }
        }
    }

    if (wallsToMerge.length > 0) {
        const mazeMesh = BABYLON.Mesh.MergeMeshes(wallsToMerge, true, true, undefined, false, true);
        if (mazeMesh) {
            mazeMesh.material = wallMaterial;
            mazeMesh.checkCollisions = false;
        }
    }

    return { playerStartX, playerStartZ };
}

export function createPellets(scene) {
    const BABYLON = window.BABYLON;
    const baseNormalPellet = BABYLON.MeshBuilder.CreateSphere("baseNormal", { diameter: 0.15 }, scene);
    const basePowerPellet = BABYLON.MeshBuilder.CreateSphere("basePower", { diameter: 0.35 }, scene);
    
    const normalMaterial = new BABYLON.StandardMaterial("normalPelletMat", scene);
    normalMaterial.diffuseColor = new BABYLON.Color3(1, 0.9, 0.7);
    normalMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0.2);
    baseNormalPellet.material = normalMaterial;

    const powerMaterial = new BABYLON.StandardMaterial("powerPelletMat", scene);
    powerMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
    powerMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0.8);
    basePowerPellet.material = powerMaterial;

    baseNormalPellet.isVisible = false;
    basePowerPellet.isVisible = false;

    const activePellets = [];
    let matrixIndexNormal = 0;
    let matrixIndexPower = 0;

    for (let r = 0; r < mapLayout.length; r++) {
        for (let c = 0; c < mapLayout[r].length; c++) {
            const tile = mapLayout[r][c];
            if (tile === 2 || tile === 3) {
                const x = c;
                const z = -r;
                const matrix = BABYLON.Matrix.Translation(x, 0.3, z);
                
                if (tile === 2) {
                    baseNormalPellet.thinInstanceAdd(matrix);
                    activePellets.push({ x, z, type: 2, matrixIndex: matrixIndexNormal++, active: true });
                } else {
                    basePowerPellet.thinInstanceAdd(matrix);
                    activePellets.push({ x, z, type: 3, matrixIndex: matrixIndexPower++, active: true });
                }
            }
        }
    }

    return { baseNormalPellet, basePowerPellet, activePellets };
}
