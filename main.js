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
    [1, 1, 1, 1, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 1, 1, 1, 1],
    [1, 1, 1, 1, 2, 1, 2, 1, 1, 0, 1, 1, 2, 1, 2, 1, 1, 1, 1],
    [1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1],
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

// Block the boundaries completely (Force borders to value 1)
for (let r = 0; r < mapLayout.length; r++) {
    mapLayout[r][0] = 1;
    mapLayout[r][mapLayout[0].length - 1] = 1;
}
for (let c = 0; c < mapLayout[0].length; c++) {
    mapLayout[0][c] = 1;
    mapLayout[mapLayout.length - 1][c] = 1;
}

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
    scene.collisionsEnabled = true;

    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.3;

    // Glow Layer for neon effects
    const glowLayer = new BABYLON.GlowLayer("glow", scene);
    glowLayer.intensity = 1.0;

    // Camera
    const camera = new BABYLON.UniversalCamera("MainCamera", new BABYLON.Vector3(0, 0.5, 0), scene);
    camera.attachControl(canvas, true);
    // WASD do grid movement xử lý, không dùng physics của Babylon
    camera.keysUp = [];
    camera.keysDown = [];
    camera.keysLeft = [];
    camera.keysRight = [];
    camera.angularSensibility = 3000; // 2000 → 3000: nhạy còn 2/3
    camera.minZ = 0.05;
    camera.checkCollisions = false;
    camera.applyGravity = false;

    // Lock upward/downward movement effectively locking to Y-plane
    // by restricting camera rotation pitch or just manually syncing position.y in render loop.

    scene.onPointerDown = (evt) => {
        if (evt.button === 0) engine.enterPointerlock();
    };

    // GUI / Minimap Prep (Later phases)

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
            const tile = mapLayout[r][c];
            const x = c;
            const z = -r;

            if (tile === 1) { // Wall
                // Tường hiển thị: merge để render nhanh, không cần collision
                const box = BABYLON.MeshBuilder.CreateBox("wall_" + r + "_" + c, { size: 1 }, scene);
                box.position.x = x;
                box.position.z = z;
                box.position.y = 0.5;
                box.checkCollisions = false;
                wallsToMerge.push(box);

                // Collision xử lý bằng mapLayout, không cần collision box vật lý
            } else if (tile === 4) { // Player Start
                playerStartX = x;
                playerStartZ = z;
            }
        }
    }

    // Chỉ merge tường visual (không collision) để tối ưu render
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

    // Grid-based movement state
    let gridR = 0, gridC = 0;         // Vị trí hiện tại trên lưới
    let targetGridR = 0, targetGridC = 0; // Ô đích đang di chuyển đến
    let isPlayerMoving = false;
    const PLAYER_SPEED = 3.0;         // ô/giây (tương đương camera.speed = 0.35 cũ)
    let targetYaw = 0;                // Góc xoay camera mục tiêu (auto-face direction)
    let bobTime = 0;                // Timer cho head bob animation

    // Theo dõi phím bấm thủ công
    const pressedKeys = new Set();
    window.addEventListener('keydown', (e) => pressedKeys.add(e.code));
    window.addEventListener('keyup', (e) => pressedKeys.delete(e.code));

    // Tối ưu hóa truy xuất hạt thức ăn bằng Map
    const pelletLookup = new Map();
    activePellets.forEach(p => {
        pelletLookup.set(`${p.x}_${p.z}`, p);
    });

    // --- Phase 4: Ghosts & AI ---
    const ghosts = [];
    const ghostColors = [
        new BABYLON.Color3(1, 0, 0),     // Blinky (Q1)
        new BABYLON.Color3(1, 0.4, 0.7), // Pinky (Q2)
        new BABYLON.Color3(0, 1, 1),     // Inky (Q3)
        new BABYLON.Color3(1, 0.5, 0)    // Clyde (Q4)
    ];

    const quadrants = [
        { rMin: 0, rMax: 10, cMin: 0, cMax: 9 },     // Q1: Top-Left
        { rMin: 0, rMax: 10, cMin: 9, cMax: 18 },    // Q2: Top-Right
        { rMin: 11, rMax: 21, cMin: 0, cMax: 9 },    // Q3: Bottom-Left
        { rMin: 11, rMax: 21, cMin: 9, cMax: 18 }    // Q4: Bottom-Right
    ];

    const exactCorners = [
        { r: 1, c: 1 },    // Q1 Corner - Top-Left
        { r: 1, c: 17 },   // Q2 Corner - Top-Right
        { r: 20, c: 1 },   // Q3 Corner - Bottom-Left (map has 22 rows, last walkable row ~20)
        { r: 20, c: 17 }   // Q4 Corner - Bottom-Right
    ];

    ghostColors.forEach((color, i) => {
        const mat = new BABYLON.StandardMaterial("ghostMat" + i, scene);
        mat.diffuseColor = color;
        mat.emissiveColor = new BABYLON.Color3(color.r * 0.8, color.g * 0.8, color.b * 0.8);

        const mesh = BABYLON.MeshBuilder.CreateCylinder("ghost" + i, { height: 0.8, diameter: 0.6 }, scene);
        mesh.material = mat;

        // Đặt đúng vào 4 góc
        let spawn = exactCorners[i];

        mesh.position.x = spawn.c;
        mesh.position.z = -spawn.r;
        mesh.position.y = 0.4;

        ghosts.push({
            mesh: mesh,
            baseMaterial: mat,
            r: spawn.r,
            c: spawn.c,
            targetR: spawn.r,
            targetC: spawn.c,
            isMoving: false,
            speed: 1.5,
            state: "chase", // "chase", "frightened", "dead"
            quadrantIndex: i
        });
    });

    const isWalkable = (r, c) => {
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
        const playerR = gridR;   // Dùng grid position chính xác thay vì Math.round
        const playerC = gridC;

        if (frightenedTimer > 0) {
            frightenedTimer -= deltaTime;
            if (frightenedTimer <= 0) {
                ghosts.forEach(g => {
                    if (g.state === "frightened") {
                        g.state = "chase";
                        g.mesh.material = g.baseMaterial;
                        g.speed = 1.5;
                    }
                });
            }
        }

        // Pellet collection - Tối ưu hóa (O(1))
        const pKey = `${playerC}_${-playerR}`;
        const p = pelletLookup.get(pKey);

        if (p && p.active) {
            const distSq = (px - p.x) * (px - p.x) + (pz - p.z) * (pz - p.z);
            if (distSq < 0.3) { // Tăng nhẹ phạm vi ăn để cảm giác mượt hơn
                p.active = false;
                const hiddenMatrix = BABYLON.Matrix.Translation(0, -1000, 0);

                if (p.type === 2) {
                    score += 10;
                    baseNormalPellet.thinInstanceSetMatrixAt(p.matrixIndex, hiddenMatrix);
                } else if (p.type === 3) {
                    score += 50;
                    basePowerPellet.thinInstanceSetMatrixAt(p.matrixIndex, hiddenMatrix);
                    frightenedTimer = 10.0;
                    ghosts.forEach(g => {
                        if (g.state !== "dead") {
                            g.state = "frightened";
                            g.mesh.material = scaredMaterial;
                            g.speed = 0.8;
                        }
                    });
                }
                console.log("Score:", score);
            }
        }

        // Ghost AI
        ghosts.forEach(ghost => {
            if (ghost.state === "dead") return;

            const distToPlayer = Math.sqrt((px - ghost.mesh.position.x) ** 2 + (pz - ghost.mesh.position.z) ** 2);
            // Grace period 2 giây đầu để tránh game over ngay khi spawn
            if (distToPlayer < 0.6 && gameTimer > 2.0) {
                if (ghost.state === "chase") {
                    gameOver = true;
                    console.log("GAME OVER!");
                } else if (ghost.state === "frightened") {
                    score += 200;
                    ghost.state = "dead";
                    ghost.mesh.isVisible = false;
                    console.log("Ate a ghost! Score:", score);
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
                    ghost.mesh.position.x += (mx / mDist) * step;
                    ghost.mesh.position.z += (mz / mDist) * step;
                }
            }
        });
    });

    // Set player position and look horizontally
    camera.position.x = playerStartX;
    camera.position.z = playerStartZ;
    camera.position.y = 0.45;
    camera.setTarget(new BABYLON.Vector3(playerStartX, 0.45, playerStartZ - 1));
    // Khởi tạo grid state
    gridR = -playerStartZ;
    gridC = playerStartX;
    targetGridR = gridR;
    targetGridC = gridC;

    // Floor 
    const floor = BABYLON.MeshBuilder.CreateGround("floor", { width: 100, height: 100 }, scene);
    floor.position.y = 0;
    floor.checkCollisions = false; // Không cần, đã khoá Y bằng code
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
    // Bật viền trắng lên để chấm đen không bị chìm vào nền đen
    playerMarker.enableEdgesRendering();
    playerMarker.edgesWidth = 8.0;
    playerMarker.edgesColor = new BABYLON.Color4(1, 1, 1, 1);

    // GUI
    const guiTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    // GUI specifically for the main camera, but AdvancedDynamicTexture just overlays by default

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

    const centerText = new BABYLON.GUI.TextBlock();
    centerText.text = "Click to Start";
    centerText.color = "white";
    centerText.fontSize = 40;
    centerText.fontFamily = "monospace";
    centerText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    centerText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    guiTexture.addControl(centerText);

    const btnReplay = BABYLON.GUI.Button.CreateSimpleButton("btnReplay", "CHƠI LẠI");
    btnReplay.width = "160px";
    btnReplay.height = "60px";
    btnReplay.color = "white";
    btnReplay.background = "green";
    btnReplay.thickness = 2;
    btnReplay.top = "100px";
    btnReplay.left = "-100px";
    btnReplay.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    btnReplay.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    btnReplay.isVisible = false;
    btnReplay.onPointerUpObservable.add(() => {
        window.location.reload();
    });
    guiTexture.addControl(btnReplay);

    const btnExit = BABYLON.GUI.Button.CreateSimpleButton("btnExit", "TẮT GAME");
    btnExit.width = "160px";
    btnExit.height = "60px";
    btnExit.color = "white";
    btnExit.background = "darkred";
    btnExit.thickness = 2;
    btnExit.top = "100px";
    btnExit.left = "100px";
    btnExit.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    btnExit.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    btnExit.isVisible = false;
    btnExit.onPointerUpObservable.add(() => {
        engine.stopRenderLoop();
        centerText.text = "Game Closed. Thank You!";
        btnReplay.isVisible = false;
        btnExit.isVisible = false;
        canvas.style.display = "none";
    });
    guiTexture.addControl(btnExit);

    scene.onPointerDown = (evt) => {
        if (evt.button === 0 && !gameOver && canvas.style.display !== "none") {
            engine.enterPointerlock();
            if (!gameStarted) {
                gameStarted = true;
                if (centerText.text === "Click to Start") {
                    centerText.text = "";
                }
            }
        }
    };

    scene.onBeforeRenderObservable.add(() => {
        // ── Grid-based movement (WASD theo hướng camera) ─────────────────
        if (gameStarted && !gameOver) {
            const dt = engine.getDeltaTime() / 1000.0;

            if (!isPlayerMoving) {
                // Babylon.js tự tính hướng từ world matrix — không cần công thức thủ công
                const fwd = camera.getDirection(BABYLON.Axis.Z); // forward trong LH Babylon = +Z local
                const rgt = camera.getDirection(BABYLON.Axis.X); // right = +X local

                // Chỉ dùng thành phần XZ (bỏ Y để giữ movement phẳng theo lưới)
                const fwdX = fwd.x, fwdZ = fwd.z;
                const rgtX = rgt.x, rgtZ = rgt.z;

                // Chuyển hướng liên tục → hướng lưới gần nhất
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
                    bobTime = 0;
                } else {
                    camera.position.x += (dx / dist) * step;
                    camera.position.z += (dz / dist) * step;
                    bobTime += dt * 12;
                }
            }
        }
        // ─────────────────────────────────────────────────────────────────
        // Head bob nhẹ khi di chuyển
        const bobOffset = isPlayerMoving ? Math.sin(bobTime) * 0.018 : 0;
        camera.position.y = 0.45 + bobOffset;

        // Update Minimap
        mmCamera.position.x = camera.position.x;
        mmCamera.position.z = camera.position.z;

        // Update Player Marker position
        playerMarker.position.x = camera.position.x;
        playerMarker.position.z = camera.position.z;
        playerMarker.position.y = 10; // Đặt lên cao để camera chính (ở y=0.5) không nhìn thấy, chỉ minimap (y=20) nhìn thấy

        // Update Score GUI
        scoreText.text = "SCORE: " + score;

        if (gameOver) {
            centerText.text = "GAME OVER\nScore: " + score;
            centerText.color = "red";

            if (!btnReplay.isVisible) {
                camera.detachControl();
                btnReplay.isVisible = true;
                btnExit.isVisible = true;
                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
            }
        } else {
            // Check win
            let hasPellet = false;
            for (let i = 0; i < activePellets.length; i++) {
                if (activePellets[i].active) {
                    hasPellet = true;
                    break;
                }
            }
            if (!hasPellet && centerText.text === "" && gameTimer > 2.0) {
                gameOver = true;
                centerText.text = "YOU WIN!\nScore: " + score;
                centerText.color = "yellow";

                if (!btnReplay.isVisible) {
                    camera.detachControl();
                    btnReplay.isVisible = true;
                    btnExit.isVisible = true;
                    if (document.pointerLockElement) {
                        document.exitPointerLock();
                    }
                }
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
