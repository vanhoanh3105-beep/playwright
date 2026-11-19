import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';

export const env=process.env;
export function config(name, {required=false}={}) {
  const value=String(env[name]??'').trim();
  if(required && !value) throw new PreconditionError(`Cần cấu hình ${name} trong .env`);
  return value;
}
export class PreconditionError extends Error { constructor(message,code='BLOCKED') {super(message);this.code=code;} }
export function numberSetting(name,fallback) {
  const value=Number(env[name]||fallback);
  if (!Number.isFinite(value)||value<=0) throw new PreconditionError(`Giá trị ${name} phải là số dương`);
  return value;
}
export function qaUrl(pathname) {
  const base=config('QA_BASE_URL',{required:true});
  let url;
  try {url=new URL(pathname,base);} catch {throw new PreconditionError(`URL QA hoặc đường dẫn không hợp lệ: ${pathname}`);}
  if(!['http:','https:'].includes(url.protocol)) throw new PreconditionError('Chỉ cho phép http(s)');
  const allowed = config('QA_CONFIRM_HOST',{required:true});
  if(url.hostname!==allowed) throw new PreconditionError(`Host không khớp QA_CONFIRM_HOST: ${url.hostname}`);
  return url;
}
export function safeWrite(kind='API') {
  qaUrl('/');
  const tenant=config('QA_TENANT',{required:true});
  const tenantPath=config('QA_TENANT_PATH',{required:true});
  if(!tenantPath.startsWith(`/co/${tenant}/`)) throw new PreconditionError('QA_TENANT_PATH không khớp QA_TENANT');
  qaUrl(tenantPath);
  if(config('QA_RUN_ALLOW_WRITES')!=='1' || config('ALLOW_QA_WRITES')!=='1') throw new PreconditionError(`Case ghi dữ liệu (${kind}) đang tắt: cần chạy test:go -- --allow-writes trên tenant QA được cấp phép`);
  if(kind==='CHAT' && config('ALLOW_QA_CHAT')!=='1') throw new PreconditionError('Cần ALLOW_QA_CHAT=1 cho các case gửi chat');
}
export function storageState(role='ceo') {
  const file=config(`AUTH_STATE_${role.toUpperCase()}`,{required:true});
  const resolved=path.resolve(file);
  if(!fs.existsSync(resolved)) throw new PreconditionError(`Thiếu phiên ${role}: chạy npm run login:${role}`);
  return resolved;
}
export function selectors() {
  return JSON.parse(fs.readFileSync(new URL('../config/ui-selectors.json',import.meta.url),'utf8'));
}
