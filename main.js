const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

// Map definition: 0: path, 1: wall, 2: pellet, 3: power pellet, 4: player start
const mapLayout = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 3, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 3, 1],
    [1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1],
    [1, 2, 1, 1, 2, 1, 1, 1, 2, 2, 2, 1, 1, 1, 2, 1, 1, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 2, 1],
    [1, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 1],
    [1, 1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1],
    [1, 1, 1, 1, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 1],
    [1, 1, 1, 1, 2, 1, 2, 1, 1, 0, 1, 1, 2, 1, 2, 1, 1, 1, 1],
    [2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2], // CỔNG TELEPORT (Hàng 10)
    [1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1],
    [1, 1, 1, 1, 2, 1, 2, 2, 2, 4, 2, 2, 2, 1, 2, 1, 1, 1, 1],
    [1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1],
    [1, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 1],
    [1, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 2, 1],
    [1, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 1],
    [1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
    scene.collisionsEnabled = true;

    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.3;

    // Glow Layer for neon effects
    // --- Phase 4: Init GUI FIRST for debug feedback ---
    const guiTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    const debugText = new BABYLON.GUI.TextBlock();
    debugText.text = "GLB: Initializing...";
    debugText.color = "yellow";
    debugText.fontSize = 14;
    debugText.fontFamily = "monospace";
    debugText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    debugText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    debugText.paddingRight = "20px";
    debugText.paddingTop = "20px";
    guiTexture.addControl(debugText);
    window.updateDebug = (msg, color) => {
        debugText.text = "GLB: " + msg;
        if (color) debugText.color = color;
    };

    window.updateDebug("Loading model...", "white");

    const glowLayer = new BABYLON.GlowLayer("glow", scene);
    glowLayer.intensity = 1.0;

    // Camera
    const camera = new BABYLON.UniversalCamera("MainCamera", new BABYLON.Vector3(0, 0.5, 0), scene);
    camera.attachControl(canvas, true);
    // WASD handled by custom grid movement, not Babylon physics
    camera.keysUp = [];
    camera.keysDown = [];
    camera.keysLeft = [];
    camera.keysRight = [];
    camera.angularSensibility = 3000; // 2000 → 3000: sensitivity reduced to 2/3
    camera.minZ = 0.05;
    camera.checkCollisions = false;
    camera.applyGravity = false;

    scene.onPointerDown = (evt) => {
        if (evt.button === 0) engine.enterPointerlock();
    };

    // --- Phase 2: Maze Generation ---
    let wallMaterial = new BABYLON.StandardMaterial("wallMat", scene);
    wallMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0); // Black faces
    wallMaterial.emissiveColor = new BABYLON.Color3(0, 0.2, 0.8); // Glowing blue
    // Optional: grid texture could be added if GridMaterial is loaded correctly
    if (BABYLON.GridMaterial) {
        const gridMat = new BABYLON.GridMaterial("gridMat", scene);
        gridMat.mainColor = new BABYLON.Color3(0, 0, 0);
        gridMat.lineColor = new BABYLON.Color3(0, 0.5, 1); // Neon blue
        gridMat.gridRatio = 1.0;
        gridMat.majorUnitFrequency = 1;
        gridMat.minorUnitVisibility = 0;
        gridMat.emissiveColor = new BABYLON.Color3(0, 0.2, 0.5); // Add emissive for GlowLayer
        wallMaterial = gridMat;
    }

    const wallsToMerge = [];
    let playerStartX = 0;
    let playerStartZ = 0;

    for (let r = 0; r < mapLayout.length; r++) {
        for (let c = 0; c < mapLayout[r].length; c++) {
            if (mapLayout[r][c] === 4) { // Player Start
                playerStartX = c;
                playerStartZ = -r;
            }
        }
    }

    // Tối ưu grid meshing (Greedy Meshing) để giảm seam (đường nối) và block lỗi va chạm
    const visitedWalls = new Set();
    for (let r = 0; r < mapLayout.length; r++) {
        for (let c = 0; c < mapLayout[r].length; c++) {
            if (mapLayout[r][c] === 1 && !visitedWalls.has(`${r},${c}`)) {
                // Tìm chiều ngang tối đa
                let width = 0;
                while (c + width < mapLayout[r].length && mapLayout[r][c + width] === 1 && !visitedWalls.has(`${r},${c + width}`)) {
                    width++;
                }

            if (tile === 1) { // Wall
                // Visual walls: merged for rendering performance, no physics collision needed
                const box = BABYLON.MeshBuilder.CreateBox("wall_" + r + "_" + c, { size: 1 }, scene);
                box.position.x = x;
                box.position.z = z;
                box.position.y = 0.5;
                box.checkCollisions = false;
                wallsToMerge.push(box);

                // Collision handled via mapLayout, not physical collision boxes
            } else if (tile === 4) { // Player Start
                playerStartX = x;
                playerStartZ = z;
            }
        }
    }

    // Only merge visual walls (no collision) for render optimization
    if (wallsToMerge.length > 0) {
        const mazeMesh = BABYLON.Mesh.MergeMeshes(wallsToMerge, true, true, undefined, false, true);
        mazeMesh.material = wallMaterial;
        mazeMesh.checkCollisions = false;
    }

    // --- Phase 3: Pellets & Collection ---
    const normalPelletMat = new BABYLON.StandardMaterial("normalPellet", scene);
    normalPelletMat.diffuseColor = new BABYLON.Color3(1, 1, 0.8);
    normalPelletMat.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.2); // slight yellow glow

    const baseNormalPellet = BABYLON.MeshBuilder.CreateSphere("baseNormal", { diameter: 0.15 }, scene);
    baseNormalPellet.material = normalPelletMat;

    const powerPelletMat = new BABYLON.StandardMaterial("powerPellet", scene);
    powerPelletMat.diffuseColor = new BABYLON.Color3(1, 1, 0);
    powerPelletMat.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0); // bright yellow glow

    const basePowerPellet = BABYLON.MeshBuilder.CreateSphere("basePower", { diameter: 0.4 }, scene);
    basePowerPellet.material = powerPelletMat;

    let normalMatrices = [];
    let powerMatrices = [];
    const activePellets = [];

    // Reparse the map for pellets (could be combined with Phase 2, but kept separate for clarity)
    for (let r = 0; r < mapLayout.length; r++) {
        for (let c = 0; c < mapLayout[r].length; c++) {
            const tile = mapLayout[r][c];
            const x = c;
            const z = -r;

            if (tile === 2 || tile === 3) {
                const matrix = BABYLON.Matrix.Translation(x, 0.3, z);

                activePellets.push({
                    type: tile,
                    x: x,
                    z: z,
                    id: `${r}_${c}`,
                    active: true,
                    matrixIndex: tile === 2 ? normalMatrices.length : powerMatrices.length
                });

                if (tile === 2) {
                    normalMatrices.push(matrix);
                } else {
                    powerMatrices.push(matrix);
                }
            }
        }
    }

    if (normalMatrices.length > 0) {
        baseNormalPellet.thinInstanceAdd(normalMatrices);
    }
    if (powerMatrices.length > 0) {
        basePowerPellet.thinInstanceAdd(powerMatrices);
    }

    let score = 0;
    let gameOver = false;
    let gameStarted = false;
    let frightenedTimer = 0;
    let gameTimer = 0;
    let isHP = true; // Global graphics quality flag

    // Grid-based movement state
    let gridR = 0, gridC = 0;         // Current position on grid
    let targetGridR = 0, targetGridC = 0; // Target cell moving toward
    let isPlayerMoving = false;
    const PLAYER_SPEED = 3.0;         // cells/sec (replaces old camera.speed = 0.35)
    let targetYaw = 0;                // Target camera rotation (auto-face direction)
    let bobTime = 0;                // Timer for head bob animation
    let headBobEnabled = true;      // Toggle for head bobbing effect
    let masterVolume = 0.7;          // Game volume (0.0 to 1.0)
    let musicVolume = 0.5;
    let sfxVolume = 0.8;
    let currentFOV = 80;
    let glowLayerIntensity = 1.0;
    let ghostSpeedMultiplier = 1.0;
    let currentFrightenedDuration = 10;

    // Manual key tracking
    const pressedKeys = new Set();
    window.addEventListener('keydown', (e) => pressedKeys.add(e.code));
    window.addEventListener('keyup', (e) => pressedKeys.delete(e.code));

    // Optimize pellet retrieval via Map
    const pelletLookup = new Map();
    activePellets.forEach(p => {
        pelletLookup.set(`${p.x}_${p.z}`, p);
    });

    // --- Phase 4: Ghosts & AI ---
    const ghosts = [];
    const highPolyGhosts = []; // Stores meshes from GLB
    const ghostColors = [
        new BABYLON.Color3(1, 0, 0),     // Blinky (Q1)
        new BABYLON.Color3(1, 0.4, 0.7), // Pinky (Q2)
        new BABYLON.Color3(0, 1, 1),     // Inky (Q3)
        new BABYLON.Color3(1, 0.7, 0.2)  // Clyde (Q4)
    ];

    const mapRows = mapLayout.length;
    const mapCols = mapLayout[0].length;
    // Cạnh của mỗi hình vuông bằng 3/5 cạnh map
    const sideR = Math.floor(mapRows * 0.6);
    const sideC = Math.floor(mapCols * 0.6);

    const quadrants = [
        { rMin: 0, rMax: 10, cMin: 0, cMax: 9 },     // Q1: Top-Left
        { rMin: 0, rMax: 10, cMin: 9, cMax: 18 },    // Q2: Top-Right
        { rMin: 11, rMax: 21, cMin: 0, cMax: 9 },    // Q3: Bottom-Left
        { rMin: 11, rMax: 21, cMin: 9, cMax: 18 }    // Q4: Bottom-Right
    ];

    const exactCorners = [
        { r: 1, c: 1 },    // Q1 Corner
        { r: 1, c: 17 },   // Q2 Corner
        { r: 20, c: 1 },   // Q3 Corner
        { r: 20, c: 17 }   // Q4 Corner
    ];

    ghostColors.forEach((color, i) => {
        const mat = new BABYLON.StandardMaterial("ghostMat" + i, scene);
        mat.diffuseColor = color;
        mat.emissiveColor = color.scale(0.5);

        // Movement Pivot (Invisible)
        const ghostPivot = BABYLON.MeshBuilder.CreateBox("ghostRoot_" + i, { size: 0.1 }, scene);
        ghostPivot.isVisible = false;

        // Low-Poly Mesh (Performance mode)
        const lowPoly = BABYLON.MeshBuilder.CreateCylinder("ghostLowPoly_" + i, { height: 1.0, diameter: 0.7 }, scene);
        lowPoly.parent = ghostPivot;
        lowPoly.material = mat;

        // Spawn position
        let spawn = exactCorners[i];
        ghostPivot.position.x = spawn.c;
        ghostPivot.position.z = -spawn.r;
        ghostPivot.position.y = 0.5;

        // Minimap Marker (Thick cylinder visible only to minimap)
        const mmMarkerMat = new BABYLON.StandardMaterial("mmMarkerMat" + i, scene);
        mmMarkerMat.diffuseColor = color;
        mmMarkerMat.emissiveColor = color.scale(0.8);

        const mmMarker = BABYLON.MeshBuilder.CreateCylinder("mmMarker_" + i, { height: 0.1, diameter: 1.2 }, scene);
        mmMarker.material = mmMarkerMat;
        mmMarker.position.y = 10; // High up so main camera doesn't see it
        // Enable white outlines for markers
        mmMarker.enableEdgesRendering();

        ghosts.push({
            mesh: ghostPivot,
            procMesh: lowPoly,
            mmMarker: mmMarker, // Reference for sync
            baseMaterial: mat,
            color: color,
            r: spawn.r,
            c: spawn.c,
            startX: spawn.c,
            startR: spawn.r,
            targetR: spawn.r,
            targetC: spawn.c,
            isMoving: false,
            speed: 1.5 * ghostSpeedMultiplier,
            state: "chase",
            quadrantIndex: i
        });
    });

    // Load High-Poly Models from SEPARATE files
    const ghostFiles = [
        "pac-man_ghost_blinky.glb",
        "pac-man_ghost_pinky.glb",
        "pac-man_ghost_inky.glb",
        "pac-man_ghost_clyde.glb"
    ];

    ghostFiles.forEach((fileName, i) => {
        BABYLON.SceneLoader.ImportMesh("", "./", fileName, scene, (meshes) => {
            const g = ghosts[i];
            const activeSeg = document.querySelector(".segment.active");
            const scaleVal = activeSeg ? parseFloat(activeSeg.dataset.val) : 1.0;
            isHP = scaleVal >= 1.0;
            
            // Normalize pivot scaling to prevent "warping" when rotating
            g.mesh.scaling.setAll(1.0);
            g.procMesh.scaling.set(0.7, 0.9, 0.7); // Scale the cylinder instead
            g.procMesh.isVisible = !isHP;

            // Create a single container node for all mesh parts
            const container = new BABYLON.TransformNode("ghost_container_" + i, scene);
            container.parent = g.mesh;
            container.rotation.set(-Math.PI / 2, Math.PI, 0); // Stand up + face correct
            container.scaling.setAll(0.027);

            const ghostMeshes = [];
            meshes.forEach(m => {
                if (!(m instanceof BABYLON.Mesh)) return;
                m.rotationQuaternion = null;
                m.parent = container; // Attach to container, keep original relative positions
                ghostMeshes.push(m);

                if (!g.hpg) g.hpg = m;
                if (!g.hpgMaterials) g.hpgMaterials = [];
                g.hpgMaterials.push({ mesh: m, mat: m.material });
                m.isVisible = isHP;
                // DO NOT override material colors - preserve original GLB textures
            });

            // Center the container once using combined bounding box
            if (ghostMeshes.length > 0) {
                container.computeWorldMatrix(true);
                let minX = Infinity, maxX = -Infinity;
                let minY = Infinity, maxY = -Infinity;
                let minZ = Infinity, maxZ = -Infinity;

                ghostMeshes.forEach(m => {
                    m.computeWorldMatrix(true);
                    const bi = m.getBoundingInfo();
                    const bmin = bi.boundingBox.minimumWorld;
                    const bmax = bi.boundingBox.maximumWorld;
                    minX = Math.min(minX, bmin.x); maxX = Math.max(maxX, bmax.x);
                    minY = Math.min(minY, bmin.y); maxY = Math.max(maxY, bmax.y);
                    minZ = Math.min(minZ, bmin.z); maxZ = Math.max(maxZ, bmax.z);
                });

                const parentPos = g.mesh.absolutePosition;
                const cx = (minX + maxX) / 2 - parentPos.x;
                const cz = (minZ + maxZ) / 2 - parentPos.z;
                container.position.x = -cx;
                container.position.z = -cz;
                container.position.y = -(minY - parentPos.y) - 0.5; // Ground it
            }
            
            
        }, null, (scene, message) => {
            // Silently log errors to console but not to screen
            console.error("Error loading ghost:", message);
        });
    });
        
        // Initial visibility sync
        const scale = parseFloat(document.querySelector(".segment.active").dataset.val);
        isHP = scale >= 1.0;
        ghosts.forEach(g => {
            if (g.hpg) {
                g.procMesh.isVisible = !isHP;
                // Force show all hpg children
                g.mesh.getChildMeshes().forEach(cm => {
                    if (cm.name.includes("LowPoly")) cm.isVisible = !isHP;
                    else cm.isVisible = isHP;
                });
            }
        });

    const isWalkable = (r, c) => {
        // Teleport tunnel logic (Hàng 10)
        if (r === 10) {
            if (c === -1 || c === mapLayout[0].length) return true;
        }
        if (r < 0 || r >= mapLayout.length || c < 0 || c >= mapLayout[0].length) return false;
        return mapLayout[r][c] !== 1;
    };

    // Check if cell is within ghost's assigned quadrant
    const isWalkableInQuadrant = (r, c, q) => {
        if (!isWalkable(r, c)) return false;
        return (r >= q.rMin && r <= q.rMax && c >= q.cMin && c <= q.cMax);
    };

    const bfsMove = (startR, startC, targetR, targetC) => {
        const queue = [{ r: startR, c: startC, path: [] }];
        const visited = new Set([`${startR},${startC}`]);
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        while (queue.length > 0) {
            const { r, c, path } = queue.shift();
            if (r === targetR && c === targetC) return path.length > 0 ? path[0] : null;

            for (const [dr, dc] of dirs) {
                const nr = r + dr, nc = c + dc;
                if (isWalkable(nr, nc) && !visited.has(`${nr},${nc}`)) {
                    visited.add(`${nr},${nc}`);
                    queue.push({ r: nr, c: nc, path: [...path, { r: nr, c: nc }] });
                }
            }
        }
        return null;
    };

    const scaredMaterial = new BABYLON.StandardMaterial("scared", scene);
    scaredMaterial.diffuseColor = new BABYLON.Color3(0, 0, 1);
    scaredMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 1);

    // Collection & AI logic
    scene.onBeforeRenderObservable.add(() => {
        if (!gameStarted || gameOver) return;

        let deltaTime = engine.getDeltaTime() / 1000.0;
        gameTimer += deltaTime;
        const px = camera.position.x;
        const pz = camera.position.z;
        const playerR = gridR;   // Use precise grid position instead of Math.round
        const playerC = gridC;

        if (frightenedTimer > 0) {
            frightenedTimer -= deltaTime;
            if (frightenedTimer <= 0) {
                ghosts.forEach(g => {
                    if (g.state === "frightened") {
                        g.state = "chase";
                        if (g.procMesh) g.procMesh.material = g.baseMaterial;
                        if (g.hpgMaterials) {
                            g.hpgMaterials.forEach(item => item.mesh.material = item.mat);
                        }
                        g.speed = 1.5 * ghostSpeedMultiplier;
                    }
                });
            }
        }

        // Pellet collection - optimized O(1)
        const pKey = `${playerC}_${-playerR}`;
        const p = pelletLookup.get(pKey);

        if (p && p.active) {
            const distSq = (px - p.x) * (px - p.x) + (pz - p.z) * (pz - p.z);
            if (distSq < 0.3) { // Slightly increased eat range for smoother feel
                p.active = false;
                const hiddenMatrix = BABYLON.Matrix.Translation(0, -1000, 0);

                if (p.type === 2) {
                    score += 10;
                    baseNormalPellet.thinInstanceSetMatrixAt(p.matrixIndex, hiddenMatrix);
                } else if (p.type === 3) {
                    score += 50;
                    basePowerPellet.thinInstanceSetMatrixAt(p.matrixIndex, hiddenMatrix);
                    frightenedTimer = currentFrightenedDuration;
                    ghosts.forEach(g => {
                        if (g.state !== "dead") {
                            g.state = "frightened";
                            if (g.procMesh) g.procMesh.material = scaredMaterial;
                            if (g.hpg) {
                                // Apply to all parts of the 3D model
                                g.mesh.getChildMeshes().forEach(m => {
                                    if (!m.name.includes("LowPoly")) m.material = scaredMaterial;
                                });
                            }
                            g.speed = 0.8 * ghostSpeedMultiplier;
                        }
                    });
                }
                console.log("Score:", score);
            }
        }

        // Ghost AI
        ghosts.forEach(ghost => {
            if (ghost.state === "dead") {
                // Respawn logic after 5 seconds
                if (!ghost.deathTimer) ghost.deathTimer = 5.0;
                ghost.deathTimer -= deltaTime;
                if (ghost.deathTimer <= 0) {
                    ghost.state = "chase";
                    ghost.deathTimer = 0;
                    ghost.mesh.position.x = ghost.startX;
                    ghost.mesh.position.z = -ghost.startR;
                    ghost.r = ghost.startR;
                    ghost.c = ghost.startX;
                    ghost.isMoving = false;
                    // Reset materials and visibility
                    ghost.mesh.setEnabled(true);
                    if (ghost.procMesh) {
                        ghost.procMesh.material = ghost.baseMaterial;
                        ghost.procMesh.isVisible = !isHP;
                    }
                    if (ghost.hpg) {
                        // Restore original materials to all model parts
                        ghost.mesh.getChildMeshes().forEach(m => {
                            if (m.name.includes("LowPoly")) {
                                m.isVisible = !isHP;
                                m.material = ghost.baseMaterial;
                            } else {
                                m.isVisible = isHP;
                                // Find original material from our stored list
                                if (ghost.hpgMaterials) {
                                    const entry = ghost.hpgMaterials.find(item => item.mesh === m);
                                    if (entry) m.material = entry.mat;
                                }
                            }
                        });
                    }
                }
                return;
            }

            const distToPlayer = Math.sqrt((px - ghost.mesh.position.x) ** 2 + (pz - ghost.mesh.position.z) ** 2);
            // 2-second grace period at start to avoid instant game over
            if (distToPlayer < 0.6 && gameTimer > 2.0) {
                if (ghost.state === "chase") {
                    gameOver = true;
                    console.log("GAME OVER!");
                } else if (ghost.state === "frightened") {
                    score += 200;
                    ghost.state = "dead";
                    ghost.deathTimer = 5.0; // Wait 5s to respawn
                    // Hide everything
                    ghost.mesh.setEnabled(false); 
                    ghost.mesh.getChildMeshes().forEach(m => m.isVisible = false);
                    console.log("Ate a ghost! Score:", score);
                    return;
                }
            }

            let q = quadrants[ghost.quadrantIndex];
            let playerInQuadrant = (playerR >= q.rMin && playerR <= q.rMax && playerC >= q.cMin && playerC <= q.cMax);

            if (!ghost.isMoving) {
                let nextStep = null;
                // Only chase if player is in ghost's assigned quadrant and not frightened
                if (ghost.state === "chase" && playerInQuadrant) {
                    nextStep = bfsMove(ghost.r, ghost.c, playerR, playerC);
                } else {
                    // Wander inside its quadrant
                    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                    const validDirs = dirs.filter(([dr, dc]) => isWalkableInQuadrant(ghost.r + dr, ghost.c + dc, q));

                    if (validDirs.length > 0) {
                        const randomDir = validDirs[Math.floor(Math.random() * validDirs.length)];
                        nextStep = { r: ghost.r + randomDir[0], c: ghost.c + randomDir[1] };
                    } else {
                        // Fallback: Just walk anywhere if somehow stuck
                        const anyDirs = dirs.filter(([dr, dc]) => isWalkable(ghost.r + dr, ghost.c + dc));
                        if (anyDirs.length > 0) {
                            const randomDir = anyDirs[Math.floor(Math.random() * anyDirs.length)];
                            nextStep = { r: ghost.r + randomDir[0], c: ghost.c + randomDir[1] };
                        }
                    }
                }

                if (nextStep) {
                    ghost.targetR = nextStep.r;
                    ghost.targetC = nextStep.c;
                    ghost.isMoving = true;
                }
            } else {
                const targetX = ghost.targetC;
                const targetZ = -ghost.targetR;
                const mx = targetX - ghost.mesh.position.x;
                const mz = targetZ - ghost.mesh.position.z;
                const mDist = Math.sqrt(mx * mx + mz * mz);
                const step = ghost.speed * deltaTime;

                if (mDist <= step) {
                    ghost.mesh.position.x = targetX;
                    ghost.mesh.position.z = targetZ;
                    ghost.r = ghost.targetR;
                    ghost.c = ghost.targetC;
                    ghost.isMoving = false;
                } else {
                    // Face movement direction
                    const angle = Math.atan2(mx, mz);
                    ghost.mesh.rotation.y = angle + Math.PI;
                    
                    ghost.mesh.position.x += (mx / mDist) * step;
                    ghost.mesh.position.z += (mz / mDist) * step;
                }

                // Update Minimap Marker position
                if (ghost.mmMarker) {
                    ghost.mmMarker.position.x = ghost.mesh.position.x;
                    ghost.mmMarker.position.z = ghost.mesh.position.z;
                    // Keep visible only if ghost is not dead
                    ghost.mmMarker.isVisible = (ghost.state !== "dead");
                }
            }
        });
    });

    // Set player position and look horizontally
    camera.position.x = playerStartX;
    camera.position.z = playerStartZ;
    camera.position.y = 0.45;
    camera.setTarget(new BABYLON.Vector3(playerStartX, 0.45, playerStartX - 1));
    // Initialize grid state
    gridR = -playerStartZ;
    gridC = playerStartX;
    targetGridR = gridR;
    targetGridC = gridC;

    // Floor 
    const floor = BABYLON.MeshBuilder.CreateGround("floor", { width: 100, height: 100 }, scene);
    floor.position.y = 0;
    floor.checkCollisions = false; // Not needed, Y-plane locked via code
    floor.isVisible = false;

    // --- Phase 5: GUI & Minimap ---
    const mmCamera = new BABYLON.FreeCamera("minimap", new BABYLON.Vector3(0, 20, 0), scene);
    mmCamera.setTarget(BABYLON.Vector3.Zero());
    mmCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
    const orthographicSize = 10;
    mmCamera.orthoLeft = -orthographicSize;
    mmCamera.orthoRight = orthographicSize;
    mmCamera.orthoTop = orthographicSize;
    mmCamera.orthoBottom = -orthographicSize;
    mmCamera.viewport = new BABYLON.Viewport(0.75, 0.75, 0.25, 0.25);
    // Remove the minimap from scene by default until player clicks
    // Actually Babylon handles multiple active cameras
    scene.activeCameras.push(camera);
    scene.activeCameras.push(mmCamera);

    // Make ghosts and map visible to minimap? LayerMask could be used, but standard is fine for now

    // Player Marker for Minimap (Black Dot)
    const playerMarkerMat = new BABYLON.StandardMaterial("playerMarkerMat", scene);
    playerMarkerMat.diffuseColor = new BABYLON.Color3(0, 0, 0); // Đen
    playerMarkerMat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);

    const playerMarker = BABYLON.MeshBuilder.CreateCylinder("playerMarker", { height: 0.1, diameter: 0.8 }, scene);
    playerMarker.material = playerMarkerMat;
    // Enable white outlines so the black dot doesn't disappear into the black background
    playerMarker.enableEdgesRendering();
    const scoreText = new BABYLON.GUI.TextBlock();
    scoreText.text = "SCORE: 0";
    scoreText.color = "white";
    scoreText.fontSize = 24;
    scoreText.fontFamily = "monospace";
    scoreText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    scoreText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    scoreText.paddingLeft = "20px";
    scoreText.paddingTop = "20px";
    guiTexture.addControl(scoreText);

    // --- HTML END-GAME UI ---
    const gameOverScreen = document.getElementById("gameOverScreen");
    const endGameStatus = document.getElementById("endGameStatus");
    const finalScoreText = document.getElementById("finalScore");
    const retryBtn = document.getElementById("retryBtn");
    const endToMenuBtn = document.getElementById("endToMenuBtn");

    const resetGame = () => {
        score = 0;
        gameTimer = 0;
        frightenedTimer = 0;
        gameOver = false;
        gameStarted = true;
        bobTime = 0;

        // Reset Pellets
        activePellets.forEach(p => {
            p.active = true;
            const mat = BABYLON.Matrix.Translation(p.x, 0.3, p.z);
            if (p.type === 2) baseNormalPellet.thinInstanceSetMatrixAt(p.matrixIndex, mat, true);
            else if (p.type === 3) basePowerPellet.thinInstanceSetMatrixAt(p.matrixIndex, mat, true);
        });
        // Mandatory: Notify Babylon that the matrices have changed
        if (baseNormalPellet) baseNormalPellet.thinInstanceBufferUpdated("matrix");
        if (basePowerPellet) basePowerPellet.thinInstanceBufferUpdated("matrix");

        // Reset Ghosts
        ghosts.forEach(g => {
            g.state = "chase";
            g.deathTimer = 0;
            g.mesh.position.x = g.startX;
            g.mesh.position.z = -g.startR;
            g.r = g.startR;
            g.c = g.startX;
            g.targetR = g.startR;
            g.targetC = g.startX;
            g.speed = 1.5 * ghostSpeedMultiplier;
            g.isMoving = false;
            g.mesh.setEnabled(true);
            
            // Restore original materials and visibility
            g.mesh.getChildMeshes().forEach(m => {
                m.isVisible = m.name.includes("LowPoly") ? !isHP : isHP;
                if (m.name.includes("LowPoly")) {
                    m.material = g.baseMaterial;
                } else if (g.hpgMaterials) {
                    const entry = g.hpgMaterials.find(item => item.mesh === m);
                    if (entry) m.material = entry.mat;
                }
            });

            // Reset Minimap Marker
            if (g.mmMarker) {
                g.mmMarker.position.x = g.startX;
                g.mmMarker.position.z = -g.startR;
                g.mmMarker.isVisible = true;
            }
        });

        // Reset Player
        camera.position.x = playerStartX;
        camera.position.z = playerStartZ;
        camera.setTarget(new BABYLON.Vector3(playerStartX, 0.45, playerStartX - 1));
        gridR = -playerStartZ;
        gridC = playerStartX;
        targetGridR = gridR;
        targetGridC = gridC;
        isPlayerMoving = false;

        if (playerMarker) {
            playerMarker.position.x = playerStartX;
            playerMarker.position.z = playerStartZ;
        }
        
        camera.attachControl(canvas, true);
        if (!document.pointerLockElement) {
            engine.enterPointerlock();
        }
        
        gameOverScreen.classList.add("hidden");
    };

    if (retryBtn) {
        retryBtn.addEventListener("click", () => {
            resetGame();
        });
    }
    if (endToMenuBtn) {
        endToMenuBtn.addEventListener("click", () => {
            sessionStorage.removeItem('autoStartPacman');
            window.location.reload();
        });
    }

    const showEndScreen = (isWin) => {
        if (!gameOverScreen || !gameOverScreen.classList.contains("hidden")) return;
        
        gameOverScreen.classList.remove("hidden");
        endGameStatus.innerText = isWin ? "VICTORY!" : "GAME OVER";
        finalScoreText.innerText = score;
        
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        camera.detachControl();
    };

    // --- Menu Logic ---
    const menuOverlay = document.getElementById("menuOverlay");
    const settingsPanel = document.getElementById("settingsPanel");
    const startBtn = document.getElementById("startBtn");
    const settingsBtn = document.getElementById("settingsBtn");
    const backToMenuBtn = document.getElementById("backToMenuBtn");

    // Tab Logic
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabPanes = document.querySelectorAll(".tab-pane");

    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            tabPanes.forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(btn.dataset.tab).classList.add("active");
        });
    });

    if (startBtn) {
        startBtn.addEventListener("click", () => {
            gameStarted = true;
            menuOverlay.classList.add("hidden");
            engine.enterPointerlock();
            if (centerText.text === "Click to Start") {
                centerText.text = "";
            }
        });
    }

    if (settingsBtn) {
        settingsBtn.addEventListener("click", () => {
            menuOverlay.classList.add("hidden");
            settingsPanel.classList.remove("hidden");
        });
    }

    if (backToMenuBtn) {
        backToMenuBtn.addEventListener("click", () => {
            settingsPanel.classList.add("hidden");
            menuOverlay.classList.remove("hidden");
        });
    }

    // Apply Settings & Update Displays
    const updateVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    document.getElementById("sensitivityRange").addEventListener("input", (e) => {
        const percent = parseInt(e.target.value);
        // Inverse relationship: standard is 3000 at 100%
        camera.angularSensibility = 3000 / (percent / 100);
        updateVal("sensitivityVal", percent + "%");
    });

    document.getElementById("fovRange").addEventListener("input", (e) => {
        currentFOV = parseInt(e.target.value);
        camera.fov = (currentFOV * Math.PI) / 180;
        updateVal("fovVal", currentFOV);
    });

    document.getElementById("headBobToggle").addEventListener("change", (e) => {
        headBobEnabled = e.target.checked;
        if (!headBobEnabled) {
            camera.position.y = 0.45; // Reset immediately when turned off
            bobTime = 0;
        }
    });

    document.getElementById("masterVolume").addEventListener("input", (e) => {
        const val = parseInt(e.target.value);
        masterVolume = val / 100;
        updateVal("masterVolumeVal", val + "%");
    });

    document.getElementById("musicVolume").addEventListener("input", (e) => {
        const val = parseInt(e.target.value);
        musicVolume = val / 100;
        updateVal("musicVolumeVal", val + "%");
    });

    document.getElementById("sfxVolume").addEventListener("input", (e) => {
        const val = parseInt(e.target.value);
        sfxVolume = val / 100;
        updateVal("sfxVolumeVal", val + "%");
    });

    document.getElementById("glowIntensity").addEventListener("input", (e) => {
        const val = parseInt(e.target.value);
        glowLayerIntensity = val / 100;
        glowLayer.intensity = glowLayerIntensity;
        updateVal("glowVal", val + "%");
        
        // Ensure all neon materials are contributing
        scene.materials.forEach(mat => {
            if (mat.name.toLowerCase().includes("neon") || mat.name.toLowerCase().includes("glow")) {
                mat.emissiveColor = mat.diffuseColor || new BABYLON.Color3(1,1,1);
            }
        });
    });

    document.getElementById("minimapToggle").addEventListener("change", (e) => {
        const isVisible = e.target.checked;
        scene.activeCameras[1].viewport.height = isVisible ? 0.25 : 0;
        scene.activeCameras[1].viewport.width = isVisible ? 0.25 : 0;
    });

    window.scene = scene; // For debug inspection

    document.querySelectorAll(".segment").forEach(seg => {
        seg.addEventListener("click", () => {
            document.querySelectorAll(".segment").forEach(s => s.classList.remove("active"));
            seg.classList.add("active");
            const scale = parseFloat(seg.dataset.val);
            engine.setHardwareScalingLevel(1 / scale);
            isHP = scale >= 1.0; // Update global isHP

            // Swap Ghost Meshes based on scale
            const isHighPoly = isHP;
            ghosts.forEach(g => {
                // FALLBACK: Only hide procedural mesh IF high-poly mesh actually exists and is loaded
                if (g.hpg) {
                    g.procMesh.isVisible = !isHighPoly;
                    g.hpg.isVisible = isHighPoly;
                    g.hpg.getChildMeshes().forEach(c => c.isVisible = isHighPoly);
                } else {
                    // If GLB failed, always show procedural
                    g.procMesh.isVisible = true;
                }
            });
        });
    });

    document.getElementById("ghostSpeed").addEventListener("input", (e) => {
        const val = parseInt(e.target.value);
        ghostSpeedMultiplier = val / 100;
        updateVal("ghostSpeedVal", (val / 100).toFixed(1) + "x");
        
        // Apply to all ghosts immediately
        ghosts.forEach(g => {
            if (g.state === "chase") g.speed = 1.5 * ghostSpeedMultiplier;
            else if (g.state === "frightened") g.speed = 0.8 * ghostSpeedMultiplier;
        });
    });

    document.getElementById("frightenedDuration").addEventListener("input", (e) => {
        const val = parseInt(e.target.value);
        currentFrightenedDuration = val;
        updateVal("frightenedVal", val + "s");
    });

    const fpsDisplay = document.getElementById("fpsDisplay");
    const pingDisplay = document.getElementById("pingDisplay");
    const perfHud = document.getElementById("perfHud");

    document.getElementById("perfToggle").addEventListener("change", (e) => {
        if (e.target.checked) perfHud.classList.remove("hidden");
        else perfHud.classList.add("hidden");
    });

    // Update FPS & Ping every 500ms
    setInterval(() => {
        if (gameStarted && !gameOver) {
            fpsDisplay.innerText = "FPS: " + engine.getFps().toFixed(0);
            // Simulate a local ping for the FPS vibe
            const fakePing = Math.floor(Math.random() * 4) + 5; 
            pingDisplay.innerText = "PING: " + fakePing + "ms";
        }
    }, 500);

    scene.onPointerDown = (evt) => {
        if (evt.button === 0 && !gameOver && gameStarted) {
            engine.enterPointerlock();
        }
    };

    scene.onBeforeRenderObservable.add(() => {
        // ── Grid-based movement (WASD camera-relative) ─────────────────
        if (gameStarted && !gameOver) {
            const dt = engine.getDeltaTime() / 1000.0;

            if (!isPlayerMoving) {
                // Babylon.js tự tính hướng từ world matrix — không cần công thức thủ công
                const fwd = camera.getDirection(BABYLON.Axis.Z); // forward trong LH Babylon = +Z local
                const rgt = camera.getDirection(BABYLON.Axis.X); // right = +X local

                // Only use XZ components (discard Y to keep movement grid-locked)
                const fwdX = fwd.x, fwdZ = fwd.z;
                const rgtX = rgt.x, rgtZ = rgt.z;

                // Continuously convert direction → nearest grid axis
                const toGrid = (dx, dz) => {
                    if (Math.abs(dx) >= Math.abs(dz))
                        return { dr: 0, dc: dx > 0 ? 1 : -1 };
                    else
                        return { dr: dz < 0 ? 1 : -1, dc: 0 }; // z↓ → row↑
                };

                let dir = null;
                if (pressedKeys.has('KeyW')) dir = toGrid(fwdX, fwdZ);
                else if (pressedKeys.has('KeyS')) dir = toGrid(-fwdX, -fwdZ);
                else if (pressedKeys.has('KeyD')) dir = toGrid(rgtX, rgtZ);
                else if (pressedKeys.has('KeyA')) dir = toGrid(-rgtX, -rgtZ);

                if (dir && isWalkable(gridR + dir.dr, gridC + dir.dc)) {
                    targetGridR = gridR + dir.dr;
                    targetGridC = gridC + dir.dc;
                    isPlayerMoving = true;
                }
            }

            if (isPlayerMoving) {
                const tx = targetGridC;
                const tz = -targetGridR;
                const dx = tx - camera.position.x;
                const dz = tz - camera.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                const step = PLAYER_SPEED * dt;

                if (dist <= step) {
                    camera.position.x = tx;
                    camera.position.z = tz;
                    gridR = targetGridR;
                    gridC = targetGridC;
                    isPlayerMoving = false;
                    // bobTime = 0; // Removed to prevent stuttering at intersections

                    // Teleport logic (handled separately here)
                    if (gridR === 10) {
                        if (gridC === -1) { gridC = 18; targetGridC = 18; camera.position.x = 18; }
                        else if (gridC === 19) { gridC = 0; targetGridC = 0; camera.position.x = 0; }
                    }
                } else {
                    camera.position.x += (dx / dist) * step;
                    camera.position.z += (dz / dist) * step;
                    if (headBobEnabled) {
                        bobTime += dt * 12;
                    }
                }
            }
        }
        // ─────────────────────────────────────────────────────────────────
        // Subtle head bob during movement
        const bobOffset = (isPlayerMoving && headBobEnabled) ? Math.sin(bobTime) * 0.025 : 0;
        camera.position.y = 0.45 + bobOffset;

        // Giới hạn góc nhìn lên/xuống (pitch) để tránh vector di chuyển nhắm thẳng xuống đất gây kẹt
        if (camera.rotation.x > 0.3) camera.rotation.x = 0.3;
        if (camera.rotation.x < -0.3) camera.rotation.x = -0.3;

        // Update Minimap
        mmCamera.position.x = camera.position.x;
        mmCamera.position.z = camera.position.z;

        // Update Player Marker position
        playerMarker.position.x = camera.position.x;
        playerMarker.position.z = camera.position.z;
        playerMarker.position.y = 10; // Positioned high so main camera (at y=0.5) doesn't see it, only minimap (y=20)

        // Update Score GUI
        scoreText.text = "SCORE: " + score;

        if (handledEndGame) return;

        if (gameOver) {
            showEndScreen(false);
        } else {
            // Check win
            let hasPellet = false;
            for (let i = 0; i < activePellets.length; i++) {
                if (activePellets[i].active) {
                    hasPellet = true;
                    break;
                }
            }
            if (!hasPellet && gameTimer > 2.0) {
                gameOver = true;
                showEndScreen(true);
            }
        }
    });

    return scene;
};

const scene = createScene();

engine.runRenderLoop(function () {
    scene.render();
});

window.addEventListener("resize", function () {
    engine.resize();
});
