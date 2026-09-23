export type Role = 'hq_admin' | 'store_editor' | 'reviewer';
export type Actor = { id:string; tenant:string; unit:string; role:Role };
export type Knowledge = { id:string; tenant:string; unit:string; visibility:'private'|'shared'; title:string; body:string };
export type TaskState = 'draft'|'review'|'approved'|'published';
export type Task = { id:string; tenant:string; unit:string; title:string; state:TaskState; knowledgeIds:string[] };
export type Audit = { at:string; actor:string; action:string; target:string; tenant:string };
export type Store = { units:Record<string,{tenant:string;parent:string|null}>; knowledge:Knowledge[]; tasks:Task[]; audit:Audit[] };
export const seed = ():Store => ({
  units:{ hq:{tenant:'demo',parent:null}, store:{tenant:'demo',parent:'hq'}, other:{tenant:'other',parent:null} },
  knowledge:[{id:'k-hq',tenant:'demo',unit:'hq',visibility:'shared',title:'Sample product',body:'Fictional reusable policy.'},{id:'k-private',tenant:'demo',unit:'hq',visibility:'private',title:'Private note',body:'Synthetic HQ only.'},{id:'k-other',tenant:'other',unit:'other',visibility:'shared',title:'Other tenant',body:'Must be isolated.'}],
  tasks:[{id:'t-1',tenant:'demo',unit:'store',title:'Sample launch copy',state:'draft',knowledgeIds:['k-hq']}],audit:[]
});
export const users:Record<string,{password:string;actor:Actor}> = {
  'hq@example.com':{password:'demo-hq-only',actor:{id:'hq@example.com',tenant:'demo',unit:'hq',role:'hq_admin'}},
  'store@example.com':{password:'demo-store-only',actor:{id:'store@example.com',tenant:'demo',unit:'store',role:'store_editor'}},
  'review@example.com':{password:'demo-review-only',actor:{id:'review@example.com',tenant:'demo',unit:'hq',role:'reviewer'}}
};
export function login(email:string,password:string):Actor|null { const u=users[email]; return u?.password===password?u.actor:null; }
function ancestors(s:Store,unit:string):string[] { const seen=new Set<string>(); let cur:string|null=unit; while(cur&&!seen.has(cur)){seen.add(cur);cur=s.units[cur]?.parent??null;} return [...seen]; }
export function visibleKnowledge(s:Store,a:Actor):Knowledge[] { return s.knowledge.filter(k=> k.tenant===a.tenant && (k.unit===a.unit || (k.visibility==='shared' && ancestors(s,a.unit).includes(k.unit)))); }
export function visibleTasks(s:Store,a:Actor):Task[] {return s.tasks.filter(t=>t.tenant===a.tenant && (a.role==='hq_admin'||a.role==='reviewer'||t.unit===a.unit));}
export function canTransition(a:Actor,t:Task,to:TaskState):boolean { if(a.tenant!==t.tenant) return false; if(a.role==='store_editor') return a.unit===t.unit && t.state==='draft' && to==='review'; if(a.role==='reviewer') return t.state==='review' && (to==='approved'||to==='draft'); return a.role==='hq_admin' && ((t.state==='approved'&&to==='published')||(t.state==='review'&&to==='draft')); }
export function transition(s:Store,a:Actor,id:string,to:TaskState):Task { const t=s.tasks.find(v=>v.id===id&&v.tenant===a.tenant); if(!t||!canTransition(a,t,to)) throw new Error('FORBIDDEN_TRANSITION'); const from=t.state; t.state=to; s.audit.push({at:new Date().toISOString(),actor:a.id,action:`${from}->${to}`,target:id,tenant:a.tenant}); return t; }
export function createKnowledge(s:Store,a:Actor,k:Omit<Knowledge,'tenant'|'unit'>):Knowledge { if(a.role==='reviewer'||(!['private','shared'].includes(k.visibility)))throw new Error('FORBIDDEN'); if(a.role==='store_editor'&&k.visibility==='shared')throw new Error('FORBIDDEN'); if(s.knowledge.some(x=>x.id===k.id))throw new Error('DUPLICATE'); const item={...k,tenant:a.tenant,unit:a.unit};s.knowledge.push(item);s.audit.push({at:new Date().toISOString(),actor:a.id,action:'knowledge.create',target:k.id,tenant:a.tenant});return item; }
export function createTask(s:Store,a:Actor,t:Pick<Task,'id'|'title'|'knowledgeIds'>):Task {if(a.role==='reviewer'||s.tasks.some(x=>x.id===t.id))throw new Error('FORBIDDEN');const allowed=new Set(visibleKnowledge(s,a).map(k=>k.id));if(!t.knowledgeIds.every(id=>allowed.has(id)))throw new Error('KNOWLEDGE_DENIED');const task={...t,tenant:a.tenant,unit:a.unit,state:'draft' as TaskState};s.tasks.push(task);s.audit.push({at:new Date().toISOString(),actor:a.id,action:'task.create',target:t.id,tenant:a.tenant});return task;}
