import crypto from 'node:crypto';
const str=x=>typeof x==='string'&&x.trim()!=='';
export function complete(body,label){if(!Array.isArray(body?.results)||!Number.isInteger(body.count)||body.next!=null||body.count!==body.results.length)throw new Error(`${label}: incomplete/paginated`);return body.results;}
export function ids(rows,key,label){if(!Array.isArray(rows)||rows.some(x=>!str(x?.[key])))throw new Error(`${label}: missing IDs`);const v=rows.map(x=>x[key]);if(new Set(v).size!==v.length)throw new Error(`${label}: duplicate IDs`);return v.sort();}
function canon(x){if(Array.isArray(x))return x.map(canon);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])]));return x;}
function state(rows,key){return crypto.createHash('sha256').update(JSON.stringify(canon([...rows].sort((a,b)=>a[key].localeCompare(b[key]))))).digest('hex');}
const fields=(row,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(row,k)).map(k=>[k,row[k]]));
export function snapshot(g,w,s,company){
 const goals=complete(g,'goals');if(goals.some(x=>x.company!==company))throw new Error('Goal company not verified');
 const a=ids(w?.agents,'agent_id','agents'),p=ids(w?.proposals,'proposal_id','proposals');
 const sessions=ids(s?.sessions,'id','sessions');
 return {goals:ids(goals,'id','goals'),agents:a,proposals:p,sessions,planRefs:[...new Set(w.proposals.map(x=>x.plan_id).filter(str))].sort(),fingerprints:{goals:state(goals.map(x=>fields(x,['id','title','description','status','company','key_results'])),'id'),agents:state(w.agents.map(x=>fields(x,['agent_id','status','enabled','skills','config_hash','role','manager_id','activated_at'])),'agent_id'),proposals:state(w.proposals.map(x=>fields(x,['proposal_id','plan_id','action','status','role_key','approval_id','existing_agent_id','created_agent_id','config_hash','version','justification'])),'proposal_id')}};
}
export const counts=s=>Object.fromEntries(['goals','agents','proposals','planRefs','sessions'].map(k=>[k,s[k].length]));
export function compare(before,after,sessionId){const unchanged=['goals','agents','proposals','planRefs'].every(k=>JSON.stringify(before[k])===JSON.stringify(after[k]))&&['goals','agents','proposals'].every(k=>before.fingerprints[k]===after.fingerprints[k]);return {unchanged,sessionPersisted:typeof sessionId==='string'&&!before.sessions.includes(sessionId)&&after.sessions.includes(sessionId)};}
