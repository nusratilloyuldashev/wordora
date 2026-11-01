/* Wordora 7.6 — learner's daily goal and review priorities.
 * Uses previously loaded, RLS-scoped account data. No additional network calls.
 * Personal target is only a local preference and is keyed to the signed-in user.
 */
'use strict';
(function () {
  const goalOptions = [5, 10, 15, 20, 30, 40];
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  function storageKey(userId) {
    return 'wordora-v76-goal-' + String(userId);
  }
  function goalFor(userId) {
    if (!userId) return 10;
    try {
      const goal = Number(window.localStorage.getItem(storageKey(userId)));
      return goalOptions.includes(goal) ? goal : 10;
    } catch { return 10; }
  }
  function counts(words, memory, today, threshold = 90) {
    const seen = new Set();
    let introduced = 0, due = 0;
    const weak = [];
    for (const word of words || []) {
      if (!word || word.id == null) continue;
      const id = String(word.id);
      if (seen.has(id)) continue;
      seen.add(id);
      const m = memory?.[id];
      if (!m) continue;
      if (m.introduced_on === today) introduced++;
      const reviewDate = String(m.next_review_on || '');
      if (datePattern.test(reviewDate) && reviewDate <= today) due++;
      const score = m.last_test_score;
      if (m.stage !== 'mastered' && score !== null && score !== undefined &&
          score !== '' && Number.isFinite(Number(score)) &&
          Number(score) < threshold) {
        weak.push({id, en:String(word.en || ''), uz:String(word.uz || ''),
          score:Math.max(0, Math.min(100, Number(score)))});
      }
    }
    weak.sort((a,b) => a.score - b.score || a.en.localeCompare(b.en));
    return {introduced, due, weak:weak.slice(0,5), weakTotal:weak.length};
  }
  function panel() {
    if (!state.user || !V4.ready) return '';
    const today = localISODate();
    const report = counts(state.words, V4.memory, today, V4.threshold);
    const goal = goalFor(state.user.id);
    const progress = Math.min(100, Math.round(report.introduced / goal * 100));
    const remaining = Math.max(0, goal - report.introduced);
    const options = goalOptions.map(n =>
      '<option value="' + n + '"' + (n === goal ? ' selected' : '') + '>' + n + ' ta</option>'
    ).join('');
    const weakList = report.weak.map(w =>
      '<li><span><strong>' + esc(w.en) + '</strong><small>' + esc(w.uz) +
      '</small></span><b>' + w.score + '%</b></li>'
    ).join('');
    const weakSection = report.weakTotal
      ? '<div class="v76-weak"><div class="v76-subhead"><h3>Qayta test talab qiladigan so‘zlar</h3>' +
        '<span>' + report.weakTotal + ' ta</span></div>' +
        '<p>Oldingi test natijasi 90% dan past bo‘lgan, hali yodlangan maqomiga o‘tmagan so‘zlar.</p>' +
        '<ul>' + weakList + '</ul></div>'
      : '';
    return '<section class="v76-goal" aria-label="Shaxsiy kunlik o‘qish rejasi">' +
      '<div class="v76-head"><div><span class="v75-eyebrow">BUGUNGI MAQSAD</span>' +
      '<h2>Har kuni oz-ozdan oldinga 🎯</h2><p>Bugun ilk bor yodlash boshlangan so‘zlar hisoblanadi.</p></div>' +
      '<label class="v76-picker" for="v76-goal">Kunlik yangi so‘z maqsadi' +
      '<select id="v76-goal" data-v76-goal>' + options + '</select></label></div>' +
      '<div class="v76-progress"><div><strong>' + report.introduced + ' / ' + goal +
      '</strong><span>' + (remaining ? 'Yana ' + remaining + ' ta so‘z' : 'Bugungi maqsad bajarildi!') +
      '</span></div><div class="v76-track" role="progressbar" aria-label="Kunlik maqsad" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      progress + '"><i style="width:' + progress + '%"></i></div></div>' +
      '<div class="v76-footer"><span>🔁 Bugun takrorlash navbatida: <b>' + report.due +
      ' ta</b></span><div class="v76-actions">' +
      '<button type="button" data-v76="learn">Yangi so‘z yodlash</button>' +
      (report.due ? '<button type="button" data-v76="review">Takrorlash mashqi</button>' : '') +
      '</div></div>' + weakSection +
      '<p class="v76-privacy">Maqsad tanlovi faqat ushbu qurilmada va hisobingiz uchun saqlanadi. O‘quv natijalariga tegilmaydi.</p></section>';
  }
  const earlierDashboard = dashboardPage;
  dashboardPage = function (...args) {
    const html = earlierDashboard.apply(this, args);
    if (!state.user || !V4.ready) return html;
    const anchor = '<section class="v75-dashboard"';
    if (html.includes(anchor)) return html.replace(anchor, panel() + anchor);
    const fallback = '<div class="v4-stat-strip">';
    return html.includes(fallback) ? html.replace(fallback, panel() + fallback) : html;
  };
  document.addEventListener('change', event => {
    const select = event.target?.closest?.('[data-v76-goal]');
    if (!select || !state.user) return;
    const value = Number(select.value);
    if (!goalOptions.includes(value)) return;
    try { window.localStorage.setItem(storageKey(state.user.id), String(value)); }
    catch { /* Storage may be restricted in private browsing. */ }
    render();
  }, true);
  document.addEventListener('click', event => {
    const button = event.target?.closest?.('[data-v76]');
    if (!button || !state.user) return;
    const action = button.dataset.v76;
    if (action !== 'learn' && action !== 'review') return;
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    if (action === 'learn') {
      v4Navigate('learn');
    } else {
      V4.practiceDate = 'all';
      V4.reviewOnly = true;
      startPractice('mix');
    }
  }, true);
  window.WordoraV76 = {counts, goalFor, goalOptions:[...goalOptions]};
})();
