# Các màn hình BOS WCC đã xác minh trên phiên CEO (11/11/2026)

Host: `https://wcc.hoanh.aflowbiz.com`

| Màn hình | Route đã quan sát | Dấu hiệu UI |
|---|---|---|
| Đăng nhập | `/home` (khi chưa có phiên) | Tên đăng nhập, Mật khẩu, Google, Flowagentica |
| Trang chủ tenant | `/co/FLEET-HOANH/` và `/co/FLEET-HOANH/home` | Trang chủ, tổng quan công việc |
| Đội ngũ AI | `/co/FLEET-HOANH/ai-workforce` | Tổng quan, Nhân viên, Đề xuất, Lập kế hoạch |
| Phê duyệt | `/co/FLEET-HOANH/approvals` | Chờ duyệt, Lịch sử, Bàn duyệt kết quả, Luật của tôi |
| Bộ não AI | `/co/FLEET-HOANH/ai-brain` | Hỏi AI, Gửi câu hỏi |
| Goal | `/co/FLEET-HOANH/goal` | Goal, Tạo Goal |
| Bảng công việc | `/co/FLEET-HOANH/board?view=list&group=status` | Bảng công việc — Hoanh |
| Sơ đồ agent | `/co/FLEET-HOANH/so-do-agent` | Sơ đồ agent |

## Quan sát ban đầu, không phải kết quả test nghiệp vụ

- Đội ngũ AI hiển thị **0 Đang làm, 0 Sẵn sàng kích hoạt, 0 Chờ duyệt, 0 Bị chặn, 0 Lỗi, 0 Tạm dừng** và chi phí tháng `$0` tại thời điểm quan sát.
- Tab Nhân viên hiển thị chưa có nhân viên do vòng đời này tạo; tab Đề xuất hiển thị chưa có đề xuất.
- Lập kế hoạch mở form có `textarea` với placeholder `Ví dụ: Tự động hoá bộ phận bán hàng — tiếp nhận khách, chăm sóc khách, báo cáo doanh thu.` và nút Lập kế hoạch.
- Trung tâm Phê duyệt có phiếu đang chờ, nhưng đó là đề xuất **kỹ năng mới**, không phải approval `workforce_agent_hire`; không dùng làm fixture tuyển Agent.
- CEO Chat có `textarea[aria-label="Hỏi AI"]` và `button[aria-label="Gửi câu hỏi"]`.
- Chưa xác minh API URL, workflow metadata hoặc dữ liệu test cho approval/provisioning/evaluation. Không được tự suy đoán.

Các chi tiết này phản ánh môi trường vào thời điểm khảo sát, có thể thay đổi sau khi test khác tạo dữ liệu.
