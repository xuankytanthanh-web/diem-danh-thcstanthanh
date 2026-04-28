# 📋 Điểm Danh THCS Tân Thạnh

Ứng dụng điểm danh học sinh cho trường THCS Tân Thạnh, xây dựng bằng React + Firebase + Vite.

---

## 🚀 Hướng dẫn Deploy lên Vercel (từng bước)

### BƯỚC 1: Tạo tài khoản & chuẩn bị

1. **GitHub**: Tạo tài khoản tại https://github.com (nếu chưa có)
2. **Vercel**: Tạo tài khoản tại https://vercel.com (đăng nhập bằng GitHub)

---

### BƯỚC 2: Đưa code lên GitHub

1. Vào https://github.com/new → Tạo repository mới
   - Repository name: `diem-danh-thcstanthanh`
   - Chọn **Private**
   - Bấm **Create repository**

2. Tải [GitHub Desktop](https://desktop.github.com/) hoặc dùng lệnh:
```bash
cd /thư-mục-chứa-code-này
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/TEN-GITHUB-CUA-BAN/diem-danh-thcstanthanh.git
git push -u origin main
```

---

### BƯỚC 3: Lấy Google OAuth Credentials

1. Vào https://console.cloud.google.com/apis/credentials
2. Chọn project: `gen-lang-client-0578218106`
3. Bấm **+ CREATE CREDENTIALS** → **OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Name: `Diem Danh App`
6. **Authorized redirect URIs** → Add URI:
   ```
   https://TEN-APP-CUA-BAN.vercel.app/api/auth/google/callback
   ```
   *(Thay TEN-APP-CUA-BAN bằng tên project Vercel của bạn)*
7. Bấm **CREATE** → Lưu lại `Client ID` và `Client Secret`

---

### BƯỚC 4: Lấy Gemini API Key

1. Vào https://aistudio.google.com/app/apikey
2. Bấm **Create API key**
3. Lưu lại key

---

### BƯỚC 5: Deploy lên Vercel

1. Vào https://vercel.com/new
2. Import repository `diem-danh-thcstanthanh` từ GitHub
3. Framework Preset: **Vite**
4. Bấm **Environment Variables** → Thêm các biến sau:

| Variable | Value |
|----------|-------|
| `VITE_GEMINI_API_KEY` | API key Gemini của bạn |
| `GOOGLE_CLIENT_ID` | Client ID từ bước 3 |
| `GOOGLE_CLIENT_SECRET` | Client Secret từ bước 3 |
| `GOOGLE_REDIRECT_URI` | `https://TEN-APP-CUA-BAN.vercel.app/api/auth/google/callback` |

5. Bấm **Deploy**

---

### BƯỚC 6: Cập nhật Firebase Authorized Domains

1. Vào https://console.firebase.google.com/project/gen-lang-client-0578218106/authentication/settings
2. Chọn tab **Authorized domains**
3. Bấm **Add domain**
4. Nhập: `TEN-APP-CUA-BAN.vercel.app`
5. Bấm **Add**

---

### BƯỚC 7: Cập nhật Redirect URI (nếu chưa đúng)

Sau khi deploy, Vercel sẽ cho URL chính xác (vd: `diem-danh-thcstanthanh.vercel.app`).

Vào lại Google Cloud Console → OAuth credentials → cập nhật Redirect URI cho đúng.

Cũng cập nhật biến `GOOGLE_REDIRECT_URI` trong Vercel Settings → Environment Variables.

---

## 🔧 Cấu trúc dự án

```
├── api/                    # Vercel Serverless Functions
│   ├── auth/
│   │   └── google/
│   │       ├── url.js      # Tạo Google OAuth URL
│   │       └── callback.js # Xử lý callback sau đăng nhập
│   ├── auth/
│   │   └── status.js       # Kiểm tra trạng thái đăng nhập
│   └── export/
│       └── google-drive.js # Xuất dữ liệu lên Google Drive
├── src/
│   ├── App.tsx             # Toàn bộ ứng dụng React
│   ├── firebase.ts         # Cấu hình Firebase
│   ├── main.tsx            # Điểm khởi động
│   └── index.css           # CSS
├── firebase-applet-config.json  # Cấu hình Firebase
├── firestore.rules         # Quy tắc bảo mật Firestore
├── vercel.json             # Cấu hình Vercel
└── vite.config.ts          # Cấu hình Vite
```

---

## 🛠️ Chạy local (development)

```bash
npm install

# Tạo file .env từ .env.example
cp .env.example .env
# Điền các giá trị vào .env

npm run dev
```

---

## 📞 Hỗ trợ

Tài khoản Google dùng cho ứng dụng: `lexuanky646@gmail.com`
