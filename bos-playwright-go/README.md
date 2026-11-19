# BOS Playwright GO — project độc lập (v1.0.0)

Chỉ nhóm 1: **Goal Analysis và đầu vào nghiệp vụ**, gồm đúng 10 test case P0 từ `BOS_Workforce_Lifecycle_Test_Cases(5).xlsx`. Tách từ project v3.3; không có 132 case của các nhóm khác. Không phụ thuộc vào thư mục project 142 case. Cấu hình giao diện WCC đã quan sát, contract backend vẫn CHƯA xác minh. Các assertion là code bước đầu dựa trên mapping; yêu cầu định tính có thể cần review thủ công. Không có kết quả PASS WCC được ghi sẵn.

## 1. Cài đặt Windows 11 / PowerShell (Node.js >= 20)
Giải nén ZIP ra `D:\Playwright\bos-playwright-go` (thư mục có package.json).

```powershell
cd "D:\Playwright\bos-playwright-go"
npm.cmd ci
npx.cmd playwright install chromium
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd run verify
npm.cmd run test:list
```

Đăng nhập riêng cho project GO:

```powershell
npm.cmd run login:ceo
```

Vào màn hình đúng tenant trong cửa sổ Chromium, quay về terminal nhấn Enter. Hoặc sao chép phiên CEO **còn hiệu lực** từ project cũ trên chính máy bạn vào `playwright/.auth/ceo.json`. Không chia sẻ phiên đăng nhập.

## 2. Kiểm tra giao diện, chạy cả nhóm mặc định chỉ đọc

```powershell
npm.cmd run smoke:go
npm.cmd run test:go
```

`smoke:go` gồm 2 bài readiness (AI Brain và Goal), không tính là test nghiệp vụ. `test:go` chạy readiness và toàn bộ 10 case, không sử dụng CASE_IDS cũ. Mặc định không gửi chat hoặc ghi dữ liệu. Các test cần contract/quyền sẽ BLOCKED; không phải FAIL nghiệp vụ. `npm.cmd run test:cases` chạy cả 10 case không kèm readiness.

## 3. Cấu hình backend một lần cho GO

```powershell
npm.cmd run go:discover
notepad config/go.contract.json
```

Công cụ mở AI Brain, Goal, Workforce và quan sát request; không tự gửi chat. Kết quả `results/groups/GO/discovery.json` chứa phương thức, path, cấu trúc field (không chứa giá trị body, token, cookie; path/field có thể chứa dữ liệu riêng). Đối chiếu với developer, điền mapping thật trong `config/go.contract.json`. File đi kèm là mẫu với `confirmed=false`. Không tự đoán API hoặc đặt confirmed=true khi chưa xác minh. Xem `docs/GO_NHOM_1.md` để biết chi tiết từng field.

## 4. Chạy nghiệp vụ khi đủ điều kiện QA

Chỉ khi tenant là môi trường QA cô lập được phép tạo dữ liệu, API/fixture đã xác minh và có quyền phù hợp. GO-014 cần **tenant QA thứ hai** được cấp phép cùng actor không có quyền tenant đích và observer có quyền đọc. Nếu không có điều kiện, để BLOCKED. Không thử tenant bất kỳ.

```powershell
$env:QA_ISOLATED_TEST_TENANT='1'
$env:ALLOW_QA_WRITES='1'
$env:ALLOW_QA_CHAT='1'
try { npm.cmd run test:go -- --allow-writes }
finally {
  Remove-Item Env:\QA_ISOLATED_TEST_TENANT,Env:\ALLOW_QA_WRITES,Env:\ALLOW_QA_CHAT -ErrorAction SilentlyContinue
}
```

Không tự duyệt hay kích hoạt Agent. Các Goal QA có thể tạo bản ghi và tiêu thụ AI usage. Dọn dữ liệu theo quy trình QA đã phê duyệt. Session hoặc mapping thay đổi có thể BLOCKED; SSE/WebSocket chưa có adapter. Báo cáo trạng thái FAIL phải đối chiếu test/fixture trước khi báo bug sản phẩm.

## 5. Xem kết quả

```powershell
Import-Csv .\results\groups\GO\cases.csv | Format-Table ID,'Trạng thái','Lý do' -AutoSize
npm.cmd run report:summary
npm.cmd run report
# HTML readiness riêng: npm.cmd run report:smoke
```

| File | Nội dung |
|---|---|
| `results/groups/GO/cases.csv` | 10 case, điều kiện, bước, expected, actual, trạng thái, lý do, thời gian, bằng chứng, bug note, nguồn, run ID |
| `results/groups/GO/cases.json` | Tổng hợp, số lượng từng trạng thái, chi tiết từng case |
| `results/groups/GO/readiness.csv` + `.json` | 2 bài readiness độc lập |
| `results/groups/GO/discovery.json` | Mapping gợi ý sau khi chạy discovery |
| `playwright-report/GO/cases/` | Báo cáo HTML do Playwright sinh |
| `test-results/GO/cases/` | Bằng chứng phát sinh khi chạy, gồm JSON và ảnh nếu mở được UI |

Các CSV/JSON ban đầu được tạo sẵn ở trạng thái **NOT_RUN**. Runner làm mới báo cáo tương ứng khi chạy, tránh dùng nhầm PASS của lần trước; lần quick không thay thế kết quả nghiệp vụ. `runId` xác định lần chạy. Không có file HTML thực tế trước khi Playwright chạy. Bật `$env:QA_CAPTURE_TRACE='1'` nếu cần trace thủ công cho các context UI thất bại; báo cáo, ảnh và trace có thể chứa dữ liệu riêng, chỉ lưu cục bộ và kiểm tra trước khi chia sẻ. Exit code 0 = tất cả bài trong các suite đã chọn PASS; 2 = chưa đủ PASS hoặc không khởi chạy được; 1 = bài test thất bại (hoặc mã khác do Playwright trả về).

## 6. Cấu trúc

- `src/groups/GO.js`: runtime và executor của cả 10 case GO.
- `src/groups/go-assertions.js`: assertion nghiệp vụ thuần JS, dùng chung cho unit test.
- `tests/groups/GO.spec.js`: đăng ký toàn bộ 10 case, `tests/readiness/GO.smoke.js`: 2 smoke test.
- `config/`: contract GO, selector; `data/cases.json`: 10 case nguyên văn Excel.
- `scripts/`: đăng nhập, discovery, chạy test, kiểm tra cấu trúc và xem tổng hợp.
- `reporters/`: xuất CSV/JSON đầy đủ; `tests/unit/`: kiểm tra assertion và báo cáo không cần truy cập WCC.

## 7. Kiểm tra khi đóng gói
- Đối chiếu từng trường STT, mã, ưu tiên, actor, điều kiện, bước, kết quả mong đợi và nguồn của 10 case với Excel gốc.
- Node.js kiểm tra cấu trúc và cú pháp toàn bộ JS; 23 unit test chạy với dữ liệu giả lập (không phải kết quả WCC).
- Chưa chạy Playwright tích hợp do npm registry lỗi DNS EAI_AGAIN trong môi trường đóng gói. Chưa xác nhận backend GO của WCC, cần thực hiện bước 3 và chạy trên máy QA.
