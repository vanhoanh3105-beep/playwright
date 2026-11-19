# Cập nhật discovery GO

Các file trong ZIP là patch cho project GO độc lập. Giải nén vào thư mục có package.json; giữ nguyên .env, config/go.contract.json và playwright/.auth.

- `config/go.observed.json`: API đã quan sát trong discovery do tester gửi, không phải contract gửi Goal.
- `node scripts/check-go-api.mjs --apply-goals`: gọi GET chỉ đọc với phiên CEO, chọn đúng company theo QA_TENANT, map danh sách Goal khi đủ dữ liệu, sao lưu contract; không bật confirmed. Nếu API yêu cầu auth khác hoặc phân trang, xem báo cáo api-readiness.json.
- `npm.cmd run go:discover`: nhấn Enter lần đầu để bắt đầu ghi nhận thao tác. Nếu được phép trên tenant QA cô lập, gửi một Goal mẫu trong AI Brain và đợi phản hồi, mở kết quả; Enter lần hai để lưu. Script không gửi chat. Không dùng tenant thật để tạo dữ liệu thử.
- `discovery.json`: chỉ metadata/shape; không chia sẻ phiên đăng nhập hoặc dữ liệu nhạy cảm.

Chưa có API POST gửi Goal, API GET kết quả phân tích hoặc API danh sách Plan đầy đủ, policy/context và fixture tenant thứ hai. Không đổi confirmed=true. Các 10 case nghiệp vụ vẫn có thể BLOCKED; readiness API là kết quả riêng.
