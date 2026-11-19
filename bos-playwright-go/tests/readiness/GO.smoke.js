import { test } from '@playwright/test';
import { checkPage } from '../../src/group-readiness.js';
import { PreconditionError } from '../../src/config.js';
for(const [id,key,title] of [['RD-GO-001','UI_CEO_CHAT_PATH','Bộ não AI'],['RD-GO-002','UI_GOAL_PATH','Goal']]) {
  test(`${id} — ${title} (chỉ readiness)`,async({playwright},info)=>{
    try { await checkPage(key,playwright,info); }
    catch(e) { if(!(e instanceof PreconditionError)) throw e; info.annotations.push({type:'qa-status',description:`${e.code} | ${e.message}`}); test.skip(true,e.message); }
  });
}
