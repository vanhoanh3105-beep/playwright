import 'dotenv/config';
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { config, qaUrl } from '../src/config.js';

const role=(process.argv[2]||'ceo').toUpperCase();
if(!['CEO','ADMIN','EMPLOYEE'].includes(role))throw new Error('Role: ceo/admin/employee');
const file=path.resolve(config(`AUTH_STATE_${role}`,{required:true}));
const route=config('UI_HOME_PATH',{required:true});
const browser=await chromium.launch({headless:false});
try {
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.goto(qaUrl(route).toString());
  console.log(`Đăng nhập thủ công bằng tài khoản ${role} trên cửa sổ Chromium.`);
  const rl=readline.createInterface({input,output});
  try {await rl.question('Sau khi đăng nhập và thấy màn hình BOS, nhấn Enter để lưu phiên: ');}finally{rl.close();}
  const actual=new URL(page.url());
  if(actual.origin!==qaUrl('/').origin || !actual.pathname.startsWith(config('QA_TENANT_PATH',{required:true})) || await page.locator('#login-username').isVisible().catch(()=>false)) {
    throw new Error('Chưa xác nhận trang đúng tenant sau đăng nhập. Hãy vào màn hình tenant rồi nhấn Enter.');
  }
  await fs.mkdir(path.dirname(file),{recursive:true});
  await context.storageState({path:file,indexedDB:true});
  console.log(`Đã lưu phiên ${role}. Không commit file này lên Git.`);
} finally {await browser.close();}
