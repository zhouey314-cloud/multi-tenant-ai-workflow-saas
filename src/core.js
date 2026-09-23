// Single deterministic policy core shared by local API and browser demo.
// All identities and records are fictional; these passwords are not security controls.
export const seed = () => ({
  units: {hq:{tenant:'demo',parent:null},store:{tenant:'demo',parent:'hq'},other:{tenant:'other',parent:null}},
  knowledge:[
    {id:'k-hq',tenant:'demo',unit:'hq',visibility:'shared',title:'Sample product',body:'Fictional reusable policy.'},
    {id:'k-private',tenant:'demo',unit:'hq',visibility:'private',title:'Private note',body:'Synthetic HQ only.'},
    {id:'k-other',tenant:'other',unit:'other',visibility:'shared',title:'Other tenant',body:'Must be isolated.'}
  ],
  tasks:[{id:'t-1',tenant:'demo',unit:'store',title:'Sample launch copy',state:'draft',knowledgeIds:['k-hq']}],audit:[]
});
export const users = {
  'hq@example.com':{password:'demo-hq-only',actor:{id:'hq@example.com',tenant:'demo',unit:'hq',role:'hq_admin'}},
  'store@example.com':{password:'demo-store-only',actor:{id:'store@example.com',tenant:'demo',unit:'store',role:'store_editor'}},
  'review@example.com':{password:'demo-review-only',actor:{id:'review@example.com',tenant:'demo',unit:'hq',role:'reviewer'}}
};
export function login(email,password){const user=users[email];return user?.password===password?user.actor:null;}
function ancestors(store,unit){const seen=new Set();let current=unit;while(current&&!seen.has(current)){seen.add(current);current=store.units[current]?.parent??null;}return seen;}
export function visibleKnowledge(store,actor){const inherited=ancestors(store,actor.unit);return store.knowledge.filter(item=>item.tenant===actor.tenant&&(item.unit===actor.unit||actor.role==='hq_admin'||(item.visibility==='shared'&&inherited.has(item.unit))));}
export function visibleTasks(store,actor){return store.tasks.filter(task=>task.tenant===actor.tenant&&(actor.role==='hq_admin'||actor.role==='reviewer'||task.unit===actor.unit));}
export function visibleAudit(store,actor){return store.audit.filter(event=>event.tenant===actor.tenant&&(actor.role!=='store_editor'||event.actor===actor.id));}
export function canTransition(actor,task,next){if(actor.tenant!==task.tenant)return false;if(actor.role==='store_editor')return actor.unit===task.unit&&((task.state==='draft'&&next==='review')||(task.state==='rejected'&&next==='draft'));if(actor.role==='reviewer')return task.state==='review'&&(next==='approved'||next==='rejected');return actor.role==='hq_admin'&&task.state==='approved'&&next==='published';}
export function transition(store,actor,id,next){const task=store.tasks.find(item=>item.id===id&&item.tenant===actor.tenant);if(!task||!canTransition(actor,task,next))throw Error('FORBIDDEN_TRANSITION');const previous=task.state;task.state=next;store.audit.push({at:new Date().toISOString(),actor:actor.id,action:`${previous}->${next}`,target:id,tenant:actor.tenant});return task;}
export function createKnowledge(store,actor,item){if(actor.role==='reviewer'||!['private','shared'].includes(item.visibility))throw Error('FORBIDDEN');if(actor.role==='store_editor'&&item.visibility==='shared')throw Error('FORBIDDEN');if(!item.id||!item.title||store.knowledge.some(existing=>existing.id===item.id))throw Error('INVALID_OR_DUPLICATE');const created={id:item.id,title:item.title,body:item.body??'',visibility:item.visibility,tenant:actor.tenant,unit:actor.unit};store.knowledge.push(created);store.audit.push({at:new Date().toISOString(),actor:actor.id,action:'knowledge.create',target:item.id,tenant:actor.tenant});return created;}
export function createTask(store,actor,input){if(actor.role==='reviewer'||!input.id||!input.title||store.tasks.some(item=>item.id===input.id))throw Error('FORBIDDEN');const allowed=new Set(visibleKnowledge(store,actor).map(item=>item.id));if(!input.knowledgeIds.every(id=>allowed.has(id)))throw Error('KNOWLEDGE_DENIED');const task={id:input.id,title:input.title,knowledgeIds:input.knowledgeIds,tenant:actor.tenant,unit:actor.unit,state:'draft'};store.tasks.push(task);store.audit.push({at:new Date().toISOString(),actor:actor.id,action:'task.create',target:input.id,tenant:actor.tenant});return task;}
