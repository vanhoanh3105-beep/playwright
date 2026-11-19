import { expect } from '@playwright/test';
import { config, PreconditionError, qaUrl, selectors } from './config.js';
import { withPage } from './groups/helpers.js';
export async function checkPage(routeKey, playwright, info) {
  await withPage(playwright, async page => {
    const target=qaUrl(config(routeKey,{required:true}));
    await page.goto(target.toString(),{waitUntil:'domcontentloaded',timeout:45000});
    const current=new URL(page.url());
    if(current.origin!==target.origin || current.pathname.replace(/\/$/,'')!==target.pathname.replace(/\/$/,'')) throw new PreconditionError('Chuyển hướng ngoài màn hình đã cấu hình; kiểm tra phiên CEO và route');
    await expect(page.locator('body')).toBeVisible();
    if(routeKey==='UI_CEO_CHAT_PATH') {
      const s=selectors();
      if(!s.chatInput||!s.chatSend) throw new PreconditionError('Thiếu selector ô hỏi AI/nút gửi','NEEDS_MAPPING');
      await expect(page.locator(s.chatInput).filter({visible:true})).toBeVisible();
      await expect(page.locator(s.chatSend).filter({visible:true})).toBeVisible();
    } else {
      // Known Goal page title, not hidden menu with "Goal" text.
      await expect(page.getByRole('heading',{name:/^(Goal|Mục tiêu)$/i}).filter({visible:true}).first()).toBeVisible();
    }
  },'ceo',info);
}
