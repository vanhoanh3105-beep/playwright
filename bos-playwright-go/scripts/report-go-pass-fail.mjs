import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {evaluate} from '../src/groups/go-pass-fail.js';
import {caseIds} from '../src/groups/go-ui-batch.js';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(project,'results','groups','GO');
const root=path.join(base,'ui-runs');
function readJson(p){return JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));}
function readEvidence(dir,id){try{return readJson(path.join(dir,id+'.json'));}catch{return null;}}
function readAnswer(dir,id){try{return fs.readFileSync(path.join(dir,id+'.answer.local.txt'),'utf8').replace(/\n$/,'');}catch{return null;}}
const csv=v=>'"'+String(v??'').replace(/[\r\n]+/g,' ').replace(/^[=+@\-\t]/,"'$&").replace(/"/g,'""')+'"';
export function createBinaryReport(runId, {outputBase=base}={}){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(runId))throw new Error('Run ID không hợp lệ.');
 const dir=path.join(outputBase,'ui-runs',runId),raw=readJson(path.join(dir,'ui-batch.json'));
 if(raw.runId!==runId||raw.kind!=='ui-batch'||!Array.isArray(raw.rows)||raw.rows.length!==caseIds.length||caseIds.some(id=>raw.rows.filter(r=>r.id===id).length!==1))throw new Error('Báo cáo nguồn không khớp 10 ID hoặc lần chạy.');
 const rows=raw.rows.map(row=>evaluate(row,readEvidence(dir,row.id),readAnswer(dir,row.id),runId));
 const tally=key=>({PASS:rows.filter(r=>r[key]==='PASS').length,FAIL:rows.filter(r=>r[key]==='FAIL').length});
 const result={runId,scope:'Nghiệm thu tiêu chí gốc; thiếu chứng cứ = FAIL nghiệm thu, không đồng nghĩa bug.',statuses:tally('status'),uiStatuses:tally('uiStatus'),rows};
 const headings=['ID','Trạng thái','Kiểm tra UI','Kết quả mong đợi','Kết quả thực tế','Lý do','Phạm vi kết luận','Run ID'];
 const data=[headings,...rows.map(r=>[r.id,r.status,r.uiStatus,r.expected,r.actual,r.reason,r.bugNote,runId])];
 const body='\ufeff'+data.map(r=>r.map(csv).join(',')).join('\r\n')+'\r\n';
 for(const target of [dir,outputBase]){fs.writeFileSync(path.join(target,'pass-fail.csv'),body,'utf8');fs.writeFileSync(path.join(target,'pass-fail.json'),JSON.stringify(result,null,2)+'\n','utf8');}
 return result;
}
function latest(){return fs.readdirSync(root,{withFileTypes:true}).filter(x=>x.isDirectory()&&fs.existsSync(path.join(root,x.name,'ui-batch.json'))).map(x=>x.name).sort().at(-1);}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{const runId=process.argv[2]||latest();if(!runId)throw new Error('Không tìm thấy lần chạy UI.');const s=createBinaryReport(runId);console.table(s.rows.map(r=>({ID:r.id,Status:r.status,UI:r.uiStatus,Reason:r.reason})));console.log(JSON.stringify({statuses:s.statuses,uiStatuses:s.uiStatuses,report:path.join(base,'pass-fail.csv')},null,2));console.log('FAIL nghiệm thu do thiếu bằng chứng không đồng nghĩa bug WCC.');}catch(e){console.error(e.message);process.exitCode=2;}
}
