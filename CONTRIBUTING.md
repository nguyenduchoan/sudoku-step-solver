# Đóng góp cho Giải Sudoku từng bước

Cảm ơn bạn quan tâm! Dự án cố tình giữ tối giản: **HTML/CSS/JS thuần, không bước build, không phụ thuộc thư viện ngoài** (kể cả lúc chạy test). Mọi đóng góp nên giữ nguyên tinh thần đó.

## Chạy trên máy

```bash
node scripts/serve.js        # http://127.0.0.1:8000/
# hoặc: python3 -m http.server 8000
```

Camera trực tiếp chỉ hoạt động qua `https://` hoặc `localhost`; mở bằng `file://` vẫn dùng được phần tải ảnh và nhập tay.

## Kiểm thử

```bash
npm test
# tương đương:
node tests/solver.test.js   # mô hình, đếm nghiệm, giải từng bước, sinh đề
node tests/vision.test.js   # nhận chữ số trên ảnh mô phỏng
```

Yêu cầu Node.js ≥ 16, không cần `npm install`.

## Quy ước mã nguồn

- Mỗi file JS là một IIFE gắn API vào `window.<Tên>` trong trình duyệt và `module.exports` trong Node (xem đầu `js/sudoku.js`), nhờ đó test chạy thẳng bằng `node` không cần bundler.
- `js/sudoku.js` và `js/vision.js` **không được đụng tới DOM** (trừ nhánh tăng cường mẫu font trong `vision.js` có kiểm tra `typeof document`); toàn bộ phần giao diện nằm trong `js/app.js`.
- Chuỗi hiển thị cho người dùng viết bằng tiếng Việt; tên biến/hàm và chú thích kỹ thuật ngắn gọn.
- Thụt lề 2 dấu cách, dấu chấm phẩy đầy đủ, chuỗi nháy đơn.

## Gửi thay đổi

1. Fork và tạo nhánh từ `main`.
2. Thêm/cập nhật test trong `tests/` cho hành vi mới (đặc biệt là kỹ thuật giải mới trong `solveSteps` hoặc thay đổi nhận dạng).
3. Chạy `npm test` sạch lỗi; CI cũng chạy đúng các lệnh đó trên Node 18/20/22.
4. Mở Pull Request, mô tả **vì sao** thay đổi (kèm ảnh chụp màn hình nếu đổi giao diện).

## Báo lỗi

Mở issue kèm theo: đề sudoku dạng chuỗi 81 ký tự (lấy từ ô "Dán đề dạng chữ"), trình duyệt/thiết bị, và ảnh gốc nếu lỗi nằm ở phần đọc ảnh.

## Ý tưởng đóng góp

- Kỹ thuật giải mới (hidden pair/triple, X-Wing, Swordfish…) — thêm vào `solveSteps` kèm giải thích tiếng Việt.
- Tự tìm khung đề trong ảnh (phát hiện lưới) thay vì căn khung tay.
- Nhận chữ số viết tay.
- Dịch giao diện sang ngôn ngữ khác.
