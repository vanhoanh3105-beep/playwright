// Local-only: no Playwright, network, or changes to the original case reports.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reviewGoal001 } from '../src/groups/go-review.js';
import { seedRows, writeReport } from '../reporters/report-data.cjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'results','groups','GO');
let probe,answer;
try { probe=JSON.parse(fs.readFileSync(path.join(dir,'sse-probe.json'),'utf8').replace(/^\uFEFF/,'')); }
catch { console.error('Cannot read sse-probe.json.'); process.exit(2); }
try { answer=fs.readFileSync(path.join(dir,'sse-answer.local.txt'),'utf8'); }
catch { answer=undefined; }
const review=reviewGoal001(probe,answer);
const rows=seedRows('cases');
const row=rows.find(r=>r.id===review.caseId);
Object.assign(row,{status:review.status,actual:`${review.transport}; ${review.signalCount}/${review.checks.length} dấu hiệu nội dung (không phải assertion nghiệp vụ); bị cắt: ${review.truncated?'có':'chưa thấy'}`,reason:review.issues.join(' '),evidence:'sse-probe.json; sse-answer.local.txt (chỉ xem nội bộ)',bugNote:review.truncated?'Ứng viên lỗi: kiểm tra giới hạn phản hồi 6000 ký tự; chưa có Bug ID.':''});
for(const r of rows) if(r.id!==review.caseId) r.reason='Không thuộc lần probe GO-001; xem cases.csv để biết trạng thái lần chạy suite gốc.';
const report=writeReport(dir,'review',rows,`review-${new Date().toISOString()}`);
fs.writeFileSync(path.join(dir,'review-detail.json'),JSON.stringify({sourceRunAt:probe.runAt,source:'local probe and answer; length check only, not cryptographic binding',...review},null,2));
console.log(JSON.stringify({caseId:review.caseId,transport:review.transport,businessStatus:review.status,signalsFound:review.signalCount,signalsTotal:review.checks.length,truncated:review.truncated,resultKind:review.backendResultKind,toolEvents:review.toolEvents,statuses:report.statuses,files:['review.csv','review.json','review-detail.json']},null,2));
console.log('Review only. No business PASS; cases.csv unchanged.');
