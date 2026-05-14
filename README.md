# Dictation Studio

Web app luyện chép chính tả với video YouTube.

## Bản cập nhật v2
- Khi đổi link YouTube, script demo cũ sẽ **tự xóa**, không còn check đáp án theo demo.
- Có thể nạp phụ đề/script thật bằng:
  - File `.srt`
  - File `.vtt`
  - Dán trực tiếp nội dung SRT/VTT vào ô nhập
- Tự tạo danh sách câu theo timestamp.
- Tự bỏ qua:
  - Đoạn trống
  - Cue không có chữ
  - Một số cue không lời thoại như `[Music]`, `[Applause]`, `♪`, `nhạc`, `vỗ tay`...
- Tự bỏ cue trùng liên tiếp trong phụ đề.

## Cấu trúc
- `index.html` — cấu trúc giao diện
- `styles.css` — toàn bộ giao diện và responsive
- `app.js` — logic phát video, parse SRT/VTT, kiểm tra đáp án, hint, review, shadowing

## Cách dùng
1. Dán link YouTube.
2. Bấm **Tải video**.
3. Tải file `.srt` / `.vtt` hoặc dán phụ đề có timestamp.
4. Bấm **Nạp script**.
5. Bắt đầu luyện nghe, nhập đáp án và chấm.

## Lưu ý kỹ thuật
Bản GitHub Pages/frontend thuần không tự lấy được transcript chính thức của mọi video YouTube.
Vì vậy bản này dùng cách ổn định hơn: nạp phụ đề SRT/VTT tương ứng với video.

Nếu sau này làm bản có backend, có thể xây thêm luồng tự động lấy/chuyển đổi transcript rồi trả về cho frontend.
