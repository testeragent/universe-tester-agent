/**
 * Pobiera wszystkie testy z Asany i zapisuje do pliku JSON
 *
 * Użycie (przez agenta):
 * powershell -Command "node 'C:\Users\Dom\.claude\agents\tester\scripts\fetch-tests.js'"
 *
 * Output: tests-queue.json z listą wszystkich niezakończonych testów
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'tests-queue.json');

// Kategorie testów (GID z Asany)
const CATEGORIES = [
    { gid: '1212837488529448', name: '1. LOGOWANIE' },
    { gid: '1212812926071907', name: '2. PROJEKTY' },
    { gid: '1212837487510817', name: '3. WARSTWY-IMPORT' },
    { gid: '1212837487537647', name: '4. WARSTWY-ZARZĄDZANIE' },
    { gid: '1212812926071929', name: '5. WŁAŚCIWOŚCI WARSTWY' },
    { gid: '1212812373969967', name: '6. TABELA ATRYBUTÓW' },
    { gid: '1212812926187046', name: '7. MAPA-NAWIGACJA' },
    { gid: '1212837487488859', name: '8. NARZĘDZIA' },
    { gid: '1212837497550766', name: '9. PUBLIKOWANIE' },
    { gid: '1212837487563876', name: '10. INTERFEJS' },
    { gid: '1212812926155836', name: '11. WYDAJNOŚĆ' },
    { gid: '1212837496855208', name: '12. BŁĘDY' }
];

// Ta funkcja będzie wywoływana przez agenta który ma dostęp do MCP Asana
// Skrypt tylko generuje strukturę - agent musi wypełnić dane

function generateTemplate() {
    const template = {
        generatedAt: new Date().toISOString(),
        categories: CATEGORIES,
        instructions: `
AGENT: Wypełnij ten plik danymi z Asany!

Dla każdej kategorii wykonaj:
1. asana_get_task(category.gid, opt_fields="subtasks.gid,subtasks.name,subtasks.completed")
2. Dla każdego subtaska z completed=false, dodaj do tablicy "tests"

Format każdego testu:
{
    "gid": "1234567890",
    "code": "TC-XXX-000",
    "name": "Pełna nazwa testu",
    "category": "1. LOGOWANIE",
    "categoryGid": "1212837488529448",
    "completed": false
}
`,
        tests: []
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(template, null, 2), 'utf8');
    console.log(`Template zapisany do: ${OUTPUT_FILE}`);
    console.log(`Kategorii: ${CATEGORIES.length}`);
    console.log('\nAgent musi teraz wypełnić plik danymi z Asany!');
}

generateTemplate();
