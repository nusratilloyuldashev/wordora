'use strict';
/* Wordora 5.4 — connects existing study / practice / exam flows to local offline snapshots. */
const OF=window.WordoraOffline;
const v7BaseFetch=v4Fetch;
v4Fetch=async function(){
 if(!state.user)return;
 if(OF.isOffline()){
  const rows=await OF.read('learning');
  if(!Array.isArray(rows)){V4.ready=false;V4.announce='Offline o‘rganish tarixi oldindan yuklanmagan.';return;}
  if(V4.activeAccount!==state.user.id){V4.lesson=null;V4.exam=null;V4.activeAccount=state.user.id;}
  v4Set(rows);V4.ready=true;V4.unavailable=false;V4.announce='';
  if(!V4.lesson){
   const saved=v4SafeStorage.read();
   if(saved?.ids?.length&&saved.ids.every(id=>v4Words().some(w=>w.id===id)))V4.lesson=saved;
  }
  return;
 }
 await v7BaseFetch();
 if(V4.ready){
  await OF.store('learning',Object.values(V4.memory)).catch(console.warn);
 }else if(OF.networkError(V4.announce||'')){
  OF.noteFailure(V4.announce);
  const rows=await OF.read('learning');
  if(Array.isArray(rows)){v4Set(rows);V4.ready=true;V4.announce='';}
 }
};
const v7BaseCollections=v5Load;
v5Load=async function(){
 if(!state.user)return;
 if(OF.isOffline()){
  const cached=await OF.read('collections');
  if(cached){
   V5.account=state.user.id;V5.collections=cached.collections||[];V5.items=cached.items||[];
   V5.ready=true;V5.warning='';V5.loading=false;return;
  }
  V5.ready=false;V5.warning='Unitlar offline yuklanmagan.';return;
 }
 await v7BaseCollections();
 if(V5.ready){
  await OF.store('collections',{collections:V5.collections,items:V5.items}).catch(console.warn);
 }else if(OF.networkError(V5.warning||'')){
  OF.noteFailure(V5.warning);
  const cached=await OF.read('collections');
  if(cached){V5.collections=cached.collections||[];V5.items=cached.items||[];V5.ready=true;V5.warning='';}
 }
};
async function v7SaveLearningCache(){
 await OF.store('learning',Object.values(V4.memory));
}
const v7BaseFinish=v4FinishLesson;
v4FinishLesson=async function(){
 if(!OF.isOffline())return v7BaseFinish();
 if(!V4.lesson?.finished||V4.testSaving)return;
 V4.testSaving=true;
 try{
  const today=v4Today();
  const rows=V4.lesson.ids.map(word_id=>({
   user_id:state.user.id,word_id,stage:'learning',introduced_on:today,next_review_on:today,review_interval:0
  }));
  await OF.enqueue('learning-insert',rows);
  for(const row of rows){
   const prior=V4.memory[String(row.word_id)];
   if(!prior)V4.memory[String(row.word_id)]=row;
  }
  await v7SaveLearningCache();
  v4SafeStorage.delete();V4.lesson=null;V4.practiceDate=today;V4.examDate=today;
  state.page='exercises';render();
  toast('So‘zlar telefonda saqlandi. Internet qaytganda sinxronlanadi.','success');
 }catch(e){toast('Offline saqlashda xatolik: '+e.message);}
 finally{V4.testSaving=false;render();}
};
const v7BaseExam=v4SaveExam;
v4SaveExam=async function(){
 if(!OF.isOffline())return v7BaseExam();
 const E=V4.exam;if(!E?.finished||E.saving||E.result==='saved')return;
 E.saving=true;render();
 try{
  const score=Math.round(E.correct/E.items.length*100),passed=score>=V4.threshold,today=v4Today();
  const updates=E.items.map(q=>{
   const old=V4.memory[String(q.id)];
   if(!old)throw Error('O‘rganilmagan so‘z uchun natija saqlanmaydi.');
   const promote=passed&&q.checked;
   return {user_id:state.user.id,word_id:q.id,stage:promote?'mastered':'learning',
    introduced_on:old.introduced_on,next_review_on:promote?v4DayPlus(1):today,
    review_interval:promote?1:0,last_test_score:score,tested_at:new Date().toISOString()};
  });
  await OF.enqueue('exam',updates);
  for(const row of updates)V4.memory[String(row.word_id)]=row;
  await v7SaveLearningCache();
  E.result='saved';E.offlineQueued=true;
  toast('Test natijasi offline saqlandi. Internet qaytganda sinxronlanadi.','success');
 }catch(e){toast('Offline test natijasini saqlab bo‘lmadi: '+e.message);}
 finally{E.saving=false;render();}
};
const v7BaseResults=v4ExamResults;
v4ExamResults=function(){
 const html=v7BaseResults();
 return V4.exam?.offlineQueued?html.replace('Natija Supabase bazasida saqlandi.','Natija telefonda saqlandi. Internet qaytganda yuboriladi.'):html;
};
const v7BasePractice=saveAndAdvance;
saveAndAdvance=async function(quality){
 if(!OF.isOffline())return v7BasePractice(quality);
 const w=state.session[state.index];
 if(state.saving||state.page!=='practice'||!w)return;
 cancelAutoNext();state.saving=true;
 try{
  const mode=questionMode();
  await OF.enqueue('review',{word_id:w.id,mode,quality});
  if(V4.ready){
   const meta=v4Meta(w);
   if(meta){
    const step=quality>=3?Math.max(1,Math.min(5,(Number(meta.review_interval)||0)+1)):1;
    const day=v4DayPlus([0,1,3,7,14,30][step]);
    const fields={next_review_on:day,review_interval:step};
    await OF.enqueue('learning-update',{wordId:w.id,fields});
    Object.assign(meta,fields);await v7SaveLearningCache();
   }
  }
  if(quality>=3)state.sessionCorrect++;else state.sessionWrong++;
  state.index++;
  if(state.index>=state.session.length)state.sessionFinished=true;
  else initializeQuestion();
  render();toast('Natija telefonda saqlandi, keyin sinxronlanadi.','success');
 }catch(e){toast('Offline mashqni saqlab bo‘lmadi: '+e.message);}
 finally{state.saving=false;}
};
const v7LoadCore=loadCore;
loadCore=async function(){
 if(state.user)OF.remember(state.user);
 await v7LoadCore();
};
OF.refreshData=async()=>{await loadCore();};
const v7Render=render;
let offlineInstallPrompt=null;
let info={pending:0,ready:false};
function offlineIndicator(){
 if(!state.user)return '';
 const off=OF.isOffline();
 return `<div class="wordora-offline-banner ${off?'offline':info.ready?'ready':'online'}" role="status">
  <span>${off?'📴 Offline rejim':info.ready?'✅ Offline uchun tayyor':'📥 Offline ma’lumot yuklanmoqda'}</span>
  <span>${info.pending?`${info.pending} ta yuborilmagan natija`:'So‘zlar qurilmada saqlanadi'}</span>
  <div class="wordora-offline-actions">${off?'':`<button data-offline="prepare">⬇️ Offline uchun yuklash</button>${info.pending?'<button data-offline="sync">🔄 Sinxronlash</button>':''}`}<button data-offline="install">📲 Telefonga o‘rnatish</button><button data-offline="help" aria-label="Offline yordam">ⓘ</button></div>
 </div>`;
}
render=function(){
 v7Render();
 const el=document.getElementById('app');
 if(!el||!state.user)return;
 el.insertAdjacentHTML('afterbegin',offlineIndicator());
};
let statusBusy=false;
async function refreshStatus(){
 if(statusBusy||!state.user)return;
 statusBusy=true;
 try{
  const [pending,words,learning,prepared]=await Promise.all([OF.pending(),OF.read('words'),OF.read('learning'),OF.read('pwa-ready')]);
  const next={pending:pending.length,ready:!!prepared?.prepared&&!!words?.words?.length&&Array.isArray(learning)};
  if(next.pending!==info.pending||next.ready!==info.ready){info=next;render();}
 }catch(e){console.warn('Wordora offline status:',e);}
 finally{statusBusy=false;}
}
document.addEventListener('wordora-offline-status',()=>{refreshStatus().catch(console.warn);render();});
window.addEventListener('online',async()=>{
 try{
  const outcome=await OF.sync();
  if(outcome.synced&&state.user){await loadCore();render();toast(`${outcome.synced} ta offline amal sinxronlandi.`,'success');}
  await refreshStatus();
 }catch(e){console.warn('Wordora online sync:',e);}
});
window.addEventListener('offline',()=>render());
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();offlineInstallPrompt=e;render();});
window.addEventListener('appinstalled',()=>{offlineInstallPrompt=null;toast('Wordora bosh ekranga o‘rnatildi!','success');render();});
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-offline]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 const action=b.dataset.offline;
 if(action==='help')return toast('Internetda bir marta kirib “Offline uchun yuklash”ni bosing. Offline mashq va test natijalari internet qaytgach yuboriladi.','success');
 if(action==='install'){
  if(offlineInstallPrompt){offlineInstallPrompt.prompt();await offlineInstallPrompt.userChoice;offlineInstallPrompt=null;}
  else toast('Android: Chrome → ⋮ → Bosh ekranga qo‘shish. iPhone: Safari → Share → Add to Home Screen.','success');
  return;
 }
 if(action==='prepare'){
  b.disabled=true;
  try{await OF.prepare();await refreshStatus();toast('Wordora so‘zlari offline uchun yuklandi.','success');}
  catch(e){toast('Yuklash amalga oshmadi: '+e.message);}
  finally{b.disabled=false;}
 }
 if(action==='sync'){
  b.disabled=true;
  try{
   const result=await OF.sync();
   if(result.needsLogin)toast('Natijalarni yuborish uchun internet orqali qayta kiring.');
   else if(result.remaining)toast('Ba’zi natijalar hali yuborilmadi. Keyin yana urinib ko‘ring.');
   else toast(`${result.synced||0} ta amal sinxronlandi.`,'success');
   if(result.synced){await loadCore();render();}
   await refreshStatus();
  }catch(err){toast(err.message);}
  finally{b.disabled=false;}
 }
},true);
if('serviceWorker' in navigator){
 window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js',{scope:'/'}).catch(e=>console.warn('SW:',e)));
}
if(state.user)refreshStatus().catch(console.warn);
window.addEventListener('load',async()=>{if(state.user&&navigator.onLine){try{const result=await OF.sync();if(result.synced){await loadCore();render();}await refreshStatus();}catch(e){console.warn('Offline initial sync:',e);}}});
document.addEventListener('wordora-offline-authorized-signout',()=>OF.forget());
// Prevent silently losing an unsent offline queue by attempting offline logout.
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-action="logout"]');
 if(!button)return;
 if(OF.isOffline()){
  e.preventDefault();e.stopImmediatePropagation();
  toast('Offline natijalarni yo‘qotmaslik uchun internet qaytganda hisobdan chiqing.');
 }
},true);
