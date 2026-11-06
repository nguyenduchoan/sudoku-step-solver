# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/); phiên bản theo [SemVer](https://semver.org/lang/vi/).

## [Unreleased]

### Sửa (theo review)
- **Lời giải cũ không còn áp lên đề đã thay đổi**: mọi thao tác đổi đề
  (sửa ô, xoá hết, dán đề, đề mẫu, đọc ảnh mới) đều huỷ lời giải, dừng
  tự chạy và đưa bước 3 về trạng thái "Chưa có lời giải".
- **Camera không còn rò rỉ luồng**: `startCamera()` dừng phiên cũ trước khi
  mở phiên mới và chặn hai lần khởi động chồng nhau; lỗi giữa chừng cũng
  được dọn sạch.
- **Bước "suy luận sâu" nói đúng bản chất**: kiểm chứng từng ứng viên bằng
  backtracking — chỉ nói "buộc phải là" khi duy nhất một ứng viên dẫn tới
  nghiệm; với đề nhiều nghiệm, ghi rõ đây là lựa chọn giữa các khả năng
  hợp lệ (kèm danh sách).
- **Bảng ứng viên duy trì xuyên suốt, loại trừ được xâu chuỗi**: điền số
  chỉ cập nhật ô liên quan thay vì tạo lại từ đầu; các phép Khoanh vùng /
  Cặp số được giữ lại và lặp đến khi hết tiến triển trước khi viện tới
  "suy luận sâu".
- **Lời văn Ô đơn / Vị trí duy nhất nêu đúng căn cứ**: khi một ứng viên
  bị loại bởi Khoanh vùng / Cặp số ở bước trước (không nhìn thấy trong
  hàng/cột/khối), lời giải thích dẫn lại đích danh số đó và phép loại trừ
  đã dùng, thay vì nói mọi số đều "đã xuất hiện trong hàng/cột/khối".
- Thêm test: đề nhiều nghiệm (ví dụ của reviewer), kiểm chứng lời văn
  ép buộc/lựa chọn khớp thực tế, đề khó 24 số cho trước, và đề seed cố
  định kiểm chứng lời văn single dẫn đúng căn cứ loại trừ.

## [1.0.0] - 2026-11-06

### Thêm
- Luồng 3 bước: Chụp đề → Kiểm tra số → Hướng dẫn giải (tiếng Việt).
- Đọc đề từ camera hoặc ảnh: nhị phân hoá thích nghi từng ô, khử đường kẻ,
  so khớp mẫu chữ số (mẫu vẽ sẵn + mẫu render từ font hệ thống); ô thiếu
  tự tin đánh dấu `?`.
- Lưới kiểm tra: chạm ô để nhập/sửa số, báo trùng số theo hàng/cột/khối,
  đếm nghiệm (vô nghiệm / duy nhất / nhiều nghiệm), dán đề chuỗi 81 ký tự,
  sinh đề mẫu nghiệm duy nhất.
- Bộ giải từng bước kiểu người: Ô đơn, Vị trí duy nhất, Khoanh vùng,
  Cặp số, Suy luận sâu — mỗi bước có giải thích và highlight ô liên quan;
  điều khiển Tiếp/Trước/Tự chạy/nhảy bước, phím tắt ←/→/Space.
- Test chạy bằng Node thuần: `tests/solver.test.js`, `tests/vision.test.js`.
- `scripts/serve.js` (máy chủ tĩnh tối giản), `scripts/deploy-hub.sh`
  (triển khai lên Server Hub).
