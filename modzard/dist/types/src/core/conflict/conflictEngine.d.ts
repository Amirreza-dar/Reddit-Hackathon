import type { ParsedRule, ConflictResult } from './types.js';
export declare function semanticMatch(a: string, b: string): boolean;
export declare function computeScopeOverlap(a: ParsedRule, b: ParsedRule): number;
export declare function detectConflicts(newRule: ParsedRule, existingRules: ParsedRule[]): ConflictResult[];
