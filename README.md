# Universe Tester Agent

Autonomiczny agent testowy dla Universe MapMaker z integracją Google Sheets.

## Funkcje

- 🔍 Pobiera testy z arkusza Google Sheets (Testy_Lista)
- 🤖 Automatycznie wykonuje testy na stronie universe-mapmaker.web.app
- 📊 Aktualizuje wyniki w arkuszu (Status, Wynik, Data testu)
- 📺 Dashboard do monitorowania testów w czasie rzeczywistym

## Struktura arkusza

| Kolumna | Opis |
|---------|------|
| A: ID | Identyfikator testu (np. TC-LOGIN-001) |
| B: Kategoria | Kategoria testu |
| C: Nazwa testu | Opis testu |
| D: Kroki | Kroki do wykonania |
| E: Wymogi | Wymagania wstępne |
| F: Oczekiwany rezultat | Co powinno się wydarzyć |
| G: Status | PENDING / PASSED / FAILED / BLOCKED |
| H: Wynik | Szczegółowy opis wyniku |
| I: Data testu | Data wykonania (YYYY-MM-DD) |

## Uruchomienie

1. Uruchom agenta: `@tester`
2. Wybierz arkusz Google do testowania
3. Obserwuj postęp na dashboardzie

## Pliki

- `AGENT.md` - Konfiguracja agenta
- `monitor/` - Dashboard do monitorowania
- `scripts/` - Skrypty pomocnicze

---
*Stworzony z Claude Code*
