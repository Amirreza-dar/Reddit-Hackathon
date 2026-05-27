/**
 * Live terminal test — fetches real subreddit rules and recent posts from
 * Reddit's public JSON API, then runs the full conflict + impact pipeline.
 *
 * Usage:
 *   npm run test:live                              (defaults: r/worldnews)
 *   npm run test:live -- worldnews "No off-topic posts"
 *   npm run test:live -- askreddit "Medical advice posts are not allowed"
 */
import { parseRule } from './parser.js';
import { detectConflicts } from './conflictEngine.js';
import { findAffectedPosts } from './impactEngine.js';
import { printRule, printConflicts, printImpacts } from './report.js';
const HEADERS = { 'User-Agent': 'modzard-conflict-tester/1.0' };
// ── Fetchers ───────────────────────────────────────────────────────────────
async function fetchRules(subredditName) {
    const url = `https://www.reddit.com/r/${subredditName}/about/rules.json`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok)
        throw new Error(`Failed to fetch rules: ${res.status} ${res.statusText}`);
    const json = (await res.json());
    return json.rules.map((r) => ({
        shortName: r.short_name,
        description: r.description,
        kind: r.kind,
        violationReason: r.violation_reason,
        priority: r.priority,
    }));
}
async function fetchPosts(subredditName, limit = 15) {
    const url = `https://www.reddit.com/r/${subredditName}/new.json?limit=${limit}`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok)
        throw new Error(`Failed to fetch posts: ${res.status} ${res.statusText}`);
    const json = (await res.json());
    return json.data.children.map(({ data: p }) => ({
        postId: p.id,
        title: p.title,
        author: p.author ?? 'unknown',
        body: p.selftext,
        flair: p.link_flair_text ?? undefined,
        postType: inferPostType(p),
        domain: p.is_self ? undefined : p.domain,
    }));
}
function inferPostType(p) {
    if (p.is_self)
        return 'text';
    if (p.post_hint === 'image')
        return 'image';
    return 'link';
}
// ── Print helpers ──────────────────────────────────────────────────────────
function printSubredditRules(rules) {
    console.log(`\n=== Subreddit Rules (${rules.length} found) ===`);
    rules.forEach((r, i) => {
        console.log(`\n[${i + 1}] ${r.shortName}  (kind: ${r.kind})`);
        if (r.description)
            console.log(`    ${r.description.replace(/\n/g, '\n    ')}`);
    });
    console.log('');
}
function printPosts(posts) {
    console.log(`=== Recent Posts (${posts.length} fetched) ===`);
    posts.forEach((p) => {
        const flair = p.flair ? ` [${p.flair}]` : '';
        const domain = p.domain ? ` (${p.domain})` : '';
        console.log(`  ${p.postId}${flair}${domain}  "${p.title}"`);
    });
    console.log('');
}
// ── Mock data (mirrors real Reddit API shape) ──────────────────────────────
function getMockRules() {
    return [
        { shortName: 'Be civil', description: 'Personal attacks, hate speech, and harassment are not allowed. Treat others with respect.', kind: 'all', violationReason: 'Uncivil behavior', priority: 0 },
        { shortName: 'No self-promotion', description: 'Self-promotional posts and links are not allowed. Accounts that only promote their own content will be banned.', kind: 'all', violationReason: 'Self-promotion', priority: 1 },
        { shortName: 'Politics posts must have flair', description: 'All posts about politics must use the Politics flair. Posts without the correct flair will be removed.', kind: 'link', violationReason: 'Missing flair', priority: 2 },
        { shortName: 'No medical advice', description: 'Do not ask for or provide medical diagnoses, treatment plans, or specific medical advice. Use the Advice flair for general health questions.', kind: 'all', violationReason: 'Medical advice', priority: 3 },
        { shortName: 'Sources required', description: 'News posts must link to a primary source. Screenshots or social media posts without a source link will be removed.', kind: 'link', violationReason: 'No source', priority: 4 },
        { shortName: 'Survey posts allowed on weekends', description: 'Survey and research posts are only allowed on Saturdays and Sundays.', kind: 'all', violationReason: 'Survey outside weekend', priority: 5 },
    ];
}
function getMockPosts() {
    return [
        { postId: 'abc01', title: 'Politics in Italy — election results', author: 'user1', body: 'Analysis of the latest parliamentary elections.', flair: undefined, postType: 'text', domain: undefined },
        { postId: 'abc02', title: 'Funny political meme of the week', author: 'user2', body: '', flair: 'Meme', postType: 'image', domain: 'i.imgur.com' },
        { postId: 'abc03', title: 'Need urgent medical advice — chest pain symptoms', author: 'user3', body: 'I have been experiencing symptoms and want a diagnosis.', flair: 'Advice', postType: 'text', domain: undefined },
        { postId: 'abc04', title: 'Breaking: major AI product launch', author: 'user4', body: '', flair: 'News', postType: 'link', domain: 'technews.com' },
        { postId: 'abc05', title: 'Survey for university research project', author: 'user5', body: 'Please fill this short survey, it only takes 2 minutes.', flair: undefined, postType: 'text', domain: undefined },
        { postId: 'abc06', title: 'New crypto regulations proposed by EU', author: 'user6', body: '', flair: 'News', postType: 'link', domain: 'reuters.com' },
        { postId: 'abc07', title: 'Check out my new blog on programming', author: 'user7', body: 'I have been writing about web dev for years — here is my latest post.', flair: undefined, postType: 'link', domain: 'myblog.dev' },
        { postId: 'abc08', title: 'Climate policy debate in parliament', author: 'user8', body: 'Heated discussion over the new climate bill.', flair: 'Politics', postType: 'text', domain: undefined },
    ];
}
// ── Main ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const useMock = args.includes('--mock') || args.includes('-m');
const positional = args.filter((a) => !a.startsWith('-'));
const subredditName = positional[0] ?? 'worldnews';
const newRuleText = positional[1] ?? 'Posts must include a source link, otherwise remove them.';
console.log(`\nSubreddit : r/${subredditName}${useMock ? '  [mock mode]' : ''}`);
console.log(`New rule  : "${newRuleText}"\n`);
let subredditRules;
let posts;
if (useMock) {
    subredditRules = getMockRules();
    posts = getMockPosts();
}
else {
    try {
        [subredditRules, posts] = await Promise.all([
            fetchRules(subredditName),
            fetchPosts(subredditName),
        ]);
    }
    catch (err) {
        console.error(`Network error: ${err.message}`);
        console.error('Tip: run with --mock flag to use offline sample data:\n');
        console.error(`  npm run test:live -- ${subredditName} "${newRuleText}" --mock\n`);
        process.exit(1);
    }
}
printSubredditRules(subredditRules);
printPosts(posts);
const newRule = parseRule('new_rule', newRuleText);
const existingParsed = subredditRules.map((r) => parseRule(r.shortName, `${r.shortName}. ${r.description}`, 'subreddit_rules'));
printRule(newRule);
printConflicts(detectConflicts(newRule, existingParsed));
printImpacts(findAffectedPosts(newRule, posts));
//# sourceMappingURL=testLive.js.map