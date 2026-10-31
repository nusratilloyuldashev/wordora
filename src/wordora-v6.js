
'use strict';
/* Wordora 5.3 Smart Learn: one word at a time (intro + four different recall tasks).
 * No database migration; keep the word_learning mastery gate owned by the existing test.
 * This module loads after Wordora 5.0 and upgrades only the guided lesson workflow.
 */
const V6={version:6};
v4SceneMap.arrive=['🚌','Avtobus bekatga yetib keldi'];
v4SceneMap.secret=['🤫','Do‘stingiz sizga sir aytayotganini tasavvur qiling'];
v4SceneMap.agree=['🤝','Bir fikrga rozi bo‘lish uchun qo‘l berish'];
v4SceneMap.angry=['😠','Jahli chiqqan odamni tasavvur qiling'];
const v6OldWord=v4LessonWord;
function v6EnsureLesson(){
 const L=V4.lesson;
 if(!L?.ids?.length)return null;
 if(L.smartVersion===6){
  if(!Array.isArray(L.smartQueue)||!L.smartQueue.length)L.smartQueue=L.ids.slice();
  if(!Number.isInteger(L.step))L.step=0;
  if(!Number.isInteger(L.index))L.index=0;
  if(L.index<0||L.index>=L.smartQueue.length)L.index=0;
  return L;
 }
 // Upgrade an unfinished, locally saved V4/V5 lesson without discarding the chosen words.
 // A previous round might only have introduced the same word; restart that word safely.
 const oldIndex=Number.isInteger(L.index)?L.index:0;
 const oldChunk=Number.isInteger(L.chunkStart)?L.chunkStart:0;
 L.smartVersion=6;L.smartQueue=L.ids.slice();
 L.index=Math.max(0,Math.min(L.ids.length-1,L.round>1?oldChunk:oldIndex));
 L.step=0;L.round=1;L.phase='study';L.choices=[];L.choicesFor='';
 L.picked=[];L.hint=0;L.feedback='';L.weakIds=Array.isArray(L.weakIds)?L.weakIds:[];
 L.errors=Number(L.errors)||0;v4SaveLesson();
 return L;
}
v4LessonWord=function(){
 const L=V4.lesson;
 if(L?.smartVersion===6)return v4Words().find(w=>String(w.id)===String(L.smartQueue[L.index]));
 return v6OldWord();
};
function v6NewLesson(ids){
 return {smartVersion:6,ids:ids.slice(),smartQueue:ids.slice(),index:0,step:0,round:1,
  phase:'study',choices:[],choicesFor:'',picked:[],hint:0,feedback:'',
  weakIds:[],errors:0,finished:false,started:v4Today()};
}
v4Begin=function(){
 if(!V4.ready)return toast('O‘rganish bazasi hali tayyor emas.');
 if(V4.lesson?.ids?.length&&!V4.lesson.finished)return toast('Avval tugallanmagan yodlashni davom ettiring yoki bekor qiling.');
 const list=shuffle(v4Words().filter(w=>!v4Introduced(w)&&v4Matches(w))).slice(0,Math.min(V4.maxLessonWords,Math.max(1,V4.count)));
 if(!list.length)return toast('Tanlangan filtrda yangi so‘z topilmadi.');
 V4.lesson=v6NewLesson(list.map(w=>w.id));
 v4SaveLesson();state.page='v4-lesson';render();v4Pronounce();
};
const v6OldPage=v4LessonPage;
v4LessonPage=function(){
 let html=v6OldPage();
 html=html.replace('Baholash shart emas. Ko‘rasiz, talaffuzini eshitasiz va o‘zingiz yozasiz. Har 5 ta so‘z kichik guruh bo‘lib o‘rganiladi. Har bir so‘z uch xil usulda qaytariladi.',
  'Bitta so‘z bilan tanishasiz, keyin uni ketma-ket 4 xil usulda eslaysiz. So‘ng keyingi so‘zga o‘tasiz. Qiyin so‘zlar alohida takrorlanadi.');
 html=html.replace(/<div class="v4-three">[\s\S]*?(?=<div class="panel v4-setup-panel">)/,
  '<div class="v6-steps-overview"><div>👀 <strong>Tanishish</strong><small>Rasm · talaffuz · misol</small></div><div>🧠 <strong>1. Tarjima</strong><small>Ma’noni tanlash</small></div><div>💬 <strong>2. Gap</strong><small>Vaziyatdan topish</small></div><div>🧩 <strong>3. Bo‘laklar</strong><small>So‘zni yig‘ish</small></div><div>✍️ <strong>4. Yozish</strong><small>Xotiradan yozish</small></div></div>');
 html=html.replace('Tavsiya: 5–10 ta. 20 ta tanlasangiz ham 5 talik guruhlarga bo‘linadi.',
  'Tavsiya: 5–10 ta. Har bir so‘zda 4 eslash tugagach keyingisi boshlanadi.');
 if(V4.lesson&&!V4.lesson.finished){
  const L=v6EnsureLesson();
  html=html.replace(/\$\{V4\.lesson\.round\}/g,String((L.step||0)+1));
  html=html.replace(/· \d+-aylanish · \d+-so‘z/,` · ${L.step===0?'tanishish':L.step+'/4 eslash'} · ${L.index+1}-so‘z`);
 }
 return html;
};
function v6OptionValues(L,w,kind){
 const key=String(w.id)+':'+L.step+':'+kind;
 if(L.choicesFor===key&&Array.isArray(L.choices)&&L.choices.length)return L.choices;
 const prop=kind==='meaning'?'uz':'en',answer=String(w[prop]||'').trim();
 const pool=shuffle(v4Words().filter(x=>String(x.id)!==String(w.id)));
 const seen=new Set([normalize(answer)]),values=[answer];
 for(const x of pool){
  const option=String(x[prop]||'').trim(),norm=normalize(option);
  if(!norm||seen.has(norm))continue;
  seen.add(norm);values.push(option);
  if(values.length>=4)break;
 }
 L.choicesFor=key;L.choices=shuffle(values);v4SaveLesson();return L.choices;
}
function v6Parts(w){
 const s=String(w?.en||'').trim().replace(/\s+/g,' ');
 if(s.includes(' ')){
  const parts=s.split(' ');
  return parts.map((p,i)=>p+(i<parts.length-1?' ':''));
 }
 const letters=Array.from(s);
 if(letters.length<=3)return letters;
 if(letters.length<=6){const cut=Math.ceil(letters.length/2);return [letters.slice(0,cut).join(''),letters.slice(cut).join('')];}
 const one=Math.ceil(letters.length/3),two=Math.ceil(2*letters.length/3);
 return [letters.slice(0,one).join(''),letters.slice(one,two).join(''),letters.slice(two).join('')];
}
function v6PartOrder(L,w){
 const parts=v6Parts(w),key=String(w.id)+':pieces';
 if(L.partKey===key&&Array.isArray(L.partOrder)&&L.partOrder.length===parts.length)return L.partOrder;
 let order=shuffle(parts.map((_,i)=>i));
 // Avoid always presenting the answer in correct order, including when shuffled identity remains.
 if(parts.length>1&&order.every((v,i)=>v===i))order=order.slice().reverse();
 L.partKey=key;L.partOrder=order;v4SaveLesson();return order;
}
function v6MarkWeak(L,w){
 if(!L.weakIds.some(id=>String(id)===String(w.id)))L.weakIds.push(w.id);
 L.errors=(Number(L.errors)||0)+1;
}
function v6Correct(L){
 L.phase='checked';L.feedback='';v4SaveLesson();render();
 window.WordoraV5Schedule?.();
}
function v6Wrong(L,w){
 v6MarkWeak(L,w);L.feedback='Yana urinib ko‘ring. Bu test emas — xatolar orqali ham o‘rganasiz.';
 L.picked=[];v4SaveLesson();render();
}
function v6OptionsHtml(L,w,kind){
 const opts=v6OptionValues(L,w,kind);
 return `<div class="v6-options">${opts.map((opt,i)=>`<button type="button" class="v6-option" data-v6="choose" data-index="${i}">${esc(opt)}</button>`).join('')}</div>`;
}
function v6Prompt(L,w){
 const scene=v4Scene(w),gap=v4ExampleGap(w);
 if(L.step===0)return `<div class="v6-visual" aria-hidden="true">${scene.emoji}</div>
  <div class="v6-en">${esc(w.en)}</div><div class="v6-uz">${esc(w.uz)}</div>
  <p class="v6-context">${esc(scene.hint)}</p>
  ${w.example_en?`<div class="v6-example">${esc(w.example_en)}${w.example_uz?`<small>${esc(w.example_uz)}</small>`:''}</div>`:''}
  <button type="button" class="v6-speaker" data-v6="sound">🔊 Talaffuzini tinglash</button>`;
 if(L.step===1)return `<div class="v6-visual" aria-hidden="true">${scene.emoji}</div><p class="v6-subtle">Inglizcha so‘zning ma’nosini toping</p>
  <div class="v6-en">${esc(w.en)}</div>${v6OptionsHtml(L,w,'meaning')}`;
 if(L.step===2)return `<div class="v6-visual" aria-hidden="true">${scene.emoji}</div>
  <p class="v6-subtle">${gap?'Gapdagi bo‘sh joyga mos so‘zni tanlang':'Vaziyatga mos inglizcha so‘zni tanlang'}</p>
  ${gap?`<div class="v6-gap">${esc(gap)}</div>`:`<div class="v6-gap">${esc(scene.hint)}</div><div class="v6-uz">${esc(w.uz)}</div>`}
  ${v6OptionsHtml(L,w,'english')}`;
 if(L.step===3){
  const parts=v6Parts(w),order=v6PartOrder(L,w),picked=L.picked||[];
  return `<div class="v6-visual" aria-hidden="true">${scene.emoji}</div><p class="v6-subtle">Bo‘laklardan so‘zni qayta yig‘ing</p>
   <div class="v6-uz">${esc(w.uz)}</div><div class="v6-pieces-result">${picked.length?esc(picked.map(i=>parts[i]).join('')):'_ _ _ _ _'}</div>
   <div class="v6-pieces">${order.map(i=>`<button type="button" data-v6="part" data-index="${i}" ${picked.includes(i)?'disabled':''}>${esc(parts[i])}</button>`).join('')}</div>
   <button class="v6-reset-parts" type="button" data-v6="reset-parts">↺ Qayta yig‘ish</button>`;
 }
 return `<div class="v6-visual" aria-hidden="true">${scene.emoji}</div><p class="v6-subtle">So‘zni mustaqil, xotiradan yozing</p>
  <p class="v6-context">${esc(scene.hint)}</p><div class="v6-uz">${esc(w.uz)}</div>
  <button type="button" class="v6-speaker" data-v6="sound">🔊 Talaffuzini eshitish</button>
  <form id="v6-learning-form" class="v6-write"><label for="v6-answer">Inglizchasini yozing</label><div class="v6-input-row">
  <input id="v6-answer" name="v6-answer" required maxlength="90" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Xotirangizdan yozing..." value="${esc(L.draft||'')}">
  <button type="submit" class="btn btn-primary">Tekshirish ↗</button></div></form>
  ${(L.hint||0)>0?`<div class="v6-hint">${L.hint===1?`Birinchi harf: <strong>${esc(w.en.charAt(0))}</strong> · ${w.en.length} ta belgi`:`Javob: <strong>${esc(w.en)}</strong> — ${esc(w.uz)}`}</div>`:''}
  <button type="button" class="v6-hint-button" data-v6="hint" ${L.hint>=2?'disabled':''}>${L.hint===0?'💡 Birinchi harfni ko‘rish':L.hint===1?'👁️ Javobni ko‘rish':'Ishora ko‘rsatildi'}</button>`;
}
function v6Screen(){
 const L=v6EnsureLesson(),w=v4LessonWord();
 if(!L||!w)return '<section class="v4-page"><p>Yodlash jarayoni topilmadi.</p><button class="btn" data-v4="leave-lesson">Orqaga</button></section>';
 if(L.finished)return v6Complete(L);
 const q=L.smartQueue.length,index=L.index,step=L.step,phaseNames=['Tanishish','1-eslash · Ma’no','2-eslash · Vaziyat','3-eslash · Bo‘laklar','4-eslash · Mustaqil yozish'];
 const percent=Math.round(100*(index*5+step)/(Math.max(1,q)*5));
 return `<section class="v4-page v4-focus v6-focus">
 <div class="v4-lesson-top"><button class="v4-back" data-v4="leave-lesson">← Saqlab chiqish</button><span class="v4-round">${step===0?'Tanishish':`${step}/4 eslash`}</span></div>
 <div class="v6-heading"><div class="overline">WORDORA · SMART LEARN</div><h1>${phaseNames[step]}</h1><p>${index+1} / ${q} so‘z · ${L.repeatingWeak?'Qiyin so‘zlarni qaytarish':'Har bir so‘zga alohida e’tibor'}</p></div>
 <div class="v4-meter-label"><span>${index+1}/${q}-so‘z</span><span>${step===0?'0':step}/4 eslash</span></div><div class="v4-meter"><i style="width:${percent}%"></i></div>
 <div class="v6-lesson-card">${L.phase==='checked'?`<div class="v6-success"><span aria-hidden="true">✅</span><strong>Ajoyib! ${step}/4 eslash bajarildi.</strong><p>${step===4?'Endi keyingi so‘zga o‘tamiz.':'Keyingi eslash turiga o‘tamiz.'}</p></div>`:
 `<div class="v6-learning-content">${v6Prompt(L,w)}</div>`}
 </div>
 ${L.feedback&&L.phase!=='checked'?`<div class="v6-feedback" role="status">${esc(L.feedback)}</div>`:''}
 ${step===0?'<button type="button" class="btn btn-primary v6-primary" data-v6="next">Tanishdim — eslashni boshlayman →</button>':
 L.phase==='checked'?`<button type="button" class="btn btn-primary v6-primary" data-v6="next">${step===4?'Keyingi so‘z →':'Davom etish →'}</button>`:''}
 <div class="v6-step-chips">${[1,2,3,4].map(n=>`<div class="${step>n?'done':step===n?'active':''}">${step>n?'✓ ':''}${n}-eslash</div>`).join('')}</div>
 <label class="v5-auto-next"><input id="v5-auto-lesson" type="checkbox" ${V5.autoAdvance?'checked':''}> To‘g‘ri javobdan keyin avtomatik davom etish</label>
 <p class="v4-safety-note">Jarayon ushbu brauzerda saqlanadi. “Yodlangan” holati faqat 90% test natijasida belgilanadi.</p>
 </section>`;
}
function v6Complete(L){
 const weak=(L.weakIds||[]).filter(id=>(L.smartQueue||[]).some(x=>String(x)===String(id)));
 return `<section class="v4-complete v6-complete"><div class="v4-celebration">🌱🎉</div>
 <h1>${(L.smartQueue||[]).length} ta so‘zni 4 usulda eslab ko‘rdingiz!</h1>
 <p>Har bir so‘z bilan alohida tanishdingiz va 4 xil usulda xotiradan esladingiz. Endi mashq yoki test orqali mustahkamlash mumkin.</p>
 ${weak.length?`<div class="v6-weak-summary">💡 ${weak.length} ta so‘zda qiynaldingiz yoki ishoradan foydalandingiz. Avval faqat ularni qaytarish tavsiya etiladi.</div>`:'<div class="v6-weak-summary done">✅ Barcha bosqichlarni yordamsiz bajardingiz.</div>'}
 <div class="v4-complete-actions">${weak.length?`<button type="button" class="btn btn-secondary" data-v6="repeat-weak">🔁 Qiyin so‘zlar (${weak.length})</button>`:''}
 <button class="btn btn-secondary" data-v6="repeat-all">Barchasini qaytarish</button>
 <button class="btn btn-primary" data-v4="finish-lesson" ${V4.testSaving?'disabled':''}>✅ Mashqlarga o‘tish</button></div>
 <p class="v4-muted">So‘zlar avval “Yodlanmoqda” holatiga o‘tadi. “Yodlangan” uchun 90% lik alohida test kerak.</p>
 <button type="button" class="v4-text-link" data-v4="leave-lesson">Saqlab, keyinroq davom ettirish</button></section>`;
}
const v6OldScreen=v4LessonScreen;
v4LessonScreen=function(){return V4.lesson?v6Screen():v6OldScreen();};
function v6Next(){
 const L=v6EnsureLesson();if(!L||L.finished)return;
 if(L.step>0&&L.phase!=='checked')return;
 if(L.step<4){L.step++;L.round=L.step+1;}
 else if(L.index+1<L.smartQueue.length){L.index++;L.step=0;L.round=1;}
 else{L.finished=true;L.step=4;L.round=5;}
 L.phase=L.step===0?'study':'ready';L.choices=[];L.choicesFor='';L.picked=[];
 L.partKey='';L.partOrder=[];L.hint=0;L.feedback='';L.draft='';
 v4SaveLesson();render();
 if(!L.finished&&L.step===0)v4Pronounce();
 if(!L.finished&&L.step===4)requestAnimationFrame(()=>document.getElementById('v6-answer')?.focus({preventScroll:true}));
}
const v6OldAdvance=v4Advance;
v4Advance=function(){if(V4.lesson?.smartVersion===6){clearTimeout(V5.advanceTimer);v6Next();}else v6OldAdvance();};
function v6Repeat(weakOnly){
 const L=v6EnsureLesson();if(!L?.finished)return;
 const ids=weakOnly?(L.weakIds||[]):L.ids;
 if(!ids.length)return;
 L.smartQueue=ids.slice();L.index=0;L.step=0;L.round=1;L.phase='study';L.finished=false;
 L.repeatingWeak=weakOnly;L.weakIds=[];L.feedback='';L.choices=[];L.choicesFor='';
 L.picked=[];L.hint=0;L.draft='';L.partKey='';L.partOrder=[];
 v4SaveLesson();render();v4Pronounce();
}
function v6Choose(button){
 const L=v6EnsureLesson(),w=v4LessonWord();
 if(!L||!w||L.phase==='checked'||![1,2].includes(L.step))return;
 const value=L.choices?.[Number(button.dataset.index)];
 const correct=L.step===1?w.uz:w.en;
 if(!value)return;
 if(normalize(value)===normalize(correct))v6Correct(L);else v6Wrong(L,w);
}
function v6Piece(button){
 const L=v6EnsureLesson(),w=v4LessonWord();
 if(!L||!w||L.step!==3||L.phase==='checked')return;
 const pieces=v6Parts(w),i=Number(button.dataset.index);
 if(!Number.isInteger(i)||i<0||i>=pieces.length||(L.picked||[]).includes(i))return;
 L.picked=[...(L.picked||[]),i];L.feedback='';
 if(L.picked.length===pieces.length){
  const built=L.picked.map(k=>pieces[k]).join('');
  if(normalize(built)===normalize(w.en)){v6Correct(L);return;}
  v6Wrong(L,w);return;
 }
 v4SaveLesson();render();
}
function v6Type(form){
 const L=v6EnsureLesson(),w=v4LessonWord();
 if(!L||!w||L.step!==4||L.phase==='checked')return;
 const value=String(form.elements['v6-answer']?.value||'').trim();
 if(!value)return;
 L.draft=value;
 if(normalize(value)===normalize(w.en))v6Correct(L);
 else {v6Wrong(L,w);requestAnimationFrame(()=>document.getElementById('v6-answer')?.focus({preventScroll:true}));}
}
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-v6]');if(!b)return;
 event.preventDefault();event.stopImmediatePropagation();
 const act=b.dataset.v6,L=v6EnsureLesson();
 if(!L)return;
 if(act==='sound')v4Pronounce();
 else if(act==='next')v4Advance();
 else if(act==='choose')v6Choose(b);
 else if(act==='part')v6Piece(b);
 else if(act==='reset-parts'&&L.step===3&&L.phase!=='checked'){L.picked=[];L.feedback='';v4SaveLesson();render();}
 else if(act==='hint'&&L.step===4&&L.phase!=='checked'){
  L.hint=Math.min(2,(L.hint||0)+1);const w=v4LessonWord();
  if(w)v6MarkWeak(L,w);v4SaveLesson();render();
  requestAnimationFrame(()=>document.getElementById('v6-answer')?.focus({preventScroll:true}));
 }
 else if(act==='repeat-weak')v6Repeat(true);
 else if(act==='repeat-all')v6Repeat(false);
},true);
document.addEventListener('submit',event=>{
 if(event.target.id!=='v6-learning-form')return;
 event.preventDefault();event.stopImmediatePropagation();v6Type(event.target);
},true);
document.addEventListener('input',event=>{
 if(event.target.id==='v6-answer'&&V4.lesson?.smartVersion===6)V4.lesson.draft=event.target.value;
},true);
window.WordoraV6Info={version:'5.3',flow:'intro + 4 recalls per word',databaseMigration:false};
