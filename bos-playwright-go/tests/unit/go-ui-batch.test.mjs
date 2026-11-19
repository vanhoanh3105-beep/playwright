import test from 'node:test';
import assert from 'node:assert/strict';
import {caseIds,prompts,allowedBody,inspectAnswer,additions,assessTransport} from '../../src/groups/go-ui-batch.js';
import {allCases} from '../../src/cases.js';
test('UI batch covers exact 10 IDs, only 8 prompts',()=>{assert.deepEqual(caseIds,allCases().map(c=>c.id));assert.equal(Object.keys(prompts).length,8);assert.equal(prompts['WF-GO-014'],undefined);assert.equal(prompts['WF-GO-010'],undefined);});
const body={company_id:'qa',session_id:null,message:'test',run_mode:'ask',agent_auto:false};
test('request refuses stale session, wrong company, wrong message',()=>{assert.equal(allowedBody(body,'qa','test'),true);for(const change of [{session_id:'old'},{company_id:'other'},{message:'other'}])assert.equal(allowedBody({...body,...change},'qa','test'),false);});
test('request refuses full mode or change in mode',()=>{assert.equal(allowedBody({...body,run_mode:'full'},'qa','test'),false);assert.equal(allowedBody(body,'qa','test',{run_mode:'auto',agent_auto:false}),false);assert.equal(allowedBody(body,'qa','test',{run_mode:'ask',agent_auto:true}),false);});
test('empty prompt not replaced by artificial marker',()=>{assert.equal(allowedBody({...body,message:''},'qa',''),true);assert.equal(allowedBody(body,'qa',''),false);});
test('signals are not assertions, detect truncation and absent input',()=>{const a=inspectAnswer('WF-GO-002','QA Solar năng lượng mặt trời, KPI, câu trả lời bị cắt');assert.equal(a.found,3);assert.equal(a.truncated,true);assert.equal(inspectAnswer('WF-GO-002','').found,0);assert.equal(a.businessStatus,undefined);});
test('snapshot detects ID replacement even when counts unchanged',()=>{assert.deepEqual(additions({goals:['a'],sessions:['s']},{goals:['b'],sessions:['s']}),{goals:1,sessions:0});});
test('transport requires fresh session persisted, not business PASS',()=>{const s={sessionId:'s',done:{message:{role:'assistant'}}};assert.equal(assessTransport(s,{sessions:[]},{sessions:['s']}).transport,'PASS_TRANSPORT');assert.equal(assessTransport(s,{sessions:[]},{sessions:['s']}).businessStatus,'NEEDS_REVIEW');assert.equal(assessTransport(s,{sessions:['s']},{sessions:['s']}).transport,'NEEDS_REVIEW');assert.equal(assessTransport(s,{sessions:[]},{sessions:[]}).transport,'NEEDS_REVIEW');});

import {planningLabel,modeLabels,uniqueCurrentMode,safePlanningWire,selectPlanningMode} from '../../src/groups/go-ui-batch.js';
test('Vietnamese labels match actual WCC labels, no console input',()=>{assert.equal(planningLabel,'Chỉ lập kế hoạch');assert.equal(modeLabels[1],'Hỏi từng bước');});
test('only one visible mode when menu closed',()=>{assert.equal(uniqueCurrentMode({[planningLabel]:1}),planningLabel);assert.equal(uniqueCurrentMode({[planningLabel]:1,'Hỏi từng bước':1}),null);assert.equal(uniqueCurrentMode({[planningLabel]:2}),null);assert.equal(uniqueCurrentMode({}),null);});
test('refuses known auto/full and unknown run modes',()=>{for(const x of ['auto','full','ask','unknown','',null])assert.equal(safePlanningWire(x),false);for(const x of ['plan','plan_only','planning','planning-only'])assert.equal(safePlanningWire(x),true);});
function fakePage(initial){let current=initial,menu=false;const clicks=[];return {clicks,getByText(label){return {filter(){return {count:async()=>menu?(modeLabels.includes(label)?1:0):+(label===current),waitFor:async()=>{},click:async()=>{clicks.push(label);if(menu){current=label;menu=false;}else{assert.equal(label,current);menu=true;}}};}};}};}
test('automatic mode selection from observed default and ask modes',async()=>{for(const initial of ['Tự làm việc nhẹ','Hỏi từng bước','Toàn quyền']){const page=fakePage(initial);await selectPlanningMode(page);assert.deepEqual(page.clicks,[initial,planningLabel]);}});
test('already planning mode does not click menu',async()=>{const page=fakePage(planningLabel);await selectPlanningMode(page);assert.deepEqual(page.clicks,[]);});
