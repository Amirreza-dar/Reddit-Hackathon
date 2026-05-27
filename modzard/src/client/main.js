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

/* ── Insights tab ────────────────────────────────────── */
const insRunBtn = $('ins-run-btn');

function insStep(id, s) {
  const el = $(id);
  el.classList.remove('active', 'done');
  if (s) el.classList.add(s);
}

function insSignalCard(sig) {
  const sevColor = { high: '#FF585B', medium: '#FFBE3D', low: '#00BA7C' };
  const color = sevColor[sig.severity] || '#878A8C';
  const d = document.createElement('div');
  d.className = 'rcard';
  const examples = (sig.examples || []).slice(0, 2).map(e => `"${esc(e)}"`).join(', ');
  d.innerHTML =
    `<div class="rdot" style="background:${color};box-shadow:0 0 0 3px ${color}22"></div>` +
    `<div class="rbody">` +
      `<div class="rtitle">${esc(sig.topic)}</div>` +
      `<div class="rreason">${examples || 'No examples'}</div>` +
      `<div class="rmeta"><span class="chip sev-${sig.severity}">${sig.severity} severity</span>` +
      `<span class="chip">${sig.frequency} posts</span></div>` +
    `</div>`;
  return d;
}

function insClusterCard(cl, onDraft) {
  const d = document.createElement('div');
  d.className = 'cluster-card';
  const kwHtml = (cl.commonKeywords || []).slice(0, 6)
    .map(k => `<span class="cluster-kw">${esc(k)}</span>`).join('');
  const ex = (cl.examples || [])[0] || '';
  d.innerHTML =
    `<div class="cluster-label">${esc(cl.label)}</div>` +
    `<div class="cluster-meta">${cl.postCount} posts</div>` +
    `<div class="cluster-kws">${kwHtml}</div>` +
    (ex ? `<div class="cluster-example">${esc(ex)}</div>` : '') +
    (cl.suggestedRule
      ? `<button class="cluster-draft-btn">Draft suggested rule →</button>`
      : '');
  if (cl.suggestedRule) {
    d.querySelector('.cluster-draft-btn').addEventListener('click', () => onDraft(cl.suggestedRule));
  }
  return d;
}

function insSuggRuleItem(text, onDraft) {
  const d = document.createElement('div');
  d.className = 'sugg-rule-item';
  d.innerHTML =
    `<div class="sugg-rule-text">${esc(text)}</div>` +
    `<button class="sugg-draft-btn">Draft →</button>`;
  d.querySelector('.sugg-draft-btn').addEventListener('click', () => onDraft(text));
  return d;
}

function draftRuleInAnalyze(ruleText) {
  // Switch to Analyze tab and populate textarea
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
  document.querySelector('[data-tab="analyze"]').classList.add('active');
  $('panel-analyze').classList.add('active');
  const ta = $('ta');
  ta.value = ruleText;
  ta.dispatchEvent(new Event('input'));
  ta.focus();
}

function renderInsights(data) {
  const local = data.localSummary || {};
  const llm   = data.llmAnalysis  || {};

  // Stats
  txt('ins-count',      data.postsAnalyzed || 0);
  txt('ins-signals-ct', (llm.signals  || []).length);
  txt('ins-clusters-ct',(llm.clusters || []).length);
  txt('ins-rules-ct',   (llm.suggestedRules || []).length);
  txt('insights-tc',    (llm.signals || []).length || '—');

  // Summary
  $('ins-summary-text').textContent = llm.summary || 'No summary available.';

  // Top keywords bar chart
  const kwEl = $('ins-keywords-chart');
  kwEl.innerHTML = '';
  const topKw = (local.topKeywords || []).slice(0, 12);
  const maxKw  = topKw[0]?.count || 1;
  if (topKw.length === 0) {
    kwEl.innerHTML = '<div style="font-size:11px;color:var(--meta)">No keywords found.</div>';
  } else {
    topKw.forEach(k => kwEl.appendChild(hBar(k.word, k.count, maxKw, ORANGE)));
  }

  // Topic distribution
  const topicsEl = $('ins-topics-chart');
  topicsEl.innerHTML = '';
  const topicEntries = Object.entries(local.topicCounts || {}).sort((a, b) => b[1] - a[1]);
  const maxTopic = topicEntries[0]?.[1] || 1;
  const topicColors = { politics: RED, medical: GREEN, spam: AMBER, hate: '#FF585B', media: BLUE, crypto: '#9C27B0', community: ORANGE };
  if (topicEntries.length === 0) {
    topicsEl.innerHTML = '<div style="font-size:11px;color:var(--meta)">No topic matches.</div>';
  } else {
    topicEntries.forEach(([topic, count]) =>
      topicsEl.appendChild(hBar(topic, count, maxTopic, topicColors[topic] || GRAY, true)));
  }

  // Signals
  const sigList = $('ins-signals-list');
  sigList.innerHTML = '';
  const signals = llm.signals || [];
  if (signals.length > 0) {
    signals.forEach(s => sigList.appendChild(insSignalCard(s)));
  } else {
    sigList.innerHTML = '<div style="font-size:11px;color:var(--meta)">No signals detected.</div>';
  }

  // Clusters
  const clList = $('ins-clusters-list');
  clList.innerHTML = '';
  const clusters = llm.clusters || [];
  if (clusters.length > 0) {
    clusters.forEach(cl => clList.appendChild(insClusterCard(cl, draftRuleInAnalyze)));
  } else {
    clList.innerHTML = '<div style="font-size:11px;color:var(--meta)">No clusters identified.</div>';
  }

  // Suggested rules
  const rList = $('ins-rules-list');
  rList.innerHTML = '';
  const suggestedRules = llm.suggestedRules || [];
  if (suggestedRules.length > 0) {
    suggestedRules.forEach(r => rList.appendChild(insSuggRuleItem(r, draftRuleInAnalyze)));
  } else {
    rList.innerHTML = '<div style="font-size:11px;color:var(--meta)">No rule suggestions.</div>';
  }

  // Caveats
  const cavEl = $('ins-caveats-list');
  cavEl.innerHTML = '';
  const caveats = llm.caveats || [];
  if (caveats.length > 0) {
    caveats.forEach(c => {
      const item = document.createElement('div');
      item.className = 'caveat-item';
      item.textContent = c;
      cavEl.appendChild(item);
    });
    show('ins-caveats-section');
  } else {
    hide('ins-caveats-section');
  }

  hide('ins-empty');
  show('ins-results');
}

/* ── Local analysis engine ───────────────────────────── */
const TOPIC_WORDS = {
  politics:  ['politics','political','government','election','democrat','republican','trump','biden','congress','senate','war','military','protest','vote','policy','administration','president','liberal','conservative'],
  medical:   ['doctor','hospital','medicine','health','disease','cancer','covid','vaccine','mental','anxiety','depression','therapy','diagnosis','symptoms','treatment','prescription','surgery','illness','chronic'],
  spam:      ['buy','sell','sale','discount','promo','offer','deal','cheap','free','giveaway','affiliate','referral','click','profit','earn','income','invest','crypto','nft','bitcoin'],
  hate:      ['hate','racist','racism','slur','offensive','bigot','discrimination','sexist','homophobic','nazi','fascist','stereotype','slurs','derogatory','harass'],
  media:     ['video','youtube','streaming','movie','show','series','episode','channel','podcast','music','tiktok','instagram','reel','clip','watch'],
  crypto:    ['bitcoin','crypto','nft','blockchain','ethereum','token','wallet','trading','coin','defi','web3','metaverse','mint','hodl'],
  community: ['rules','moderator','ban','report','spam','troll','selfpromo','promo','meta','feedback','complaint','rant','drama','mod'],
};

const TOPIC_LABELS = {
  politics: 'Politics / Current Events',
  medical:  'Medical / Health Advice',
  spam:     'Spam / Self-Promotion',
  hate:     'Hate Speech / Harassment',
  media:    'Media / External Links',
  crypto:   'Crypto / NFT Promotion',
  community:'Community Meta',
};

const RULE_TEMPLATES = {
  politics:  kws => `Posts related to politics or current events (e.g. ${kws.slice(0,3).join(', ')}) must use the appropriate flair and remain civil.`,
  medical:   _kws => `Do not post medical advice or personal medical situations. Consult a licensed professional.`,
  spam:      kws => `No self-promotion, affiliate links, or commercial content (e.g. ${kws.slice(0,2).join(', ')}). Posts must contribute to discussion.`,
  hate:      _kws => `Hate speech, slurs, and targeted harassment are not permitted and will result in a ban.`,
  media:     kws => `External links (e.g. ${kws.slice(0,2).join(', ')}) must be directly relevant to the subreddit topic and include a comment.`,
  crypto:    _kws => `Crypto, NFT, and financial promotion posts are not allowed.`,
  community: _kws => `Meta complaints and mod-related posts belong in the weekly thread, not as standalone posts.`,
};

function postTopicScore(post) {
  const text = ((post.title || '') + ' ' + (post.body || '')).toLowerCase();
  const scores = {};
  for (const [topic, words] of Object.entries(TOPIC_WORDS)) {
    let score = 0;
    for (const w of words) {
      if (text.includes(w)) score++;
    }
    scores[topic] = score;
  }
  return scores;
}

function runLocalAnalysis(posts, localSummary) {
  // Assign each post to its best-matching topic
  const topicPosts = {};
  for (const post of posts) {
    const scores = postTopicScore(post);
    const best = Object.entries(scores).sort((a,b) => b[1]-a[1])[0];
    if (best && best[1] > 0) {
      if (!topicPosts[best[0]]) topicPosts[best[0]] = [];
      topicPosts[best[0]].push(post);
    }
  }

  const topKws = (localSummary.topKeywords || []).slice(0, 30);

  // Build clusters
  const clusters = Object.entries(topicPosts)
    .sort((a,b) => b[1].length - a[1].length)
    .map(([topic, tposts], i) => {
      const topicWordSet = new Set(TOPIC_WORDS[topic] || []);
      const relevantKws = topKws.filter(k => topicWordSet.has(k.word)).map(k => k.word).slice(0, 6);
      return {
        clusterId: 'cluster_' + (i+1),
        label: TOPIC_LABELS[topic] || topic,
        postCount: tposts.length,
        commonKeywords: relevantKws.length ? relevantKws : topKws.slice(0,4).map(k=>k.word),
        examples: tposts.slice(0,2).map(p => p.title).filter(Boolean),
        suggestedRule: (RULE_TEMPLATES[topic] || (()=>''))(relevantKws),
      };
    });

  // Build signals from clusters
  const signals = clusters.map(c => ({
    topic: c.label,
    frequency: c.postCount,
    examples: c.examples,
    severity: c.postCount >= 10 ? 'high' : c.postCount >= 4 ? 'medium' : 'low',
  }));

  // Suggested rules from clusters that have enough posts
  const suggestedRules = clusters
    .filter(c => c.postCount >= 2 && c.suggestedRule)
    .map(c => c.suggestedRule);

  // Summary
  const topCluster = clusters[0];
  const totalClustered = clusters.reduce((s,c) => s + c.postCount, 0);
  const summary = topCluster
    ? `${totalClustered} of ${posts.length} scanned posts match known removal patterns. The most common category is "${topCluster.label}" (${topCluster.postCount} posts). ${clusters.length} content cluster${clusters.length !== 1 ? 's' : ''} identified.`
    : `${posts.length} posts scanned. No strong topic patterns detected — posts may have been removed for formatting or other rule violations.`;

  const caveats = [
    'This analysis uses local keyword pattern matching, not AI. Results are based on topic clusters from the scanned posts.',
    'Only posts visible to the app are scanned (new/recent queue). Older removed posts may not appear.',
  ];

  return { summary, signals, clusters, suggestedRules, caveats };
}

insRunBtn.addEventListener('click', async () => {
  insRunBtn.disabled = true;
  txt('ins-run-lbl', '');
  $('ins-run-lbl').innerHTML = '<div class="spin"></div>';
  hide('ins-empty'); hide('ins-results'); show('ins-load');
  insStep('is1', 'active'); insStep('is2', ''); insStep('is3', '');

  try {
    const res = await fetch('/api/removed-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 50 }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(e.error || 'HTTP ' + res.status);
    }
    const { posts, localSummary, subredditName: subName } = await res.json();
    insStep('is1', 'done'); insStep('is2', 'active');
    await wait(200);

    const localResult = runLocalAnalysis(posts, localSummary);
    insStep('is2', 'done'); insStep('is3', 'active');
    await wait(200);
    insStep('is3', 'done');
    await wait(150);

    if (subName) txt('sub-badge', 'r/' + subName);

    renderInsights({ postsAnalyzed: posts.length, localSummary, llmAnalysis: localResult });
    hide('ins-load');
    txt('insights-tc', (localResult.signals || []).length || '—');

  } catch (err) {
    hide('ins-load');
    $('ins-empty').querySelector('.empty-ico').textContent = '⚠️';
    $('ins-empty').querySelector('.empty-ttl').textContent = 'Analysis failed';
    $('ins-empty').querySelector('.empty-dsc').textContent = err.message;
    show('ins-empty');
  } finally {
    insRunBtn.disabled = false;
    txt('ins-run-lbl', 'Analyze');
  }
});

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
