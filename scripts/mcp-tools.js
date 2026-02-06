/**
 * MCP-ready Tools dla Agent Tester
 *
 * Agent jest cienkim orchestratorem - NIE wykonuje:
 * - Parsowania złożonych struktur
 * - Walidacji wyników
 * - Analizy DOM
 *
 * Zamiast tego deleguje do tych narzędzi.
 *
 * Użycie:
 * node mcp-tools.js validate_test_result '{"actual":"PASS: Dashboard widoczny"}'
 * node mcp-tools.js parse_asana_test '{"name":"[P1] TC-LOGIN-001: Logowanie","notes":"## Kroki\n1. ..."}'
 * node mcp-tools.js extract_test_steps '{"notes":"## Kroki\n1. Otwórz stronę\n2. Kliknij"}'
 * node mcp-tools.js classify_test_result '{"playwrightResult":"FAIL: timeout","screenshotPath":"error.png"}'
 */

const tools = {
    /**
     * Waliduje wynik testu z Playwright
     * @param {object} input - { actual: string, expected?: string }
     * @returns {{ status: 'PASS'|'FAIL'|'BLOCKED', reason: string }}
     */
    validate_test_result(input) {
        const { actual, expected } = input;

        if (!actual) {
            return { status: 'BLOCKED', reason: 'Brak wyniku z Playwright' };
        }

        const actualStr = String(actual).toUpperCase();

        // Sprawdź czy wynik z Playwright zawiera PASS/FAIL
        if (actualStr.startsWith('PASS')) {
            return {
                status: 'PASS',
                reason: actual.replace(/^PASS:?\s*/i, '') || 'Test zaliczony'
            };
        }

        if (actualStr.startsWith('FAIL')) {
            return {
                status: 'FAIL',
                reason: actual.replace(/^FAIL:?\s*/i, '') || 'Test niezaliczony'
            };
        }

        // Sprawdź znane wzorce błędów
        if (actualStr.includes('TIMEOUT') || actualStr.includes('TIMED OUT')) {
            return { status: 'FAIL', reason: 'Timeout - element nie znaleziony' };
        }

        if (actualStr.includes('NOT FOUND') || actualStr.includes('NO ELEMENT')) {
            return { status: 'FAIL', reason: 'Element nie znaleziony na stronie' };
        }

        if (actualStr.includes('BLOCKED') || actualStr.includes('SKIP')) {
            return { status: 'BLOCKED', reason: actual };
        }

        // Nieznany format - traktuj jako FAIL
        return { status: 'FAIL', reason: `Nieoczekiwany wynik: ${actual}` };
    },

    /**
     * Parsuje surowe dane testu z Asana do struktury
     * @param {object} raw - { name: string, notes: string, gid?: string }
     * @returns {{ code: string, name: string, priority: string, category: string, steps: string[], gid: string }}
     */
    parse_asana_test(raw) {
        const { name, notes, gid } = raw;

        // Wyciągnij kod testu: "[P1] TC-LOGIN-001: Nazwa" → "TC-LOGIN-001"
        const codeMatch = name?.match(/TC-[A-Z]+-\d+/);
        const code = codeMatch ? codeMatch[0] : 'UNKNOWN';

        // Wyciągnij priorytet: "[P1]" → "P1"
        const priorityMatch = name?.match(/\[P(\d)\]/);
        const priority = priorityMatch ? `P${priorityMatch[1]}` : 'P3';

        // Wyciągnij kategorię z kodu: "TC-LOGIN-001" → "LOGIN"
        const categoryMatch = code.match(/TC-([A-Z]+)-/);
        const category = categoryMatch ? categoryMatch[1] : 'UNKNOWN';

        // Wyciągnij nazwę testu (po kodzie)
        const nameMatch = name?.match(/TC-[A-Z]+-\d+:\s*(.+)/);
        const testName = nameMatch ? nameMatch[1].trim() : name || 'Brak nazwy';

        // Parsuj kroki z notes
        const steps = this.extract_test_steps({ notes });

        return {
            code,
            name: testName,
            fullName: name || '',
            priority,
            category,
            steps: steps.steps,
            gid: gid || null
        };
    },

    /**
     * Wyciąga kroki testu z opisu Asana
     * @param {object} input - { notes: string }
     * @returns {{ steps: string[], raw: string }}
     */
    extract_test_steps(input) {
        const { notes } = input;

        if (!notes) {
            return { steps: [], raw: '' };
        }

        const steps = [];

        // Szukaj sekcji "Kroki" lub "Steps"
        const stepsMatch = notes.match(/##?\s*(?:Kroki|Steps|Procedura)\s*\n([\s\S]*?)(?=\n##|\n\*\*|$)/i);

        if (stepsMatch) {
            const stepsText = stepsMatch[1];

            // Parsuj numerowane kroki: "1. Krok" lub "- Krok"
            const stepLines = stepsText.split('\n');
            for (const line of stepLines) {
                const stepMatch = line.match(/^[\d\-\*]+[.\)]\s*(.+)/);
                if (stepMatch) {
                    steps.push(stepMatch[1].trim());
                }
            }
        }

        // Fallback: szukaj numerowanych linii w całym tekście
        if (steps.length === 0) {
            const lines = notes.split('\n');
            for (const line of lines) {
                const stepMatch = line.match(/^\d+[.\)]\s*(.+)/);
                if (stepMatch) {
                    steps.push(stepMatch[1].trim());
                }
            }
        }

        return { steps, raw: notes };
    },

    /**
     * Klasyfikuje wynik testu na podstawie danych z Playwright
     * @param {object} input - { playwrightResult: string, screenshotPath?: string, consoleErrors?: string[] }
     * @returns {{ status: 'PASS'|'FAIL'|'BLOCKED', reason: string, needsScreenshot: boolean }}
     */
    classify_test_result(input) {
        const { playwrightResult, screenshotPath, consoleErrors } = input;

        // Najpierw sprawdź wynik z Playwright
        const validation = this.validate_test_result({ actual: playwrightResult });

        // Dodaj info o screenshot
        const needsScreenshot = validation.status !== 'PASS' && !screenshotPath;

        // Dodaj błędy konsoli jeśli są
        let reason = validation.reason;
        if (consoleErrors && consoleErrors.length > 0 && validation.status === 'FAIL') {
            reason += ` | Console errors: ${consoleErrors.slice(0, 2).join(', ')}`;
        }

        return {
            status: validation.status,
            reason,
            needsScreenshot
        };
    },

    /**
     * Generuje strukturę do zapisu w tests-data.js
     * @param {object} input - { code, name, category, status, steps, startedAt, finishedAt, note }
     * @returns {object} - gotowy obiekt do tests-data.js
     */
    format_test_result(input) {
        const { code, name, category, status, steps, startedAt, finishedAt, note, allSteps } = input;

        const start = new Date(startedAt || Date.now());
        const end = new Date(finishedAt || Date.now());
        const durationMs = end - start;
        const durationStr = durationMs > 60000
            ? `${Math.round(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`
            : `${Math.round(durationMs / 1000)}s`;

        return {
            code,
            name,
            category: category || 'UNKNOWN',
            status: status?.toLowerCase() || 'failed',
            startedAt: start.toISOString().slice(0, 19),
            finishedAt: end.toISOString().slice(0, 19),
            duration: durationStr,
            allSteps: allSteps || [],
            currentStepIndex: (steps || []).length - 1,
            steps: steps || [],
            note: note || null
        };
    }
};

// CLI interface
const [,, toolName, inputJson] = process.argv;

if (!toolName || !tools[toolName]) {
    console.log(JSON.stringify({
        error: 'Unknown tool',
        available: Object.keys(tools),
        usage: 'node mcp-tools.js <tool_name> \'<json_input>\''
    }));
    process.exit(1);
}

try {
    const input = inputJson ? JSON.parse(inputJson) : {};
    const result = tools[toolName](input);
    console.log(JSON.stringify(result));
} catch (e) {
    console.log(JSON.stringify({
        error: e.message,
        tool: toolName
    }));
    process.exit(1);
}
