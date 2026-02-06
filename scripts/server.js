/**
 * Serwer HTTP dla Test Monitor
 *
 * Funkcje:
 * - Serwuje pliki statyczne z monitor/
 * - POST /api/start - uruchamia testy z podaną konfiguracją
 * - GET /api/status - zwraca status testera
 * - POST /api/stop - zatrzymuje testy
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 8080;
const MONITOR_DIR = path.join(__dirname, '..', 'monitor');
const CONFIG_FILE = path.join(__dirname, '..', 'config', 'sheet-config.json');
const STOP_FILE = path.join(__dirname, '..', 'monitor', 'stop-signal.txt');

let testerProcess = null;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

function log(msg) {
    const time = new Date().toLocaleTimeString('pl-PL');
    console.log(`[${time}] ${msg}`);
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

function startTester(sheetName) {
    if (testerProcess) {
        log('Tester już działa');
        return false;
    }

    // Usuń sygnał stopu
    try { fs.unlinkSync(STOP_FILE); } catch (e) {}

    const testerPath = path.join(__dirname, 'auto-tester.js');
    log(`Uruchamiam tester: ${sheetName}`);

    testerProcess = spawn('node', [testerPath, `--sheet=${sheetName}`], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true
    });

    testerProcess.on('exit', (code) => {
        log(`Tester zakończył z kodem: ${code}`);
        testerProcess = null;
    });

    testerProcess.on('error', (err) => {
        log(`Błąd testera: ${err.message}`);
        testerProcess = null;
    });

    return true;
}

function stopTester() {
    // Utwórz sygnał stopu
    fs.writeFileSync(STOP_FILE, 'STOP', 'utf8');
    log('Wysłano sygnał STOP');
    return true;
}

const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API: Start tests
    if (req.method === 'POST' && req.url === '/api/start') {
        try {
            const config = await parseBody(req);

            // Zapisz konfigurację
            const fullConfig = {
                sheetId: config.sheetId || '',
                sheetTitle: config.sheetTitle || 'Testy_Lista',
                sheetUrl: config.sheetUrl || '',
                lastUsed: new Date().toISOString()
            };
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(fullConfig, null, 2), 'utf8');

            // Uruchom tester
            const started = startTester(config.sheetTitle || config.sheetUrl || 'Testy_Lista');

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: started }));
        } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // API: Stop tests
    if (req.method === 'POST' && req.url === '/api/stop') {
        stopTester();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // API: Get status
    if (req.method === 'GET' && req.url === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            running: testerProcess !== null,
            pid: testerProcess?.pid || null
        }));
        return;
    }

    // Static files
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(MONITOR_DIR, filePath.split('?')[0]);

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Not found: ' + req.url);
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    log('========================================');
    log('  Test Monitor Server');
    log(`  http://localhost:${PORT}`);
    log('========================================');
    log('Oczekuję na konfigurację z przeglądarki...');
});

// Graceful shutdown
process.on('SIGINT', () => {
    log('Zamykam serwer...');
    if (testerProcess) {
        stopTester();
    }
    server.close(() => {
        process.exit(0);
    });
});
