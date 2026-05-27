import type { Post, CommentSummary, AuthorContext, PostContext, SubredditRule } from './types.js';
export declare function fetchPostsForAnalysis(subredditName: string, limit?: number): Promise<Post[]>;
export declare function fetchHotPostsForAnalysis(subredditName: string, limit?: number): Promise<Post[]>;
export declare function fetchPostComments(postId: string): Promise<CommentSummary[]>;
export declare function fetchAuthorContext(username: string, subredditName: string): Promise<AuthorContext | undefined>;
export declare function fetchSubredditRules(subredditName: string): Promise<SubredditRule[]>;
export declare function fetchPostContext(postId: string, subredditName: string): Promise<PostContext>;
