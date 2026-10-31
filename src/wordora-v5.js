/* Wordora 5.0: verified word entry and independent user-defined book/Unit collections.
 * Never bundle privileged Supabase credentials into the browser.
 */
'use strict';
const V5={ready:false,loading:false,account:null,collections:[],items:[],
  libraryCollection:'all',learnCollection:'all',practiceCollection:'all',examCollection:'all',
  manageWord:null,adding:false,collectionBusy:false,lookupSerial:0,lookup:null,
  lookupTimer:null,lookupCache:new Map(),topicTouched:false,typeTouched:false,
  autoAdvance:localStorage.getItem('wordora-v5-auto-advance')!=='false',advanceTimer:null,
  warning:''};
const v5Name = id => V5.collections.find(x=>Number(x.id)===Number(id))?.name || '';
const v5Membership=(wordId,id)=>V5.items.some(x=>Number(x.word_id)===Number(wordId)&&Number(x.collection_id)===Number(id));
const v5Include=(word,id)=>id==='all'||v5Membership(word.id,id);
const v5Count=id=>V5.items.filter(x=>Number(x.collection_id)===Number(id)).length;
const v5ColOptions=(selected,allLabel='Barcha to‘plamlar')=>`<option value="all" ${selected==='all'?'selected':''}>${esc(allLabel)}</option>${V5.collections.map(x=>`<option value="${x.id}" ${String(selected)===String(x.id)?'selected':''}>${esc(x.name)} (${v5Count(x.id)})</option>`).join('')}`;
const v5NoColOptions=()=>`<option value="">To‘plamsiz — umumiy lug‘at</option>${V5.collections.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}<option value="new">＋ Yangi to‘plam yaratish...</option>`;
function v5Error(result){if(!result.error)return result.data;throw Error(result.error.code==='23505'?'Bu nom yoki bog‘lanish avval saqlangan.':result.error.message||'Ma’lumotlar bazasida xatolik.');}
async function v5User(){const r=await client.auth.getUser();if(r.error||!r.data?.user)throw Error('Qayta kirishingiz kerak.');return r.data.user;}
async function v5Load(){
 if(!state.user||!client)return;
 if(V5.account!==state.user.id){V5.collections=[];V5.items=[];V5.account=state.user.id;V5.manageWord=null;V5.libraryCollection='all';V5.learnCollection='all';V5.practiceCollection='all';V5.examCollection='all';}
 V5.loading=true;
 try{
  const a=await client.from('word_collections').select('id,name,created_at').eq('user_id',state.user.id).order('created_at',{ascending:true});
  if(a.error)throw a.error;
  const items=[];
  for(let n=0;n<6000;n+=1000){const r=await client.from('word_collection_items').select('collection_id,word_id').eq('user_id',state.user.id).range(n,n+999);if(r.error)throw r.error;items.push(...(r.data||[]));if((r.data||[]).length<1000)break;}
  V5.collections=a.data||[];V5.items=items;V5.ready=true;V5.warning='';
 }catch(e){V5.ready=false;V5.warning=e.message||'To‘plamlarni yuklab bo‘lmadi.';}
 finally{V5.loading=false;}
}
const v5EarlierLoad=loadCore;
loadCore=async function(){await v5EarlierLoad();await v5Load();};
// If the user already signed in while the scripts were loading, initialize once.
if(state.user)v5Load().then(()=>render()).catch(console.warn);

// English verification is a user-facing safeguard, not an infallible spelling oracle.
const v5Modal=new Set(['can','could','may','might','must','shall','should','will','would','ought']);
const v5POS={noun:'noun',verb:'verb',adjective:'adjective',adverb:'adverb',pronoun:'pronoun',preposition:'preposition',conjunction:'conjunction',number:'number',numeral:'number',interjection:'other',exclamation:'other',determiner:'other'};
const v5TopicDictionary={
  clothes:'jacket coat shirt t-shirt trousers pants jeans dress skirt shoes socks hat glove sweater hoodie scarf',
  weather:'rain sunny cloudy cloud storm snow wind windy rainy weather sunshine sun fog thunder lightning temperature',
  sports:'run running runner jump football soccer tennis basketball swimming swim exercise gym workout athlete',
  technology:'computer laptop keyboard software hardware internet smartphone phone device website network password',
  home:'house kitchen room table chair bed door window cupboard furniture fridge sofa',
  food:'apple bread milk coffee tea rice cheese meat fish breakfast lunch dinner cake',
  travel:'airport passport luggage ticket travel journey vacation hotel destination tourist',
  transport:'car bus bicycle train taxi motorcycle subway station driver',
  health:'doctor hospital medicine patient nurse headache illness health',
  shopping:'shop store market shopping price purchase buy sell',
  study:'book lesson school teacher student homework exam dictionary learn study',
  nature:'river mountain tree forest lake ocean flower earth plant animal',
  feelings:'happy sad anxious joyful afraid scared excited angry love',
  daily:'morning evening day night today tomorrow yesterday family friend'
};
const v5TopicLookup=new Map(Object.entries(v5TopicDictionary).flatMap(([topic,words])=>words.split(/\s+/).filter(Boolean).map(word=>[word,topic])));
function v5InferTopic(word){return v5TopicLookup.get(word.toLowerCase())||'other';}
function v5InferPOS(word,entries){
 if(v5Modal.has(word.toLowerCase()))return 'modal';
 const meanings=entries.flatMap(e=>e.meanings||[]).map(m=>v5POS[String(m.partOfSpeech||'').toLowerCase()]||'other').filter(x=>x!=='other');
 if(word.toLowerCase()==='run')return 'verb';
 return meanings[0]||'other';
}
const v5DictionaryURL=w=>`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`;
async function v5SpellSuggestions(word){try{const r=await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(word)}&max=5`);if(!r.ok)return [];return (await r.json()).map(x=>String(x.word||'')).filter(x=>x&&x.toLowerCase()!==word).slice(0,5);}catch{return [];}}
async function v5Verify(english){
 const word=english.trim().replace(/\s+/g,' ').toLowerCase();
 if(!word||!/^[a-z][a-z\s'\-]{0,79}$/.test(word))return {word,status:'invalid',message:'Lotin harflari bilan inglizcha so‘z kiriting (raqam va maxsus belgisiz).'};
 if(V5.lookupCache.has(word))return V5.lookupCache.get(word);
 const already=state.words?.filter(w=>normalize(w.en)===normalize(word))||[];
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8000);
 let result;
 try{
  const response=await fetch(v5DictionaryURL(word),{signal:controller.signal});
  if(response.ok){const entries=await response.json();if(!Array.isArray(entries)||!entries.length)throw Error('Lug‘atdan javob kelmadi');
   result={word,status:'valid',pos:v5InferPOS(word,entries),topic:v5InferTopic(word),already,meanings:entries.flatMap(e=>e.meanings||[]).map(m=>m.partOfSpeech).filter(Boolean)};
  }else if(response.status===404){result={word,status:'unknown',suggestions:await v5SpellSuggestions(word),already};}
  else result={word,status:'offline',message:'Lug‘at xizmati vaqtincha javob bermayapti. Qayta urinib ko‘ring.',already};
 }catch{result={word,status:'offline',message:'Inglizcha so‘zni hozir tekshirib bo‘lmadi. Internetni tekshiring va qayta urinib ko‘ring.',already};}
 finally{clearTimeout(timeout);}
 if(result.status==='valid'||result.status==='unknown')V5.lookupCache.set(word,result);
 return result;
}
function v5WordStatusMarkup(data){
 if(!data)return `<span class="v5-lookup-muted">So‘zni yozganingizda imlo tekshiriladi va turkumi taklif qilinadi.</span>`;
 if(data.status==='checking')return '⏳ Inglizcha lug‘atdan tekshirilmoqda…';
 if(data.status==='valid')return `<span class="v5-lookup-ok">✅ Inglizcha so‘z tasdiqlandi. ${esc(v3TypeName(data.pos))} · ${esc(v3TopicName(data.topic))} (taxmin)</span>${data.already?.length?`<p class="v5-existing-hint">♻️ Bu so‘z Wordora bazasida bor. Uni nusxalamasdan tanlangan to‘plamga bog‘laymiz. Tarjima shu mavjud yozuvdan olinadi.</p>`:''}`;
 if(data.status==='unknown')return `<span class="v5-lookup-bad">❌ Inglizcha lug‘atda “${esc(data.word)}” topilmadi. Hozircha qo‘shib bo‘lmaydi.</span>${data.suggestions?.length?`<div class="v5-suggestions">Balki: ${data.suggestions.map(s=>`<button type="button" data-v5="suggestion" data-word="${esc(s)}">${esc(s)}</button>`).join('')}</div>`:''}<p class="v5-note">Lug‘atlar barcha termin va iboralarni qamrab olmaydi. Noyob so‘z bo‘lsa, boshqa manbada imlosini tekshiring.</p>`;
 return `<span class="v5-lookup-bad">⚠️ ${esc(data.message||'So‘zni tekshirib bo‘lmadi.')}</span><button type="button" data-v5="verify-again">Qayta tekshirish</button>`;
}
function v5StatusUpdate(){const el=document.getElementById('v5-word-status');if(el)el.innerHTML=v5WordStatusMarkup(V5.lookup);}
async function v5CheckInput(raw){
 const token=++V5.lookupSerial;
 V5.lookup={word:raw.trim().toLowerCase(),status:'checking'};v5StatusUpdate();
 const info=await v5Verify(raw);
 if(token!==V5.lookupSerial || document.getElementById('en')?.value.trim().toLowerCase()!==info.word)return;
 V5.lookup=info;
 if(info.status==='valid'){
  const type=document.getElementById('v3-type-add'),topic=document.getElementById('v3-topic-add');
  if(type&&!V5.typeTouched)type.value=info.pos;
  if(topic&&!V5.topicTouched)topic.value=info.topic;
  const translation=document.getElementById('uz');if(info.already?.length&&translation&&!translation.value.trim())translation.value=(info.already.find(w=>w.owner_id===state.user.id)||info.already[0]).uz;
 }
 v5StatusUpdate();
}
function v5AddForm(){return `<section class="panel v3-add-panel v5-add-panel"><div class="panel-title"><div><h3>Yangi so‘z qo‘shish</h3><p>Wordora imloni tekshiradi, so‘z turkumi va mavzuni taklif qiladi. Xohlasangiz, Essential Unit yoki boshqa to‘plamga ham bog‘laysiz.</p></div><button class="icon-btn" data-action="hide-add" aria-label="Yopish">${I('close')}</button></div>
<form id="add-word-form" class="add-form v5-form"><div><label for="en">Inglizcha so‘z *</label><input id="en" name="en" placeholder="Masalan: run yoki big" required maxlength="80" autocomplete="off" spellcheck="false"><div class="v5-word-status" id="v5-word-status" aria-live="polite">${v5WordStatusMarkup(V5.lookup)}</div></div><div><label for="uz">O‘zbekcha tarjima *</label><input id="uz" name="uz" placeholder="Masalan: yugurmoq" maxlength="120" required></div>
<div><label for="v3-topic-add">Asosiy mavzu <small>(avtomatik taxmin, o‘zgartirish mumkin)</small></label><select id="v3-topic-add" name="topic" required>${v3TopicOptions('other','Barcha mavzular')}</select></div>
<div><label for="v3-type-add">So‘z turkumi <small>(avtomatik taxmin)</small></label><select id="v3-type-add" name="word_type" required>${v3TypeOptions('other','Barcha turkumlar')}</select></div>
<div class="v5-collection-picker"><label for="v5-add-collection">Kitob / Unit / shaxsiy to‘plam <small>(ixtiyoriy, mustaqil filtr)</small></label><select id="v5-add-collection" name="collection_id">${v5NoColOptions()}</select><div class="v5-create-inline" id="v5-new-collection-row" hidden><label for="v5-new-collection">Yangi to‘plam nomi</label><input id="v5-new-collection" name="new_collection" placeholder="Essential 1 — Unit 1" maxlength="80"></div></div>
<div><label for="example_en">Inglizcha gap <small>(ixtiyoriy)</small></label><input id="example_en" name="example_en" maxlength="240" placeholder="I run every morning."></div><div><label for="example_uz">Misol tarjimasi <small>(ixtiyoriy)</small></label><input id="example_uz" name="example_uz" maxlength="240" placeholder="Men har tong yuguraman."></div>
<div class="add-actions"><button class="btn btn-primary" type="submit" ${V5.adding?'disabled':''}>${V5.adding?'Saqlanmoqda...':'✅ Tekshirish va qo‘shish'}</button></div></form></section>`;}
function v5CollectionPanel(){return `<section class="v5-collections panel"><div class="v5-collection-heading"><div><h3>📚 Mening Unit va to‘plamlarim</h3><p>Bir so‘z bir nechta Unitga kirishi mumkin. Turkum va mavzu filtrlaridan mustaqil ishlaydi.</p></div></div>
<form id="v5-create-collection" class="v5-create-form"><input name="name" required maxlength="80" placeholder="Masalan: Essential 1 — Unit 1" aria-label="To‘plam nomi"><button class="btn btn-secondary" type="submit" ${V5.collectionBusy?'disabled':''}>＋ To‘plam yaratish</button></form>
<div class="v5-collection-chips"><button class="v5-chip ${V5.libraryCollection==='all'?'active':''}" data-v5="library-collection" data-id="all">🌐 Umumiy lug‘at (${state.words.length})</button>${V5.collections.map(x=>`<button class="v5-chip ${String(V5.libraryCollection)===String(x.id)?'active':''}" data-v5="library-collection" data-id="${x.id}">📖 ${esc(x.name)} <b>${v5Count(x.id)}</b></button>`).join('')}</div>
${V5.libraryCollection!=='all'?`<div class="v5-current-unit">Tanlangan: <strong>${esc(v5Name(V5.libraryCollection))}</strong> · ${v5Count(V5.libraryCollection)} so‘z. Quyidagi mavzu va so‘z turkumi filtrlari qo‘shimcha ishlaydi. <div class="v5-unit-manage"><button data-v5="rename-collection" data-id="${V5.libraryCollection}">✎ Nomini o‘zgartirish</button><button data-v5="delete-collection" data-id="${V5.libraryCollection}">🗑 To‘plamni o‘chirish</button></div></div>`:''}</section>`;}
const v5PreviousLibrary=libraryPage;
const v5PreviousLibraryMatches=v3LibraryMatches;
v3LibraryMatches=function(w){return v5PreviousLibraryMatches(w) && (!V5.ready||v5Include(w,V5.libraryCollection));};
libraryPage=function(){
 let html=v5PreviousLibrary();
 if(!V5.ready)return html+`<div class="v5-alert">📚 Unit-to‘plamlar uchun Supabase’da <code>upgrade_5_0.sql</code> ni bir marta bajaring. Ungacha eski lug‘at ishlaydi.${V5.warning?' '+esc(V5.warning):''}</div>`;
 if(state.showAdd)html=html.replace(/<section class="panel v3-add-panel">[\s\S]*?<\/form><\/section>/,v5AddForm());
 html=html.replace('<div class="v3-stage-tabs">',v5CollectionPanel()+'<div class="v3-stage-tabs">');
 // Add a simple per-word action to BOTH starter and user-owned words.
 html=html.replace(/<tr><td><button class="word-pronounce"[\s\S]*?<\/td><\/tr>/g,row=>{
  const id=Number(row.match(/data-word-id="(\d+)"/)?.[1]);
  if(!id)return row;
  const tags=V5.items.filter(x=>Number(x.word_id)===id).map(x=>v5Name(x.collection_id)).filter(Boolean);
  const more=`<div class="v5-unit-badges">${tags.slice(0,2).map(s=>`<span>${esc(s)}</span>`).join('')}${tags.length>2?`<span>+${tags.length-2}</span>`:''}</div><button class="v5-row-assign" data-v5="assign-word" data-id="${id}" aria-label="So‘zni to‘plamga biriktirish">＋ Unit</button>`;
  return row.replace(/<\/td><\/tr>$/,more+'</td></tr>');
 });
 if(V5.manageWord!==null)html+=v5ManageDialog();
 return html;
};
function v5ManageDialog(){const w=state.words.find(w=>w.id===V5.manageWord);if(!w)return '';
 return `<div class="v5-dialog-backdrop" data-v5="close-dialog"><section class="v5-dialog" role="dialog" aria-modal="true" aria-labelledby="v5-dialog-title"><div class="v5-dialog-top"><div><h3 id="v5-dialog-title">“${esc(w.en)}” to‘plamlari</h3><p>${esc(w.uz)} · ${esc(v3TypeName(v3WordType(w)))}</p></div><button type="button" data-v5="close-dialog" class="v5-dialog-x" aria-label="Yopish">✕</button></div><div class="v5-dialog-list">${V5.collections.length?V5.collections.map(x=>`<button data-v5="toggle-item" data-word="${w.id}" data-collection="${x.id}" class="v5-assign-choice">${v5Membership(w.id,x.id)?'☑':'☐'} <span>${esc(x.name)}</span> <small>${v5Membership(w.id,x.id)?'Biriktirilgan':'Qo‘shish'}</small></button>`).join(''):'<p>Hali to‘plam yo‘q. Yuqoridagi yangi to‘plam yaratish maydonidan foydalaning.</p>'}</div><button type="button" class="btn btn-secondary" data-v5="close-dialog">Tayyor</button></section></div>`;}

// The subject filter is one-to-many (book/Unit) and independent of fixed topic and POS.
window.WordoraV5LessonMatch=w=>!V5.ready||v5Include(w,V5.learnCollection);
const v5OldPracticeWords=v4PracticeWords;
v4PracticeWords=function(day){const words=v5OldPracticeWords(day);const selected=state.page==='exercises'||state.page==='practice'?V5.practiceCollection:state.page==='exam'||state.page==='v4-exam'?V5.examCollection:'all';return !V5.ready?words:words.filter(w=>v5Include(w,selected));};
const v5OldGroups=v4Groups;
v4Groups=function(onlyLearning=false){const groups=v5OldGroups(onlyLearning);if(!V5.ready||state.page!=='exam')return groups;return groups.map(([day,words])=>[day,words.filter(w=>v5Include(w,V5.examCollection))]).filter(([,words])=>words.length);};
function v5Selector(id,selection){return `<div class="v5-unit-select"><label for="${id}">📚 Kitob / Unit / to‘plam</label><select id="${id}">${v5ColOptions(selection)}</select><span>Mavzu va turkum filtrlariga qo‘shimcha ishlaydi.</span></div>`;}
const v5OldLessonPage=v4LessonPage;
v4LessonPage=function(){let html=v5OldLessonPage();if(!V5.ready)return html;return html.replace('<div class="v4-setup-grid">',v5Selector('v5-learn-filter',V5.learnCollection)+'<div class="v4-setup-grid">');};
const v5OldDrillPage=v4DrillPage;
v4DrillPage=function(){let html=v5OldDrillPage();if(!V5.ready)return html;return html.replace('<div class="v4-date-picker">',v5Selector('v5-practice-filter',V5.practiceCollection)+'<div class="v4-date-picker">');};
const v5OldExamPage=v4ExamPage;
v4ExamPage=function(){let html=v5OldExamPage();if(!V5.ready)return html;return html.replace('<div class="v4-date-picker">',v5Selector('v5-exam-filter',V5.examCollection)+'<div class="v4-date-picker">');};

// Continue immediately after a correctly spelled word, not after the wrong answer.
const v5OriginalLessonScreen=v4LessonScreen;
v4LessonScreen=function(){let html=v5OriginalLessonScreen();if(!V4.lesson||V4.lesson.finished)return html;
 html=html.replace('<p class="v4-safety-note">',`<label class="v5-auto-next"><input id="v5-auto-lesson" type="checkbox" ${V5.autoAdvance?'checked':''}> To‘g‘ri yozsam, keyingi so‘zga avtomatik o‘tish (1 soniya)</label><p class="v4-safety-note">`);
 if(V4.lesson.phase==='checked'&&V5.autoAdvance)html=html.replace('<div class="v4-correct">','<div class="v4-correct">⏱️ ');
 return html;
};
function v5AutoAdvanceSchedule(){clearTimeout(V5.advanceTimer);if(!V5.autoAdvance||!V4.lesson||V4.lesson.phase!=='checked')return;
 const lesson=V4.lesson,round=lesson.round,index=lesson.index;
 V5.advanceTimer=setTimeout(()=>{V5.advanceTimer=null;if(state.page==='v4-lesson'&&V4.lesson===lesson&&lesson.round===round&&lesson.index===index&&lesson.phase==='checked'){v4Advance();}},950);
}
window.WordoraV5Schedule=v5AutoAdvanceSchedule;
const v5PrevV4Advance=v4Advance;
v4Advance=function(){clearTimeout(V5.advanceTimer);v5PrevV4Advance();};
// Default the existing practice checkbox to ON for new users only. Respect a stored preference.
if(localStorage.getItem('wordora-auto-next')===null){state.autoNext=true;localStorage.setItem('wordora-auto-next','true');}

async function v5CreateCollection(name){const user=await v5User();const safe=String(name||'').trim().replace(/\s+/g,' ');if(safe.length<1||safe.length>80)throw Error('To‘plam nomi 1–80 belgi bo‘lishi kerak.');
 const match=V5.collections.find(x=>x.name.toLowerCase()===safe.toLowerCase());if(match)return match;
 const res=await client.from('word_collections').insert({user_id:user.id,name:safe}).select('id,name,created_at').single();return v5Error(res);
}
async function v5Link(wordId,collectionId){const user=await v5User();return v5Error(await client.from('word_collection_items').upsert({user_id:user.id,collection_id:Number(collectionId),word_id:Number(wordId)},{onConflict:'user_id,collection_id,word_id',ignoreDuplicates:true}));}
async function v5Unlink(wordId,collectionId){const user=await v5User();return v5Error(await client.from('word_collection_items').delete().eq('user_id',user.id).eq('collection_id',Number(collectionId)).eq('word_id',Number(wordId)));}
async function v5AddWord(form){if(V5.adding)return;V5.adding=true;
 const save=form.querySelector('button[type="submit"]');if(save)save.disabled=true;
 try{
  const body=Object.fromEntries(new FormData(form).entries()),word=String(body.en||'').trim().toLowerCase();
  const validation=await v5Verify(word);V5.lookup=validation;v5StatusUpdate();
  if(validation.status!=='valid')throw Error(validation.status==='unknown'?`“${word}” lug‘atda topilmadi. Imlo takliflaridan birini tanlang yoki yozuvni tekshiring.`:'So‘zni inglizcha lug‘atda tasdiqlash imkoni bo‘lmadi. Qayta urinib ko‘ring.');
  const topic=String(body.topic||'other'),type=String(body.word_type||'other');
  if(!v3Topics.some(x=>x[0]===topic)||!v3Types.some(x=>x[0]===type))throw Error('Mavzu va so‘z turkumini tanlang.');
  const collectionChoice=String(body.collection_id||''),newName=String(body.new_collection||'').trim();
  if(collectionChoice==='new'&&!newName)throw Error('Yangi to‘plam nomini kiriting.');
  let collection=null;
  if(collectionChoice==='new')collection=await v5CreateCollection(newName);
  else if(collectionChoice){collection=V5.collections.find(c=>String(c.id)===collectionChoice);if(!collection)throw Error('To‘plam topilmadi.');}
  // Search whole Wordora word list before making a new personal copy.
  const duplicate=(validation.already||[]).find(w=>w.owner_id===state.user.id)||(validation.already||[])[0];
  let id;
  if(duplicate){id=duplicate.id;if(!collection)throw Error('Bu so‘z umumiy lug‘atda avvaldan bor. Uni kerakli Unitga qo‘shing; nusxasini yaratmaymiz.');}
  else{if(!String(body.uz||'').trim())throw Error('O‘zbekcha ma’nosini kiriting.');const result=await api('/words',{method:'POST',body:JSON.stringify({en:word,uz:body.uz,topic,word_type:type,example_en:body.example_en||'',example_uz:body.example_uz||''})});id=result.id;}
  if(collection)await v5Link(id,collection.id);
  V5.lookup=null;V5.typeTouched=false;V5.topicTouched=false;
  await loadCore();state.showAdd=false;state.libraryStage='all';state.librarySource='all';state.libraryTopic='all';state.libraryType='all';state.search='';V5.libraryCollection=collection?String(collection.id):'all';render();
  toast(duplicate?`“${word}” so‘zi “${collection.name}” to‘plamiga biriktirildi.`:collection?'So‘z lug‘at va tanlangan to‘plamga qo‘shildi!':'So‘z umumiy lug‘atga qo‘shildi!','success');
 }catch(err){toast(err.message);}
 finally{V5.adding=false;if(document.contains(save))save.disabled=false;}
}
async function v5ToggleItem(wordId,collectionId){try{if(v5Membership(wordId,collectionId))await v5Unlink(wordId,collectionId);else await v5Link(wordId,collectionId);await v5Load();render();}catch(err){toast(err.message);}}
// Capture before legacy submit handlers, which otherwise insert unchecked words.
document.addEventListener('submit',e=>{
 if(e.target.id==='add-word-form'&&V5.ready){e.preventDefault();e.stopImmediatePropagation();v5AddWord(e.target);}
 else if(e.target.id==='v5-create-collection'){e.preventDefault();e.stopImmediatePropagation();if(V5.collectionBusy)return;const name=e.target.elements.name?.value||'';V5.collectionBusy=true;v5CreateCollection(name).then(async col=>{await v5Load();V5.libraryCollection=String(col.id);render();toast(`“${col.name}” to‘plami yaratildi.`,'success');}).catch(err=>toast(err.message)).finally(()=>{V5.collectionBusy=false;});}
 else if(e.target.id==='v4-learning-form'&&V5.autoAdvance){if(V4.lesson?.phase==='checked')v5AutoAdvanceSchedule();}
},true);
document.addEventListener('input',e=>{
 if(e.target.id!=='en'||!V5.ready)return;
 clearTimeout(V5.lookupTimer);V5.lookupSerial++;V5.lookup=null;V5.topicTouched=false;V5.typeTouched=false;v5StatusUpdate();const val=e.target.value;
 if(!val.trim())return;V5.lookupTimer=setTimeout(()=>{v5CheckInput(val);},500);
},true);
document.addEventListener('change',e=>{
 const id=e.target.id,v=e.target.value;
 if(id==='v3-topic-add')V5.topicTouched=true;
 if(id==='v3-type-add')V5.typeTouched=true;
 if(id==='v5-add-collection'){const div=document.getElementById('v5-new-collection-row');if(div){div.hidden=v!=='new';if(v==='new')document.getElementById('v5-new-collection')?.focus();}}
 if(id==='v5-learn-filter'){V5.learnCollection=v;render();}
 if(id==='v5-practice-filter'){V5.practiceCollection=v;render();}
 if(id==='v5-exam-filter'){V5.examCollection=v;render();}
 if(id==='v5-auto-lesson'){V5.autoAdvance=e.target.checked;localStorage.setItem('wordora-v5-auto-advance',String(V5.autoAdvance));if(!V5.autoAdvance)clearTimeout(V5.advanceTimer);else v5AutoAdvanceSchedule();}
},true);
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-v5]');if(!button)return;
 e.preventDefault();e.stopImmediatePropagation();
 const a=button.dataset.v5;
 if(a==='library-collection'){V5.libraryCollection=button.dataset.id;state.libraryStage='all';state.libraryTopic='all';state.libraryType='all';state.librarySource='all';state.search='';render();}
 if(a==='rename-collection'){
  const id=Number(button.dataset.id),current=v5Name(id),name=prompt('To‘plamning yangi nomi:',current);
  if(name===null)return;
  const safe=name.trim();if(!safe||safe.length>80)return toast('To‘plam nomi 1–80 belgi bo‘lishi kerak.');
  v5User().then(user=>client.from('word_collections').update({name:safe}).eq('id',id).eq('user_id',user.id)).then(v5Error).then(()=>v5Load()).then(()=>{render();toast('To‘plam nomi yangilandi.','success');}).catch(err=>toast(err.message));
 }
 if(a==='delete-collection'){
  const id=Number(button.dataset.id);if(!confirm(`“${v5Name(id)}” to‘plamini o‘chirasizmi? So‘zlarning o‘zi va yodlash natijalari o‘chmaydi.`))return;
  v5User().then(user=>client.from('word_collections').delete().eq('id',id).eq('user_id',user.id)).then(v5Error).then(()=>v5Load()).then(()=>{V5.libraryCollection='all';V5.learnCollection='all';V5.practiceCollection='all';V5.examCollection='all';render();toast('To‘plam o‘chirildi, lug‘atdagi so‘zlar saqlanib qoldi.','success');}).catch(err=>toast(err.message));
 }
 if(a==='assign-word'){V5.manageWord=Number(button.dataset.id);render();}
 if(a==='close-dialog'){if(button===e.target||button.classList.contains('v5-dialog-x')||button.textContent.trim()==='Tayyor'){V5.manageWord=null;render();}}
 if(a==='toggle-item')v5ToggleItem(Number(button.dataset.word),Number(button.dataset.collection));
 if(a==='suggestion'){const input=document.getElementById('en');if(input){input.value=button.dataset.word;V5.typeTouched=false;V5.topicTouched=false;v5CheckInput(input.value);input.focus();}}
 if(a==='verify-again'){const input=document.getElementById('en');if(input)v5CheckInput(input.value);}
},true);
document.addEventListener('click',e=>{if(e.target.closest('[data-v4="typed-next"],[data-v4="first-next"],[data-v4="leave-lesson"],[data-v4="finish-lesson"],[data-v4="repeat"]'))clearTimeout(V5.advanceTimer);},true);