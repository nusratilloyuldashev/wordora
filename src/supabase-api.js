/* Wordora browser adapter: Supabase Auth + PostgREST + protected PostgreSQL RPCs.
 * The publishable/anon key is public. Never use a secret/service-role key here.
 */
'use strict';
(function () {
  const categories = [
    {slug:'daily',name:'Kundalik hayot',emoji:'☀️'},
    {slug:'clothes',name:'Kiyim-kechak',emoji:'👕'},
    {slug:'weather',name:'Ob-havo',emoji:'🌦️'},
    {slug:'home',name:'Uy va jihozlar',emoji:'🏠'},
    {slug:'food',name:'Ovqat va ichimlik',emoji:'🥑'},
    {slug:'travel',name:'Sayohat',emoji:'✈️'},
    {slug:'transport',name:'Transport',emoji:'🚗'},
    {slug:'technology',name:'Texnologiya',emoji:'💻'},
    {slug:'study',name:'O‘qish va ish',emoji:'📚'},
    {slug:'health',name:'Salomatlik',emoji:'🩺'},
    {slug:'shopping',name:'Xaridlar',emoji:'🛍️'},
    {slug:'sports',name:'Sport',emoji:'⚽'},
    {slug:'nature',name:'Tabiat',emoji:'🌿'},
    {slug:'feelings',name:'His-tuyg‘ular',emoji:'💗'},
    {slug:'verbs',name:'Asosiy fe’llar',emoji:'⚡'},
    {slug:'other',name:'Boshqa mavzu',emoji:'🗂️'},
    {slug:'mine',name:'Men qo‘shgan so‘zlar',emoji:'✍️'}
  ];
  const cfg = window.WORDORA_CONFIG || {};
  const isConfigured = /^https:\/\//.test(cfg.url || '') &&
    !/example|YOUR_PROJECT|PASTE_ME/i.test(cfg.url) &&
    !!cfg.publishableKey && !/PASTE_ME|CHANGE_ME/i.test(cfg.publishableKey);
  const configError = !isConfigured
    ? 'Supabase sozlamalari topilmadi. README.md bo‘yicha Netlify environment variables ni kiriting va qayta deploy qiling.'
    : (!window.supabase?.createClient
      ? 'Supabase JavaScript kutubxonasi yuklanmadi. Internet yoki CDN ulanishini tekshiring.'
      : '');
  const client = configError ? null : window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
  });
  const unwrap = (response) => {
    if (response.error) {
      const err = response.error;
      if (err.code === '23505') throw new Error('Bu so‘z shaxsiy lug‘atingizda allaqachon mavjud.');
      if (err.code === '42501') throw new Error('Ruxsat yo‘q. Supabase RLS yoki SQL sozlamalarini tekshiring.');
      throw new Error(err.message || 'Supabase ma’lumot so‘rovida xatolik yuz berdi.');
    }
    return response.data;
  };
  const profile = (user) => user ? ({
    id: user.id, email: user.email,
    username: user.user_metadata?.display_name || (user.email || '').split('@')[0] || 'Do‘st',
  }) : null;
  async function needUser() {
    const data = unwrap(await client.auth.getUser());
    if (!data?.user) throw new Error('Sessiya yakunlandi. Qayta kiring.');
    return data.user;
  }
  let taxonomyReady = true;
  async function allWords() {
    const list = [];
    for (let start = 0; start < 6000; start += 1000) {
      const columns='id,owner_id,category,en,uz,example_en,example_uz,level,topic,word_type,progress(repetitions,due_on,correct_count,wrong_count,interval_days)';
      const legacyColumns='id,owner_id,category,en,uz,example_en,example_uz,level,progress(repetitions,due_on,correct_count,wrong_count,interval_days)';
      let response=await client.from('words').select(taxonomyReady?columns:legacyColumns).order('id',{ascending:false}).range(start,start+999);
      if (response.error && (response.error.code==='42703'||/column .* does not exist|could not find the .* column/i.test(response.error.message||''))) {
        taxonomyReady = false;
        response=await client.from('words').select(legacyColumns).order('id',{ascending:false}).range(start,start+999);
      }
      const rows=unwrap(response);
      const chunk=rows.map(({progress,...w})=>({
        ...w,
        topic:w.topic||(w.owner_id?'other':w.category),
        word_type:w.word_type||(w.category==='verbs'?'verb':'other'),
        repetitions:progress?.[0]?.repetitions??null,
        due_on:progress?.[0]?.due_on??null,
        correct_count:progress?.[0]?.correct_count??null,
        wrong_count:progress?.[0]?.wrong_count??null,
        interval_days:progress?.[0]?.interval_days??null,
      }));
      list.push(...chunk);
      if (rows.length < 1000) break;
    }
    window.WordoraBackend.taxonomyReady = taxonomyReady;
    return {words:list,count:list.length};
  }
  async function api(path, options = {}) {
    if (configError) throw new Error(configError);
    if (path === '/categories') return categories;
    if (path.startsWith('/words?') || (path === '/words' && (!options.method || options.method === 'GET'))) return allWords();
    if (path === '/stats') return unwrap(await client.rpc('wordora_stats'));
    if (path.startsWith('/session?')) {
      const qs = new URLSearchParams(path.split('?')[1]);
      return unwrap(await client.rpc('wordora_session', {
        p_category: qs.get('category') || 'all', p_limit: Number(qs.get('limit') || 10),
      }));
    }
    if (path === '/reviews' && options.method === 'POST') {
      const review = JSON.parse(options.body || '{}');
      return unwrap(await client.rpc('wordora_review', {
        p_word_id: Number(review.word_id), p_mode: review.mode, p_quality: Number(review.quality),
      }));
    }
    if (path === '/words' && options.method === 'POST') {
      const user = await needUser();
      const w = JSON.parse(options.body || '{}');
      for (const field of ['en','uz','example_en','example_uz']) {
        w[field] = String(w[field] || '').trim();
      }
      if (!w.en || !w.uz) throw new Error('Inglizcha so‘z va tarjimani kiriting.');
      if (w.en.length > 80 || w.uz.length > 120 || w.example_en.length > 240 || w.example_uz.length > 240) {
        throw new Error('Matn belgilangan uzunlikdan oshib ketdi.');
      }
      const topic=String(w.topic||'').trim();
      const wordType=String(w.word_type||'').trim();
      const payload={owner_id:user.id,category:'mine',en:w.en,uz:w.uz,
        example_en:w.example_en,example_uz:w.example_uz,level:'Custom'};
      if(taxonomyReady){
        if(!['daily','clothes','weather','home','food','travel','transport','technology','study','health','shopping','sports','nature','feelings','verbs','other'].includes(topic))throw new Error('Mavzu noto‘g‘ri.');
        if(!['noun','verb','adjective','adverb','modal','pronoun','preposition','conjunction','number','phrase','other'].includes(wordType))throw new Error('So‘z turkumi noto‘g‘ri.');
        payload.topic=topic;payload.word_type=wordType;
      }
      const data=unwrap(await client.from('words').insert(payload).select('id').single());
      return { id:data.id, message:'So‘z qo‘shildi' };
    }
    if (/^\/words\/\d+$/.test(path) && options.method==='PATCH') {
      if(!taxonomyReady)throw new Error('Avval Supabase upgrade_3_0.sql yangilanishini bajaring.');
      const user=await needUser();
      const id=Number(path.slice('/words/'.length));
      const data=JSON.parse(options.body||'{}');
      const topic=String(data.topic||'');const type=String(data.word_type||'');
      if(!categories.some(c=>c.slug===topic&&topic!=='mine')||!['noun','verb','adjective','adverb','modal','pronoun','preposition','conjunction','number','phrase','other'].includes(type))throw new Error('Noto‘g‘ri mavzu yoki turkum.');
      const changed=unwrap(await client.from('words').update({topic,word_type:type}).eq('id',id).eq('owner_id',user.id).select('id'));
      if(!changed.length)throw new Error('Shaxsiy so‘z topilmadi yoki o‘zgartirishga ruxsat yo‘q.');
      return {ok:true};
    }
    const match = /^\/words\/(\d+)$/.exec(path);
    if (match && options.method === 'DELETE') {
      const user = await needUser();
      const data = unwrap(await client.from('words').delete()
        .eq('id', Number(match[1])).eq('owner_id',user.id).select('id'));
      if (!data.length) throw new Error('So‘z topilmadi yoki uni o‘chirishga ruxsat yo‘q.');
      return {ok:true};
    }
    throw new Error('Noma’lum API amali: ' + path);
  }
  window.WordoraBackend = { api, client, configError, profile, taxonomyReady: true };
})();