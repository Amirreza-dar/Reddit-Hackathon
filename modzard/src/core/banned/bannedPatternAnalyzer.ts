import type { Post } from '../conflict/types.js';
import type { LocalPatternSummary } from './patternTypes.js';
import { TOPIC_CLUSTERS } from '../conflict/parser.js';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or',
  'but', 'not', 'with', 'this', 'that', 'was', 'are', 'be', 'have', 'has', 'i',
  'my', 'we', 'you', 'your', 'they', 'their', 'he', 'she', 'his', 'her', 'from',
  'by', 'as', 'so', 'if', 'do', 'did', 'can', 'will', 'would', 'should', 'could',
  'been', 'had', 'all', 'any', 'no', 'up', 'out', 'about', 'just', 'more',
  'there', 'when', 'what', 'which', 'who', 'how', 'into', 'than', 'then', 'its', 'also',
]);

export function buildLocalPatternSummary(
  posts: Post[],
  _keywordHints: string[] = []
): LocalPatternSummary {
  const wordCount: Record<string, number> = {};
  const authorCount: Record<string, number> = {};
  const topicCount: Record<string, number> = {};

  const wordToTopic: Record<string, string> = {};
  for (const [topic, words] of Object.entries(TOPIC_CLUSTERS)) {
    for (const w of words) {
      wordToTopic[w.toLowerCase()] = topic;
    }
  }

  for (const post of posts) {
    authorCount[post.author] = (authorCount[post.author] ?? 0) + 1;

    const text = `${post.title} ${post.body}`.toLowerCase();
    const words = text.split(/\W+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
    for (const w of words) {
      wordCount[w] = (wordCount[w] ?? 0) + 1;
      const topic = wordToTopic[w];
      if (topic) topicCount[topic] = (topicCount[topic] ?? 0) + 1;
    }
  }

  const topKeywords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word, count]) => ({ word, count }));

  const topAuthors = Object.entries(authorCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([username, count]) => ({ username, count }));

  return { totalPosts: posts.length, topKeywords, topAuthors, topicCounts: topicCount };
}

