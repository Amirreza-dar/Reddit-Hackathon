import type { Post } from '../conflict/types.js';
export declare function fetchRemovedPosts(subredditName: string, limit?: number): Promise<Post[]>;
