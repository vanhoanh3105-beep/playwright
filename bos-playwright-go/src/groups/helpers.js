import { storageState } from '../config.js';
// Browser contexts are created explicitly; attach evidence explicitly before closing them.
export async function withPage(playwright, work, role = 'ceo', info) {
  const state=storageState(role);
  const browser=await playwright.chromium.launch({headless:process.env.HEADLESS!=='0'});
  try {
    const context=await browser.newContext({storageState:state});
    let tracing=false, failed=false;
    try {
      if(info && process.env.QA_CAPTURE_TRACE==='1') {
        await context.tracing.start({screenshots:true,snapshots:true,sources:false}); tracing=true;
      }
      const page=await context.newPage();
      try { return await work(page,context); }
      catch(error) { failed=true; throw error; }
      finally {
        if(info && !page.isClosed()) {
          try { await info.attach('ui-screenshot',{body:await page.screenshot({timeout:5000}),contentType:'image/png'}); } catch { /* evidence unavailable */ }
        }
        if(tracing) {
          try { if(failed) {const file=info.outputPath('manual-trace.zip'); await context.tracing.stop({path:file}); await info.attach('trace',{path:file,contentType:'application/zip'});} else await context.tracing.stop(); } catch { /* avoid masking test result */ }
        }
      }
    } finally { await context.close(); }
  } finally { await browser.close(); }
}
