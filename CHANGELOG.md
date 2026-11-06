# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/); phiên bản theo [SemVer](https://semver.org/lang/vi/).

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
  (triển khai lên Server Hub), CI GitHub Actions (Node 18/20/22).
