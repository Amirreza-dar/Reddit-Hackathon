export type RuleAction = 'prohibit' | 'require' | 'allow' | 'remove' | 'warn' | 'restrict' | 'unknown';
export type RuleTarget = 'flair' | 'title' | 'comment' | 'post' | 'link' | 'domain' | 'tag' | 'author';
export type RuleSubject = 'comment' | 'author' | 'post';
export type PostType = 'image' | 'link' | 'text' | 'comment';
export type RuleEffect = 'remove_if_missing' | 'remove_if_matches' | 'warn_only';
export type ConflictLevel = 'conflict' | 'possible_conflict';
export type ImpactLevel = 'affected' | 'possibly_affected' | 'unaffected';
export interface RuleCondition {
    postType: PostType | undefined;
    flair: string | undefined;
    keywords: string[];
    domains: string[];
}
export interface ParsedRule {
    ruleId: string;
    source: string;
    rawText: string;
    subject: RuleSubject;
    action: RuleAction;
    target: RuleTarget;
    value: string | undefined;
    condition: RuleCondition;
    exceptions: string[];
    effect: RuleEffect | undefined;
    priority: number;
}
export interface ConflictResult {
    newRuleId: string;
    existingRuleId: string;
    level: ConflictLevel;
    score: number;
    reason: string;
}
export interface PostImpactResult {
    postId: string;
    title: string;
    author: string;
    body: string;
    level: ImpactLevel;
    score: number;
    reason: string;
}
export interface Post {
    postId: string;
    title: string;
    author: string;
    body: string;
    flair: string | undefined;
    postType: PostType;
    domain: string | undefined;
}
export interface CommentSummary {
    id: string;
    authorName: string;
    body: string;
    score: number;
    createdAt: Date;
    isDistinguished: boolean;
}
export interface AuthorContext {
    username: string;
    createdAt: Date;
    linkKarma: number;
    commentKarma: number;
    isModerator: boolean;
    recentPosts: Post[];
}
export interface PostContext {
    post: Post;
    commentCount: number;
    comments: CommentSummary[];
    author: AuthorContext;
}
export interface SubredditRule {
    shortName: string;
    description: string;
    kind: 'all' | 'link' | 'comment';
    violationReason: string;
    priority: number;
}
export interface AnalysisResult {
    subredditName: string;
    newRuleText: string;
    newRule: ParsedRule;
    existingRules: SubredditRule[];
    conflicts: ConflictResult[];
    affectedPosts: PostImpactResult[];
    postsScanned: number;
}
