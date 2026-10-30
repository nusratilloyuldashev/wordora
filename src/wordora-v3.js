/* Wordora 3.0 — learning-first navigation, topic/POS tagging, and spaced review UI.
 * Additive enhancement of 2.1; uses existing Supabase auth and review RPC.
 */
'use strict';
const v3Topics = [
 ['daily','☀️','Kundalik hayot'],['clothes','👕','Kiyim-kechak'],['weather','🌦️','Ob-havo'],
 ['home','🏠','Uy va jihozlar'],['food','🥑','Ovqat va ichimlik'],['travel','✈️','Sayohat'],
 ['transport','🚗','Transport'],['technology','💻','Texnologiya'],['study','📚','O‘qish va ish'],
 ['health','🩺','Salomatlik'],['shopping','🛍️','Xaridlar'],['sports','⚽','Sport'],
 ['nature','🌿','Tabiat'],['feelings','💗','His-tuyg‘ular'],['verbs','⚡','Asosiy fe’llar'],
 ['other','🗂️','Boshqa mavzu']
];
const v3Types=[
 ['noun','Ot'],['verb','Fe’l'],['adjective','Sifat'],['adverb','Ravish'],
 ['modal','Modal fe’l'],['pronoun','Olmosh'],['preposition','Ko‘makchi'],
 ['conjunction','Bog‘lovchi'],['number','Son'],['phrase','Ibora'],['other','Boshqa']
];
Object.assign(state, {libraryStage:'active',libraryTopic:'all',libraryType:'all',librarySource:'all',wordType:'all',practicePool:'ready',editWordId:null});
const v3TopicName = key => v3Topics.find(t=>t[0]===key)?.[2] || 'Boshqa mavzu';
const v3TypeName = key => v3Types.find(t=>t[0]===key)?.[1] || 'Belgilanmagan';
const v3WordTopic = w => w.topic && w.topic!=='other' ? w.topic : (w.owner_id ? (w.topic||'other') : w.category);
const v3WordType = w => w.word_type && w.word_type!=='other' ? w.word_type : (w.category==='verbs'?'verb':(w.word_type||'other'));
const v3Stage = w => !w.due_on ? 'new' : Number(w.repetitions||0)>=3 ? 'mastered' : 'learning';
const v3Due = w => !!w.due_on && w.due_on<=localISODate();
const v3Summary = () => {
 const words=state.words||[];
 return {total:words.length,new:words.filter(w=>v3Stage(w)==='new').length,
 learning:words.filter(w=>v3Stage(w)==='learning').length,
 mastered:words.filter(w=>v3Stage(w)==='mastered').length,
 due:words.filter(v3Due).length,dueMastered:words.filter(w=>v3Due(w)&&v3Stage(w)==='mastered').length};
};
const v3Options=(options,value,allText,blank=false) => `${blank?'<option value="" disabled selected>Tanlang...</option>':`<option value="all" ${value==='all'?'selected':''}>${esc(allText)}</option>`}${options.map(([id,icon,name])=>`<option value="${id}" ${value===id?'selected':''}>${icon?icon+' ':''}${esc(name)}</option>`).join('')}`;
const v3TopicOptions=(value,allText='Barcha mavzular',blank=false)=>v3Options(v3Topics,value,allText,blank);
const v3TypeOptions=(value,allText='Barcha turkumlar',blank=false)=>v3Options(v3Types.map(t=>[t[0],'',t[1]]),value,allText,blank);
const v3FilterOptions=()=>`<div class="v3-filters"><label>Mavzu<select id="v3-practice-topic">${v3TopicOptions(state.category)}</select></label><label>So‘z turkumi<select id="v3-practice-type">${v3TypeOptions(state.wordType)}</select></label><label>Hajm<select id="v3-practice-limit"><option value="5" ${state.sessionLimit===5?'selected':''}>5 ta</option><option value="10" ${state.sessionLimit===10?'selected':''}>10 ta</option><option value="15" ${state.sessionLimit===15?'selected':''}>15 ta</option><option value="20" ${state.sessionLimit===20?'selected':''}>20 ta</option></select></label></div>`;
function v3MatchWord(w){return (state.category==='all'||v3WordTopic(w)===state.category) && (state.wordType==='all'||v3WordType(w)===state.wordType);}
function v3ReadyWords(pool=state.practicePool){return state.words.filter(w=>v3MatchWord(w) && (pool==='new'?v3Stage(w)==='new':pool==='review'?v3Due(w):pool==='mastered-review'?(v3Due(w)&&v3Stage(w)==='mastered'):pool==='learning'?(v3Stage(w)==='learning'&&v3Due(w)):(v3Due(w)||v3Stage(w)==='new')));}
function v3TopicPill(word){return `<span class="topic-pill">${esc(v3TopicName(v3WordTopic(word)))}</span>`;}
const v3StatTag= w => {
 const stage=v3Stage(w);
 if(stage==='new')return '<span class="status-pill new">Yangi</span>';
 if(stage==='mastered')return `<span class="status-pill learned">Yodlangan</span>${v3Due(w)?'<span class="v3-review-small">Qaytarish vaqti</span>':''}`;
 return `<span class="status-pill due">Yodlanmoqda</span>${v3Due(w)?'<span class="v3-review-small">Bugun takrorlang</span>':''}`;
};
status = function(w){const st=v3Stage(w);return {txt:st==='new'?'Yangi':st==='mastered'?'Yodlangan':'Yodlanmoqda',cls:st==='mastered'?'learned':st==='new'?'new':'due'};};
pageShell = function(){const username=state.user?.username||'Do‘st';
 const item=(page,icon,title)=>`<button class="nav-item ${state.page===page||state.page==='practice'&&page===(state.studyMode==='cards'?'learn':'exercises')?'active':''}" data-action="v3-nav" data-page="${page}">${I(icon)}<span>${title}</span></button>`;
 const mobile=(page,icon,title)=>`<button class="${state.page===page?'active':''}" data-action="v3-nav" data-page="${page}">${I(icon)}<span>${title}</span></button>`;
 const title={dashboard:'Bosh sahifa',learn:'Yodlash',exercises:'Mashqlar',library:'Lug‘at',practice:state.studyMode==='cards'?'Yodlash':'Mashq'}[state.page]||'Wordora';
 return `<div class="app-layout"><aside class="sidebar"><div class="brand"><div class="brand-symbol">W<span>·</span></div><span>wordora<span class="brand-dot">.</span></span></div><div class="nav-caption">O‘RGANISH BO‘LIMLARI</div><nav class="side-nav">${item('dashboard','home','Bosh sahifa')}${item('learn','layers','So‘z yodlash')}${item('exercises','target','Mashqlar')}${item('library','library','Mening lug‘atim')}</nav><div class="sidebar-spacer"></div><div class="side-tip"><span class="tip-sun">✦</span><h3>Unutmaslik siri —<br>vaqtida takrorlash!</h3><p>Yodlangan so‘zlar ham qaytarishga chiqadi.</p></div><button class="sidebar-logout" data-action="logout">${I('logout',18)} <span>Hisobdan chiqish</span></button></aside>
 <div class="workspace"><header class="topbar"><div class="breadcrumb">Wordora <span> / </span><b>${esc(title)}</b></div><div class="topbar-right"><div class="streak-mini">${I('flame',19)} <strong>${state.stats?.streak||0}</strong> kun</div><div class="avatar">${esc(username.charAt(0).toUpperCase())}</div><span class="top-name">${esc(username)}</span></div></header><main class="main-content">${state.page==='dashboard'?dashboardPage():state.page==='library'?libraryPage():state.page==='learn'?v3LearnPage():state.page==='exercises'?v3ExercisesPage():practicePage()}</main><nav class="mobile-nav">${mobile('dashboard','home','Bosh sahifa')}${mobile('learn','layers','Yodlash')}${mobile('exercises','target','Mashqlar')}${mobile('library','library','Lug‘at')}</nav></div></div>`;
};
function v3Warning(){return window.WordoraBackend.taxonomyReady===false?`<div class="v3-migration-note" role="status">⚠️ Mavzu va so‘z turkumini bazaga saqlash uchun <b>Supabase yangilanishi</b> zarur. Hozircha eski so‘zlar ishlaydi; yangi teglar saqlanmaydi.</div>`:'';}
dashboardPage = function(){const s=state.stats||{},n=v3Summary(),today=esc(displayToday());
 const dueBanner=n.due?`<section class="v3-due-callout"><span class="v3-callout-icon">🔁</span><div><strong>${n.due} ta so‘zni takrorlash vaqti keldi</strong><p>Shundan ${n.dueMastered} tasi avval yodlangan. Vaqtida qaytarish unutishning oldini oladi.</p></div><button class="btn btn-primary" data-action="v3-review">Hozir takrorlash ${I('arrow',17)}</button></section>`:`<section class="v3-due-callout v3-due-clear"><span class="v3-callout-icon">✅</span><div><strong>Bugungi takrorlashlar bajarilgan!</strong><p>Yangi so‘zlarni yodlash yoki mini-test bajarish mumkin.</p></div><button class="btn btn-secondary" data-action="v3-nav" data-page="learn">Yangi so‘zlar ${I('arrow',17)}</button></section>`;
 return `<div class="welcome-heading"><div><div class="overline">SHAXSIY O‘RGANISH MAYDONI ✨</div><h1>Salom, ${esc(state.user?.username||'do‘st')}! 👋</h1><p>Yodlang, mashq qiling va kerakli vaqtda qaytaring.</p></div><div class="today-label">${I('calendar',18)} ${today}</div></div>${dueBanner}${v3Warning()}
 <div class="v3-stat-grid"><div class="v3-stat"><strong>${n.new}</strong><span>Yangi so‘z</span></div><div class="v3-stat"><strong>${n.learning}</strong><span>Yodlanmoqda</span></div><div class="v3-stat"><strong>${n.mastered}</strong><span>Yodlangan</span></div><div class="v3-stat"><strong>${n.total}</strong><span>Jami lug‘at</span></div></div>
 <section class="v3-journey"><button class="v3-journey-card" data-action="v3-nav" data-page="learn"><span class="v3-large-emoji">🧠</span><span><small>1-BOSQICH · O‘RGANISH</small><strong>So‘z yodlash</strong><em>Yangi so‘zlarni kartochkalar bilan eslab qoling</em></span>${I('arrow',23)}</button><button class="v3-journey-card" data-action="v3-nav" data-page="exercises"><span class="v3-large-emoji">🎯</span><span><small>2-BOSQICH · MUSTAHKAMLASH</small><strong>Mashqlar</strong><em>Tarjima tanlash, yozish, tinglash va aralash testlar</em></span>${I('arrow',23)}</button></section>
 <div class="v3-bottom-summary"><div class="panel"><div class="panel-title"><div><h3>Bugungi maqsad</h3><p>Har kuni oz-ozdan o‘rganing</p></div>${I('target',22)}</div><div class="v3-goal-progress"><strong>${s.practiced_today||0} / ${s.daily_goal||15}</strong><div class="progress-track"><div style="width:${p(s.practiced_today||0,s.daily_goal||15)}%"></div></div></div></div><div class="panel"><div class="panel-title"><div><h3>Lug‘atni boshqaring</h3><p>Mavzu, turkum va holat bo‘yicha tanlang</p></div>${I('library',22)}</div><button class="btn btn-secondary" data-action="v3-nav" data-page="library">Lug‘atni ochish ${I('arrow',18)}</button></div></div>`;
};
function v3LearnPage(){const n=v3Summary();return `<div class="page-title-row"><div><div class="overline">1-BOSQICH · ESKA QOLISH</div><h1>So‘z yodlash 🧠</h1><p>Kartochkalar bilan ma’nosini eslang. Javobni oching va o‘zingizni baholang.</p></div></div>${v3Warning()}
 <div class="v3-lesson-info"><div><b>${n.new}</b> ta yangi so‘z</div><div><b>${n.due}</b> ta takrorlash kerak</div><div><b>${n.mastered}</b> ta yodlangan</div></div>
 ${v3FilterOptions()}<div class="v3-learning-options"><button class="v3-learn-choice" data-action="v3-start" data-mode="cards" data-pool="new"><span>🌱</span><strong>Yangi so‘zlarni o‘rganish</strong><small>Hali boshlanmagan so‘zlar</small></button><button class="v3-learn-choice" data-action="v3-start" data-mode="cards" data-pool="review"><span>🔁</span><strong>Vaqti kelganlarni qaytarish</strong><small>Oldin yodlangan so‘zlar ham kiradi</small></button></div><p class="v3-explainer">Kartochka test emas: avval o‘zingiz eslang, keyin javobni ko‘rib “Esimda yo‘q”, “Qiyin” yoki “Bilaman” deb baholang. Takrorlash kuni javoblaringizga qarab hisoblanadi.</p>`;}
function v3ExercisesPage(){return `<div class="page-title-row"><div><div class="overline">2-BOSQICH · AMALIYOT</div><h1>Mashq qilish 🎯</h1><p>So‘zlarni turli usulda mustahkamlang. Kartochkalar “So‘z yodlash” bo‘limida.</p></div></div>${v3Warning()}${v3FilterOptions()}
 <div class="v3-pool-select"><label for="v3-practice-pool">Qaysi so‘zlar bilan?<select id="v3-practice-pool"><option value="ready" ${state.practicePool==='ready'?'selected':''}>Yangi va bugun takrorlanadigan</option><option value="new" ${state.practicePool==='new'?'selected':''}>Faqat yangi</option><option value="review" ${state.practicePool==='review'?'selected':''}>Faqat takrorlash kerak</option><option value="learning" ${state.practicePool==='learning'?'selected':''}>Yodlanayotganlardan vaqti kelganlar</option><option value="mastered-review" ${state.practicePool==='mastered-review'?'selected':''}>Yodlanganlardan vaqti kelganlar</option></select></label></div>
 <div class="v3-exercise-grid">${modes.filter(m=>m.id!=='cards').map(m=>`<button class="mode-card ${m.color}" data-action="v3-start" data-mode="${m.id}" data-pool="${state.practicePool}"><div class="mode-top"><div class="mode-icon">${I(m.icon,26)}</div><span class="mode-arrow">${I('arrow',21)}</span></div><div class="mode-label">${m.badge}</div><h3>${m.name}</h3><p>${m.subtitle}</p></button>`).join('')}</div>`;}
function v3LibraryMatches(w){const stage=v3Stage(w);
 const stageMatch=state.libraryStage==='all'||(state.libraryStage==='active'?stage!=='mastered':state.libraryStage==='review'?v3Due(w):stage===state.libraryStage);
 return stageMatch&&(state.libraryTopic==='all'||v3WordTopic(w)===state.libraryTopic)&&(state.libraryType==='all'||v3WordType(w)===state.libraryType)&&(state.librarySource==='all'||(state.librarySource==='mine'?!!w.owner_id:!w.owner_id))&&(!state.search||(w.en+' '+w.uz).toLowerCase().includes(state.search.toLowerCase()));}
libraryPage = function(){const n=v3Summary(),displayed=state.words.filter(v3LibraryMatches);const canTag=window.WordoraBackend.taxonomyReady!==false;const tab=(key,label,count)=>`<button class="v3-stage-tab ${state.libraryStage===key?'active':''}" data-action="v3-stage" data-stage="${key}">${label} <b>${count}</b></button>`;
 const editing=state.words.find(w=>w.id===state.editWordId&&w.owner_id);
 return `<div class="page-title-row"><div><div class="overline">SHAXSIY SO‘ZLAR BAZASI</div><h1>Mening lug‘atim 📖</h1><p>So‘zlarni mavzu, turkum va yodlash holati bo‘yicha toping.</p></div><button class="btn btn-primary" data-action="show-add">${I('plus',19)} So‘z qo‘shish</button></div>${v3Warning()}
 ${state.showAdd?`<section class="panel v3-add-panel"><div class="panel-title"><div><h3>Yangi so‘z qo‘shish</h3><p>Ma’nosini va qaysi guruhga tegishliligini yozing.</p></div><button class="icon-btn" data-action="hide-add">${I('close')}</button></div><form id="add-word-form" class="add-form"><div><label for="en">Inglizcha so‘z *</label><input id="en" name="en" placeholder="Masalan: jacket" maxlength="80" required></div><div><label for="uz">O‘zbekcha tarjima *</label><input id="uz" name="uz" placeholder="Masalan: kurtka" maxlength="120" required></div><div><label for="v3-topic-add">Mavzu *</label><select id="v3-topic-add" name="topic" required>${v3TopicOptions('','',true)}</select></div><div><label for="v3-type-add">So‘z turkumi *</label><select id="v3-type-add" name="word_type" required>${v3TypeOptions('','',true)}</select></div><div><label for="example_en">Inglizcha gap (ixtiyoriy)</label><input id="example_en" name="example_en" placeholder="I put on my jacket." maxlength="240"></div><div><label for="example_uz">Tarjimasi (ixtiyoriy)</label><input id="example_uz" name="example_uz" placeholder="Men kurtkamni kiydim." maxlength="240"></div><div class="add-actions"><button class="btn btn-primary" type="submit" ${state.busy||!canTag?'disabled':''}>${I('plus',17)} Lug‘atga qo‘shish</button></div></form></section>`:''}
 ${editing?`<section class="panel v3-edit-panel"><div class="panel-title"><div><h3>“${esc(editing.en)}” — turkumni tahrirlash</h3><p>Shaxsiy so‘zning mavzu va so‘z turkumini yangilang.</p></div><button class="icon-btn" data-action="v3-cancel-edit">${I('close')}</button></div><form id="v3-edit-form" class="v3-edit-form"><input type="hidden" name="id" value="${editing.id}"><label>Mavzu<select name="topic">${v3TopicOptions(v3WordTopic(editing),'',true)}</select></label><label>So‘z turkumi<select name="word_type">${v3TypeOptions(v3WordType(editing),'',true)}</select></label><button class="btn btn-primary" type="submit" ${!canTag?'disabled':''}>Saqlash</button></form></section>`:''}
 <div class="v3-stage-tabs">${tab('active','Faol',n.new+n.learning)}${tab('new','Yangi',n.new)}${tab('learning','Yodlanmoqda',n.learning)}${tab('mastered','Yodlangan',n.mastered)}${tab('review','Takrorlash',n.due)}${tab('all','Hammasi',n.total)}</div>
 <div class="v3-library-filters"><label>Qidirish<input id="v3-live-search" type="search" placeholder="So‘z yoki tarjima..." value="${esc(state.search)}"></label><label>Mavzu<select id="v3-library-topic">${v3TopicOptions(state.libraryTopic)}</select></label><label>So‘z turkumi<select id="v3-library-type">${v3TypeOptions(state.libraryType)}</select></label><label>Manba<select id="v3-library-source"><option value="all" ${state.librarySource==='all'?'selected':''}>Barcha so‘zlar</option><option value="mine" ${state.librarySource==='mine'?'selected':''}>Men qo‘shganlar</option><option value="starter" ${state.librarySource==='starter'?'selected':''}>Tayyor lug‘at</option></select></label></div>
 <div class="word-list-meta"><span><b>${displayed.length}</b> ta so‘z topildi</span><span>🔊 Talaffuzni tinglang · Qaytarish vaqti kelganda bosh sahifada eslatiladi</span></div>
 <div class="word-table-wrap"><table class="word-table v3-word-table"><thead><tr><th>INGLIZCHA</th><th>TARJIMA</th><th>MAVZU / TURKUM</th><th>HOLAT</th><th></th></tr></thead><tbody>${displayed.length?displayed.map(w=>`<tr><td><button class="word-pronounce" data-action="speak-word" data-word-id="${w.id}" title="Talaffuzini tinglash"><span class="sound-small">${I('sound',16)}</span><strong>${esc(w.en)}</strong></button><div class="example-mini">${esc(w.example_en)}</div></td><td>${esc(w.uz)}</td><td>${v3TopicPill(w)}<div class="v3-word-type">${esc(v3TypeName(v3WordType(w)))}</div></td><td>${v3StatTag(w)}</td><td>${w.owner_id?`<div class="v3-row-actions"><button class="delete-word" data-action="v3-edit" data-word-id="${w.id}" aria-label="${esc(w.en)} so‘zini tahrirlash" title="Teglarni tahrirlash">✎</button><button class="delete-word" data-action="delete-word" data-word-id="${w.id}" title="O‘chirish">${I('trash',17)}</button></div>`:''}</td></tr>`).join(''):`<tr><td colspan="5" class="empty-table">Bu guruhda so‘z yo‘q. Boshqa filtrni tanlang yoki so‘z qo‘shing.</td></tr>`}</tbody></table></div>
 ${state.libraryStage==='mastered'?`<div class="v3-explainer">✅ Bu yerda yodlangan so‘zlar saqlanadi. Ular yo‘qolmaydi: takrorlash kuni kelganda “Takrorlash” ro‘yxatida va bosh sahifada ko‘rinadi.</div>`:''}`;
};
startPractice = async function(mode){if(state.busy)return;
 cancelAutoNext();state.saving=false;const pool=mode==='cards'&&state.practicePool==='ready'?'new':state.practicePool;
 const eligible=v3ReadyWords(pool);
 const due=shuffle(eligible.filter(v3Due).sort((a,b)=>(a.due_on||'').localeCompare(b.due_on||'')));
 const fresh=shuffle(eligible.filter(w=>!v3Due(w)));
 const order=[...due,...fresh].slice(0,state.sessionLimit);
 state.session=order;state.studyMode=mode;state.index=0;state.sessionCorrect=0;state.sessionWrong=0;state.sessionFinished=!order.length;state.page='practice';
 if(order.length)initializeQuestion();render();window.scrollTo({top:0,behavior:'instant'});focusAnswer();
};
addWord = async function(form){if(state.busy)return;
 if(window.WordoraBackend.taxonomyReady===false){toast('Mavzu va turkumni saqlash uchun avval Supabase yangilanishini bajaring.');return;}
 const body=Object.fromEntries(new FormData(form).entries());
 if(!v3Topics.some(t=>t[0]===body.topic)||!v3Types.some(t=>t[0]===body.word_type)){toast('Mavzu va so‘z turkumini tanlang.');return;}
 state.busy=true;
 try{await api('/words',{method:'POST',body:JSON.stringify(body)});await loadCore();state.showAdd=false;state.libraryStage='active';state.librarySource='mine';state.libraryTopic=body.topic;state.libraryType=body.word_type;state.search='';render();toast('So‘z mavzu va turkum bilan saqlandi!','success');}
 catch(e){toast(e.message);}finally{state.busy=false;}
};
let v3SearchTimer=null;
document.addEventListener('input',e=>{if(e.target.id!=='v3-live-search')return;
 clearTimeout(v3SearchTimer);const value=e.target.value;const caret=e.target.selectionStart;
 v3SearchTimer=setTimeout(()=>{if(state.page!=='library')return;state.search=value;render();const input=document.getElementById('v3-live-search');if(input){input.focus({preventScroll:true});input.setSelectionRange(caret,caret);}},180);
});
document.addEventListener('change',e=>{
 const id=e.target.id,value=e.target.value;
 if(id==='v3-library-topic'){state.libraryTopic=value;render();}
 else if(id==='v3-library-type'){state.libraryType=value;render();}
 else if(id==='v3-library-source'){state.librarySource=value;render();}
 else if(id==='v3-practice-topic'){state.category=value;render();}
 else if(id==='v3-practice-type'){state.wordType=value;render();}
 else if(id==='v3-practice-pool'){state.practicePool=value;render();}
 else if(id==='v3-practice-limit'){state.sessionLimit=Number(value);localStorage.setItem('wordora-session-limit',value);}
});
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;
 const a=b.dataset.action;
 if(a==='v3-nav'){nav(b.dataset.page);}
 else if(a==='v3-stage'){state.libraryStage=b.dataset.stage;state.search='';render();}
 else if(a==='v3-start'){state.practicePool=b.dataset.pool||'ready';startPractice(b.dataset.mode);}
 else if(a==='v3-review'){state.category='all';state.wordType='all';state.practicePool='review';startPractice('mix');}
 else if(a==='v3-edit'){state.editWordId=Number(b.dataset.wordId);state.showAdd=false;render();document.querySelector('.v3-edit-panel')?.scrollIntoView({block:'nearest'});}
 else if(a==='v3-cancel-edit'){state.editWordId=null;render();}
});
document.addEventListener('submit',async e=>{if(e.target.id!=='v3-edit-form')return;
 e.preventDefault();const form=e.target,body=Object.fromEntries(new FormData(form).entries());
 if(!v3Topics.some(t=>t[0]===body.topic)||!v3Types.some(t=>t[0]===body.word_type)){toast('Mavzu va so‘z turkumini tanlang.');return;}
 try{await api(`/words/${Number(body.id)}`,{method:'PATCH',body:JSON.stringify({topic:body.topic,word_type:body.word_type})});await loadCore();state.editWordId=null;render();toast('So‘z tasnifi yangilandi!','success');}catch(err){toast(err.message);}
});