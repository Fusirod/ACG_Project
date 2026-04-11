# Phân tích kỹ thuật & Kế hoạch triển khai: Retro First-Person Pacman

## 1. Tổng quan & Phong cách Đồ họa (Art Direction)
* **Engine:** Babylon.js (WebGL).
* **Góc nhìn:** FPS (First-Person Shooter) - Góc nhìn thứ nhất kết hợp Mini-map.
* **Phong cách (Style):** Retro Arcade / Synthwave.
* **Màu sắc chủ đạo:** * Nền/Trời: Đen tuyền (#000000).
    * Tường (Maze): Viền xanh dương neon phát sáng (Emissive Blue).
    * Hạt (Pellets): Trắng hoặc vàng nhạt, có vầng sáng nhẹ.
    * Ma (Ghosts): Đỏ (Blinky), Hồng (Pinky), Xanh lơ (Inky), Cam (Clyde).
* **Hiệu ứng Post-Processing (Tùy chọn):** Glow Layer (để làm hiệu ứng neon) và Chromatic Aberration/CRT effect nhẹ để tạo cảm giác màn hình thùng máy điện tử cũ.

## 2. Kiến trúc & Thành phần cốt lõi (Core Components)

### 2.1. Cấu trúc Mê cung (Map Generation)
* Sử dụng một mảng 2D (2D Array) chứa các số nguyên để thiết kế bản đồ.
    * `0`: Đường đi trống.
    * `1`: Tường.
    * `2`: Hạt nhỏ (Normal Pellet).
    * `3`: Hạt to (Power Pellet).
* **Render:** Lặp qua mảng 2D, tại các vị trí `1`, sinh ra các `BABYLON.MeshBuilder.CreateBox`. Áp dụng Material có màu đen ở mặt chính và lưới viền màu xanh neon.

### 2.2. Camera chính & Điều khiển (Player)
* Sử dụng `BABYLON.UniversalCamera` (Main Camera).
* Khóa chuột vào màn hình (`canvas.requestPointerLock()`) khi người chơi click vào game.
* Điều khiển bằng cụm phím `WASD` và xoay góc nhìn bằng chuột.
* Gắn một `Mesh` hình cầu tàng hình vào Camera để xử lý va chạm (Collision) với tường. Kích hoạt `camera.checkCollisions = true`.

### 2.3. Hệ thống Mini-map (Radar)
* Sử dụng một `BABYLON.FreeCamera` thứ hai (Minimap Camera) đặt ở vị trí cao trên trục Y, nhìn thẳng xuống dưới (Top-down view).
* Thiết lập `mode` của camera này thành `BABYLON.Camera.ORTHOGRAPHIC_CAMERA` để loại bỏ phối cảnh (perspective), giúp bản đồ phẳng và rõ ràng.
* Cấu hình `viewport` cho camera này (ví dụ: `new BABYLON.Viewport(0.75, 0.75, 0.25, 0.25)`) để nó chỉ render ở một góc nhỏ trên màn hình (góc trên bên phải).
* Đưa cả Main Camera và Minimap Camera vào mảng `scene.activeCameras`.

### 2.4. Tối ưu hóa hiệu năng (Optimization)
* **Bắt buộc:** Phải sử dụng **`Thin Instances`** của Babylon.js cho Normal Pellets và Power Pellets để gộp chung vào 1 draw call.
* Đèn chiếu sáng (Lighting): Giới hạn số lượng Point Light. Dùng vật liệu tự phát sáng (Emissive Material) kết hợp HemisphericLight ánh sáng yếu.
* **Tối ưu Mini-map:** Dùng tính năng `layerMask` của Babylon.js. Chỉ định Minimap Camera chỉ nhìn thấy Tường, Ma và vị trí Người chơi (hiển thị bằng 1 chấm mesh đơn giản), ẩn đi các chi tiết phức tạp hoặc hạt nhỏ để tiết kiệm tài nguyên.

### 2.5. Trí tuệ nhân tạo (Ghost AI)
* Ghosts di chuyển dựa trên hệ thống Grid 2D của bản đồ.
* Sử dụng thuật toán **A* (A-Star)** hoặc **BFS (Breadth-First Search)** trên mảng 2D để tìm đường.
* **State Machine của Ma:**
    * `Chase`: Tìm đường tới vị trí hiện tại của Camera.
    * `Scatter`: Tản ra các góc của bản đồ.
    * `Frightened` (Khi Pacman ăn Power Pellet): Ma chuyển sang màu xanh dương sẫm, di chuyển ngẫu nhiên, chậm lại.

### 2.6. Giao diện (HUD)
* Dùng `BABYLON.GUI.AdvancedDynamicTexture`.
* Hiển thị Điểm số (Score), Kỷ lục (High Score).
* Font chữ: Font pixel retro (ví dụ: "Press Start 2P").

---

## 3. Các giai đoạn triển khai (Phased Implementation)

### Phase 1: Môi trường cơ bản (Cơ sở hạ tầng)
- [ ] Khởi tạo dự án HTML/JS/CSS cơ bản.
- [ ] Import Babylon.js. Khởi tạo Engine, Scene và Canvas.
- [ ] Cài đặt `UniversalCamera` (Main Camera), cấu hình Pointer Lock và di chuyển WASD.
- [ ] Thêm HemisphericLight ánh sáng yếu.

### Phase 2: Xây dựng Mê cung (The Maze)
- [ ] Khai báo mảng 2D (Map Grid).
- [ ] Viết hàm parse mảng 2D và tạo các khối Box 3D (Tường).
- [ ] Cài đặt Collision (Va chạm) giữa Camera và Tường.
- [ ] Thêm vật liệu lưới neon và Glow Layer.

### Phase 3: Hệ thống Hạt & Thu thập
- [ ] Duyệt map 2D, sinh ra tọa độ cho hạt (Pellets).
- [ ] Áp dụng `Thin Instances` để render toàn bộ hạt.
- [ ] Viết logic Distance check để "Ăn" hạt.
- [ ] Tích hợp hệ thống tính điểm cơ bản (Console log).

### Phase 4: Ma (Ghosts) & AI
- [ ] Tạo Mesh đơn giản cho Ma.
- [ ] Implement thuật toán BFS/A* trên lưới 2D cho Ma tự tìm đường.
- [ ] Đồng bộ hóa di chuyển giữa lưới 2D và không gian 3D.
- [ ] Xử lý va chạm giữa Ma và Camera (Game Over).

### Phase 5: Giao diện (GUI) & Mini-map
- [ ] Khởi tạo Minimap Camera (Orthographic, Top-down).
- [ ] Cấu hình Viewport để đặt Mini-map lên góc phải màn hình. Cập nhật `scene.activeCameras`.
- [ ] Cập nhật logic: Vị trí của Minimap Camera luôn đi theo tọa độ X, Z của người chơi (hoặc fix cứng ở giữa map nếu map nhỏ).
- [ ] Import Babylon GUI, tạo giao diện Score và thông báo Game Over bằng font Pixel.
- [ ] Thêm hạt siêu năng lượng (Power Pellet) và trạng thái "Frightened".
- [ ] Thêm âm thanh (`BABYLON.Sound`) và logic thắng game.