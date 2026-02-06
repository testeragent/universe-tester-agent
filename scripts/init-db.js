const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'test-data.db');

async function initDatabase() {
    console.log('Inicjalizacja bazy danych SQLite...');

    const SQL = await initSqlJs();
    const db = new SQL.Database();

    // Tabela: test_cases - definicje przypadków testowych
    db.run(`
        CREATE TABLE IF NOT EXISTS test_cases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            priority TEXT DEFAULT 'P2',
            description TEXT,
            preconditions TEXT,
            steps TEXT,
            expected_result TEXT,
            asana_task_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabela: test_runs - sesje testowe
    db.run(`
        CREATE TABLE IF NOT EXISTS test_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT UNIQUE NOT NULL,
            started_at DATETIME NOT NULL,
            finished_at DATETIME,
            status TEXT DEFAULT 'running',
            total_tests INTEGER DEFAULT 0,
            passed INTEGER DEFAULT 0,
            failed INTEGER DEFAULT 0,
            blocked INTEGER DEFAULT 0,
            skipped INTEGER DEFAULT 0,
            agent_config TEXT,
            notes TEXT
        )
    `);

    // Tabela: test_results - wyniki poszczególnych testów
    db.run(`
        CREATE TABLE IF NOT EXISTS test_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER NOT NULL,
            test_case_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            started_at DATETIME,
            finished_at DATETIME,
            duration_ms INTEGER,
            error_message TEXT,
            screenshot_path TEXT,
            console_logs TEXT,
            network_logs TEXT,
            notes TEXT,
            FOREIGN KEY (run_id) REFERENCES test_runs(id),
            FOREIGN KEY (test_case_id) REFERENCES test_cases(id)
        )
    `);

    // Tabela: test_files - pliki testowe (GeoJSON, Shapefile, itp.)
    db.run(`
        CREATE TABLE IF NOT EXISTS test_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER,
            checksum TEXT,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabela: known_bugs - znane błędy
    db.run(`
        CREATE TABLE IF NOT EXISTS known_bugs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_case_code TEXT NOT NULL,
            description TEXT NOT NULL,
            severity TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'open',
            asana_task_id TEXT,
            first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_seen DATETIME,
            occurrences INTEGER DEFAULT 1
        )
    `);

    // Tabela: config - konfiguracja agenta
    db.run(`
        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            description TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Wstaw domyślną konfigurację
    const defaultConfig = [
        ['app_url', 'https://universe.mapmaker.pl', 'URL aplikacji do testowania'],
        ['max_tests_per_session', '20', 'Maksymalna liczba testów na sesję'],
        ['screenshot_on_failure', 'true', 'Czy robić screenshot przy błędzie'],
        ['timeout_ms', '30000', 'Timeout dla operacji (ms)'],
        ['retry_failed', 'false', 'Czy ponawiać nieudane testy'],
        ['asana_project_id', '1212768567996689', 'ID projektu Testy Universe w Asanie']
    ];

    const insertConfig = db.prepare('INSERT OR REPLACE INTO config (key, value, description) VALUES (?, ?, ?)');
    for (const [key, value, desc] of defaultConfig) {
        insertConfig.run([key, value, desc]);
    }
    insertConfig.free();

    // Indeksy dla wydajności
    db.run('CREATE INDEX IF NOT EXISTS idx_test_cases_code ON test_cases(code)');
    db.run('CREATE INDEX IF NOT EXISTS idx_test_cases_category ON test_cases(category)');
    db.run('CREATE INDEX IF NOT EXISTS idx_test_results_run_id ON test_results(run_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_known_bugs_test_case ON known_bugs(test_case_code)');

    // Zapisz bazę do pliku
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);

    console.log(`Baza danych utworzona: ${DB_PATH}`);
    console.log(`Rozmiar: ${buffer.length} bajtów`);

    // Pokaż statystyki
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('\nUtworzono tabele:');
    tables[0].values.forEach(t => console.log(`  - ${t[0]}`));

    db.close();
    console.log('\nBaza danych gotowa do użycia!');
}

initDatabase().catch(err => {
    console.error('Błąd inicjalizacji bazy:', err);
    process.exit(1);
});
