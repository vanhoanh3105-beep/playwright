# Nhóm 1 — Goal Analysis và đầu vào nghiệp vụ (project GO độc lập)

10/10 ID có executor; không còn placeholder trong GO. Không có kết quả PASS WCC được xác nhận tại thời điểm đóng gói. Cần ánh xạ contract thật một lần và chuẩn bị QA. Không dùng câu trả lời AI tự khai là bằng chứng backend. Các pattern tiếng Việt và schema mẫu là giả định kiểm thử cần đối chiếu; đặc biệt yêu cầu định tính về justification và lập kế hoạch có thể cần review thủ công nếu schema không cho bằng chứng đủ mạnh.

## Cài đặt trên Windows PowerShell
Xem README của project độc lập GO; giải nén riêng vào `D:\Playwright\bos-playwright-go`.
Không ghi đè project 142 case. Tạo `.env` từ `.env.example` và lưu phiên CEO trong thư mục mới.

## Map một lần, dùng chung cho 10 case

```powershell
if (-not (Test-Path config/go.contract.json)) { Copy-Item config/go.contract.example.json config/go.contract.json }
npm.cmd run go:discover
notepad config/go.contract.json
```
Discovery mở AI Brain, Goal, Workforce từ phiên CEO đã lưu, quan sát XHR/fetch. Script không tự ghi dữ liệu. Nếu môi trường được phép, operator có thể thực hiện 1 Goal thử và mở chi tiết kết quả. File `results/groups/GO/discovery.json` chứa đường dẫn và cấu trúc các field, không phải nội dung JSON hoặc token. Kiểm tra quyền riêng tư trước khi chia sẻ. Đây chỉ là dữ liệu gợi ý mapping, không tự xác nhận API. Nếu backend dùng SSE/WebSocket, response không có JSON ID hoặc không có API đọc kết quả theo ID, cần viết adapter phù hợp (GO sẽ NEEDS_REVIEW hoặc BLOCKED chứ không giả PASS).

`config/go.contract.example.json` **không phải schema chính thức**. Chỉ điền trường đã đối chiếu với response thật/contract từ developer. Các đường dẫn JSON dùng dấu chấm; `$` là root. `resultFields` dùng chuỗi path hoặc object `{path, fields}` để map mảng record. Trường mapped IDs phải là ID thật, không phải tên AI tự sinh. Đặt `confirmed=true` khi đã xác minh. Nếu không có trường cần thiết, để thiếu mapping và case không đủ điều kiện không nên đánh giá đạt.

- `chat.pathPattern`: regex pathname POST thực sự gửi chat; `responseIdPath` là ID kết quả từ response gửi; `resultUrl` GET đọc đúng kết quả theo `{id}`, `resultIdPath`, `inputPath`, `statePath`, `successStates`, `failureStates` là trường/giá trị backend thật. `inputPath` phải chứa prompt gốc có marker riêng; `resultSelector` (GO-001) trỏ đúng phần tử kết quả cụ thể, có `{id}`. Cần kết quả structured, không dùng text AI làm nguồn dữ liệu.
- `resultFields`: map Goal/Task, requirement, proposal, gaps, tool/permission, context, KPI/assumptions. Mẫu có cấu trúc canonical để viết assertion, không suy đoán backend đang sử dụng đúng tên này. Map danh sách ID, không map text mô tả thay thế. `fixtures` là regex cho dữ liệu QA có chủ đích trong `prompts`; xác nhận các loại trạng thái/policy theo contract.
- `policy`: GET audit/policy độc lập cho đúng ID Goal, quyền thực tế được cấp và từng quyết định. `context`: GET snapshot workforce thực tế trước khi gửi. GO-009 cần context đầy đủ được dùng làm đầu vào, không dùng danh sách Agent được chọn làm kết quả thay cho context đã xét.
- `lists`: GET danh sách Goal và Plan đầy đủ trong tenant QA, mapping items/id/total. Nếu phân trang, lấy endpoint trả đủ (hoặc mở rộng snapshot adapter); code không kết luận khi thiếu trang. Cần tenant không có tác vụ đồng thời. GO-010 kiểm tra whitespace, mã lỗi ứng dụng hoặc thông báo riêng cho input rỗng, và không thay đổi danh sách ID trong cửa sổ quan sát. `validation.requestInputPath` trỏ đúng input trong JSON POST. `uiErrorSelector` phải riêng cho lỗi input rỗng. `observationMs` theo thời gian xử lý thực tế.
- `crossTenant`: chỉ thử trên hai tenant QA do tổ chức cấp phép, actor không có scope tenant đích, observer có quyền đọc tenant đích; xác minh hai file storageState là hai người dùng phù hợp. `confirmed=true` riêng cho crossTenant, tenant đích khác QA_TENANT. Cấu hình URL/payload thực, có `{prompt}` và `{tenant}`; API GET snapshot phải thuộc tenant đích. 404 chỉ được chấp nhận nếu contract quy định che tài nguyên ngoài scope; mặc định 403. Không thử trên tenant bên thứ ba. Nếu không có fixture, case BLOCKED.

## Chạy cả nhóm

Chỉ khi được cấp quyền tạo Goal/Plan trong QA cô lập. Giữ `ALLOW_QA_WRITES=0` mặc định cho các lệnh thường. Các lệnh dưới chỉ bật trong terminal hiện tại; không sửa .env thành bật vĩnh viễn.

```powershell
$env:QA_ISOLATED_TEST_TENANT='1'
$env:ALLOW_QA_WRITES='1'
$env:ALLOW_QA_CHAT='1'
try { npm.cmd run test:go -- --allow-writes } finally {
  Remove-Item Env:\QA_ISOLATED_TEST_TENANT,Env:\ALLOW_QA_WRITES,Env:\ALLOW_QA_CHAT -ErrorAction SilentlyContinue
}
```

Lệnh trên chạy readiness và cả 10 case, bỏ qua CASE_IDS cũ. Không tự thực hiện duyệt/kích hoạt; Goal có thể phát sinh bản ghi QA và AI usage. Dọn dữ liệu QA theo quy trình được phê duyệt, không tự xóa dữ liệu chung. Các file kết quả: `results/groups/GO/cases.csv`, `readiness.csv`, `playwright-report/GO/cases`. `BLOCKED`: thiếu điều kiện; `NEEDS_REVIEW`: thiếu bằng chứng kết luận; `FAIL`: assertion thất bại, kiểm tra mapping trước khi báo bug. Không coi skip là PASS. Kiểm tra các báo cáo có ảnh hoặc dữ liệu riêng trước khi chia sẻ.

## Nội dung theo mã
GO-001: gửi lead, đối chiếu ID, trạng thái cuối, Goal/Task, phần tử UI kết quả. GO-002: doanh nghiệp, ngành, quy trình, công việc, năng lực, phụ thuộc, KPI, rủi ro. GO-004: liên kết ID Goal/Task. GO-005: giải thích và tham chiếu gap cụ thể. GO-006: kiểm tra đề xuất tool/quyền và policy audit, không tự cấp quyền. GO-009: snapshot bối cảnh Agent/Skill/Tool/Connection/budget/policy. GO-010: validation và không sinh Goal/Plan. GO-012: 2 mục tiêu độc lập, công việc và Agent assignment. GO-013: mục tiêu mơ hồ, KPI chưa xác nhận. GO-014: từ chối thao tác ngoài tenant và snapshot tenant đích.

## Phạm vi đã kiểm tra lúc đóng gói
Các unit test pure JavaScript dùng dữ liệu giả lập, không kết nối WCC. Không thể cài Playwright trong container do DNS npm EAI_AGAIN; không claim đã chạy suite thực. Project này chỉ có 10 case GO; không bao gồm nhóm khác.
