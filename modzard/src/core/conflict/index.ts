import { parseRule } from './parser.js';
import { detectConflicts } from './conflictEngine.js';
import { findAffectedPosts } from './impactEngine.js';
import { printRule, printConflicts, printImpacts } from './report.js';
import type { Post } from './types.js';

const newRuleText = 'Posts about politics must use the "Politics" flair, otherwise remove them.';

const existingRuleTexts = [
  'Political posts are not allowed.',
  'All image posts must have a flair.',
  'Links from spam-example.com are removed.',
  'Posts about medical advice are allowed only in the weekly thread.',
  'Posts with the "Politics" flair are allowed if they remain civil.',
];

const toolRules = [
  { id: 'tool_1', text: 'AutoMod removes posts from spam-example.com.', source: 'automod' },
  { id: 'tool_2', text: 'AutoMod removes political posts.', source: 'automod' },
];

const posts: Post[] = [
  { postId: 'p1', title: 'Politics in Europe', author: 'user1', body: 'Discussion about elections and parliament', flair: undefined, postType: 'text', domain: undefined },
  { postId: 'p2', title: 'Funny political meme', author: 'user2', body: 'Meme about politics and government', flair: 'Meme', postType: 'image', domain: undefined },
  { postId: 'p3', title: 'Need medical advice', author: 'user3', body: 'I have symptoms and want a diagnosis', flair: 'Advice', postType: 'text', domain: undefined },
  { postId: 'p4', title: 'News article about elections', author: 'user4', body: 'Breaking politics update', flair: 'Politics', postType: 'link', domain: 'news.com' },
  { postId: 'p5', title: 'Crypto market news', author: 'user5', body: 'Discussion about bitcoin and AI', flair: undefined, postType: 'text', domain: undefined },
];

const newRule = parseRule('new_rule_1', newRuleText, 'subreddit_rules');

const existingRules = [
  ...existingRuleTexts.map((text, index) => parseRule(`rule_${index + 1}`, text, 'subreddit_rules')),
  ...toolRules.map((tool) => parseRule(tool.id, tool.text, tool.source)),
];

printRule(newRule);
const conflicts = detectConflicts(newRule, existingRules);
printConflicts(conflicts);
const impacts = findAffectedPosts(newRule, posts, 10);
printImpacts(impacts);
