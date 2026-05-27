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
export async function fetchRemovedPosts(subredditName, limit = 50) {
    // Try spam/removed queue first (visible to mods); fall back to recent posts
    try {
        const listing = reddit['getSpamPosts']?.({ subredditName, limit });
        if (listing) {
            const posts = await listing.all();
            if (posts.length > 0)
                return posts.map(toPost);
        }
    }
    catch {
        // spam queue not available or empty
    }
    // Fallback to new posts
    const listing = reddit.getNewPosts({ subredditName, limit });
    const posts = await listing.all();
    return posts.map(toPost);
}
//# sourceMappingURL=bannedFetcher.js.map