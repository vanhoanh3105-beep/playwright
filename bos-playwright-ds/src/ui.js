export function allowedBody(body,company,prompt,previousMode){
 if(!body||body.company_id!==company||body.session_id!==null||body.message!==prompt||typeof body.run_mode!=='string'||!body.run_mode.trim()||typeof body.agent_auto!=='boolean') return false;
 if(/full|toan.?quyen|unrestricted/iu.test(body.run_mode))return false;
 return !previousMode||(body.run_mode===previousMode.run_mode&&body.agent_auto===previousMode.agent_auto);
}
// Labels verified from the WCC mode menu screenshot. Do not read them from stdin.
export const planningLabel = 'Chỉ lập kế hoạch';
export const modeLabels = [planningLabel, 'Hỏi từng bước', 'Tự làm việc nhẹ', 'Toàn quyền'];
export function uniqueCurrentMode(counts){
 const present=modeLabels.filter(x=>counts[x]>0);
 return present.length===1&&counts[present[0]]===1?present[0]:null;
}
export function safePlanningWire(value){
 // auto was observed in the prior probe. Never forward known autonomous modes.
 // Unknown enum semantics are not a confirmed backend policy. Require a clear planning enum.
 return typeof value==='string'&&/^(plan|plan[-_]only|planning|planning[-_]only)$/i.test(value.trim());
}
export async function selectPlanningMode(page){
 const loc=x=>page.getByText(x,{exact:true}).filter({visible:true});
 const state=async()=>uniqueCurrentMode(Object.fromEntries(await Promise.all(modeLabels.map(async x=>[x,await loc(x).count()]))));
 const waitMode=async expected=>{
  const end=Date.now()+5000;
  do{const current=await state();if(current&&(!expected||current===expected))return current;await new Promise(r=>setTimeout(r,150));}while(Date.now()<end);
  throw new Error('Cannot verify a unique closed mode menu; no message sent');
 };
 const current=await waitMode();
 if(current!==planningLabel){
  await loc(current).click({timeout:5000});
  await loc(planningLabel).waitFor({state:'visible',timeout:5000});
  if(await loc(planningLabel).count()!==1)throw new Error('Planning mode option ambiguous');
  await loc(planningLabel).click({timeout:5000});
 }
 await waitMode(planningLabel);
}
