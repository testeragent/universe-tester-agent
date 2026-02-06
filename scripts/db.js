/**
 * Moduł obsługi bazy danych SQLite dla agenta testera
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'test-data.db');

let db = null;
let SQL = null;

/**
 * Inicjalizuje połączenie z bazą danych
 */
async function connect() {
    if (db) return db;

    SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
    } else {
        throw new Error(`Baza danych nie istnieje: ${DB_PATH}. Uruchom najpierw: npm run init-db`);
    }

    return db;
}

/**
 * Zapisuje zmiany do pliku
 */
function save() {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Zamyka połączenie z bazą
 */
function close() {
    if (db) {
        save();
        db.close();
        db = null;
    }
}

// ============================================
// TEST CASES
// ============================================

async function addTestCase(testCase) {
    await connect();
    const stmt = db.prepare(`
        INSERT INTO test_cases (code, name, category, priority, description, preconditions, steps, expected_result, asana_task_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    // Konwertuj undefined na null - sql.js nie obsługuje undefined
    stmt.run([
        testCase.code ?? null,
        testCase.name ?? null,
        testCase.category ?? null,
        testCase.priority ?? 'P2',
        testCase.description ?? null,
        testCase.preconditions ?? null,
        testCase.steps ?? null,
        testCase.expectedResult ?? null,
        testCase.asanaTaskId ?? null
    ]);
    stmt.free();
    save();

    // Pobierz ID z ostatnio wstawionego rekordu - użyj prepared statement
    const selectStmt = db.prepare('SELECT id FROM test_cases WHERE code = ?');
    selectStmt.bind([testCase.code]);
    let id = null;
    if (selectStmt.step()) {
        id = selectStmt.get()[0];
    }
    selectStmt.free();
    return id;
}

async function getTestCase(code) {
    await connect();
    // Użyj prepared statement aby uniknąć SQL injection
    const stmt = db.prepare('SELECT * FROM test_cases WHERE code = ?');
    stmt.bind([code]);

    if (!stmt.step()) {
        stmt.free();
        return null;
    }

    const columns = stmt.getColumnNames();
    const values = stmt.get();
    stmt.free();

    const obj = {};
    columns.forEach((col, i) => obj[col] = values[i]);
    return obj;
}

async function getTestCasesByCategory(category) {
    await connect();
    // Użyj prepared statement aby uniknąć SQL injection
    const stmt = db.prepare('SELECT * FROM test_cases WHERE category = ? ORDER BY priority, code');
    stmt.bind([category]);

    const results = [];
    while (stmt.step()) {
        const columns = stmt.getColumnNames();
        const values = stmt.get();
        const obj = {};
        columns.forEach((col, i) => obj[col] = values[i]);
        results.push(obj);
    }
    stmt.free();
    return results;
}

async function getAllTestCases() {
    await connect();
    const result = db.exec('SELECT * FROM test_cases ORDER BY category, priority, code');
    if (result.length === 0) return [];

    return result[0].values.map(row => {
        const obj = {};
        result[0].columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
    });
}

// ============================================
// TEST RUNS
// ============================================

async function startTestRun(config = {}) {
    await connect();
    const sessionId = `run-${Date.now()}`;
    const stmt = db.prepare(`
        INSERT INTO test_runs (session_id, started_at, agent_config)
        VALUES (?, datetime('now'), ?)
    `);
    stmt.run([sessionId, JSON.stringify(config)]);
    stmt.free();
    save();

    // Pobierz ID z ostatnio wstawionego rekordu - użyj prepared statement
    const selectStmt = db.prepare('SELECT id FROM test_runs WHERE session_id = ?');
    selectStmt.bind([sessionId]);
    let id = null;
    if (selectStmt.step()) {
        id = selectStmt.get()[0];
    }
    selectStmt.free();
    return { id, sessionId };
}

async function endTestRun(runId, stats) {
    await connect();
    // Użyj prepared statement aby uniknąć SQL injection
    const stmt = db.prepare(`
        UPDATE test_runs
        SET finished_at = datetime('now'),
            status = 'completed',
            total_tests = ?,
            passed = ?,
            failed = ?,
            blocked = ?,
            skipped = ?,
            notes = ?
        WHERE id = ?
    `);
    stmt.run([
        stats.total || 0,
        stats.passed || 0,
        stats.failed || 0,
        stats.blocked || 0,
        stats.skipped || 0,
        stats.notes || '',
        runId
    ]);
    stmt.free();
    save();
}

async function getTestRun(runId) {
    await connect();
    // Użyj prepared statement aby uniknąć SQL injection
    const stmt = db.prepare('SELECT * FROM test_runs WHERE id = ?');
    stmt.bind([runId]);

    if (!stmt.step()) {
        stmt.free();
        return null;
    }

    const columns = stmt.getColumnNames();
    const values = stmt.get();
    stmt.free();

    const obj = {};
    columns.forEach((col, i) => obj[col] = values[i]);
    return obj;
}

// ============================================
// TEST RESULTS
// ============================================

async function addTestResult(result) {
    await connect();
    const stmt = db.prepare(`
        INSERT INTO test_results (run_id, test_case_id, status, started_at, finished_at, duration_ms, error_message, screenshot_path, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    // Konwertuj undefined na null - sql.js nie obsługuje undefined
    stmt.run([
        result.runId ?? null,
        result.testCaseId ?? null,
        result.status ?? null,
        result.startedAt ?? null,
        result.finishedAt ?? null,
        result.durationMs ?? null,
        result.errorMessage ?? null,
        result.screenshotPath ?? null,
        result.notes ?? null
    ]);
    stmt.free();
    save();
}

async function getResultsForRun(runId) {
    await connect();
    // Użyj prepared statement aby uniknąć SQL injection
    const stmt = db.prepare(`
        SELECT tr.*, tc.code, tc.name, tc.category
        FROM test_results tr
        JOIN test_cases tc ON tr.test_case_id = tc.id
        WHERE tr.run_id = ?
        ORDER BY tr.id
    `);
    stmt.bind([runId]);

    const results = [];
    while (stmt.step()) {
        const columns = stmt.getColumnNames();
        const values = stmt.get();
        const obj = {};
        columns.forEach((col, i) => obj[col] = values[i]);
        results.push(obj);
    }
    stmt.free();
    return results;
}

// ============================================
// CONFIG
// ============================================

async function getConfig(key) {
    await connect();
    // Użyj prepared statement aby uniknąć SQL injection
    const stmt = db.prepare('SELECT value FROM config WHERE key = ?');
    stmt.bind([key]);

    if (!stmt.step()) {
        stmt.free();
        return null;
    }

    const value = stmt.get()[0];
    stmt.free();
    return value;
}

async function setConfig(key, value, description = null) {
    await connect();
    // Użyj prepared statement aby uniknąć SQL injection
    if (description) {
        const stmt = db.prepare('INSERT OR REPLACE INTO config (key, value, description, updated_at) VALUES (?, ?, ?, datetime("now"))');
        stmt.run([key, value, description]);
        stmt.free();
    } else {
        const stmt = db.prepare('UPDATE config SET value = ?, updated_at = datetime("now") WHERE key = ?');
        stmt.run([value, key]);
        stmt.free();
    }
    save();
}

async function getAllConfig() {
    await connect();
    const result = db.exec('SELECT * FROM config ORDER BY key');
    if (result.length === 0) return [];

    return result[0].values.map(row => {
        const obj = {};
        result[0].columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
    });
}

// ============================================
// KNOWN BUGS
// ============================================

async function addKnownBug(bug) {
    await connect();
    const stmt = db.prepare(`
        INSERT INTO known_bugs (test_case_code, description, severity, status, asana_task_id)
        VALUES (?, ?, ?, ?, ?)
    `);
    // Konwertuj undefined na null
    stmt.run([
        bug.testCaseCode ?? null,
        bug.description ?? null,
        bug.severity ?? 'medium',
        bug.status ?? 'open',
        bug.asanaTaskId ?? null
    ]);
    stmt.free();
    save();
}

async function getKnownBugsForTest(testCaseCode) {
    await connect();
    // Użyj prepared statement aby uniknąć SQL injection
    const stmt = db.prepare('SELECT * FROM known_bugs WHERE test_case_code = ? AND status = ?');
    stmt.bind([testCaseCode, 'open']);

    const results = [];
    while (stmt.step()) {
        const columns = stmt.getColumnNames();
        const values = stmt.get();
        const obj = {};
        columns.forEach((col, i) => obj[col] = values[i]);
        results.push(obj);
    }
    stmt.free();
    return results;
}

async function updateKnownBugLastSeen(testCaseCode, date = null) {
    await connect();
    const lastSeen = date || new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const stmt = db.prepare('UPDATE known_bugs SET last_seen_at = ?, updated_at = datetime("now") WHERE test_case_code = ?');
    stmt.run([lastSeen, testCaseCode]);
    stmt.free();
    save();
}

async function closeKnownBug(testCaseCode) {
    await connect();
    const stmt = db.prepare('UPDATE known_bugs SET status = ?, resolved_at = datetime("now"), updated_at = datetime("now") WHERE test_case_code = ?');
    stmt.run(['closed', testCaseCode]);
    stmt.free();
    save();
}

// ============================================
// STATS
// ============================================

async function getStats() {
    await connect();

    const testCases = db.exec('SELECT COUNT(*) FROM test_cases')[0].values[0][0];
    const testRuns = db.exec('SELECT COUNT(*) FROM test_runs')[0].values[0][0];
    const results = db.exec('SELECT COUNT(*) FROM test_results')[0].values[0][0];
    const bugs = db.exec("SELECT COUNT(*) FROM known_bugs WHERE status = 'open'")[0].values[0][0];

    const byStatus = db.exec(`
        SELECT status, COUNT(*) as count
        FROM test_results
        GROUP BY status
    `);

    const statusCounts = {};
    if (byStatus.length > 0) {
        byStatus[0].values.forEach(row => {
            statusCounts[row[0]] = row[1];
        });
    }

    return {
        testCases,
        testRuns,
        totalResults: results,
        openBugs: bugs,
        resultsByStatus: statusCounts
    };
}

module.exports = {
    connect,
    save,
    close,
    // Test Cases
    addTestCase,
    getTestCase,
    getTestCasesByCategory,
    getAllTestCases,
    // Test Runs
    startTestRun,
    endTestRun,
    getTestRun,
    // Test Results
    addTestResult,
    getResultsForRun,
    // Config
    getConfig,
    setConfig,
    getAllConfig,
    // Known Bugs
    addKnownBug,
    getKnownBugsForTest,
    updateKnownBugLastSeen,
    closeKnownBug,
    // Stats
    getStats
};
