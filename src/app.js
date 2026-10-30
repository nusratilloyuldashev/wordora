/* Wordora — Netlify static front-end + Supabase Auth/PostgreSQL. */
'use strict';
const root = document.getElementById('app');
const icons = {
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  library:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  layers:'<rect width="14" height="14" x="5" y="5" rx="2"/><path d="M8 2h11a3 3 0 0 1 3 3v11M2 8v11a3 3 0 0 0 3 3h11"/>',
  pen:'<path d="m12 19 7-7 3 3-7 7-4 1zM3 9l6-6 3 3-6 6z"/><path d="m14 5 5 5"/>',
  headphones:'<path d="M3 14v-3a9 9 0 0 1 18 0v3"/><path d="M3 14h4v7H5a2 2 0 0 1-2-2zM21 14h-4v7h2a2 2 0 0 0 2-2z"/>',
  check:'<path d="m20 6-11 11-5-5"/>',
  close:'<path d="M18 6 6 18M6 6l12 12"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  logout:'<path d="M10 17l5-5-5-5M15 12H3M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/>',
  flame:'<path d="M12 22c5 0 8-4 8-9 0-3-2-6-4-8 0 4-2 5-3 6-1-4-4-6-5-8-1 5-4 7-4 11 0 5 3 8 8 8Z"/><path d="M12 22c2 0 4-2 4-5 0-2-1-3-2-4 0 2-2 2-2 4-1-1-2-2-2-3-1 1-2 2-2 4 0 2 2 4 4 4Z"/>',
  trend:'<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  sound:'<path d="m11 5-5 4H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
  rotate:'<path d="M3 11a9 9 0 1 1 2 6M3 17v-6h6"/>',
  star:'<path d="m12 2 3 7 7 .5-5.4 5 1.5 7.5L12 18l-6.1 4 1.5-7.5L2 9.5 9 9z"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6M10 10v7m4-7v7"/>',
  back:'<path d="m15 18-6-6 6-6"/>',
  sparkle:'<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 18v4M17 20h4M3 2v4M1 4h4"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  bolt:'<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',
};
const I = (name, size=20) => `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.star}</svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize = s => String(s).trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').replace(/[.!?]+$/g,'');
const shuffle = a => {let x=[...a]; for(let i=x.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;};
const modes = [
 {id:'cards', name:'Kartochkalar', subtitle:'So‘zni ko‘r va eslab qol', description:'Ma’noni ochib, o‘zingni bahola', color:'violet', icon:'layers', badge:'Xotirani kuchaytir'},
 {id:'choice', name:'Tarjimani top', subtitle:'4 ta variantdan to‘g‘risini tanla', description:'Bilimingni tez sinovdan o‘tkaz', color:'blue', icon:'target', badge:'Mini-test'},
 {id:'write', name:'Yozib top', subtitle:'O‘zbekchasidan inglizchasini yoz', description:'So‘zni faol xotiradan chiqar', color:'peach', icon:'pen', badge:'Yozma mashq'},
 {id:'listen', name:'Tinglab yoz', subtitle:'Talaffuzini tingla va so‘zni yoz', description:'Eshitish va imloni birga o‘rgan', color:'mint', icon:'headphones', badge:'Talaffuz mashqi'},
 {id:'mix', name:'Aqlli aralash mashq', subtitle:'3 mashq navbatma-navbat', description:'Bitta so‘zni turli usullarda mustahkamlang', color:'violet', icon:'sparkle', badge:'Tavsiya etiladi'}
];
let state = {
 user:null, authMode:'register',
 page:'dashboard', category:'all', libraryCategory:'all', search:'',
 categories:[], words:[], stats:null, busy:false, alert:'',
 studyMode:'cards', session:[], index:0, revealed:false, answerValue:'',
 answered:false, answerCorrect:false, quality:null, chosenIndex:-1,
 options:[], sessionCorrect:0, sessionWrong:0, sessionFinished:false,
 showAdd:false, saving:false, pendingWord:false,
 sessionLimit: Number(localStorage.getItem('wordora-session-limit')) || 10,
 autoNext: localStorage.getItem('wordora-auto-next') === 'true'
};

const { api, client, configError, profile } = window.WordoraBackend;
let autoNextTimer = null;
function cancelAutoNext(){ if(autoNextTimer!==null){clearTimeout(autoNextTimer);autoNextTimer=null;} }
function questionMode(){return state.studyMode==='mix' ? ['choice','write','listen'][state.index%3] : state.studyMode;}
function focusAnswer(){
 if(state.page!=='practice'||state.answered||state.sessionFinished)return;
 if(['write','listen'].includes(questionMode())){
   requestAnimationFrame(()=>document.getElementById('answer-input')?.focus({preventScroll:true}));
 }
}
function positionPractice(){
 requestAnimationFrame(()=>document.querySelector('.practice-shell')?.scrollIntoView({block:'start',behavior:'instant'}));
}
function scheduleAutoNext(){
 cancelAutoNext();
 if(!state.autoNext || !state.answered || !state.answerCorrect || state.saving)return;
 const questionIndex=state.index;
 autoNextTimer=setTimeout(()=>{
   autoNextTimer=null;
   if(state.page==='practice'&&state.index===questionIndex&&state.answered&&!state.saving)saveAndAdvance(state.quality);
 },1900);
}
function selectChoice(i){
 if(state.answered||state.page!=='practice'||questionMode()!=='choice')return;
 if(!Number.isInteger(i)||i<0||i>=state.options.length)return;
 state.chosenIndex=i;
 const word=state.session[state.index];
 state.answerCorrect=normalize(state.options[i])===normalize(word.uz);
 state.quality=state.answerCorrect?4:1;
 state.answered=true;
 render();scheduleAutoNext();
}

function toast(message,type='error'){
  state.alert={message,type};
  let bar=document.getElementById('toast');
  if(bar)bar.remove();
  bar=document.createElement('div');bar.id='toast';bar.className='toast '+type;
  bar.textContent=message;document.body.append(bar);
  setTimeout(()=>{if(bar.isConnected)bar.remove()},4000);
}
async function loadCore(){
 const [categories,words,stats] = await Promise.all([api('/categories'),api('/words?limit=2000'),api('/stats')]);
 state.categories=categories;state.words=words.words;state.stats=stats;
}
async function authSubmit(form){
 if(state.busy)return;
 const email=form.elements.email?.value.trim().toLowerCase();
 const password=form.elements.password?.value;
 state.busy=true;render();
 try{
  if(state.authMode==='reset'){
   const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/'});
   if(error)throw new Error(error.message);
   state.authMode='login';toast('Parolni tiklash havolasi elektron pochtangizga yuborildi.','success');
  }else if(state.authMode==='change-password'){
   const {error}=await client.auth.updateUser({password});
   if(error)throw new Error(error.message);
   state.authMode='login';const {data}=await client.auth.getUser();
   if(data?.user){state.user=profile(data.user);await loadCore();state.page='dashboard';}
   toast('Parol yangilandi!','success');
  }else if(state.authMode==='register'){
   const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+'/'}});
   if(error)throw new Error(error.message);
   if(data.session && data.user){state.user=profile(data.user);await loadCore();state.page='dashboard';toast('Hisob yaratildi!','success');}
   else{state.authMode='login';toast('Tasdiqlash xatini elektron pochtangizdan tekshiring.','success');}
  }else{
   const {data,error}=await client.auth.signInWithPassword({email,password});
   if(error)throw new Error(error.message);
   state.user=profile(data.user);await loadCore();state.page='dashboard';toast('Xush kelibsiz! O‘rganishni boshlaymiz.','success');
  }
 }catch(e){toast(e.message);}finally{state.busy=false;render();}
}
function nav(page){cancelAutoNext();state.page=page;state.sessionFinished=false;state.showAdd=false;render();window.scrollTo({top:0,behavior:'instant'});}
function catName(slug){return state.categories.find(c=>c.slug===slug)?.name||'So‘zlar';}
function p(value,max){return Math.max(0,Math.min(100,Math.round((value/Math.max(1,max))*100)));}
function formatDay(dateString){return ['Ya','Du','Se','Ch','Pa','Ju','Sh'][new Date(dateString+'T12:00:00').getDay()];}
function localISODate(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function displayToday(){const d=new Date();return `${d.getDate()}-${['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr'][d.getMonth()]}, ${d.getFullYear()}`;}
function status(word){if(word.due_on==null)return {txt:'Yangi',cls:'new'};if(word.repetitions>=2)return {txt:'O‘rganilmoqda',cls:'learned'};return {txt:'Takrorlashda',cls:'due'};}

function authPage(){return `<div class="auth-page">
 <section class="auth-story"><div class="auth-brand"><span class="brand-symbol">W<span>·</span></span> wordora<span class="brand-dot">.</span></div>
   <div class="auth-story-content"><div class="auth-eyebrow">✨ SO‘ZLAR DUNYOSIGA XUSH KELIBSIZ</div><h1>Yangi so‘zlarni<br><em>unutmasdan</em><br>yodlang.</h1><p>O‘zingizga mos mashqlar, eslab qolishga yordam beruvchi takrorlash va har kuni kichik g‘alabalar.</p>
   <div class="floating-word"><span class="floating-tag">BUGUNGI SO‘Z</span><span class="floating-title">discover <span class="floating-emoji">💡</span></span><span class="floating-meaning">kashf qilmoq</span><span class="floating-foot">Learn a little. Remember a lot.</span></div></div>
   <div class="auth-foot">Har bir yangi so‘z — katta imkoniyat boshlanishi.</div>
 </section>
 <section class="auth-form-panel"><div class="auth-mobile-brand"><span class="brand-symbol">W<span>·</span></span> wordora<span class="brand-dot">.</span></div>
   <div class="auth-form-wrap"><div class="pill-small">🌱 BOSHLASH UCHUN TAYYORMISIZ?</div><h2>${state.authMode==='register'?'Keling, tanishamiz!':state.authMode==='reset'?'Parolni tiklash':state.authMode==='change-password'?'Yangi parol':'Qaytganingizdan xursandmiz!'}</h2><p class="auth-subtitle">${state.authMode==='register'?'Hisob yarating va so‘zlarni osonroq yodlashni boshlang.':state.authMode==='reset'?'Emailingizga parolni tiklash havolasi yuboriladi.':state.authMode==='change-password'?'Kamida 8 belgili yangi parol kiriting.':'O‘rganishni qolgan joyingizdan davom ettiring.'}</p>
     <form id="auth-form" autocomplete="on">
     ${state.authMode!=='change-password'?`<label for="email">Elektron pochta</label><input id="email" type="email" name="email" maxlength="254" placeholder="masalan@gmail.com" required autocomplete="email">`:''}
     ${state.authMode!=='reset'?`<label for="password">${state.authMode==='change-password'?'Yangi parol':'Parol'}</label><input id="password" type="password" name="password" minlength="8" maxlength="72" placeholder="Kamida 8 ta belgi" required autocomplete="${state.authMode==='login'?'current-password':'new-password'}">`:''}
     <button class="btn btn-primary btn-wide" type="submit" ${state.busy?'disabled':''}>${state.busy?'Kuting...':state.authMode==='register'?'Bepul boshlash':state.authMode==='reset'?'Tiklash havolasini yuborish':state.authMode==='change-password'?'Yangi parolni saqlash':'Kirish'} ${I('arrow',18)}</button></form>
     <p class="auth-switch">${state.authMode==='register'?'Hisobingiz bormi?':state.authMode==='login'?'Yangi foydalanuvchimisiz?':'Kirish sahifasiga qaytish'} <button type="button" class="link-btn" data-action="switch-auth">${state.authMode==='register'?'Kirish':state.authMode==='login'?'Ro‘yxatdan o‘tish':'Kirish'}</button></p>
     ${state.authMode==='login'?`<p class="auth-switch"><button type="button" class="link-btn" data-action="forgot-password">Parolni unutdingizmi?</button></p>`:''}
     <div class="auth-benefits"><div>✓ 86 ta tayyor so‘z</div><div>✓ 4 xil mashq</div><div>✓ Aqlli takrorlash</div></div>
   </div>
 </section></div>`;}
function pageShell(){const username=state.user?.username||'Do‘st';return `<div class="app-layout"><aside class="sidebar">
  <div class="brand"><div class="brand-symbol">W<span>·</span></div><span>wordora<span class="brand-dot">.</span></span></div>
  <div class="nav-caption">ASOSIY MENYU</div><nav class="side-nav">
   <button class="nav-item ${state.page==='dashboard'?'active':''}" data-action="nav" data-page="dashboard">${I('home')} <span>Bosh sahifa</span></button>
   <button class="nav-item ${state.page==='practice'?'active':''}" data-action="start" data-mode="cards">${I('layers')} <span>Mashq qilish</span></button>
   <button class="nav-item ${state.page==='library'?'active':''}" data-action="nav" data-page="library">${I('library')} <span>Mening lug‘atim</span></button>
  </nav>
  <div class="sidebar-spacer"></div>
  <div class="side-tip"><span class="tip-sun">✦</span><h3>Kichik qadamlar —<br>katta natijalar!</h3><p>Har kuni 15 ta mashq ham yaxshi odatni shakllantiradi.</p><div class="tip-deco">✳</div></div>
  <button class="sidebar-logout" data-action="logout">${I('logout',18)} <span>Hisobdan chiqish</span></button>
 </aside>
 <div class="workspace"><header class="topbar"><div class="breadcrumb">O‘rganish maydoni <span> / </span><b>${state.page==='dashboard'?'Bosh sahifa':state.page==='library'?'Mening lug‘atim':'Mashqlar'}</b></div>
 <div class="topbar-right"><div class="streak-mini">${I('flame',19)} <strong>${state.stats?.streak||0}</strong> kun</div><div class="avatar">${esc(username.charAt(0).toUpperCase())}</div><span class="top-name">${esc(username)}</span></div></header>
 <main class="main-content">${state.page==='dashboard'?dashboardPage():state.page==='library'?libraryPage():practicePage()}</main>
 <nav class="mobile-nav"><button class="${state.page==='dashboard'?'active':''}" data-action="nav" data-page="dashboard">${I('home')}<span>Bosh sahifa</span></button><button class="${state.page==='practice'?'active':''}" data-action="start" data-mode="cards">${I('layers')}<span>Mashqlar</span></button><button class="${state.page==='library'?'active':''}" data-action="nav" data-page="library">${I('library')}<span>Lug‘atim</span></button><button data-action="logout">${I('logout')}<span>Chiqish</span></button></nav>
 </div></div>`;}
function dashboardPage(){const s=state.stats||{};
 const week=s.activity||[];const max=Math.max(15,...week.map(x=>x.count));const goalPct=p(s.practiced_today||0,s.daily_goal||15);
 return `<div class="welcome-heading"><div><div class="overline">BILIMINGIZNI HAR KUNI OSHIRING ✨</div><h1>Salom, ${esc(state.user?.username||'do‘st')}! <span class="wave">👋</span></h1><p>Bugun ham yangi so‘zlar bilan bir qadam oldinga!</p></div><div class="today-label">${I('calendar',18)} ${esc(displayToday())}</div></div>
 <section class="hero"><div class="hero-copy"><div class="hero-kicker"><span class="sparkle-spot">✦</span> BUGUNGI MOTIVATSIYA</div><h2>Har bir so‘z —<br><em>yangi imkoniyat.</em></h2><p>Kichik mashqlarni muntazam bajaring, katta o‘zgarishni sezing.</p><button class="btn btn-white" data-action="start" data-mode="cards">Mashqni boshlash ${I('arrow',19)}</button></div>
 <div class="hero-art" aria-hidden="true"><div class="orbit orbit1"></div><div class="orbit orbit2"></div><div class="hero-dot dot-one">✦</div><div class="hero-dot dot-two">✧</div><div class="hero-card"><div class="hero-card-top">NEW WORD <span>✨</span></div><div class="hero-card-word">brave</div><div class="hero-card-phonetic">/breɪv/</div><div class="hero-card-line"></div><div class="hero-card-translation">jasur, dovyurak</div><div class="hero-card-bottom">ENGLISH → UZBEK</div></div></div></section>
 <section class="stats-grid"><div class="stat-card"><span class="stat-icon violet">${I('library',24)}</span><span class="stat-number">${s.total||0}</span><span class="stat-label">Jami so‘zlar</span><span class="stat-sub">O‘rganish uchun</span></div>
 <div class="stat-card"><span class="stat-icon mint">${I('check',24)}</span><span class="stat-number">${s.learned||0}</span><span class="stat-label">Mustahkamlanayotgan</span><span class="stat-sub">Kamida 2 marta eslangan</span></div>
 <div class="stat-card"><span class="stat-icon peach">${I('rotate',24)}</span><span class="stat-number">${s.due||0}</span><span class="stat-label">Takrorlash kerak</span><span class="stat-sub">Bugungi navbatda</span></div>
 <div class="stat-card"><span class="stat-icon blue">${I('flame',24)}</span><span class="stat-number">${s.streak||0} <small>kun</small></span><span class="stat-label">Ketma-ket o‘qish</span><span class="stat-sub">Odat hosil qiling</span></div></section>
 <div class="section-heading with-top"><div><h2>Bugun nimani mashq qilamiz?</h2><p>O‘zingizga qulay usulni tanlang</p></div><label class="session-length-control" for="session-length">Mashg‘ulot hajmi <select id="session-length" aria-label="Bitta mashg‘ulotdagi so‘zlar soni"><option value="5" ${state.sessionLimit===5?'selected':''}>5 ta so‘z</option><option value="10" ${state.sessionLimit===10?'selected':''}>10 ta so‘z</option><option value="15" ${state.sessionLimit===15?'selected':''}>15 ta so‘z</option><option value="20" ${state.sessionLimit===20?'selected':''}>20 ta so‘z</option></select></label></div>
 <div class="category-scroller"><button class="category-chip ${state.category==='all'?'selected':''}" data-action="category" data-category="all">✨ Barcha mavzular</button>${state.categories.map(c=>`<button class="category-chip ${state.category===c.slug?'selected':''}" data-action="category" data-category="${esc(c.slug)}">${c.emoji} ${esc(c.name)}</button>`).join('')}</div>
 <section class="mode-grid">${modes.map((m,i)=>`<button class="mode-card ${m.color}" data-action="start" data-mode="${m.id}"><div class="mode-top"><div class="mode-icon">${I(m.icon,28)}</div><span class="mode-arrow">${I('arrow',22)}</span></div><div class="mode-label">${m.badge}</div><h3>${m.name}</h3><p>${m.subtitle}</p><div class="mode-count">${String(i+1).padStart(2,'0')} / ${String(modes.length).padStart(2,'0')}</div></button>`).join('')}</section>
 <section class="bottom-grid"><div class="panel activity-panel"><div class="panel-title"><div><h3>Haftalik faollik</h3><p>Har kuni oz-ozdan mashq qiling</p></div><span class="graph-symbol">${I('trend',22)}</span></div>
 <div class="bar-chart">${week.map(d=>`<div class="bar-col" title="${esc(d.date)}: ${d.count} mashq"><span class="bar-num">${d.count||''}</span><div class="bar-track"><div class="bar-fill ${d.date===localISODate()?'current':''}" style="height:${Math.max(d.count?7:3,p(d.count,max))}%"></div></div><span class="bar-day">${esc(formatDay(d.date))}</span></div>`).join('')}</div></div>
 <div class="panel goal-panel"><div class="panel-title"><div><h3>Kunlik maqsad</h3><p>Bugun ${s.daily_goal||15} ta mashq bajarish</p></div><span class="graph-symbol">${I('target',22)}</span></div><div class="goal-body"><div class="goal-ring" style="--pct:${goalPct}"><div><strong>${goalPct}%</strong><small>Bajarildi</small></div></div><div class="goal-details"><div class="goal-count"><strong>${s.practiced_today||0}</strong> / ${s.daily_goal||15}</div><p>${(s.practiced_today||0)>=(s.daily_goal||15)?'Ajoyib! Bugungi maqsadga erishdingiz.':'Har bir urinish sizni maqsadga yaqinlashtiradi.'}</p><button class="text-link" data-action="start" data-mode="choice">Davom etish ${I('arrow',16)}</button></div></div></div></section>`;
}
function libraryPage(){let displayed=state.words.filter(w=>(state.libraryCategory==='all'||(state.libraryCategory==='mine'?w.owner_id!==null:w.category===state.libraryCategory))&&(!state.search||(w.en+' '+w.uz).toLowerCase().includes(state.search.toLowerCase())));
 return `<div class="page-title-row"><div><div class="overline">SHAXSIY LUG‘AT</div><h1>Mening lug‘atim <span>📖</span></h1><p>So‘zlarni ko‘ring, qidiring va o‘zingiznikini qo‘shing.</p></div><button class="btn btn-primary" data-action="show-add">${I('plus',19)} So‘z qo‘shish</button></div>
 ${state.showAdd?`<div class="panel add-word-panel"><div class="panel-title"><div><h3>Yangi so‘z qo‘shish</h3><p>Kamida inglizcha so‘z va uning tarjimasini kiriting.</p></div><button class="icon-btn" data-action="hide-add">${I('close')}</button></div>
 <form id="add-word-form" class="add-form"><div><label for="en">Inglizcha so‘z *</label><input name="en" id="en" placeholder="Masalan: beautiful" maxlength="80" required></div><div><label for="uz">O‘zbekcha tarjima *</label><input name="uz" id="uz" placeholder="Masalan: chiroyli" maxlength="120" required></div><div><label for="example_en">Inglizcha misol</label><input name="example_en" id="example_en" placeholder="The view is beautiful." maxlength="240"></div><div><label for="example_uz">Misol tarjimasi</label><input name="example_uz" id="example_uz" placeholder="Manzara chiroyli." maxlength="240"></div><div class="add-actions"><button class="btn btn-primary" type="submit" ${state.busy?'disabled':''}>${I('plus',17)} Lug‘atga qo‘shish</button></div></form></div>`:''}
 <div class="library-toolbar"><form id="search-form" class="search-box">${I('search',19)}<input name="search" aria-label="So‘z qidirish" placeholder="Inglizcha yoki o‘zbekcha qidiring..." value="${esc(state.search)}"><button type="submit">Qidirish</button></form><select id="library-select" aria-label="Mavzuni tanlash"><option value="all" ${state.libraryCategory==='all'?'selected':''}>Barcha mavzular</option>${state.categories.map(c=>`<option value="${esc(c.slug)}" ${state.libraryCategory===c.slug?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
 <div class="word-list-meta"><span><b>${displayed.length}</b> ta so‘z topildi</span><span>So‘z ustiga bosib talaffuzini eshiting ${I('sound',17)}</span></div>
 <div class="word-table-wrap"><table class="word-table"><thead><tr><th>INGLIZCHA</th><th>O‘ZBEKCHA</th><th>MAVZU</th><th>HOLATI</th><th></th></tr></thead><tbody>
 ${displayed.length?displayed.map(w=>{const st=status(w);return `<tr><td><button class="word-pronounce" data-action="speak-word" data-word-id="${w.id}" title="Talaffuzni eshitish"><span class="sound-small">${I('sound',16)}</span><strong>${esc(w.en)}</strong></button><div class="example-mini">${esc(w.example_en)}</div></td><td>${esc(w.uz)}</td><td><span class="topic-pill">${esc(catName(w.category))}</span></td><td><span class="status-pill ${st.cls}">${st.txt}</span></td><td>${w.owner_id!=null?`<button class="delete-word" title="O‘chirish" data-action="delete-word" data-word-id="${w.id}">${I('trash',18)}</button>`:''}</td></tr>`}).join(''):`<tr><td colspan="5" class="empty-table">Bu yerda hozircha so‘z yo‘q. Boshqa mavzuni tanlang yoki yangi so‘z qo‘shing.</td></tr>`}
 </tbody></table></div><div class="library-bottom"><button class="btn btn-secondary" data-action="start-library">${I('layers',18)} Shu mavzuda mashq qilish ${I('arrow',16)}</button></div>`;
}
function makeOptions(word){
 const other=shuffle(state.words.filter(w=>w.id!==word.id&&normalize(w.uz)!==normalize(word.uz)))
  .filter((w,i,a)=>a.findIndex(v=>normalize(v.uz)===normalize(w.uz))===i)
  .slice(0,3).map(w=>w.uz);
 return shuffle([word.uz,...other]);
}
function initializeQuestion(){cancelAutoNext();state.revealed=false;state.answered=false;state.answerCorrect=false;state.quality=null;state.chosenIndex=-1;state.answerValue='';state.options=makeOptions(state.session[state.index]);}
async function startPractice(mode){
 if(state.busy)return;cancelAutoNext();
 state.busy=true;render();
 try{
  const result=await api(`/session?category=${encodeURIComponent(state.category)}&limit=${state.sessionLimit}`);
  state.session=result.words;state.studyMode=mode;state.index=0;state.sessionCorrect=0;state.sessionWrong=0;state.sessionFinished=!result.words.length;state.page='practice';
  if(result.words.length)initializeQuestion();
  window.scrollTo({top:0,behavior:'instant'});
 }catch(e){toast(e.message);}finally{state.busy=false;render();focusAnswer();}
}
function practicePage(){if(state.sessionFinished||!state.session.length)return finishPage();
 const w=state.session[state.index],mode=questionMode(),m=modes.find(a=>a.id===mode),n=state.session.length;
 let content='';
 if(mode==='cards')content=`<div class="practice-instruction">So‘zning ma’nosini eslashga harakat qiling</div>
 <button class="flashcard ${state.revealed?'flipped':''}" data-action="flip" aria-label="Kartochkani aylantirish"><div class="flashcard-top"><span>ENGLISH</span><span>${I('sparkle',19)}</span></div><div class="flashcard-word">${esc(w.en)}</div>
 ${state.revealed?`<div class="flashcard-translate">${esc(w.uz)}</div><div class="flashcard-example">${esc(w.example_en)}<br><small>${esc(w.example_uz)}</small></div>`:`<div class="flashcard-help">${I('eye',18)} Javobni ko‘rish uchun kartani bosing</div>`}
 <div class="flashcard-footer">${state.revealed?'O‘zingizni baholang':'BILASIZMI?'}</div></button>
 ${state.revealed?`<div class="help-note">Javobni eslab ko‘rdingizmi? Quyida o‘zingizni baholang.</div>`:`<div class="help-note">Ma’noni aytib ko‘ring, keyin javobni oching.</div>`}`;
 if(mode==='choice')content=`<div class="practice-instruction">Ushbu so‘zning to‘g‘ri tarjimasini tanlang</div><div class="question-word">${esc(w.en)} <button class="listen-inline" data-action="speak" title="Talaffuzini eshitish">${I('sound',23)}</button></div><div class="question-subtitle">Qaysi javob to‘g‘ri?</div>
 <div class="choice-list">${state.options.map((option,i)=>{const picked=state.chosenIndex===i,correct=normalize(option)===normalize(w.uz);return `<button class="choice-option ${state.answered?(correct?'correct':picked?'incorrect':'') : ''}" data-action="choose" data-index="${i}" ${state.answered?'disabled':''} aria-label="${i+1}-variant: ${esc(option)}"><span class="option-letter">${i+1}</span><span>${esc(option)}</span>${state.answered&&correct?I('check',20):state.answered&&picked?I('close',20):''}</button>`}).join('')}</div>${answerFeedback(w)}`;
 if(mode==='write')content=`<div class="practice-instruction">O‘zbekcha ma’nosini o‘qing va inglizchasini yozing</div><div class="prompt-bubble">O‘ZBEKCHA TARJIMA</div><div class="question-word translation">${esc(w.uz)}</div><div class="question-subtitle">Bu so‘z ingliz tilida qanday yoziladi?</div>${typeAnswerForm(w)}`;
 if(mode==='listen')content=`<div class="practice-instruction">Talaffuzini tinglang va eshitgan so‘zingizni yozing</div><div class="listen-block"><button class="listen-main" data-action="speak" aria-label="So‘zni eshitish">${I('sound',36)}</button><div>So‘zni tinglash uchun bosing</div><small>Kerak bo‘lsa, qayta eshiting</small></div>${typeAnswerForm(w)}`;
 return `<div class="practice-shell"><div class="practice-header"><button class="btn-back" data-action="nav" data-page="dashboard">${I('back',19)} Bosh sahifaga qaytish</button><span class="practice-mode-label">${I(m.icon,18)} ${m.name}</span></div>
 <div class="practice-progress-head"><div><div class="overline">KICHIK QADAMLAR, KATTA NATIJALAR</div><h1>${state.studyMode==='mix'?'Aralash mashq · ':''}${m.name}</h1><p>${esc(catName(state.category))} · ${n} ta so‘z</p></div><div class="progress-count"><b>${state.index+1}</b> / ${n}<small>SO‘Z</small></div></div>
 <div class="progress-track" role="progressbar" aria-label="Mashg‘ulot davomiyligi" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${state.index}"><div style="width:${p(state.index,n)}%"></div></div>
 <div class="quiz-card" aria-live="polite">${content}</div>
 <div class="practice-actionbar"><div class="practice-action-summary"><strong>${state.answered?(state.answerCorrect?'✓ To‘g‘ri javob':'✦ Xatolar orqali o‘rganamiz'):mode==='cards'?'Avval o‘zingiz eslab ko‘ring':'Tayyor bo‘lgach javob bering'}</strong><span>${state.sessionCorrect+(state.answered&&state.answerCorrect?1:0)} ta to‘g‘ri · ${state.sessionWrong+(state.answered&&!state.answerCorrect?1:0)} ta qayta ko‘rish · <kbd>Enter</kbd> davom</span></div>
 <div class="practice-actions">${mode==='cards' ? (state.revealed?`<div class="rate-buttons"><button class="btn-rate forgot" data-action="rate" data-quality="1">${I('close',17)} Esimda yo‘q</button><button class="btn-rate hard" data-action="rate" data-quality="3">${I('rotate',17)} Qiyin</button><button class="btn-rate knew" data-action="rate" data-quality="5">${I('check',17)} Bilaman!</button></div>`:`<button class="btn btn-primary" data-action="flip">Javobni ko‘rsatish ${I('eye',18)}</button>`):state.answered?`<button class="btn btn-primary next-button" data-action="next" ${state.saving?'disabled':''}>${state.index===n-1?'Natijani ko‘rish':'Keyingi so‘z'} ${I('arrow',19)}</button>`:`<button class="btn btn-secondary btn-skip" data-action="skip">Bilmayman, o‘tkazish ${I('arrow',17)}</button>`}</div>
 </div><div class="practice-footer"><label class="auto-next-control"><input type="checkbox" id="auto-next-toggle" ${state.autoNext?'checked':''}><span>To‘g‘ri javobdan keyin avtomatik davom etish</span></label><span>${I('sparkle',17)} Qiyin so‘zlar keyin qayta takrorlanadi.</span></div></div>`;
}
function typeAnswerForm(w){return `<form id="typing-form" class="typing-form"><label for="answer-input">Sizning javobingiz</label><div class="answer-input-group"><input id="answer-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Inglizcha so‘zni yozing..." ${state.answered?'disabled':''} value="${esc(state.answerValue)}"><button class="btn btn-primary" type="submit" ${state.answered?'disabled':''}>Tekshirish ${I('arrow',18)}</button></div></form>${answerFeedback(w)}`;}
function answerFeedback(w){if(!state.answered)return '';
 return `<div class="answer-feedback ${state.answerCorrect?'yes':'no'}"><span class="feedback-symbol">${I(state.answerCorrect?'check':'close',22)}</span><div><strong>${state.answerCorrect?'Ajoyib! To‘g‘ri javob!':'Hozircha noto‘g‘ri, davom etamiz!'}</strong><p>To‘g‘ri javob: <b>${esc(questionMode()==='choice'?w.uz:w.en)}</b>. ${esc(w.example_en)} ${esc(w.example_uz)}</p></div></div>`;
}
function finishPage(){if(!state.sessionFinished)return `<div class="empty-practice panel"><div class="empty-emoji">📚</div><h2>Mashqlarni boshlashga tayyormisiz?</h2><p>So‘zlar bilan ishlash uchun mashq turini tanlang.</p><button class="btn btn-primary" data-action="start" data-mode="cards">Boshlash ${I('arrow')}</button></div>`;
 if(!state.session.length)return `<div class="empty-practice panel"><div class="empty-emoji">🎉</div><h1>Hozircha hammasi bajarildi!</h1><p>Tanlangan mavzuda bugun takrorlash kerak bo‘lgan yoki hali o‘rganilmagan so‘z qolmadi. Ertaga qayta keling yoki boshqa mavzuni tanlang.</p><div class="finish-actions"><button class="btn btn-primary" data-action="set-all-and-start">Barcha mavzularda mashq ${I('arrow',18)}</button><button class="btn btn-secondary" data-action="nav" data-page="library">Lug‘atimni ko‘rish</button></div></div>`;
 return `<div class="finish-wrap"><div class="finish-icon">🏆</div><div class="overline">MASHG‘ULOT YAKUNLANDI!</div><h1>Barakalla, zo‘r ishladingiz!</h1><p>Har bir mashq so‘zlarni yaxshiroq eslab qolishingizga yordam beradi.</p><div class="finish-stat-row"><div><strong>${state.session.length}</strong><small>Mashq qilingan</small></div><div><strong>${state.sessionCorrect}</strong><small>To‘g‘ri / eslangan</small></div><div><strong>${state.sessionWrong}</strong><small>Takrorlash kerak</small></div></div><div class="finish-actions"><button class="btn btn-primary" data-action="start" data-mode="${state.studyMode}">Yana mashq qilish ${I('arrow',18)}</button><button class="btn btn-secondary" data-action="nav" data-page="dashboard">Bosh sahifaga qaytish</button></div></div>`;
}
function render(){
 if(state.busy&&!state.user){root.innerHTML=authPage();return;}
 root.innerHTML=state.user?pageShell():authPage();
 focusAnswer();
}
function say(word){if(!('speechSynthesis'in window)){toast('Bu brauzer ovozli o‘qishni qo‘llab-quvvatlamaydi.');return;}
 try {speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(word);u.lang='en-US';u.rate=.83;u.pitch=1;const voices=speechSynthesis.getVoices();const voice=voices.find(v=>v.lang.toLowerCase().startsWith('en'));if(voice)u.voice=voice;speechSynthesis.speak(u);}catch{toast('Ovozli o‘qish hozir ishlamadi.');}}
async function saveAndAdvance(quality){
 if(state.saving||state.page!=='practice'||!state.session[state.index])return;
 cancelAutoNext();state.saving=true;
 const w=state.session[state.index];
 try{
  await api('/reviews',{method:'POST',body:JSON.stringify({word_id:w.id,mode:questionMode(),quality})});
  if(quality>=3)state.sessionCorrect++;else state.sessionWrong++;
  state.index++;
  if(state.index>=state.session.length){state.sessionFinished=true;await loadCore();}
  else initializeQuestion();
  render();
 }catch(e){toast(e.message);}finally{state.saving=false;}
}
function checkTyped(){if(state.answered)return;const input=document.getElementById('answer-input');if(!input)return;
 const value=input.value.trim();if(!value){toast('Avval javobingizni yozing.');return;}
 state.answerValue=value;const w=state.session[state.index];state.answerCorrect=normalize(value)===normalize(w.en);state.quality=state.answerCorrect?4:1;state.answered=true;render();scheduleAutoNext();}
async function addWord(form){if(state.busy)return;
 const body=Object.fromEntries(new FormData(form).entries());state.busy=true;
 try{await api('/words',{method:'POST',body:JSON.stringify(body)});await loadCore();state.showAdd=false;state.libraryCategory='mine';state.search='';toast('Yangi so‘z lug‘atingizga qo‘shildi!','success');render();}
 catch(e){toast(e.message);}finally{state.busy=false;}
}
document.addEventListener('submit',e=>{
 if(e.target.id==='auth-form'){e.preventDefault();authSubmit(e.target);}
 if(e.target.id==='add-word-form'){e.preventDefault();addWord(e.target);}
 if(e.target.id==='search-form'){e.preventDefault();state.search=e.target.elements.search.value.trim();render();}
 if(e.target.id==='typing-form'){e.preventDefault();checkTyped();}
});
document.addEventListener('change',e=>{
 if(e.target.id==='library-select'){state.libraryCategory=e.target.value;render();}
 else if(e.target.id==='session-length'){
   state.sessionLimit=Number(e.target.value);
   localStorage.setItem('wordora-session-limit',String(state.sessionLimit));
 }
 else if(e.target.id==='auto-next-toggle'){
   state.autoNext=e.target.checked;
   localStorage.setItem('wordora-auto-next',String(state.autoNext));
   if(state.autoNext)scheduleAutoNext();else cancelAutoNext();
 }
});
document.addEventListener('keydown',e=>{
 if(state.page!=='practice'||state.sessionFinished||e.altKey||e.ctrlKey||e.metaKey||e.repeat)return;
 const el=e.target;
 if(el.closest('input,textarea,select,[contenteditable="true"]')){
   if(e.key==='Enter' && state.answered && el.id!=='answer-input')e.preventDefault();
   return;
 }
 if(el.closest('button,a'))return;
 const mode=questionMode();
 if(mode==='choice'&&!state.answered&&/^[1-4]$/.test(e.key)){
   e.preventDefault();selectChoice(Number(e.key)-1);return;
 }
 if(mode==='cards'){
   if((e.key===' '||e.key==='Enter')&&!state.revealed){e.preventDefault();state.revealed=true;render();return;}
   if(state.revealed&&['1','2','3'].includes(e.key)){
     e.preventDefault();saveAndAdvance([1,3,5][Number(e.key)-1]);return;
   }
 }
 if(e.key==='Enter' && state.answered){e.preventDefault();saveAndAdvance(state.quality);return;}
 if((e.key===' '||e.key.toLowerCase()==='p')&&mode==='listen'&&!state.answered){e.preventDefault();say(state.session[state.index].en);}
});
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-action]');if(!b)return;
 const action=b.dataset.action;
 if(action==='switch-auth'){state.authMode=state.authMode==='register'?'login':state.authMode==='login'?'register':'login';render();}
 else if(action==='forgot-password'){state.authMode='reset';render();}
 else if(action==='nav')nav(b.dataset.page);
 else if(action==='category'){state.category=b.dataset.category;render();}
 else if(action==='start')await startPractice(b.dataset.mode);
 else if(action==='start-library'){state.category=state.libraryCategory;await startPractice('cards');}
 else if(action==='set-all-and-start'){state.category='all';await startPractice('cards');}
 else if(action==='flip'){state.revealed=!state.revealed;render();}
 else if(action==='rate')await saveAndAdvance(Number(b.dataset.quality));
 else if(action==='choose')selectChoice(Number(b.dataset.index));
 else if(action==='skip')await saveAndAdvance(1);
 else if(action==='next')await saveAndAdvance(state.quality);
 else if(action==='speak')say(state.session[state.index].en);
 else if(action==='speak-word'){let w=state.words.find(w=>w.id===Number(b.dataset.wordId));if(w)say(w.en);}
 else if(action==='show-add'){state.showAdd=true;render();document.getElementById('en')?.focus();}
 else if(action==='hide-add'){state.showAdd=false;render();}
 else if(action==='delete-word'){
   let w=state.words.find(x=>x.id===Number(b.dataset.wordId));
   if(!w||!confirm(`“${w.en}” so‘zini o‘chirasizmi?`))return;
   try{await api(`/words/${w.id}`,{method:'DELETE'});await loadCore();render();toast('So‘z o‘chirildi.','success');}catch(err){toast(err.message);}
 }
 else if(action==='logout'){
   cancelAutoNext();const {error}=await client.auth.signOut();if(error){toast(error.message);return;}
   state.user=null;state.page='dashboard';state.authMode='login';render();
 }
});
(async function boot(){
 if(configError){root.innerHTML=`<main class="setup-needed"><h1>Wordora sozlanmagan</h1><p>${esc(configError)}</p><p>Qo‘llanma: <b>DEPLOY_UZ.md</b></p></main>`;return;}
 // Recovery events must display the password update form, not the dashboard.
 client.auth.onAuthStateChange((event)=>{
   if(event==='PASSWORD_RECOVERY'){state.authMode='change-password';state.user=null;render();}
   if(event==='SIGNED_OUT'){state.user=null;state.authMode='login';render();}
 });
 try{
  const {data,error}=await client.auth.getUser();
  if(error && error.status!==400)console.warn('Auth:',error.message);
  if(data?.user && state.authMode!=='change-password'){
    state.user=profile(data.user);await loadCore();
  }
 }catch(e){console.warn('Wordora:',e);state.user=null;toast(e.message);}
 render();
})();