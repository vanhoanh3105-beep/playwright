import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {caseIds,fixtures,buildPrompt,cases} from '../../src/scenarios.js';
import {checkDecision,parseAnswer,evaluate} from '../../src/assertions.js';
import {allowedBody,safePlanningWire,uniqueCurrentMode,planningLabel} from '../../src/ui.js';
import {snapshot,compare,complete} from '../../src/snapshot.js';
import {parseBrainSse} from '../../src/sse.js';
import {writeReport} from '../../src/report.js';
const decision=(a,extra={})=>({work_id:'W1',action:a,agent_id:null,proposal_id:null,skill_key:null,role_key:null,reason:'Quyết định dựa trên dữ liệu fixture đã cung cấp.',requires_approval:false,capacity_limited:false,duplicate_flagged:false,promote_temporary:false,...extra});
const create=(skill,extra={})=>decision('create_agent',{skill_key:skill,role_key:skill,requires_approval:true,...extra});
const positive={
 'WF-DS-001':[decision('reuse',{agent_id:'QA-A1',skill_key:'lead_triage'})],
 'WF-DS-002':[decision('extend',{agent_id:'QA-A2',skill_key:'lead_dedupe'})],
 'WF-DS-006':[decision('defer',{capacity_limited:true})],
 'WF-DS-007':[decision('review_existing_proposal',{proposal_id:'QA-P7',role_key:'stock_reconcile',duplicate_flagged:true})],
 'WF-DS-009':[decision('reuse',{agent_id:'QA-A9',skill_key:'lead_triage'}),create('invoice_audit',{work_id:'W2'})],
 'WF-DS-010':[decision('defer')],
 'WF-DS-011':[create('inventory_audit')],
 'WF-DS-012':[decision('defer')]
};
function good(id){return {decisions:structuredClone(positive[id]),permanent_agent_ids:fixtures[id].agents.filter(a=>a.kind==='permanent').map(a=>a.id),missing_information:fixtures[id].missing_information??[]};}
const bad={
 'WF-DS-001':x=>x.decisions[0]=create('lead_triage'),
 'WF-DS-002':x=>x.decisions[0]=create('lead_dedupe'),
 'WF-DS-006':x=>x.decisions[0]=decision('reuse',{agent_id:'QA-A6',skill_key:'lead_triage'}),
 'WF-DS-007':x=>x.decisions[0]=create('stock_reconcile'),
 'WF-DS-009':x=>x.decisions[1]=create('lead_triage',{work_id:'W2'}),
 'WF-DS-010':x=>{x.permanent_agent_ids=['QA-T10'];x.decisions[0].promote_temporary=true;},
 'WF-DS-011':x=>x.decisions[0].requires_approval=false,
 'WF-DS-012':x=>x.decisions[0]=create('invented')
};
test('Exactly 8 original DS IDs; all P0, complete prompt and assertion mappings',()=>{assert.deepEqual(caseIds,['001','002','006','007','009','010','011','012'].map(x=>'WF-DS-'+x));assert.equal(Object.keys(fixtures).length,8);for(const c of cases){assert.equal(c.priority,'P0');assert.ok(c.expected&&c.precondition&&c.steps);assert.ok(buildPrompt(c.id,'test').includes('GIẢ LẬP'));}});
for(const id of caseIds){test(id+' valid decision PASS',()=>assert.equal(checkDecision(id,good(id)).pass,true));test(id+' invalid decision FAIL',()=>{const x=good(id);bad[id](x);assert.equal(checkDecision(id,x).pass,false);});}
test('reject mismatched Agent ID',()=>{const x=good(caseIds[0]);x.decisions[0].agent_id='other';assert.equal(checkDecision(caseIds[0],x).pass,false);});
test('reject duplicate decision',()=>{const x=good(caseIds[4]);x.decisions[1].work_id='W1';assert.equal(checkDecision(caseIds[4],x).pass,false);});
test('reject missing boolean',()=>{const x=good(caseIds[0]);delete x.decisions[0].promote_temporary;assert.equal(checkDecision(caseIds[0],x).pass,false);});
test('reject empty justification',()=>{const x=good(caseIds[0]);x.decisions[0].reason='';assert.equal(checkDecision(caseIds[0],x).pass,false);});
test('parse JSON and fenced JSON; reject prose and truncation',()=>{assert.deepEqual(parseAnswer('{"a":1}'),{a:1});assert.deepEqual(parseAnswer('[TRẠNG THÁI TRÍCH XUẤT: OK]\n\n```json\n{"a":1}\n```'),{a:1});assert.deepEqual(parseAnswer('```json\n{"a":1}\n```'),{a:1});assert.throws(()=>parseAnswer('AI: {"a":1}'));assert.throws(()=>parseAnswer('câu trả lời bị cắt'));});
const ev={forwarded:true,done:true,sessionPersisted:true,unchanged:true};
test('synthetic UI PASS never becomes original acceptance PASS',()=>{const r=evaluate(caseIds[0],ev,JSON.stringify(good(caseIds[0])));assert.equal(r.status,'PASS');assert.equal(r.acceptance,'FAIL');});
test('missing transport, state change, or missing answer FAIL',()=>{for(const key of Object.keys(ev))assert.equal(evaluate(caseIds[0],{...ev,[key]:false},JSON.stringify(good(caseIds[0]))).status,'FAIL');assert.equal(evaluate(caseIds[0],ev,null).status,'FAIL');});
test('safe wire accepts planning only; reject auto, full, unknown',()=>{for(const x of ['plan','planning_only','plan-only'])assert.equal(safePlanningWire(x),true);for(const x of [null,'auto','full','unknown'])assert.equal(safePlanningWire(x),false);});
test('request guard rejects wrong tenant, old session, wrong prompt and changed mode',()=>{const body={company_id:'c',session_id:null,message:'q',run_mode:'plan',agent_auto:false};assert.equal(allowedBody(body,'c','q',null),true);for(const bad of [{company_id:'other'},{session_id:'old'},{message:'other'},{run_mode:'full'}])assert.equal(allowedBody({...body,...bad},'c','q',{run_mode:'plan',agent_auto:false}),false);});
test('mode menu must be unique and closed',()=>{assert.equal(uniqueCurrentMode({[planningLabel]:1}),planningLabel);assert.equal(uniqueCurrentMode({[planningLabel]:1,'Hỏi từng bước':1}),null);assert.equal(uniqueCurrentMode({[planningLabel]:2}),null);});
const g={count:1,next:null,results:[{id:'g1',company:'c',title:'goal'}]},w={agents:[{agent_id:'a1',status:'active',enabled:true}],proposals:[{proposal_id:'p1',plan_id:'p',status:'pending_approval'}]},s={sessions:[{id:'s1'}]};
test('snapshot rejects pagination, duplicate IDs, wrong company',()=>{assert.throws(()=>complete({...g,count:2},'goals'));assert.throws(()=>snapshot(g,{...w,agents:[w.agents[0],w.agents[0]]},s,'c'));assert.throws(()=>snapshot(g,w,s,'different'));});
test('snapshot detects same-count replacement and status changes',()=>{const b=snapshot(g,w,s,'c');const after={sessions:[...s.sessions,{id:'s2'}]};assert.deepEqual(compare(b,snapshot(g,w,after,'c'),'s2'),{unchanged:true,sessionPersisted:true});assert.equal(compare(b,snapshot(g,{...w,agents:[{...w.agents[0],agent_id:'different'}]},after,'c'),'s2').unchanged,false);assert.equal(compare(b,snapshot(g,{...w,proposals:[{...w.proposals[0],status:'active'}]},after,'c'),'s2').unchanged,false);assert.equal(compare(b,snapshot(g,w,s,'c'),'s1').sessionPersisted,false);});
test('SSE requires actual terminal event and consistent session',()=>{const frame=x=>'data: '+JSON.stringify(x)+'\n\n';const turn={type:'turn',turn_id:'t',session_id:'s'};const done={type:'done',session_id:'s',message:{id:'m',role:'assistant',content:'{}',meta:{}}};assert.equal(parseBrainSse(frame(turn)+frame(done)).sessionId,'s');assert.throws(()=>parseBrainSse(frame(turn)));assert.throws(()=>parseBrainSse(frame(turn)+frame({...done,session_id:'other'})));});
test('report writes exactly 8 rows, BOM, PASS/FAIL only, stale evidence rejected',()=>{const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ds-test-'));try{const dir=path.join(tmp,'run');fs.mkdirSync(dir);const id=caseIds[0];fs.writeFileSync(path.join(dir,id+'.json'),JSON.stringify({caseId:id,runId:'current',...ev}));fs.writeFileSync(path.join(dir,id+'.answer.local.txt'),JSON.stringify(good(id)));const id2=caseIds[1];fs.writeFileSync(path.join(dir,id2+'.json'),JSON.stringify({caseId:id2,runId:'old',...ev}));fs.writeFileSync(path.join(dir,id2+'.answer.local.txt'),JSON.stringify(good(id2)));const r=writeReport(dir,'current',tmp);assert.equal(r.rows.length,8);assert.deepEqual(r.statuses,{PASS:1,FAIL:7});assert.deepEqual(r.acceptanceStatuses,{PASS:0,FAIL:8});assert.equal(fs.readFileSync(path.join(tmp,'pass-fail.csv'),'utf8').charCodeAt(0),0xfeff);assert.equal(fs.readFileSync(path.join(tmp,'pass-fail.csv'),'utf8').trim().split('\r\n').length,9);}finally{fs.rmSync(tmp,{recursive:true,force:true});}});
