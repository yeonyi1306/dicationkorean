# Dictation Studio v3

Web app luyện chép chính tả với video YouTube.

## Điểm mới trong v3
- Thêm nút **Kho video có sẵn** ở trang chính.
- Tạo trang `library.html` hiển thị danh sách video do admin cấu hình trước.
- Khi bấm vào một video trong kho:
  - Tự quay về trang luyện
  - Tự tải đúng video
  - Tự nạp đúng script/timestamp
  - Dùng đầy đủ tính năng giống trang chính:
    - Phát từng câu
    - Tự dừng
    - Ctrl để nghe lại
    - Nhập và check đáp án
    - Gợi ý
    - Lưu lỗi sai
    - Shadowing
- Có ô tìm kiếm video trong kho.
- Dữ liệu kho video nằm trong `lessons.js`.

## Cấu trúc file
- `index.html` — trang luyện chép chính tả
- `library.html` — trang kho video có sẵn
- `styles.css` — giao diện dùng chung
- `app.js` — logic trang luyện
- `library.js` — logic trang kho video
- `lessons.js` — dữ liệu video/script do admin cấu hình
- `README.md`

## Cách thêm video vào kho
Mở file `lessons.js`, thêm một object vào mảng `ADMIN_LESSONS`:

```js
{
  id: "video-id-rieng",
  title: "Tên video",
  description: "Mô tả bài luyện",
  language: "Korean",
  level: "Trung bình",
  videoId: "YouTubeVideoID",
  thumbnail: "https://img.youtube.com/vi/YouTubeVideoID/hqdefault.jpg",
  segments: [
    { start: 1.2, end: 3.5, text: "Câu lời thoại thứ nhất", difficulty: "Dễ" },
    { start: 4.0, end: 6.8, text: "Câu lời thoại thứ hai", difficulty: "Trung bình" }
  ]
}
```

## Ghi chú quan trọng
Đây là bản frontend tĩnh, phù hợp để up GitHub Pages.

Tên "admin tải lên sẵn" trong bản này được triển khai theo cách:
- Admin chủ động thêm dữ liệu video/script vào `lessons.js`
- Video sẽ xuất hiện tự động trong `library.html`

Nếu cần **admin upload video/script qua giao diện quản trị**, cần có backend + database hoặc một CMS.
