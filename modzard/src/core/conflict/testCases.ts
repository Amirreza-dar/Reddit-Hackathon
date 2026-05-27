import { parseRule } from './parser.js';
import { detectConflicts } from './conflictEngine.js';
import { findAffectedPosts } from './impactEngine.js';
import type { Post } from './types.js';

function divider(title: string): void {
  console.log(`\n==================== ${title} ====================\n`);
}

function runCase(
  caseName: string,
  newRuleText: string,
  existingRuleTexts: string[],
  posts: Post[]
): void {
  divider(caseName);
  const newRule = parseRule('new_rule', newRuleText);
  const oldRules = existingRuleTexts.map((text, i) => parseRule(`old_${i + 1}`, text));

  console.log('NEW RULE:');
  console.log(JSON.stringify(newRule, null, 2));

  const conflicts = detectConflicts(newRule, oldRules);
  console.log('\nCONFLICTS:');
  console.log(JSON.stringify(conflicts, null, 2));

  const impacts = findAffectedPosts(newRule, posts);
  console.log('\nAFFECTED POSTS:');
  console.log(JSON.stringify(impacts, null, 2));
}

const basePosts: Post[] = [
  { postId: 'post_1', title: 'Politics in Italy', body: 'Election analysis and parliament news', flair: undefined, postType: 'text', domain: undefined },
  { postId: 'post_2', title: 'Political meme', body: 'Funny meme about politics', flair: 'Meme', postType: 'image', domain: undefined },
  { postId: 'post_3', title: 'Need medical advice urgently', body: 'Symptoms and diagnosis question', flair: 'Advice', postType: 'text', domain: undefined },
  { postId: 'post_4', title: 'Breaking tech news', body: 'AI product launch', flair: 'News', postType: 'link', domain: 'technews.com' },
  { postId: 'post_5', title: 'Survey for university project', body: 'Please fill this survey', flair: undefined, postType: 'text', domain: undefined },
];

runCase(
  'Case 1: politics flair vs politics ban',
  'Posts about politics must use the "Politics" flair, otherwise remove them.',
  ['Political posts are not allowed.', 'All image posts must have a flair.'],
  basePosts
);

runCase(
  'Case 2: medical advice ban',
  'Posts about medical advice are not allowed.',
  ['Advice posts are allowed if they are respectful.', 'Medical content must use the Advice flair.'],
  basePosts
);

runCase(
  'Case 3: survey restriction',
  'Survey posts are allowed only on weekends.',
  ['Survey posts are allowed.', 'Promotional posts are not allowed.'],
  basePosts
);

runCase(
  'Case 4: domain removal conflict',
  'Posts from technews.com are allowed.',
  ['AutoMod removes posts from technews.com.'],
  basePosts
);

runCase(
  'Case 5: require news flair',
  'AI news posts must use the "News" flair.',
  ['AI posts are allowed.', 'All link posts must have a flair.'],
  basePosts
);
