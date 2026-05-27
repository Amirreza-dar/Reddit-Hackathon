export interface LocalPatternSummary {
    totalPosts: number;
    topKeywords: Array<{
        word: string;
        count: number;
    }>;
    topAuthors: Array<{
        username: string;
        count: number;
    }>;
    topicCounts: Record<string, number>;
}
