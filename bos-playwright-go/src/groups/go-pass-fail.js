// Binary acceptance gate + independent UI check. Never turn text matches into business PASS.
import { inspectAnswer, safePlanningWire } from './go-ui-batch.js';
export const requirements = Object.freeze({
 'WF-GO-001':'Thiếu xác minh kết quả phân tích/workflow hợp lệ của yêu cầu và trạng thái kết quả thực tế.',
 'WF-GO-002':'Thiếu WorkforceRequirement và đối chiếu từng đầu vào, công việc, năng lực, phụ thuộc, KPI, giới hạn rủi ro.',
 'WF-GO-004':'Thiếu đối chiếu ID của từng nhu cầu Agent với Goal/Task hợp lệ.',
 'WF-GO-005':'Thiếu justification của từng đề xuất và liên kết với khoảng trống nghiệp vụ.',
 'WF-GO-006':'Thiếu policy/audit độc lập của từng quyền đề xuất và bằng chứng không tự cấp quyền.',
 'WF-GO-009':'Thiếu snapshot Agent/Skills/Tools/Connections/ngân sách/policy đầy đủ và đối chiếu với dữ liệu CEO dùng.',
 'WF-GO-010':'Thiếu lỗi validation rõ ràng và snapshot đầy đủ Goal/Plan trước/sau.',
 'WF-GO-012':'Thiếu đối chiếu công việc, năng lực, phụ thuộc, liên kết Agent cho hai mục tiêu độc lập.',
 'WF-GO-013':'Thiếu đánh giá ngữ nghĩa về thông tin chưa xác minh và KPI chưa được người dùng chốt.',
 'WF-GO-014':'Chưa thực hiện request ngoài scope: cần tenant QA thứ hai và actor/observer hợp lệ.'
});
const fail=reason=>({status:'FAIL',reason});
const pass=reason=>({status:'PASS',reason});
const hasNonnegative=(x,k)=>Number.isInteger(x?.[k])&&x[k]>=0;
function noUnexpected(e,keys){return keys.every(k=>hasNonnegative(e.newCounts,k)&&e.newCounts[k]===0);}
export function assessUi(row,e,answer,runId){
 if(!Object.hasOwn(requirements,row.id))return fail('ID không thuộc nhóm GO.');
 if(row.id==='WF-GO-014')return fail('Không chạy: thiếu fixture tenant QA thứ hai.');
 if(!e||e.caseId!==row.id||e.runId!==runId)return fail('Thiếu bằng chứng đúng ID và lần chạy.');
 if(e.error)return fail('Lỗi khi thực hiện hoặc thu thập bằng chứng: '+e.error);
 if(!noUnexpected(e,['goals','agents']))return fail('Không xác minh được Goal/Agent không phát sinh ngoài dự kiến.');
 if(row.id==='WF-GO-010'){
  if(!noUnexpected(e,['proposals','planRefs','sessions']))return fail('Có phát sinh dữ liệu hoặc thiếu snapshot sau đầu vào rỗng.');
  if(e.uiDisabled===true&&e.forwarded!==true)return pass('UI khóa nút gửi khi rỗng; không có ID mới trong snapshot quan sát. Chỉ kiểm tra UI.');
  if(e.forwarded===false&&e.rejected===0&&e.http==null)return pass('Click gửi rỗng không phát sinh request; không có ID mới trong snapshot quan sát. Chỉ kiểm tra UI, chưa có lỗi validation.');
  return fail('Không chứng minh UI ngăn gửi rỗng; có request, guard chặn hoặc thiếu bằng chứng.');
 }
 if(e.forwarded!==true||e.http!==200||e.sse?.done!==true||e.sse?.events?.includes('done')!==true||e.transport!=='PASS_TRANSPORT'||e.sessionPersisted!==true)return fail('Chưa chứng minh gửi, nhận SSE hoàn chỉnh và lưu phiên mới.');
 if(!safePlanningWire(e.wireMode?.run_mode))return fail('Không có bằng chứng chế độ lập kế hoạch trên request.');
 if(typeof answer!=='string'||!answer.trim())return fail('Thiếu nội dung trả lời thực tế.');
 // Runner stores exactly content + newline. Check length to detect missing evidence.
 if(answer.length!==e.sse.contentLength)return fail('Độ dài file phản hồi không khớp bằng chứng SSE.');
 const a=inspectAnswer(row.id,answer);
 if(a.truncated)return fail('Phản hồi có dấu hiệu bị cắt.');
 if(!a.total||a.found!==a.total)return fail(`${a.found}/${a.total} dấu hiệu; thiếu: ${a.checks.filter(c=>!c.found).map(c=>c.name).join(', ')}.`);
 return pass(`HTTP 200, SSE done, phiên mới lưu thành công, ${a.found}/${a.total} dấu hiệu nội dung. Không phải assertion nghiệp vụ.`);
}
export function evaluate(row,e,answer,runId){
 const ui=assessUi(row,e,answer,runId);
 // Current UI runner never captures original acceptance evidence (contract/policy/etc).
 // This is a release-gate FAIL, NOT an assertion that the WCC feature is defective.
 let reason=requirements[row.id]||'Không có tiêu chí nghiệm thu cho ID.';
 if(e?.sse?.resultKind==='unverified')reason+=' Backend đánh dấu kết quả unverified.';
 if(ui.status==='FAIL')reason+=' Kiểm tra UI: '+ui.reason;
 return {...row,status:'FAIL',uiStatus:ui.status,uiReason:ui.reason,reason,actual:`UI ${ui.status}: ${ui.reason}`,bugNote:'Nghiệm thu chưa đạt do thiếu bằng chứng nghiệp vụ; không tự xác nhận bug WCC.'};
}
