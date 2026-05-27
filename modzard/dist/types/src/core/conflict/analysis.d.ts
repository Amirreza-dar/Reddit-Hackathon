import type { AnalysisResult } from './types.js';
export declare function runConflictAnalysis(subredditName: string, newRuleText: string, postLimit?: number): Promise<AnalysisResult>;
