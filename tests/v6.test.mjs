import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const src=read('src/wordora-v6.js');
const words=[
 {id:1,en:'arrive',uz:'yetib kelmoq',example_en:'We arrive today.',example_uz:'Biz bugun yetib kelamiz.'},
 {id:2,en:'decide',uz:'qaror qilmoq',example_en:'I decide now.'},
 {id:3,en:'secret',uz:'sir',example_en:'It is a secret.'},
 {id:4,en:'river',uz:'daryo',example_en:'The river is big.'},
 {id:5,en:'agree',uz:'rozi bo‘lmoq'},
];
function harness(){
 const listenerMap={click:[],submit:[],input:[]};
 const context={
  V4:{ready:true,maxLessonWords:40,count:3,threshold:90,lesson:null,testSaving:false},
  V5:{autoAdvance:false,advanceTimer:null},
  v4SceneMap:{},v4Begin:()=>{},v4LessonWord:()=>null,v4LessonPage:()=>'',v4LessonScreen:()=>'',v4Advance:()=>{},
  v4Scene:w=>({emoji:'🚌',hint:w.uz}),v4ExampleGap:w=>w.example_en?.replace(w.en,'______')||'',
  v4Words:()=>words,v4Matches:()=>true,v4Introduced:()=>false,v4Today:()=> '2026-10-31',
  v4SaveLesson:()=>{},v4Pronounce:()=>{},toast:()=>{},render:()=>{},
  state:{page:'learn',user:{id:'u1'}},
  shuffle:array=>array.slice(),normalize:value=>String(value||'').toLowerCase().trim(),
  esc:v=>String(v),clearTimeout:()=>{},requestAnimationFrame:fn=>fn(),
  document:{addEventListener:(type,fn)=>listenerMap[type]?.push(fn),getElementById:()=>null},
  window:{WordoraV5Schedule:()=>{}},
 };
 vm.createContext(context);vm.runInContext(src,context,{timeout:1500});
 return context;
}
test('new lessons preserve original IDs and begin at introductory step',()=>{
 const c=harness();c.v4Begin();
 const l=c.V4.lesson;
 assert.equal(l.smartVersion,6);
 assert.equal(l.step,0);
 assert.equal(l.smartQueue.length,3);
 assert.deepEqual([...l.ids],[1,2,3]);
 assert.equal(l.finished,false);
});
test('each word must complete four different recall tasks before the next word',()=>{
 const c=harness();c.v4Begin();const l=c.V4.lesson;
 c.v6Next();assert.equal(l.step,1);assert.equal(l.index,0);
 c.v6Next();assert.equal(l.step,1,'cannot skip without answering');
 const one=words[0],meanings=c.v6OptionValues(l,one,'meaning');
 c.v6Choose({dataset:{index:String(meanings.indexOf(one.uz))}});
 assert.equal(l.phase,'checked');c.v6Next();assert.equal(l.step,2);
 const english=c.v6OptionValues(l,one,'english');
 c.v6Choose({dataset:{index:String(english.indexOf(one.en))}});
 assert.equal(l.phase,'checked');c.v6Next();assert.equal(l.step,3);
 const parts=c.v6Parts(one);
 for(let i=0;i<parts.length;i++)c.v6Piece({dataset:{index:String(i)}});
 assert.equal(l.phase,'checked');c.v6Next();assert.equal(l.step,4);
 c.v6Type({elements:{'v6-answer':{value:'arrive'}}});
 assert.equal(l.phase,'checked');c.v6Next();
 assert.equal(l.index,1);assert.equal(l.step,0);
 assert.equal(l.finished,false);
});
test('mistakes and optional hints put the word in weak review without auto-mastering',()=>{
 const c=harness();c.v4Begin();const l=c.V4.lesson;c.v6Next();
 const options=c.v6OptionValues(l,words[0],'meaning'),wrong=options.findIndex(x=>x!==words[0].uz);
 c.v6Choose({dataset:{index:String(wrong)}});
 assert.deepEqual([...l.weakIds],[1]);assert.equal(l.phase,'ready');
 assert.equal(l.errors,1);
 l.finished=true;c.v6Repeat(true);
 assert.deepEqual([...l.ids],[1,2,3]);
 assert.deepEqual([...l.smartQueue],[1]);
 assert.equal(l.step,0);assert.equal(l.finished,false);
});
test('old saved V5 lesson retains every word and resumes safely in smart mode',()=>{
 const c=harness();
 c.V4.lesson={ids:[1,2,3],index:2,round:2,chunkStart:0,finished:false};
 const l=c.v6EnsureLesson();
 assert.equal(l.smartVersion,6);
 assert.equal(l.index,0);
 assert.equal(l.step,0);
 assert.deepEqual([...l.ids],[1,2,3]);
});
test('no new database migration or new mastery shortcut is introduced',()=>{
 const html=read('src/index.html');
 const legacy=read('src/wordora-v4.js');
 assert.match(html,/wordora-v6\.css/);
 assert.match(html,/wordora-v6\.js/);
 assert.match(src,/smartVersion:6/);
 assert.match(src,/v4LessonWord=function/);
 assert.match(src,/data-v6="repeat-weak"/);
 assert.match(src,/data-v6="part"/);
 assert.match(src,/id="v6-learning-form"/);
 assert.match(legacy,/threshold: 90/);
 assert.match(legacy,/const promote=passed&&q\.checked/);
 assert.doesNotMatch(src,/\b(truncate|drop table|delete from)\b/i);
});
