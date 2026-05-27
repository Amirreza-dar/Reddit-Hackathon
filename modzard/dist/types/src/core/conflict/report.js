export function printRule(rule) {
    console.log('=== Parsed Rule ===');
    console.log(JSON.stringify(rule, null, 2));
    console.log('');
}
export function printConflicts(conflicts) {
    console.log('=== Conflicts ===');
    if (conflicts.length === 0) {
        console.log('No conflicts found.\n');
        return;
    }
    for (const conflict of conflicts) {
        console.log(`- [${conflict.level}] ${conflict.existingRuleId} | score=${conflict.score.toFixed(2)} | ${conflict.reason}`);
    }
    console.log('');
}
export function printImpacts(impacts) {
    console.log('=== Affected Posts ===');
    if (impacts.length === 0) {
        console.log('No likely affected posts found.\n');
        return;
    }
    for (const impact of impacts) {
        console.log(`- [${impact.level}] ${impact.postId} | score=${impact.score.toFixed(2)} | ${impact.reason}`);
    }
    console.log('');
}
//# sourceMappingURL=report.js.map