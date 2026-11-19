import { allCases } from '../src/cases.js';
for(const c of allCases()) console.log(`${c.id} | ${c.priority} | ${c.expected}`);
console.log(`Tổng: ${allCases().length} test case GO`);
