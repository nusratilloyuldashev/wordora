/* Wordora browser adapter: Supabase Auth + PostgREST + protected PostgreSQL RPCs.
 * The publishable/anon key is public. Never use a secret/service-role key here.
 */
'use strict';
(function () {
  const categories = [{"slug": "daily", "name": "Kundalik hayot", "emoji": "☀️", "color": "#FFF0CE"}, {"slug": "verbs", "name": "Asosiy fe’llar", "emoji": "⚡", "color": "#E5E2FF"}, {"slug": "food", "name": "Ovqat va ichimlik", "emoji": "🥑", "color": "#E1F4E9"}, {"slug": "travel", "name": "Sayohat", "emoji": "✈️", "color": "#DDEBFF"}, {"slug": "feelings", "name": "His-tuyg‘ular", "emoji": "💗", "color": "#FFE2EB"}, {"slug": "study", "name": "O‘qish va ish", "emoji": "📚", "color": "#FFF0DE"}, {"slug": "nature", "name": "Tabiat", "emoji": "🌿", "color": "#E6F4DD"}, {"slug": "technology", "name": "Texnologiya", "emoji": "💻", "color": "#E7E9FF"}, {"slug": "mine", "name": "Mening so‘zlarim", "emoji": "✍️", "color": "#E7E2FF"}];
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
  async function allWords() {
    const list = [];
    // Supabase API commonly defaults to a max of 1000 rows per query.
    for (let start = 0; start < 6000; start += 1000) {
      const rows = unwrap(await client.from('words')
        .select('id,owner_id,category,en,uz,example_en,example_uz,level,progress(repetitions,due_on,correct_count,wrong_count,interval_days)')
        .order('id', { ascending: false }).range(start, start + 999));
      const chunk = rows.map(({ progress, ...w }) => ({
        ...w, repetitions: progress?.[0]?.repetitions ?? null,
        due_on: progress?.[0]?.due_on ?? null,
        correct_count: progress?.[0]?.correct_count ?? null,
        wrong_count: progress?.[0]?.wrong_count ?? null,
        interval_days: progress?.[0]?.interval_days ?? null,
      }));
      list.push(...chunk);
      if (rows.length < 1000) break;
    }
    return { words: list, count: list.length };
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
      const data = unwrap(await client.from('words').insert({
        owner_id: user.id, category:'mine', en:w.en, uz:w.uz,
        example_en:w.example_en,example_uz:w.example_uz,level:'Custom',
      }).select('id').single());
      return { id:data.id, message:'So‘z qo‘shildi' };
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
  window.WordoraBackend = { api, client, configError, profile };
})();
