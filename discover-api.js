'use strict';

// Chỉ-đọc: mở giao diện AI Brain QA, ghi nhận metadata của XHR/fetch thực tế.
// KHÔNG gửi prompt, không gọi API ghi dữ liệu, không lưu token/cookie/body/query string.
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

const projectDir = path.resolve(__dirname, '..');
const authPath = path.resolve(projectDir, process.env.E2E_STORAGE_STATE || 'auth-state.json');
const targetUrl = process.env.AI_BRAIN_URL || '';
const maxRequests = 200;

function safePath(urlString) {
  try {
    const url = new URL(urlString);
    const pathname = url.pathname
      .replace(/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/gi, ':uuid')
      .replace(/\/[A-Za-z0-9_-]{32,}(?=\/|$)/g, '/:id');
    // Không chép query string: có thể chứa thông tin công ty hoặc mã xác thực.
    return { origin: url.origin, path: pathname.slice(0, 200) };
  } catch (_) {
    return { origin: '[unknown]', path: '[invalid URL]' };
  }
}

function authScheme(value) {
  if (!value) return 'none';
  if (/^Bearer\s+/i.test(value)) return 'Bearer';
  if (/^Token\s+/i.test(value)) return 'Token';
  if (/^Basic\s+/i.test(value)) return 'Basic';
  return 'other'; // Không in cả token khi thiếu prefix.
}

async function main() {
  const target = new URL(targetUrl);
  if (target.protocol !== 'https:' || target.hostname !== 'wcc.hoanh.aflowbiz.com' ||
      !target.pathname.startsWith('/co/FLEET-HOANH/ai-brain')) {
    throw new Error('Chỉ chạy trên trang AI Brain QA đã cấu hình.');
  }
  if (!fs.existsSync(authPath)) throw new Error(`Không tìm thấy storage state: ${authPath}`);
  const waitMs = Math.min(120000, Math.max(5000, Number(process.env.API_DISCOVERY_WAIT_MS) || 20000));
  const browser = await chromium.launch({ headless: true });
  const recorded = [];
  const recordsByRequest = new WeakMap();
  const headerTasks = [];
  let navigatedTo = null;
  let pageError = '';
  try {
    const context = await browser.newContext({ storageState: authPath });
    context.on('request', (request) => {
      const type = request.resourceType();
      if (!['xhr', 'fetch', 'eventsource'].includes(type) || recorded.length >= maxRequests) return;
      const safe = safePath(request.url());
      const record = { method: request.method(), ...safe, resourceType: type,
        status: null, authScheme: 'unknown', cookieHeader: false, customHeaderNames: [] };
      recorded.push(record);
      recordsByRequest.set(request, record);
      headerTasks.push(request.allHeaders().then((headers) => {
        record.authScheme = authScheme(headers.authorization);
        record.cookieHeader = Boolean(headers.cookie);
        record.customHeaderNames = Object.keys(headers).filter((name) => name.startsWith('x-')).sort();
      }).catch(() => { record.authScheme = 'unavailable'; }));
    });
    context.on('response', (response) => {
      const record = recordsByRequest.get(response.request());
      if (record) record.status = response.status();
    });
    context.on('requestfailed', (request) => {
      const record = recordsByRequest.get(request);
      if (record && record.status == null) record.status = 'network-error';
    });

    const page = await context.newPage();
    try {
      await page.goto(target.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (error) {
      pageError = String(error?.name || 'Navigation error');
    }
    navigatedTo = safePath(page.url());
    await page.waitForTimeout(waitMs);
    await Promise.allSettled(headerTasks);
  } finally {
    await browser.close();
  }

  const folder = path.join(projectDir, 'results', 'api-discovery');
  fs.mkdirSync(folder, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const output = path.join(folder, `${stamp}.json`);
  fs.writeFileSync(output, JSON.stringify({ checkedAt: new Date().toISOString(),
    navigatedTo, pageError, requestCount: recorded.length, requests: recorded }, null, 2), 'utf8');

  console.log(`Trang mở đến: ${navigatedTo?.origin}${navigatedTo?.path}`);
  if (pageError) console.log(`Điều hướng: ${pageError}`);
  console.log(`Phát hiện ${recorded.length} XHR/fetch/eventsource request (chỉ in tối đa 60):`);
  for (const r of recorded.slice(0, 60)) {
    console.log(`${String(r.status ?? '...').padStart(3)} ${r.method} ${r.origin}${r.path} | auth=${r.authScheme}, cookie=${r.cookieHeader}, x-headers=${r.customHeaderNames.join(',') || '-'}`);
  }
  console.log(`\nBáo cáo chỉ chứa metadata, không chứa token/cookie/body/query: ${output}`);
  if (!recorded.length) console.log('Không thấy XHR/fetch: có thể UI chưa tải, chưa được xác thực, hoặc request chỉ phát sinh sau thao tác khác.');
}

main().catch((error) => { console.error('API discovery:', error.message); process.exitCode = 1; });
