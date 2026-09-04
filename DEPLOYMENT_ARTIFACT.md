# Triển khai dashboard

## Production dùng gì?

Production chỉ phục vụ thư mục `dist` được tạo bởi `npm run build`. Không đưa raw source React, Git metadata, file `.env`, test hoặc log lên máy chủ.

Dashboard được đóng gói cùng `source4` và `cwi-backend` thành một release artifact có commit manifest và checksum SHA-256.

## Kiểm tra local

```powershell
npm ci --no-audit --no-fund
npm run lint
npm run build
```

Frontend chỉ dùng biến `VITE_`. Release production mặc định dùng API cùng origin `/api`; `.env` localhost chỉ phục vụ dev. Không đặt database URL, service-role key, SMTP secret hay secret backend trong `.env` của dashboard.

## Cập nhật production

Sau khi push `main` của các repository, chạy script điều phối tại `D:\CWI\cwi-backend`:

```powershell
.\deploy\publish-production-artifact.ps1 `
  -RemoteHost "SERVER_HOST" `
  -RemoteUser "ubuntu" `
  -SshKeyPath "C:\path\to\ssh-key"
```

Release mới được kiểm tra ở cổng staging trước khi PM2 chuyển sang bản build mới. Nếu kiểm tra thất bại, release cũ được giữ để rollback; database và dữ liệu Supabase không bị thay đổi.
