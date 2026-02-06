// Main test execution loop
// Iterates through all tests, skips completed/tested-today

const fs = require('fs');
const path = require('path');

async function main() {
  // Load queue and state
  const queuePath = path.join(__dirname, '..', 'data', 'tests-queue.json');
  const statePath = path.join(__dirname, '..', 'data', 'test-state.json');
  const queue = JSON.parse(fs.readFileSync(queuePath));
  const state = JSON.parse(fs.readFileSync(statePath));
  const today = new Date().toISOString().split('T')[0];

  console.log('=== TEST LOOP START ===');
  console.log('Total tests: ' + queue.tests.length);
  console.log('Current index: ' + state.currentIndex);
  console.log('Today: ' + today);

  // Output list of GIDs for agent to process
  const remaining = queue.tests.slice(state.currentIndex);
  const gids = remaining.map(t => t.gid).slice(0, 25); // First batch

  console.log('\n=== NEXT BATCH (25 tests) ===');
  console.log(gids.join(','));

  // Save next batch to temp file for easy reading
  const batchPath = path.join(__dirname, '..', 'data', 'next-batch.json');
  fs.writeFileSync(batchPath, JSON.stringify({
    gids,
    startIndex: state.currentIndex,
    endIndex: Math.min(state.currentIndex + 25, queue.tests.length)
  }, null, 2));
}

main().catch(console.error);
