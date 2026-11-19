const path=require('node:path');const {seedRows,writeReport}=require('./report-data.cjs');
function scrub(s){return String(s??'').replace(/(Bearer|Token)\s+[A-Za-z0-9._-]+/gi,'$1 [REDACTED]').replace(/([?&](?:access_token|refresh_token|api_key|key|token|secret)=)[^&\s]+/gi,'$1[REDACTED]').slice(0,1200);}
class Reporter {
 constructor(options={}){this.kind=options.kind||'cases';this.rows=seedRows(this.kind);this.runId=process.env.QA_RUN_ID||new Date().toISOString();}
 onTestEnd(test,result){
  const id=test.title.match(/(?:WF|RD)-GO-\d{3}/)?.[0];const row=this.rows.find(r=>r.id===id);if(!row)return;
  const annotation=(result.annotations||test.annotations||[]).find(a=>a.type==='qa-status')?.description||'';
  const parts=annotation.split(' | ');const status=result.status==='passed'?'PASS': ['failed','timedOut'].includes(result.status)?'FAIL':parts[0]|| (result.status==='skipped'?'BLOCKED':'NEEDS_REVIEW');
  row.status=status;row.reason=scrub(parts.slice(1).join(' | ')||result.errors?.[0]?.message||'');row.durationMs=result.duration;
  row.actual=status==='PASS'?'Đã hoàn thành các assertion được triển khai': status==='FAIL'?'Assertion hoặc thao tác kiểm thử thất bại — cần phân tích bằng chứng':`Chưa đủ căn cứ kết luận: ${row.reason||status}`;
  row.evidence=(result.attachments||[]).filter(a=>a.path).map(a=>path.relative(process.cwd(),a.path)).join(' ; ');
  if(status==='FAIL')row.bugNote='Chưa xác nhận bug sản phẩm; kiểm tra selector, fixture và contract.';
 }
 onEnd(){const out=path.resolve('results/groups/GO');const summary=writeReport(out,this.kind,this.rows,this.runId);console.log(`\nBáo cáo GO ${this.kind}: ${path.relative(process.cwd(),out)}/${this.kind}.csv`,summary.statuses);}
}
module.exports=Reporter;
