import type { ParsedRule } from './types.js';
export declare const TOPIC_CLUSTERS: Record<string, string[]>;
export declare const STOP_WORDS: Set<string>;
export declare function parseKeywords(text: string): string[];
export declare function parseRule(ruleId: string, text: string, source?: string): ParsedRule;
