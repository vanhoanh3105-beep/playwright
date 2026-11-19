// Read-only API verification. No writes to WCC. --apply-goals maps only verified list locally.
import 'dotenv/config';
import fs from 'node:fs';
import { request } from '@playwright/test';
import { openApi } from '../src/http.js';
import { config, qaUrl } from '../src/config.js';
const apply=process.argv.slice(2).includes('--apply-goals');
const report=[];
const api=await openApi({request},'ceo');
let companyId,goalUrl;
async function get(path,validator){
 try{
  const res=await api.get(qaUrl(path).toString(),{maxRedirects:0,timeout:20000});
  if(!res.ok()){report.push({api:path.split('?')[0],http:res.status(),status:'BLOCKED'});return;}
  const body=await res.json();const ok=validator(body);
  report.push({api:path.split('?')[0],http:res.status(),status:ok?'PASS_READ':'NEEDS_REVIEW'});return ok?body:undefined;
 }catch{report.push({api:path.split('?')[0],status:'NEEDS_REVIEW',reason:'Không đọc được response JSON hoặc cấu trúc chưa phù hợp'});}
}
try{
 await get('/api/auth/me/',d=>typeof d.id==='string'&&typeof d.role==='string');
 const code=config('QA_TENANT',{required:true});
 const companies=await get('/api/companies/',d=>Array.isArray(d.results));
 const found=companies?.results.filter(x=>x.code===code&&typeof x.id==='string'&&x.id.length>0)||[];
 if(found.length!==1){report.push({api:'company lookup',status:'BLOCKED',reason:'Không tìm thấy duy nhất company đúng QA_TENANT trong response; không dùng ID giả'});}
 else{
  companyId=found[0].id;const q=new URLSearchParams({company_id:companyId});const listq=new URLSearchParams({company_id:companyId,page_size:'100'});
  const path='/api/objectives/?'+listq;
  const g=await get(path,d=>Array.isArray(d.results)&&Number.isInteger(d.count)&&d.results.every(x=>typeof x.id==='string'&&typeof x.title==='string'));
  if(g&&g.count===g.results.length&&g.next==null)goalUrl=path;
  else if(g)report.push({api:'/api/objectives/',status:'NEEDS_REVIEW',reason:'Danh sách Goal có phân trang; snapshot hiện tại yêu cầu danh sách đầy đủ'});
  await get('/api/objectives/portfolio/?'+q,d=>!!d.summary&&typeof d.summary.total==='number');
  await get('/api/ai/workforce/agents/?'+q,d=>Array.isArray(d.agents)&&Array.isArray(d.proposals)&&!!d.overview);
  await get('/api/ai/brain/sessions/?'+q,d=>Array.isArray(d.sessions));
  await get('/api/approvals/pending_count/?'+q,d=>typeof d.count==='number');
 }
 if(apply&&goalUrl){
  const f='config/go.contract.json';const c=JSON.parse(fs.readFileSync(f,'utf8'));
  const backup=f+'.backup-'+Date.now();fs.copyFileSync(f,backup);
  c.lists??={};c.lists.goals={url:goalUrl,itemsPath:'results',idPath:'id',totalPath:'count'};
  // Never confirm full contract; all existing non-goal mappings remain untouched.
  fs.writeFileSync(f,JSON.stringify(c,null,2)+'\n');
  console.log('Đã lưu mapping GET Goal vào contract local và tạo backup. Không đổi confirmed.');
 }
}finally{await api.dispose();fs.mkdirSync('results/groups/GO',{recursive:true});fs.writeFileSync('results/groups/GO/api-readiness.json',JSON.stringify(report,null,2));console.table(report);console.log('PASS_READ chỉ là kiểm tra API đọc, không tính PASS 10 WF-GO.');}
