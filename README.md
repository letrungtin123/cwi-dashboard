# cwi-fe-dashboard

Trang quản trị của CEO Workforce Index: theo dõi lượt khảo sát, báo cáo và email gửi kết quả; đăng ký Roundtable/Webinar; báo cáo quý; nguồn mời; tài khoản quản trị. Phân quyền Super Admin, Admin, Viewer.

React 19, TypeScript, Vite, Tailwind CSS.

## Chạy local

```bash
npm install
cp .env.example .env    # VITE_API_BASE_URL trỏ tới cwi-backend
npm run dev             # http://localhost:5680
```

## Lệnh

| Lệnh | Việc |
| --- | --- |
| `npm run build` | Typecheck và build vào `dist/` (phục vụ ở đường dẫn `/dashboard/`) |
| `npm run lint` | oxlint |
| `npm test` | vitest |

Production phục vụ thư mục `dist/`, được đóng gói cùng backend (xem `cwi-backend/deploy/README.md`).
