import {seed,users,login,visibleKnowledge,visibleTasks,visibleAudit,canTransition,createKnowledge,createTask,transition} from '../src/core.js';

const key='tenantflow-synthetic-v2';
const $=id=>document.getElementById(id);
const load=()=>{try{const value=JSON.parse(localStorage.getItem(key));return value?.units&&Array.isArray(value.knowledge)&&Array.isArray(value.tasks)&&Array.isArray(value.audit)?value:seed();}catch{return seed();}};
let store=load();
let actor=login('hq@example.com',users['hq@example.com'].password);
const save=()=>localStorage.setItem(key,JSON.stringify(store));
const node=(tag,text,className)=>{const element=document.createElement(tag);element.textContent=String(text);if(className)element.className=className;return element;};
const list=(id,items,make)=>{const root=$(id);root.replaceChildren(...(items.length?items.map(make):[node('li','Nothing visible for this role yet.','meta')]));};
const feedback=message=>{$('feedback').textContent=message;};
const run=action=>{try{action();save();feedback('Action saved in this browser.');render();}catch(error){feedback(error.message);}};
const newId=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;

function render(){
  $('identity').textContent=`Viewing as ${actor.id} · ${actor.role} · unit ${actor.unit}`;
  const knowledge=visibleKnowledge(store,actor);
  list('knowledge',knowledge,item=>{const li=node('li','', 'item');li.append(node('strong',item.title),node('span',`${item.unit} · ${item.visibility}`,`tag ${item.visibility==='private'?'private':''}`),node('div',item.body,'meta'));return li;});
  const choice=$('knowledge-choice');choice.replaceChildren(...knowledge.map(item=>{const option=node('option',`${item.title} · ${item.unit}`);option.value=item.id;return option;}));
  $('knowledge-form').querySelector('button').disabled=actor.role==='reviewer';
  $('task-form').querySelector('button').disabled=actor.role==='reviewer'||knowledge.length===0;
  $('knowledge-form').elements.visibility.querySelector('option[value=shared]').disabled=actor.role==='store_editor';
  list('tasks',visibleTasks(store,actor),task=>{
    const li=node('li','', 'item');li.append(node('strong',task.title),node('span',`${task.unit} · ${task.state} · sources: ${task.knowledgeIds.join(', ')}`,'meta'));
    const choices=[['review','Submit for review'],['approved','Approve'],['rejected','Reject'],['draft','Revise draft'],['published','Publish']];
    for(const [next,label] of choices)if(canTransition(actor,task,next)){const button=node('button',label,next==='rejected'?'danger':'');button.addEventListener('click',()=>run(()=>transition(store,actor,task.id,next)));li.append(button);}
    return li;
  });
  list('audit',visibleAudit(store,actor).slice().reverse(),event=>{const li=node('li','', 'item');li.append(node('strong',`${event.actor} · ${event.action}`),node('span',`${event.at} · ${event.target}`,'meta'));return li;});
}

$('account').addEventListener('change',()=>{$('password').value=users[$('account').value].password;});
$('password').value=users[$('account').value].password;
$('switch').addEventListener('click',()=>{const selected=login($('account').value,$('password').value);if(!selected){feedback('Invalid public demo password.');return;}actor=selected;feedback('Role switched.');render();});
$('reset').addEventListener('click',()=>{store=seed();save();feedback('Synthetic demo data reset.');render();});
$('knowledge-form').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;const data=new FormData(form);run(()=>createKnowledge(store,actor,{id:newId('k'),title:String(data.get('title')).trim(),body:String(data.get('body')).trim(),visibility:String(data.get('visibility'))}));form.reset();});
$('task-form').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;const data=new FormData(form);run(()=>createTask(store,actor,{id:newId('t'),title:String(data.get('title')).trim(),knowledgeIds:[String(data.get('knowledgeId'))]}));form.reset();});
render();
