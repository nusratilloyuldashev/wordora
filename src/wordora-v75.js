/* Wordora 7.5 — 7-day review forecast + per-Unit mastery.
 * Reads already-loaded word_learning, words, collection memberships.
 * No additional Supabase requests or schema migration.
 */
'use strict';
function v75Days(today,offset){
 const d=new Date(today+'T12:00:00');
 d.setDate(d.getDate()+offset);
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function v75Forecast(words,memory,today){
 const buckets=Array(7).fill(0);
 let overdue=0,unscheduled=0,tracked=0;
 const dates=Array.from({length:7},(_,i)=>v75Days(today,i));
 const dateMap=new Map(dates.map((date,index)=>[date,index]));
 for(const w of words||[]){
  const m=memory?.[String(w.id)];
  if(!m)continue;
  tracked++;
  const due=String(m.next_review_on||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(due)){unscheduled++;continue;}
  if(due<today){overdue++;buckets[0]++;continue;}
  const n=dateMap.get(due);
  if(n!==undefined)buckets[n]++;
 }
 return {today,dates,buckets,overdue,unscheduled,tracked,
  weekTotal:buckets.reduce((a,b)=>a+b,0)};
}
function v75Units(words,memory,collections,itemIndex,items,today){
 const wordMap=new Map((words||[]).map(w=>[String(w.id),w]));
 return (collections||[]).map(collection=>{
  const id=String(collection.id);
  const ids=itemIndex?.byCollection?.get(id)||
   new Set((items||[]).filter(x=>String(x.collection_id)===id).map(x=>String(x.word_id)));
  let total=0,learning=0,mastered=0,due=0;
  for(const wordId of ids){
   const w=wordMap.get(String(wordId));
   if(!w)continue;
   total++;
   const m=memory?.[String(w.id)];
   if(!m)continue;
   if(m.stage==='mastered')mastered++;else learning++;
   if(m.next_review_on&&m.next_review_on<=today)due++;
  }
  return {id,name:String(collection.name||'To‘plam'),total,learning,mastered,due,
    percent:total?Math.round(mastered/total*100):0};
 });
}
const v75PreviousDash=dashboardPage;
dashboardPage=function(){
 const html=v75PreviousDash();
 if(!V4.ready||!state.user)return html;
 const today=localISODate();
 const forecast=v75Forecast(state.words,V4.memory,today);
 const units=V5.ready?v75Units(state.words,V4.memory,V5.collections,V5.itemIndex,V5.items,today):[];
 const names=['Bugun','Ertaga','2-kun','3-kun','4-kun','5-kun','6-kun'];
 const maxCount=Math.max(1,...forecast.buckets);
 const calendar=forecast.buckets.map((count,i)=>`<div class="v75-day ${i===0?'today':''}" aria-label="${names[i]}: ${count} ta so‘z">
   <strong>${names[i]}</strong><div class="v75-day-track"><i style="height:${count?Math.max(9,Math.round(count/maxCount*100)):0}%"></i></div>
   <span>${count}</span></div>`).join('');
 const unitCards=units.slice(0,6).map(unit=>`<button class="v75-unit-card" type="button" data-v75="open-unit" data-id="${esc(unit.id)}" title="${esc(unit.name)}">
  <span class="v75-unit-name">${esc(unit.name)}</span>
  <span class="v75-unit-metric"><b>${unit.percent}%</b> yodlangan</span>
  <span class="v75-progress-track"><i style="width:${unit.percent}%"></i></span>
  <span class="v75-unit-foot">${unit.mastered} yodlangan · ${unit.learning} yodlanmoqda · ${Math.max(0,unit.total-unit.mastered-unit.learning)} yangi</span>
  <span class="v75-unit-open">So‘zlarni ko‘rish →</span></button>`).join('');
 const extra=units.length>6?`<button type="button" class="v75-all-units" data-v75="all-units">Barcha ${units.length} ta to‘plamni ko‘rish →</button>`:'';
 const box=`<section class="v75-dashboard" aria-label="Shaxsiy takrorlash rejasi">
  <div class="v75-heading"><div><span class="v75-eyebrow">SHAXSIY REJA</span><h2>Keyingi 7 kun 🗓️</h2><p>Avval yodlangan so‘zlarning takrorlash sanalari asosida.</p></div>
  <span class="v75-total"><b>${forecast.weekTotal}</b><small>ta rejalashtirilgan takrorlash</small></span></div>
  <div class="v75-calendar" role="group" aria-label="7 kunlik takrorlash jadvali">${calendar}</div>
  <div class="v75-plan-foot"><span>${forecast.overdue?`⏳ ${forecast.overdue} ta kechikkan so‘z bugungi ustunda hisoblangan.`:'✅ Kechikkan takrorlash yo‘q.'}</span>
  ${forecast.buckets[0]?`<button type="button" data-v75="review-due">Bugungi ${forecast.buckets[0]} ta so‘zni takrorlash →</button>`:`<button type="button" data-v75="go-learn">Yangi so‘z yodlash →</button>`}</div>
 </section>
 ${V5.ready&&units.length?`<section class="v75-units" aria-label="Unit bo‘yicha o‘rganish holati">
 <div class="v75-heading"><div><span class="v75-eyebrow">UNITLAR BO‘YICHA NATIJA</span><h2>O‘rganish xaritasi 📚</h2><p>Foiz faqat testdan o‘tib “Yodlangan” bo‘lgan so‘zlar asosida.</p></div></div>
 <div class="v75-unit-grid">${unitCards}</div>${extra}</section>`:''}`;
 return html.replace('<div class="v4-stat-strip">',box+'<div class="v4-stat-strip">');
};
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-v75]');if(!button)return;
 event.preventDefault();event.stopImmediatePropagation();
 const action=button.dataset.v75;
 if(action==='review-due'){
  V4.practiceDate='all';V4.reviewOnly=true;
  startPractice('mix');
 }else if(action==='go-learn'){
  v4Navigate('learn');
 }else if(action==='all-units'){
  V5.libraryCollection='all';
  v4Navigate('library');
 }else if(action==='open-unit'){
  const entry=V5.collections.find(x=>String(x.id)===String(button.dataset.id));
  if(!entry)return;
  V5.libraryCollection=String(entry.id);
  state.libraryPage=0;state.search='';state.libraryStage='all';
  state.libraryTopic='all';state.libraryType='all';state.librarySource='all';
  v4Navigate('library');
 }
},true);
window.WordoraV75={v75Days,v75Forecast,v75Units};
