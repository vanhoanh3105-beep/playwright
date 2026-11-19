import fs from 'node:fs';
import { config, qaUrl, storageState, PreconditionError } from './config.js';

function tokenFromState(state,origin) {
  const key=config('API_TOKEN_LOCALSTORAGE_KEY')||'acc_token';
  return state.origins?.find(x=>x.origin===origin)?.localStorage?.find(x=>x.name===key)?.value;
}
export async function openApi(playwright,role='ceo') {
  const url=qaUrl('/');
  const file=storageState(role);
  const state=JSON.parse(fs.readFileSync(file,'utf8'));
  const token=tokenFromState(state,url.origin);
  const scheme=config('API_AUTH_SCHEME')||'Token';
  const headers=token?{Authorization:`${scheme} ${token}`} : {};
  const context=await playwright.request.newContext({storageState:state,extraHTTPHeaders:headers,timeout:30_000});
  return context;
}
export function apiPath(name, params={}) {
  let p=config(name,{required:true});
  for(const [key,value] of Object.entries(params)) p=p.replaceAll(`{${key}}`,encodeURIComponent(String(value)));
  if(/\{[^{}]+\}/.test(p)) throw new PreconditionError(`Thiếu tham số URL cho ${name}: ${p}`);
  return qaUrl(p).toString();
}
export async function jsonResponse(response,label='API') {
  const status=response.status();
  if(status===401||status===403) throw new PreconditionError(`${label}: HTTP ${status}, kiểm tra login/role/quyền API`);
  if(status===404) throw new PreconditionError(`${label}: HTTP 404, route chưa xác nhận hoặc chức năng chưa triển khai`,'NEEDS_MAPPING');
  if(!response.ok()) throw new Error(`${label}: HTTP ${status} (server không đáp ứng contract)`);
  try{return await response.json();}catch {throw new Error(`${label} không trả JSON`);}
}
export function unbox(data) { return data?.data?.plan ?? data?.data ?? data?.plan ?? data; }
export function getPath(obj,path) { return path.split('.').reduce((acc,key)=>acc?.[key],obj); }
export function oneOf(obj, paths, label) {
  const value=paths.map(p=>getPath(obj,p)).find(v=>v!==undefined&&v!==null);
  if(value===undefined) throw new Error(`Thiếu trường ${label}: ${paths.join(' / ')}`);
  return value;
}
