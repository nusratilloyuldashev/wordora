/* Wordora 7.8 — Unit workspace. Client-only, no additional Supabase calls. */
'use strict';
(function(){
 let showAll=false;
 const pageSize=8;
 const unitId=x=>String(x?.id??'');
 function summary(words,memory,collections,index){
  const wordMap=new Map((words||[]).filter(w=>w?.id!=null).map(w=>[String(w.id),w]));
  return (collections||[]).map(c=>{
   const id=unitId(c),ids=index?.byCollection?.get(id)||new Set();
   let total=0,fresh=0,learning=0,mastered=0,due=0;
   const today=localISODate();
   for(const wordId of ids){
    const word=wordMap.get(String(wordId));
    if(!word)continue;
    total++;
    const m=memory?.[String(wordId)];
    if(!m){fresh++;continue;}
    if(m.stage==='mastered')mastered++;else learning++;
    if(m.next_review_on&&String(m.next_review_on)<=today)due++;
   }
   return {id,name:String(c.name||'Unit'),total,fresh,learning,mastered,due,
    progress:total?Math.round(mastered/total*100):0};
  });
 }
 function button(action,id,text,disabled=false){
  return '<button type="button" data-v78="'+action+'" data-unit="'+esc(id)+'"'+
   (disabled?' disabled':'')+'>'+text+'</button>';
 }
 function card(u,selected){
  return '<article class="v78-unit '+(selected?'selected':'')+'">'+
   '<div class="v78-unit-name"><h3>'+esc(u.name)+'</h3><span>'+u.progress+'% yodlangan</span></div>'+
   '<div class="v78-meter" role="progressbar" aria-label="'+esc(u.name)+
   ' yodlangan foizi" aria-valuenow="'+u.progress+
   '" aria-valuemin="0" aria-valuemax="100"><i style="width:'+u.progress+'%"></i></div>'+
   '<div class="v78-counts"><span>🌱 '+u.fresh+' yangi</span><span>📖 '+u.learning+
   ' yodlanmoqda</span><span>✅ '+u.mastered+' yodlangan</span>'+
   '<span>🔁 '+u.due+' takrorlash</span></div>'+
   '<div class="v78-unit-actions">'+button('open',u.id,'So‘zlarni ko‘rish')+
   button('learn',u.id,'Yodlash',u.fresh===0)+
   button('practice',u.id,'Mashq',u.learning+u.mastered===0)+
   button('exam',u.id,'Test',u.learning+u.mastered===0)+'</div></article>';
 }
 const previousLibrary=libraryPage;
 libraryPage=function(...args){
  const html=previousLibrary.apply(this,args);
  if(!state.user||!V4.ready||!V5.ready||!V5.collections.length)return html;
  const units=summary(state.words,V4.memory,V5.collections,V5.itemIndex);
  const selected=V5.libraryCollection!=='all'?
   units.find(x=>x.id===String(V5.libraryCollection)):null;
  const shown=selected?[selected]:showAll?units:units.slice(0,pageSize);
  const panel='<section class="v78-workspace" aria-label="Unit o‘quv paneli">'+
   '<div class="v78-title"><div><span class="v75-eyebrow">KITOB VA UNITLAR</span>'+
   '<h2>Unit bo‘yicha o‘qish 📚</h2>'+
   '<p>Yangi so‘zlarni yodlang, keyin mashq va testdan o‘ting. Natijalar saqlanadi.</p></div>'+
   (selected?button('all','all','Barcha Unitlar'):'' )+'</div>'+
   '<div class="v78-grid">'+shown.map(u=>card(u,!!selected)).join('')+'</div>'+
   (!selected&&units.length>pageSize?'<div class="v78-more">'+button('toggle','all',
    showAll?'Kamroq ko‘rsatish':'Barcha '+units.length+' ta Unitni ko‘rsatish')+'</div>':'')+
   '<p class="v78-note">Mashq faqat avval o‘rganilgan so‘zlar bilan ishlaydi. Testdagi 90% mezon o‘zgarmaydi.</p>'+
   '</section>';
  const anchor='<div class="v3-stage-tabs">';
  return html.includes(anchor)?html.replace(anchor,panel+anchor):html;
 };
 document.addEventListener('click',event=>{
  const b=event.target?.closest?.('[data-v78]');
  if(!b||!state.user||!V5.ready)return;
  const action=b.dataset.v78, id=String(b.dataset.unit||'');
  if(!['open','learn','practice','exam','all','toggle'].includes(action))return;
  event.preventDefault();
  event.stopImmediatePropagation?.();
  if(action==='toggle'){showAll=!showAll;render();return;}
  if(action==='all'){
   V5.libraryCollection='all';showAll=false;state.libraryPage=0;
   render();return;
  }
  const unit=V5.collections.find(x=>String(x.id)===id);
  if(!unit)return;
  if(action==='open'){
   V5.libraryCollection=id;state.libraryPage=0;state.search='';
   state.libraryStage='all';state.libraryTopic='all';
   state.libraryType='all';state.librarySource='all';
   render();return;
  }
  // Reuse existing filters; never bypass lesson prerequisites or 90% test rules.
  const selected=summary(state.words,V4.memory,[unit],V5.itemIndex)[0];
  if(!selected)return;
  if(action==='learn'&&selected.fresh===0)return;
  if((action==='practice'||action==='exam')&&selected.learning+selected.mastered===0)return;
  if(action==='learn'){
   V5.learnCollection=id;V4.topic='all';V4.wordType='all';
   v4Navigate('learn');
  }else if(action==='practice'){
   V5.practiceCollection=id;V4.practiceDate='all';V4.reviewOnly=false;
   v4Navigate('exercises');
  }else if(action==='exam'){
   V5.examCollection=id;V4.examDate='all';
   v4Navigate('exam');
  }
 },true);
 window.WordoraV78={summary};
})();
