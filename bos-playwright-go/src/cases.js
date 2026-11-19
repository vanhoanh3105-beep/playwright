import fs from 'node:fs';

const cases = JSON.parse(fs.readFileSync(new URL('../data/cases.json', import.meta.url), 'utf8'));

export function allCases() { return cases; }
export function selectCases(env=process.env) {
  const ids = new Set(String(env.CASE_IDS || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean));
  const groups = new Set(String(env.CASE_GROUPS || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean));
  const result = cases.filter(c => (!ids.size || ids.has(c.id)) && (!groups.size || groups.has(c.group)));
  const found = new Set(result.map(c=>c.id));
  const missing = [...ids].filter(id=>!cases.some(c=>c.id===id));
  if (missing.length) throw new Error(`CASE_IDS không tồn tại trong Excel: ${missing.join(', ')}`);
  if (!result.length) throw new Error('Không có case nào phù hợp bộ lọc.');
  return result;
}

export function validateCases(list=cases) {
  const ids = list.map(c=>c.id);
  const invalid=ids.filter(id=>!/^WF-[A-Z0-9]+-\d{3}$/.test(id));
  const duplicate=ids.filter((id,i)=>ids.indexOf(id)!==i);
  return {count: list.length, unique: new Set(ids).size, invalid, duplicate:[...new Set(duplicate)]};
}
