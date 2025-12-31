# 🚀 Hướng dẫn cài đặt để sử dụng chức năng hội thoại với AI

## 📋 Yêu cầu

- Trình duyệt web hiện đại (Chrome, Firefox, Edge, Safari)
- Kết nối Internet (cho tính năng AI Chat)

## 🔧 Cài đặt

### Bước 1: Clone hoặc tải project

```bash
git clone <repository-url>
cd Web_HocTiengAnh
```

### Bước 2: Cấu hình API Key cho tính năng AI Chat

Tính năng **Hội thoại với AI** cần API key từ Groq để hoạt động.

#### 2.1. Lấy API Key miễn phí

1. Truy cập: https://console.groq.com/keys
2. Đăng ký/Đăng nhập tài khoản Groq
3. Click **"Create API Key"**
4. Copy API key (dạng: `gsk_...`)

#### 2.2. Cấu hình API Key

**Cách 1: Copy file mẫu (Khuyến nghị)**

```bash
# Windows PowerShell
Copy-Item "Dashboard\Topics\topics-js\config.example.js" "Dashboard\Topics\topics-js\config.js"

# Linux/Mac
cp Dashboard/Topics/topics-js/config.example.js Dashboard/Topics/topics-js/config.js
```

Sau đó mở file `Dashboard/Topics/topics-js/config.js` và thay:

```javascript
GROQ_API_KEY: 'your-groq-api-key-here'
```

Thành:

```javascript
GROQ_API_KEY: 'gsk_abc123xyz...' // API key bạn vừa copy
```

**Cách 2: Tạo file mới**

Tạo file `Dashboard/Topics/topics-js/config.js` với nội dung:

```javascript
const CONFIG = {
    GROQ_API_KEY: 'gsk_abc123xyz...' // Thay bằng API key của bạn
};

window.APP_CONFIG = CONFIG;
```

### Bước 3: Chạy ứng dụng

1. Mở file `Background/background.html` trong trình duyệt
2. Đăng ký tài khoản mới hoặc đăng nhập
3. Bắt đầu học tiếng Anh!

## ✨ Tính năng

### 1. Đăng ký/Đăng nhập
- Tạo tài khoản cá nhân
- Quản lý thông tin người dùng
- Toggle hiển thị mật khẩu khi nhập

### 2. Học từ vựng theo chủ đề
- Nhiều chủ đề đa dạng: Hàng ngày, Công việc, Du lịch, Văn hóa
- Tìm kiếm và lọc chủ đề

### 3. Game Nối từ
- Ghép từ tiếng Việt với nghĩa tiếng Anh
- Học từ vựng một cách vui vẻ

### 4. Luyện phát âm
- Nghe phát âm chuẩn
- Ghi âm giọng nói của bạn
- So sánh phát âm với chuẩn

### 5. Hội thoại với AI 🤖
- Trò chuyện với AI bằng tiếng Anh
- AI đóng vai người bản xứ
- Luyện giao tiếp theo từng chủ đề
- **Cần API key Groq** (xem Bước 2)

### 6. Quản lý thông tin cá nhân
- Cập nhật thông tin
- Đổi mật khẩu
- Xem thống kê học tập

## ⚠️ Lưu ý quan trọng

### Về API Key

- **KHÔNG** commit file `config.js` lên Git (đã được thêm vào `.gitignore`)
- Chỉ commit file `config.example.js` (file mẫu)
- Groq free tier có giới hạn: **100,000 tokens/ngày**
- Rate limit reset vào **00:00 UTC** mỗi ngày (~7h sáng giờ VN)

### Khi hết quota

Nếu thấy lỗi "Rate limit exceeded" trong Console:

1. **Đợi đến ngày mai** - Quota sẽ reset về 100,000 tokens
2. **Tạo API key mới** từ tài khoản Groq khác
3. **Sử dụng fallback responses** - AI vẫn trả lời nhưng không thông minh bằng

### Các tính năng khác

Tất cả tính năng khác (Nối từ, Phát âm, Ghi âm) **không cần API key** và hoạt động offline!

## 🐛 Xử lý lỗi

### AI không trả lời hoặc trả lời lặp lại

1. Mở **Console** (F12) để xem lỗi
2. Kiểm tra:
   - File `config.js` đã tạo chưa?
   - API key đúng format chưa?
   - Còn quota không? (xem lỗi 429 trong console)
3. Thử tạo API key mới

### Không kết nối được backend

Một số tính năng cần backend API chạy tại `http://localhost:8000`:
- Đăng ký/Đăng nhập
- Lưu tiến trình học tập

Nếu backend chưa chạy, các tính năng này sẽ lưu dữ liệu vào `localStorage` (chỉ trên máy local).

## 📁 Cấu trúc thư mục

```
Web_HocTiengAnh/
├── Background/              # Trang chủ
├── Register_Login/          # Đăng ký/Đăng nhập
├── Dashboard/               # Trang chính
│   ├── Topics/             # Các chủ đề học
│   │   ├── topics-js/
│   │   │   ├── config.js          # ⚠️ KHÔNG commit
│   │   │   ├── config.example.js  # ✅ Commit file này
│   │   │   └── ai-chat.js
│   │   └── topics.html
│   └── profile.html        # Thông tin cá nhân
└── .gitignore              # Danh sách file không commit
```

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng tạo Pull Request.

## 📄 License

MIT License

---

**Chúc bạn học tiếng Anh vui vẻ! 🎉**
