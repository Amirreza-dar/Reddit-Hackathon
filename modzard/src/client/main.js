/* ── Tabs ────────────────────────────────────────────── */
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('panel-' + t.dataset.tab).classList.add('active');
  });
});

/* ── Helpers ─────────────────────────────────────────── */
const $    = id => document.getElementById(id);
const show = id => $(id).classList.remove('hidden');
const hide = id => $(id).classList.add('hidden');
const txt  = (id, v) => { $(id).textContent = v; };
const wait = ms => new Promise(r => setTimeout(r, ms));

function step(id, s) {
  const el = $(id);
  el.classList.remove('active', 'done');
  if (s) el.classList.add(s);
}

/* ── Textarea ────────────────────────────────────────── */
const ta   = $('ta');
const abtn = $('abtn');

ta.addEventListener('input', () => {
  const n = ta.value.length;
  txt('ch', n + ' / 300');
  abtn.disabled = n < 8;
});

/* ── Render helpers ──────────────────────────────────── */
function pct(n) { return Math.round(n * 100) + '%'; }
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function conflictCard(c) {
  const hard = c.level === 'conflict';
  const d = document.createElement('div');
  d.className = 'rcard';
  d.innerHTML =
    '<div class="rdot ' + (hard ? 'rdot-r' : 'rdot-a') + '"></div>' +
    '<div class="rbody">' +
      '<div class="rtitle">' + esc(c.existingRuleId) + '</div>' +
      '<div class="rreason">' + esc(c.reason.split('. scopeOverlap=')[0]) + '</div>' +
      '<div class="rmeta"><span class="chip">' + (hard ? '⛔ Hard conflict' : '⚠️ Possible conflict') + '</span></div>' +
    '</div>' +
    '<div class="sbar-wrap">' +
      '<div class="snum">' + pct(c.score) + '</div>' +
      '<div class="sbar"><div class="sfill ' + (hard ? 'sf-r' : 'sf-a') + '" style="width:' + (c.score * 100) + '%"></div></div>' +
    '</div>';
  return d;
}

function postCard(p) {
  const hard = p.level === 'affected';
  const d = document.createElement('div');
  d.className = 'rcard rcard-click';
  d.innerHTML =
    '<div class="rdot ' + (hard ? 'rdot-r' : 'rdot-a') + '"></div>' +
    '<div class="rbody">' +
      '<div class="rtitle">' + esc(p.title || p.postId) + '</div>' +
      '<div class="rauthor">u/' + esc(p.author || 'unknown') + ' · ' + esc(p.postId) + '</div>' +
      '<div class="rreason">' + esc(p.reason) + '</div>' +
      '<div class="rmeta"><span class="chip">' + (hard ? '🔴 Affected' : '🟡 Possibly affected') + '</span></div>' +
    '</div>' +
    '<div class="sbar-wrap">' +
      '<div class="snum">' + pct(p.score) + '</div>' +
      '<div class="sbar"><div class="sfill ' + (hard ? 'sf-r' : 'sf-a') + '" style="width:' + (p.score * 100) + '%"></div></div>' +
    '</div>';
  d.addEventListener('click', () => openPostPopup(p));
  return d;
}

function ruleItem(r, i) {
  const d = document.createElement('div');
  d.className = 'ritem';
  const kindLabel = r.kind === 'link' ? 'Posts only' : r.kind === 'comment' ? 'Comments only' : 'All content';
  d.innerHTML =
    '<div class="rnum">' + (i + 1) + '</div>' +
    '<div class="rinfo">' +
      '<div class="rname">' + esc(r.shortName) + '</div>' +
      '<div class="rdesc">' + esc(r.description || 'No description.') + '</div>' +
      '<div class="rkind">' + kindLabel + '</div>' +
    '</div>';
  return d;
}

/* ── Analytics ───────────────────────────────────────── */
const ORANGE = '#FF4500', AMBER = '#FFBE3D', GREEN = '#00BA7C', RED = '#FF585B', BLUE = '#0079D3';
const GRAY   = '#EDEFF1', META  = '#878A8C';

function impactGauge(score, color) {
  const r = 34, cx = 44, cy = 44, stroke = 7;
  const circ = 2 * Math.PI * r;
  const dash = circ * score / 100;
  return `<svg width="88" height="88" viewBox="0 0 88 88">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${GRAY}" stroke-width="${stroke}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
      stroke-dasharray="${dash} ${circ}" stroke-linecap="round"
      transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="18" font-weight="800"
      fill="${color}" font-family="-apple-system,sans-serif">${score}</text>
    <text x="${cx}" y="${cy + 11}" text-anchor="middle" font-size="9"
      fill="${META}" font-family="-apple-system,sans-serif">/ 100</text>
  </svg>`;
}

function hBar(label, count, max, color, extra) {
  const pct = max > 0 ? Math.max(3, Math.round(count / max * 100)) : 0;
  const d = document.createElement('div');
  d.className = 'chart-row';
  d.innerHTML =
    `<div class="chart-lbl${extra ? ' chart-lbl-wide' : ''}" title="${esc(label)}">${esc(label)}</div>` +
    `<div class="chart-bar-bg"><div class="chart-bar-fill" style="width:${pct}%;background:${color}"></div></div>` +
    `<div class="chart-cnt">${count}</div>`;
  return d;
}

function parseSignals(posts) {
  const counts = { keyword: 0, cluster: 0, semantic: 0, flair: 0, domain: 0 };
  for (const p of posts) {
    const r = p.reason || '';
    if (/title keywords|body keywords/.test(r))       counts.keyword++;
    if (/title topic signals|body topic signals/.test(r)) counts.cluster++;
    if (/title semantic|body semantic/.test(r))        counts.semantic++;
    if (/flair/.test(r))                               counts.flair++;
    if (/domain/.test(r))                              counts.domain++;
  }
  return counts;
}

function renderAnalytics(data) {
  const posts     = data.affectedPosts || [];
  const scanned   = data.postsScanned  || 0;
  const conflicts = data.conflicts     || [];

  if (scanned === 0 && posts.length === 0) return;

  // ── Summary stats ──────────────────────────────────────
  const hitRate = scanned > 0 ? posts.length / scanned : 0;
  const avgScore = posts.length > 0 ? posts.reduce((s, p) => s + p.score, 0) / posts.length : 0;
  txt('an-scanned',  scanned);
  txt('an-affected', posts.length);
  txt('an-rate',     Math.round(hitRate * 100) + '%');
  txt('an-avg',      Math.round(avgScore * 100) + '%');
  txt('analytics-tc', posts.length || '0');

  // ── Impact score (0–100) ───────────────────────────────
  // hitRate (40pts) + avgScore (40pts) + conflict density (20pts)
  const impactScore = Math.min(100, Math.round(
    hitRate * 40 + avgScore * 40 + Math.min(1, conflicts.length / 5) * 20
  ) * 100 / 100);
  const gaugeColor  = impactScore >= 60 ? RED : impactScore >= 30 ? AMBER : GREEN;
  const gaugeLabel  = impactScore >= 60 ? 'High impact' : impactScore >= 30 ? 'Moderate impact' : 'Low impact';
  const gaugeDesc   = impactScore >= 60
    ? 'This rule would significantly affect existing content. Review carefully before adding.'
    : impactScore >= 30
    ? 'This rule has moderate reach. Consider the affected authors before activating.'
    : 'This rule has minimal overlap with recent posts. Safe to consider adding.';
  $('an-gauge').innerHTML = impactGauge(impactScore, gaugeColor);
  $('an-impact-label').textContent = gaugeLabel;
  $('an-impact-label').style.color = gaugeColor;
  $('an-impact-desc').textContent  = gaugeDesc;

  // ── Score distribution ─────────────────────────────────
  const buckets = [
    { label: '80–100%  Affected',   min: 0.80, color: RED   },
    { label: '60–80%   Affected',   min: 0.60, color: '#FF7048' },
    { label: '40–60%   Possible',   min: 0.40, color: AMBER  },
    { label: '20–40%   Weak match', min: 0.20, color: '#FFD54F' },
  ];
  const bucketCounts = buckets.map(b => ({
    ...b,
    count: posts.filter(p => p.score >= b.min && (b.min === 0.80 || p.score < b.min + 0.20)).length,
  }));
  const maxBucket = Math.max(1, ...bucketCounts.map(b => b.count));
  const distEl = $('an-dist');
  distEl.innerHTML = '';
  bucketCounts.forEach(b => b.count > 0 && distEl.appendChild(hBar(b.label, b.count, maxBucket, b.color)));
  if (distEl.children.length === 0) distEl.innerHTML = '<div style="font-size:11px;color:var(--meta)">No affected posts yet.</div>';

  // ── Top authors ────────────────────────────────────────
  const authorMap = {};
  posts.forEach(p => { authorMap[p.author] = (authorMap[p.author] || 0) + 1; });
  const topAuthors = Object.entries(authorMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxAuthor  = topAuthors[0]?.[1] || 1;
  const authEl = $('an-authors');
  authEl.innerHTML = '';
  if (topAuthors.length === 0) {
    authEl.innerHTML = '<div style="font-size:11px;color:var(--meta)">—</div>';
  } else {
    topAuthors.forEach(([author, count]) =>
      authEl.appendChild(hBar('u/' + author, count, maxAuthor, BLUE, true)));
  }

  // ── Post types ─────────────────────────────────────────
  const typeColors = { text: GREEN, link: BLUE, image: ORANGE, comment: AMBER };
  const typeMap = {};
  posts.forEach(p => { typeMap[p.postType || 'text'] = (typeMap[p.postType || 'text'] || 0) + 1; });
  const typeEl = $('an-types');
  typeEl.innerHTML = '';
  const typeRow = document.createElement('div');
  typeRow.className = 'type-row';
  Object.entries(typeMap).forEach(([type, count]) => {
    const pill = document.createElement('div');
    pill.className = 'type-pill';
    const pct2 = posts.length > 0 ? Math.round(count / posts.length * 100) : 0;
    pill.innerHTML = `<div class="type-dot" style="background:${typeColors[type] || GRAY}"></div>${esc(type)} ${pct2}%`;
    typeRow.appendChild(pill);
  });
  if (typeRow.children.length === 0) typeRow.innerHTML = '<div style="font-size:11px;color:var(--meta)">—</div>';
  typeEl.appendChild(typeRow);

  // ── Match signals ──────────────────────────────────────
  const signals = parseSignals(posts);
  const sigLabels = {
    keyword:  { label: 'Direct keyword', color: RED    },
    cluster:  { label: 'Topic cluster',  color: ORANGE },
    semantic: { label: 'Semantic/vector', color: BLUE  },
    flair:    { label: 'Flair match',    color: GREEN  },
    domain:   { label: 'Domain match',   color: AMBER  },
  };
  const sigEl = $('an-signals');
  sigEl.innerHTML = '';
  const sigRow = document.createElement('div');
  sigRow.className = 'signal-row';
  let hasAny = false;
  Object.entries(signals).forEach(([key, count]) => {
    if (count === 0) return;
    hasAny = true;
    const info = sigLabels[key];
    const pill = document.createElement('div');
    pill.className = 'signal-pill';
    pill.style.borderColor = info.color;
    pill.style.color = info.color;
    pill.style.background = info.color + '14';
    pill.textContent = `${info.label} ×${count}`;
    sigRow.appendChild(pill);
  });
  if (!hasAny) sigRow.innerHTML = '<div style="font-size:11px;color:var(--meta)">No signal data.</div>';
  sigEl.appendChild(sigRow);

  // ── Rule conflicts summary ─────────────────────────────
  if (conflicts.length > 0) {
    show('an-conflicts-section');
    const confEl = $('an-conflicts-chart');
    confEl.innerHTML = '';
    const maxScore = Math.max(...conflicts.map(c => c.score), 0.01);
    conflicts.slice(0, 5).forEach(c => {
      const col = c.level === 'conflict' ? RED : AMBER;
      confEl.appendChild(hBar(c.existingRuleId, Math.round(c.score * 100), Math.round(maxScore * 100), col, true));
    });
  } else {
    hide('an-conflicts-section');
  }

  // Show analytics body
  hide('analytics-empty');
  show('analytics-body');
}

/* ── Post popup ──────────────────────────────────────── */
function openPostPopup(p) {
  const hard = p.level === 'affected';
  $('popup-title').textContent  = p.title  || p.postId;
  $('popup-author').textContent = 'u/' + (p.author || 'unknown') + '  ·  ' + p.postId;
  $('popup-body').textContent   = p.body   || '(no body text)';
  $('popup-reason').textContent = p.reason;
  const badge = $('popup-badge');
  badge.textContent  = hard ? '🔴 Affected' : '🟡 Possibly affected';
  badge.className    = 'chip ' + (hard ? 'chip-r' : 'chip-a');
  $('popup-score').textContent = pct(p.score);
  show('post-popup');
}
$('popup-close').addEventListener('click', () => hide('post-popup'));
$('popup-overlay').addEventListener('click', () => hide('post-popup'));

/* ── Rules: load on startup ──────────────────────────── */
function renderRules(rules) {
  const rl = $('rules-list');
  rl.innerHTML = '';
  if (rules.length) {
    $('rules-empty').classList.add('hidden');
    rl.classList.remove('hidden');
    rules.forEach((r, i) => rl.appendChild(ruleItem(r, i)));
    txt('rules-tc', rules.length);
  } else {
    $('rules-empty').classList.remove('hidden');
    rl.classList.add('hidden');
    txt('rules-tc', '0');
  }
}

(async () => {
  try {
    const res = await fetch('/api/subreddit-rules');
    if (!res.ok) return;
    const data = await res.json();
    if (data.subredditName) txt('sub-badge', 'r/' + data.subredditName);
    renderRules(data.rules || []);
  } catch (_) { /* silently skip if offline or during build */ }
})();

/* ── Analyze ─────────────────────────────────────────── */
abtn.addEventListener('click', async () => {
  const text = ta.value.trim();
  if (!text) return;

  abtn.disabled = true;
  $('abtn-lbl').innerHTML = '<div class="spin"></div>';
  hide('st-empty'); hide('st-results'); show('st-load');
  step('s1', 'active'); step('s2', ''); step('s3', '');

  try {
    await wait(350); step('s1', 'done'); step('s2', 'active');
    await wait(300); step('s2', 'done'); step('s3', 'active');

    const res = await fetch('/api/conflict-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newRuleText: text }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(errBody.error || 'HTTP ' + res.status);
    }

    const data = await res.json();
    step('s3', 'done');
    await wait(180);

    if (data.subredditName) txt('sub-badge', 'r/' + data.subredditName);

    const nr = data.newRule || {};
    txt('p-act', nr.action || '—');
    txt('p-tgt', nr.target || '—');

    if (nr.effect) {
      txt('p-eff', nr.effect.replace(/_/g, ' '));
      show('p-eff-row');
    } else {
      hide('p-eff-row');
    }

    const kws = (nr.condition && nr.condition.keywords) ? nr.condition.keywords : [];
    const kwEl = $('p-kws');
    kwEl.innerHTML = '';
    if (kws.length) {
      kws.slice(0, 7).forEach(k => {
        const s = document.createElement('span');
        s.className = 'pill pill-k';
        s.textContent = k;
        kwEl.appendChild(s);
      });
      show('p-kw-row');
    } else {
      hide('p-kw-row');
    }

    const cl = $('c-list');
    cl.innerHTML = '';
    const conflicts = data.conflicts || [];
    txt('c-ct', conflicts.length);
    if (conflicts.length === 0) {
      show('c-ok');
    } else {
      hide('c-ok');
      conflicts.forEach(c => cl.appendChild(conflictCard(c)));
    }

    const pl = $('p-list');
    pl.innerHTML = '';
    const posts = data.affectedPosts || [];
    txt('p-ct', posts.length);
    if (posts.length === 0) {
      show('p-ok');
    } else {
      hide('p-ok');
      posts.forEach(p => pl.appendChild(postCard(p)));
    }

    renderRules(data.existingRules || []);
    renderAnalytics(data);

    hide('st-load');
    show('st-results');

  } catch (err) {
    hide('st-load');
    $('st-empty').querySelector('.empty-ico').textContent = '⚠️';
    $('st-empty').querySelector('.empty-ttl').textContent = 'Analysis failed';
    $('st-empty').querySelector('.empty-dsc').textContent = err.message;
    show('st-empty');
  } finally {
    abtn.disabled = false;
    txt('abtn-lbl', 'Analyze');
  }
});
