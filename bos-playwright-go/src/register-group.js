import { test } from '@playwright/test';
import { allCases } from './cases.js';
import { implementations } from './groups/GO.js';
import { PreconditionError } from './config.js';
export function registerGO() {
  test.describe('GO — Goal Analysis', () => {
    for (const item of allCases()) {
      test(`${item.id} @GO @${item.priority}`, async ({ playwright }, info) => {
        await info.attach('test-case.json', {body:Buffer.from(JSON.stringify(item,null,2)),contentType:'application/json'});
        try {
          if (!implementations[item.id]) throw new PreconditionError('Chưa có executor','NEEDS_MAPPING');
          await implementations[item.id]({playwright,testInfo:info,case:item});
        } catch(error) {
          if (!(error instanceof PreconditionError)) throw error;
          info.annotations.push({type:'qa-status',description:`${error.code} | ${error.message}`});
          test.skip(true,error.message);
        }
      });
    }
  });
}
