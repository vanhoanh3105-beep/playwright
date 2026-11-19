import assert from 'node:assert/strict';

// Pure contract assertions. Field paths must be mapped to actual backend records, not AI prose.

export function at(value, path) {
  if (path === '$') return value;
  if (typeof path !== 'string' || !path) return undefined;
  return path.split('.').reduce((v, k) => v == null ? undefined : Object.hasOwn(Object(v), k) ? v[k] : undefined, value);
}
export function project(raw, mappings) {
  return Object.fromEntries(Object.entries(mappings || {}).map(([key, rule]) => {
    if (typeof rule === 'string') return [key, at(raw, rule)];
    const items = at(raw, rule.path);
    return [key, Array.isArray(items) ? items.map(x => project(x, rule.fields)) : items];
  }));
}
const ok = (value, label) => assert.ok(value, label);
const text = (value, label) => { ok(typeof value === 'string' && value.trim().length > 0, label); return value; };
const list = (value, label, nonempty = false) => { ok(Array.isArray(value) && (!nonempty || value.length > 0), label); return value; };
const id = (value, label) => { ok((typeof value === 'string' && value.trim()) || (Number.isFinite(value)), label); return String(value); };
const ids = (items, label) => new Set(list(items, label).map(x => id(x.id, label)));
const refIds = (values, label) => list(values, label).map(x => id(x, label));
function subset(actual, valid, label) { for (const value of actual) ok(valid.has(value), label); }
function match(value, pattern, label) { ok(new RegExp(pattern, 'iu').test(text(value, label)), label); }
export function noNewIds(before, after, label) {
  // Equality rather than count: detects additions even if another record disappeared.
  ok(JSON.stringify([...before].sort()) === JSON.stringify([...after].sort()), label);
}
function references(r) {
  const goals = ids(r.goals, 'Goals phải là danh sách ID hợp lệ');
  const tasks = ids(r.tasks, 'Tasks phải là danh sách ID hợp lệ');
  ok(goals.size > 0, 'Cần Goal hợp lệ');
  for (const t of r.tasks) subset(refIds(t.goalIds, 'Task.goalIds'), goals, 'Task tham chiếu Goal không tồn tại');
  return { goals, tasks };
}
function validateProposalLinks(r) {
  const { goals, tasks } = references(r);
  for (const p of list(r.proposals, 'Danh sách nhu cầu Agent/đề xuất', true)) {
    const g = refIds(p.goalIds, 'Proposal.goalIds'); const t = refIds(p.taskIds, 'Proposal.taskIds');
    ok(g.length + t.length > 0, 'Proposal thiếu liên kết Goal/Task');
    subset(g, goals, 'Proposal tham chiếu Goal không hợp lệ'); subset(t, tasks, 'Proposal tham chiếu Task không hợp lệ');
  }
}
function validateTasks(r) {
  const { goals, tasks } = references(r);
  for (const t of list(r.tasks, 'Danh sách công việc', true)) {
    text(t.name, 'Task phải có nội dung');
    ok(refIds(t.goalIds, 'Task.goalIds').length > 0, 'Task chưa liên kết Goal');
    list(t.capabilities, 'Task.capabilities', true).forEach(x => text(x, 'Năng lực trống'));
    const deps = refIds(t.dependencies, 'Task.dependencies');
    subset(deps, tasks, 'Task phụ thuộc Task không tồn tại');
    ok(!deps.includes(String(t.id)), 'Task tự phụ thuộc chính nó');
  }
  return goals;
}
export const assertions = {
  'WF-GO-001': (r, f) => {
    ok(list(r.goals, 'Phải có kết quả phân tích Goal', true).some(g => new RegExp(f.leadPattern, 'iu').test(g.name)), 'Kết quả không tương ứng mục tiêu phân loại lead');
    validateTasks(r);
  },
  'WF-GO-002': (r, f) => {
    match(r.business, f.businessPattern, 'Thiếu bối cảnh doanh nghiệp');
    match(r.industry, f.industryPattern, 'Thiếu ngành nghề');
    match(r.process, f.processPattern, 'Thiếu quy trình đầu vào');
    validateTasks(r);
    ok(list(r.goals, 'Mục tiêu', true).some(g => new RegExp(f.leadPattern, 'iu').test(g.name)), 'Thiếu mục tiêu nghiệp vụ');
    list(r.kpis, 'Chỉ tiêu đánh giá', true).forEach(k => text(k.name, 'KPI thiếu tên'));
    list(r.risks, 'Giới hạn rủi ro', true).forEach(x => text(x, 'Giới hạn rủi ro trống'));
  },
  'WF-GO-004': r => validateProposalLinks(r),
  'WF-GO-005': (r, f) => {
    validateProposalLinks(r);
    const gaps = new Map(list(r.gaps, 'Khoảng trống nghiệp vụ', true).map(g => [id(g.id, 'Gap ID'), text(g.name, 'Gap name')]));
    for (const p of r.proposals) {
      text(p.justification, 'Proposal thiếu giải thích');
      const keys = refIds(p.gapIds, 'Proposal.gapIds');
      ok(keys.length > 0, 'Proposal chưa gắn với khoảng trống nghiệp vụ');
      subset(keys, new Set(gaps.keys()), 'Proposal gắn với khoảng trống không tồn tại');
      ok(keys.some(k => new RegExp(f.gapPattern, 'iu').test(gaps.get(k))) && new RegExp(f.gapPattern, 'iu').test(p.justification), 'Justification không gắn với khoảng trống của fixture phân loại lead ngoài giờ');
    }
  },
  'WF-GO-006': (r, f, policy) => {
    // Evidence from a separate policy/audit API, not self-reported chat content.
    const requested = refIds(r.permissions, 'Quyền đề xuất');
    const tools = list(r.tools, 'Tools đề xuất');
    for (const tool of tools) {
      id(tool.id, 'Tool ID');
      subset(refIds(tool.permissionIds, 'Tool.permissionIds'), new Set(requested), 'Tool có quyền không nằm trong quyền đề xuất');
    }
    const checks = list(policy.checks, 'Policy audit checks');
    const grants = refIds(policy.grantedPermissions, 'Quyền đã cấp bởi Goal');
    ok(grants.length === 0, 'Goal đã tự cấp quyền khi người dùng chưa cấp phép');
    for (const key of requested) {
      ok(checks.some(c => String(c.permission) === key && f.policyDecisions.includes(c.decision) && typeof c.policyId === 'string' && c.policyId.trim()), 'Quyền đề xuất chưa có kiểm tra policy độc lập');
    }
  },
  'WF-GO-009': (r, f, context) => {
    for (const kind of ['agents', 'skills', 'tools', 'connections', 'policies']) {
      const available = refIds(context[kind], `Snapshot ${kind}`);
      const used = refIds(r.context[kind], `CEO context ${kind}`);
      subset(available, new Set(used), `CEO bỏ sót dữ liệu ${kind} có sẵn`);
      subset(used, new Set(available), `CEO tham chiếu ${kind} không có trong snapshot`);
    }
    ok(context.agents.length > 0, 'Fixture cần ít nhất một Agent');
    ok(context.budget !== undefined && context.budget !== null, 'Snapshot thiếu ngân sách');
    ok(JSON.stringify(r.context.budget) === JSON.stringify(context.budget), 'CEO context dùng ngân sách sai hoặc thiếu');
  },
  'WF-GO-012': (r, f) => {
    validateTasks(r); validateProposalLinks(r);
    const first = list(r.goals, 'Goals').filter(g => new RegExp(f.leadPattern, 'iu').test(g.name));
    const second = r.goals.filter(g => new RegExp(f.reportPattern, 'iu').test(g.name));
    ok(first.length > 0 && second.length > 0, 'Thiếu một trong hai mục tiêu');
    const a = new Set(first.map(g => String(g.id))), b = new Set(second.map(g => String(g.id)));
    ok([...a].every(x => !b.has(x)), 'Hai mục tiêu chưa được tách thành Goal riêng');
    for (const [bucket, pattern] of [[a, f.leadTaskPattern], [b, f.reportTaskPattern]]) {
      ok(r.tasks.some(t => t.goalIds.some(g => bucket.has(String(g))) && new RegExp(pattern, 'iu').test(t.name)), 'Thiếu công việc riêng tương ứng mục tiêu');
    }
    const taskById = new Map(r.tasks.map(t => [String(t.id), t]));
    const assignments = new Map();
    for (const p of r.proposals) {
      const key = id(p.agentKey, 'Cần mã Agent/nhu cầu nhất quán');
      const linked = new Set([...p.goalIds.map(String), ...p.taskIds.flatMap(t => taskById.get(String(t)).goalIds.map(String))]);
      const old = assignments.get(key) || { goals: new Set(), reasons: [] };
      linked.forEach(g => old.goals.add(g)); old.reasons.push(p.justification); assignments.set(key, old);
    }
    for (const v of assignments.values()) if ([...v.goals].some(g => a.has(g)) && [...v.goals].some(g => b.has(g))) {
      ok(v.reasons.some(x => typeof x === 'string' && new RegExp(f.crossAssignmentReasonPattern, 'iu').test(x)), 'Agent liên kết hai nghiệp vụ độc lập nhưng không có lý do phù hợp với fixture');
    }
  },
  'WF-GO-013': (r, f) => {
    const questions = list(r.clarifications, 'Câu hỏi làm rõ');
    const assumptions = list(r.assumptions, 'Giả định');
    const kpis = list(r.kpis, 'KPI');
    ok(questions.some(x => typeof x === 'string' && x.trim()) || assumptions.some(x => typeof x === 'string' && x.trim()) || kpis.length > 0, 'Goal mơ hồ nhưng không có câu hỏi, giả định hay KPI đề xuất');
    for (const k of kpis) {
      text(k.name, 'KPI thiếu tên');
      ok(f.unconfirmedKpiStatuses.includes(k.status), 'KPI chưa cung cấp bị đánh dấu đã chốt');
    }
  },
};


