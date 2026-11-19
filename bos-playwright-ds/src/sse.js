// WCC observed SSE protocol: turn/session/reasoning/chunk/done.
// Transport completion is NOT proof of a Workforce Plan or business PASS.
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
export function parseBrainSse(raw) {
  if(typeof raw !== 'string') throw new Error('SSE body is not text');
  const frames = raw.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split('\n\n');
  const types = new Set(); const sessions = new Set(); const turns = new Set();
  let done = null, chunks = 0;
  for(const frame of frames) {
    let event='message'; const data=[];
    for(const line of frame.split('\n')) {
      if(line.startsWith(':')) continue;
      const split=line.indexOf(':'); if(split<0) continue;
      const field=line.slice(0,split); const value=line.slice(split+1).replace(/^ /,'');
      if(field==='event') event=value;
      if(field==='data') data.push(value);
    }
    if(!data.length) continue;
    const body=data.join('\n');
    if(body==='[DONE]') continue; // not the observed WCC terminal message
    let obj; try {obj=JSON.parse(body);} catch {throw new Error('Malformed SSE data');}
    if(!obj||typeof obj!=='object'||Array.isArray(obj)) throw new Error('Invalid SSE event data');
    const type=obj.type||event; types.add(type);
    if(['error','failed','failure','cancelled','canceled','abort'].includes(type)||event==='error'||obj.error) throw new Error('SSE reported an error');
    if(nonempty(obj.session_id)) sessions.add(obj.session_id);
    if(type==='turn'&&nonempty(obj.turn_id)) turns.add(obj.turn_id);
    if(type==='chunk') chunks++;
    if(type==='done') { if(done) throw new Error('Duplicate done event'); done=obj; }
  }
  if(!done) throw new Error('Missing SSE done event');
  if(sessions.size!==1 || !nonempty(done.session_id)) throw new Error('Missing or inconsistent session ID');
  if(turns.size!==1) throw new Error('Missing or inconsistent turn ID');
  if(!nonempty(done.message?.id)||!nonempty(done.message?.content)||!nonempty(done.message?.role)) throw new Error('Missing terminal message fields');
  const meta=done.message.meta;
  if(!meta||typeof meta!=='object') throw new Error('Missing terminal metadata');
  // Values of result_kind, ket_cuc and finish_reason are not yet verified.
  return {done,turnId:[...turns][0],sessionId:done.session_id,types:[...types],chunks};
}
export async function readBrainSse(response, timeoutMs=180000){
  if(!response.ok()) throw new Error(`SSE HTTP ${response.status()}`);
  if(!(response.headers()['content-type']||'').toLowerCase().includes('text/event-stream')) throw new Error('Expected text/event-stream');
  let timer;
  try {
    const raw=await Promise.race([response.text(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Timed out waiting for SSE completion')),timeoutMs);})]);
    return parseBrainSse(raw);
  } finally {clearTimeout(timer);}
}
