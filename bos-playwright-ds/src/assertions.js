import {fixtures} from './scenarios.js';
const str=x=>typeof x==='string'&&x.trim().length>0;
const enums=['reuse','extend','create_agent','defer','review_existing_proposal'];
const bools=['requires_approval','capacity_limited','duplicate_flagged','promote_temporary'];
export function parseAnswer(text){
 if(!str(text))throw new Error('Không có phản hồi');
 let s=text.trim().replace(/^\[TRẠNG THÁI TRÍCH XUẤT: OK\]\s*/u,'');const fence=s.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);if(fence)s=fence[1];
 if(/câu trả lời bị cắt|response (?:was )?truncated/iu.test(s))throw new Error('Phản hồi bị cắt');
 let parsed;try{parsed=JSON.parse(s);}catch{throw new Error('Phản hồi không phải JSON đúng schema yêu cầu');}return parsed;
}
export function checkDecision(id,answer){
 const f=fixtures[id];if(!f)throw new Error('Unknown DS case');
 const checks=[];const add=(name,ok)=>checks.push({name,pass:!!ok});
 const list=answer?.decisions;
 const valid=Array.isArray(list)&&list.length===f.work_items.length&&f.work_items.every(w=>list.filter(d=>d?.work_id===w.id).length===1)&&list.every(d=>enums.includes(d.action)&&str(d.reason)&&d.reason.trim().length>=12&&bools.every(k=>typeof d[k]==='boolean')&&['agent_id','proposal_id','skill_key','role_key'].every(k=>d[k]===null||str(d[k])));
 add('Đúng schema, mỗi phần việc có một quyết định và lý do',valid);
 if(!valid)return {pass:false,checks};
 const by=w=>list.find(d=>d.work_id===w),d=by('W1');
 add('ID Agent và proposal đúng fixture',list.every(x=>(x.agent_id===null||f.agents.some(a=>a.id===x.agent_id))&&(x.proposal_id===null||f.pending_proposals.some(p=>p.id===x.proposal_id))));
 const permanent=f.agents.filter(a=>a.kind==='permanent').map(a=>a.id);add('Không thêm hoặc biến sub-agent thành nhân sự lâu dài',Array.isArray(answer.permanent_agent_ids)&&answer.permanent_agent_ids.length===permanent.length&&new Set(answer.permanent_agent_ids).size===permanent.length&&permanent.every(x=>answer.permanent_agent_ids.includes(x))&&list.every(x=>!x.promote_temporary));
 add('Đề xuất mới phải có phê duyệt, không gán Agent đã tồn tại',list.every(x=>x.action!=='create_agent'||(x.requires_approval&&x.agent_id===null&&str(x.role_key))));
 add('Reuse/extend phải tham chiếu Agent lâu dài đang active',list.every(x=>!['reuse','extend'].includes(x.action)||f.agents.some(a=>a.id===x.agent_id&&a.kind==='permanent'&&a.status==='active'&&a.remaining_capacity>0)));
 switch(id.slice(-3)){
 case '001':add('Reuse Agent đủ năng lực QA-A1',d.action==='reuse'&&d.agent_id==='QA-A1'&&d.skill_key==='lead_triage');break;
 case '002':add('Extend Agent gần phù hợp trước khi tạo mới',d.action==='extend'&&d.agent_id==='QA-A2'&&d.skill_key==='lead_dedupe');break;
 case '006':add('Xét capacity = 0 và không giao thêm cho Agent quá tải',d.capacity_limited&&['defer','create_agent'].includes(d.action)&&d.agent_id===null);break;
 case '007':add('Đánh dấu proposal trùng đang chờ duyệt, không tạo trùng',d.duplicate_flagged&&d.proposal_id==='QA-P7'&&d.action==='review_existing_proposal'&&d.role_key==='stock_reconcile');break;
 case '009':{const b=by('W2');add('Reuse phần phù hợp',d.action==='reuse'&&d.agent_id==='QA-A9'&&d.skill_key==='lead_triage');add('Chỉ tạo năng lực thiếu, không gán sai skill',b.action==='create_agent'&&b.skill_key==='invoice_audit'&&b.requires_approval);break;}
 case '010':add('Temporary đã hoàn thành không được reuse như Permanent',d.agent_id===null&&['defer','create_agent'].includes(d.action)&&!d.promote_temporary);break;
 case '011':add('Đề xuất create_agent cho năng lực thiếu',d.action==='create_agent'&&d.skill_key==='inventory_audit'&&d.requires_approval);break;
 case '012':add('Defer khi chưa đủ dữ kiện',d.action==='defer'&&d.agent_id===null&&Array.isArray(answer.missing_information)&&f.missing_information.every(x=>answer.missing_information.includes(x)));break;
 }
 return {pass:checks.every(c=>c.pass),checks};
}
export function evaluate(id,evidence,answer){
 const checks=[];const add=(name,pass)=>checks.push({name,pass:!!pass});
 add('Đã gửi đúng request và nhận SSE done',evidence?.forwarded===true&&evidence?.done===true);
 add('Phiên chat mới đã lưu',evidence?.sessionPersisted===true);
 add('Không thay đổi dữ liệu Goal/Agent/Proposal quan sát được',evidence?.unchanged===true);
 try{checks.push(...checkDecision(id,parseAnswer(answer)).checks);}catch(e){add(e.message,false);}
 const scenarioPass=checks.every(c=>c.pass);
 // Never claim original live fixture / backend planner is verified by synthetic chat.
 return {status:scenarioPass?'PASS':'FAIL',acceptance:'FAIL',checks,reason:scenarioPass?'Đạt kiểm thử quyết định trên tình huống giả lập qua WCC UI.':checks.filter(x=>!x.pass).map(x=>x.name).join('; '),acceptanceReason:'Chưa có fixture nghiệp vụ thật và bằng chứng Planner/Policy backend; FAIL nghiệm thu do thiếu chứng cứ, không đồng nghĩa bug.'};
}
