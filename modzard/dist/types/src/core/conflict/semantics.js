// ─────────────────────────────────────────────────────────────────────────────
// semantics.ts — three accuracy layers for the impact engine
//
//  Option 1  Abbreviation expansion  (GP → doctor, DC → government, …)
//  Option 2  Negation detection      (strip words that are explicitly disclaimed)
//  Option 3  Topic vectors           (cosine similarity for unknown vocabulary)
// ─────────────────────────────────────────────────────────────────────────────
// ── Option 1: Abbreviation expansion ─────────────────────────────────────────
// Maps lowercase abbreviation → cluster-space word(s) to inject alongside the
// original token.  "GP" becomes "GP doctor" before keyword scanning runs.
export const ABBREVIATIONS = {
    // Medical
    gp: 'doctor',
    er: 'emergency hospital',
    icu: 'hospital',
    cpr: 'emergency',
    nhs: 'healthcare',
    cdc: 'healthcare',
    mri: 'medical',
    xray: 'medical',
    adhd: 'diagnosis',
    ptsd: 'diagnosis',
    ocd: 'diagnosis',
    rx: 'prescription',
    otc: 'medication',
    bp: 'health',
    // Politics / government
    dc: 'government',
    un: 'international',
    eu: 'government',
    fbi: 'government',
    cia: 'government',
    mp: 'politician',
    pm: 'politician',
    potus: 'politician',
    gop: 'republican',
    dem: 'democrat',
    dems: 'democrat',
    // Crypto / finance
    btc: 'bitcoin',
    eth: 'cryptocurrency',
    defi: 'cryptocurrency',
    dao: 'cryptocurrency',
    web3: 'cryptocurrency',
    // AI / tech
    llm: 'artificial intelligence',
    gpt: 'artificial intelligence',
    agi: 'artificial intelligence',
    // Community
    ama: 'survey',
};
/** Expand abbreviations in-place: "my gp said" → "my gp doctor said" */
export function expandAbbreviations(text) {
    return text.replace(/\b([a-z]{2,5})\b/gi, (match) => {
        const exp = ABBREVIATIONS[match.toLowerCase()];
        return exp ? `${match} ${exp}` : match;
    });
}
// ── Option 2: Negation detection ─────────────────────────────────────────────
// Returns the set of content words that appear inside a negation phrase so the
// scoring layer can subtract them instead of boosting on them.
const NEGATION_PATTERNS = [
    // "not asking for medical advice"  /  "not seeking X"
    /\bnot\s+(?:asking|seeking|requesting|looking)\s+(?:for\s+)?([\w\s]{2,30})/gi,
    // "I'm not a doctor"  /  "this is not spam"  /  "it's not political"
    /\b(?:i'?m|this\s+is|it'?s|we'?re)\s+not\s+(?:a\s+)?([\w\s]{2,25})/gi,
    // "no medical advice here"  /  "no promotion intended"
    /\bno\s+([\w]+)\s+(?:here|intended|meant|involved|included)/gi,
    // "without promoting"  /  "without advertising"
    /\bwithout\s+([\w]+(?:ing|ion|ment))\b/gi,
    // "disclaimer: not medical advice"
    /\bdisclaimer[:\s]+not\s+([\w\s]{2,30})/gi,
    // "just sharing, not advice"
    /\bnot\s+(advice|advertisement|promotion|spam|medical|political|solicitation)\b/gi,
];
/** Returns content words that are negated in context (lowercased). */
export function getNegatedWords(text) {
    const negated = new Set();
    const stopSet = new Set(['a', 'an', 'the', 'of', 'for', 'to', 'in', 'on', 'at', 'is', 'are', 'was', 'be', 'my', 'your']);
    for (const pattern of NEGATION_PATTERNS) {
        const re = new RegExp(pattern.source, pattern.flags);
        let m;
        while ((m = re.exec(text.toLowerCase())) !== null) {
            const cap = m[1];
            if (cap) {
                cap.split(/\s+/).forEach(w => {
                    if (w.length >= 3 && !stopSet.has(w))
                        negated.add(w);
                });
            }
        }
    }
    return negated;
}
// Shorthand builder
function v(po, me, sp, ha, md, cr, co) {
    return [po, me, sp, ha, md, cr, co];
}
// One-hot vectors for each cluster (same index order as TopicVec)
export const CLUSTER_VECS = {
    politics: v(1, 0, 0, 0, 0, 0, 0),
    medical: v(0, 1, 0, 0, 0, 0, 0),
    spam: v(0, 0, 1, 0, 0, 0, 0),
    hate: v(0, 0, 0, 1, 0, 0, 0),
    media: v(0, 0, 0, 0, 1, 0, 0),
    crypto: v(0, 0, 0, 0, 0, 1, 0),
    community: v(0, 0, 0, 0, 0, 0, 1),
};
// Extended vocabulary: words NOT in TOPIC_CLUSTERS that have known topic affinities.
// These cover the main "unknown word" gaps: political figures, medical conditions,
// hate terminology, crypto slang, promotional terms, media formats.
export const EXTENDED_VOCAB = {
    // ── Political proper nouns & concepts ──
    trump: v(0.85, 0, 0, 0.05, 0.05, 0, 0),
    biden: v(0.85, 0, 0, 0, 0.05, 0, 0),
    putin: v(0.80, 0, 0, 0.15, 0, 0, 0),
    zelensky: v(0.80, 0, 0, 0, 0, 0, 0),
    netanyahu: v(0.80, 0, 0, 0.10, 0, 0, 0),
    maga: v(0.75, 0, 0, 0.10, 0, 0, 0),
    antifa: v(0.65, 0, 0, 0.25, 0, 0, 0),
    kremlin: v(0.85, 0, 0, 0.10, 0, 0, 0),
    pentagon: v(0.80, 0, 0, 0, 0, 0, 0),
    brexit: v(0.90, 0, 0, 0, 0, 0, 0),
    democracy: v(0.85, 0, 0, 0, 0, 0, 0),
    autocracy: v(0.80, 0, 0, 0.10, 0, 0, 0),
    fascism: v(0.65, 0, 0, 0.35, 0, 0, 0),
    fascist: v(0.55, 0, 0, 0.45, 0, 0, 0),
    constitution: v(0.80, 0, 0, 0, 0, 0, 0),
    amendment: v(0.75, 0, 0, 0, 0, 0, 0),
    impeachment: v(0.90, 0, 0, 0.05, 0, 0, 0),
    referendum: v(0.90, 0, 0, 0, 0, 0, 0),
    coup: v(0.75, 0, 0, 0.25, 0, 0, 0),
    airstrike: v(0.55, 0, 0, 0.25, 0, 0, 0),
    bombing: v(0.45, 0, 0, 0.35, 0, 0, 0),
    geopolitical: v(0.90, 0, 0, 0, 0, 0, 0),
    diplomatic: v(0.85, 0, 0, 0, 0, 0, 0),
    bilateral: v(0.80, 0, 0, 0, 0, 0, 0),
    embassy: v(0.80, 0, 0, 0, 0, 0, 0),
    occupation: v(0.70, 0, 0, 0.20, 0, 0, 0),
    colonialism: v(0.65, 0, 0, 0.25, 0, 0, 0),
    // ── Medical conditions & jargon ──
    cancer: v(0, 0.90, 0, 0, 0, 0, 0),
    tumor: v(0, 0.90, 0, 0, 0, 0, 0),
    diabetes: v(0, 0.85, 0, 0, 0, 0, 0),
    hypertension: v(0, 0.85, 0, 0, 0, 0, 0),
    anxiety: v(0, 0.80, 0, 0, 0, 0, 0),
    depression: v(0, 0.75, 0, 0.10, 0, 0, 0),
    chronic: v(0, 0.80, 0, 0, 0, 0, 0),
    surgery: v(0, 0.90, 0, 0, 0, 0, 0),
    vaccine: v(0.10, 0.80, 0, 0, 0, 0, 0),
    antibiotics: v(0, 0.90, 0, 0, 0, 0, 0),
    painkiller: v(0, 0.85, 0, 0, 0, 0, 0),
    overdose: v(0, 0.75, 0, 0.15, 0, 0, 0),
    pharmacist: v(0, 0.85, 0, 0, 0, 0, 0),
    cardiologist: v(0, 0.90, 0, 0, 0, 0, 0),
    neurologist: v(0, 0.90, 0, 0, 0, 0, 0),
    psychiatrist: v(0, 0.85, 0, 0, 0, 0, 0),
    covid: v(0.05, 0.80, 0, 0, 0, 0, 0),
    pandemic: v(0.10, 0.80, 0, 0, 0, 0, 0),
    fever: v(0, 0.80, 0, 0, 0, 0, 0),
    nausea: v(0, 0.85, 0, 0, 0, 0, 0),
    fracture: v(0, 0.85, 0, 0, 0, 0, 0),
    infection: v(0, 0.85, 0, 0, 0, 0, 0),
    mental: v(0, 0.70, 0, 0, 0, 0, 0),
    // ── Spam / promotional ──
    collab: v(0, 0, 0.80, 0, 0, 0, 0),
    sponsorship: v(0, 0, 0.85, 0, 0, 0, 0),
    discount: v(0, 0, 0.80, 0, 0, 0, 0),
    coupon: v(0, 0, 0.85, 0, 0, 0, 0),
    checkout: v(0, 0, 0.75, 0, 0, 0, 0),
    subscribe: v(0, 0, 0.70, 0, 0.15, 0, 0),
    influencer: v(0, 0, 0.75, 0, 0.25, 0, 0),
    merch: v(0, 0, 0.75, 0, 0.25, 0, 0),
    clickbait: v(0, 0, 0.30, 0, 0.60, 0, 0),
    // ── Hate / toxic ──
    racist: v(0, 0, 0, 0.90, 0, 0, 0),
    sexist: v(0, 0, 0, 0.90, 0, 0, 0),
    homophobic: v(0, 0, 0, 0.90, 0, 0, 0),
    transphobic: v(0, 0, 0, 0.90, 0, 0, 0),
    bigot: v(0, 0, 0, 0.90, 0, 0, 0),
    bigotry: v(0, 0, 0, 0.90, 0, 0, 0),
    nazi: v(0.20, 0, 0, 0.80, 0, 0, 0),
    troll: v(0, 0, 0.15, 0.65, 0, 0, 0.20),
    brigading: v(0, 0, 0, 0.50, 0, 0, 0.50),
    doxxing: v(0, 0, 0, 0.90, 0, 0, 0),
    // ── Media / content formats ──
    reel: v(0, 0, 0, 0, 0.85, 0, 0),
    stream: v(0, 0, 0, 0, 0.80, 0, 0),
    podcast: v(0, 0, 0, 0, 0.80, 0, 0),
    thumbnail: v(0, 0, 0, 0, 0.85, 0, 0),
    // ── Crypto / finance ──
    wallet: v(0, 0, 0, 0, 0, 0.80, 0),
    token: v(0, 0, 0, 0, 0, 0.85, 0),
    altcoin: v(0, 0, 0, 0, 0, 0.90, 0),
    hodl: v(0, 0, 0, 0, 0, 0.90, 0),
    staking: v(0, 0, 0, 0, 0, 0.85, 0),
    trading: v(0, 0, 0, 0, 0, 0.75, 0),
    portfolio: v(0, 0, 0, 0, 0, 0.70, 0),
};
// ── Vector arithmetic ─────────────────────────────────────────────────────────
function dot(a, b) {
    let s = 0;
    for (let i = 0; i < 7; i++)
        s += (a[i] ?? 0) * (b[i] ?? 0);
    return s;
}
function normSq(a) { return dot(a, a); }
export function cosine(a, b) {
    const denom = Math.sqrt(normSq(a) * normSq(b));
    return denom === 0 ? 0 : dot(a, b) / denom;
}
export function avgVec(vecs) {
    if (vecs.length === 0)
        return null;
    const s = [0, 0, 0, 0, 0, 0, 0];
    for (const vec of vecs) {
        for (let i = 0; i < 7; i++)
            s[i] = (s[i] ?? 0) + (vec[i] ?? 0);
    }
    const n = vecs.length;
    return s.map(x => x / n);
}
/**
 * Return the topic vector for a word, or null if unknown.
 * TOPIC_CLUSTERS membership takes priority over EXTENDED_VOCAB.
 */
export function getWordVector(word, wordToCluster) {
    const lower = word.toLowerCase();
    const cluster = wordToCluster.get(lower);
    if (cluster !== undefined)
        return CLUSTER_VECS[cluster] ?? null;
    return EXTENDED_VOCAB[lower] ?? null;
}
/**
 * Find words in the post that are NOT caught by cluster matching but have a
 * cosine similarity ≥ threshold with the rule's topic centroid vector.
 * Returns { word, similarity } pairs sorted by similarity descending.
 */
export function findVectorMatches(ruleVec, postText, wordToCluster, alreadyMatched, threshold = 0.55) {
    const tokens = postText.toLowerCase().match(/\b[a-z][a-z0-9'-]{2,}\b/g) ?? [];
    const seen = new Set();
    const results = [];
    for (const token of tokens) {
        if (seen.has(token) || alreadyMatched.has(token))
            continue;
        seen.add(token);
        // Skip words already handled by TOPIC_CLUSTERS
        if (wordToCluster.has(token))
            continue;
        const vec = EXTENDED_VOCAB[token];
        if (!vec)
            continue;
        const sim = cosine(ruleVec, vec);
        if (sim >= threshold)
            results.push({ word: token, similarity: sim });
    }
    return results.sort((a, b) => b.similarity - a.similarity);
}
//# sourceMappingURL=semantics.js.map