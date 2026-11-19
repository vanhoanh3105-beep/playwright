# GO UI batch v1.4 — tự chọn chế độ an toàn

Cập nhật trên project GO độc lập đã cài v1.1, v1.2, v1.3. Giải nén ZIP trực tiếp vào thư mục chứa package.json. Không ghi đè .env, phiên đăng nhập, dữ liệu kết quả. Giữ nguyên cases.csv và contract strict.

Chạy `npm.cmd run verify` (51 unit test đã PASS trong môi trường Node 22; test mô phỏng UI, chưa chạy trực tiếp WCC). Sau đó, chỉ trên tenant QA cô lập được phép và đã vô hiệu hóa hành động bên ngoài:

```powershell
$env:QA_ISOLATED_TEST_TENANT="1"
$env:ALLOW_QA_WRITES="1"
$env:ALLOW_QA_CHAT="1"
try { node scripts/run-go-ui.mjs --send }
finally {
  Remove-Item Env:\QA_ISOLATED_TEST_TENANT -ErrorAction SilentlyContinue
  Remove-Item Env:\ALLOW_QA_WRITES -ErrorAction SilentlyContinue
  Remove-Item Env:\ALLOW_QA_CHAT -ErrorAction SilentlyContinue
}
```

Script tự chọn Chỉ lập kế hoạch bằng nhãn UI đúng như ảnh WCC, xác minh menu đóng, kiểm tra lại trước từng lần gửi. Chỉ cần xác nhận QA một lần. Không nhập tên chế độ. Chặn mode auto/full, mode không rõ, request sai tenant/session/prompt hoặc đổi mode. Danh sách mã planning được chấp nhận là plan, plan_only, plan-only, planning, planning_only, planning-only (chưa xác minh enum backend thực tế). Nếu báo Request blocked by mode/body guard kèm run_mode, không bỏ guard; ghi nhận mã đó để đối chiếu hợp đồng backend. UI/enum không thay thế việc kiểm soát tool/action policy server và môi trường cô lập. Không bật toàn quyền. Không cần thao tác giao diện trong khi batch chạy.

8 case gửi Goal, GO-010 kiểm tra đầu vào rỗng UI, GO-014 BLOCKED cho đến khi có fixture tenant thứ hai được cấp phép. Kết quả ở results/groups/GO/ui-batch.csv và ui-runs/<runId>/. NEEDS_REVIEW và PASS_TRANSPORT không phải PASS nghiệp vụ. Exit code 2 nếu chưa đủ PASS. Chạy riêng thử một case bằng `node scripts/run-go-ui.mjs --send --case=WF-GO-001`.
