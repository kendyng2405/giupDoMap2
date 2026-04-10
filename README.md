<div align="center">

# 🫀 Trái Tim Việt
### Bản đồ từ thiện — Kết nối yêu thương

[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-222?logo=github&logoColor=white)](https://traitimviet.online)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![Leaflet](https://img.shields.io/badge/Map-Leaflet.js-199900?logo=leaflet&logoColor=white)](https://leafletjs.com)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

> **Pure Frontend SPA** — Không cần server, deploy thẳng lên GitHub Pages.  
> Kết nối người muốn từ thiện với những địa điểm đang cần hỗ trợ trên toàn Việt Nam.

![Preview](https://traitimviet.online/preview.png)

</div>

---

## ✨ Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| 🗺️ **Bản đồ tương tác** | Hiển thị địa điểm cần hỗ trợ theo mức độ khẩn cấp |
| 📍 **Đề xuất địa điểm** | Member đề xuất, admin xét duyệt trước khi lên bản đồ |
| 🔔 **Thông báo realtime** | Cập nhật trạng thái đề xuất, cảnh báo từ admin |
| 👥 **Hệ thống cấp bậc** | Tích điểm và thăng cấp khi tham gia từ thiện |
| 🌙 **Dark / Light mode** | Giao diện tùy chỉnh theo sở thích |
| 📱 **Responsive** | Tương thích mọi thiết bị |

---

## 🗂️ Cấu trúc dự án

```
trai-tim-viet/
│
├── 📄 index.html                   # Shell HTML + Navbar + Auth state
├── 📄 app.js                       # Entry point — đăng ký routes
│
├── 📁 models/                      # M — Data layer
│   ├── firebase.js                 #   Firebase init & config
│   ├── UserModel.js                #   User CRUD + rank logic
│   ├── LocationModel.js            #   Location CRUD + image upload
│   ├── SuggestionModel.js          #   Đề xuất địa điểm
│   └── NotificationModel.js        #   Hệ thống thông báo
│
├── 📁 controllers/                 # C — Business logic
│   ├── Router.js                   #   Front Controller (hash routing)
│   ├── AuthController.js           #   Đăng nhập / Đăng ký / Quên MK
│   ├── HomeController.js           #   Bản đồ chính + markers
│   ├── ProfileController.js        #   Hồ sơ + lịch sử điểm
│   ├── AdminController.js          #   Quản lý địa điểm + người dùng
│   ├── SuggestionController.js     #   Đề xuất & xét duyệt
│   └── NotificationController.js   #   Panel thông báo + badge
│
├── 📁 views/                       # V — Presentation layer
│   ├── ViewEngine.js               #   Render HTML strings vào #app
│   └── components/
│       └── Toast.js                #   Toast notification component
│
└── 📁 public/
    └── css/
        └── main.css                # Design system (CSS variables, dark/light)
```

---

## 🚀 Hướng dẫn triển khai

### Bước 1 — Clone & push lên GitHub

```bash
git clone https://github.com/YOUR_USERNAME/trai-tim-viet.git
cd trai-tim-viet

git add .
git commit -m "🚀 Initial commit"
git push -u origin main
```

### Bước 2 — Bật GitHub Pages

1. Vào repo GitHub → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / `(root)` → **Save**
4. Chờ ~1 phút, site sẽ lên tại `https://YOUR_USERNAME.github.io/trai-tim-viet`

---

### Bước 3 — Cấu hình Firebase

#### 3.1 Authentication
- Firebase Console → **Authentication** → **Sign-in method**
- Bật **Email/Password**


#### 3.4 Firestore Composite Index
Cần tạo index cho tính năng thông báo. Vào **Firestore** → **Indexes** → **Composite** → **Add index**:

| Collection | Field | Order |
|------------|-------|-------|
| `notifications` | `toUid` | Ascending |
| `notifications` | `createdAt` | Descending |

Query scope: **Collection** → **Create**. Chờ status chuyển sang `Enabled`.

---

### Bước 4 — Tạo tài khoản Founder

1. Đăng ký tài khoản bình thường qua giao diện
2. Vào **Firestore Console** → collection `users` → tìm document của bạn
3. Đổi field `role` từ `"member"` thành `"founder"`

---

## 🔗 Bảng Route

| URL | Trang | Quyền truy cập |
|-----|-------|----------------|
| `/home` | Bản đồ chính | Tất cả |
| `/login` | Đăng nhập | Guest |
| `/register` | Đăng ký | Guest |
| `/forgot-password` | Quên mật khẩu | Guest |
| `/profile` | Hồ sơ cá nhân | Member+ |
| `/suggest` | Đề xuất địa điểm | Member |
| `/admin/dashboard` | Quản lý địa điểm | Admin / Founder |
| `/admin/locations/new` | Thêm địa điểm | Admin / Founder |
| `/admin/locations/:id/edit` | Sửa địa điểm | Admin / Founder |
| `/admin/suggestions` | Xét duyệt đề xuất | Admin / Founder |
| `/admin/users` | Quản lý người dùng | Founder |

---

## 👑 Hệ thống phân quyền & cấp bậc

### Vai trò (Role)

| Vai trò | Hiển thị | Quyền hạn |
|---------|----------|-----------|
| `member` | Đồng Lòng → … | Xem bản đồ, đề xuất địa điểm |
| `admin` | Người Dẫn Lửa | Thêm/sửa/xóa địa điểm, duyệt đề xuất, cảnh báo member |
| `founder` | Người Sáng Lập | Toàn quyền + quản lý người dùng |

### Cấp bậc Member (theo điểm)

| Cấp bậc | Điểm tối thiểu |
|---------|---------------|
| 🤝 Đồng Lòng | 0 |
| 💙 Tâm Lòng Bắc | 5 |
| ⭐ Vàng Tâm | 15 |
| 🏆 Trái Tim Vàng | 30 |

---

## 🛠️ Công nghệ sử dụng

| Công nghệ | Mục đích | Chi phí |
|-----------|----------|---------|
| Firebase Auth | Đăng nhập, reset password | Miễn phí |
| Firebase Firestore | Cơ sở dữ liệu realtime | Miễn phí (1GB) |
| Firebase Storage | Lưu trữ ảnh địa điểm | Miễn phí (5GB) |
| Leaflet.js | Thư viện bản đồ | Miễn phí / OSS |
| Google Maps Tiles | Tile bản đồ | Miễn phí |
| Nominatim | Reverse geocoding | Miễn phí |
| GitHub Pages | Hosting | Miễn phí |

---

## 📁 Môi trường & Config

Cấu hình Firebase nằm trong `models/firebase.js`. Nếu muốn dùng project Firebase của riêng bạn, thay thế toàn bộ object `firebaseConfig`:

```js
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

---

<div align="center">

Made with ❤️ for Vietnam

</div>
