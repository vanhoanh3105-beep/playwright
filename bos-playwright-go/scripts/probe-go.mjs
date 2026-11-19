// Evidence-only probe: never rewrites cases.csv or confirms GO business contract.
import 'dotenv/config';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { chromium, request } from '@playwright/test';
import { config, qaUrl, selectors, storageState, safeWrite } from '../src/config.js';
import { openApi } from '../src/http.js';
import { readBrainSse } from '../src/groups/go-sse.js';
const send=process.argv.includes('--send');
const out='results/groups/GO/sse-probe.json';
const report={runAt:new Date().toISOString(),mode:send?'send-one':'read-only',status:'NOT_RUN',businessStatus:'NOT_RUN',notes:[]};
fs.mkdirSync('results/groups/GO',{recursive:true});
if(send) fs.rmSync('results/groups/GO/sse-answer.local.txt',{force:true});
const save=()=>fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');save();
const nonempty=x=>typeof x==='string'&&x.trim()!=='';
let api,browser,rl,phase='setup';
async function get(route,q={}){
  const u=qaUrl(route); for(const [k,v] of Object.entries(q)) u.searchParams.set(k,v);
  const r=await api.get(u.toString(),{timeout:20000,maxRedirects:0});
  if(!r.ok()) throw new Error(`${route}: HTTP ${r.status()}`);
  try{return await r.json();}catch{throw new Error(`${route}: response not JSON`);}
}
function completeList(body,label){
  if(!Array.isArray(body?.results)||!Number.isInteger(body.count)||body.next!=null||body.count!==body.results.length) throw new Error(`${label}: incomplete/paginated list`);
  return body.results;
}
function uniqueIds(rows,key,label){
  if(!Array.isArray(rows)||rows.some(x=>!nonempty(x?.[key])))throw new Error(`${label}: missing IDs`);
  const ids=rows.map(x=>x[key]);if(new Set(ids).size!==ids.length)throw new Error(`${label}: duplicate IDs`);return ids;
}
function diff(a,b){const before=new Set(a);return b.filter(x=>!before.has(x));}
async function snapshot(company){
  const [goals,workforce,sessions]=await Promise.all([
    get('/api/objectives/',{company_id:company,page_size:'100'}),
    get('/api/ai/workforce/agents/',{company_id:company}),
    get('/api/ai/brain/sessions/',{company_id:company})]);
  const g=completeList(goals,'goals');
  if(g.some(x=>x.company!==company))throw new Error('Goal company not verified');
  return {goals:uniqueIds(g,'id','goals'), agents:uniqueIds(workforce?.agents,'agent_id','agents'),proposals:uniqueIds(workforce?.proposals,'proposal_id','proposals'),planRefs:[...new Set(workforce.proposals.map(x=>x.plan_id).filter(nonempty))],sessions:uniqueIds(sessions?.sessions,'id','sessions')};
}
const counts=s=>Object.fromEntries(Object.entries(s).map(([k,v])=>[k,v.length]));
try {
  if(process.argv.slice(2).some(x=>x!=='--send'))throw new Error('Supported option: --send');
  if(send){
    if(config('QA_ISOLATED_TEST_TENANT')!=='1')throw new Error('QA_ISOLATED_TEST_TENANT=1 required');
    process.env.QA_RUN_ALLOW_WRITES='1';safeWrite('CHAT');
  }
  phase='read-api'; api=await openApi({request},'ceo');
  const me=await get('/api/auth/me/');
  if(!nonempty(me?.id)||!nonempty(me.role))throw new Error('Invalid auth response');
  const companies=completeList(await get('/api/companies/'),'companies');
  const matched=companies.filter(x=>x.code===config('QA_TENANT',{required:true})&&nonempty(x.id));
  if(matched.length!==1)throw new Error('Could not resolve QA company uniquely');
  const company=matched[0].id;
  if(me.company!==company&&!me.companies?.some(x=>x.id===company))throw new Error('QA company membership not verified');
  const before=await snapshot(company);report.before=counts(before);report.readStatus='PASS_READ';save();
  if(!send){report.status='PASS_READ';report.notes.push('Read API only. No messages sent.');}
  else {
    phase='ui';browser=await chromium.launch({headless:false});
    const context=await browser.newContext({storageState:storageState('ceo'),serviceWorkers:'block'});
    const page=await context.newPage(); const target=qaUrl(config('UI_CEO_CHAT_PATH',{required:true}));
    await page.goto(target.toString(),{waitUntil:'domcontentloaded',timeout:30000});
    if(new URL(page.url()).origin!==target.origin||new URL(page.url()).pathname!==target.pathname)throw new Error('Unexpected UI redirect');
    rl=createInterface({input:process.stdin,output:process.stdout});
    console.log('In Chromium select CEO chat, a NEW conversation, and an analysis/approval-required mode. No full authority.');
    console.log('Only continue on an isolated permitted QA tenant without external actions enabled.');
    if((await rl.question('Type QA to confirm (anything else cancels): ')).trim()!=='QA')throw new Error('Cancelled by user');
    const ui=selectors();const input=page.locator(ui.chatInput).filter({visible:true});const button=page.locator(ui.chatSend).filter({visible:true});
    await input.waitFor({state:'visible',timeout:15000});await button.waitFor({state:'visible',timeout:15000});
    if(await input.count()!==1||await button.count()!==1)throw new Error('Chat selectors must be unique');
    const marker=`QA-WF-GO-001-${crypto.randomUUID()}`;
    const prompt=`[${marker}] Phân tích mục tiêu tự động hóa tiếp nhận và phân loại khách hàng tiềm năng. Chỉ phân tích, đề xuất kế hoạch và nhân sự AI; không kích hoạt Agent, không cấp quyền, không gửi email hoặc thực hiện hành động bên ngoài.`;
    await input.fill(prompt);
    const path='/api/ai/brain/chat/stream/';
    // Intercept just this request to ensure correct company, fresh session and exact message before forwarding.
    let forwarded=false;
    await context.route(u=>u.origin===target.origin&&u.pathname===path,async route=>{
      const req=route.request();let body;try{body=req.postDataJSON();}catch{}
      if(forwarded||req.method()!=='POST'||body?.company_id!==company||body?.session_id!==null||body?.message!==prompt){await route.abort();return;}
      forwarded=true;await route.continue();
    });
    phase='send';
    const waiting=page.waitForResponse(r=>{try{return new URL(r.url()).origin===target.origin&&new URL(r.url()).pathname===path&&r.request().method()==='POST'&&r.request().postDataJSON()?.message===prompt;}catch{return false;}},{timeout:60000});
    const [response]=await Promise.all([waiting,button.click({timeout:15000})]);
    report.http=response.status();report.contentType=(response.headers()['content-type']||'').split(';')[0];save();
    phase='sse'; const stream=await readBrainSse(response);
    report.sse={events:stream.types,chunks:stream.chunks,done:true,sessionIdPresent:true,turnIdPresent:true,messageIdPresent:true,contentLength:stream.done.message.content.length,role:stream.done.message.role,metaKeys:Object.keys(stream.done.message.meta).filter(k=>k!=='reasoning')};
    report.transportStatus='DONE_RECEIVED';
    const meta=stream.done.message.meta;
    report.sse.metaEnums=Object.fromEntries(['run_mode','finish_reason','result_kind','ket_cuc'].map(k=>[k,typeof meta[k]==='string'&&/^[a-z0-9_-]{1,64}$/i.test(meta[k])?meta[k]:'unverified']));
    fs.writeFileSync('results/groups/GO/sse-answer.local.txt',stream.done.message.content+'\n');
    report.notes.push('Final answer saved separately for local review; do not share unredacted.');save();
    phase='read-after'; let after;
    for(let i=0;i<4;i++){after=await snapshot(company);if(after.sessions.includes(stream.sessionId))break;await new Promise(r=>setTimeout(r,1500));}
    report.after=counts(after);
    report.sessionPersisted=after.sessions.includes(stream.sessionId)&&!before.sessions.includes(stream.sessionId);
    report.newCounts=Object.fromEntries(Object.keys(before).map(k=>[k,diff(before[k],after[k]).length]));
    report.status=report.sessionPersisted&&stream.done.message.role==='assistant'?'PASS_TRANSPORT':'NEEDS_REVIEW';
    report.businessStatus='NEEDS_REVIEW';
    report.notes.push('SSE completion + new session does not prove valid business result. New counts are not causal proof or complete plan list. No policy checks performed.');
  }
}catch(e){
  report.status=['setup','read-api','ui'].includes(phase)?'BLOCKED':'NEEDS_REVIEW';
  report.phase=phase;report.reason=String(e.message||e).split('\n')[0].slice(0,250);
}finally{
  save();if(rl)rl.close();if(browser)await browser.close();if(api)await api.dispose();
  console.log(JSON.stringify(report,null,2));console.log('Saved '+out+' (separate from 10 business cases)');
  if(!['PASS_READ','PASS_TRANSPORT'].includes(report.status))process.exitCode=2;
}
