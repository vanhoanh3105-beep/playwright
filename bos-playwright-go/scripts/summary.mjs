import fs from 'node:fs';
for (const k of ['readiness','cases']) {
 const path=`results/groups/GO/${k}.json`;
 if(!fs.existsSync(path)){console.log(`${k}: chưa có kết quả`);continue;}
 const r=JSON.parse(fs.readFileSync(path,'utf8'));
 console.log(`${k} | Run ${r.runId} | Tổng ${r.total} |`, r.statuses);console.table(r.rows.map(x=>({ID:x.id,Status:x.status,Reason:x.reason})));
}
