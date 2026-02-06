// Find tests that should be executed
// Criteria:
// 1. completed=false
// 2. NOT in known-bugs with today's date (or executed < 1 day ago)

const fs = require('fs');

const today = '2026-02-04';

// Known bugs from known-bugs.md with last seen dates
const knownBugs = {
  'TC-PROJ-003': '2026-02-03',
  'TC-PROJ-005': '2026-02-03',
  'TC-LOGIN-008': '2026-02-04', // tested TODAY - defer
  'TC-PROJ-004': '2026-02-04',  // tested TODAY - defer
  'TC-PROJ-002': '2026-02-04',  // tested TODAY - defer
  'TC-NAV-004': '2026-02-03',
  'TC-NAV-007': '2026-01-28',
  'TC-IMPORT-009': '2026-01-29',
  'TC-IMPORT-012': '2026-02-04'  // tested TODAY - defer
};

// Incomplete tests from first batch (from earlier fetch)
const batch1Incomplete = [
  { gid: '1212837504116076', code: 'TC-LOGIN-008' },
  { gid: '1212812374170556', code: 'TC-PROJ-004' },
  { gid: '1212837500954079', code: 'TC-PROJ-002' }
];

console.log('=== EXECUTABLE TESTS (Batch 1) ===\n');

const executable = [];
const deferred = [];

for (const test of batch1Incomplete) {
  const knownDate = knownBugs[test.code];

  if (knownDate === today) {
    console.log(`DEFER: ${test.code} - tested today (${knownDate})`);
    deferred.push(test);
  } else if (knownDate) {
    console.log(`EXECUTE (retest): ${test.code} - last tested ${knownDate}`);
    executable.push(test);
  } else {
    console.log(`EXECUTE (new/passed before): ${test.code}`);
    executable.push(test);
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Executable now: ${executable.length}`);
console.log(`Deferred (tested today): ${deferred.length}`);

if (executable.length === 0) {
  console.log('\nNo tests to execute in batch 1. Need to check more batches or return to deferred later.');
}
