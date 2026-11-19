import fs from 'node:fs';
export const cases=JSON.parse(fs.readFileSync(new URL('../data/cases.json',import.meta.url),'utf8'));
export const caseIds=cases.map(c=>c.id);
const agent=(id,skills,extra={})=>({id,kind:'permanent',status:'active',skills,remaining_capacity:5,...extra});
const work=(id,skill,description)=>({id,skill,description});
const scenario=(goal,agents,works,extra={})=>({goal,agents,work_items:works,registered_skills:[...new Set(works.map(w=>w.skill))],pending_proposals:[],...extra});
// Synthetic input is always explicitly labeled in the chat. No real records are created.
export const fixtures={
 'WF-DS-001':scenario('Phân loại 2 lead mẫu',[agent('QA-A1',['lead_triage'])],[work('W1','lead_triage','Phân loại 2 lead')]),
 'WF-DS-002':scenario('Phân loại lead có dữ liệu trùng',[agent('QA-A2',['lead_triage'])],[work('W1','lead_dedupe','Loại trùng lead')],{extension_allowed:true,registered_skills:['lead_triage','lead_dedupe'],extension_cost:1}),
 'WF-DS-006':scenario('Tiếp nhận thêm 2 lead',[agent('QA-A6',['lead_triage'],{remaining_capacity:0})],[work('W1','lead_triage','Phân loại lead mới')]),
 'WF-DS-007':scenario('Cần năng lực đối chiếu tồn kho',[],[work('W1','stock_reconcile','Đối chiếu tồn kho')],{pending_proposals:[{id:'QA-P7',role_key:'stock_reconcile',status:'pending_approval'}]}),
 'WF-DS-009':scenario('Phân loại lead và kiểm tra hóa đơn',[agent('QA-A9',['lead_triage'])],[work('W1','lead_triage','Phân loại lead'),work('W2','invoice_audit','Kiểm tra hóa đơn')],{extension_allowed:false}),
 'WF-DS-010':scenario('Xem lại công việc phân loại lead',[agent('QA-T10',['lead_triage'],{kind:'temporary',status:'completed',task_status:'completed',remaining_capacity:0})],[work('W1','lead_triage','Đánh giá nhu cầu cho nhiệm vụ tương tự')]),
 'WF-DS-011':scenario('Xử lý hồ sơ kiểm kê mẫu',[],[work('W1','inventory_audit','Kiểm kê hồ sơ')]),
 'WF-DS-012':scenario('Chỉ đánh giá nhu cầu nhân sự; phạm vi, khối lượng và thời hạn chưa xác định',[],[work('W1','unknown','Chưa đủ dữ kiện để xác định năng lực')],{registered_skills:[],missing_information:['scope','volume','deadline']})
};
export function buildPrompt(id,nonce){
 if(!fixtures[id])throw new Error('Unknown DS case');
 return `[QA-${id}-${nonce}] Đây là tình huống KIỂM THỬ GIẢ LẬP độc lập. Không dùng ID này để truy vấn hay ghi dữ liệu thật; không tạo/sửa proposal, plan, agent hoặc giao việc. Không gửi email, cấp quyền, kích hoạt agent hoặc hành động bên ngoài. Chỉ phân tích dữ liệu fixture sau đây như một Workforce Planner: ${JSON.stringify(fixtures[id])}\nTrả lời chỉ bằng một JSON object (không giải thích ngoài JSON), theo schema {"decisions":[{"work_id":"W1","action":"reuse|extend|create_agent|defer|review_existing_proposal","agent_id":null,"proposal_id":null,"skill_key":null,"role_key":null,"reason":"lý do cụ thể dựa trên fixture","requires_approval":false,"capacity_limited":false,"duplicate_flagged":false,"promote_temporary":false}],"permanent_agent_ids":[],"missing_information":[]}. Mỗi work_item phải có đúng một quyết định. action chỉ dùng MỘT giá trị trong enum, không dùng dấu |. Dùng null khi không áp dụng, dùng đúng ID của fixture khi có liên kết. Không khẳng định đã thực hiện hành động. Nếu đề xuất tạo Agent mới, phải nêu lý do và điều kiện phê duyệt. permanent_agent_ids chỉ liệt kê Agent lâu dài đã tồn tại trong fixture. Không bịa dữ liệu.`;
}
