// Capture only same-origin API metadata. No automatic chat/send/write.
import 'dotenv/config';
import fs from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { chromium } from '@playwright/test';
import { config, qaUrl, storageState } from '../src/config.js';
const sensitive=/(token|secret|password|cookie|authorization|api.?key)/i;
function shape(v,depth=0){
 if(depth>5)return '[depth limit]'; if(v===null)return 'null';
 if(Array.isArray(v))return {type:'array',sample:v.length?shape(v[0],depth+1):'empty'};
 if(typeof v==='object')return Object.fromEntries(Object.keys(v).slice(0,80).filter(k=>!sensitive.test(k)).map(k=>[k,shape(v[k],depth+1)]));
 return typeof v;
}
const origin=qaUrl('/').origin;
const browser=await chromium.launch({headless:false});
const entries=new Map(), pending=new Set();
let phase='initial';
try{
 const context=await browser.newContext({storageState:storageState('ceo')});
 context.on('response',response=>{
  const req=response.request(),u=new URL(response.url());
  if(u.origin!==origin||!u.pathname.startsWith('/api/'))return;
  const type=(response.headers()['content-type']||'').split(';')[0].toLowerCase();
  const entry={phase,method:req.method(),path:u.pathname,status:response.status(),contentType:type,queryKeys:[...new Set(u.searchParams.keys())].filter(k=>!sensitive.test(k))};
  try{const data=req.postDataJSON();if(data!==null&&data!==undefined)entry.requestShape=shape(data);}catch{}
  const key=`${phase} ${entry.method} ${entry.path} ${entry.status}`;
  if(entries.size>=500&&!entries.has(key))return;
  entries.set(key,entry); // preserve status/shape even if response never finishes (SSE)
  if(type.includes('json')){
   const p=response.json().then(v=>{entry.responseShape=shape(v);}).catch(()=>{entry.responseType='JSON body unavailable';});pending.add(p);p.finally(()=>pending.delete(p));
  }else{entry.responseType=type==='text/event-stream'?'SSE stream (body not captured)':'non-JSON (body not captured)';}
  if(phase==='interaction'&& !['GET','HEAD','OPTIONS'].includes(entry.method)) console.log(`${entry.method} ${entry.path} HTTP ${entry.status} ${type}`);
 });
 const pages=[];
 for(const k of ['UI_CEO_CHAT_PATH','UI_GOAL_PATH','UI_WORKFORCE_PATH']){
  const page=await context.newPage();pages.push(page);await page.goto(qaUrl(config(k,{required:true})).toString(),{waitUntil:'domcontentloaded'});
 }
 await pages[0].bringToFront();
 const rl=createInterface({input:process.stdin,output:process.stdout});
 try{
  await rl.question('Đã mở 3 trang. Kiểm tra AI Brain đã tải xong, rồi nhấn Enter để BẮT ĐẦU ghi nhận thao tác tiếp theo. ');
  phase='interaction';
  console.log('Chuyển sang Chromium. Chỉ nếu tenant QA cô lập được phép ghi: gửi một Goal mẫu, đợi phản hồi xong, mở kết quả. Nếu không được phép, chỉ mở dữ liệu đã có.');
  await rl.question('Sau khi thao tác xong và AI phản hồi hoàn tất, quay lại đây nhấn Enter để LƯU. ');
 }finally{rl.close();}
 let timer;await Promise.race([Promise.allSettled([...pending]),new Promise(r=>{timer=setTimeout(r,4000)})]);clearTimeout(timer);
 fs.mkdirSync('results/groups/GO',{recursive:true});
 const list=[...entries.values()];fs.writeFileSync('results/groups/GO/discovery.json',JSON.stringify(list,null,2));
 const writes=list.filter(e=>e.phase==='interaction'&&!['GET','HEAD','OPTIONS'].includes(e.method)&&e.path!=='/api/ai/brain/dang-xem/');
 console.log(`Đã lưu ${list.length} API (không lưu nội dung body). Có ${writes.length} API ghi khác dang-xem trong giai đoạn thao tác.`);
 console.log('Kiểm tra path và tên field trước khi chia sẻ discovery.json. Không chia sẻ .auth hoặc token.');
 if(!writes.length)console.log('Chưa bắt được API ghi khi thao tác. Không đổi confirmed=true.');
}finally{await browser.close();}
