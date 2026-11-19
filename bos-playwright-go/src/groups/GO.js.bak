/**
 * NHÓM GO — 10 test case theo Excel.
 * Chạy: npm.cmd run test:go
 * Hàm có trong implementations sẽ chạy khi đủ điều kiện.
 * Case chưa có hàm được runner ghi NEEDS_MAPPING, không phải PASS.
 * Danh sách case và kết quả mong đợi:
 * WF-GO-001: Hệ thống tiếp nhận Goal và tạo kết quả phân tích hoặc workflow tương ứng; không báo thành công nếu backend không tạo được kết quả hợp lệ.
 * WF-GO-002: Kết quả sử dụng các đầu vào được cung cấp và thể hiện mục tiêu, công việc, năng lực, phụ thuộc, chỉ tiêu đánh giá và giới hạn rủi ro.
 * WF-GO-004: Mỗi nhu cầu Agent liên kết với ít nhất một Goal hoặc Task hợp lệ.
 * WF-GO-005: CEO giải thích vì sao cần năng lực/Agent đó và gắn lý do với khoảng trống nghiệp vụ.
 * WF-GO-006: CEO không suy diễn quyền truy cập hệ thống từ mục tiêu kinh doanh; mọi quyền đề xuất phải được kiểm tra theo policy riêng.
 * WF-GO-009: Phân tích có xét Agent hiện tại, Skills/Tools khả dụng, Connections, ngân sách và chính sách nếu các dữ liệu này có sẵn.
 * WF-GO-010: Hệ thống không tạo Goal/plan hợp lệ từ đầu vào rỗng; thông báo hoặc lỗi validation phản ánh được đầu vào không hợp lệ mà không giả định câu chữ cụ thể.
 * WF-GO-012: Kế hoạch phân tách các công việc/năng lực đủ rõ để kiểm tra và không gán một Agent vào trách nhiệm không liên quan mà không có lý do.
 * WF-GO-013: Thông tin chưa xác định được thể hiện là chưa xác minh hoặc cần làm rõ; không khẳng định KPI người dùng chưa cung cấp là yêu cầu đã chốt.
 * WF-GO-014: Yêu cầu bị backend từ chối; không tạo Goal/plan trong tenant mà actor không có quyền.
 */

import fs from 'node:fs';
import crypto from 'node:crypto';
import { expect } from '@playwright/test';
import { config, PreconditionError, qaUrl, safeWrite, selectors, storageState } from '../config.js';
import { openApi } from '../http.js';
import { readBrainSse } from './go-sse.js';
import { withPage } from './helpers.js';
import { assertions, at, project, noNewIds } from './go-assertions.js';
export { assertions, at, project, noNewIds };

// Runtime: UI, API và fixture của nhóm GO.
const need = (condition, message, status = 'BLOCKED') => { if (!condition) throw new PreconditionError(message, status); };
const ensure = (condition, message) => { if (!condition) throw new Error(message); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const validId = x => (typeof x === 'string' && x.trim() !== '') || Number.isFinite(x);
const same = (a,b) => validId(a) && validId(b) && String(a) === String(b);
const required = (x, name) => { need(typeof x === 'string' && x.trim(), `Cần cấu hình ${name} trong config/go.contract.json`); return x; };
const requiredArray = (x,name) => { need(Array.isArray(x) && x.length && x.every(v=>typeof v==='string' && v.trim()), `Cần cấu hình ${name}`); return x; };

export const prompts = {
  'WF-GO-001': 'Tự động hóa tiếp nhận và phân loại khách hàng tiềm năng (lead). Phân tích mục tiêu và đề xuất kế hoạch công việc.',
  'WF-GO-002': 'Doanh nghiệp QA Solar hoạt động trong ngành năng lượng mặt trời. Quy trình: tiếp nhận lead từ biểu mẫu, phân loại theo nhu cầu và bàn giao cho kinh doanh. Phân tích mục tiêu, công việc, năng lực, phụ thuộc, chỉ tiêu và giới hạn rủi ro.',
  'WF-GO-004': 'Cần tự động hóa tiếp nhận và phân loại lead; xác định các nhu cầu Agent liên quan đến công việc.',
  'WF-GO-005': 'Bộ phận kinh doanh QA đang thiếu người phân loại lead ngoài giờ; lead chậm được chuyển cho người phụ trách. Phân tích nhu cầu năng lực và đề xuất Agent cho khoảng trống này.',
  'WF-GO-006': 'Tự động hóa phân loại lead dựa trên dữ liệu mẫu đã có; đây chỉ là mục tiêu nghiệp vụ.',
  'WF-GO-009': 'Tự động hóa phân loại lead dựa trên đội ngũ và tài nguyên hiện có của doanh nghiệp QA.',
  'WF-GO-012': 'Hai mục tiêu độc lập: (1) tiếp nhận và phân loại lead khách hàng tiềm năng; (2) lập báo cáo tồn kho hàng tuần từ dữ liệu kho. Phân tích kế hoạch thực hiện.',
  'WF-GO-013': 'Tôi muốn cải thiện hiệu quả công việc của doanh nghiệp.',
  'WF-GO-014': 'Tạo Goal QA để phân loại lead.',
};
function loadContract() {
  let c;
  try { c = JSON.parse(fs.readFileSync('config/go.contract.json','utf8')); }
  catch { throw new PreconditionError('Thiếu hoặc lỗi JSON config/go.contract.json; sao chép từ go.contract.example.json và xác minh contract backend'); }
  need(c.confirmed === true, 'Contract GO chưa được xác minh (confirmed=false); không gửi Goal thử khi chưa biết API thật');
  return c;
}
function allow(kind) {
  need(config('QA_ISOLATED_TEST_TENANT')==='1', 'Cần tenant QA cô lập và QA_ISOLATED_TEST_TENANT=1');
  safeWrite(kind);
}
function url(template, key, vars = {}) {
  let route = required(template,key);
  for (const [k,v] of Object.entries(vars)) route = route.replaceAll(`{${k}}`, encodeURIComponent(String(v)));
  need(!/\{[^{}]+\}/.test(route), `Thiếu biến URL ${key}`);
  return qaUrl(route).toString();
}
function timeout(c) {
  const t = Number(c.chat?.timeoutMs ?? 180000);
  need(Number.isFinite(t) && t >= 1000 && t <= 240000, 'chat.timeoutMs phải từ 1000 đến 240000');
  return t;
}
function pattern(c) {
  const p = required(c.chat?.pathPattern || config('CHAT_RESPONSE_URL_PATTERN'),'chat.pathPattern');
  try { return new RegExp(p); } catch { throw new PreconditionError('chat.pathPattern không hợp lệ'); }
}
function matches(r, re, marker) {
  const u = new URL(r.url());
  if (u.origin !== qaUrl('/').origin || r.request().method() !== 'POST' || !re.test(u.pathname)) return false;
  return marker === undefined || (r.request().postData() || '').includes(marker);
}
async function readJson(api, endpoint, label) {
  const res = await api.get(endpoint,{maxRedirects:0,timeout:20000});
  if ([401,403,404].includes(res.status())) throw new PreconditionError(`${label}: HTTP ${res.status()}; kiểm tra API, fixture và quyền`);
  ensure(res.ok(), `${label}: HTTP ${res.status()}`);
  try { return await res.json(); } catch { throw new PreconditionError(`${label}: không có JSON có thể xác minh`, 'NEEDS_REVIEW'); }
}
async function withApi(pw, role, work) {
  const client = await openApi(pw, role);
  try { return await work(client); } finally { await client.dispose(); }
}
function mappedFields(c, keys) {
  for (const key of keys) {
    const rule=c.resultFields?.[key];
    need(typeof rule==='string' ? !!rule.trim() : typeof rule?.path==='string' && !!rule.path.trim() && !!rule.fields, `Thiếu resultFields.${key}`);
  }
}
function verifyListConfig(s, label, vars) {
  for(const k of ['goals','plans']) {
    const entry = s?.[k];
    url(entry?.url,`${label}.${k}.url`,vars);
    for (const f of ['itemsPath','idPath','totalPath']) required(entry?.[f],`${label}.${k}.${f}`);
  }
}
async function snapshot(pw, role, s, vars = {}) {
  return withApi(pw,role,async api => {
    const out = {};
    for (const key of ['goals','plans']) {
      const e = s[key]; const raw = await readJson(api,url(e.url,`${key}.url`,vars),`GET ${key} snapshot`);
      const rows = at(raw,e.itemsPath), total = at(raw,e.totalPath);
      need(Array.isArray(rows) && Number.isInteger(total) && total === rows.length, `Snapshot ${key} phải đầy đủ, không phân trang/thiếu total`,'NEEDS_REVIEW');
      const ids = rows.map(x=>at(x,e.idPath));
      need(ids.every(validId) && new Set(ids.map(String)).size === ids.length, `Snapshot ${key} thiếu ID hoặc trùng ID`,'NEEDS_REVIEW');
      out[key]=ids.map(String);
    }
    return out;
  });
}
async function attachSummary(info, name, body) {
  await info.attach(name,{body:Buffer.from(JSON.stringify(body,null,2)),contentType:'application/json'});
}
async function chatPage(pw, info, work) {
  return withPage(pw,async page => {
    const target = qaUrl(config('UI_CEO_CHAT_PATH',{required:true}));
    await page.goto(target.toString(),{waitUntil:'domcontentloaded',timeout:30000});
    const current = new URL(page.url());
    need(current.origin===target.origin && current.pathname===target.pathname, 'CEO Chat chuyển hướng, kiểm tra phiên đăng nhập/tenant');
    const ui=selectors();
    const input=page.locator(required(ui.chatInput,'ui-selectors.chatInput')).filter({visible:true});
    const send=page.locator(required(ui.chatSend,'ui-selectors.chatSend')).filter({visible:true});
    await expect(input).toBeVisible(); await expect(send).toBeVisible();
    return work(page,input,send);
  }, 'ceo', info);
}
const fieldsFor = {
 'WF-GO-001':['goals','tasks'], 'WF-GO-002':['business','industry','process','goals','tasks','kpis','risks'],
 'WF-GO-004':['goals','tasks','proposals'], 'WF-GO-005':['goals','tasks','proposals','gaps'],
 'WF-GO-006':['permissions','tools'], 'WF-GO-009':['context'], 'WF-GO-012':['goals','tasks','proposals'],
 'WF-GO-013':['clarifications','assumptions','kpis'],
};
function verifyChatConfig(c, caseId) {
  const x=c.chat || {};
  pattern(c); timeout(c);
  for(const k of ['responseIdPath','resultIdPath','inputPath','statePath']) required(x[k],`chat.${k}`);
  need(x.resultUrl?.includes('{id}'),'chat.resultUrl phải chứa {id} từ response thực tế');
  url(x.resultUrl,'chat.resultUrl',{id:'check'});
  requiredArray(x.successStates,'chat.successStates'); requiredArray(x.failureStates,'chat.failureStates');
  mappedFields(c,fieldsFor[caseId]);
  if(caseId==='WF-GO-001') need(x.resultSelector?.includes('{id}'),'chat.resultSelector cần định vị UI bằng {id} của kết quả cụ thể');
}
async function submitAndRead(pw, info, c, caseId) {
  const marker=`QA-${caseId}-${crypto.randomUUID()}`;
  const userInput=`[${marker}] ${prompts[caseId]}`;
  const re=pattern(c), x=c.chat;
  return chatPage(pw,info,async (page,input,send) => {
    await input.fill(userInput);
    await expect(send).toBeEnabled();
    // Register wait before click, correlate actual POST with a unique marker (no unrelated HTTP 200).
    const resultPromise=page.waitForResponse(r=>matches(r,re,marker),{timeout:Math.min(timeout(c),60000)}).catch(()=>null);
    await send.click();
    const response=await resultPromise;
    need(response,'Không bắt được POST gửi Goal khớp path và marker; kiểm tra mapping hoặc SSE/transport','NEEDS_REVIEW');
    if ([401,403].includes(response.status())) throw new PreconditionError(`CEO Chat HTTP ${response.status()}: kiểm tra quyền`);
    ensure(response.ok(), `POST CEO Chat HTTP ${response.status()}`);
    let json;
    try {
      const type=(response.headers()['content-type']||'').toLowerCase();
      if(type.includes('text/event-stream')) json=(await readBrainSse(response,timeout(c))).done;
      else json=await response.json();
    } catch { throw new PreconditionError('Không đọc được phản hồi Goal hoàn chỉnh (JSON/SSE); kiểm tra transport và terminal event','NEEDS_REVIEW'); }
    const resultId=at(json,x.responseIdPath);
    need(validId(resultId),'Response chưa có ID kết quả để đối chiếu backend; HTTP 200 không đủ','NEEDS_REVIEW');
    const endpoint=url(x.resultUrl,'chat.resultUrl',{id:resultId});
    const raw=await withApi(pw,'ceo',async api=>{
      const deadline=Date.now()+timeout(c);
      do {
        const value=await readJson(api,endpoint,'GET kết quả Goal');
        ensure(same(at(value,x.resultIdPath),resultId),'ID kết quả không khớp ID từ lần gửi Goal');
        const state=at(value,x.statePath);
        ensure(!x.failureStates.includes(state),'Backend phân tích Goal kết thúc ở trạng thái lỗi');
        if(x.successStates.includes(state)){
          ensure(typeof at(value,x.inputPath)==='string' && at(value,x.inputPath).includes(marker),'Kết quả không gắn đúng Goal vừa gửi');
          return value;
        }
        await sleep(1500);
      } while(Date.now()<deadline);
      throw new PreconditionError('Backend chưa có kết quả hoàn chỉnh trong thời gian chờ','NEEDS_REVIEW');
    });
    if(caseId==='WF-GO-001') {
      // Selector must contain result ID; use actual UI locator mapped by tester.
      const idCss=String(resultId).replace(/[^a-zA-Z0-9_-]/g, ch=>`\\${ch.codePointAt(0).toString(16)} `);
      await expect(page.locator(x.resultSelector.replaceAll('{id}',idCss)).filter({visible:true})).toBeVisible({timeout:15000});
    }
    await attachSummary(info,`${caseId}-evidence.json`,{caseId,http:response.status(),matchedRequest:true,matchedResult:true,terminalState:at(raw,x.statePath),source:'backend GET, not chat prose'});
    return {raw,id:resultId};
  });
}
export async function runPositive({playwright,testInfo,case:item}) {
  const c=loadContract(); const caseId=item.id; allow('CHAT'); verifyChatConfig(c,caseId);
  const f=c.fixtures || {};
  for(const k of ({'WF-GO-001':['leadPattern'],'WF-GO-002':['leadPattern','businessPattern','industryPattern','processPattern'],'WF-GO-005':['gapPattern'],'WF-GO-012':['leadPattern','reportPattern','leadTaskPattern','reportTaskPattern','crossAssignmentReasonPattern']}[caseId]||[])) {
    try { new RegExp(required(f[k],`fixtures.${k}`),'iu'); } catch(e){ if(e instanceof PreconditionError) throw e; throw new PreconditionError(`Regex fixtures.${k} không hợp lệ`); }
  }
  let extra;
  if(caseId==='WF-GO-006') {
    requiredArray(f.policyDecisions,'fixtures.policyDecisions');
    need(c.policy?.url?.includes('{id}'),'policy.url cần {id}'); url(c.policy.url,'policy.url',{id:'check'});
    required(c.policy.resultIdPath,'policy.resultIdPath'); need(c.policy.fields?.checks && c.policy.fields?.grantedPermissions,'Thiếu mapping policy.fields');
  }
  if(caseId==='WF-GO-009') {
    need(c.context?.fields,'Thiếu context.fields');
    const endpoint=url(c.context.url,'context.url');
    extra=await withApi(playwright,'ceo',async api=>project(await readJson(api,endpoint,'GET bối cảnh trước gửi Goal'),c.context.fields));
    need(['agents','skills','tools','connections','policies'].every(k=>Array.isArray(extra[k])) && extra.agents.length>0 && extra.budget!=null,'Fixture workforce cần Agent tồn tại và danh sách tài nguyên + ngân sách đầy đủ');
  }
  if(caseId==='WF-GO-013') requiredArray(f.unconfirmedKpiStatuses,'fixtures.unconfirmedKpiStatuses');
  const result=await submitAndRead(playwright,testInfo,c,caseId);
  const r=project(result.raw,c.resultFields);
  if(caseId==='WF-GO-006') {
    extra=await withApi(playwright,'ceo',async api=>{
      const audit=await readJson(api,url(c.policy.url,'policy.url',{id:result.id}),'GET policy audit');
      ensure(same(at(audit,c.policy.resultIdPath),result.id),'Policy audit không thuộc Goal vừa gửi');
      return project(audit,c.policy.fields);
    });
  }
  assertions[caseId](r,f,extra);
}
function validateConfig(c,vars) {
  verifyListConfig(c.lists,'lists',vars);
  required(c.validation?.uiErrorSelector,'validation.uiErrorSelector');
  required(c.validation?.requestInputPath,'validation.requestInputPath');
  required(c.validation?.errorCodePath,'validation.errorCodePath'); requiredArray(c.validation?.errorCodes,'validation.errorCodes');
  const ms=Number(c.validation.observationMs ?? 5000);
  need(Number.isFinite(ms) && ms>=1000 && ms<=30000,'validation.observationMs phải từ 1000 đến 30000');
  return ms;
}
export async function runEmpty({playwright,testInfo}) {
  const c=loadContract(); const re=pattern(c); const observationMs=validateConfig(c,{});
  // Snapshot even if button is disabled: never count UI-only check as full PASS.
  const before=await snapshot(playwright,'ceo',c.lists);
  const evidence=await chatPage(playwright,testInfo,async (page,input,send)=>{
    const error=page.locator(c.validation.uiErrorSelector).filter({visible:true});
    need(await error.count()===0,'Có thông báo lỗi cũ trên giao diện, cần phiên chat sạch');
    await input.fill('   ');
    if(await send.isDisabled()) {
      const visibleError=await error.count()>0;
      return {disabled:true,visibleError,status:null,validation:false};
    }
    allow('CHAT');
    const sent=[];
    const isEmptyPost = request => {
      try {
        const u=new URL(request.url());
        if(u.origin!==qaUrl('/').origin || request.method()!=='POST' || !re.test(u.pathname)) return false;
        const body=at(request.postDataJSON(),c.validation.requestInputPath);
        return typeof body==='string' && body.trim()==='';
      } catch { return false; }
    };
    page.on('request',request=>{ try {const u=new URL(request.url()); if(u.origin===qaUrl('/').origin&&request.method()==='POST'&&re.test(u.pathname)) sent.push(request);}catch{} });
    const found=page.waitForResponse(r=>matches(r,re)&&isEmptyPost(r.request()),{timeout:observationMs}).catch(()=>null);
    await send.click();
    const resp=await found;
    await sleep(observationMs); 
    let code;
    if(resp) { try { code=at(await resp.json(),c.validation.errorCodePath); } catch {} }
    return {disabled:false,visibleError:await error.count()>0,status:resp?.status()??null,matchedPosts:sent.length,validation:!!resp&&[200,400,422].includes(resp.status())&&c.validation.errorCodes.includes(code)};
  });
  await sleep(observationMs);
  const after=await snapshot(playwright,'ceo',c.lists);
  await attachSummary(testInfo,'WF-GO-010-evidence.json',{...evidence,before:{goals:before.goals.length,plans:before.plans.length},after:{goals:after.goals.length,plans:after.plans.length}});
  noNewIds(before.goals,after.goals,'Goal list thay đổi sau input rỗng'); noNewIds(before.plans,after.plans,'Plan list thay đổi sau input rỗng');
  if(evidence.status>=500) throw new Error('Backend lỗi server khi kiểm tra đầu vào rỗng');
  if(evidence.status===401||evidence.status===403) throw new PreconditionError('Không đủ quyền kiểm thử validation');
  need((evidence.disabled && evidence.visibleError) || (evidence.status===null && evidence.visibleError && !evidence.disabled && evidence.matchedPosts===0) || evidence.validation,'Không có bằng chứng validation rõ ràng; nút khóa/HTTP 200 đơn lẻ không đủ','NEEDS_REVIEW');
}
function expand(value, vars) {
  if(typeof value==='string') return value.replace(/\{(prompt|tenant)\}/g,(_,k)=>vars[k]);
  if(Array.isArray(value)) return value.map(v=>expand(v,vars));
  if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,expand(v,vars)]));
  return value;
}
export async function runCrossTenant({playwright,testInfo}) {
  const c=loadContract(); allow('API'); const x=c.crossTenant || {};
  need(x.confirmed===true,'GO-014 cần tenant QA thứ hai do bạn quản lý, xác nhận actor KHÔNG có quyền, observer có quyền đọc');
  const tenant=required(x.tenant,'crossTenant.tenant'); need(tenant!==config('QA_TENANT'),'Tenant thứ hai phải khác QA_TENANT');
  const actor=required(x.actorRole,'crossTenant.actorRole'), observer=required(x.observerRole,'crossTenant.observerRole');
  need(['ceo','admin','employee'].includes(actor)&&['ceo','admin','employee'].includes(observer)&&actor!==observer,'Cần hai role khác nhau và phiên đăng nhập riêng');
  need(storageState(actor)!==storageState(observer),'Actor và observer không được dùng chung file phiên');
  need(x.payload&&typeof x.payload==='object'&&JSON.stringify(x.payload).includes('{prompt}')&&(x.url?.includes('{tenant}')||JSON.stringify(x.payload).includes('{tenant}')),'Cần payload Goal có {prompt}, tenant mục tiêu nằm trong URL hoặc payload');
  need(Array.isArray(x.deniedStatuses)&&x.deniedStatuses.length&&x.deniedStatuses.every(v=>[403,404].includes(v)),'deniedStatuses chỉ 403 hoặc 404 nếu backend có chính sách che tồn tại tài nguyên');
  const vars={tenant}; const endpoint=url(x.url,'crossTenant.url',vars); verifyListConfig(x.lists,'crossTenant.lists',vars);
  const before=await snapshot(playwright,observer,x.lists,vars);
  const payload=expand(x.payload,{tenant,prompt:`[QA-WF-GO-014-${crypto.randomUUID()}] ${prompts['WF-GO-014']}`});
  const status=await withApi(playwright,actor,async api=>(await api.post(endpoint,{data:payload,maxRedirects:0,timeout:30000})).status());
  await sleep(5000); // bounded observation; use isolated QA with no concurrent writers
  const after=await snapshot(playwright,observer,x.lists,vars);
  await attachSummary(testInfo,'WF-GO-014-evidence.json',{status,before:{goals:before.goals.length,plans:before.plans.length},after:{goals:after.goals.length,plans:after.plans.length}});
  noNewIds(before.goals,after.goals,'Cross-tenant request thay đổi Goal'); noNewIds(before.plans,after.plans,'Cross-tenant request thay đổi Plan');
  if(status===401) throw new PreconditionError('Actor chưa xác thực, chưa kiểm tra được phân quyền tenant');
  need(status!==404 || x.deniedStatuses.includes(404),'404 chưa xác nhận do policy hay route sai','NEEDS_REVIEW');
  ensure(x.deniedStatuses.includes(status),`Request ngoài tenant không bị từ chối đúng contract (HTTP ${status})`);
}


// GO — tất cả 10 case theo Excel; không còn placeholder NEEDS_MAPPING trong nhóm này.
export const implementations = {
  'WF-GO-001': runPositive,
  'WF-GO-002': runPositive,
  'WF-GO-004': runPositive,
  'WF-GO-005': runPositive,
  'WF-GO-006': runPositive,
  'WF-GO-009': runPositive,
  'WF-GO-010': runEmpty,
  'WF-GO-012': runPositive,
  'WF-GO-013': runPositive,
  'WF-GO-014': runCrossTenant,
};
