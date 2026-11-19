import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {seedRows,writeReport} from '../../reporters/report-data.cjs';
import Reporter from '../../reporters/status-reporter.cjs';
test('Báo cáo GO: đúng 10 ID, không đánh dấu PASS khi chưa chạy',()=>{
 const rows=seedRows('cases');assert.equal(rows.length,10);assert.equal(new Set(rows.map(r=>r.id)).size,10);assert.ok(rows.every(r=>r.status==='NOT_RUN'&&r.expected));
});
test('CSV và JSON: đủ cột, ghi UTF-8 BOM, giữ case chưa chạy',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'go-report-unit-'));
 try {const rows=seedRows('cases');rows[0].status='BLOCKED';rows[0].reason='Thiếu hợp đồng, "API"';rows[1].status='FAIL';const s=writeReport(dir,'cases',rows,'unit-only');assert.deepEqual(s.statuses,{BLOCKED:1,FAIL:1,NOT_RUN:8}); const csv=fs.readFileSync(path.join(dir,'cases.csv'),'utf8');assert.ok(csv.startsWith('\ufeff'));assert.ok(csv.includes('Kết quả thực tế'));assert.ok(csv.includes('Thiếu hợp đồng, ""API""'));assert.equal(csv.trim().split(/\r?\n/).length,11);assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'cases.json'))).rows.length,10);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('Readiness độc lập không tính vào case nghiệp vụ',()=>{assert.equal(seedRows('readiness').length,2);assert.ok(seedRows('readiness').every(r=>r.id.startsWith('RD-')));});
test('Reporter phân biệt passed, skipped annotation, failed và chưa chạy',()=>{
 const r=new Reporter({kind:'cases'});
 r.onTestEnd({title:'WF-GO-001 @GO',annotations:[]},{status:'skipped',annotations:[{type:'qa-status',description:'BLOCKED | Thiếu API'}],duration:1,attachments:[]});
 r.onTestEnd({title:'WF-GO-002 @GO'},{status:'failed',errors:[{message:'assertion sai'}],duration:2});
 r.onTestEnd({title:'WF-GO-004 @GO'},{status:'passed',duration:3});
 assert.deepEqual(r.rows.slice(0,4).map(x=>x.status),['BLOCKED','FAIL','PASS','NOT_RUN']);assert.equal(r.rows[0].reason,'Thiếu API');
});
