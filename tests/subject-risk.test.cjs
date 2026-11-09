const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync(require.resolve('../src/lib/subject-risk.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const loaded = { exports: {} };
new Function('exports', 'module', compiled)(loaded.exports, loaded);
const { riskColor, riskPercentage, matchesRiskFilter, needsFollowUp, riskSubjects } = loaded.exports;
const subject = { id: 'math', group: '1', absences: 8, absenceLimit: 10, missedAssignments: 2, missedAssignmentLimit: 5 };

test('thresholds distinguish approaching, reaching, and exceeding each limit', () => {
  assert.deepEqual([0, 4, 5, 7, 8, 9, 10, 11].map(value => riskColor(value, 10)), ['green', 'green', 'yellow', 'yellow', 'orange', 'orange', 'orange', 'red']);
  assert.equal(riskColor(4, 5), 'orange');
  assert.equal(riskPercentage(12, 10), '120%');
});
test('zero limits and invalid data do not produce misleading percentages', () => {
  assert.equal(riskColor(0, 0), 'green');
  assert.equal(riskColor(1, 0), 'red');
  assert.equal(riskPercentage(1, 0), 'límite cero superado');
  for (const [value, limit] of [[NaN, 5], [2, NaN], [2, -1], [-1, 4], [Infinity, 5]]) assert.equal(riskColor(value, limit), 'unknown');
});
test('both requires the chosen color in both halves of the same subject', () => {
  const student = { subjectSummaries: [subject, { ...subject, id: 'history', absences: 0, missedAssignments: 4 }] };
  assert.equal(matchesRiskFilter(student, 'orange', 'absences'), true);
  assert.equal(matchesRiskFilter(student, 'orange', 'ne'), true);
  assert.equal(matchesRiskFilter(student, 'orange', 'either'), true);
  assert.equal(matchesRiskFilter(student, 'orange', 'both'), false);
  assert.equal(matchesRiskFilter({ subjects: [{ ...subject, missedAssignments: 4 }] }, 'orange', 'both'), true);
  assert.equal(matchesRiskFilter(student, 'red', 'either'), false);
});
test('students without subjects remain visible only without a color filter', () => {
  assert.equal(matchesRiskFilter({}, 'all', 'both'), true);
  assert.equal(matchesRiskFilter({}, 'green', 'either'), false);
  assert.deepEqual(riskSubjects({ subjectSummaries: [], subjects: [subject] }), [subject]);
});
test('follow-up resolves current counts but becomes required on a new risky increase', () => {
  assert.equal(needsFollowUp(subject), true);
  const latest = { absences: 8, missedAssignments: 2 };
  assert.equal(needsFollowUp(subject, latest), false);
  assert.equal(needsFollowUp({ ...subject, absences: 9 }, latest), true);
  assert.equal(needsFollowUp({ ...subject, missedAssignments: 4 }, latest), true);
  assert.equal(needsFollowUp({ ...subject, missedAssignments: 3 }, latest), false);
  assert.equal(needsFollowUp({ ...subject, absences: 2 }), false);
  assert.equal(needsFollowUp({ ...subject, absences: 5 }), false);
  assert.equal(needsFollowUp({ ...subject, absences: 11 }), true);
});
