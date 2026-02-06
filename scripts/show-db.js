/**
 * Skrypt do wyświetlania zawartości bazy danych
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'test-data.db');

async function showDatabase() {
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buffer);

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           BAZA DANYCH SQLite - test-data.db                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\nLokalizacja: ${DB_PATH}`);
    console.log(`Rozmiar: ${buffer.length} bajtów\n`);

    // 1. Pokaż tabele
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('                         TABELE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
    if (tables.length > 0) {
        tables[0].values.forEach(([name]) => {
            const count = db.exec(`SELECT COUNT(*) FROM ${name}`)[0].values[0][0];
            console.log(`  📁 ${name.padEnd(20)} (${count} rekordów)`);
        });
    }

    // 2. CONFIG
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('                    TABELA: config');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const config = db.exec('SELECT key, value, description FROM config ORDER BY key');
    if (config.length > 0) {
        console.log('  Klucz                    │ Wartość                      │ Opis');
        console.log('  ─────────────────────────┼──────────────────────────────┼─────────────────────────');
        config[0].values.forEach(([key, value, desc]) => {
            console.log(`  ${(key || '').padEnd(24)} │ ${(value || '').padEnd(28)} │ ${desc || ''}`);
        });
    }

    // 3. TEST_CASES
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('                   TABELA: test_cases');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const testCases = db.exec('SELECT id, code, name, category, priority FROM test_cases ORDER BY category, code');
    if (testCases.length > 0 && testCases[0].values.length > 0) {
        console.log('  ID │ Kod           │ Nazwa                              │ Kategoria │ Priorytet');
        console.log('  ───┼───────────────┼────────────────────────────────────┼───────────┼──────────');
        testCases[0].values.forEach(([id, code, name, category, priority]) => {
            const shortName = (name || '').substring(0, 34).padEnd(34);
            console.log(`  ${String(id).padEnd(2)} │ ${(code || '').padEnd(13)} │ ${shortName} │ ${(category || '').padEnd(9)} │ ${priority || ''}`);
        });
    } else {
        console.log('  (brak danych)');
    }

    // 4. TEST_RUNS
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('                    TABELA: test_runs');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const testRuns = db.exec('SELECT id, session_id, status, started_at, finished_at, total_tests, passed, failed, blocked FROM test_runs ORDER BY id');
    if (testRuns.length > 0 && testRuns[0].values.length > 0) {
        console.log('  ID │ Status     │ Start               │ Total │ ✅  │ ❌  │ 🚫');
        console.log('  ───┼────────────┼─────────────────────┼───────┼─────┼─────┼────');
        testRuns[0].values.forEach(([id, sessionId, status, started, finished, total, passed, failed, blocked]) => {
            const startShort = (started || '').substring(0, 19);
            console.log(`  ${String(id).padEnd(2)} │ ${(status || '').padEnd(10)} │ ${startShort.padEnd(19)} │ ${String(total || 0).padEnd(5)} │ ${String(passed || 0).padEnd(3)} │ ${String(failed || 0).padEnd(3)} │ ${blocked || 0}`);
        });
    } else {
        console.log('  (brak danych)');
    }

    // 5. TEST_RESULTS
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('                   TABELA: test_results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const testResults = db.exec(`
        SELECT tr.id, tr.run_id, tc.code, tr.status, tr.duration_ms, tr.error_message
        FROM test_results tr
        LEFT JOIN test_cases tc ON tr.test_case_id = tc.id
        ORDER BY tr.run_id, tr.id
    `);
    if (testResults.length > 0 && testResults[0].values.length > 0) {
        console.log('  ID │ Run │ Test Case     │ Status  │ Czas    │ Błąd');
        console.log('  ───┼─────┼───────────────┼─────────┼─────────┼──────────────────────────────');
        testResults[0].values.forEach(([id, runId, code, status, duration, error]) => {
            const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : status === 'blocked' ? '🚫' : '⏭️';
            const durationStr = duration ? `${duration}ms` : '-';
            const errorShort = error ? error.substring(0, 30) : '-';
            console.log(`  ${String(id).padEnd(2)} │ ${String(runId).padEnd(3)} │ ${(code || '?').padEnd(13)} │ ${icon} ${(status || '').padEnd(6)} │ ${durationStr.padEnd(7)} │ ${errorShort}`);
        });
    } else {
        console.log('  (brak danych)');
    }

    // 6. KNOWN_BUGS
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('                   TABELA: known_bugs');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const knownBugs = db.exec('SELECT id, test_case_code, description, severity, status FROM known_bugs ORDER BY id');
    if (knownBugs.length > 0 && knownBugs[0].values.length > 0) {
        console.log('  ID │ Test Case     │ Opis                                    │ Severity │ Status');
        console.log('  ───┼───────────────┼─────────────────────────────────────────┼──────────┼───────');
        knownBugs[0].values.forEach(([id, code, desc, severity, status]) => {
            const descShort = (desc || '').substring(0, 39).padEnd(39);
            console.log(`  ${String(id).padEnd(2)} │ ${(code || '').padEnd(13)} │ ${descShort} │ ${(severity || '').padEnd(8)} │ ${status || ''}`);
        });
    } else {
        console.log('  (brak danych)');
    }

    // 7. TEST_FILES
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('                   TABELA: test_files');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const testFiles = db.exec('SELECT id, name, type, file_path FROM test_files ORDER BY id');
    if (testFiles.length > 0 && testFiles[0].values.length > 0) {
        testFiles[0].values.forEach(([id, name, type, path]) => {
            console.log(`  ${id}. ${name} (${type}) - ${path}`);
        });
    } else {
        console.log('  (brak danych - tu będą pliki testowe: GeoJSON, Shapefile, itp.)');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    db.close();
}

showDatabase().catch(console.error);
