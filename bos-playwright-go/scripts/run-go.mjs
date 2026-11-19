import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { writeReport, seedRows } from '../reporters/report-data.cjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
if(args.some(a=>!['--quick','--cases-only','--allow-writes'].includes(a)) || (args.includes('--quick')&&args.includes('--cases-only'))) {console.error('Lệnh hỗ trợ: --quick | --cases-only | --allow-writes'); process.exit(2);}
const cli=path.join(root,'node_modules','@playwright','test','cli.js');
if(!fs.existsSync(cli)) {console.error('Thiếu dependency. Chạy npm.cmd ci trước.');process.exit(2);}
const allow=args.includes('--allow-writes');
if(allow&&['QA_ISOLATED_TEST_TENANT','ALLOW_QA_WRITES','ALLOW_QA_CHAT'].some(k=>process.env[k]!=='1')) {console.error('Chỉ bật ghi khi QA cô lập; cần cả QA_ISOLATED_TEST_TENANT, ALLOW_QA_WRITES, ALLOW_QA_CHAT = 1.');process.exit(2);}
const env={...process.env,CASE_IDS:'',CASE_GROUPS:'',QA_RUN_ALLOW_WRITES:allow?'1':'0',ALLOW_QA_WRITES:allow?'1':'0',ALLOW_QA_CHAT:allow?'1':'0'};
const kinds=args.includes('--quick')?['readiness']:args.includes('--cases-only')?['cases']:['readiness','cases'];
const runId=new Date().toISOString().replace(/[:.]/g,'-'); env.QA_RUN_ID=runId;
const destination=path.join(root,'results','groups','GO'); let exitCode=0;
for(const kind of kinds) {
  const config=kind==='readiness'?'playwright.readiness.config.js':'playwright.config.js';
  // Reset this report before execution: even interrupted runs cannot present a previous PASS as current.
  writeReport(destination,kind,seedRows(kind),runId);
  console.log(`\n===== GO | ${kind.toUpperCase()} =====`);
  const r=spawnSync(process.execPath,[cli,'test','-c',config],{env,cwd:root,stdio:'inherit',shell:false});
  if(r.error)console.error(r.error.message);
  if(r.status!==0)exitCode=exitCode||r.status||2;
}
console.log('\nKết quả: results/groups/GO/ (readiness và nghiệp vụ tách riêng).');
console.log('PASS chỉ là test thực sự hoàn thành assertion. BLOCKED/NOT_RUN/NEEDS_REVIEW không phải PASS.');
for(const kind of kinds){
 const s=JSON.parse(fs.readFileSync(path.join(destination,`${kind}.json`),'utf8'));
 if(s.statuses.PASS!==s.total && exitCode===0)exitCode=2; // incomplete suite must not appear green in CI.
}
process.exitCode=exitCode;
