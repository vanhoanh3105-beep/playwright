# BOS Playwright DS — Nhóm 02 (8 case P0)

Project độc lập, Node.js 20+, Playwright Chromium. Không sửa project GO. Danh sách và expected result nguyên văn từ sheet `Test Cases` của `BOS_Workforce_Lifecycle_Test_Cases(5).xlsx` (STT 11–18), lưu tại `data/cases.json`.

## Phạm vi và giới hạn — đọc trước khi chạy

- `test:ds` gửi 8 tình huống **giả lập có dữ liệu kiểm thử rõ ràng qua CEO chat thật trên WCC**, chế độ Chỉ lập kế hoạch. Không tự tạo fixture thật, không cấp quyền, không kích hoạt Agent, không duyệt đề xuất. Các ID `QA-A...`, `QA-P...` là dữ liệu đầu vào giả lập, không phải ID tenant.
- `Trạng thái`: PASS/FAIL của bài kiểm tra quyết định AI trong schema JSON được yêu cầu, SSE, phiên mới và dữ liệu quan sát trước/sau. Không chỉ dò từ khóa. Nếu AI trả lời ngoài schema JSON (ngoại trừ tiền tố WCC đã quan sát và Markdown JSON fence), test này FAIL về định dạng; điều đó không chứng minh Planner có lỗi.
- `Nghiệm thu gốc`: FAIL do thiếu fixture thật và bằng chứng nghiệp vụ Planner/Policy, kể cả nếu Chat PASS. Đây là đánh giá nghiệm thu không đủ chứng cứ, không phải bug WCC. Những trường hợp gốc cần Permanent Agent thật đủ năng lực, Skill đăng ký thật, capacity, pending proposal cùng tenant/role_key, Temporary Agent đã hoàn thành, Plan thực tế và phê duyệt. Chưa có contract đọc Plan, capacity, temporary/approval và cách tạo các fixture này. Không gọi endpoint suy đoán. Muốn nghiệm thu end-to-end phải bổ sung fixture và contract tương ứng. Không thay thế Planner bằng câu trả lời AI.
- Dùng API đã quan sát `/api/auth/me/`, `/api/companies/`, `/api/objectives/`, `/api/ai/workforce/agents/`, `/api/ai/brain/sessions/`, và luồng `/api/ai/brain/chat/stream/`. So sánh ID và một số trạng thái/config của Goal, Agent, proposal, tham chiếu Plan theo dữ liệu trả về; không có đủ bằng chứng danh sách Plan độc lập hoặc audit server. Dừng batch khi phát hiện thay đổi không mong muốn hoặc gửi lỗi. Không đảm bảo ngăn được hành động bên trong server; cần tắt các hành động bên ngoài và sử dụng tenant QA cô lập đã được cấp phép.
- Code chọn mode và parser SSE kế thừa kỹ thuật đã chạy trên GO. DS chưa được chạy live. 41 unit test và kiểm tra cú pháp đã chạy cục bộ trên Node 22. Không có phiên đăng nhập/cookie trong ZIP.

## Cài đặt trên Windows

Giải nén `BOS_Playwright_DS_Doc_Lap.zip` vào D:\Playwright. Thư mục con là `bos-playwright-ds`.

```powershell
cd "D:\Playwright\bos-playwright-ds"
Copy-Item .env.example .env
npm.cmd ci
npx.cmd playwright install chromium
npm.cmd run verify
npm.cmd run test:list
```

Nếu sử dụng lại phiên CEO của GO (cùng host, tenant và quyền QA, đường dẫn mặc định):

```powershell
New-Item -ItemType Directory -Force .\playwright\.auth | Out-Null
Copy-Item ..\bos-playwright-go\playwright\.auth\ceo.json .\playwright\.auth\ceo.json
```

Hoặc `npm.cmd run login:ceo` rồi đăng nhập ở Chromium. `.env.example` đã dùng WCC FLEET-HOANH theo project GO; kiểm tra host và tenant thực tế. Phiên đăng nhập là dữ liệu bí mật, không gửi file này hoặc commit lên Git. Nếu `.env` cũ có cấu hình host/tenant khác, chỉnh `.env` DS cho đúng trước khi chạy.

## Kiểm tra readiness (chỉ GET; không gửi chat)

```powershell
npm.cmd run smoke:ds
```

Nếu fail 401/403, kiểm tra phiên CEO. Nếu sai tenant, không bỏ guard; chỉnh `.env`. Readiness PASS không phải kết quả DS.

## Chạy cả 8 case

Chỉ trên tenant QA đã được cấp phép, cô lập, vô hiệu hóa các hành động bên ngoài. Kiểm tra các điều kiện này trước khi bật flags. Không chạy tenant production.

```powershell
$env:QA_ISOLATED_TEST_TENANT="1"
$env:ALLOW_QA_WRITES="1"
$env:ALLOW_QA_CHAT="1"
npm.cmd run test:ds
```

Playwright tự mở Chromium, chọn Chỉ lập kế hoạch; gõ `QA` + Enter đúng một lần. Script chuyển lần lượt 8 tình huống, không cần nhập thủ công. Nếu phát hiện request mode không đúng / chưa rõ, không gửi chat. Không ép bypass. Node trả mã 2 nếu bất kỳ kiểm tra tình huống nào FAIL, sau khi đã lưu báo cáo. `Nghiệm thu gốc` là cột riêng, không điều khiển exit code của bài test Chat.

## Báo cáo

```powershell
Import-Csv .\results\groups\DS\pass-fail.csv |
  Format-Table ID,'Trạng thái','Nghiệm thu gốc','Lý do' -Wrap
Invoke-Item .\results\groups\DS\pass-fail.csv
```

- `results/groups/DS/pass-fail.csv`: UTF-8 BOM, mở Excel, luôn đủ 8 dòng cho lần chạy.
- `pass-fail.json`: assertion theo từng tiêu chí, trạng thái, lý do, expected gốc.
- `ui-runs/<runId>/`: lịch sử mỗi lần chạy, file `.json` và `.answer.local.txt`; không lưu suy luận SSE, token, raw API snapshots. Câu trả lời có thể chứa nội dung nội bộ; chỉ chia sẻ sau khi redaction.
- `npm.cmd run report:ds`: tính lại từ bằng chứng lần chạy mới nhất, không gửi lại chat. Có thể chỉ định run ID: `npm.cmd run report:ds -- 2026-11-19T09-20-24-728Z` (thay bằng run ID DS thật).
- Chưa chạy / bị chặn / thiếu bằng chứng: FAIL nghiệm thu, lý do riêng, không coi là lỗi ứng dụng.

## Cấu trúc

- `data/cases.json`: 8 mã và tiêu chí gốc.
- `src/scenarios.js`: fixture giả lập, prompt JSON chung.
- `src/assertions.js`: kiểm tra quyết định riêng từng case.
- `src/ui.js`, `src/sse.js`, `src/snapshot.js`: transport và kiểm tra trạng thái quan sát.
- `scripts/run-ds.mjs`, `src/report.js`: chạy batch và xuất PASS/FAIL.
- `tests/unit`: bộ kiểm tra code, dữ liệu đúng/sai, báo cáo, SSE.
