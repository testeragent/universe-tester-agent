/**
 * Eksportuje testy z Asany do pliku CSV
 *
 * Użycie przez agenta:
 * 1. Agent pobiera dane z Asany przez MCP
 * 2. Zapisuje do pliku tymczasowego JSON
 * 3. Uruchamia ten skrypt do konwersji na CSV
 *
 * node export-to-csv.js [input.json] [output.csv]
 *
 * Domyślnie:
 * - input: tests-export-temp.json
 * - output: testy-universe-export.csv
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const INPUT_FILE = args[0] || path.join(__dirname, '..', 'tests-export-temp.json');
const OUTPUT_FILE = args[1] || path.join(__dirname, '..', 'testy-universe-export.csv');

// Mapowanie kategorii na emoji
const CATEGORY_EMOJI = {
    'LOGOWANIE': '🔐',
    'PROJEKTY': '📁',
    'WARSTWY-IMPORT': '📥',
    'WARSTWY-ZARZĄDZANIE': '🗂️',
    'WŁAŚCIWOŚCI': '⚙️',
    'TABELA': '📊',
    'TABELA-ATRYBUTÓW': '📊',
    'MAPA-NAWIGACJA': '🗺️',
    'NARZĘDZIA': '🔧',
    'PUBLIKOWANIE': '🌐',
    'INTERFEJS': '🖥️',
    'WYDAJNOŚĆ': '⚡',
    'BŁĘDY': '🐛'
};

// Kolejność kategorii
const CATEGORY_ORDER = [
    'LOGOWANIE',
    'PROJEKTY',
    'WARSTWY-IMPORT',
    'WARSTWY-ZARZĄDZANIE',
    'WŁAŚCIWOŚCI',
    'TABELA-ATRYBUTÓW',
    'MAPA-NAWIGACJA',
    'NARZĘDZIA',
    'PUBLIKOWANIE',
    'INTERFEJS',
    'WYDAJNOŚĆ',
    'BŁĘDY'
];

function extractTestCode(name) {
    const match = name.match(/TC-[A-Z]+-\d+/);
    return match ? match[0] : '';
}

function extractPriority(name) {
    const match = name.match(/\[P(\d)\]/);
    return match ? `P${match[1]}` : 'P3';
}

function extractTestName(name) {
    // Usuń priorytet i kod, zostaw tylko nazwę
    return name
        .replace(/\[P\d\]\s*/, '')
        .replace(/TC-[A-Z]+-\d+:?\s*/, '')
        .trim();
}

function getCategoryKey(categoryName) {
    // Wyciągnij klucz kategorii z pełnej nazwy
    for (const key of CATEGORY_ORDER) {
        if (categoryName.toUpperCase().includes(key.replace('-', ''))) {
            return key;
        }
    }
    return categoryName;
}

function escapeCSV(value) {
    if (!value) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function convertToCSV(tests) {
    const headers = ['Kategoria', 'Kod', 'Nazwa', 'Priorytet', 'GID Asana'];
    const rows = [headers.join(',')];

    // Sortuj testy według kategorii
    tests.sort((a, b) => {
        const catA = CATEGORY_ORDER.indexOf(getCategoryKey(a.category));
        const catB = CATEGORY_ORDER.indexOf(getCategoryKey(b.category));
        if (catA !== catB) return catA - catB;
        return (a.code || '').localeCompare(b.code || '');
    });

    for (const test of tests) {
        const catKey = getCategoryKey(test.category);
        const catIndex = CATEGORY_ORDER.indexOf(catKey) + 1;
        const emoji = CATEGORY_EMOJI[catKey] || '';
        const categoryDisplay = `${emoji} ${catIndex}. ${catKey}`;

        const row = [
            escapeCSV(categoryDisplay),
            escapeCSV(test.code || extractTestCode(test.name)),
            escapeCSV(test.testName || extractTestName(test.name)),
            escapeCSV(test.priority || extractPriority(test.name)),
            escapeCSV(test.gid)
        ];
        rows.push(row.join(','));
    }

    return rows.join('\n');
}

// Main
try {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`Błąd: Plik wejściowy nie istnieje: ${INPUT_FILE}`);
        console.log(`
Użycie:
1. Agent musi najpierw zapisać dane z Asany do pliku JSON w formacie:
   {
     "tests": [
       {"gid": "123", "name": "[P1] TC-LOGIN-001: Nazwa testu", "category": "LOGOWANIE"},
       ...
     ]
   }

2. Następnie uruchomić:
   node export-to-csv.js [plik.json] [output.csv]
`);
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    const tests = data.tests || data;

    if (!Array.isArray(tests)) {
        console.error('Błąd: Dane muszą być tablicą testów lub obiektem z polem "tests"');
        process.exit(1);
    }

    const csv = convertToCSV(tests);
    fs.writeFileSync(OUTPUT_FILE, csv, 'utf8');

    console.log(JSON.stringify({
        success: true,
        outputFile: OUTPUT_FILE,
        testsCount: tests.length,
        message: `Wyeksportowano ${tests.length} testów do ${OUTPUT_FILE}`
    }));

} catch (e) {
    console.error(JSON.stringify({
        success: false,
        error: e.message
    }));
    process.exit(1);
}
