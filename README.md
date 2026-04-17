# Retro First-Person Pacman 3D

## 1. Giới thiệu tổng quan trò chơi
**Pacman 3D** là một phiên bản làm lại của trò chơi arcade kinh điển Pacman dưới góc nhìn thứ nhất (First-person perspective). Người chơi sẽ nhập vai Pacman, di chuyển bên trong một mê cung 3D tăm tối với các hiệu ứng đèn neon (glow), thu thập các hạt điểm (pellets) và hạt năng lượng (power pellets), đồng thời né tránh sự truy đuổi của 4 con ma (Blinky, Pinky, Inky, Clyde). 

Trò chơi kết hợp thành công cơ chế logic lưới (grid-based logic) truyền thống của Pacman với môi trường 3D tạo bởi Babylon.js, mang lại cảm giác vừa hoài cổ vừa hiện đại.

### Các tính năng chính:
- **Góc nhìn thứ nhất (FPS)**: Camera được đặt ngang tầm mắt nhân vật, điều khiển quay bằng chuột và di chuyển theo các hướng lên/xuống/trái/phải trong lưới bằng phím WASD.
- **AI Ma Thông Minh**: Mỗi con ma được chỉ định quản lý một góc phần tư (quadrant) của bản đồ. Chúng sẽ chỉ truy đuổi khi người chơi bước vào khu vực của chúng. Thuật toán tìm đường BFS được sử dụng để dẫn đường cho ma về phía người chơi.
- **Minimap (Bản đồ thu nhỏ)**: Được triển khai thông qua một góc nhìn camera phụ từ trên xuống (orthographic), giúp người chơi định vị trong không gian hạn chế tầm nhìn.
- **Hiệu năng và Đồ họa linh hoạt**: Trò chơi tối ưu hóa việc vẽ điểm bằng `Thin Instances` và quản lý cấu hình ma: hỗ trợ dạng khối Low-Poly hoặc mô hình 3D High-Poly (định dạng `.glb`) tải động tùy vào lựa chọn cấu hình máy của người chơi.
- **Cấu hình trực tiếp (Settings)**: Có thể tùy chỉnh độ nhạy chuột, vệt chớp màn hình (FOV), độ sáng hạt (Glow Intensity), âm lượng, và độ khó (tốc độ ma, thời gian kích hoạt năng lượng).

---

## 2. Việc áp dụng Babylon.js trong dự án (Chi tiết từng hàm)
Dự án sử dụng Engine 3D **Babylon.js** để xử lý toàn bộ đồ họa, camera, và ánh sáng. Dưới đây là phân tích chi tiết từng hàm, class và phương thức của Babylon.js đã được sử dụng (dựa vào file `main.js`).

### A. Khởi tạo Engine và Scene
- **`new BABYLON.Engine(canvas, true)`** *(Dòng 2)*: Khởi tạo lõi đồ họa 3D gắn trực tiếp vào phần tử `<canvas>` của HTML. Tham số `true` bật khử răng cưa (antialias).
- **`new BABYLON.Scene(engine)`** *(Dòng 31)*: Môi trường chứa tất cả các đối tượng 3D (mesh, light, camera).
- **`scene.clearColor = new BABYLON.Color4(...)`** *(Dòng 32)*: Đặt màu nền của bối cảnh (chọn màu đen).
- **`engine.runRenderLoop(...)`** *(Dòng 1045)*: Khởi động vòng lặp render, liên tục vẽ lại `scene` theo từng khung hình.
- **`engine.resize()`** *(Dòng 1050)*: Hàm gọi mỗi khi kích thước cửa sổ trình duyệt thay đổi, giúp canvas không bị méo.
- **`engine.setHardwareScalingLevel(1 / scale)`** *(Dòng 878)*: Giảm/tăng độ phân giải kết xuất thực tế để tối ưu hóa hiệu năng (Graphics Quality) mà không thay đổi kích thước canvas HTML.

### B. Ánh sáng và Hiệu ứng
- **`new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene)`** *(Dòng 35)*: Tạo ánh sáng môi trường chiếu từ trên xuống để toàn bộ các vật thể có một độ sáng cơ bản (không bị đen hoàn toàn).
- **`new BABYLON.GlowLayer("glow", scene)`** *(Dòng 58)*: Tạo hiệu ứng tỏa sáng (phát quang/neon) cho mọi vật liệu (material) có thiết lập đặc tính `emissiveColor`. Rất quan trọng để làm nổi bật tường mê cung và các hạt ăn được trong môi trường tối.

### C. Giao diện (Babylon GUI)
- **`BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI")`** *(Dòng 40)*: Tạo một layer UI 2D vẽ chồng lên không gian 3D.
- **`new BABYLON.GUI.TextBlock()`** *(Dòng 41, 643)*: Tạo các nhãn văn bản 2D dùng để hiển thị điểm số (SCORE) và thông báo Debug khi tải GLB hiển thị lên màn hình.

### D. Hệ thống Camera
- **`new BABYLON.UniversalCamera("MainCamera", ...)`** *(Dòng 62)*: Camera chính thiết lập ở góc nhìn FPS (ngóc nhìn của Pacman).
  - **`camera.attachControl(canvas, true)`** *(Dòng 63)*: Gắn sự kiện chuột vào camera để người dùng có thể quay xung quanh.
  - **`camera.getDirection(...)`** *(Dòng 948)*: Lấy hướng camera đang nhìn để quy chiếu (toGrid) logic điều hướng lưới WASD (không dùng vật lý nội tại).
- **`new BABYLON.FreeCamera("minimap", ...)`** *(Dòng 618)*: Camera thụ động nhìn từ trên cao xuống mê cung.
  - **`mmCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA`** *(Dòng 620)*: Chuyển camera này sang phép chiếu trực giao (không có phối cảnh xa gần), phù hợp cho việc làm Minimap không gian 2D.
  - **`mmCamera.viewport = new BABYLON.Viewport(0.75, 0.75, 0.25, 0.25)`** *(Dòng 626)*: Khung nhìn (viewport) được giới hạn ở góc trên cùng bên phải màn hình.

### E. Vật Liệu (Materials)
- **`new BABYLON.StandardMaterial(...)`** *(Dòng 79, 129, 136, 241, v.v...)*: Tạo vật liệu cơ bản phản hồi với sức sáng. Nó được dùng cho mọi Mesh.
  - **`mat.diffuseColor`**: Màu khuếch tán nền (khi có ánh sáng).
  - **`mat.emissiveColor`**: Màu tự phát sáng (cho bộ phát quang GlowLayer).

### F. Khởi tạo Hình Học 3D (Meshes & MeshBuilder)
- **`BABYLON.MeshBuilder.CreateBox(...)`** *(Dòng 106, 246)*: Hàm dựng sẵn để tạo khối lập phương. Dùng cấu trúc lưới ma trận (mảng 2D `mapLayout`) để xây dựng nên bức tường khối lập phương, vị trí bằng `.position`.
- **`BABYLON.Mesh.MergeMeshes(wallsToMerge, ...)`** *(Dòng 123)*: Rất quan trọng cho tối ưu hóa (Performance). Nó kết hợp tất cả các hình lập phương nhỏ của bức tường thành 1 mạng lưới (mesh) duy nhất để chỉ tốn 1 lần Draw Call cho việc vẽ tường.
- **`BABYLON.MeshBuilder.CreateSphere(...)`** *(Dòng 133, 140)*: Tạo hình cầu để làm mô hình hạt ăn bình thường và hạt năng lượng.
- **`BABYLON.MeshBuilder.CreateCylinder(...)`** *(Dòng 250, 265, 639)*: Tạo khối trụ tròn rỗng. Dùng để cấu tạo thể Low-poly cho Ma, nhãn đánh dấu Ma và vệt đánh dấu Player trên Minimap.
- **`mesh.enableEdgesRendering()`** *(Dòng 269, 642)*: Hiển thị đường viền lưới cho đối tượng. Giúp dấu ngắm Minimap (màu đen) có viền trắng không bị lẫn vào nền tối.
- **`new BABYLON.TransformNode(...)`** *(Dòng 311)*: Tạo một node vô hình đóng vai trò làm điểm gốc (Pivot) chứa (group) những mô hình GLB tải về, nhằm đồng nhất tâm quay trục chuẩn.

### G. Tối ưu Hệ thống Render Hàng Loạt (Thin Instances)
Trong trò chơi có hàng trăm hạt Pellet. Việc vẽ hàng trăm lưới Mesh hình cầu sẽ làm CPU/GPU sập.
- **`BABYLON.Matrix.Translation(x, y, z)`** *(Dòng 155)*: Cấu tạo ra các ma trận tịnh tiến (chỉ định vị trí lưới 3D của viên hạt).
- **`mesh.thinInstanceAdd(matrices)`** *(Dòng 176, 179)*: Tạo "nhân bản mỏng" của 1 lưới duy nhất với hiệu năng đỉnh cao dựa vào GPU Instance, giúp vẽ hàng nghìn viên hạt cùng lúc mà không tụt FPS.
- **`mesh.thinInstanceSetMatrixAt(...)`** *(Dòng 454, 457)*: Cập nhật lại vị trí 1 viên hạt cụ thể. Khi Player "ăn" hạt, Babylon dời hạt đó bằng ma trận biến đổi đi xuống vị trí -1000 (ẩn khỏi tầm mắt). 
- **`mesh.thinInstanceBufferUpdated("matrix")`** *(Dòng 677)*: Gọi khi chơi lại game (Restart), thông báo cho GPU buffer biết ma trận đã trở lại vị trí gốc.

### H. Tải Mô hình ngoại vi (Loading GLB)
- **`BABYLON.SceneLoader.ImportMesh("", "./", fileName, scene, callback, null, errorCallback)`** *(Dòng 299)*: Hàm Asynchrnous tải asset mô hình 3D định dạng `.glb` từ ngoài. Mô hình được móc nối vào `TransformNode` (từ callback function) sau đó ẩn/hiện dựa theo thiết lập "Graphics" trong Setting.

### I. Quản lý Vòng Lặp & Tương tác
- **`scene.onBeforeRenderObservable.add((evt) => {...})`** *(Dòng 416, 940)*: Vòng lặp vật lý & logic diễn ra độc lập trong trò chơi. Mọi thứ như kiểm tra khoảng cách ăn pellet, AI thuật toán chuyển động của Ma, cũng như camera headbobbing theo `DeltaTime` đều được đăng ký tại đây.
- **`engine.getDeltaTime()`** *(Dòng 419, 943)*: Lấy thời gian trôi qua giữa 2 frame render (ms), bảo đảm sự chuyển động các thực thể/camera không bị ảnh hưởng khi FPS máy trồi sụt.
- **`engine.enterPointerlock()`** *(Dòng 75, 785)*: Yêu cầu trình duyệt nhốt chuột (Pointer Lock API) vào khung canvas, rất cần để trải nghiệm cơ chế Free-Look FPS.
