export async function isModerator(context, subredditName) {
    try {
        const currentUser = await context.reddit.getCurrentUser();
        if (!currentUser)
            return false;
        const modList = await context.reddit.getModerators({
            subredditName,
            username: currentUser.username
        });
        return modList.children.length > 0;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=auth.js.map