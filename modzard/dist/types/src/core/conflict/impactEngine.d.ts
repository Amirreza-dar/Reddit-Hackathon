import type { ParsedRule, Post, PostImpactResult } from './types.js';
export declare function classifyPostImpact(rule: ParsedRule, post: Post): PostImpactResult;
export declare function findAffectedPosts(rule: ParsedRule, posts: Post[], limit?: number): PostImpactResult[];
