# GO v1.5 – Báo cáo PASS/FAIL

Giải nén ZIP vào thư mục gốc project GO v1.4. Không chứa hoặc thay đổi `.env`, login, config, dữ liệu gốc hoặc báo cáo cũ. Chỉ cần Node >=20 như project hiện tại.

## Đánh giá lần chạy đã có (offline, không gửi lại Goal)

```powershell
npm.cmd run verify
node scripts/report-go-pass-fail.mjs 2026-11-19T09-20-24-728Z
Import-Csv .\results\groups\GO\pass-fail.csv | Format-Table ID,'Trạng thái','Kiểm tra UI','Lý do' -Wrap
```

Bỏ Run ID để chọn thư mục có báo cáo batch mới nhất. Kết quả CSV/JSON lưu ở cả thư mục `results/groups/GO` và thư mục run đã chọn. File nguồn `ui-batch.csv`, `ui-batch.json`, `cases.csv` không bị ghi đè bởi lệnh offline.

## Hai cột chỉ PASS hoặc FAIL

- `Trạng thái`: nghiệm thu tiêu chí GO gốc. Vì UI v1.4/v1.5 chưa thu thập đầy đủ evidence cho các tiêu chí nghiệp vụ, các dòng ở báo cáo này FAIL nghiệm thu. Đây không phải là bằng chứng lỗi WCC. Không chuyển kết quả keyword thành PASS nghiệp vụ. Muốn nghiệm thu PASS thật cần chạy executor nghiệp vụ `npm.cmd run test:go` sau khi xác minh/mapping contract API và fixture cần thiết. Báo cáo executor vẫn riêng.
- `Kiểm tra UI`: PASS nếu đủ evidence trong cùng lần chạy về HTTP 200, SSE done, phiên mới lưu được, mode lập kế hoạch, không có Goal/Agent mới, file phản hồi khớp độ dài và đạt mọi dấu hiệu nội dung, không có dấu hiệu cắt. Đối với GO-010, PASS UI nếu nút bị khóa hoặc click không phát sinh request/guard không chặn và snapshot quan sát không có ID mới; chưa đủ để chứng minh validation backend hoặc không tạo Plan ở nơi chưa quan sát. GO-014 FAIL UI vì chưa chạy, không phải lỗi phân quyền đã xác nhận.

## Lần chạy sau

Trên tenant QA cô lập, được cấp phép, đã vô hiệu hóa hành động ngoài hệ thống, sử dụng flags an toàn như v1.4 và `node scripts/run-go-ui.mjs --send`. Runner chọn chế độ lập kế hoạch và xác nhận QA như cũ; tự xuất `pass-fail.csv` cuối batch. Báo cáo UI gốc vẫn được giữ làm evidence. Không cần chạy lại chỉ để tạo báo cáo lần cũ.

## Kiểm tra

57/57 unit test PASS trên bản overlay GO v1.4 + v1.5, bao gồm 6 unit test mới. Kiểm tra syntax runner thành công. Không chạy live WCC tại đây; chưa có file evidence thực tế từ lần chạy máy người dùng nên chưa xác định số PASS UI chính xác. Không sửa tiêu chí gốc, không thêm API giả.
