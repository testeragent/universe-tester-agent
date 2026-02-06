/**
 * Pobiera znane bugi - zoptymalizowane (tylko potrzebne)
 *
 * Użycie:
 * node get-known-bugs.js                    # wszystkie z ostatnich 30 dni
 * node get-known-bugs.js --category=PROJ    # tylko kategoria PROJ
 * node get-known-bugs.js --code=TC-PROJ-002 # sprawdź konkretny kod
 * node get-known-bugs.js --add=TC-XXX-000,CAT,GID  # dodaj nowy bug
 * node get-known-bugs.js --update=TC-XXX-000       # aktualizuj datę "last"
 *
 * Output (JSON):
 * { "found": true, "bugs": ["TC-PROJ-002", "TC-PROJ-004"] }
 * { "found": false, "bugs": [] }
 */

const fs = require('fs');
const path = require('path');

const BUGS_FILE = path.join(__dirname, '..', 'config', 'known-bugs.json');
const DAYS_THRESHOLD = 30;

function loadBugs() {
    try {
        const content = fs.readFileSync(BUGS_FILE, 'utf8');
        return JSON.parse(content);
    } catch (e) {
        return { version: 2, lastUpdate: new Date().toISOString().slice(0, 10), bugs: [] };
    }
}

function saveBugs(data) {
    data.lastUpdate = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(BUGS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function isRecent(dateStr, days = DAYS_THRESHOLD) {
    const bugDate = new Date(dateStr);
    const now = new Date();
    const diffDays = (now - bugDate) / (1000 * 60 * 60 * 24);
    return diffDays <= days;
}

function extractCategory(code) {
    // TC-PROJ-002 → PROJ
    const match = code.match(/TC-([A-Z]+)-/);
    return match ? match[1] : null;
}

// Parse arguments
const args = process.argv.slice(2);
const params = {};
args.forEach(arg => {
    if (arg.startsWith('--')) {
        const [key, value] = arg.slice(2).split('=');
        params[key] = value || true;
    }
});

const data = loadBugs();

// --code: sprawdź czy konkretny kod istnieje
if (params.code) {
    const found = data.bugs.find(b => b.code === params.code);
    console.log(JSON.stringify({
        found: !!found,
        bug: found || null
    }));
    process.exit(0);
}

// --add: dodaj nowy bug (code,category,gid)
if (params.add) {
    const [code, cat, gid] = params.add.split(',');
    const existing = data.bugs.find(b => b.code === code);

    if (existing) {
        existing.last = new Date().toISOString().slice(0, 10);
        saveBugs(data);
        console.log(JSON.stringify({ action: 'updated', code }));
    } else {
        const today = new Date().toISOString().slice(0, 10);
        data.bugs.push({
            code,
            cat: cat || extractCategory(code),
            gid: gid || null,
            first: today,
            last: today
        });
        saveBugs(data);
        console.log(JSON.stringify({ action: 'added', code }));
    }
    process.exit(0);
}

// --update: aktualizuj datę "last"
if (params.update) {
    const bug = data.bugs.find(b => b.code === params.update);
    if (bug) {
        bug.last = new Date().toISOString().slice(0, 10);
        saveBugs(data);
        console.log(JSON.stringify({ action: 'updated', code: params.update }));
    } else {
        console.log(JSON.stringify({ action: 'not_found', code: params.update }));
    }
    process.exit(0);
}

// --category: filtruj po kategorii
if (params.category) {
    const filtered = data.bugs
        .filter(b => b.cat === params.category)
        .map(b => b.code);
    console.log(JSON.stringify({
        found: filtered.length > 0,
        count: filtered.length,
        bugs: filtered
    }));
    process.exit(0);
}

// Domyślnie: zwróć wszystkie z ostatnich 30 dni (tylko kody)
const recent = data.bugs
    .filter(b => isRecent(b.last))
    .map(b => b.code);

console.log(JSON.stringify({
    found: recent.length > 0,
    count: recent.length,
    bugs: recent
}));
