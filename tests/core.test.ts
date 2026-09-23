import {test} from 'node:test';import {strict as assert} from 'node:assert';import {seed,login,visibleKnowledge,visibleTasks,createKnowledge,createTask,transition} from '../src/core.ts';
const hq=login('hq@example.com','demo-hq-only')!;const store=login('store@example.com','demo-store-only')!;const reviewer=login('review@example.com','demo-review-only')!;
test('demo login rejects wrong password',()=>assert.equal(login('hq@example.com','wrong'),null));
test('shared parent inherited but private parent hidden',()=>assert.deepEqual(visibleKnowledge(seed(),store).map(x=>x.id),['k-hq']));
test('tenant isolation',()=>{let s=seed();assert.equal(visibleKnowledge(s,hq).some(x=>x.id==='k-other'),false);assert.equal(visibleTasks(s,{...store,tenant:'other'}).length,0)});
test('store cannot share knowledge upward',()=>assert.throws(()=>createKnowledge(seed(),store,{id:'k',title:'x',body:'x',visibility:'shared'})));
test('task cannot cite inaccessible knowledge',()=>assert.throws(()=>createTask(seed(),store,{id:'bad',title:'x',knowledgeIds:['k-private']})));
test('state machine enforces human gate and audit',()=>{let s=seed();assert.throws(()=>transition(s,store,'t-1','published'));transition(s,store,'t-1','review');transition(s,reviewer,'t-1','approved');transition(s,hq,'t-1','published');assert.equal(s.audit.length,3)});
test('reviewer cannot author',()=>assert.throws(()=>createTask(seed(),reviewer,{id:'x',title:'x',knowledgeIds:[]})));
