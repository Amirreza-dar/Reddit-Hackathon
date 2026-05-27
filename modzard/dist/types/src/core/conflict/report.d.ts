import type { ParsedRule, ConflictResult, PostImpactResult } from './types.js';
export declare function printRule(rule: ParsedRule): void;
export declare function printConflicts(conflicts: ConflictResult[]): void;
export declare function printImpacts(impacts: PostImpactResult[]): void;
