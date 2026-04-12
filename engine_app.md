# Tổng hợp và Chuyên sâu Kỹ thuật Babylon.js (Bản Chi Tiết Under-the-hood)

Báo cáo này giải thích tận gốc cơ chế hoạt động thực tế (dưới màng code) của tất cả các lớp, API thuộc Babylon.js được sử dụng trong dự án **Retro First-Person Pacman**, đặc biệt đi sâu vào kết nối phần cứng và cách engine tương tác.

---

## 1. Tầng Lõi Hệ Thống (Băng Thông Mức Thấp)

### `BABYLON.Engine`
- **Giao tiếp với WebGL Canvas như thế nào?** 
  Tại dòng `2`, khi truyền tag `<canvas>` vào `new BABYLON.Engine()`, hệ thống ngay lập tức gọi API trình duyệt `canvas.getContext("webgl2")` (hoặc fallback về "webgl"). `BABYLON.Engine` đóng vai trò là một State Manager lớn, dịch tất cả các ngôn ngữ cấp cao tĩnh (JS/TS) thành các lệnh nạp bộ nhớ đệm Buffer và Vertex/Fragment Shaders của thẻ đồ hoạ (GPU). Nó trực tiếp ra lệnh cho GPU khi nào cần xóa màn hình, khi nào vẽ đa giác (triangles).
- **Quản lý con trỏ chuột (Pointer Lock API):** 
  Tại dòng `488` (`engine.enterPointerlock()`), Babylon gọi thẳng Web API cấp trình duyệt là `document.body.requestPointerLock()`. 
  - **Cơ chế:** Chuột vật lý bị trình duyệt "nuốt" và cố định tĩnh tại giữa màn hình. Thay vì sinh ra toạ độ tuyết đối (x,y), hệ điều hành sẽ chỉ nhả ra toạ độ vi phân tương đối dạng gia tốc (`movementX`, `movementY`). Babylon tự động bắt các sự kiện `mousemove` thô này và quy hoạch dội ngược trở lại vào độ chuyển động quay (`rotation`) của Camera.
- **Render Loop & DeltaTime:**
  - `engine.runRenderLoop()` (Dòng `558`) sử dụng `window.requestAnimationFrame`. Nghĩa là nếu màn hình của bạn quét 60Hz, vòng lặp JS này sẽ chạy 60 lần/giây, hoặc 144 lần/giây phụ thuộc phần cứng của user để đảm bảo khung hình render ra khớp với Refresh Rate màn hình mà không bị rách hình.
  - `engine.getDeltaTime()` (Dòng `267`) đo lường độ trễ mili-giây giữa 2 lần vẽ kể trên. Do FPS không ổn định ở mỗi máy, thuật toán AI truy đuổi cần nhân tốc độ với deltaTime (vd: `speed * deltaTime / 1000`) để đảm bảo Ma luôn đi quãng đường chuẩn bất chấp máy bị lag.

### `BABYLON.Scene`
- **Biểu đồ Đồ Thị Hướng Liên Nút (Scene Graph):** 
  Mọi vật thể, đèn, camera khi được thêm từ khóa `scene` vào tham biến khởi tạo (`scene` ở tham số cuối cùng), chúng sẽ trở thành Node Con trong Scene Tree.
- **Tiến trình Render:** Mỗi lần `scene.render()` gọi sẽ kích hoạt các hàm Life-cycle (ví dụ hook `onBeforeRenderObservable.add` tại các Dòng `264`, `498`). Scene sẽ tự động tính toán "Frustum Culling" (Cắt gọt các lưới lưới/Mesh nằm ngoài vùng nhìn của cả 2 Camera) giúp cho GPU không phải đổ data tính toán vật thể khuất tầm nhìn mắt.

---

## 2. Hệ Thống Toán Học 3D Không Gian (Linear Algebra)

### `BABYLON.Vector3`, `BABYLON.Color3`, `BABYLON.Color4`
- **Vector3:** Thể hiện toán không gian 3 chiều [X, Y, Z]. Trong máy tính, Vector3 của Babylon được tối ưu hóa bằng mảng Float32Array để thân thiện với RAM. Nó quyết định vị trí Object, cũng như dùng để quy hoạch vùng đụng độ không gian (`ellipsoid` kích cỡ hit-box).
- **Color3/Color4:** Trừu tượng hóa của dải màu RGB thay vì dùng chuỗi "#FFF". Shader của Graphics pipeline trong GPU chỉ hiểu dãy số thực từ `0.0 -> 1.0` (VD: Đen tuyền 0,0,0 thay vì `rgb(0,0,0)`).

### `BABYLON.Matrix` (Ma trận dịch chuyển biến hóa)
- Bản chất việc chuyển vật thể là nhân vị trí của nó với một **Ma Trận 4x4 (Matrix 4x4)** cấp đồ hoạ. Lệnh `BABYLON.Matrix.Translation()` trực tiếp sinh ra toán hạng ma trận ép vị trí đỉnh (Vertices) trên GPU mà không cần thay đổi vị trí trung tâm trong Javascript.

---

## 3. Lý Thuyết Quay & Chiếu Của Hệ Camera (Viewport Projection)

### `BABYLON.UniversalCamera`
- Chịu trách nhiệm render không gian theo hệ phối cảnh tuyến tính (`Perspective Projection`), vật ở xa bị tụ lại 1 điểm. Camera này kế thừa 1 bộ quản lý sự kiện Input Manager, trực tiếp đọc mảng mã phím `[87, 83, 65, 68]` (Dòng `52-55` gán cho W A S D) và biến đổi chúng thành góc Roll-Pitch-Yaw kết hợp hàm va chạm đụng độ tường.

### `BABYLON.FreeCamera` (Chế độ Orthographic)
- **Thiết lập MiniMap kiểu gì?** Tại Dòng `398`, `FreeCamera` được chuyển hệ máy chiếu sang dạng trực giao (`BABYLON.Camera.ORTHOGRAPHIC_CAMERA`). GPU thay vì bóp méo hình ảnh theo hình chóp nón, giờ đây quét ngang cảnh vật theo dạng hộp chữ nhật khối. Camera ở Y=20 chiếu vuông góc xuống map tạo ra mặt phẳng 2D chuẩn mà không có đường chân trời.
- **Map Viewport (Dòng `406`):** Lưới đồ hoạ bị cắt xén phân mảng bằng `BABYLON.Viewport(0.75, 0.75, 0.25, 0.25)`. Nó nói với OpenGL shader: "Chỉ in hình ảnh của Camera Orthographic này vào một ô vuông bắt đầu từ 75% chiều dài, 75% chiều dọc kích thước của Canvas, và chiếm trọn 25% hệ số diện tích". Mọi hình ảnh lập tức nổi lên chồng mép góc phải (MiniMap).

---

## 4. Hệ Thống Lưới Hiệu Suất Cao & Ảo Hóa Hạt (Hardware Instancing)

### `BABYLON.MeshBuilder` & Tối ưu Mesh.MergeMeshes
- `MeshBuilder.CreateBox` hay `CreateSphere` chạy thuật toán lấp đầy Vertex Buffer và Index Buffer (chứa dải toạ độ 3D của các tam giác cấu tạo nên khối). 
- **Vì sao phải MergeMeshes? (Dòng `112`)** Nếu bản đồ Mê cung có 500 đoạn tường, WebGL phải gửi luồng tín hiệu (Draw Call) từ CPU lên GPU 500 lần. Việc dùng `MergeMeshes` hàn chết hàng nghìn đỉnh polygon (đối tượng) vào chung thành duy nhất 1 luồng Buffer đơn độc (1 Draw Call). CPU "phủi sạch tay", khung hình tăng vọt từ 30 FPS lên hàng ngàn FPS.

### Lãnh thổ Thin Instances (`thinInstanceAdd`)
- **Hoạt động ra sao:** Thay vì gộp cứng như `MergeMeshes`, hệ thống `Thin Instances` dùng tính năng phần cứng cấp lõi của card đồ hoạ gọi là **GPU Hardware Instancing**. 
- Dòng `165`, Babylon yêu cầu CPU chỉ nạp mô hình của 1 hạt nguyên bản LÊN VGA VRAM ĐÚNG 1 LẦN. Sau đó CPU bơm kèm thêm một mảng Array đơn giản chứa 50 tọa độ ma trận. Card đồ họa nhân bản độc lập ra 50 hạt trên màn hình mà CPU hoàn toàn không hề tốn đến nửa byte nào theo dõi logic riêng. Cực kì siêu việt! 

### Cấu trúc Ánh Sáng Vật Lý Mở
- **`StandardMaterial`:** Sử dụng thuật toán Phong Shading cơ bản. Yếu tố `diffuseColor` quyết định hạt bắt sáng ánh sáng Hemisphere Light ngả màu ra sao. `emissiveColor` khiến điểm ảnh tự thắp sáng bỏ qua điều kiện bị tối do khuất sáng.
- **`GlowLayer`:** Kích hoạt thuật toán Blur Post-process. Engine sẽ render lại lần 2 vào một màn hình ảo (Render Target Texture ảo) chỉ ghi nhận những lưới mesh nào có mang `emissiveColor` (Như các viền grid xanh). Sau đó nó tráng qua hiệu ứng Blur (Làm mờ/nhoè thuật toán Gaussian), và pha trộn Multiply/Add chèn đè (blend) lại lên màn hình hiển thị chính ra viền Neon chói lọi.

---

## 5. Cấu trúc Giao diện 2D Lớp Màng (GUI)

### `BABYLON.GUI.AdvancedDynamicTexture`
- Tại sao giao diện 2D lại gọi là Texture? Bởi vì Babylon không sinh ra các thẻ `<H1>` hay `<button>` DOM truyền thống.
- **Hoạt động (Dòng `427`):** Babylon tạo riêng 1 mặt phẳng vô hình trong suốt nằm sát mắt của camera (mặt phẳng 2D trong không gian 3D). Trên mặt phẳng nó sử dụng chuẩn API 2D Canvas thực tại trên trình duyệt máy để "vẽ lướt" các mảng pixel (Vẽ chữ, Vẽ khung chữ nhật làm Background). 
- Bằng tính năng Raycasting tích hợp, các hàm quan sát chuột như `onPointerUpObservable` tính toán xem tia raycast phóng từ vị trí chuột ảo (trên màn hình), cắt và đâm thủng vào vùng Canvas 2D Textures pixel chứa Button Replay nằm ở khoảng toạ độ nào từ đó sinh ra sự kiện tương tác bấm click mượt mà không độ trễ. 

---
*Văn bản đã phân bổ tận gốc phương thức kết nối các tầng giao tiếp đồ hoạ từ JS (CPU) cho đến C++ WebGL (VRAM/GPU Hardware).*
