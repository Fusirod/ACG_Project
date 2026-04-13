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
- Chịu trách nhiệm render không gian theo hệ phối cảnh tuyến tính (`Perspective Projection`), vật ở xa bị tụ lại 1 điểm. Camera này kế thừa 1 bộ quản lý sự kiện Input Manager, trực tiếp đọc mảng mã phím `[87, 38]` cho phím W/Lên (tự gán đè cứng thay vì push để tránh bị xung đột trôi mảng phím mặc định).
- **Cơ chế chống kẹt góc siêu mịn (Anti-stuck Collision):** Thay vì dùng hit-box `ellipsoid` hình cầu mặc định, hit-box được nén mỏng dẹp xuống `(0.2, 0.1, 0.2)` và góc cúi màn hình (Pitch `rotation.x`) bị khóa chặt biên độ `[-0.3, 0.3]`. Việc này ép hệ thống va chạm Babylon không bao giờ cộng lực vector chéo cày sâu đâm xuống mặt sàn khi ở các ngã 3, hay bắt lỗi kéo lê các mép grid ground. Quỹ đạo này tạo ra cảm giác xoay góc và trượt tường "mượt như lụa".

### `BABYLON.FreeCamera` (Chế độ Orthographic)
- **Thiết lập MiniMap kiểu gì?** Tại Dòng `398`, `FreeCamera` được chuyển hệ máy chiếu sang dạng trực giao (`BABYLON.Camera.ORTHOGRAPHIC_CAMERA`). GPU thay vì bóp méo hình ảnh theo hình chóp nón, giờ đây quét ngang cảnh vật theo dạng hộp chữ nhật khối. Camera ở Y=20 chiếu vuông góc xuống map tạo ra mặt phẳng 2D chuẩn mà không có đường chân trời.
- **Map Viewport (Dòng `406`):** Lưới đồ hoạ bị cắt xén phân mảng bằng `BABYLON.Viewport(0.75, 0.75, 0.25, 0.25)`. Nó nói với OpenGL shader: "Chỉ in hình ảnh của Camera Orthographic này vào một ô vuông bắt đầu từ 75% chiều dài, 75% chiều dọc kích thước của Canvas, và chiếm trọn 25% hệ số diện tích". Mọi hình ảnh lập tức nổi lên chồng mép góc phải (MiniMap).

---

## 4. Hệ Thống Lưới Hiệu Suất Cao & Ảo Hóa Hạt (Hardware Instancing)

### Thuật toán Greedy Meshing & Tối ưu Mesh.MergeMeshes
- **Khử mép nứt nội bộ tường (Greedy Meshing):** Bằng thuật toán quét dọc trên Map Array 2D, các ô map mang biểu chuẩn `1` liền kề không bị vẽ lẻ mà bị dính liền tự động tạo ra một khối khối hộp khổng lồ bao luôn cả đoạn ngang/dọc dài (`width = N, depth = M`). Cơ chế này quét sạch sành sanh "vết rạn nứt ranh giới gập khúc nội tại" – chính là sát thủ tiềm ẩn bắt thóp đụng độ `moveWithCollisions` gây khựng/kẹt chân.
- **Vì sao vẫn phải MergeMeshes?** Mặc dù số khối hộp giảm kỷ lục, nếu hệ thống có K khối tường khổng lồ, WebGL vẫn phải cấp lệnh đẩy Draw Call K lần. Việc sử dụng `MergeMeshes` nhào nặn hàn chặt K lưới đỉnh polygon này thành 1 khối hình học đồ sộ duy nhất đã cắt đôi đường truyền CPU, ép Draw Call xuống con số 1 duy nhất. Máy nhẹ bẫng, FPS không bao giờ thụt giảm.

### Lãnh thổ Thin Instances (`thinInstanceAdd`)
- **Hoạt động ra sao:** Thay vì gộp cứng như `MergeMeshes`, hệ thống `Thin Instances` dùng tính năng phần cứng cấp lõi của card đồ hoạ gọi là **GPU Hardware Instancing**. 
- Dòng `165`, Babylon yêu cầu CPU chỉ nạp mô hình của 1 hạt nguyên bản LÊN VGA VRAM ĐÚNG 1 LẦN. Sau đó CPU bơm kèm thêm một mảng Array đơn giản chứa 50 tọa độ ma trận. Card đồ họa nhân bản độc lập ra 50 hạt trên màn hình mà CPU hoàn toàn không hề tốn đến nửa byte nào theo dõi logic riêng. Cực kì siêu việt! 

### Cấu trúc Ánh Sáng Vật Lý Mở
- **`StandardMaterial`:** Sử dụng thuật toán Phong Shading cơ bản. Yếu tố `diffuseColor` quyết định hạt bắt sáng ánh sáng Hemisphere Light ngả màu ra sao. `emissiveColor` khiến điểm ảnh tự thắp sáng bỏ qua điều kiện bị tối do khuất sáng.
- **`GlowLayer`:** Kích hoạt thuật toán Blur Post-process. Engine sẽ render lại lần 2 vào một màn hình ảo (Render Target Texture ảo) chỉ ghi nhận những lưới mesh nào có mang `emissiveColor` (Như các viền grid xanh). Sau đó nó tráng qua hiệu ứng Blur (Làm mờ/nhoè thuật toán Gaussian), và pha trộn Multiply/Add chèn đè (blend) lại lên màn hình hiển thị chính ra viền Neon chói lọi.

---

## 5. Hệ thống Giao diện Lớp Màng (GUI) và Popup Phân Quyền Trình Duyệt

### `BABYLON.GUI.AdvancedDynamicTexture`
- Tại sao giao diện 2D lại gọi là Texture? Bởi vì Babylon không sinh ra thẻ DOM HTML. Babylon cấp sẵn một mặt phẳng vô hình mỏng, sử dụng chuẩn API 2D Canvas của trình duyệt để "trang trí" nội dung chữ (`Text`) như tỷ số, và tiêu đề chào cờ ngay phía trước mắt kính 3D. 

### Tính tương tác kết thúc qua System Dialogs (`window.confirm`)
- Sau bước cải tổ mượt, cấu trúc MessageBox tại thời khắc End Game được trỏ cờ tín hiệu lùi giao thức về lớp điều hành System/Windows Browser gọi là **Native Web Dialogs**. 
- Khi `gameOver` kích hoạt báo hiệu ma cắn hoặc vét sạch máng, Thread đồ họa bị cắt và treo dứt điểm (`engine.stopRenderLoop()`). Hàm vi song `setTimeout` lùi phát hành lệnh `window.confirm()` lên bề mặt trình duyệt để ngưng phong tỏa toàn màn hình, biến thành khung cửa sổ nhỏ độc lập mang đầy đủ sức nặng "Nhấn OK để Chơi Lại, Khuyên Cancel để Thoát".
- **Tại sao phải dùng URL tĩnh about:blank khi Thoát?** Tính năng Sandbox Browser quy định JS Scripts bị cấm gọi lệnh `window.close()` khi tab tự mở vì rủi ro thao túng phá duyệt máy tính từ Web Đen. Giải pháp dự phòng tuyệt đỉnh của game là chuyển hướng trang trỏ về `window.location.href="about:blank"`, diệt sạch giao diện Game 3D khỏi bộ nhớ RAM, chôn vùi rác WebGL mang lại tác dụng tắt thẻ tab thanh thản không vi phạm Sandbox browser. 

---
*Văn bản đã phân bổ tận gốc phương thức kết nối các tầng giao tiếp đồ hoạ từ JS (CPU) cho đến C++ WebGL (VRAM/GPU Hardware).*
