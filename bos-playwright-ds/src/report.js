import fs from 'node:fs';
import path from 'node:path';
import {cases} from './scenarios.js';
import {evaluate} from './assertions.js';
export const base=path.resolve('results/groups/DS');
const csv=v=>'"'+String(v??'').replace(/[\r\n]+/g,' ').replace(/^[=+@\-\t]/,"'$&").replace(/"/g,'""')+'"';
export function rowsFor(runDir,runId){
 return cases.map(c=>{
  let evidence=null,answer=null;
  try{const e=JSON.parse(fs.readFileSync(path.join(runDir,c.id+'.json'),'utf8'));if(e.caseId===c.id&&e.runId===runId)evidence=e;}catch{}
  if(evidence)try{answer=fs.readFileSync(path.join(runDir,c.id+'.answer.local.txt'),'utf8');}catch{}
  const verdict=evaluate(c.id,evidence,answer);return {...c,...verdict,reason:evidence?.error?`${evidence.error}; ${verdict.reason}`:verdict.reason,actual:evidence?.actual||'Chưa thực hiện hoặc không có bằng chứng đúng run',evidence:evidence?`${c.id}.json`:'',durationMs:evidence?.durationMs??0,runId};
 });
}
export function writeReport(runDir,runId,output=base){
 const rows=rowsFor(runDir,runId);const count=k=>({PASS:rows.filter(r=>r[k]==='PASS').length,FAIL:rows.filter(r=>r[k]==='FAIL').length});
 const result={runId,scope:'Kiểm thử quyết định AI với fixture giả lập qua WCC; nghiệm thu gốc cần fixture thật & Planner/Policy backend.',statuses:count('status'),acceptanceStatuses:count('acceptance'),rows};
 const heads=['ID','Ưu tiên','Trạng thái','Nghiệm thu gốc','Điều kiện tiền đề gốc','Kết quả mong đợi gốc','Kết quả thực tế','Lý do','Lý do nghiệm thu gốc','Bằng chứng','Thời gian (ms)','Run ID'];
 const table=[heads,...rows.map(r=>[r.id,r.priority,r.status,r.acceptance,r.precondition,r.expected,r.actual,r.reason,r.acceptanceReason,r.evidence,r.durationMs,runId])];
 const text='\uFEFF'+table.map(row=>row.map(csv).join(',')).join('\r\n')+'\r\n';
 for(const dir of new Set([runDir,output])){fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'pass-fail.csv'),text,'utf8');fs.writeFileSync(path.join(dir,'pass-fail.json'),JSON.stringify(result,null,2)+'\n','utf8');}
 return result;
}
export function latestRun(output=base){const dir=path.join(output,'ui-runs');return fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()&&/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(e.name)&&fs.existsSync(path.join(dir,e.name,'pass-fail.json'))).map(e=>e.name).sort().at(-1);}
