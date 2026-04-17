const canvas = document.getElementById("renderCanvas");
// Khởi tạo engine Babylon.js để vẽ 3D lên canvas. Tham số true bật khử răng cưa (antialias).
const engine = new BABYLON.Engine(canvas, true);

// Map definition: 0: đường đi, 1: tường, 2: chấm điểm nhỏ, 3: chấm sức mạnh, 4: player bắt đầu
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
    // Tạo một scene (không gian 3D chứa mọi vật thể, ánh sáng, camera...)
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
    scene.collisionsEnabled = true;

    // Tạo ánh sáng bán cầu (Hemispheric Light) hướng từ trên xuống (Vector3(0, 1, 0))
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.3;

    // Lớp phát sáng (Glow Layer) cho hiệu ứng neon
    // --- Giai đoạn 4: Khởi tạo GUI TRƯỚC TIÊN để làm phản hồi debug ---
    // Khởi tạo GUI (giao diện 2D) phủ toàn màn hình để vẽ text (ví dụ: debug, điểm số)
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
    // Tạo UniversalCamera (camera góc nhìn thứ nhất, hỗ trợ cả bàn phím, chuột, cảm ứng)
    const camera = new BABYLON.UniversalCamera("MainCamera", new BABYLON.Vector3(0, 0.5, 0), scene);
    // Gắn control chuột/bàn phím của canvas vào camera
    camera.attachControl(canvas, true);
    // WASD được xử lý bằng logic di chuyển lưới tùy chỉnh, không dùng vật lý chuẩn của Babylon
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

    // --- Giai đoạn 2: Tạo mê cung (Maze Generation) ---
    // StandardMaterial: Chất liệu cơ bản nhất dùng để định nghĩa màu sắc và độ phản quang
    let wallMaterial = new BABYLON.StandardMaterial("wallMat", scene);
    wallMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0); // Các mặt màu đen
    wallMaterial.emissiveColor = new BABYLON.Color3(0, 0.2, 0.8); // Ánh sáng xanh (Glowing blue)
    // Tùy chọn: grid texture (lưới) có thể được thêm nếu GridMaterial được load thành công
    if (BABYLON.GridMaterial) {
        const gridMat = new BABYLON.GridMaterial("gridMat", scene);
        gridMat.mainColor = new BABYLON.Color3(0, 0, 0);
        gridMat.lineColor = new BABYLON.Color3(0, 0.5, 1); // Xanh neon (Neon blue)
        gridMat.gridRatio = 1.0;
        gridMat.majorUnitFrequency = 1;
        gridMat.minorUnitVisibility = 0;
        gridMat.emissiveColor = new BABYLON.Color3(0, 0.2, 0.5); // Thêm phát sáng cho GlowLayer
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

            if (tile === 1) { // Wall (Tường)
                // Khối tường hiển thị: sẽ gộp lại để tăng hiệu suất render, không cần xử lý va chạm vật lý
                // MeshBuilder.CreateBox: Hàm tạo mesh hình hộp chữ nhật cơ bản
                const box = BABYLON.MeshBuilder.CreateBox("wall_" + r + "_" + c, { size: 1 }, scene);
                box.position.x = x;
                box.position.z = z;
                box.position.y = 0.5;
                box.checkCollisions = false;
                wallsToMerge.push(box);

                // Va chạm được xử lý qua mảng mapLayout, không cần các khối va chạm vật lý
            } else if (tile === 4) { // Player Start (Bắt đầu người chơi)
                playerStartX = x;
                playerStartZ = z;
            }
        }
    }

    // Chỉ gộp meshes tường để hiển thị (không dùng logic va chạm 3D vật lý) nhằm tối ưu render
    if (wallsToMerge.length > 0) {
        // MergeMeshes: Gộp nhiều khối riêng lẻ thành một khối duy nhất để tăng hiệu suất render cực lớn (giảm số lần gọi draw call)
        const mazeMesh = BABYLON.Mesh.MergeMeshes(wallsToMerge, true, true, undefined, false, true);
        mazeMesh.material = wallMaterial;
        mazeMesh.checkCollisions = false;
    }

    // --- Giai đoạn 3: Chấm điểm (Pellets) & Thu thập ---
    const normalPelletMat = new BABYLON.StandardMaterial("normalPellet", scene);
    normalPelletMat.diffuseColor = new BABYLON.Color3(1, 1, 0.8);
    normalPelletMat.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.2); // Phát sáng vàng nhẹ

    // MeshBuilder.CreateSphere: Hàm tạo mesh hình cầu
    const baseNormalPellet = BABYLON.MeshBuilder.CreateSphere("baseNormal", { diameter: 0.15 }, scene);
    baseNormalPellet.material = normalPelletMat;

    const powerPelletMat = new BABYLON.StandardMaterial("powerPellet", scene);
    powerPelletMat.diffuseColor = new BABYLON.Color3(1, 1, 0);
    powerPelletMat.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0); // Vàng rực sáng

    const basePowerPellet = BABYLON.MeshBuilder.CreateSphere("basePower", { diameter: 0.4 }, scene);
    basePowerPellet.material = powerPelletMat;

    let normalMatrices = [];
    let powerMatrices = [];
    const activePellets = [];

    // Quét lại bản đồ để lấy các chấm điểm (có thể gộp vào Giai đoạn 2, nhưng tách ra thế này cho rõ nghĩa)
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
        // thinInstanceAdd: Kỹ thuật render hàng ngàn bản sao của một mesh chỉ với 1 lệnh draw (tối ưu cho các hạt giống nhau trên map)
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
    let isHP = true; // Cờ bật/tắt đồ họa độ phân giải cao nói chung

    // Trạng thái di chuyển theo dạng hình lưới
    let gridR = 0, gridC = 0;         // Vị trí hiện tại trên lưới
    let targetGridR = 0, targetGridC = 0; // Ô mục tiêu đang đi tới
    let isPlayerMoving = false;
    const PLAYER_SPEED = 2.0;         // ô/giây (thay cho camera.speed = 0.35 cũ)
    let targetYaw = 0;                // Góc xoay gốc của camera (để tự động xoay góc nhìn)
    let bobTime = 0;                // Bộ đếm thời gian hiệu ứng rung màn hình khi đi
    let headBobEnabled = true;      // Nút tắt/mở hiệu ứng rùng lắc
    let masterVolume = 0.7;          // Âm lượng trò chơi (0.0 đến 1.0)
    let musicVolume = 0.5;
    let sfxVolume = 0.8;
    let currentFOV = 60;
    let glowLayerIntensity = 1.0;
    let ghostSpeedMultiplier = 1.0;
    let currentFrightenedDuration = 10;

    // Trình theo dõi phím nhấn (nhập thủ công)
    const pressedKeys = new Set();
    window.addEventListener('keydown', (e) => pressedKeys.add(e.code));
    window.addEventListener('keyup', (e) => pressedKeys.delete(e.code));

    // Tối ưu hóa việc tìm chấm điểm (pellet) thông qua mảng cấu trúc Map
    const pelletLookup = new Map();
    activePellets.forEach(p => {
        pelletLookup.set(`${p.x}_${p.z}`, p);
    });

    // --- Giai đoạn 4: Ma (Ghosts) & logic AI ---
    const ghosts = [];
    const highPolyGhosts = []; // Lưu trữ các meshes được tải từ file GLB
    const ghostColors = [
        new BABYLON.Color3(1, 0, 0),     // Blinky (Q1)
        new BABYLON.Color3(1, 0.4, 0.7), // Pinky (Q2)
        new BABYLON.Color3(0, 1, 1),     // Inky (Q3)
        new BABYLON.Color3(1, 0.7, 0.2)  // Clyde (Q4)
    ];

    const quadrants = [
        { rMin: 0, rMax: 10, cMin: 0, cMax: 9 },     // Q1: Góc Tên-Trái
        { rMin: 0, rMax: 10, cMin: 9, cMax: 18 },    // Q2: Góc Trên-Phải
        { rMin: 11, rMax: 21, cMin: 0, cMax: 9 },    // Q3: Góc Dưới-Trái
        { rMin: 11, rMax: 21, cMin: 9, cMax: 18 }    // Q4: Góc Dưới-Phải
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

        // Trục tọa độ di chuyển trung tâm của Ma (Lưới vô hình)
        const ghostPivot = BABYLON.MeshBuilder.CreateBox("ghostRoot_" + i, { size: 0.1 }, scene);
        ghostPivot.isVisible = false;

        // Low-Poly Mesh (chế độ hiệu năng cao)
        // MeshBuilder.CreateCylinder: Hàm tạo mesh hình trụ tròn
        const lowPoly = BABYLON.MeshBuilder.CreateCylinder("ghostLowPoly_" + i, { height: 1.0, diameter: 0.7 }, scene);
        lowPoly.parent = ghostPivot;
        lowPoly.material = mat;

        // Vị trí Spawn ban đầu
        let spawn = exactCorners[i];
        ghostPivot.position.x = spawn.c;
        ghostPivot.position.z = -spawn.r;
        ghostPivot.position.y = 0.5;

        // Cột ghim Minimap Marker (Hình trụ to, render riêng cho camera Minimap nhìn thấy)
        const mmMarkerMat = new BABYLON.StandardMaterial("mmMarkerMat" + i, scene);
        mmMarkerMat.diffuseColor = color;
        mmMarkerMat.emissiveColor = color.scale(0.8);

        const mmMarker = BABYLON.MeshBuilder.CreateCylinder("mmMarker_" + i, { height: 0.1, diameter: 1.2 }, scene);
        mmMarker.material = mmMarkerMat;
        mmMarker.position.y = 10; // Nằm tít trên không để camera chính không nhìn thấy được
        // Bật hiển thị viền trắng cho khối marker để nhìn rõ hơn trên bản đồ đen
        mmMarker.enableEdgesRendering();

        ghosts.push({
            mesh: ghostPivot,
            procMesh: lowPoly,
            mmMarker: mmMarker, // Tham chiếu marker để đồng bộ tọa độ
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

    // Tải nhóm lứới thiết kế chi tiết cao (High-Poly) nằm trong các tệp RỜI GIẠC
    const ghostFiles = [
        "pac-man_ghost_blinky.glb",
        "pac-man_ghost_pinky.glb",
        "pac-man_ghost_inky.glb",
        "pac-man_ghost_clyde.glb"
    ];

    ghostFiles.forEach((fileName, i) => {
        // SceneLoader.ImportMesh: Tải model 3D bên ngoài (file .glb, .obj) vào scene một cách bất đồng bộ
        BABYLON.SceneLoader.ImportMesh("", "./", fileName, scene, (meshes) => {
            const g = ghosts[i];
            const activeSeg = document.querySelector(".segment.active");
            const scaleVal = activeSeg ? parseFloat(activeSeg.dataset.val) : 1.0;
            isHP = scaleVal >= 1.0;

            // Reset hệ số thu phóng ban đầu để tránh mesh bị móp méo lúc xoay
            g.mesh.scaling.setAll(1.0);
            g.procMesh.scaling.set(0.7, 0.9, 0.7); // Thay vào đó sẽ thu phóng chiều cao / vòng trụ hiển thị
            g.procMesh.isVisible = !isHP;

            // Tạo 1 node gom chung tất cả các mảnh của mô hình bị tách rời
            // TransformNode: Nút vô hình dùng để gom nhóm các mesh lại với nhau. Khi dịch chuyển/xoay node này, các mesh con cũng phụ thuộc theo
            const container = new BABYLON.TransformNode("ghost_container_" + i, scene);
            container.parent = g.mesh;
            container.rotation.set(-Math.PI / 2, Math.PI, 0); // Dựng cho đứng lên + hướng về phía trước đúng chuẩn
            container.scaling.setAll(0.027);

            const ghostMeshes = [];
            meshes.forEach(m => {
                if (!(m instanceof BABYLON.Mesh)) return;
                m.rotationQuaternion = null;
                m.parent = container; // Gắn mô hình vào khối hộp chứa, để giữ cấu trúc lắp ráp cũ
                ghostMeshes.push(m);

                if (!g.hpg) g.hpg = m;
                if (!g.hpgMaterials) g.hpgMaterials = [];
                g.hpgMaterials.push({ mesh: m, mat: m.material });
                m.isVisible = isHP;
                // TUYỆT ĐỐI KHÔNG GHI ĐÈ màu vật liệu - giữ nguyên bản kết cấu thiết kế (textures) từ file GLB
            });

            // Căn chính giữa cho khối node bằng cách tổng hợp khung bao hộp (bounding box) chung
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
                container.position.y = -(minY - parentPos.y) - 0.5; // Kéo thả trên mặt đất
            }


        }, null, (scene, message) => {
            // Ghi nhận ngầm nếu có lỗi vào console log, tránh đưa chình ình lên màn hình báo crash
            console.error("Error loading ghost:", message);
        });
    });

    // Đồng bộ hiển thị ban đầu
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

    // Kiểm tra xem ô tọa độ này có đang nằm bên trong góc phần tư quy định của một con ma hay không
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

    // Logic thu thập vật phẩm & AI
    // onBeforeRenderObservable.add: Đăng ký một callback sẽ được gọi liên tục TRƯỚC mỗi khung hình (dùng như vòng lặp Game Loop của scene)
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

        // Ăn các chấm hạt - được tối ưu hóa ở mức O(1)
        const pKey = `${playerC}_${-playerR}`;
        const p = pelletLookup.get(pKey);

        if (p && p.active) {
            const distSq = (px - p.x) * (px - p.x) + (pz - p.z) * (pz - p.z);
            if (distSq < 0.3) { // Tăng nhẹ cự ly ăn để cảm giác chơi mượt mà hơn
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
                                // Áp dụng cho toàn bộ các phần con của model 3D
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

        // Logic AI cho Ma
        ghosts.forEach(ghost => {
            if (ghost.state === "dead") {
                // Logic hồi sinh sau 5 giây
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
                    // Đặt lại các vật liệu (materials) và khả năng hiển thị ban đầu
                    ghost.mesh.setEnabled(true);
                    if (ghost.procMesh) {
                        ghost.procMesh.material = ghost.baseMaterial;
                        ghost.procMesh.isVisible = !isHP;
                    }
                    if (ghost.hpg) {
                        // Phục hồi lại vật liệu nguyên bản cho tất cả các phần của model
                        ghost.mesh.getChildMeshes().forEach(m => {
                            if (m.name.includes("LowPoly")) {
                                m.isVisible = !isHP;
                                m.material = ghost.baseMaterial;
                            } else {
                                m.isVisible = isHP;
                                // Tìm lại đúng material ban đầu từ danh sách đã lưu trữ
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
            // Nhượng bộ không chết trong 2 giây đầu lúc mới vào game để tránh game over tức tức thì
            if (distToPlayer < 0.6 && gameTimer > 2.0) {
                if (ghost.state === "chase") {
                    gameOver = true;
                    console.log("GAME OVER!");
                } else if (ghost.state === "frightened") {
                    score += 200;
                    ghost.state = "dead";
                    ghost.deathTimer = 5.0; // Đợi 5 giây để hồi sinh
                    // Ẩn tất cả mọi thứ
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
                // Chỉ bắt đầu rượt đuổi người chơi khi cả hai đang ở trong phần tư bản đồ của con ma đó và ma không bị dọa sợ
                if (ghost.state === "chase" && playerInQuadrant) {
                    nextStep = bfsMove(ghost.r, ghost.c, playerR, playerC);
                } else {
                    // Đi vẩn vơ đi dạo trong phần tư được giao của nó
                    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                    const validDirs = dirs.filter(([dr, dc]) => isWalkableInQuadrant(ghost.r + dr, ghost.c + dc, q));

                    if (validDirs.length > 0) {
                        const randomDir = validDirs[Math.floor(Math.random() * validDirs.length)];
                        nextStep = { r: ghost.r + randomDir[0], c: ghost.c + randomDir[1] };
                    } else {
                        // Dự phòng: Có thể đi bất cứ đâu phòng trường hợp không rõ lý do tự dưng bị kẹt
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
                    // Xoay ma hướng mặt về phía đang di chuyển tới
                    const angle = Math.atan2(mx, mz);
                    ghost.mesh.rotation.y = angle + Math.PI;

                    ghost.mesh.position.x += (mx / mDist) * step;
                    ghost.mesh.position.z += (mz / mDist) * step;
                }

                // Cập nhật tọa độ Marker của Minimap
                if (ghost.mmMarker) {
                    ghost.mmMarker.position.x = ghost.mesh.position.x;
                    ghost.mmMarker.position.z = ghost.mesh.position.z;
                    // Chỉ hiển thị Marker trên bản đồ khi con ma đang không trong trạng thái "chết"
                    ghost.mmMarker.isVisible = (ghost.state !== "dead");
                }
            }
        });
    });

    // Đặt tọa độ của người chơi và góc nhìn ngang camera ban đầu
    camera.position.x = playerStartX;
    camera.position.z = playerStartZ;
    camera.position.y = 0.45;
    camera.setTarget(new BABYLON.Vector3(playerStartX, 0.45, playerStartX - 1));
    // Khởi tạo các biến lưới di chuyển
    gridR = -playerStartZ;
    gridC = playerStartX;
    targetGridR = gridR;
    targetGridC = gridC;

    // Sàn nhà (Floor)
    const floor = BABYLON.MeshBuilder.CreateGround("floor", { width: 100, height: 100 }, scene);
    floor.position.y = 0;
    floor.checkCollisions = false; // Không cần va chạm, vì chiều Y (cao) đã bị khóa cứng thông qua code
    floor.isVisible = false;

    // --- Giai đoạn 5: Giao diện (GUI) & Bản đồ nhỏ (Minimap) ---
    // FreeCamera: Camera tự di chuyển, dùng làm minimap trong trường hợp này
    const mmCamera = new BABYLON.FreeCamera("minimap", new BABYLON.Vector3(0, 20, 0), scene);
    // setTarget: Hướng camera nhìn chằm chằm vào 1 tọa độ chỉ định
    mmCamera.setTarget(BABYLON.Vector3.Zero());
    // Chuyển sang chế độ ORTHOGRAPHIC (chiếu trực giao, các vật thể không bị nhỏ lại khi ở xa, giống game 2D)
    mmCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
    const orthographicSize = 10;
    mmCamera.orthoLeft = -orthographicSize;
    mmCamera.orthoRight = orthographicSize;
    mmCamera.orthoTop = orthographicSize;
    mmCamera.orthoBottom = -orthographicSize;
    mmCamera.viewport = new BABYLON.Viewport(0.75, 0.75, 0.25, 0.25);
    // Ẩn minimap khỏi scene theo mặc định cho đến khi người dùng bật lên
    // Babylon có khả năng quản lý và vẽ bằng nhiều camera hoạt động cùng lúc
    scene.activeCameras.push(camera);
    scene.activeCameras.push(mmCamera);

    // Có cần cho ma và map hiển thị lên minimap không? Có thể dùng LayerMask, nhưng dùng cách chuẩn này cũng ổn rồi

    // Marker định vị người chơi trên Minimap (Tròn nhỏ màu đen)
    const playerMarkerMat = new BABYLON.StandardMaterial("playerMarkerMat", scene);
    playerMarkerMat.diffuseColor = new BABYLON.Color3(0, 0, 0); // Đen
    playerMarkerMat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);

    const playerMarker = BABYLON.MeshBuilder.CreateCylinder("playerMarker", { height: 0.1, diameter: 0.8 }, scene);
    playerMarker.material = playerMarkerMat;
    // Bật lên viền trắng cho hình trụ đen để không bị lẫn chìm vào phông nền màu đen của bản đồ game
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

    // --- Giao diện Kết Thúc Trò Chơi (HTML END-GAME UI) ---
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

        // Reset các dấu chấm điểm
        activePellets.forEach(p => {
            p.active = true;
            const mat = BABYLON.Matrix.Translation(p.x, 0.3, p.z);
            if (p.type === 2) baseNormalPellet.thinInstanceSetMatrixAt(p.matrixIndex, mat, true);
            else if (p.type === 3) basePowerPellet.thinInstanceSetMatrixAt(p.matrixIndex, mat, true);
        });
        // Bắt buộc: Cần thông báo cho Babylon ngầm hiểu rằng dữ liệu ma trận (thin instance) của các hạt đã vừa thay đổi
        if (baseNormalPellet) baseNormalPellet.thinInstanceBufferUpdated("matrix");
        if (basePowerPellet) basePowerPellet.thinInstanceBufferUpdated("matrix");

        // Reset trạng thái các con ma
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

            // Khôi phục lại kết cấu (materials) và hiển thị lưới mặc định ban đầu
            g.mesh.getChildMeshes().forEach(m => {
                m.isVisible = m.name.includes("LowPoly") ? !isHP : isHP;
                if (m.name.includes("LowPoly")) {
                    m.material = g.baseMaterial;
                } else if (g.hpgMaterials) {
                    const entry = g.hpgMaterials.find(item => item.mesh === m);
                    if (entry) m.material = entry.mat;
                }
            });

            // Đặt lại tọa độ Minimap Marker
            if (g.mmMarker) {
                g.mmMarker.position.x = g.startX;
                g.mmMarker.position.z = -g.startR;
                g.mmMarker.isVisible = true;
            }
        });

        // Reset vị trí Người Chơi
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

    // --- Logic cho Menu ---
    const menuOverlay = document.getElementById("menuOverlay");
    const settingsPanel = document.getElementById("settingsPanel");
    const startBtn = document.getElementById("startBtn");
    const settingsBtn = document.getElementById("settingsBtn");
    const backToMenuBtn = document.getElementById("backToMenuBtn");

    // Logic Tab (Chuyển đổi thẻ)
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

    // Áp dụng Cài đặt & Cập nhật Hiển thị
    const updateVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    document.getElementById("sensitivityRange").addEventListener("input", (e) => {
        const percent = parseInt(e.target.value);
        // Mối quan hệ nghịch đảo: mặc định là 3000 ở mức 100%
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
            camera.position.y = 0.45; // Đặt lại lập tức (hết rung lắc) khi bị tắt đi
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

        // Đảm bảo tất cả các vật liệu neon đều đóng góp vào hiệu ứng sáng
        scene.materials.forEach(mat => {
            if (mat.name.toLowerCase().includes("neon") || mat.name.toLowerCase().includes("glow")) {
                mat.emissiveColor = mat.diffuseColor || new BABYLON.Color3(1, 1, 1);
            }
        });
    });

    document.getElementById("minimapToggle").addEventListener("change", (e) => {
        const isVisible = e.target.checked;
        scene.activeCameras[1].viewport.height = isVisible ? 0.25 : 0;
        scene.activeCameras[1].viewport.width = isVisible ? 0.25 : 0;
    });

    window.scene = scene; // Để có thể mở console debug kiểm tra đối tượng scene

    document.querySelectorAll(".segment").forEach(seg => {
        seg.addEventListener("click", () => {
            document.querySelectorAll(".segment").forEach(s => s.classList.remove("active"));
            seg.classList.add("active");
            const scale = parseFloat(seg.dataset.val);
            engine.setHardwareScalingLevel(1 / scale);
            isHP = scale >= 1.0; // Update global isHP

            // Đánh tráo (Swap) các mesh của con ma dựa theo tỷ lệ (scale) yêu cầu phân giải ngang màn hình
            const isHighPoly = isHP;
            ghosts.forEach(g => {
                // DỰ PHÒNG: Chỉ ẩn con ma khối lởm (procedural mesh) NẾU phiên bản phân giải cao chạy ngon lành (tức tải thành công file)
                if (g.hpg) {
                    g.procMesh.isVisible = !isHighPoly;
                    g.hpg.isVisible = isHighPoly;
                    g.hpg.getChildMeshes().forEach(c => c.isVisible = isHighPoly);
                } else {
                    // Giả sử tải GLB xịt thì cứ phải show ma khối lởm default ra
                    g.procMesh.isVisible = true;
                }
            });
        });
    });

    document.getElementById("ghostSpeed").addEventListener("input", (e) => {
        const val = parseInt(e.target.value);
        ghostSpeedMultiplier = val / 100;
        updateVal("ghostSpeedVal", (val / 100).toFixed(1) + "x");

        // Áp dụng ngay hệ số tốc độ này cho toàn bộ các con ma
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

    // Cập nhật ngầm để đồng hồ đếm FPS & Ping sau mỗi 500ms
    setInterval(() => {
        if (gameStarted && !gameOver) {
            fpsDisplay.innerText = "FPS: " + engine.getFps().toFixed(0);
            // Mô phỏng chỉ số báo ping cục bộ ảo để buff độ ngầu cho người chơi màn hình FPS
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
        // Hiệu ứng nhấp nhô nhẹ của đầu khi đang di chuyển
        const bobOffset = (isPlayerMoving && headBobEnabled) ? Math.sin(bobTime) * 0.025 : 0;
        camera.position.y = 0.45 + bobOffset;

        // Cập nhật vị trí hiển thị Minimap
        mmCamera.position.x = camera.position.x;
        mmCamera.position.z = camera.position.z;

        // Cập nhật tọa độ Marker của cục kim định hướng người chơi
        playerMarker.position.x = camera.position.x;
        playerMarker.position.z = camera.position.z;
        playerMarker.position.y = 10; // Đặt cực cao cho thoát khỏi vị trí y=0.5 của camera chính, chỉ để camera của minimap chiếu y=20 rọi xuống thấy thôi

        // Nạp điểm số (Score) lên bộ GUI text 2D hiển thị góc màn hình 
        scoreText.text = "SCORE: " + score;

        if (gameOver) {
            showEndScreen(false);
        } else {
            // Kiểm tra phân thắng bại (nếu nuốt sạch các viên nấm thì ăn 10 điểm Win)
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

// runRenderLoop: Vòng lặp quan trọng nhất, yêu cầu Engine liên tục gọi hàm render() của Scene để vẽ ra màn hình
engine.runRenderLoop(function () {
    scene.render();
});

window.addEventListener("resize", function () {
    // engine.resize(): Tự động co giãn nội dung 3D cho khớp với tỷ lệ mới của trình duyệt nếu cửa sổ thay đổi kích cỡ
    engine.resize();
});
