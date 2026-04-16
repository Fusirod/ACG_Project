import { mapLayout, GHOST_COLORS_HEX, QUADRANTS, PLAYER_SPEED_CONST, GHOST_BASE_SPEED_VAL, SCARED_SPEED_VAL } from './src/constants.js';
import { createMaze, createPellets } from './src/maze.js';
import { spawnGhosts, loadGhostModels } from './src/ghosts.js';
import { setupPlayer, setupMinimap } from './src/player.js';
import { setupUI } from './src/ui.js';
import { isWalkable, isWalkableInQuadrant, bfsMove } from './src/utils.js';

// --- Global Setup ---
const canvas = document.getElementById("renderCanvas");
const BABYLON = window.BABYLON;

if (!canvas || !BABYLON) {
    console.error("Critical Error: Canvas or Babylon not found.");
}

const engine = new BABYLON.Engine(canvas, true);

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

    // --- State Management ---
    const state = {
        score: 0,
        gameOver: false,
        gameStarted: false,
        isHP: true,
        ghostSpeedMultiplier: 1.0,
        currentFrightenedDuration: 10,
        frightenedTimer: 0,
        headBobEnabled: true,
        bobTime: 0,
        gameTimer: 0,
        gridR: 0,
        gridC: 0,
        targetGridR: 0,
        targetGridC: 0,
        isMoving: false
    };

    // --- Lights & Materials ---
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.8;
    const glowLayer = new BABYLON.GlowLayer("glow", scene);
    
    const wallMaterial = new BABYLON.StandardMaterial("wallMat", scene);
    wallMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.8);
    wallMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.5);

    const scaredMaterial = new BABYLON.StandardMaterial("scaredMat", scene);
    scaredMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 1);
    scaredMaterial.emissiveColor = new BABYLON.Color3(0, 0, 0.5);

    // --- Maze & Entities ---
    const maze = createMaze(scene, wallMaterial);
    const pellets = createPellets(scene);
    const ghosts = spawnGhosts(scene, state.ghostSpeedMultiplier);
    loadGhostModels(scene, ghosts);

    const pelletLookup = new Map();
    pellets.activePellets.forEach(p => pelletLookup.set(`${p.x}_${p.z}`, p));

    // --- Cameras ---
    const mainCamera = setupPlayer(scene, canvas, maze.playerStartX, maze.playerStartZ);
    const minimap = setupMinimap(scene);
    
    scene.activeCameras = [mainCamera, minimap.mmCamera];
    mainCamera.viewport = new BABYLON.Viewport(0, 0, 1, 1);
    minimap.mmCamera.viewport = new BABYLON.Viewport(0.75, 0.75, 0.25, 0.25);

    const scoreText = (function() {
        if (!BABYLON.GUI) return { text: "" };
        const gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const txt = new BABYLON.GUI.TextBlock();
        txt.text = "SCORE: 0";
        txt.color = "white";
        txt.fontSize = 24;
        txt.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        txt.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        txt.paddingLeft = "20px";
        txt.paddingTop = "20px";
        gui.addControl(txt);
        return txt;
    })();

    // Declare UI variable early to avoid Temporal Dead Zone in resetGame
    let uiInstance = null;

    const resetGame = () => {
        state.score = 0; if(scoreText) scoreText.text = "SCORE: 0";
        state.gameTimer = 0; state.frightenedTimer = 0; 
        state.gameOver = false; state.gameStarted = true; state.bobTime = 0;
        
        pellets.activePellets.forEach(p => {
            p.active = true;
            const mat = BABYLON.Matrix.Translation(p.x, 0.3, p.z);
            if (p.type === 2) pellets.baseNormalPellet.thinInstanceSetMatrixAt(p.matrixIndex, mat, true);
            else if (p.type === 3) pellets.basePowerPellet.thinInstanceSetMatrixAt(p.matrixIndex, mat, true);
        });
        pellets.baseNormalPellet.thinInstanceBufferUpdated("matrix");
        pellets.basePowerPellet.thinInstanceBufferUpdated("matrix");

        ghosts.forEach(g => {
            g.state = "chase"; g.deathTimer = 0; g.isMoving = false;
            g.mesh.position.set(g.startX, 0.5, -g.startR);
            g.r = g.startR; g.c = g.startX;
            g.targetR = g.startR; g.targetC = g.startX;
            g.mesh.setEnabled(true);
            g.mesh.getChildMeshes().forEach(m => m.isVisible = true);
        });

        mainCamera.position.set(maze.playerStartX, 0.45, maze.playerStartZ);
        mainCamera.setTarget(new BABYLON.Vector3(maze.playerStartX, 0.45, maze.playerStartX - 1));
        state.gridR = -maze.playerStartZ; state.gridC = maze.playerStartX;
        state.targetGridR = state.gridR; state.targetGridC = state.gridC;
        state.isMoving = false;

        if (uiInstance && uiInstance.hideEndScreen) uiInstance.hideEndScreen();
    };

    uiInstance = setupUI({
        onStart: () => resetGame(),
        onRetry: () => resetGame(),
        onSensitivity: (p) => mainCamera.angularSensibility = 5000 * (100 / p),
        onFOV: (v) => mainCamera.fov = (v * Math.PI) / 180,
        onGlow: (v) => glowLayer.intensity = v / 100,
        onMinimap: (v) => minimap.mmCamera.viewport.height = v ? 0.25 : 0,
        onGhostSpeed: (v) => state.ghostSpeedMultiplier = v / 100,
        onFrightenedDuration: (v) => state.currentFrightenedDuration = v,
        onHeadBob: (v) => state.headBobEnabled = v,
        onGraphics: (v) => {
            state.isHP = v >= 1.0;
            engine.setHardwareScalingLevel(1 / v);
        }
    });

    const keys = new Set();
    window.addEventListener('keydown', e => keys.add(e.code));
    window.addEventListener('keyup', e => keys.delete(e.code));

    scene.onBeforeRenderObservable.add(() => {
        if (!state.gameStarted || state.gameOver) return;
        const dt = engine.getDeltaTime() / 1000.0;
        state.gameTimer += dt;

        if (state.frightenedTimer > 0) {
            state.frightenedTimer -= dt;
            if (state.frightenedTimer <= 0) {
                ghosts.forEach(g => {
                    if (g.state === "frightened") {
                        g.state = "chase";
                        g.speed = 1.5 * state.ghostSpeedMultiplier;
                        if (g.hpgMaterials) g.hpgMaterials.forEach(i => i.mesh.material = i.mat);
                    }
                });
            }
        }

        const pKey = `${state.gridC}_${-state.gridR}`;
        const p = pelletLookup.get(pKey);
        if (p && p.active) {
            if (BABYLON.Vector3.Distance(mainCamera.position, new BABYLON.Vector3(p.x, 0.3, p.z)) < 0.6) {
                p.active = false;
                const hideMat = BABYLON.Matrix.Translation(0, -1000, 0);
                if (p.type === 2) {
                    state.score += 10;
                    pellets.baseNormalPellet.thinInstanceSetMatrixAt(p.matrixIndex, hideMat);
                } else if (p.type === 3) {
                    state.score += 50;
                    pellets.basePowerPellet.thinInstanceSetMatrixAt(p.matrixIndex, hideMat);
                    state.frightenedTimer = state.currentFrightenedDuration;
                    ghosts.forEach(g => { if(g.state!=="dead"){ g.state="frightened"; g.speed=0.8*state.ghostSpeedMultiplier; }});
                }
                if(scoreText) scoreText.text = "SCORE: " + state.score;
            }
        }

        if (!state.isMoving) {
            const fwd = mainCamera.getDirection(BABYLON.Axis.Z);
            const rgt = mainCamera.getDirection(BABYLON.Axis.X);
            const toG = (dx, dz) => (Math.abs(dx) >= Math.abs(dz)) ? {dr:0, dc:dx>0?1:-1} : {dr:dz<0?1:-1, dc:0};
            let d = null;
            if (keys.has('KeyW')) d = toG(fwd.x, fwd.z);
            else if (keys.has('KeyS')) d = toG(-fwd.x, -fwd.z);
            else if (keys.has('KeyD')) d = toG(rgt.x, rgt.z);
            else if (keys.has('KeyA')) d = toG(-rgt.x, -rgt.z);

            if (d && isWalkable(state.gridR + d.dr, state.gridC + d.dc)) {
                state.targetGridR = state.gridR + d.dr;
                state.targetGridC = state.gridC + d.dc;
                state.isMoving = true;
            }
        }

        if (state.isMoving) {
            const tx = state.targetGridC, tz = -state.targetGridR;
            const dx = tx - mainCamera.position.x, dz = tz - mainCamera.position.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            const step = PLAYER_SPEED_CONST * dt;

            if (dist <= step) {
                mainCamera.position.x = tx; mainCamera.position.z = tz;
                state.gridR = state.targetGridR; state.gridC = state.targetGridC;
                state.isMoving = false;
                if (state.gridR === 10) {
                    if (state.gridC === -1) { state.gridC = 18; mainCamera.position.x = 18; }
                    else if (state.gridC === 19) { state.gridC = 0; mainCamera.position.x = 0; }
                }
            } else {
                mainCamera.position.x += (dx/dist)*step;
                mainCamera.position.z += (dz/dist)*step;
                if (state.headBobEnabled) state.bobTime += dt * 12;
            }
        }

        const bob = (state.isMoving && state.headBobEnabled) ? Math.sin(state.bobTime) * 0.025 : 0;
        mainCamera.position.y = 0.45 + bob;
        minimap.mmCamera.position.set(mainCamera.position.x, 20, mainCamera.position.z);
        minimap.playerMarker.position.set(mainCamera.position.x, 10, mainCamera.position.z);

        ghosts.forEach(g => {
            if (g.state === "dead") return;
            const dToP = BABYLON.Vector3.Distance(mainCamera.position, g.mesh.position);
            if (dToP < 0.6 && state.gameTimer > 2.0) {
                if (g.state === "chase") { state.gameOver = true; if(uiInstance) uiInstance.showEndScreen(false, state.score); }
                else if (g.state === "frightened") { g.state = "dead"; g.mesh.setEnabled(false); state.score += 200; }
            }
            if (!g.isMoving) {
                const next = bfsMove(g.r, g.c, state.gridR, state.gridC);
                if (next) { g.targetR = next.r; g.targetC = next.c; g.isMoving = true; }
            } else {
                const tx = g.targetC, tz = -g.targetR;
                const dx = tx - g.mesh.position.x, dz = tz - g.mesh.position.z;
                const dist = Math.sqrt(dx*dx + dz*dz);
                const step = g.speed * dt;
                if (dist <= step) { g.mesh.position.set(tx, 0.5, tz); g.r = g.targetR; g.c = g.targetC; g.isMoving = false; }
                else { g.mesh.rotation.y = Math.atan2(dx, dz) + Math.PI; g.mesh.position.x += (dx/dist)*step; g.mesh.position.z += (dz/dist)*step; }
                if (g.mmMarker) g.mmMarker.position.set(g.mesh.position.x, 10, g.mesh.position.z);
            }
        });
    });

    return scene;
};

const scene = createScene();
engine.runRenderLoop(() => { if (scene) scene.render(); });
window.addEventListener("resize", () => engine.resize());

const fpsDisplay = document.getElementById("fpsDisplay");
setInterval(() => { if(fpsDisplay) fpsDisplay.innerText = "FPS: " + engine.getFps().toFixed(0); }, 500);
