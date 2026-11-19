const fs=require('node:fs');const path=require('node:path');
const cases=require('../data/cases.json');
const readiness=[{id:'RD-GO-001',actor:'CEO',expected:'Mở đúng Bộ não AI, ô hỏi và nút gửi hiển thị'},{id:'RD-GO-002',actor:'CEO',expected:'Mở đúng Goal, tiêu đề trang hiển thị'}];
function seedRows(kind){return (kind==='readiness'?readiness:cases).map(c=>({...c,status:'NOT_RUN',actual:'Chưa thực hiện',reason:'Chưa có kết quả từ lần chạy',durationMs:0,evidence:'',bugNote:''}));}
function csv(v){let s=String(v??'').replace(/[\r\n]+/g,' ');if(/^[=+\-@\t]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
function writeReport(dir,kind,rows,runId){
 fs.mkdirSync(dir,{recursive:true});
 const headings=['STT','ID','Ưu tiên','Ai','Điều kiện tiền đề','Các bước thực hiện','Kết quả mong đợi','Kết quả thực tế','Trạng thái','Lý do','Thời gian (ms)','Bằng chứng / Log','Bug ID / Ghi chú','Nguồn đối chiếu','Run ID'];
 const lines=[headings.map(csv).join(','),...rows.map(r=>[r.stt,r.id,r.priority,r.actor,r.preconditions,r.steps,r.expected,r.actual,r.status,r.reason,r.durationMs,r.evidence,r.bugNote,r.source,runId].map(csv).join(','))];
 const statuses={};for(const r of rows)statuses[r.status]=(statuses[r.status]||0)+1;
 const summary={group:'GO',kind,runId,total:rows.length,attempted:rows.filter(r=>r.status!=='NOT_RUN').length,statuses,generatedAt:new Date().toISOString(),rows};
 fs.writeFileSync(path.join(dir,`${kind}.csv`),'\ufeff'+lines.join('\r\n')+'\r\n','utf8');fs.writeFileSync(path.join(dir,`${kind}.json`),JSON.stringify(summary,null,2));return summary;
}
module.exports={seedRows,writeReport};
