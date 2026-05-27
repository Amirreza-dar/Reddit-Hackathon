export declare const ABBREVIATIONS: Record<string, string>;
/** Expand abbreviations in-place: "my gp said" → "my gp doctor said" */
export declare function expandAbbreviations(text: string): string;
/** Returns content words that are negated in context (lowercased). */
export declare function getNegatedWords(text: string): Set<string>;
export type TopicVec = [number, number, number, number, number, number, number];
export declare const CLUSTER_VECS: Record<string, TopicVec>;
export declare const EXTENDED_VOCAB: Record<string, TopicVec>;
export declare function cosine(a: TopicVec, b: TopicVec): number;
export declare function avgVec(vecs: TopicVec[]): TopicVec | null;
/**
 * Return the topic vector for a word, or null if unknown.
 * TOPIC_CLUSTERS membership takes priority over EXTENDED_VOCAB.
 */
export declare function getWordVector(word: string, wordToCluster: Map<string, string>): TopicVec | null;
/**
 * Find words in the post that are NOT caught by cluster matching but have a
 * cosine similarity ≥ threshold with the rule's topic centroid vector.
 * Returns { word, similarity } pairs sorted by similarity descending.
 */
export declare function findVectorMatches(ruleVec: TopicVec, postText: string, wordToCluster: Map<string, string>, alreadyMatched: Set<string>, threshold?: number): Array<{
    word: string;
    similarity: number;
}>;
