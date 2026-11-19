// UI evidence is deliberately distinct from the strict GO business assertions.
export const prompts = {
  'WF-GO-001': 'Tự động hóa tiếp nhận và phân loại khách hàng tiềm năng (lead). Phân tích mục tiêu và đề xuất kế hoạch công việc.',
  'WF-GO-002': 'Doanh nghiệp QA Solar hoạt động trong ngành năng lượng mặt trời. Quy trình: tiếp nhận lead từ biểu mẫu, phân loại theo nhu cầu và bàn giao cho kinh doanh. Phân tích mục tiêu, công việc, năng lực, phụ thuộc, chỉ tiêu và giới hạn rủi ro.',
  'WF-GO-004': 'Cần tự động hóa tiếp nhận và phân loại lead; xác định các nhu cầu Agent liên quan đến công việc.',
  'WF-GO-005': 'Bộ phận kinh doanh QA đang thiếu người phân loại lead ngoài giờ; lead chậm được chuyển cho người phụ trách. Phân tích nhu cầu năng lực và đề xuất Agent cho khoảng trống này.',
  'WF-GO-006': 'Tự động hóa phân loại lead dựa trên dữ liệu mẫu đã có; đây chỉ là mục tiêu nghiệp vụ.',
  'WF-GO-009': 'Tự động hóa phân loại lead dựa trên đội ngũ và tài nguyên hiện có của doanh nghiệp QA.',
  'WF-GO-012': 'Hai mục tiêu độc lập: (1) tiếp nhận và phân loại lead khách hàng tiềm năng; (2) lập báo cáo tồn kho hàng tuần từ dữ liệu kho. Phân tích kế hoạch thực hiện.',
  'WF-GO-013': 'Tôi muốn cải thiện hiệu quả công việc của doanh nghiệp.'
};
export const caseIds = [...Object.keys(prompts).slice(0,6),'WF-GO-010',...Object.keys(prompts).slice(6),'WF-GO-014'];
const lead=/lead|khách hàng tiềm năng/iu, agent=/agent|nhân sự AI|vai trò/iu, task=/công việc|nhiệm vụ|quy trình/iu, kpi=/\bKPI\b|chỉ tiêu/iu, risk=/rủi ro|giới hạn/iu;
const signals={
 'WF-GO-001': [['mục tiêu lead',lead],['quy trình',task],['Agent',agent]],
 'WF-GO-002': [['QA Solar',/QA Solar/iu],['ngành',/năng lượng mặt trời|solar/iu],['công việc',task],['năng lực',/năng lực|kỹ năng/iu],['phụ thuộc',/phụ thuộc|tiền đề/iu],['KPI',kpi],['rủi ro',risk]],
 'WF-GO-004': [['lead',lead],['Agent',agent],['công việc',task]],
 'WF-GO-005': [['Agent',agent],['khoảng trống',/ngoài giờ|chậm|thiếu|khoảng trống/iu],['lý do',/lý do|vì sao|vì|để/iu]],
 'WF-GO-006': [['quyền',/quyền|permission/iu],['công cụ',/công cụ|tool/iu],['policy/phê duyệt',/policy|chính sách|phê duyệt/iu]],
 'WF-GO-009': [['Agent',agent],['skills',/skill|kỹ năng/iu],['tools',/tool|công cụ/iu],['connections',/kết nối|connection/iu],['ngân sách',/ngân sách|chi phí|budget/iu],['policy',/policy|chính sách/iu]],
 'WF-GO-012': [['lead',lead],['tồn kho',/tồn kho|báo cáo kho/iu],['công việc',task],['năng lực',/năng lực|kỹ năng/iu]],
 'WF-GO-013': [['làm rõ',/làm rõ|câu hỏi|chưa xác định|chưa xác minh|cần thêm/iu],['giả định/đề xuất',/giả định|đề xuất|tham khảo/iu],['KPI',kpi]]
};
export function inspectAnswer(id, text){
 const checks=(signals[id]||[]).map(([name,re])=>({name,found:typeof text==='string'&&re.test(text)}));
 return {checks,found:checks.filter(x=>x.found).length,total:checks.length,truncated:typeof text==='string'&&/câu trả lời bị cắt|gõ ["“']?tiếp["”']? để nhận phần còn|response (?:was )?truncated/iu.test(text)};
}
export function additions(before,after){return Object.fromEntries(Object.entries(before).map(([k,ids])=>{const s=new Set(ids);return [k,after[k].filter(x=>!s.has(x)).length];}));}
export function allowedBody(body,company,prompt,previousMode){
 if(!body||body.company_id!==company||body.session_id!==null||body.message!==prompt||typeof body.run_mode!=='string'||!body.run_mode.trim()||typeof body.agent_auto!=='boolean') return false;
 if(/full|toan.?quyen|unrestricted/iu.test(body.run_mode))return false;
 return !previousMode||(body.run_mode===previousMode.run_mode&&body.agent_auto===previousMode.agent_auto);
}
export function assessTransport(stream,before,after){
 const persisted=stream?.done?.message?.role==='assistant'&&typeof stream.sessionId==='string'&&after.sessions.includes(stream.sessionId)&&!before.sessions.includes(stream.sessionId);
 return {transport:persisted?'PASS_TRANSPORT':'NEEDS_REVIEW',sessionPersisted:!!persisted,businessStatus:'NEEDS_REVIEW'};
}

// Labels verified from the WCC mode menu screenshot. Do not read them from stdin.
export const planningLabel = 'Chỉ lập kế hoạch';
export const modeLabels = [planningLabel, 'Hỏi từng bước', 'Tự làm việc nhẹ', 'Toàn quyền'];
export function uniqueCurrentMode(counts){
 const present=modeLabels.filter(x=>counts[x]>0);
 return present.length===1&&counts[present[0]]===1?present[0]:null;
}
export function safePlanningWire(value){
 // auto was observed in the prior probe. Never forward known autonomous modes.
 // Unknown enum semantics are not a confirmed backend policy. Require a clear planning enum.
 return typeof value==='string'&&/^(plan|plan[-_]only|planning|planning[-_]only)$/i.test(value.trim());
}
export async function selectPlanningMode(page){
 const loc=x=>page.getByText(x,{exact:true}).filter({visible:true});
 const state=async()=>uniqueCurrentMode(Object.fromEntries(await Promise.all(modeLabels.map(async x=>[x,await loc(x).count()]))));
 const waitMode=async expected=>{
  const end=Date.now()+5000;
  do{const current=await state();if(current&&(!expected||current===expected))return current;await new Promise(r=>setTimeout(r,150));}while(Date.now()<end);
  throw new Error('Cannot verify a unique closed mode menu; no message sent');
 };
 const current=await waitMode();
 if(current!==planningLabel){
  await loc(current).click({timeout:5000});
  await loc(planningLabel).waitFor({state:'visible',timeout:5000});
  if(await loc(planningLabel).count()!==1)throw new Error('Planning mode option ambiguous');
  await loc(planningLabel).click({timeout:5000});
 }
 await waitMode(planningLabel);
}
