# 🔢 Giải Sudoku từng bước

[![CI](https://github.com/your-user/sudoku-step-solver/actions/workflows/ci.yml/badge.svg)](https://github.com/your-user/sudoku-step-solver/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![No dependencies](https://img.shields.io/badge/dependencies-0-success)

Chụp ảnh đề Sudoku → app tự đọc số → xem lời giải **từng bước có giải thích tiếng Việt**.

Trang web tĩnh thuần HTML/CSS/JS: **không bước build, không thư viện ngoài**, chạy được cả khi mở offline. (A Vietnamese step-by-step Sudoku solver that reads puzzles from photos. Static web app, zero dependencies.)

## Tính năng

1. **Chụp đề** – bật camera hoặc chụp/tải ảnh đề sudoku (báo, sách, màn hình). Kéo khung xanh 9×9 trùm khít đề, chỉnh cỡ bằng thanh trượt rồi bấm **✅ Đọc đề trong khung**. App nhị phân hoá từng ô, khử đường kẻ dính mép và so khớp mẫu chữ số (mẫu vẽ sẵn + mẫu render từ font hệ thống).
2. **Kiểm tra số** – ô nghi đọc sai có dấu `?`, ô trùng số với hàng/cột/khối có viền đỏ. **Chạm vào ô để nhập/sửa số.** App kiểm tra đề hợp lệ và đếm nghiệm (vô nghiệm / duy nhất / nhiều nghiệm). Có nút **🎲 Đề mẫu ngẫu nhiên** (sinh đề nghiệm duy nhất) và ô dán đề dạng chuỗi 81 ký tự.
3. **Hướng dẫn giải** – mỗi bước nêu rõ **kỹ thuật** và **vì sao** điền số đó: Ô đơn (naked single), Vị trí duy nhất (hidden single), Khoanh vùng (locked candidates), Cặp số (naked pair), và Suy luận sâu khi đề quá khó. Bấm **Tiếp** để đi từng bước hoặc **⏩ Tự chạy**; bấm vào một bước trong danh sách để nhảy tới đó. Phím tắt: `←` `→` `Space`.

## Chạy

```bash
node scripts/serve.js        # http://127.0.0.1:8000/
# hoặc: python3 -m http.server 8000
```

- Camera trực tiếp chỉ hoạt động qua `https://` hoặc `localhost`. Mở thẳng `index.html` (`file://`) vẫn dùng được với **chụp/tải ảnh** và nhập tay.
- Trên điện thoại cùng mạng LAN (http thường) trình duyệt chặn camera trực tiếp — dùng nút **📸 Chụp bằng app camera**.

## Cấu trúc

| File | Vai trò |
| --- | --- |
| `js/sudoku.js` | Mô hình lưới, kiểm tra hợp lệ, đếm nghiệm (backtracking + MRV), bộ giải từng bước kiểu người, sinh đề nghiệm duy nhất |
| `js/vision.js` | Nhận dạng chữ số từ ảnh (nhị phân hoá thích nghi + so khớp mẫu NCC trên ảnh chuẩn hoá 16×16) |
| `js/app.js` | Giao diện & luồng 3 bước (file duy nhất đụng tới DOM) |
| `scripts/serve.js` | Máy chủ tĩnh tối giản để chạy thử |
| `scripts/deploy-hub.sh` | Triển khai lên Server Hub nội bộ (tuỳ chọn) |

`js/sudoku.js` và `js/vision.js` chạy được cả trong Node (dùng `module.exports`), nhờ đó test không cần trình duyệt hay bundler.

## Kiểm thử

```bash
npm test
# tương đương:
node tests/solver.test.js   # hợp lệ, đếm nghiệm, giải từng bước, sinh đề
node tests/vision.test.js   # nhận chữ số trên ảnh mô phỏng sạch và có nhiễu
```

Yêu cầu Node.js ≥ 16, không cần `npm install`. CI chạy cùng các lệnh này trên Node 18/20/22.

## Trên Server Hub của máy này (tuỳ chọn)

```bash
bash scripts/deploy-hub.sh   # chạy test, chép vào /var/www/html/sudoku, build lại public/
```

## Đóng góp

Xem [CONTRIBUTING.md](CONTRIBUTING.md) — quy ước mã nguồn, cách chạy test và ý tưởng đóng góp (kỹ thuật giải mới, tự tìm khung đề trong ảnh, chữ số viết tay…). Dự án áp dụng [Quy tắc ứng xử](CODE_OF_CONDUCT.md).

## Giấy phép

[MIT](LICENSE) — xem thêm lịch sử thay đổi tại [CHANGELOG.md](CHANGELOG.md).

## Dự án anh em

🧩 [Giải Rubik từng bước](../) — cùng phong cách: chụp 6 mặt khối Rubik, tự nhận màu, hướng dẫn giải ~20 bước (Kociemba hai pha) với mô phỏng 3D.
