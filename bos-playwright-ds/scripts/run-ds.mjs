import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createInterface} from 'node:readline/promises';
import {chromium,request} from '@playwright/test';
import {config,qaUrl,selectors,storageState,safeWrite} from '../src/config.js';
import {openApi} from '../src/http.js';
import {readBrainSse} from '../src/sse.js';
import {allowedBody,safePlanningWire,selectPlanningMode} from '../src/ui.js';
import {caseIds,buildPrompt} from '../src/scenarios.js';
import {evaluate} from '../src/assertions.js';
import {complete,snapshot,compare,counts} from '../src/snapshot.js';
import {base,writeReport} from '../src/report.js';
const args=process.argv.slice(2),readonly=args.includes('--read-only');
if(args.length!==1||(!readonly&&!args.includes('--send'))){console.error('Usage: node scripts/run-ds.mjs --send | --read-only');process.exit(2);}
const runId=new Date().toISOString().replace(/[:.]/g,'-'),dir=path.join(base,'ui-runs',runId);
const errorText=e=>String(e?.message||e).split('\n')[0].slice(0,250),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const chatPath='/api/ai/brain/chat/stream/';let api,browser,rl,company,active=null,wireMode,stopReason='';
function save(id,e){fs.writeFileSync(path.join(dir,id+'.json'),JSON.stringify(e,null,2)+'\n');}
async function get(route,q={}){const u=qaUrl(route);for(const [k,v] of Object.entries(q))u.searchParams.set(k,v);const r=await api.get(u.toString(),{timeout:20000,maxRedirects:0});if(!r.ok())throw new Error(`${route}: HTTP ${r.status()}`);return r.json();}
async function snap(){const q={company_id:company};const [g,w,s]=await Promise.all([get('/api/objectives/',{...q,page_size:'100'}),get('/api/ai/workforce/agents/',q),get('/api/ai/brain/sessions/',q)]);return snapshot(g,w,s,company);}
async function prepare(){
 api=await openApi({request},'ceo');const me=await get('/api/auth/me/'),matched=complete(await get('/api/companies/'),'companies').filter(x=>x.code===config('QA_TENANT',{required:true})&&typeof x.id==='string'&&x.id);
 if(matched.length!==1||typeof me?.id!=='string'||!me.id||typeof me.role!=='string'||!me.role)throw new Error('QA company or actor not verified');
 company=matched[0].id;if(me.company!==company&&!me.companies?.some(x=>x.id===company))throw new Error('QA company membership not verified');
 return snap();
}
async function main(){
 if(readonly){const s=await prepare();console.log(JSON.stringify({status:'PASS',scope:'Readiness API only',counts:counts(s)},null,2));return;}
 if(config('QA_ISOLATED_TEST_TENANT')!=='1')throw new Error('QA_ISOLATED_TEST_TENANT=1 required');process.env.QA_RUN_ALLOW_WRITES='1';safeWrite('CHAT');
 await prepare();browser=await chromium.launch({headless:false});const ctx=await browser.newContext({storageState:storageState('ceo'),serviceWorkers:'block'});
 const target=qaUrl(config('UI_CEO_CHAT_PATH',{required:true}));if(!target.pathname.startsWith(config('QA_TENANT_PATH',{required:true})))throw new Error('Chat target outside QA tenant path');const ui=selectors(),page=await ctx.newPage();
 // Block browser API mutations except precisely one planning chat request for the active case.
 await ctx.route(u=>u.origin===target.origin&&u.pathname.startsWith('/api/'),async route=>{
  const req=route.request();if(['GET','HEAD','OPTIONS'].includes(req.method())){await route.continue();return;}
  if(new URL(req.url()).pathname!==chatPath){await route.abort();return;}
  let body;try{body=req.postDataJSON();}catch{}
  if(!active||active.forwarded||req.method()!=='POST'||!allowedBody(body,company,active.prompt,wireMode)||!safePlanningWire(body?.run_mode)){if(active){active.rejected++;active.rejectedMode=typeof body?.run_mode==='string'?body.run_mode.replace(/[^a-z0-9_-]/gi,'').slice(0,64):'missing';}await route.abort();return;}
  if(!wireMode)wireMode={run_mode:body.run_mode,agent_auto:body.agent_auto};active.forwarded=true;await route.continue();
 });
 async function openFresh(){await page.goto(target.toString(),{waitUntil:'domcontentloaded',timeout:30000});const cur=new URL(page.url());if(cur.origin!==target.origin||cur.pathname!==target.pathname)throw new Error('Unexpected chat redirect');const input=page.locator(ui.chatInput).filter({visible:true}),button=page.locator(ui.chatSend).filter({visible:true});await input.waitFor({state:'visible',timeout:15000});await button.waitFor({state:'visible',timeout:15000});if(await input.count()!==1||await button.count()!==1)throw new Error('Chat selectors not unique');await selectPlanningMode(page);return {input,button};}
 let controls=await openFresh();console.log('DS: planning-only mode selected. Eight synthetic scenarios through real WCC UI.');
 rl=createInterface({input:process.stdin,output:process.stdout});if((await rl.question('Type QA to confirm ONE batch on permitted isolated QA (external actions disabled): ')).trim()!=='QA')throw new Error('Cancelled by user');rl.close();rl=null;
 for(const [i,id] of caseIds.entries()){
  const e={caseId:id,runId,scope:'synthetic chat scenario; not a real Planner fixture'};const start=Date.now();console.log(`\n===== ${id} =====`);
  if(stopReason){e.error=stopReason;save(id,e);console.log('FAIL:',stopReason);continue;}
  let answer;
  try{if(i)controls=await openFresh();const before=await snap();e.before=counts(before);const prompt=buildPrompt(id,crypto.randomUUID());await controls.input.fill(prompt);await selectPlanningMode(page);active={prompt,forwarded:false,rejected:0};
   const waiting=page.waitForResponse(r=>{try{return new URL(r.url()).origin===target.origin&&new URL(r.url()).pathname===chatPath&&r.request().method()==='POST'&&r.request().postDataJSON()?.message===prompt;}catch{return false;}},{timeout:60000}).catch(()=>null);
   await controls.button.click({timeout:15000});const response=await waiting;e.forwarded=active.forwarded;e.wireMode=wireMode;e.rejectedMode=active.rejectedMode;
   if(!response||!e.forwarded)throw new Error(`No matching forwarded response; mode=${active.rejectedMode||'unknown'}`);
   e.http=response.status();const stream=await readBrainSse(response);answer=stream.done.message.content;e.done=stream.done.message.role==='assistant';e.sse={events:stream.types,contentLength:answer.length,resultKind:stream.done.message.meta.result_kind??null};
   fs.writeFileSync(path.join(dir,id+'.answer.local.txt'),answer,'utf8');let after;for(let j=0;j<4;j++){after=await snap();if(after.sessions.includes(stream.sessionId))break;await sleep(1500);}e.after=counts(after);Object.assign(e,compare(before,after,stream.sessionId));
   e.actual=`HTTP ${e.http}; SSE done=${e.done}; session persisted=${e.sessionPersisted}; observed state unchanged=${e.unchanged}`;
   if(!e.unchanged||!e.sessionPersisted)stopReason='Dừng batch: trạng thái backend thay đổi hoặc không xác minh được phiên mới; cần kiểm tra audit.';
  }catch(err){e.forwarded=!!active?.forwarded;e.error=errorText(err);stopReason='Dừng batch sau lỗi kỹ thuật, tránh gửi lặp: '+e.error;}
  finally{active=null;e.durationMs=Date.now()-start;save(id,e);const v=evaluate(id,e,answer);console.log(`${v.status}: ${e.error||v.reason}`);writeReport(dir,runId);}
 }
}
if(!readonly)fs.mkdirSync(dir,{recursive:true});
try{await main();}catch(e){console.error(errorText(e));if(readonly)process.exitCode=2;else for(const id of caseIds)if(!fs.existsSync(path.join(dir,id+'.json')))save(id,{caseId:id,runId,error:errorText(e)});}finally{if(rl)rl.close();if(browser)await browser.close();if(api)await api.dispose();if(!readonly){const result=writeReport(dir,runId);console.log(JSON.stringify({statuses:result.statuses,acceptance:result.acceptanceStatuses,report:path.join(base,'pass-fail.csv'),evidenceDir:dir},null,2));process.exitCode=result.statuses.FAIL?2:0;}}
