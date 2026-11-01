'use strict';
/* Wordora 7.4 — safe, ordered and durable exam submission.
 * Loaded AFTER the v4 and offline modules; replaces blind exam upserts.
 */
(function(){
 const OF=window.WordoraOffline;
 if(!OF)return;
 function makeRows(E){
  if(!E?.finished||!E.items?.length)return [];
  const score=Math.round(E.correct/E.items.length*100);
  const passed=score>=V4.threshold;
  const today=v4Today(),testedAt=new Date().toISOString();
  return E.items.map(q=>{
   const old=V4.memory[String(q.id)];
   if(!old)throw Error('Testdagi so‘z avval yodlanmagan.');
   const promote=passed&&q.checked;
   return {
    word_id:q.id,stage:promote?'mastered':'learning',
    next_review_on:promote?v4DayPlus(1):today,
    review_interval:promote?1:0,last_test_score:score,
    tested_at:testedAt,
    // Never use the local offline test timestamp as a server precondition.
    // The value observed in the last successful server snapshot is retained.
    expected_tested_at:old.server_tested_at!==undefined
     ?old.server_tested_at:(old.tested_at||null)
   };
  });
 }
 function mirrorRows(rows){
  for(const row of rows){
   const old=V4.memory[String(row.word_id)];
   if(!old)continue;
   V4.memory[String(row.word_id)]={
    ...old,...row,
    server_tested_at:old.server_tested_at!==undefined
      ?old.server_tested_at:(old.tested_at||null)
   };
  }
 }
 const priorResults=v4ExamResults;
 v4ExamResults=function(){
  let html=priorResults();
  if(V4.exam?.result==='conflict'){
   html=html.replace('<div class="v4-action-row">',
    '<div class="v74-exam-conflict" role="alert">⚠️ Boshqa qurilmada yangi test natijasi saqlangan. Eski natija avtomatik almashtirilmadi. Natijani ko‘rish yoki eski navbatni saqlab qo‘yish uchun yuqoridagi sinxronlash ogohlantirishidan foydalaning.</div><div class="v4-action-row">');
   html=html.replace(/<button class="btn btn-primary" data-v4="save-exam"[^>]*>[^<]*<\/button>/,
    '<button class="btn btn-primary" disabled>Saqlash to‘xtatildi</button>');
  }
  return html;
 };
 v4SaveExam=async function(){
  const E=V4.exam;
  if(!E?.finished||E.saving||E.result==='saved'||E.result==='conflict')return;
  E.saving=true;render();
  try{
   let item;
   if(E.v74PendingId){
    item=(await OF.pending()).find(x=>x.id===E.v74PendingId);
   }
   if(!item){
    const rows=makeRows(E);
    item=await OF.enqueue('exam-v74',{rows});
    E.v74PendingId=item.id;
   }
   if(OF.isOffline()){
    mirrorRows(item.payload.rows);
    await OF.store('learning',Object.values(V4.memory));
    E.result='saved';E.offlineQueued=true;
    toast('Test telefonda xavfsiz saqlandi. Internet qaytganda yuboriladi.','success');
    return;
   }
   const result=await OF.sync();
   const still=(await OF.pending()).find(x=>x.id===item.id);
   if(still?.conflict){
    E.result='conflict';
    toast('Test konflikti: boshqa qurilmaning yangi natijasi saqlab qolindi.');
   }else if(still){
    mirrorRows(item.payload.rows);
    await OF.store('learning',Object.values(V4.memory));
    E.result='saved';E.offlineQueued=true;
    toast('Natija qurilmada navbatga saqlandi, internet orqali yuborish kutilmoqda.','success');
   }else if(result.needsLogin){
    toast('Test natijasini yuborish uchun qayta kiring.');
   }else{
    E.result='saved';E.offlineQueued=false;
    window.WordoraV7?.invalidate('exam-saved-v74');
    await loadCore({force:true});
    toast('Test natijasi xavfsiz saqlandi!','success');
   }
  }catch(e){
   toast('Testni saqlashda xatolik: '+e.message);
  }finally{
   E.saving=false;render();
  }
 };
 window.WordoraExamV74={makeRows};
})();