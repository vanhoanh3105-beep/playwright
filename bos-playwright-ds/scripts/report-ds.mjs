import path from 'node:path';
import {base,latestRun,writeReport} from '../src/report.js';
try{const id=process.argv[2]||latestRun();if(!id||!/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(id))throw new Error('Run ID không hợp lệ hoặc chưa có kết quả');const r=writeReport(path.join(base,'ui-runs',id),id);console.table(r.rows.map(x=>({ID:x.id,Status:x.status,Acceptance:x.acceptance,Reason:x.reason})));console.log(JSON.stringify({statuses:r.statuses,acceptance:r.acceptanceStatuses,report:path.join(base,'pass-fail.csv')},null,2));}catch(e){console.error(e.message);process.exitCode=2;}
