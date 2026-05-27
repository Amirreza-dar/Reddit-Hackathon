// ── Action patterns (checked in order — first match wins) ──────────────────
const ACTION_PATTERNS = [
    // PROHIBIT — must come before allow/require so "not allowed" beats "allowed"
    {
        regex: /\b(must\s+not|may\s+not|should\s+not|shall\s+not|will\s+not\s+be\s+allowed|won't\s+be\s+allowed|cannot\s+be|can't\s+be|not\s+allowed|not\s+permitted|not\s+acceptable|not\s+tolerated|not\s+welcome|forbidden|prohibited|disallowed|disallow|banned|banning|\bban\b|do\s+not\s+allow|don't\s+allow|no\s+(?:posting|sharing|asking|submitting|advertising|promoting|soliciting)|are\s+not\s+allowed|is\s+not\s+allowed|is\s+banned|are\s+banned)\b/i,
        action: 'prohibit',
    },
    // REMOVE
    {
        regex: /\b(will\s+be\s+removed|should\s+be\s+removed|gets?\s+removed|are\s+removed|is\s+removed|will\s+be\s+deleted|gets?\s+deleted|taken\s+down|auto-remove|auto\s+remove|filter\s+out|\bremove\b|\bdeleted\b)\b/i,
        action: 'remove',
    },
    // REQUIRE
    {
        regex: /\b(must|required|need\s+to|needs\s+to|have\s+to|has\s+to|should\s+include|should\s+use|should\s+have|should\s+contain|\bshall\b|is\s+required|are\s+required)\b/i,
        action: 'require',
    },
    // ALLOW — only after prohibit patterns already rejected the text
    {
        regex: /\b(is\s+allowed|are\s+allowed|is\s+permitted|are\s+permitted|is\s+acceptable|are\s+acceptable|is\s+welcome|are\s+welcome|should\s+be\s+allowed|can\s+be\s+posted|\ballowed\b|\bpermitted\b|\bwelcome\b|\baccepted\b|\bencouraged\b|\bcan\b)\b/i,
        action: 'allow',
    },
    // WARN
    {
        regex: /\b(warn|warning|notify|message|inform)\b/i,
        action: 'warn',
    },
    // RESTRICT
    {
        regex: /\bonly\s+(?:on|during|for|in|when|if)\b|\bonly\s+allow/i,
        action: 'restrict',
    },
];
// ── Target patterns ────────────────────────────────────────────────────────
const TARGET_PATTERNS = [
    { regex: /\bflair\b/i, target: 'flair' },
    { regex: /\btitle\b/i, target: 'title' },
    { regex: /\bcomment\b/i, target: 'comment' },
    { regex: /\bpost\b|\bsubmission\b|\bcontent\b|\bthread\b/i, target: 'post' },
    { regex: /\blink\b|\burl\b/i, target: 'link' },
    { regex: /\bdomain\b/i, target: 'domain' },
    { regex: /\bnsfw\b|\bspoiler\b|\btag\b/i, target: 'tag' },
    { regex: /\bauthor\b|\buser\b|\bmember\b/i, target: 'author' },
];
// ── Keyword hints: the engine compares these across rules ──────────────────
// Grouped by topic so semantic clusters are close to each other.
const KEYWORD_HINTS = [
    // Medical / health
    'medical', 'medicine', 'medication', 'health', 'healthcare',
    'advice', 'advise', 'advises', 'advising',
    'diagnosis', 'diagnose', 'diagnoses', 'symptom', 'symptoms',
    'treatment', 'therapy', 'therapist', 'doctor', 'doctors',
    'hospital', 'patient', 'patients', 'prescription', 'clinical',
    'disease', 'illness', 'injury', 'emergency',
    // Politics / geopolitics
    'politics', 'political', 'politician', 'politicians',
    'government', 'election', 'elections', 'vote', 'voting', 'voter',
    'policy', 'policies', 'partisan', 'democrat', 'republican',
    'liberal', 'conservative', 'propaganda',
    'war', 'wars', 'military', 'geopolitics', 'conflict', 'conflicts',
    'terrorism', 'terrorist', 'protest', 'protests', 'revolution',
    'international', 'senate', 'congress', 'parliament', 'legislation',
    'crisis', 'attack', 'invasion', 'troops', 'army', 'ceasefire',
    'middle east', 'east asia', 'ukraine', 'israel', 'gaza', 'nato',
    'sanctions', 'diplomacy', 'foreign', 'sovereignty', 'regime',
    // Content categories
    'meme', 'memes', 'image', 'images', 'video', 'videos',
    'gif', 'screenshot', 'link', 'links', 'article', 'news',
    // Self-promo / spam / ads
    'spam', 'advertisement', 'advertisements', 'advertising', 'ads',
    'promotion', 'promotional', 'promo', 'self-promo', 'self promo',
    'solicitation', 'soliciting', 'affiliate',
    // Hate / harassment / safety
    'hate', 'hatred', 'harassment', 'harass', 'harassing',
    'abuse', 'abusive', 'violence', 'violent', 'threat', 'threats',
    'slur', 'slurs', 'toxic', 'bully', 'bullying',
    'explicit', 'sexual', 'nsfw', 'adult', 'mature',
    // Tech / finance
    'crypto', 'cryptocurrency', 'bitcoin', 'nft',
    'ai', 'artificial intelligence', 'bot', 'automation',
    // Community meta
    'survey', 'surveys', 'poll', 'polls',
    'homework', 'assignment', 'academic',
    'job', 'jobs', 'hiring', 'recruitment',
    'ban', 'banned', 'remove', 'removed',
    'repost', 'reposts', 'duplicate',
    'offtopic', 'off-topic', 'unrelated',
    'low-effort', 'low effort', 'quality',
    'spoiler', 'leak', 'leaks',
    'source', 'sources', 'citation',
    'fluff', 'rant', 'venting',
];
// ── Topic clusters: words in the same cluster match each other ────────────
// Used by the impact engine to catch posts that use synonyms or related terms
// (e.g. a "political content banned" rule should match a post about "war").
export const TOPIC_CLUSTERS = {
    politics: [
        'politics', 'political', 'politician', 'politicians',
        'government', 'election', 'elections', 'vote', 'voting', 'voter',
        'policy', 'policies', 'partisan', 'democrat', 'republican',
        'liberal', 'conservative', 'propaganda',
        'war', 'wars', 'military', 'geopolitics', 'conflict', 'conflicts',
        'terrorism', 'terrorist', 'protest', 'protests', 'revolution',
        'international', 'senate', 'congress', 'parliament', 'legislation',
        'crisis', 'attack', 'invasion', 'troops', 'army', 'ceasefire',
        'middle east', 'east asia', 'ukraine', 'israel', 'gaza', 'nato',
        'sanctions', 'diplomacy', 'foreign', 'sovereignty', 'regime',
    ],
    medical: [
        'medical', 'medicine', 'medication', 'health', 'healthcare',
        'advice', 'advise', 'advises', 'advising',
        'diagnosis', 'diagnose', 'diagnoses', 'symptom', 'symptoms',
        'treatment', 'therapy', 'therapist', 'doctor', 'doctors',
        'hospital', 'patient', 'patients', 'prescription', 'clinical',
        'disease', 'illness', 'injury', 'emergency',
    ],
    spam: [
        'spam', 'advertisement', 'advertisements', 'advertising', 'ads',
        'promotion', 'promotional', 'promo', 'self-promo', 'solicitation', 'affiliate',
    ],
    hate: [
        'hate', 'hatred', 'harassment', 'harass', 'harassing',
        'abuse', 'abusive', 'violence', 'violent', 'threat', 'threats',
        'slur', 'slurs', 'toxic', 'bully', 'bullying',
    ],
    media: [
        'meme', 'memes', 'image', 'images', 'video', 'videos',
        'gif', 'screenshot', 'link', 'links', 'article', 'news',
    ],
    crypto: [
        'crypto', 'cryptocurrency', 'bitcoin', 'nft', 'blockchain', 'token',
    ],
};
// ── Stop words to exclude from about-clause keyword extraction ─────────────
export const STOP_WORDS = new Set([
    'the', 'and', 'or', 'not', 'are', 'is', 'be', 'been', 'was', 'were', 'will',
    'can', 'may', 'must', 'shall', 'should', 'have', 'has', 'had', 'would',
    'could', 'all', 'any', 'from', 'for', 'but', 'how', 'why', 'when', 'where',
    'what', 'who', 'which', 'its', 'this', 'that', 'these', 'those', 'also',
    'only', 'just', 'if', 'in', 'on', 'at', 'to', 'of', 'a', 'an', 'use',
    'post', 'posts', 'content', 'users', 'user', 'please', 'note', 'topic',
    'allowed', 'banned', 'removed', 'submitted', 'posted', 'rules', 'guidelines',
    'sub', 'subreddit', 'community',
]);
// ── Helpers ────────────────────────────────────────────────────────────────
function parseAction(text) {
    for (const item of ACTION_PATTERNS) {
        if (item.regex.test(text))
            return item.action;
    }
    return 'unknown';
}
function parseTarget(text) {
    for (const item of TARGET_PATTERNS) {
        if (item.regex.test(text))
            return item.target;
    }
    return 'post';
}
function parseSubject(text) {
    if (/\bcomment\b/i.test(text))
        return 'comment';
    if (/\bauthor\b|\buser\b|\bapproved user\b|\bverified user\b|\bmember\b/i.test(text))
        return 'author';
    return 'post';
}
function parsePostType(text) {
    if (/\bimage\b|\bphoto\b|\bpicture\b|\bmeme\b|\bgif\b/i.test(text))
        return 'image';
    if (/\blink post\b|\burl post\b|\bdomain\b|\blink\b/i.test(text))
        return 'link';
    if (/\btext post\b|\bself post\b/i.test(text))
        return 'text';
    if (/\bcomment\b/i.test(text))
        return 'comment';
    return undefined;
}
function parseFlair(text) {
    const patterns = [
        /use the\s+[""]?([a-zA-Z0-9 _-]+?)[""]?\s+flair/i,
        /flair\s+(?:must be|should be|is|=)\s+[""]?([a-zA-Z0-9 _-]+?)[""]?(\.|,|$)/i,
        /must use\s+[""]?([a-zA-Z0-9 _-]+?)[""]?\s+flair/i,
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        const cap = match?.[1];
        if (cap)
            return cap.trim();
    }
    return undefined;
}
function parseDomains(text) {
    const matches = text.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi) ?? [];
    return [...new Set(matches.map((d) => d.toLowerCase()))];
}
function parseQuotedPhrases(text) {
    const results = [];
    const regex = /[""]([^""]+)[""]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const cap = match[1];
        const value = cap?.trim().toLowerCase();
        if (value && value.length > 1)
            results.push(value);
    }
    return [...new Set(results)];
}
export function parseKeywords(text) {
    const found = new Set();
    const lowered = text.toLowerCase();
    // 1. Scan against the full hint list (includes all topic synonyms)
    for (const kw of KEYWORD_HINTS) {
        if (lowered.includes(kw))
            found.add(kw);
    }
    // 2. Extract words from "about / with / regarding / containing" clauses,
    //    stopping at the first stop word to avoid capturing noise.
    const aboutMatch = lowered.match(/\b(?:about|regarding|concerning|covering|containing|related\s+to)\b\s+([\w\s,'-]{3,60})/i);
    const aboutCap = aboutMatch?.[1];
    if (aboutCap) {
        const tokens = aboutCap.match(/[a-z][a-z0-9'-]*/g) ?? [];
        for (const token of tokens) {
            if (token.length >= 3 && !STOP_WORDS.has(token))
                found.add(token);
        }
    }
    // 3. Quoted phrases ("Politics flair" → "politics flair")
    for (const phrase of parseQuotedPhrases(text)) {
        if (phrase.length >= 3)
            found.add(phrase);
    }
    return [...found];
}
function parseExceptions(text) {
    const exceptions = [];
    const lowered = text.toLowerCase();
    const markers = [
        /except\s+([a-z0-9 ,_-]+)/i,
        /unless\s+([a-z0-9 ,_-]+)/i,
        /exempt\s+([a-z0-9 ,_-]+)/i,
    ];
    for (const pattern of markers) {
        const match = lowered.match(pattern);
        const cap = match?.[1];
        if (cap)
            exceptions.push(cap.trim());
    }
    return [...new Set(exceptions)];
}
function parseEffect(action, text) {
    if (action === 'require' && /\b(otherwise remove|remove if missing|or remove)\b/i.test(text)) {
        return 'remove_if_missing';
    }
    if (action === 'remove')
        return 'remove_if_matches';
    if (action === 'warn')
        return 'warn_only';
    return undefined;
}
export function parseRule(ruleId, text, source = 'subreddit_rules') {
    const action = parseAction(text);
    const flair = parseFlair(text);
    return {
        ruleId,
        source,
        rawText: text,
        subject: parseSubject(text),
        action,
        target: parseTarget(text),
        value: flair,
        condition: {
            postType: parsePostType(text),
            flair,
            keywords: parseKeywords(text),
            domains: parseDomains(text),
        },
        exceptions: parseExceptions(text),
        effect: parseEffect(action, text),
        priority: 0,
    };
}
//# sourceMappingURL=parser.js.map