# AI Brain · BOS Workforce Lifecycle

## Chạy lần đầu trên Windows

Giải nén, mở thư mục có runner.py trong File Explorer, gõ powershell vào thanh địa chỉ. Cần Python 3.10 trở lên và tài khoản có quyền vào tenant QA.

    py -m venv .venv
    .\.venv\Scripts\python -m pip install -r requirements.txt
    .\.venv\Scripts\python -m playwright install chromium
    .\.venv\Scripts\python runner.py list
    .\.venv\Scripts\python runner.py login
    .\.venv\Scripts\python runner.py run --case WF-GO-013

Khi cửa sổ Chromium mở, đăng nhập, mở đúng agent và phiên chat, quay lại PowerShell rồi nhấn Enter. Chạy login lại nếu phiên hết hạn. .auth.json chứa phiên đăng nhập, chỉ giữ trên máy cá nhân.

## Chat

Chạy một ca trước. Bộ chạy gửi tin [TEST-QA] vào đúng phiên được cung cấp, vì vậy lịch sử chat trước đó có thể ảnh hưởng kết quả. Muốn tách dữ liệu, mở phiên QA riêng và thay TARGET trong runner.py. Kiểm tra điều kiện tiền đề trong Excel trước khi chạy.

Selector trong settings.json là giá trị khởi đầu chưa xác minh trên bản dựng. Nếu trình duyệt mở đúng trang nhưng timeout, nhấn F12 → Inspect để xác định ô nhập, nút gửi và phần tử bao quanh *mỗi phản hồi trợ lý*. Trong settings.json chỉnh ui.composer, ui.send và ui.assistant tương ứng. Để send trống nếu Enter gửi tin. Selector assistant phải bỏ qua tin người dùng, ô nhập và chỉ báo đang soạn. Có thể dùng công cụ chọn locator:

    .\.venv\Scripts\playwright codegen --load-storage=.auth.json "https://wcc.hoanh.aflowbiz.com/co/FLEET-HOANH/ai-brain?agent=e2486e01-bab8-4adb-9b24-f691b861e7de&phien=595245c4-1177-4d45-8cd3-526fc8ee851b"

Dùng selector CSS cho các trường cấu hình. Sau khi gửi thành công, runner lưu text và ảnh tại thời điểm xuất hiện câu trả lời. Nếu câu trả lời đang stream, đối chiếu lại tin hoàn chỉnh trong chat theo mã [TEST-QA]. Các ca Goal cần đối chiếu nội dung/kế hoạch thực và tiêu chí Excel trước khi kết luận.

## API

Năm ca đọc dữ liệu có kiểm tra tự động. Dùng tài khoản đúng scope và record QA đã biết giá trị chuẩn. Trong settings.json → records → mã ca, điền path thật (phần URL bắt đầu từ / trên cùng host), expected theo dữ liệu fixture độc lập, mapping theo tên trường thực tế. Không sao chép response vừa kiểm thử làm kết quả mong đợi. Ví dụ minh họa cấu trúc cho WF-PL-017:

    {
      "path": "/THAY-BANG-ROUTE-THAT/plan-qa-01",
      "mapping": {"id":"data.id","goal_id":"data.goal_id","version":"data.version","proposals":"data.proposals","costs":"data.costs","warnings":"data.warnings"},
      "expected": {"id":"plan-qa-01","goal_id":"goal-qa-01","version":1,"proposals":[],"costs":0,"warnings":[]}
    }

Danh sách trường bắt buộc nằm ở FIELDS trong runner.py và trong báo cáo khi thiếu fixture. Mảng và object được so sánh đầy đủ. API dùng cookie của phiên đã lưu. Nếu dự án yêu cầu bearer token hoặc API ở host riêng, cần bổ sung cơ chế xác thực theo hợp đồng của dự án.

## Báo cáo

    .\.venv\Scripts\python runner.py run --case WF-PL-017
    .\.venv\Scripts\python runner.py run

Mở results/<lần chạy>/report.csv bằng Excel. Mỗi dòng giữ điều kiện, bước và kỳ vọng gốc. Runner đọc sheet Test Cases mỗi lần chạy, bỏ qua trạng thái cũ. Có thể dùng --book "đường dẫn Excel" với cùng tên sheet và tiêu đề. 128 mã hiện chỉ được liệt kê với lý do chưa chạy. Mã thoát 0 khi tất cả đạt, 1 nếu có ca không đạt, 2 nếu có ca chưa kết luận. Lỗi thực thi cần kiểm tra locator, phiên hoặc kết nối trước khi báo lỗi sản phẩm.
