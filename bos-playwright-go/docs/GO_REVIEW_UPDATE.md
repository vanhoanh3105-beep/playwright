# GO — review kết quả probe đã chạy

Giải nén patch tại thư mục bos-playwright-go (cùng cấp package.json). Không ghi đè .env, phiên đăng nhập, contract hay kết quả cũ.

Chạy `npm.cmd run verify`, rồi `node scripts/review-go.mjs`.
Script không cần mạng, không gửi chat. Dùng sse-probe.json và sse-answer.local.txt hiện có; đối chiếu độ dài, không phải xác minh hash hoặc nguồn gốc nội dung. Nếu probe đã chạy lại ở chế độ read-only, không được dùng kết quả cũ để kết luận.

Kết quả: results/groups/GO/review.csv (10 dòng), review.json và review-detail.json. 001 NEEDS_REVIEW nếu transport hợp lệ; 9 case khác NOT_RUN trong báo cáo review này. Không ghi đè cases.csv/cases.json. Tín hiệu nội dung theo từ khóa chỉ dành cho sàng lọc; không chứng minh chính xác dữ liệu, policy hay chất lượng. Không lưu nội dung câu trả lời vào báo cáo review.

Cần developer cung cấp mapping API kết quả phân tích/WorkforceRequirement và plan, task, policy, capability, test fixtures tenant A/B cho GO-014. Không gán ID phiên chat cho plan. Không bật confirmed=true trước khi xác minh đầy đủ.
