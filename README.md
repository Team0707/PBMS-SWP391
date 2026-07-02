# PBMS - Parking Booking & Management System

Hệ thống quản lý và đặt chỗ bãi đỗ xe thông minh (PBMS) bao gồm hai phần chính:
- **Frontend (FE)**: Viết bằng React, TypeScript, Tailwind CSS, Vite.
- **Backend (BE)**: Viết bằng Java Spring Boot, Spring Data JPA, kết nối cơ sở dữ liệu SQL Server.

---

## 📂 Cấu trúc Thư mục Dự án

```text
SWP391/
├── PBMS-fe/                 # Dự án Frontend (React + TypeScript)
├── PBMS-be/                 # Dự án Backend (Spring Boot + Java 17)
├── development_guidelines.md # Hướng dẫn chia file và quy tắc code chung
└── README.md                # Hướng dẫn chạy dự án này
```

---

## 🛠️ Yêu cầu Hệ thống (Prerequisites)

Trước khi chạy dự án, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:
- **Java Development Kit (JDK)**: Phiên bản 17 trở lên.
- **Node.js**: Phiên bản 18+ và công cụ quản lý gói **npm**.
- **Microsoft SQL Server**: Phiên bản 2016 trở lên.

---

## 🚀 Hướng dẫn Cài đặt & Chạy Dự án

### Bước 1: Cài đặt và cấu hình Cơ sở dữ liệu (SQL Server)
1. Mở hệ quản trị cơ sở dữ liệu Microsoft SQL Server (ví dụ: SQL Server Management Studio - SSMS, Azure Data Studio, DBeaver hoặc Command Line).
2. Tạo một cơ sở dữ liệu mới tên là `parking_management_db`.
3. Sử dụng file schema có sẵn trong thư mục Frontend để khởi tạo cấu trúc bảng:
   - File SQL: [parking-system-schema.sql](file:///Users/dotritrong/Desktop/SWP391/PBMS-fe/parking-system-schema.sql)
   *(Lưu ý: Vì tệp SQL schema được thiết kế theo cú pháp MySQL, bạn có thể cần chuyển đổi các kiểu dữ liệu cụ thể như `ENUM` sang `VARCHAR` có `CHECK constraint` và `AUTO_INCREMENT` thành `IDENTITY` để tương thích hoàn toàn với SQL Server)*.

---

### Bước 2: Chạy Backend (Spring Boot)
1. Mở Terminal và trỏ vào thư mục **`PBMS-be`**:
   ```bash
   cd PBMS-be
   ```
2. Cấu hình thông tin tài khoản SQL Server của bạn trong file:
   - [application.properties](file:///Users/dotritrong/Desktop/SWP391/PBMS-be/src/main/resources/application.properties)
   - Thay đổi các dòng dưới đây cho đúng với tài khoản SQL Server của bạn:
     ```properties
     spring.datasource.url=jdbc:sqlserver://localhost:1433;databaseName=parking_management_db;...
     spring.datasource.username=sa (hoặc tài khoản đăng nhập SQL Server của bạn)
     spring.datasource.password=mật_khẩu_sql_server
     ```
3. Chạy ứng dụng bằng Maven Wrapper (tự động tải và cấu hình Maven nếu chưa có):
   - **Trên macOS / Linux**:
     ```bash
     chmod +x mvnw
     ./mvnw spring-boot:run
     ```
   - **Trên Windows**:
     ```cmd
     mvnw.cmd spring-boot:run
     ```
4. Ứng dụng Backend sẽ khởi chạy tại cổng: `http://localhost:8080`.

---

### Bước 3: Chạy Frontend (React)
1. Mở một cửa sổ Terminal mới và trỏ vào thư mục **`PBMS-fe`**:
   ```bash
   cd PBMS-fe
   ```
2. Cài đặt các thư viện phụ thuộc (dependencies):
   ```bash
   npm install
   ```
3. Chạy Frontend ở chế độ phát triển (development mode):
   ```bash
   npm run dev
   ```
4. Ứng dụng Frontend sẽ chạy tại cổng mặc định của Vite: `http://localhost:5173`.

---

## 📝 Quy chuẩn Viết Code
Để dự án được đồng bộ giữa tất cả các thành viên trong nhóm, vui lòng đọc kỹ tài liệu:
👉 [development_guidelines.md](file:///Users/dotritrong/Desktop/SWP391/development_guidelines.md) để nắm được:
- Kiến trúc phân chia file và thư mục của React và Spring Boot.
- Quy định đặt tên class, biến, hàm, cơ sở dữ liệu.
- Quy trình tích hợp API và cấu hình CORS.
