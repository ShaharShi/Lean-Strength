/* Lean Strength — לוגיקת האפליקציה (v2: תוכנית ניתנת לעריכה, כרטיסים מכווצים, פס צף) */
(function () {
  'use strict';
  var D = window.LS_DATA, EX = D.EX, P = D.PROFILES, LINKS = D.LINKS;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var uid = function () { return 'i' + Math.random().toString(36).slice(2, 9); };
  var ICON = {
    body: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.5"/><path d="M8 21v-6l-2-5 3-2h6l3 2-2 5v6"/></svg>',
    ext: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M5 4l14 8-14 8z"/></svg>',
    chev: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>',
    move: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M12 12v6M9 15l3 3 3-3"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>'
  };

  // ---------- storage ----------
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('ls.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('ls.' + k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem('ls.' + k); } catch (e) {} }
  };
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var fmtDate = function (iso) { var p = iso.split('-'); return p[2] + '.' + p[1] + '.' + p[0].slice(2); };
  var pad2 = function (n) { return String(n).padStart(2, '0'); };

  // ---------- state ----------
  var S = { profile: store.get('profile', 'shachar'), theme: store.get('theme', 'light'), view: 'workout', plan: null, open: {}, muscle: null };
  if (!P[S.profile]) S.profile = 'shachar';
  if (['light', 'dark', 'auto'].indexOf(S.theme) < 0) S.theme = 'light';
  var prof = function () { return P[S.profile]; };
  var pk = function (k) { return S.profile + '.' + k; };

  // ---------- theme ----------
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function isDark() { return S.theme === 'dark' || (S.theme === 'auto' && !!(mq && mq.matches)); }
  function applyTheme() {
    var root = document.documentElement, p = prof(), dark = isDark();
    if (S.theme === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', S.theme);
    root.style.setProperty('--accent', dark ? p.accentDark : p.accent);
    root.style.setProperty('--accent-soft', dark ? p.accentSoftDark : p.accentSoft);
    $('#themeIco').innerHTML = S.theme === 'dark' ? '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'
      : S.theme === 'light' ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
      : '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/>';
    $('#themeBtn').title = S.theme === 'auto' ? 'אוטומטי (לפי המכשיר)' : S.theme === 'dark' ? 'כהה' : 'בהיר';
  }
  $('#themeBtn').addEventListener('click', function () {
    S.theme = S.theme === 'light' ? 'dark' : S.theme === 'dark' ? 'auto' : 'light';
    store.set('theme', S.theme); applyTheme();
    toast(S.theme === 'auto' ? 'מצב אוטומטי (לפי המכשיר)' : S.theme === 'dark' ? 'מצב כהה' : 'מצב בהיר');
  });
  if (mq && mq.addEventListener) mq.addEventListener('change', applyTheme);

  // ---------- plan model (editable, per profile) ----------
  function defaultPlan() {
    var p = prof();
    return {
      days: p.days.map(function (d) {
        return { idx: d.idx, he: d.he, name: d.name, en: d.en, focus: d.focus, items: d.items.map(function (it) { return { uid: uid(), id: it[0], orig: it[0], sets: it[1], reps: it[2], rir: it[3], rest: it[4], o: it[5] || null }; }) };
      }),
      week: p.week.slice()
    };
  }
  function plan() {
    if (S.plan) return S.plan;
    S.plan = store.get(pk('plan'), null);
    if (!S.plan) {
      S.plan = defaultPlan();
      var sw = store.get(pk('swaps'), null); // הגירה מגרסה 1
      if (sw) { S.plan.days.forEach(function (d) { d.items.forEach(function (it, i) { var k = String(d.idx) + ':' + i; if (sw[k] && EX[sw[k]]) it.id = sw[k]; }); }); store.del(pk('swaps')); }
      savePlan();
    }
    return S.plan;
  }
  function savePlan() { store.set(pk('plan'), S.plan); }
  function dayByIdx(idx) { return plan().days.filter(function (d) { return String(d.idx) === String(idx); })[0] || null; }
  function isNumIdx() { return plan().days.every(function (d) { return /^\d+$/.test(String(d.idx)); }); }
  function newDayIdx() {
    var ds = plan().days;
    if (!ds.length || isNumIdx()) { var m = 0; ds.forEach(function (d) { m = Math.max(m, +d.idx || 0); }); return m + 1; }
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', used = ds.map(function (d) { return String(d.idx); });
    for (var i = 0; i < letters.length; i++) if (used.indexOf(letters[i]) < 0) return letters[i];
    return 'X' + ds.length;
  }
  function dayLabel(idx) { return /^\d+$/.test(String(idx)) ? 'יום ' + idx : 'אימון ' + idx; }
  function restLabel(s) { return s >= 150 ? '2–3 דק׳' : s >= 120 ? '2 דק׳' : s >= 105 ? '105 שנ׳' : s + ' שנ׳'; }
  function repsTop(r) { var m = String(r).match(/(\d+)\s*[–-]\s*(\d+)/); return m ? +m[2] : parseInt(r, 10) || 0; }
  function repsLow(r) { var m = String(r).match(/(\d+)/); return m ? +m[1] : 0; }
  function info(it) {
    var base = EX[it.id] || {}, o = (it.id === it.orig && it.o) || {};
    return { he: o.he || base.he || it.id, en: o.en || base.en || '', primary: o.primary || base.primary || '', assist: o.assist != null ? o.assist : (base.assist || ''), ex: base };
  }
  function dupMap() { var m = {}; plan().days.forEach(function (d) { d.items.forEach(function (it, i) { (m[it.id] = m[it.id] || []).push({ day: d, n: i + 1 }); }); }); return m; }
  function ytLink(en, ch) { return ch ? 'https://www.youtube.com/@' + ch + '/search?query=' + encodeURIComponent(en) : 'https://www.youtube.com/results?search_query=' + encodeURIComponent(en + ' technique'); }
  function figSrc(id, phase) { var f = D.FIGS && D.FIGS[id]; return f ? 'figs/' + f + '_' + phase + '.jpg' : null; }
  function thumbHtml(id, n) {
    var src = figSrc(id, 1);
    return '<div class="thumb">' + (src ? '<img alt="" loading="lazy" src="' + src + '" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="ph" hidden>' + ICON.body + '</div>' : '<div class="ph">' + ICON.body + '</div>') + (n != null ? '<span class="n">' + n + '</span>' : '') + '</div>';
  }
  // קבוצת נפח לתרגיל (לפי המיפוי במפרט, עם גיבוי לפי שריר)
  var MUSCLE_GROUP = {
    shachar: { chest: 'חזה', lats: 'גב', traps: 'גב', delts: 'כתפיים', rear_delts: 'כתף אחורית', biceps: 'יד קדמית', forearms: 'יד קדמית', triceps: 'יד אחורית', quads: 'רגליים', hamstrings: 'רגליים', glutes: 'רגליים', calves: 'רגליים', lower_back: 'רגליים', abs: 'ליבה' },
    bina: { chest: 'חזה', lats: 'גב', traps: 'גב', delts: 'כתפיים', rear_delts: 'כתפיים', biceps: 'יד קדמית', forearms: 'יד קדמית', triceps: 'יד אחורית', quads: 'רגליים', hamstrings: 'רגליים', glutes: 'ישבן', calves: 'רגליים', lower_back: 'רגליים', abs: 'בטן / ליבה' }
  };
  function groupOf(id) {
    var gs = prof().groups;
    for (var i = 0; i < gs.length; i++) if (gs[i].ex.indexOf(id) >= 0) return gs[i].he;
    var mp = (EX[id] && EX[id].mp) || [];
    return MUSCLE_GROUP[S.profile][mp[0]] || null;
  }

  // ---------- session + history ----------
  function session() { return store.get(pk('session'), null); }
  function saveSession(s) { store.set(pk('session'), s); }
  function hist() { return store.get(pk('hist'), {}); }
  function commitSession(silent) {
    var s = session(); if (!s) return 0;
    var h = hist(), n = 0;
    Object.keys(s.sets || {}).forEach(function (u) {
      var rec = s.sets[u]; if (!rec || !rec.id) return;
      var done = (rec.rows || []).filter(function (x) { return x && x.done; }).map(function (x) { return { w: x.w, r: x.r }; });
      if (!done.length) return;
      var arr = h[rec.id] = h[rec.id] || [], last = arr[arr.length - 1];
      if (last && last.d === s.date && String(last.day) === String(s.day)) last.sets = done; else arr.push({ d: s.date, day: s.day, sets: done });
      n++;
    });
    store.set(pk('hist'), h); store.del(pk('session'));
    if (!silent && n) toast('האימון נשמר · ' + n + ' תרגילים');
    return n;
  }
  function ensureSession(day) {
    var s = session();
    if (s && (s.date !== today() || String(s.day) !== String(day.idx))) { commitSession(true); s = null; }
    if (!s) { s = { date: today(), day: day.idx, sets: {} }; saveSession(s); }
    return s;
  }
  function lastEntry(id) { var a = hist()[id]; return a && a.length ? a[a.length - 1] : null; }

  // ---------- workout view ----------
  var curDayIdx = store.get(pk('day'), null);
  function curDay() { return dayByIdx(curDayIdx) || plan().days[0] || null; }
  function renderHero() {
    var p = prof();
    $('#heroTitle').textContent = p.name + ' · ' + p.title;
    $('#heroSub').textContent = p.goal + ' · ' + p.split;
    $$('#profileSeg button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.p === S.profile)); });
  }
  function renderDays() {
    var d0 = curDay();
    $('#days').innerHTML = plan().days.map(function (d) {
      return '<button type="button" class="day" data-d="' + esc(d.idx) + '" aria-pressed="' + (d === d0) + '"><div class="d1">' + esc(d.he) + '</div><div class="d2">' + esc(d.name) + '</div><div class="d3">' + (d.en ? esc(d.en) + ' · ' : '') + d.items.length + ' תרגילים</div></button>';
    }).join('') || '<div class="empty" style="flex:1">אין ימי אימון. הוסיפו אימון בלשונית "תוכנית".</div>';
    $$('#days .day').forEach(function (b) { b.addEventListener('click', function () { curDayIdx = b.dataset.d; store.set(pk('day'), curDayIdx); S.open = {}; renderWorkout(); }); });
  }
  function renderWorkout() {
    renderDays();
    var day = curDay();
    if (!day) { $('#dayName').textContent = ''; $('#dayFocus').textContent = ''; $('#exList').innerHTML = ''; $('#dayProg').style.width = '0%'; return; }
    var s = ensureSession(day), dups = dupMap(), total = 0, doneAll = 0, html = '';
    $('#dayName').textContent = day.he + ' · ' + day.name;
    $('#dayFocus').textContent = day.focus || '';
    day.items.forEach(function (it, i) {
      var inf = info(it), ex = inf.ex, rec = s.sets[it.uid] || { rows: [] }, rows = rec.rows || [];
      var doneN = rows.filter(function (x) { return x && x.done; }).length; total += it.sets; doneAll += Math.min(doneN, it.sets);
      var allDone = doneN >= it.sets, open = !!S.open[it.uid], last = lastEntry(it.id);
      // tags
      var tags = '', occ = dups[it.id] || [];
      if (occ.length > 1) { var other = occ.filter(function (o) { return o.day !== day; })[0]; if (other) tags += '<span class="tag">⇄ חוזר ב' + esc(other.day.he) + ' · #' + other.n + '</span>'; }
      if (it.id !== it.orig) tags += '<span class="tag swap">הוחלף מ־' + esc((EX[it.orig] || {}).he || it.orig) + '</span>';
      if (it.added) tags += '<span class="tag add">נוסף ידנית</span>';
      // header (collapsed)
      html += '<article class="ex' + (open ? ' open' : '') + (allDone ? ' done' : '') + '" data-uid="' + it.uid + '">' +
        '<button type="button" class="ex-head" aria-expanded="' + open + '">' + thumbHtml(it.id, i + 1) +
        '<div class="ex-title"><h3>' + esc(inf.he) + '</h3><div class="sub"><b>' + it.sets + '×' + esc(it.reps) + '</b> · RIR ' + it.rir + ' · מנוחה ' + restLabel(it.rest) + '</div>' + (tags ? '<div class="tagrow">' + tags + '</div>' : '') + '</div>' +
        '<div class="ex-state"><span class="cnt num">' + doneN + '/' + it.sets + '</span>' + ICON.chev + '</div></button>';
      if (open) {
        // figures
        var frame = function (phase, cap) { var src = figSrc(it.id, phase); return '<div class="frame">' + (src ? '<img alt="' + esc(inf.he) + ' — ' + cap + '" loading="lazy" src="' + src + '" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="ph" hidden><div>' + ICON.body + '<br>איור יתווסף</div></div>' : '<div class="ph"><div>' + ICON.body + '<br>איור יתווסף</div></div>') + '<span class="fnum">' + (phase + 1) + '</span><span class="fcap">' + cap + '</span></div>'; };
        var figs = '<div class="figs">' + frame(0, 'מוצא') + frame(1, 'שיא התנועה') + '</div>';
        // cfg
        var restOpts = [45, 60, 75, 90, 120, 150, 180].map(function (v) { return '<option value="' + v + '"' + (v === it.rest ? ' selected' : '') + '>' + (v >= 120 ? (v / 60) + ' דק׳' : v + ' שנ׳') + '</option>'; }).join('');
        var cfg = '<div class="cfg"><div><div class="cl">סטים</div><div class="step"><button type="button" data-cfg="sets" data-d="-1" aria-label="פחות סטים">−</button><b class="num">' + it.sets + '</b><button type="button" data-cfg="sets" data-d="1" aria-label="יותר סטים">+</button></div></div>' +
          '<div><div class="cl">חזרות</div><input id="reps-' + it.uid + '" data-cfg="reps" value="' + esc(it.reps) + '" aria-label="טווח חזרות"></div>' +
          '<div><div class="cl">RIR</div><div class="step"><button type="button" data-cfg="rir" data-d="-1">−</button><b class="num">' + it.rir + '</b><button type="button" data-cfg="rir" data-d="1">+</button></div></div>' +
          '<div><div class="cl">מנוחה</div><select id="rest-' + it.uid + '" data-cfg="rest" aria-label="זמן מנוחה">' + restOpts + '</select></div></div>';
        // hint
        var hint = '';
        if (last) {
          var top = repsTop(it.reps), allTop = last.sets.length >= it.sets && last.sets.every(function (x) { return +x.r >= top; });
          var desc = last.sets.map(function (x) { return x.w ? x.w + '×' + x.r : x.r; }).join(' · ');
          hint = allTop ? '<div class="hint up">הגעת לקצה הטווח בטכניקה נקייה (' + esc(desc) + ') → העלה משקל ב-2.5–5% וחזור לתחתית הטווח.</div>'
            : '<div class="hint">אימון קודם (' + fmtDate(last.d) + '): <span class="rubik">' + esc(desc) + '</span></div>';
        }
        // sets
        var sets = '<div class="sets"><div class="set head"><span></span><span>ק״ג</span><span>חזרות</span><span></span></div>';
        for (var k = 0; k < it.sets; k++) {
          var st = rows[k] || {}, ls = last && (last.sets[k] || last.sets[last.sets.length - 1]);
          sets += '<div class="set" data-k="' + k + '"><span class="sn">' + (k + 1) + '</span>' +
            '<input id="w-' + it.uid + '-' + k + '" type="number" inputmode="decimal" step="0.5" placeholder="' + (ls && ls.w ? esc(ls.w) : '—') + '" value="' + (st.w != null ? esc(st.w) : '') + '" aria-label="משקל סט ' + (k + 1) + '">' +
            '<input id="r-' + it.uid + '-' + k + '" type="number" inputmode="numeric" placeholder="' + (ls && ls.r ? esc(ls.r) : repsLow(it.reps)) + '" value="' + (st.r != null ? esc(st.r) : '') + '" aria-label="חזרות סט ' + (k + 1) + '">' +
            '<button type="button" class="chk" aria-pressed="' + !!st.done + '" aria-label="סיום סט ' + (k + 1) + '">' + ICON.check + '</button></div>';
        }
        sets += '</div>';
        // tools
        var tools = '<div class="tools"><button type="button" class="mini" data-act="up"' + (i === 0 ? ' disabled' : '') + '>' + ICON.up + 'למעלה</button><button type="button" class="mini" data-act="down"' + (i === day.items.length - 1 ? ' disabled' : '') + '>' + ICON.down + 'למטה</button><button type="button" class="mini" data-act="move">' + ICON.move + 'העבר ליום אחר</button><button type="button" class="mini warn" data-act="remove">' + ICON.trash + 'הסר מהיום</button></div>';
        // details
        var links = '<div class="links">' + (LINKS[it.id] ? '<a class="lnk" target="_blank" rel="noopener" href="' + esc(LINKS[it.id]) + '">' + ICON.ext + 'דף התרגיל (וידאו)</a>' : '') +
          '<a class="lnk vid" target="_blank" rel="noopener" href="' + esc(ytLink(inf.en, 'JeffNippard')) + '">' + ICON.play + 'Jeff Nippard</a>' +
          '<a class="lnk vid" target="_blank" rel="noopener" href="' + esc(ytLink(inf.en, 'RenaissancePeriodization')) + '">' + ICON.play + 'RP · Dr. Mike</a></div>';
        var altIds = (it.id !== it.orig ? [it.orig].concat((EX[it.orig] || {}).alts || []) : (ex.alts || [])).filter(function (a) { return a !== it.id && EX[a]; });
        var alts = altIds.length ? '<div class="blk"><h4>תרגילים חלופיים לאותו שריר</h4><div class="alts">' + altIds.map(function (a) {
          var e = EX[a];
          return '<div class="alt"><div class="t"><div class="he">' + esc(e.he) + '</div><div class="en">' + esc(e.en) + '</div><div class="mu">' + esc(e.primary || '') + '</div></div>' +
            (LINKS[a] ? '<a class="lnk" target="_blank" rel="noopener" href="' + esc(LINKS[a]) + '" aria-label="דף התרגיל">' + ICON.ext + '</a>' : '') +
            '<button type="button" class="mini' + (a === it.orig ? ' pri' : '') + '" data-swap="' + esc(a) + '">' + (a === it.orig ? 'חזור למקור' : 'החלף') + '</button></div>';
        }).join('') + '</div></div>' : '';
        var body = '';
        if (ex.why) body += '<div class="blk"><h4>למה בחרנו בתרגיל</h4><p>' + esc(ex.why) + '</p></div>';
        if (ex.steps) body += '<div class="cols"><div class="blk"><h4>ביצוע נכון</h4><ol>' + ex.steps.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></div><div class="blk"><h4>טעויות נפוצות</h4><ul>' + (ex.mistakes || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div></div>';
        if (ex.tip) body += '<div class="tip"><b>טיפ:</b> ' + esc(ex.tip) + '</div>';
        body += links + alts;
        html += '<div class="ex-body">' +
          '<div class="musc"><b>שריר עיקרי:</b> ' + esc(inf.primary) + (inf.assist ? ' · <b>מסייעים:</b> ' + esc(inf.assist) : '') + '</div>' +
          figs + cfg + hint + sets + tools + '</div>' +
          '<details class="more"><summary>ביצוע, טעויות, חלופות וקישורים</summary><div class="more-body">' + body + '</div></details>';
      }
      html += '</article>';
    });
    $('#exList').innerHTML = html || '<div class="empty">אין תרגילים ביום הזה עדיין — הוסיפו תרגיל למטה.</div>';
    $('#dayProg').style.width = (total ? Math.round(doneAll / total * 100) : 0) + '%';
    bindWorkout(day);
  }
  function bindWorkout(day) {
    $$('#exList .ex').forEach(function (card) {
      var u = card.dataset.uid, i = day.items.findIndex(function (x) { return x.uid === u; }), it = day.items[i]; if (!it) return;
      $('.ex-head', card).addEventListener('click', function () { if (S.open[u]) delete S.open[u]; else S.open[u] = true; renderWorkout(); if (S.open[u]) card = $('#exList .ex[data-uid="' + u + '"]'); });
      if (!S.open[u]) return;
      var persist = function () {
        var s = ensureSession(day), rec = s.sets[u] = s.sets[u] || { id: it.id, rows: [] }; rec.id = it.id;
        $$('.set[data-k]', card).forEach(function (row) {
          var k = +row.dataset.k, w = $('input[id^="w-"]', row), r = $('input[id^="r-"]', row), c = $('.chk', row);
          rec.rows[k] = { w: w.value === '' ? null : +w.value, r: r.value === '' ? null : +r.value, done: c.getAttribute('aria-pressed') === 'true' };
        });
        saveSession(s);
      };
      $$('.set input', card).forEach(function (inp) { inp.addEventListener('change', persist); });
      $$('.chk', card).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var row = btn.closest('.set'), k = +row.dataset.k, on = btn.getAttribute('aria-pressed') !== 'true';
          btn.setAttribute('aria-pressed', String(on));
          if (on) {
            var w = $('input[id^="w-"]', row), r = $('input[id^="r-"]', row);
            if (w.value === '' && w.placeholder !== '—') w.value = w.placeholder;
            if (r.value === '' && r.placeholder) r.value = r.placeholder;
            if (navigator.vibrate) navigator.vibrate(15);
          }
          persist();
          var doneN = $$('.chk[aria-pressed="true"]', card).length;
          $('.cnt', card).textContent = doneN + '/' + it.sets;
          card.classList.toggle('done', doneN >= it.sets);
          var tot = 0, dn = 0, s = session();
          day.items.forEach(function (x) { tot += x.sets; var rr = (s.sets[x.uid] || {}).rows || []; dn += Math.min(x.sets, rr.filter(function (y) { return y && y.done; }).length); });
          $('#dayProg').style.width = Math.round(dn / tot * 100) + '%';
          if (on) {
            if (doneN >= it.sets) {
              // התרגיל הושלם: לכווץ ולפתוח את הבא שלא הושלם
              var next = day.items.slice(i + 1).filter(function (x) { var rr = (s.sets[x.uid] || {}).rows || []; return rr.filter(function (y) { return y && y.done; }).length < x.sets; })[0];
              delete S.open[u]; if (next) S.open[next.uid] = true;
              startRest(it.rest, info(it).he + ' · הושלם ✓');
              setTimeout(renderWorkout, 350);
            } else startRest(it.rest, info(it).he + ' · סט ' + (k + 1) + '/' + it.sets);
          }
        });
      });
      // cfg
      $$('[data-cfg="sets"],[data-cfg="rir"]', card).forEach(function (b) {
        b.addEventListener('click', function () {
          var f = b.dataset.cfg, d = +b.dataset.d;
          it[f] = Math.max(f === 'sets' ? 1 : 0, Math.min(f === 'sets' ? 10 : 5, it[f] + d));
          savePlan(); renderWorkout(); renderPlan();
        });
      });
      $('[data-cfg="reps"]', card).addEventListener('change', function () { var v = this.value.trim().replace('-', '–'); if (v) { it.reps = v; savePlan(); renderWorkout(); } });
      $('[data-cfg="rest"]', card).addEventListener('change', function () { it.rest = +this.value; savePlan(); renderWorkout(); });
      // tools
      $$('[data-act]', card).forEach(function (b) {
        b.addEventListener('click', function () {
          var a = b.dataset.act;
          if (a === 'up' && i > 0) { day.items.splice(i, 1); day.items.splice(i - 1, 0, it); }
          else if (a === 'down' && i < day.items.length - 1) { day.items.splice(i, 1); day.items.splice(i + 1, 0, it); }
          else if (a === 'remove') { if (!confirm('להסיר את "' + info(it).he + '" מ' + day.he + '?')) return; day.items.splice(i, 1); toast('הוסר'); }
          else if (a === 'move') { return openMoveSheet(day, it); }
          savePlan(); renderAllPlan();
        });
      });
      $$('[data-swap]', card).forEach(function (b) {
        b.addEventListener('click', function () {
          var t = b.dataset.swap; it.id = t; if (t === it.orig) it.o = it.o || null;
          savePlan(); toast(t === it.orig ? 'חזרנו לתרגיל המקורי' : 'הוחלף ל־' + EX[t].he); renderAllPlan();
        });
      });
    });
  }
  $('#finishBtn').addEventListener('click', function () { var n = commitSession(false); if (!n) toast('לא סומנו סטים באימון הזה'); S.open = {}; renderWorkout(); renderLog(); });

  // ---------- add exercise (picker / random) ----------
  function dayMuscles(day) { var m = {}; day.items.forEach(function (it) { ((EX[it.id] || {}).mp || []).forEach(function (k) { m[k] = 1; }); }); return Object.keys(m); }
  function candidates(day) {
    var have = {}; day.items.forEach(function (it) { have[it.id] = 1; });
    var ms = dayMuscles(day), all = !ms.length;
    return Object.keys(EX).filter(function (id) { if (have[id]) return false; var mp = EX[id].mp || []; return all || mp.some(function (k) { return ms.indexOf(k) >= 0; }); });
  }
  function addExercise(day, id, how) {
    var e = EX[id], p = prof();
    day.items.push({ uid: uid(), id: id, orig: id, sets: 3, reps: '10–15', rir: S.profile === 'bina' ? 2 : 1, rest: 90, o: null, added: true });
    savePlan(); S.open = {}; S.open[day.items[day.items.length - 1].uid] = true;
    toast((how === 'rand' ? '🎲 ' : '') + e.he + ' נוסף ל' + day.he); renderAllPlan();
    setTimeout(function () { var el = $('#exList .ex.open'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
  }
  function openAddSheet(day) {
    var c = candidates(day);
    if (!c.length) return toast('אין תרגילים נוספים להוסיף ליום הזה');
    var byG = {};
    c.forEach(function (id) { var mk = (EX[id].mp || [])[0], m = D.MUSCLES.filter(function (x) { return x.k === mk; })[0]; var g = m ? m.he : 'אחר'; (byG[g] = byG[g] || []).push(id); });
    var html = '<h3>הוסף תרגיל ל' + esc(day.he) + '</h3><p class="lead">מוצגים תרגילים לשרירים שכבר עובדים ביום הזה' + (dayMuscles(day).length ? '' : ' (יום חדש — כל התרגילים)') + '.</p>' +
      '<button type="button" class="opt dice" data-add="__rand"><span class="oi">🎲</span><span class="ot"><b>תרגיל רנדומלי</b><span>בחירה אקראית מתוך ' + c.length + ' תרגילים מתאימים</span></span></button>';
    Object.keys(byG).forEach(function (g) {
      html += '<div class="ghead">' + esc(g) + '</div>' + byG[g].map(function (id) { var e = EX[id]; return '<button type="button" class="opt" data-add="' + id + '"><span class="oi">' + (e.steps ? '★' : '·') + '</span><span class="ot"><b>' + esc(e.he) + '</b><span>' + esc(e.en) + ' · ' + esc(e.primary || '') + '</span></span></button>'; }).join('');
    });
    openSheet(html, function (root) {
      $$('[data-add]', root).forEach(function (b) { b.addEventListener('click', function () { var id = b.dataset.add; if (id === '__rand') id = c[Math.floor(Math.random() * c.length)]; closeSheet(); addExercise(day, id, b.dataset.add === '__rand' ? 'rand' : ''); }); });
    });
  }
  $('#addExBtn').addEventListener('click', function () { var d = curDay(); if (d) openAddSheet(d); else toast('קודם הוסיפו יום אימון בלשונית "תוכנית"'); });
  $('#randExBtn').addEventListener('click', function () { var d = curDay(); if (!d) return; var c = candidates(d); if (!c.length) return toast('אין תרגילים נוספים להוסיף'); addExercise(d, c[Math.floor(Math.random() * c.length)], 'rand'); });
  function openMoveSheet(day, it) {
    var others = plan().days.filter(function (d) { return d !== day; });
    var html = '<h3>העבר את "' + esc(info(it).he) + '"</h3><p class="lead">בחרו לאיזה יום להעביר. הסטים והחזרות נשמרים.</p>' +
      others.map(function (d) { return '<button type="button" class="opt" data-to="' + esc(d.idx) + '"><span class="oi">' + esc(String(d.idx)) + '</span><span class="ot"><b>' + esc(d.he) + ' · ' + esc(d.name) + '</b><span>' + d.items.length + ' תרגילים</span></span></button>'; }).join('') +
      (others.length ? '' : '<div class="empty">אין יום אחר. הוסיפו אימון בלשונית "תוכנית".</div>');
    openSheet(html, function (root) {
      $$('[data-to]', root).forEach(function (b) { b.addEventListener('click', function () {
        var to = dayByIdx(b.dataset.to); if (!to) return;
        day.items.splice(day.items.indexOf(it), 1); to.items.push(it); savePlan(); closeSheet(); toast('הועבר ל' + to.he); renderAllPlan();
      }); });
    });
  }

  // ---------- bottom sheet ----------
  function openSheet(html, bind) { var sh = $('#sheet'); $('#sheetBody').innerHTML = html; if (bind) bind(sh); sh.classList.add('on'); $('#backdrop').classList.add('on'); }
  function closeSheet() { $('#sheet').classList.remove('on'); $('#backdrop').classList.remove('on'); }
  $('#backdrop').addEventListener('click', closeSheet);

  // ---------- plan view ----------
  function volumeRows() {
    var sum = {}; prof().groups.forEach(function (g) { sum[g.he] = 0; });
    plan().days.forEach(function (d) { d.items.forEach(function (it) { var g = groupOf(it.orig) || groupOf(it.id); if (g) sum[g] = (sum[g] || 0) + it.sets; }); });
    return Object.keys(sum).map(function (k) { return { he: k, sets: sum[k] }; });
  }
  function renderPlan() {
    var p = prof(), pl = plan();
    $('#planLead').textContent = pl.week.filter(function (x) { return x != null && dayByIdx(x); }).length + ' אימונים בשבוע · ' + p.rir + ' · ' + p.goal;
    $('#week').innerHTML = pl.week.map(function (k, i) {
      var d = k == null ? null : dayByIdx(k);
      return d ? '<button type="button" class="wk" data-i="' + i + '"><div class="wd">יום ' + (i + 1) + '</div><div class="wn">' + esc(String(d.idx)) + '</div><div class="wt">' + esc(d.name) + '</div></button>'
        : '<button type="button" class="wk rest" data-i="' + i + '"><div class="wd">יום ' + (i + 1) + '</div><div class="wn">·</div><div class="wt">מנוחה</div></button>';
    }).join('');
    $$('#week .wk').forEach(function (b) { b.addEventListener('click', function () { openWeekSheet(+b.dataset.i); }); });
    $('#wlist').innerHTML = pl.days.map(function (d) {
      var n = pl.week.filter(function (x) { return String(x) === String(d.idx); }).length;
      return '<div class="wrow"><div class="wi">' + esc(String(d.idx)) + '</div><div class="wt2"><b>' + esc(d.he) + ' · ' + esc(d.name) + '</b><span>' + d.items.length + ' תרגילים · ' + (n ? 'פעם' + (n > 1 ? 'יים' : '') + ' בשבוע' : 'לא משובץ בשבוע') + '</span></div>' +
        '<button type="button" class="mini" data-open="' + esc(d.idx) + '">פתח</button><button type="button" class="mini" data-rename="' + esc(d.idx) + '" aria-label="שנה שם">✎</button><button type="button" class="mini warn" data-del="' + esc(d.idx) + '" aria-label="מחק אימון">' + ICON.trash + '</button></div>';
    }).join('') || '<div class="empty">אין אימונים. הוסיפו אימון חדש.</div>';
    $$('#wlist [data-open]').forEach(function (b) { b.addEventListener('click', function () { curDayIdx = b.dataset.open; store.set(pk('day'), curDayIdx); S.open = {}; renderWorkout(); showView('workout'); }); });
    $$('#wlist [data-rename]').forEach(function (b) { b.addEventListener('click', function () { var d = dayByIdx(b.dataset.rename); var v = prompt('שם האימון:', d.name); if (v && v.trim()) { d.name = v.trim(); savePlan(); renderAllPlan(); } }); });
    $$('#wlist [data-del]').forEach(function (b) { b.addEventListener('click', function () {
      var d = dayByIdx(b.dataset.del);
      if (!confirm('למחוק את ' + d.he + ' · ' + d.name + ' (' + d.items.length + ' תרגילים)? הימים שלו בשבוע יהפכו למנוחה.')) return;
      pl.days.splice(pl.days.indexOf(d), 1); pl.week = pl.week.map(function (x) { return String(x) === String(d.idx) ? null : x; });
      if (String(curDayIdx) === String(d.idx)) curDayIdx = pl.days[0] ? pl.days[0].idx : null;
      savePlan(); toast('האימון נמחק'); renderAllPlan();
    }); });
    $('#cardioNote').textContent = p.cardio;
    var rows = volumeRows(), max = 24;
    $('#vol').innerHTML = rows.map(function (r) {
      var cls = r.sets >= 15 ? 'hi' : r.sets >= 10 ? 'ok' : 'lo', lbl = cls === 'hi' ? 'גבוה' : cls === 'ok' ? 'מאוזן' : 'נמוך';
      return '<div class="vrow"><div class="vn">' + esc(r.he) + '</div><div class="vbar" title="' + r.sets + ' סטים/שבוע"><i style="width:' + Math.min(100, r.sets / max * 100) + '%"></i><span class="lm" style="inset-inline-start:' + (10 / max * 100) + '%"></span><span class="lm" style="inset-inline-start:' + (20 / max * 100) + '%"></span></div><div class="row" style="gap:6px;flex-wrap:nowrap"><span class="vsets num">' + r.sets + '</span><span class="vtag ' + cls + '">' + lbl + '</span></div></div>';
    }).join('');
    $('#coverage').textContent = p.coverage;
    // duplicates
    var dups = dupMap(), ids = Object.keys(dups).filter(function (id) { return dups[id].length > 1; });
    $('#dups').innerHTML = ids.length ? ids.map(function (id) {
      var e = EX[id] || {};
      return '<div class="dup">' + thumbHtml(id, null) + '<div><div class="dn">' + esc(e.he || id) + '</div><div class="de">' + esc(e.en || '') + '</div><div class="path">' +
        dups[id].map(function (o, j) { return (j ? '<span class="arr">⇄</span>' : '') + '<span class="pill">' + esc(o.day.he) + ' <small>· תרגיל ' + o.n + '</small></span>'; }).join('') + '</div></div></div>';
    }).join('') : '<div class="empty">אין תרגילים כפולים בתוכנית</div>';
  }
  function openWeekSheet(i) {
    var pl = plan(), cur = pl.week[i];
    var html = '<h3>יום ' + (i + 1) + ' בשבוע</h3><p class="lead">מה מתאמנים ביום הזה?</p>' +
      '<button type="button" class="opt' + (cur == null ? ' sel' : '') + '" data-set="__rest"><span class="oi">·</span><span class="ot"><b>מנוחה</b><span>יום ללא אימון</span></span></button>' +
      pl.days.map(function (d) { return '<button type="button" class="opt' + (String(cur) === String(d.idx) ? ' sel' : '') + '" data-set="' + esc(d.idx) + '"><span class="oi">' + esc(String(d.idx)) + '</span><span class="ot"><b>' + esc(d.he) + ' · ' + esc(d.name) + '</b><span>' + d.items.length + ' תרגילים</span></span></button>'; }).join('') +
      '<button type="button" class="opt" data-set="__new"><span class="oi">+</span><span class="ot"><b>אימון חדש</b><span>יוצר יום אימון ריק ומשבץ אותו כאן</span></span></button>';
    openSheet(html, function (root) {
      $$('[data-set]', root).forEach(function (b) { b.addEventListener('click', function () {
        var v = b.dataset.set;
        if (v === '__rest') pl.week[i] = null;
        else if (v === '__new') { var d = newDay(); if (!d) return; pl.week[i] = d.idx; }
        else pl.week[i] = /^\d+$/.test(v) ? +v : v;
        savePlan(); closeSheet(); renderAllPlan();
      }); });
    });
  }
  function newDay() {
    var name = prompt('שם האימון החדש (למשל: "רגליים ב׳" או "Full Body D"):'); if (!name || !name.trim()) return null;
    var idx = newDayIdx(), d = { idx: idx, he: dayLabel(idx), name: name.trim(), en: '', focus: '', items: [] };
    plan().days.push(d); savePlan(); toast(d.he + ' נוצר — הוסיפו לו תרגילים בלשונית "אימון"'); return d;
  }
  $('#addDayBtn').addEventListener('click', function () {
    var d = newDay(); if (!d) return;
    var pl = plan(), free = pl.week.indexOf(null); if (free >= 0) pl.week[free] = d.idx;
    curDayIdx = d.idx; store.set(pk('day'), curDayIdx); savePlan(); renderAllPlan();
  });
  $('#resetPlanBtn').addEventListener('click', function () {
    if (!confirm('לאפס את התוכנית של ' + prof().name + ' למבנה המקורי? ההיסטוריה של המשקלים נשמרת.')) return;
    store.del(pk('plan')); S.plan = null; curDayIdx = null; S.open = {}; toast('התוכנית אופסה'); renderAllPlan();
  });

  // ---------- muscles view ----------
  function muscleUse(k) {
    var pri = [], asst = [], sets = 0;
    plan().days.forEach(function (d) { d.items.forEach(function (it) {
      var e = EX[it.id] || {};
      if ((e.mp || []).indexOf(k) >= 0) { pri.push({ it: it, day: d }); sets += it.sets; } else if ((e.ma || []).indexOf(k) >= 0) asst.push({ it: it, day: d });
    }); });
    return { pri: pri, asst: asst, sets: sets };
  }
  function renderMuscles() {
    ['front', 'back'].forEach(function (side) {
      $('#m' + side).innerHTML = D.MUSCLES.filter(function (m) { return m.side === side; }).map(function (m) {
        var u = muscleUse(m.k);
        return '<button type="button" class="mus' + (u.pri.length || u.asst.length ? '' : ' empty') + '" data-k="' + m.k + '" aria-pressed="' + (S.muscle === m.k) + '"><span class="mh">' + esc(m.he) + '</span><span class="me">' + esc(m.en) + '</span><span class="ms">' + (u.pri.length ? u.sets + ' סטים/שבוע · ' + u.pri.length + ' תרגילים' : u.asst.length ? 'מסייע ב-' + u.asst.length + ' תרגילים' : 'לא מאומן ישירות') + '</span></button>';
      }).join('');
    });
    $$('.mus').forEach(function (b) { b.addEventListener('click', function () { S.muscle = S.muscle === b.dataset.k ? null : b.dataset.k; renderMuscles(); if (S.muscle) $('#mdetail').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }); });
    var det = $('#mdetail');
    if (!S.muscle) { det.hidden = true; return; }
    var m = D.MUSCLES.filter(function (x) { return x.k === S.muscle; })[0], u = muscleUse(S.muscle);
    var li = function (o, as) { return '<li><span>' + esc(info(o.it).he) + (as ? ' <span class="as">מסייע</span>' : '') + '</span><span class="as">' + esc(o.day.he) + ' · ' + o.it.sets + '×' + esc(o.it.reps) + '</span></li>'; };
    det.hidden = false;
    det.innerHTML = '<div class="row" style="justify-content:space-between"><h3 style="margin:0;font-size:18px">' + esc(m.he) + ' <span style="color:var(--accent);font-size:13px;direction:ltr">' + esc(m.en) + '</span></h3><span class="vtag ' + (u.sets >= 15 ? 'hi' : u.sets >= 10 ? 'ok' : 'lo') + '">' + u.sets + ' סטים/שבוע</span></div>' +
      (u.pri.length || u.asst.length ? '<ul>' + u.pri.map(function (o) { return li(o, false); }).join('') + u.asst.map(function (o) { return li(o, true); }).join('') + '</ul>' : '<p class="note">אין תרגיל בתוכנית שמכוון לשריר הזה ישירות.</p>');
  }

  // ---------- log view ----------
  function renderLog() {
    var h = hist(), ids = [];
    plan().days.forEach(function (d) { d.items.forEach(function (it) { if (ids.indexOf(it.id) < 0) ids.push(it.id); }); });
    Object.keys(h).forEach(function (id) { if (ids.indexOf(id) < 0 && EX[id]) ids.push(id); });
    var sel = $('#logEx'), prev = sel.value;
    sel.innerHTML = ids.map(function (id) { return '<option value="' + esc(id) + '">' + esc(EX[id].he) + (h[id] ? ' (' + h[id].length + ')' : '') + '</option>'; }).join('');
    var withHist = ids.filter(function (id) { return h[id]; });
    sel.value = ids.indexOf(prev) >= 0 ? prev : (withHist[0] || ids[0] || '');
    drawLog(sel.value);
  }
  function drawLog(id) {
    var arr = (hist()[id] || []), svg = $('#spark'), kpi = $('#kpi'), hs = $('#hist');
    if (!arr.length) { svg.innerHTML = ''; kpi.innerHTML = ''; hs.innerHTML = '<div class="empty">עוד אין היסטוריה לתרגיל הזה. סמנו סטים באימון — אחרי "סיים אימון" הם יופיעו כאן.</div>'; return; }
    var tops = arr.map(function (e) { return Math.max.apply(null, e.sets.map(function (s) { return +s.w || 0; })); });
    var vols = arr.map(function (e) { return e.sets.reduce(function (a, s) { return a + (+s.w || 0) * (+s.r || 0); }, 0); });
    var W = 320, H = 64, pad = 8, n = tops.length, mn = Math.min.apply(null, tops), mx = Math.max.apply(null, tops);
    var x = function (i) { return n === 1 ? W / 2 : pad + (W - 2 * pad) * (n - 1 - i) / (n - 1); };
    var y = function (v) { return mx === mn ? H / 2 : H - pad - (H - 2 * pad) * (v - mn) / (mx - mn); };
    var pts = tops.map(function (v, i) { return x(i) + ',' + y(v); }).join(' ');
    svg.innerHTML = (n > 1 ? '<polygon points="' + pts + ' ' + x(n - 1) + ',' + (H - 2) + ' ' + x(0) + ',' + (H - 2) + '" fill="var(--accent)" opacity=".08"/>' : '') +
      '<polyline points="' + pts + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + x(n - 1) + '" cy="' + y(tops[n - 1]) + '" r="4" fill="var(--accent)" stroke="var(--paper)" stroke-width="2"/>';
    kpi.innerHTML = '<div><div class="kv num">' + n + '</div><div class="kl">אימונים</div></div><div><div class="kv num">' + mx + '</div><div class="kl">שיא ק״ג</div></div><div><div class="kv num">' + vols[n - 1] + '</div><div class="kl">נפח אחרון (ק״ג×חזרות)</div></div>';
    hs.innerHTML = arr.slice().reverse().map(function (e) {
      return '<div class="hrow"><div><div class="hn">' + fmtDate(e.d) + ' <span class="hs">· ' + esc(dayLabel(e.day)) + '</span></div><div class="hs num">' + e.sets.map(function (s) { return (s.w != null ? s.w + '×' : '') + (s.r != null ? s.r : '—'); }).join(' · ') + '</div></div><div class="vsets num">' + Math.max.apply(null, e.sets.map(function (s) { return +s.w || 0; })) + ' ק״ג</div></div>';
    }).join('');
  }
  $('#logEx').addEventListener('change', function () { drawLog(this.value); });
  $('#exportBtn').addEventListener('click', function () {
    var out = {}; ['hist', 'session', 'plan', 'day'].forEach(function (k) { var v = store.get(pk(k), null); if (v != null) out[k] = v; });
    var txt = JSON.stringify({ profile: S.profile, v: 2, data: out });
    var done = function () { toast('הגיבוי הועתק — שמרו אותו בהודעה לעצמכם'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { prompt('העתיקו את הטקסט:', txt); }); else prompt('העתיקו את הטקסט:', txt);
  });
  $('#importBtn').addEventListener('click', function () {
    var txt = prompt('הדביקו כאן את טקסט הגיבוי:'); if (!txt) return;
    try { var o = JSON.parse(txt); if (!o || !o.data) throw 0; Object.keys(o.data).forEach(function (k) { store.set(pk(k), o.data[k]); }); S.plan = null; curDayIdx = store.get(pk('day'), null); toast('הגיבוי שוחזר'); renderAll(); }
    catch (e) { toast('הטקסט לא תקין — נסו שוב'); }
  });
  $('#wipeBtn').addEventListener('click', function () {
    if (!confirm('למחוק את כל ההיסטוריה של ' + prof().name + ' במכשיר הזה?')) return;
    ['hist', 'session'].forEach(function (k) { store.del(pk(k)); }); toast('ההיסטוריה נמחקה'); renderWorkout(); renderLog();
  });

  // ---------- more view ----------
  function renderMore() {
    $('#glossary').innerHTML = D.GLOSSARY.map(function (g) { return '<div><b>' + esc(g.t) + '</b> — ' + esc(g.d) + '</div>'; }).join('');
    $('#faq').innerHTML = D.FAQ.map(function (f) { return '<details class="qa"><summary><i>?</i>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; }).join('');
    calcNutrition();
  }
  function calcNutrition() {
    var sex = $('#nSex').value, age = +$('#nAge').value, h = +$('#nH').value, w = +$('#nW').value, act = +$('#nAct').value, goal = +$('#nGoal').value, el = $('#macros');
    if (!(age > 0 && h > 0 && w > 0)) { el.innerHTML = '<div style="grid-column:1/-1;text-align:right;color:var(--muted);font-size:13px">מלאו גיל, גובה ומשקל לחישוב.</div>'; return; }
    var bmr = Math.round(10 * w + 6.25 * h - 5 * age + (sex === 'm' ? 5 : -161)), tdee = Math.round(bmr * act), target = Math.round(tdee * (1 + goal));
    var prot = Math.round(w * 2.1), fat = Math.round(w * 0.85), carbs = Math.max(0, Math.round((target - prot * 4 - fat * 9) / 4));
    el.innerHTML = '<div><div class="kv num">' + bmr.toLocaleString() + '</div><div class="kl">BMR</div></div><div><div class="kv num">' + tdee.toLocaleString() + '</div><div class="kl">TDEE (תחזוקה)</div></div><div><div class="kv num" style="color:var(--accent)">' + target.toLocaleString() + '</div><div class="kl">יעד קלוריות</div></div>' +
      '<div><div class="kv num">' + prot + ' ג׳</div><div class="kl">חלבון</div></div><div><div class="kv num">' + fat + ' ג׳</div><div class="kl">שומן</div></div><div><div class="kv num">' + carbs + ' ג׳</div><div class="kl">פחמימות</div></div><div><div class="kv num">' + Math.round(prot / 4) + '–' + Math.round(prot / 3) + ' ג׳</div><div class="kl">חלבון לארוחה (3–4)</div></div>';
  }
  $$('#nSex,#nAge,#nH,#nW,#nAct,#nGoal').forEach(function (i) { i.addEventListener('input', calcNutrition); i.addEventListener('change', calcNutrition); });

  // ---------- floating bar: clock · stopwatch · rest ----------
  var T = { restEnd: 0, restTotal: 0, fired: true, ctx: null };
  var SW = store.get('sw', { run: false, start: 0, acc: 0 });
  function swMs() { return SW.acc + (SW.run ? Date.now() - SW.start : 0); }
  function fmtMs(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + pad2(s % 60); }
  function beep() {
    try {
      T.ctx = T.ctx || new (window.AudioContext || window.webkitAudioContext)();
      var c = T.ctx, t = c.currentTime;
      [0, .18, .36].forEach(function (off) { var o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(0.0001, t + off); g.gain.exponentialRampToValueAtTime(0.4, t + off + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + off + .15); o.connect(g); g.connect(c.destination); o.start(t + off); o.stop(t + off + .16); });
    } catch (e) {}
  }
  function startRest(sec, label) {
    try { T.ctx = T.ctx || new (window.AudioContext || window.webkitAudioContext)(); if (T.ctx.state === 'suspended') T.ctx.resume(); } catch (e) {}
    T.restTotal = sec; T.restEnd = Date.now() + sec * 1000; T.fired = false;
    $('#fRestLbl').textContent = 'מנוחה · ' + label;
    $('#bar').classList.remove('over'); setBar(true); tick();
  }
  function setBar(open) { $('#bar').classList.toggle('open', open); $('#barToggle').setAttribute('aria-expanded', String(open)); }
  function tick() {
    var now = new Date(), clk = pad2(now.getHours()) + ':' + pad2(now.getMinutes()) + ':' + pad2(now.getSeconds());
    $('#mClock').textContent = clk; $('#fClock').textContent = clk;
    var sw = fmtMs(swMs()); $('#mSw').textContent = sw; $('#fSw').textContent = sw; $('#swStart').textContent = SW.run ? '❙❙' : '▶';
    var bar = $('#bar'), wrap = $('#mRestWrap');
    if (T.restEnd) {
      var left = Math.ceil((T.restEnd - Date.now()) / 1000);
      if (left <= 0) {
        $('#mRest').textContent = '0:00'; $('#fRest').textContent = '0:00'; wrap.classList.remove('idle');
        if (!T.fired) { T.fired = true; bar.classList.add('over'); $('#fRestLbl').textContent = 'הזמן נגמר — לסט הבא!'; beep(); if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]); setTimeout(function () { if (bar.classList.contains('over')) { bar.classList.remove('over'); T.restEnd = 0; setBar(false); tick(); } }, 8000); }
      } else { var t = Math.floor(left / 60) + ':' + pad2(left % 60); $('#mRest').textContent = t; $('#fRest').textContent = t; wrap.classList.remove('idle'); }
    } else { $('#mRest').textContent = '—'; $('#fRest').textContent = '—'; $('#fRestLbl').textContent = 'מנוחה'; wrap.classList.add('idle'); }
  }
  setInterval(tick, 250); tick();
  $('#barToggle').addEventListener('click', function () { setBar(!$('#bar').classList.contains('open')); });
  $('#swStart').addEventListener('click', function () { if (SW.run) { SW.acc += Date.now() - SW.start; SW.run = false; } else { SW.start = Date.now(); SW.run = true; } store.set('sw', SW); tick(); });
  $('#swReset').addEventListener('click', function () { SW = { run: false, start: 0, acc: 0 }; store.set('sw', SW); tick(); });
  $('#tPlus').addEventListener('click', function () { T.restEnd = Math.max(T.restEnd, Date.now()) + 30000; T.restTotal += 30; T.fired = false; $('#bar').classList.remove('over'); tick(); });
  $('#tStop').addEventListener('click', function () { T.restEnd = 0; T.fired = true; $('#bar').classList.remove('over'); tick(); });

  // ---------- navigation ----------
  function showView(v) {
    S.view = v;
    $$('.view').forEach(function (s) { s.classList.toggle('on', s.id === 'v-' + v); });
    $$('.tabs button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === v)); });
    window.scrollTo(0, 0);
  }
  $$('.tabs button').forEach(function (b) { b.addEventListener('click', function () { showView(b.dataset.v); }); });
  $$('#profileSeg button').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.p === S.profile) return;
      commitSession(true);
      S.profile = b.dataset.p; store.set('profile', S.profile); S.plan = null; S.open = {}; S.muscle = null;
      curDayIdx = store.get(pk('day'), null);
      applyTheme(); renderAll(); toast('התוכנית של ' + prof().name);
    });
  });
  var toastT;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2200); }

  function renderAllPlan() { renderWorkout(); renderPlan(); renderMuscles(); renderLog(); }
  function renderAll() { renderHero(); renderAllPlan(); renderMore(); }
  applyTheme(); renderAll();
})();
