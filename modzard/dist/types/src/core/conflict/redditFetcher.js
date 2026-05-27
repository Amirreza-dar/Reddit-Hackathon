import { reddit } from '@devvit/web/server';
function inferPostType(post) {
    const url = post.url.toLowerCase();
    if (url.includes('reddit.com') && post.body !== undefined)
        return 'text';
    if (/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(url))
        return 'image';
    if (url.startsWith('https://') || url.startsWith('http://'))
        return 'link';
    return 'text';
}
function toPost(devvitPost) {
    return {
        postId: devvitPost.id,
        title: devvitPost.title,
        author: devvitPost.authorName,
        body: devvitPost.body ?? '',
        flair: devvitPost.flair?.text ?? undefined,
        postType: inferPostType(devvitPost),
        domain: undefined,
    };
}
function toCommentSummary(comment) {
    return {
        id: comment.id,
        authorName: comment.authorName,
        body: comment.body,
        score: comment.score,
        createdAt: comment.createdAt,
        isDistinguished: comment.isDistinguished(),
    };
}
export async function fetchPostsForAnalysis(subredditName, limit = 25) {
    const listing = reddit.getNewPosts({ subredditName, limit });
    const posts = await listing.all();
    return posts.map(toPost);
}
export async function fetchHotPostsForAnalysis(subredditName, limit = 25) {
    const listing = reddit.getHotPosts({ subredditName, limit });
    const posts = await listing.all();
    return posts.map(toPost);
}
export async function fetchPostComments(postId) {
    const post = await reddit.getPostById(postId);
    const comments = await post.comments.all();
    return comments.map(toCommentSummary);
}
export async function fetchAuthorContext(username, subredditName) {
    const user = await reddit.getUserByUsername(username);
    if (!user)
        return undefined;
    const [postListing] = await Promise.all([
        reddit.getPostsByUser({ username, limit: 10 }).all(),
    ]);
    return {
        username: user.username,
        createdAt: user.createdAt,
        linkKarma: user.linkKarma,
        commentKarma: user.commentKarma,
        isModerator: user.isModerator,
        recentPosts: postListing
            .filter((p) => p.subredditName === subredditName)
            .map(toPost),
    };
}
export async function fetchSubredditRules(subredditName) {
    const rules = await reddit.getRules(subredditName);
    return rules.map((r) => ({
        shortName: r.shortName,
        description: r.description,
        kind: r.kind,
        violationReason: r.violationReason,
        priority: r.priority,
    }));
}
export async function fetchPostContext(postId, subredditName) {
    const devvitPost = await reddit.getPostById(postId);
    const [comments, author] = await Promise.all([
        devvitPost.comments.all(),
        fetchAuthorContext(devvitPost.authorName, subredditName),
    ]);
    const fallbackAuthor = {
        username: devvitPost.authorName,
        createdAt: new Date(0),
        linkKarma: 0,
        commentKarma: 0,
        isModerator: false,
        recentPosts: [],
    };
    return {
        post: toPost(devvitPost),
        commentCount: comments.length,
        comments: comments.map(toCommentSummary),
        author: author ?? fallbackAuthor,
    };
}
//# sourceMappingURL=redditFetcher.js.map