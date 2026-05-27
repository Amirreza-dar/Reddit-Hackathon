import type { Context } from '@devvit/public-api';


export async function isModerator(
    context: Context, 
    subredditName: string,
): Promise<boolean> {
    try {
        const currentUser = await context.reddit.getCurrentUser();
        if (!currentUser) return false;

        const modList = await context.reddit.getModerators({
            subredditName,
            username: currentUser.username
        });

        return modList.children.length > 0;
    } catch {
        return false;
    }
}