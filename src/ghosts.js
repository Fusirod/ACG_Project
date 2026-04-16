import { GHOST_COLORS_HEX, EXACT_CORNERS, GHOST_BASE_SPEED_VAL } from './constants.js';

export function spawnGhosts(scene, ghostSpeedMultiplier) {
    const BABYLON = window.BABYLON;
    const ghosts = [];
    
    GHOST_COLORS_HEX.forEach((hex, i) => {
        const color = BABYLON.Color3.FromHexString(hex);
        const mat = new BABYLON.StandardMaterial("ghostMat" + i, scene);
        mat.diffuseColor = color;
        mat.emissiveColor = color.scale(0.5);

        const ghostPivot = BABYLON.MeshBuilder.CreateBox("ghostRoot_" + i, { size: 0.1 }, scene);
        ghostPivot.isVisible = false;

        const lowPoly = BABYLON.MeshBuilder.CreateCylinder("ghostLowPoly_" + i, { height: 1.0, diameter: 0.7 }, scene);
        lowPoly.parent = ghostPivot;
        lowPoly.material = mat;

        let spawn = EXACT_CORNERS[i];
        ghostPivot.position.set(spawn.c, 0.5, -spawn.r);

        const mmMarkerMat = new BABYLON.StandardMaterial("mmMarkerMat" + i, scene);
        mmMarkerMat.diffuseColor = color;
        mmMarkerMat.emissiveColor = color.scale(0.8);

        const mmMarker = BABYLON.MeshBuilder.CreateCylinder("mmMarker_" + i, { height: 0.1, diameter: 1.2 }, scene);
        mmMarker.material = mmMarkerMat;
        mmMarker.position.y = 10;
        mmMarker.enableEdgesRendering();

        ghosts.push({
            mesh: ghostPivot,
            procMesh: lowPoly,
            mmMarker: mmMarker,
            baseMaterial: mat,
            color: color,
            r: spawn.r,
            c: spawn.c,
            startX: spawn.c,
            startR: spawn.r,
            targetR: spawn.r,
            targetC: spawn.c,
            isMoving: false,
            speed: GHOST_BASE_SPEED_VAL * ghostSpeedMultiplier,
            state: "chase",
            quadrantIndex: i
        });
    });

    return ghosts;
}

export function loadGhostModels(scene, ghosts) {
    const BABYLON = window.BABYLON;
    const ghostFiles = [
        "pac-man_ghost_blinky.glb",
        "pac-man_ghost_pinky.glb",
        "pac-man_ghost_inky.glb",
        "pac-man_ghost_clyde.glb"
    ];

    ghostFiles.forEach((fileName, i) => {
        BABYLON.SceneLoader.ImportMesh("", "./assets/models/", fileName, scene, (meshes) => {
            const g = ghosts[i];
            const container = new BABYLON.TransformNode("ghost_container_" + i, scene);
            container.parent = g.mesh;
            container.rotation.set(-Math.PI / 2, Math.PI, 0);
            container.scaling.setAll(0.027);

            meshes.forEach(m => {
                if (!(m instanceof BABYLON.Mesh)) return;
                m.rotationQuaternion = null;
                m.parent = container;
                if (!g.hpgMaterials) g.hpgMaterials = [];
                g.hpgMaterials.push({ mesh: m, mat: m.material });
                m.isVisible = true; 
            });

            // Auto centering
            container.computeWorldMatrix(true);
            const bi = container.getHierarchyBoundingInfo();
            const center = bi.boundingBox.center;
            container.position.x = -center.x + g.mesh.position.x;
            container.position.z = -center.z + g.mesh.position.z;
            container.position.y = -bi.boundingBox.minimum.y - 0.5;

        }, null, (scene, message) => {
            console.error("Error loading ghost:", message);
        });
    });
}
