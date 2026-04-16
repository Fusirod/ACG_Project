---
marp: true
theme: default
class: invert
paginate: true
size: 16:9
---

# Retro First-Person Pacman 3D
**Phân tích Kiến trúc và Ứng dụng Babylon.js**

---

## 1. Giới thiệu tổng quan trò chơi

- **Pacman 3D**: Trò chơi arcade kinh điển làm lại dưới góc nhìn thứ nhất.
- **Bối cảnh**: Mê cung 3D tăm tối với hiệu ứng đèn neon huyền ảo.
- **Mục tiêu**: Nhập vai Pacman, thu thập hạt điểm, chớp thời cơ ăn hạt năng lượng để phản công 4 con ma (Blinky, Pinky, Inky, Clyde).
- **Cơ chế**: Kết hợp logic lưới vuông (grid-based) truyền thống với sức mạnh môi trường 3D từ Babylon.js.

---

## 2. Các tính năng nổi bật

- **Góc nhìn thứ nhất (FPS)**: Camera đặt ngang tầm mắt, xoay bằng chuột, di chuyển bằng WASD theo logic lưới vuông.
- **AI Ma (Ghosts)**: Thuật toán tìm đường BFS, giới hạn theo 4 góc phần tư (quadrant). Phản ứng khi người chơi xâm nhập lãnh địa.
- **Minimap (Bản đồ siêu nhỏ)**: Camera chiếu thẳng từ trên xuống (orthographic) hỗ trợ định vị không gian.
- **Cơ chế tùy chỉnh linh hoạt**: Điều chỉnh độ nhạy chuột, FOV, hiệu ứng Neon, âm lượng và cả đồ họa (Chuyển đổi giữa Low-poly và High-poly GLB dynamically).

---

## 3. Ứng dụng Babylon.js trong dự án

Dự án sử dụng Engine 3D **Babylon.js** để lo liệu tất cả các khía cạnh đồ họa phần cứng. Việc triển khai được chia làm nhiều hạng mục.

---

### Khởi tạo Engine và Scene

- `new BABYLON.Engine(...)`: Khởi tạo lõi đồ họa kết xuất gắn vào Canvas HTML.
- `new BABYLON.Scene(...)`: Tạo không gian môi trường chứa mọi điểm ảnh, Mesh, Camera.
- `engine.runRenderLoop(...)`: Bật vòng lặp game, liên tục tái tạo cảnh ở 60+ FPS.
- `engine.resize()` / `engine.setHardwareScalingLevel()`: Xử lý thay đổi kích thước cửa sổ và tối ưu độ phân giải kết xuất (Graphics Quality).

---

### Ánh sáng và Hiệu ứng

- **Hemispheric Light**: `new BABYLON.HemisphericLight(...)` chiếu sáng nền tạo khối chuẩn xác cho toàn cảnh.
- **Hiệu ứng Neon cực ngầu**: `new BABYLON.GlowLayer(...)` xử lý khả năng phát quang. Vô cùng quan trọng để tường mê cung và các hạt sáng rực trong bóng tối thông qua thuộc tính `emissiveColor`.

---

### Giao diện 2D trên 3D (GUI)

- **Fullscreen UI**: `BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI(...)` tạo lớp UI canvas bao phủ.
- **Văn bản**: `new BABYLON.GUI.TextBlock()` in trực tiếp điểm số `SCORE` hoặc thông báo tĩnh lên trên lớp lưới 3D trong thời gian thực.

---

### Hệ thống Đa Camera (Multi-Camera)

- **Camera Máy quét (Người chơi)**: `new BABYLON.UniversalCamera(...)` cho phép ngóc nhìn First-person, lấy hướng vectơ thủ công qua `camera.getDirection(...)` để tính toán bước đi WASD.
- **Camera Minimap**: `new BABYLON.FreeCamera(...)` chuyển sang dạng chế độ `ORTHOGRAPHIC_CAMERA` (trực giao) bằng `viewport` (0.75, 0.75, 0.25, 0.25) đặt thu nhỏ ở góc phải trên cùng.

---

### MeshBuilder: Tạo hình mê cung

- Sử dụng mảng 2D `mapLayout` để định vị dữ liệu tường.
- **Tạo Khối tường**: `BABYLON.MeshBuilder.CreateBox(...)`.
- **Tạo Hạt ăn/Hạt sức mạnh**: `BABYLON.MeshBuilder.CreateSphere(...)`.
- **Tạo khối lập cho Ma & Minimap**: `BABYLON.MeshBuilder.CreateCylinder(...)` dạng rỗng. Vẽ viền `mesh.enableEdgesRendering()` để hiện vết cắt trắng trên nền đen.

---

### Tối ưu Hiệu Năng bằng GPU Thin Instances

Vẽ một mesh hàng trăm hạt riêng lẻ sẽ gây lag máy. Giới thiệu Thin Instances:

- Tái sử dụng cùng một Lưới cầu (Sphere).
- Bố trí ma trận qua `BABYLON.Matrix.Translation(x, y, z)`.
- Khởi tạo khối: `mesh.thinInstanceAdd(matrices)`.
- Khi "ăn" hạt: Đẩy hạt khỏi màn hình bằng `mesh.thinInstanceSetMatrixAt(...)` thay vì xóa đối tượng (rất tốn kém bộ nhớ).

---

### Hiệu năng: Gộp lưới (Merge Meshes) và Transform Nodes

- **Kết khối Tường**: Rất quan trọng, kết hợp hàng trăm Block Mê Cung thành 1 lưới duy nhất qua `BABYLON.Mesh.MergeMeshes(...)` để giảm thiểu số lượng Draw Calls của GPU.
- **Tải Mô hình High-poly**: `BABYLON.SceneLoader.ImportMesh(...)` fetch các file `.glb` từ ngoài. Trói buộc chúng vào những Node không có Mesh thông qua `new BABYLON.TransformNode(...)` để cố định tâm trọng lực và điều hướng ma (Pivot).

---

### Kết nối Vòng lặp vật lý và tương tác Game

- Game không phụ thuộc vào Havok Physics mà dùng Scripting Engine tự tạo:
- Dùng `scene.onBeforeRenderObservable.add(...)` để xử lý mọi logic trên từng frame.
- Thu nhận thời gian Delta qua `engine.getDeltaTime()` bảo vệ sự đồng bộ vận tốc di chuyển. 
- API nhốt con trỏ trình duyệt `engine.enterPointerlock()` cho phép người chơi đảo chuột tự do.

---

# Cảm ơn bản đã lắng nghe! 
*(Hỏi & Đáp)*
