import test from 'node:test';
import assert from 'node:assert/strict';
import { assertions, project, noNewIds } from '../../src/groups/go-assertions.js';
const f={leadPattern:'lead',businessPattern:'QA Solar',industryPattern:'năng lượng',processPattern:'phân loại',gapPattern:'ngoài giờ',reportPattern:'tồn kho',leadTaskPattern:'lead',reportTaskPattern:'tồn kho',crossAssignmentReasonPattern:'cả hai nghiệp vụ',policyDecisions:['allow','deny'],unconfirmedKpiStatuses:['proposed','unverified']};
const one={goals:[{id:'g1',name:'phân loại lead'}],tasks:[{id:'t1',name:'phân loại lead',goalIds:['g1'],capabilities:['classification'],dependencies:[]}],proposals:[{agentKey:'a1',goalIds:['g1'],taskIds:['t1'],gapIds:['gap1'],justification:'Thiếu người ngoài giờ'}],gaps:[{id:'gap1',name:'Thiếu người ngoài giờ'}]};
const two={...one,goals:[...one.goals,{id:'g2',name:'báo cáo tồn kho'}],tasks:[...one.tasks,{id:'t2',name:'tồn kho',goalIds:['g2'],capabilities:['reporting'],dependencies:[]}],proposals:[...one.proposals,{agentKey:'a2',goalIds:['g2'],taskIds:['t2']}]};
const ctx={agents:['a1'],skills:['s1'],tools:['t1'],connections:['c1'],policies:['p1'],budget:10};
const samples=[
 ['WF-GO-001',one,undefined,{...one,goals:[]}],
 ['WF-GO-002',{...one,business:'QA Solar',industry:'năng lượng',process:'phân loại',kpis:[{name:'tỷ lệ chính xác'}],risks:['không gửi thông tin ngoài']},undefined,{...one,business:'công ty khác'}],
 ['WF-GO-004',one,undefined,{...one,proposals:[{goalIds:['bad'],taskIds:[]}]}],
 ['WF-GO-005',one,undefined,{...one,proposals:[{...one.proposals[0],gapIds:['bad']}]}],
 ['WF-GO-006',{permissions:['p1'],tools:[{id:'t',permissionIds:['p1']}]},{checks:[{permission:'p1',decision:'allow',policyId:'policy'}],grantedPermissions:[]},{permissions:['p2'],tools:[]}],
 ['WF-GO-009',{context:ctx},ctx,{context:{...ctx,agents:[]}}],
 ['WF-GO-012',two,undefined,{...two,proposals:[two.proposals[0],{...two.proposals[1],agentKey:'a1'}]}],
 ['WF-GO-013',{clarifications:['KPI là gì?'],assumptions:[],kpis:[{name:'tốc độ',status:'proposed'}]},undefined,{clarifications:[],assumptions:[],kpis:[{name:'tốc độ',status:'confirmed'}]}],
];
for (const [id,good,extra,bad] of samples) {
 test(`${id}: fixture đúng`,()=>assert.doesNotThrow(()=>assertions[id](good,f,extra)));
 test(`${id}: fixture sai phải bị phát hiện`,()=>assert.throws(()=>assertions[id](bad,f,extra)));
}
test('WF-GO-006: Goal tự cấp quyền phải FAIL',()=>assert.throws(()=>assertions['WF-GO-006']({permissions:['p1'],tools:[]},f,{checks:[{permission:'p1',decision:'allow',policyId:'x'}],grantedPermissions:['p1']})));
test('WF-GO-010/014: phát hiện thêm ID dù tổng số bản ghi không đổi',()=>{assert.doesNotThrow(()=>noNewIds(['a','b'],['b','a'],'unchanged'));assert.throws(()=>noNewIds(['a','b'],['a','c'],'changed'));});
test('project: chỉ map trường config, không thay bằng dữ liệu AI tự suy diễn',()=>assert.deepEqual(project({data:{x:[{key:'a'}]}},{goals:{path:'data.x',fields:{id:'key'}}}),{goals:[{id:'a'}]}));
