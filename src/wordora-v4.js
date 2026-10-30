/* Wordora 4.0 — guided learning, unassisted tests and 90%-based mastery.
 * All writes are scoped by Supabase RLS to the authenticated user.
 * Keep the older (2.x and 3.x) UI/API intact when migration has not yet run.
 */
'use strict';
const V4 = {
  threshold: 90, minRounds:3, maxLessonWords:40,
  memory:{}, ready:false, loading:false, unavailable:false,
  lesson:null, exam:null, examDate:'', practiceDate:'all',
  count:20, topic:'all', wordType:'all', lessonReview:false,
  testSaving:false, reviewSaving:false,reviewOnly:false,
  activeAccount:null, announce:'',
};
const v4Today = () => localISODate();
const v4DayPlus = n => {const d=new Date();d.setDate(d.getDate()+n);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const v4DateLabel = d => { if(!d)return 'Belgilanmagan'; const [y,m,day]=String(d).split('-'); return `${day}.${m}.${y}`; };
const v4Empty = () => Object.keys(V4.memory).length===0;
const v4Key = () => `wordora-lesson-v4-${state.user?.id||'guest'}`;
const v4SceneMap = {
  bread:['🍞','Yangi pishgan nonni tasavvur qiling'], water:['💧','Bir stakan muzdek suv'],
  friend:['🤝','Do‘stingiz bilan qo‘l berib ko‘rishing'], family:['👨‍👩‍👧','Oila a’zolarini bir joyga to‘plang'],
  morning:['🌅','Tongda quyosh ko‘tarilmoqda'], evening:['🌇','Kechki shafaqni ko‘ring'],
  apple:['🍎','Qizil olmani tishlab ko‘ring'], book:['📖','Kitob varaqlarini oching'],
  learn:['🧠','Miyangizga yangi bilim joylanmoqda'], remember:['🪢','Xotirada tugun bog‘lab qo‘ying'],
  run:['🏃','Kimdir tez yuguryapti'], walk:['🚶','Ko‘cha bo‘ylab qadam tashlash'],
  rain:['🌧️','Tomchilar oynaga urilmoqda'], wind:['🍃','Shamol barglarni uchiryapti'],
  sun:['☀️','Quyoshning issiq nurlarini his qiling'], clothes:['👕','Shkafdan kiyim tanlash'],
  jacket:['🧥','Sovuq kunda kurtkangizni kiying'], shoes:['👟','Oyoq kiyimingizni bog‘lang'],
  computer:['💻','Kompyuter ekranini yoqing'], keyboard:['⌨️','Klaviaturada yozing'],
  phone:['📱','Telefon qo‘ng‘irog‘ini eshiting'], window:['🪟','Derazani oching'],
  home:['🏠','O‘z uyingiz eshigini oching'], airport:['✈️','Samolyot osmonga ko‘tarilmoqda'],
  ticket:['🎟️','Chipta qo‘lingizda'], travel:['🧳','Safarga chamadon tayyorlang'],
  happy:['😄','Xursandchilikdan kuling'], sad:['😢','Qayg‘uli yuzni tasavvur qiling'],
  delicious:['😋','Mazali ovqat hidini tasavvur qiling'], cold:['🥶','Qishda sovuqdan junjiking'],
  hot:['🔥','Issiq olovning haroratini his qiling'], flower:['🌸','Gulni hidlab ko‘ring'],
  mountain:['🏔️','Tog‘ cho‘qqisini tasavvur qiling'], river:['🌊','Daryo oqimini eshiting'],
  dog:['🐕','It dumini likillatmoqda'], cat:['🐈','Mushuk miyovlamoqda'],
  write:['✍️','Qalam bilan so‘z yozing'], explain:['💬','Biror fikrni tushuntiring'],
  decide:['🛤️','Ikki yo‘ldan birini tanlang'], discover:['🔎','Yangi narsani izlab toping'],
};
const v4TopicScenes = {daily:'🏡',clothes:'🧥',weather:'🌤️',home:'🏠',food:'🥗',travel:'🧳',transport:'🚗',technology:'💻',study:'📚',health:'💊',shopping:'🛍️',sports:'⚽',nature:'🌳',feelings:'💗',verbs:'🎬',other:'✨'};
function v4Scene(word) {
  const exact = v4SceneMap[normalize(word.en)];
  if(exact) return {emoji:exact[0],hint:exact[1]};
  const example=(word.example_uz||'').trim();
  return {emoji:v4TopicScenes[v3WordTopic(word)]||'✨',hint:example||'Shu so‘z qatnashgan vaziyatni tasavvur qiling'};
}
const v4Meta = w => V4.memory[String(w.id)] || null;
function v4Stage(w){if(!V4.ready)return !w.due_on?'new':Number(w.repetitions||0)>=3?'mastered':'learning';const m=v4Meta(w);return m?(m.stage==='mastered'?'mastered':'learning'):'new';}
function v4Due(w){if(!V4.ready)return !!w.due_on && w.due_on<=v4Today();const m=v4Meta(w);return !!m && m.next_review_on <= v4Today();}
window.WordoraV4Stage=v4Stage;
window.WordoraV4Due=v4Due;
const v4Words = ()=>state.words||[];
const v4Introduced = (w)=>!!v4Meta(w);
function v4Groups(onlyLearning=false){
  const groups=new Map();
  for(const w of v4Words()){
    const m=v4Meta(w);
    if(!m || (onlyLearning && m.stage==='mastered'))continue;
    const day=m.introduced_on || v4Today();
    if(!groups.has(day))groups.set(day,[]);
    groups.get(day).push(w);
  }
  return Array.from(groups.entries()).sort((a,b)=>b[0].localeCompare(a[0]));
}
const v4Set = data => { const map={}; for(const x of data||[])map[String(x.word_id)]=x;V4.memory=map; };
const v4SafeStorage = {read(){try{return JSON.parse(localStorage.getItem(v4Key())||'null');}catch{return null;}},write(v){try{localStorage.setItem(v4Key(),JSON.stringify(v));}catch{}},delete(){try{localStorage.removeItem(v4Key());}catch{}}};
async function v4Fetch(){
  if(!state.user)return;
  if(V4.activeAccount!==state.user.id){V4.lesson=null;V4.exam=null;V4.activeAccount=state.user.id;}
  const records=[]; let error=null;
  for(let start=0;start<6000;start+=1000){
    const result=await client.from('word_learning')
      .select('word_id,stage,introduced_on,next_review_on,review_interval,last_test_score,tested_at')
      .eq('user_id',state.user.id).order('word_id',{ascending:true}).range(start,start+999);
    if(result.error){error=result.error;break;}
    records.push(...(result.data||[]));
    if((result.data||[]).length<1000)break;
  }
  if(error){
    const missing=['42P01','PGRST205','PGRST116'].includes(error.code)||/relation .* does not exist|schema cache|could not find the table/i.test(error.message||'');
    V4.ready=false;V4.unavailable=missing;V4.announce=missing?'Supabase upgrade_4_0.sql migratsiyasi hali bajarilmagan.':error.message;
    V4.memory={};return;
  }
  v4Set(records);V4.ready=true;V4.unavailable=false;V4.announce='';
  if(!V4.lesson){let previous=v4SafeStorage.read();if(previous?.ids?.length && previous.ids.every(id=>v4Words().some(w=>w.id===id)))V4.lesson=previous;}
}
const v4PreviousLoad=loadCore;
loadCore=async function(){await v4PreviousLoad();await v4Fetch();};
function v4Warning(){return V4.ready?'':`<div class="v4-notice" role="status">⚠️ ${esc(V4.announce||'Yangi o‘rganish bazasi tekshirilmoqda.')}<p>Yangi o‘rganish va test natijalarini saqlash uchun Supabase SQL Editor’da <code>supabase/upgrade_4_0.sql</code> ni bir marta bajaring. Eski ma’lumotlar o‘chirilmaydi.</p></div>`;}
const v4Inputs=()=>`<div class="v4-setup-grid"><label>Mavzu<select id="v4-topic"><option value="all">Barcha mavzular</option>${v3Topics.map(([k,icon,label])=>`<option value="${k}" ${V4.topic===k?'selected':''}>${icon} ${esc(label)}</option>`).join('')}</select></label><label>So‘z turkumi<select id="v4-type"><option value="all">Barcha turkumlar</option>${v3Types.map(([k,name])=>`<option value="${k}" ${V4.wordType===k?'selected':''}>${esc(name)}</option>`).join('')}</select></label><label>Nechta so‘z?<input id="v4-count" type="number" min="1" max="40" step="1" value="${V4.count}" aria-label="Yodlash uchun so‘zlar soni"></label></div>`;
const v4Matches=w=>(V4.topic==='all'||v3WordTopic(w)===V4.topic)&&(V4.wordType==='all'||v3WordType(w)===V4.wordType)&&(!window.WordoraV5LessonMatch||window.WordoraV5LessonMatch(w));
function v4LessonPage(){
  const newWords=v4Words().filter(w=>!v4Introduced(w)&&v4Matches(w));
  const resume=V4.lesson?.ids?.length;
  return `<section class="v4-page"><div class="overline">1-BOSQICH · TANISHISH</div><h1>So‘zlarni eslab qolish 🧠</h1><p>Baholash shart emas. Ko‘rasiz, talaffuzini eshitasiz va o‘zingiz yozasiz. Har bir so‘z kamida 3 marta uchraydi.</p>${v4Warning()}
  ${resume?`<div class="v4-resume"><strong>📌 Tugallanmagan yodlash bor</strong><p>${V4.lesson.ids.length} ta so‘z · ${V4.lesson.round}-aylanish · ${V4.lesson.index+1}-so‘z</p><button class="btn btn-primary" data-v4="resume">Qolgan joydan davom etish →</button><button class="btn btn-secondary" data-v4="discard">Eski mashg‘ulotni bekor qilish</button></div>`:''}
  <div class="v4-three"><div>👀 <strong>1. Ko‘ring</strong><small>Ma’no, obraz va talaffuz</small></div><div>✍️ <strong>2. Yozing</strong><small>Tarjimasidan eslab yozing</small></div><div>🎧 <strong>3. Eshitib yozing</strong><small>So‘zni mustaqil eslang</small></div></div>
  <div class="panel v4-setup-panel"><div class="panel-title"><div><h3>Bugun nechta so‘z yodlaysiz?</h3><p>1–40 ta tanlashingiz mumkin. Tavsiya: 10–20 ta.</p></div><span class="v4-count-badge">${newWords.length} ta yangi so‘z</span></div>
  ${v4Inputs()}
  <button class="btn btn-primary" data-v4="begin" ${!V4.ready||newWords.length===0?'disabled':''}>🌱 Yangi so‘zlarni yodlash</button>
  ${newWords.length===0?'<p class="v4-muted">Bu filtrda yangi so‘z qolmagan. Boshqa mavzu tanlang yoki lug‘atga yangi so‘z qo‘shing.</p>':''}
  </div><div class="v4-soft-note">🔁 Yodlash yakunlangach so‘zlar “Yodlanmoqda” holatiga o‘tadi. “Yodlangan”ga faqat alohida testdagi natija olib chiqadi.</div></section>`;
}
function v4LessonWord(){return v4Words().find(w=>w.id===V4.lesson?.ids[V4.lesson.index]);}
function v4SaveLesson(){if(V4.lesson)v4SafeStorage.write(V4.lesson);}
function v4Begin(){
  if(!V4.ready){toast('Avval Supabase upgrade_4_0.sql migratsiyasini bajaring.');return;}
  if(V4.lesson?.ids?.length && !V4.lesson.finished){toast('Avval davom etayotgan mashg‘ulotni tugating yoki bekor qiling.');return;}
  const choices=shuffle(v4Words().filter(w=>!v4Introduced(w)&&v4Matches(w))).slice(0,Math.min(V4.maxLessonWords,Math.max(1,V4.count)));
  if(!choices.length){toast('Tanlangan mavzuda yangi so‘z yo‘q.');return;}
  V4.lesson={ids:choices.map(w=>w.id),round:1,index:0,phase:'see',checked:false,tries:0,completedRounds:0,errors:0,finished:false,started:v4Today()};
  v4SaveLesson();state.page='v4-lesson';render();v4Pronounce();
}
function v4Pronounce(){const w=v4LessonWord();if(w)say(w.en);}
function v4LessonScreen(){
 const lesson=V4.lesson,w=v4LessonWord();if(!lesson||!w)return `<section class="v4-page"><p>Yodlash jarayoni topilmadi.</p><button class="btn" data-v4="leave-lesson">So‘z yodlashga qaytish</button></section>`;
 if(lesson.finished)return v4LessonComplete();
 const round=lesson.round,scene=v4Scene(w),whole=lesson.ids.length,visual=round===1 || lesson.phase==='wrong' || lesson.phase==='checked';
 return `<section class="v4-page v4-focus"><div class="v4-lesson-top"><button class="v4-back" data-v4="leave-lesson">← Saqlab chiqish</button><span class="v4-round">${round<=3?`${round}/3-aylanish`:`${round}-takrorlash`}</span></div>
 <h1>${round===1?'Ko‘ring va eshiting 👀':round===2?'Tarjimasiga qarab yozing ✍️':'Eshitib va eslab yozing 🎧'}</h1>
 <div class="v4-meter-label"><span>${lesson.index+1} / ${whole} so‘z</span><span>Jami ${lesson.completedRounds} ta aylanish tugagan</span></div><div class="v4-meter"><i style="width:${Math.round(100*(lesson.index+1)/whole)}%"></i></div>
 <div class="v4-learning-card"><div class="v4-illustration" aria-hidden="true"><span>${scene.emoji}</span><span class="v4-motion">✦</span></div><div class="v4-association">${esc(scene.hint)}</div>
 ${visual?`<div class="v4-english">${esc(w.en)}</div><div class="v4-uzbek">${esc(w.uz)}</div>`:round===2?`<div class="v4-uzbek v4-big-meaning">${esc(w.uz)}</div><small class="v4-muted">Inglizchasini o‘zingiz yozing</small>`:`<div class="v4-secret">🔒 Inglizcha so‘z yashirilgan</div><small class="v4-muted">Talaffuzni tinglang, keyin xotiradan yozing</small>`}
 <button class="v4-speaker" data-v4="sound" aria-label="Talaffuzini tinglash">🔊 <span>Talaffuzini tinglash</span></button>
 ${visual&&w.example_en?`<p class="v4-example">${esc(w.example_en)} ${esc(w.example_uz)}</p>`:''}
 </div>
 ${round===1?`<div class="v4-action-row"><button class="btn btn-primary" data-v4="first-next">Ko‘rdim va eshitdim →</button></div>`:
 lesson.phase==='wrong'?`<div class="v4-incorrect"><b>Yana bir urinib ko‘ring.</b> To‘g‘risi: <strong>${esc(w.en)}</strong>. Talaffuzini eshiting va qayta yozing.</div><button class="btn btn-primary" data-v4="retry">Qayta yozish</button>`:
 lesson.phase==='checked'?`<div class="v4-correct">✅ To‘g‘ri! Endi keyingi so‘zga o‘tamiz.</div><button class="btn btn-primary" data-v4="typed-next">Keyingi so‘z →</button>`:
 `<form class="v4-typing" id="v4-learning-form"><label for="v4-answer">Inglizchasini yozing</label><div class="v4-inline"><input id="v4-answer" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="So‘zni yozing..." required maxlength="80"><button class="btn btn-primary" type="submit">Tekshirish ↗</button></div></form><p class="v4-muted">Kerak bo‘lsa yuqoridagi 🔊 tugmasini yana bosing.</p>`}
 <p class="v4-safety-note">Jarayoningiz ushbu brauzerda saqlanadi. Siz uni davom ettirishingiz mumkin.</p></section>`;
}
function v4Advance(){
 const L=V4.lesson;if(!L)return;
 L.index++;L.phase=L.round===1?'see':'type';L.checked=false;L.tries=0;
 if(L.index>=L.ids.length){L.index=0;L.completedRounds++;L.round++;L.phase=L.round===1?'see':'type';if(L.completedRounds>=V4.minRounds)L.finished=true;}
 v4SaveLesson();render();
 if(!L.finished){v4Pronounce();if(L.phase==='type')requestAnimationFrame(()=>document.getElementById('v4-answer')?.focus({preventScroll:true}));}
}
function v4LessonComplete(){const L=V4.lesson;return `<section class="v4-complete"><div class="v4-celebration">🌱🎉</div><h1>${L.completedRounds} marta aylantirib chiqdingiz!</h1><p>${L.ids.length} ta so‘z bilan tanishdingiz, talaffuzini eshitdingiz va yozib ko‘rdingiz. Yetarlicha esingizda qoldimi?</p><div class="v4-complete-actions"><button class="btn btn-secondary" data-v4="repeat">🔁 Yana bir marta qaytarish</button><button class="btn btn-primary" data-v4="finish-lesson" ${V4.testSaving?'disabled':''}>✅ Men tayyorman — mashqlarga o‘tish</button></div><p class="v4-muted">Hozir “Yodlanmoqda” holatiga o‘tadi. “Yodlangan” holati uchun alohida test kerak.</p><button class="v4-text-link" data-v4="leave-lesson">Saqlab, keyinroq davom ettirish</button></section>`;}
async function v4FinishLesson(){
 if(!V4.lesson?.finished||V4.testSaving)return;
 V4.testSaving=true;
 try{
  const today=v4Today(), rows=V4.lesson.ids.map(word_id=>({user_id:state.user.id,word_id,stage:'learning',introduced_on:today,next_review_on:today,review_interval:0}));
  const {error}=await client.from('word_learning').upsert(rows,{onConflict:'user_id,word_id',ignoreDuplicates:true});
  if(error)throw Error(error.message);
  v4SafeStorage.delete();V4.lesson=null;V4.practiceDate=today;V4.examDate=today;
  await loadCore();state.page='exercises';render();toast('So‘zlar “Yodlanmoqda”ga qo‘shildi. Mashq qilib mustahkamlang!','success');
 }catch(e){toast('Natijani saqlab bo‘lmadi: '+e.message);}finally{V4.testSaving=false;}
}
function v4DateSelect(which){const value=which==='test'?V4.examDate:V4.practiceDate,groups=v4Groups(false);return `<label>Qaysi kuni o‘rganilgan so‘zlar? <select id="v4-${which}-date"><option value="all" ${value==='all'?'selected':''}>Barcha sanalar</option>${groups.map(([day,words])=>`<option value="${day}" ${value===day?'selected':''}>${v4DateLabel(day)} · ${words.length} ta so‘z</option>`).join('')}</select></label>`;}
function v4PracticeWords(date=V4.practiceDate){return v4Words().filter(w=>v4Introduced(w)&&(date==='all'||v4Meta(w).introduced_on===date));}
function v4DrillPage(){const total=v4PracticeWords().length;return `<section class="v4-page"><div class="overline">2-BOSQICH · MUSTAHKAMLASH</div><h1>Mashqlar 🎯</h1><p>Faqat avval yodlash bosqichidan o‘tgan so‘zlar. Mashq qilish so‘zni avtomatik “Yodlangan”ga o‘tkazmaydi.</p>${v4Warning()}
 <div class="v4-date-picker">${v4DateSelect('practice')}<span>${total} ta tayyor so‘z</span></div>
 <div class="v4-modes">${modes.filter(m=>['choice','write','listen','mix'].includes(m.id)).map(m=>`<button class="mode-card ${m.color}" data-v4="start-drill" data-mode="${m.id}" ${!V4.ready||!total?'disabled':''}><div class="mode-top"><div class="mode-icon">${I(m.icon,24)}</div><span class="mode-arrow">${I('arrow',20)}</span></div><div class="mode-label">${m.badge}</div><h3>${m.name}</h3><p>${m.subtitle}</p></button>`).join('')}</div><button class="v4-link-test" data-v4="nav" data-page="exam">Yodlaganingizni aniq tekshirishni xohlaysizmi? <strong>Test bo‘limiga o‘ting →</strong></button></section>`;}
const v4ExamQuestions=(words)=>shuffle(words).map((w,i)=>{
 const type=i%3===0?'choice':i%3===1?'write':'listen';
 const others=shuffle(v4Words().filter(x=>x.id!==w.id && normalize(x.uz)!==normalize(w.uz))).slice(0,3);
 const options=shuffle([w,...others].map(x=>({id:x.id,text:x.uz})));
 return {id:w.id,type,options,value:'',checked:false};
});
function v4ExamPage(){const groups=v4Groups(false),unmastered=groups.reduce((n,[,ws])=>n+ws.filter(w=>v4Stage(w)==='learning').length,0);return `<section class="v4-page"><div class="overline">3-BOSQICH · BILIMNI TEKSHIRISH</div><h1>Test ✅</h1><p>Testda javoblar oxirigacha ko‘rsatilmaydi. <strong>90% yoki undan yuqori</strong> natija olsangiz, to‘g‘ri javob bergan so‘zlaringiz “Yodlangan”ga o‘tadi.</p>${v4Warning()}
 <div class="v4-test-rule"><span class="v4-rule-big">90%</span><div><strong>Yodlangan bo‘lish mezoni</strong><p>Masalan, 20 ta savoldan kamida 18 tasiga to‘g‘ri javob. Xato qolgan so‘zlarni yana mustahkamlash tavsiya qilinadi.</p></div></div>
 <div class="v4-date-picker">${v4DateSelect('test')}<span>${unmastered} ta o‘rganilayotgan so‘z</span></div>
 <div class="v4-collections">${groups.filter(([day])=>V4.examDate==='all'||V4.examDate===day).map(([day,words])=>`<div class="v4-collection"><div><small>${v4DateLabel(day)}</small><strong>${words.length} ta so‘z</strong><span>${words.filter(w=>v4Stage(w)==='learning').length} ta yodlanmoqda · ${words.filter(w=>v4Stage(w)==='mastered').length} ta yodlangan</span></div><button class="btn btn-primary" data-v4="start-exam" data-date="${day}" ${!V4.ready?'disabled':''}>Testni boshlash →</button></div>`).join('')||'<p class="v4-muted">Hali biror yodlash mashg‘ulotini tugatmagansiz. Avval “So‘z yodlash” bo‘limidan boshlang.</p>'}</div></section>`;}
function v4StartExam(day){if(!V4.ready)return toast('Avval Supabase migratsiyasini bajaring.');
 const words=v4PracticeWords(day);if(!words.length)return toast('Bu kunga tegishli so‘zlar yo‘q.');
 if(words.length>60){toast('Bir kunda 60 tadan ko‘p so‘z bor. Hozir birinchi 60 tasi sinovga olinadi.');}
 V4.exam={date:day,index:0,items:v4ExamQuestions(words.slice(0,60)),finished:false,saving:false,correct:0,incorrect:[],result:null};
 state.page='v4-exam';render();v4TestSound();
}
function v4CurrentQuestion(){const E=V4.exam;return E?.items[E.index];}
function v4TestSound(){const q=v4CurrentQuestion();if(q?.type==='listen'){const word=v4Words().find(w=>w.id===q.id);if(word)say(word.en);}}
function v4TestScreen(){const E=V4.exam,q=v4CurrentQuestion();if(!E)return `<section class="v4-page">Test topilmadi. <button data-v4="nav" data-page="exam">Orqaga</button></section>`;
 if(E.finished)return v4ExamResults();
 const w=v4Words().find(x=>x.id===q.id);if(!w)return '<section class="v4-page">So‘z topilmadi.</section>';
 return `<section class="v4-page v4-exam-page"><button class="v4-back" data-v4="leave-exam">← Testni to‘xtatish</button><div class="v4-meter-label"><span>Test: ${E.index+1}/${E.items.length}</span><span>${v4DateLabel(E.date)} · O‘tish: 90%</span></div><div class="v4-meter"><i style="width:${Math.round(E.index/E.items.length*100)}%"></i></div><div class="v4-test-card"><div class="overline">${q.type==='choice'?'TO‘G‘RI TARJIMANI TANLANG':q.type==='listen'?'TINGLAB INGLIZCHASINI YOZING':'INGLIZCHASINI YOZING'}</div>
 ${q.type==='choice'?`<h2>${esc(w.en)}</h2><div class="v4-exam-options">${q.options.map((opt,i)=>`<button data-v4="answer-choice" data-index="${i}"><span>${'ABCD'[i]}</span>${esc(opt.text)}</button>`).join('')}</div>`:
 q.type==='listen'?`<div class="v4-audio-big">🎧</div><button class="v4-speaker" data-v4="exam-sound">🔊 Talaffuzini qayta tinglash</button>`:`<h2>${esc(w.uz)}</h2>`}
 ${q.type!=='choice'?`<form id="v4-test-form" class="v4-typing"><label for="v4-test-answer">Javobingiz</label><div class="v4-inline"><input id="v4-test-answer" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Inglizcha so‘z..." required maxlength="80"><button class="btn btn-primary" type="submit">${E.index===E.items.length-1?'Tugatish':'Keyingi'} →</button></div></form>`:''}
 <p class="v4-muted">Javoblarning to‘g‘riligini test oxirida bilasiz. Imlo ham tekshiriladi.</p></div></section>`;
}
function v4AnswerExam(value){const E=V4.exam,q=v4CurrentQuestion();if(!q||E?.saving||E?.finished)return;
 const w=v4Words().find(w=>w.id===q.id);if(!w)return;
 q.value=String(value).trim();q.checked=q.type==='choice' ? q.value===String(w.id) : normalize(q.value)===normalize(w.en);
 E.index++;if(E.index>=E.items.length){E.finished=true;E.correct=E.items.filter(q=>q.checked).length;E.incorrect=E.items.filter(q=>!q.checked).map(q=>q.id);}
 render();if(!E.finished){v4TestSound();requestAnimationFrame(()=>document.getElementById('v4-test-answer')?.focus({preventScroll:true}));}
}
function v4ExamResults(){const E=V4.exam,score=Math.round(E.correct/E.items.length*100),pass=score>=V4.threshold;
 const misses=E.items.filter(q=>!q.checked).map(q=>{const w=v4Words().find(w=>w.id===q.id);return w?`<li>${esc(w.en)} — ${esc(w.uz)}</li>`:''}).join('');
 return `<section class="v4-results"><div class="v4-celebration">${pass?'🎉':'📚'}</div><div class="overline">TEST NATIJASI</div><h1>${score}% — ${pass?'Tabriklaymiz!':'Yana mustahkamlaymiz'}</h1><p>${E.correct}/${E.items.length} ta to‘g‘ri. ${pass?'To‘g‘ri javob bergan so‘zlar “Yodlangan”ga o‘tadi; qolganlari yodlanishda davom etadi.':'90% ga yetmadi — hozir hech qaysi yangi so‘z “Yodlangan”ga o‘tmaydi.'}</p>
 ${misses?`<details class="v4-misses"><summary>Xato topilgan so‘zlar (${E.incorrect.length})</summary><ul>${misses}</ul></details>`:''}
 ${E.result==='saved'?'<div class="v4-correct">Natija Supabase bazasida saqlandi.</div>':''}
 <div class="v4-action-row">${E.result==='saved'?`<button class="btn btn-primary" data-v4="nav" data-page="exam">Testlar ro‘yxatiga qaytish</button>`:`<button class="btn btn-primary" data-v4="save-exam" ${E.saving?'disabled':''}>${E.saving?'Saqlanmoqda...':'Natijani saqlash'}</button>`}<button class="btn btn-secondary" data-v4="retry-exam">Testni qayta yechish</button></div></section>`;
}
async function v4SaveExam(){const E=V4.exam;if(!E?.finished||E.saving||E.result==='saved')return;
 E.saving=true;render();try{
  const score=Math.round(E.correct/E.items.length*100),passed=score>=V4.threshold,today=v4Today();
  // Each result is persisted only for a word already introduced by this user.
  const changes=E.items.map(q=>{
    const former=V4.memory[String(q.id)];
    if(!former)throw new Error('Yodlash bosqichidan o‘tmagan so‘z testda topildi.');
    const promote=passed&&q.checked;
    const stage=promote?'mastered':'learning';
    return {user_id:state.user.id,word_id:q.id,stage,introduced_on:former.introduced_on,next_review_on:promote?v4DayPlus(1):today,review_interval:promote?1:0,last_test_score:score,tested_at:new Date().toISOString()};
  });
  // Supabase upsert is atomic at the SQL-statement level.
  const {error}=await client.from('word_learning').upsert(changes,{onConflict:'user_id,word_id'});
  if(error)throw Error(error.message);
  E.result='saved';await loadCore();render();toast('Test natijalari saqlandi!','success');
 }catch(e){toast('Testni saqlab bo‘lmadi: '+e.message);}finally{E.saving=false;render();}
}
function v4MasteryReview(){const due=v4Words().filter(w=>v4Due(w));return due.length?`<div class="v4-review-callout"><div><strong>🔁 Bugun ${due.length} ta so‘zni eslash vaqti</strong><p>Oldin yodlanganlarni ham unutmaslik uchun qaytarib turing.</p></div><button class="btn btn-primary" data-v4="review-due">Takrorlash →</button></div>`:`<div class="v4-review-callout clear"><div><strong>✅ Bugungi takrorlash tugallangan</strong><p>Yangi so‘zlar bilan tanishing yoki test topshiring.</p></div></div>`;}
const v4OldDash = dashboardPage;
dashboardPage=function(){
 if(!V4.ready)return v4OldDash()+v4Warning();
 const all=v4Words(),intro=all.filter(v4Introduced),learning=intro.filter(w=>v4Stage(w)==='learning'),mastered=intro.filter(w=>v4Stage(w)==='mastered'),novel=all.length-intro.length;
 const old=state.stats||{};
 return `<div class="v4-page"><div class="welcome-heading"><div><div class="overline">KUNLIK O‘RGANISH MARKAZI</div><h1>Salom, ${esc(state.user?.username||'do‘st')}! 👋</h1><p>Har kuni kamroq, ammo puxta yodlang.</p></div><div class="today-label">${I('calendar',18)} ${esc(displayToday())}</div></div>${v4MasteryReview()}
 <div class="v4-stat-strip"><div><strong>${novel}</strong><span>Yangi</span></div><div><strong>${learning.length}</strong><span>Yodlanmoqda</span></div><div><strong>${mastered.length}</strong><span>Testdan o‘tgan</span></div><div><strong>${intro.length}</strong><span>Tanishilgan</span></div></div>
 ${V4.lesson?.ids?.length?`<div class="v4-resume"><strong>⏳ Tugallanmagan yodlash</strong><p>${V4.lesson.ids.length} so‘z · ${V4.lesson.round}-aylanish</p><button class="btn btn-primary" data-v4="resume">Davom ettirish</button></div>`:''}
 <div class="v4-dashboard-steps"><button data-v4="nav" data-page="learn"><span>🧠</span><small>1-BOSQICH</small><strong>Yodlash</strong><em>Ko‘rish · Talaffuz · Yozish</em></button><button data-v4="nav" data-page="exercises"><span>🎯</span><small>2-BOSQICH</small><strong>Mashq</strong><em>Mustahkamlash · Erkin sinov</em></button><button data-v4="nav" data-page="exam"><span>🏆</span><small>3-BOSQICH</small><strong>Test</strong><em>90% → yodlangan so‘zlar</em></button></div>
 <div class="panel v4-dashboard-history"><div class="panel-title"><div><h3>O‘rganilgan kunlar</h3><p>Istalgan kun so‘zlariga qaytishingiz mumkin</p></div></div>${v4Groups().slice(0,4).map(([d,words])=>`<button class="v4-history-row" data-v4="open-day" data-date="${d}"><span>📅 ${v4DateLabel(d)}</span><strong>${words.length} ta so‘z</strong><span>Testga o‘tish →</span></button>`).join('')||'<p class="v4-muted">Hali yangi so‘z yodlamagansiz.</p>'}</div></div>`;
};
const v4OldShell=pageShell;
pageShell=function(){
 if(!V4.ready)return v4OldShell();
 const username=state.user?.username||'Do‘st';
 const navitem=(page,icon,label)=>`<button class="nav-item ${state.page===page||state.page==='v4-lesson'&&page==='learn'||state.page==='v4-exam'&&page==='exam'||state.page==='practice'&&page==='exercises'?'active':''}" data-v4="nav" data-page="${page}">${I(icon)}<span>${label}</span></button>`;
 const mobile=(page,icon,label)=>`<button class="${state.page===page?'active':''}" data-v4="nav" data-page="${page}">${I(icon)}<span>${label}</span></button>`;
 const title={dashboard:'Bosh sahifa',learn:'So‘z yodlash',exercises:'Mashqlar',exam:'Test',library:'Mening lug‘atim','v4-lesson':'Yodlash','v4-exam':'Test',practice:'Mashqlar'}[state.page]||'Wordora';
 const content=state.page==='dashboard'?dashboardPage():state.page==='learn'?v4LessonPage():state.page==='v4-lesson'?v4LessonScreen():state.page==='exercises'?v4DrillPage():state.page==='exam'?v4ExamPage():state.page==='v4-exam'?v4TestScreen():state.page==='library'?libraryPage():practicePage();
 return `<div class="app-layout"><aside class="sidebar"><div class="brand"><div class="brand-symbol">W<span>·</span></div><span>wordora<span class="brand-dot">.</span></span></div><div class="nav-caption">O‘RGANISH BOSQICHLARI</div><nav class="side-nav">${navitem('dashboard','home','Bosh sahifa')}${navitem('learn','layers','So‘z yodlash')}${navitem('exercises','target','Mashqlar')}${navitem('exam','check','Test')}${navitem('library','library','Mening lug‘atim')}</nav><div class="sidebar-spacer"></div><div class="side-tip"><span class="tip-sun">✦</span><h3>Avval tanishing,<br>keyin test qiling!</h3><p>90% natija — yodlangan so‘zlar uchun mezon.</p></div><button class="sidebar-logout" data-action="logout">${I('logout',18)} <span>Hisobdan chiqish</span></button></aside>
 <div class="workspace"><header class="topbar"><div class="breadcrumb">Wordora <span> / </span><b>${esc(title)}</b></div><div class="topbar-right"><div class="streak-mini">${I('flame',19)} <strong>${state.stats?.streak||0}</strong> kun</div><div class="avatar">${esc(username.charAt(0).toUpperCase())}</div><span class="top-name">${esc(username)}</span></div></header><main class="main-content ${['v4-lesson','v4-exam'].includes(state.page)?'v4-study-main':''}">${content}</main><nav class="mobile-nav">${mobile('dashboard','home','Bosh sahifa')}${mobile('learn','layers','Yodlash')}${mobile('exercises','target','Mashq')}${mobile('exam','check','Test')}${mobile('library','library','Lug‘at')}</nav></div></div>`;
};
const v4LegacyStartPractice=startPractice;
startPractice=async function(mode){
 if(!V4.ready){toast('Avval Wordora 4.0 Supabase migratsiyasini bajaring.');return;}
 const eligible=v4PracticeWords().filter(w=>!V4.reviewOnly||v4Due(w));V4.reviewOnly=false;if(!eligible.length){toast('Bu guruhdagi so‘zlar bilan hali tanishmagansiz.');return;}
 const selected=shuffle(eligible.filter(w=>v4Due(w)));const rest=shuffle(eligible.filter(w=>!v4Due(w)));
 const order=[...selected,...rest].slice(0,Math.max(1,state.sessionLimit));
 cancelAutoNext();state.saving=false;state.session=order;state.studyMode=mode;state.index=0;state.sessionCorrect=0;state.sessionWrong=0;state.sessionFinished=!order.length;state.page='practice';
 if(order.length)initializeQuestion();render();window.scrollTo({top:0,behavior:'instant'});focusAnswer();
};
const v4LegacySaveAdvance=saveAndAdvance;
saveAndAdvance=async function(quality){
 const w=state.session[state.index],before=state.index;await v4LegacySaveAdvance(quality);
 if(state.index===before+1 && w && V4.ready){
   const meta=v4Meta(w);if(meta){
    const step=quality>=3?Math.max(1,Math.min(5,(meta.review_interval||0)+1)):1;
    const next=new Date();next.setDate(next.getDate()+[0,1,3,7,14,30][step]);
    const day=[next.getFullYear(),String(next.getMonth()+1).padStart(2,'0'),String(next.getDate()).padStart(2,'0')].join('-');
    const {error}=await client.from('word_learning').update({next_review_on:day,review_interval:step}).eq('user_id',state.user.id).eq('word_id',w.id);
    if(!error){meta.next_review_on=day;meta.review_interval=step;}
   }
 }
};
function v4Leave(target){if(V4.lesson?.ids?.length)v4SaveLesson();state.page=target;render();window.scrollTo({top:0,behavior:'instant'});}
function v4Navigate(target){
 if(state.page==='v4-lesson'&&V4.lesson)v4SaveLesson();
 if(state.page==='v4-exam'&&V4.exam&&!V4.exam.finished){if(!confirm('Test davom etmoqda. Chiqilsa bu urinish saqlanmaydi. Chiqasizmi?'))return;V4.exam=null;}
 state.page=target;state.showAdd=false;render();window.scrollTo({top:0,behavior:'instant'});
}
document.addEventListener('click',e=>{
 const btn=e.target.closest('[data-v4]');if(!btn)return;
 e.preventDefault();e.stopImmediatePropagation();const act=btn.dataset.v4;
 if(act==='nav')v4Navigate(btn.dataset.page);
 else if(act==='begin')v4Begin();
 else if(act==='resume'){state.page='v4-lesson';render();}
 else if(act==='discard'){if(confirm('Tugallanmagan mashg‘ulotni bekor qilasizmi? Bu so‘zlar hali “Yodlanmoqda”ga o‘tmagan.')){V4.lesson=null;v4SafeStorage.delete();render();}}
 else if(act==='sound')v4Pronounce();
 else if(act==='first-next'||act==='typed-next')v4Advance();
 else if(act==='retry'){V4.lesson.phase='type';v4SaveLesson();render();requestAnimationFrame(()=>document.getElementById('v4-answer')?.focus({preventScroll:true}));}
 else if(act==='repeat'){V4.lesson.finished=false;V4.lesson.phase='type';v4SaveLesson();render();v4Pronounce();}
 else if(act==='finish-lesson')v4FinishLesson();
 else if(act==='leave-lesson')v4Leave('learn');
 else if(act==='start-drill')startPractice(btn.dataset.mode);
 else if(act==='start-exam')v4StartExam(btn.dataset.date);
 else if(act==='answer-choice'){const q=v4CurrentQuestion();if(q)v4AnswerExam(q.options[Number(btn.dataset.index)]?.id);}
 else if(act==='exam-sound')v4TestSound();
 else if(act==='save-exam')v4SaveExam();
 else if(act==='retry-exam'){if(V4.exam)v4StartExam(V4.exam.date);}
 else if(act==='leave-exam')v4Navigate('exam');
 else if(act==='review-due'){V4.practiceDate='all';V4.reviewOnly=true;startPractice('mix');}
 else if(act==='open-day'){V4.examDate=btn.dataset.date;v4Navigate('exam');}
},true);
document.addEventListener('change',e=>{
 const id=e.target.id,v=e.target.value;
 if(id==='v4-count')V4.count=Math.max(1,Math.min(40,Math.round(Number(v)||20)));
 else if(id==='v4-topic'){V4.topic=v;render();}
 else if(id==='v4-type'){V4.wordType=v;render();}
 else if(id==='v4-practice-date'){V4.practiceDate=v;render();}
 else if(id==='v4-test-date'){V4.examDate=v;render();}
},true);
document.addEventListener('input',e=>{if(e.target.id==='v4-count')V4.count=Math.max(1,Math.min(40,Math.round(Number(e.target.value)||20)));},true);
document.addEventListener('submit',e=>{
 if(e.target.id==='v4-learning-form'){
  e.preventDefault();e.stopImmediatePropagation();const value=e.target.elements['v4-answer']?.value||'';
  const L=V4.lesson,w=v4LessonWord();if(!L||!w)return;
  if(normalize(value)===normalize(w.en)){L.phase='checked';}else{L.phase='wrong';L.errors++;}
  v4SaveLesson();render();if(L.phase==='checked')window.WordoraV5Schedule?.();
 }else if(e.target.id==='v4-test-form'){
  e.preventDefault();e.stopImmediatePropagation();const input=e.target.querySelector('input');if(!input?.value.trim())return;v4AnswerExam(input.value);
 }
},true);
// Keep 3.x library status and reminders consistent with the new test-based stage.
// Never infer "mastered" from generic exercise repetitions alone.
// When the Supabase session is already cached, the older shell may have rendered
// before this enhancement script executed. Refresh the view once with v4 routing.
if(state.user){v4Fetch().then(()=>render()).catch(err=>{V4.announce=err.message;render();});}