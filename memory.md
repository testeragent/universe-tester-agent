# Memory - Agent Tester

## ⚠️ TEN PLIK ZAWIERA TYLKO TRWAŁE FAKTY TECHNICZNE

NIE dodawaj tutaj:
- ❌ Opisów sesji
- ❌ Debug historii
- ❌ Statystyk (są w DB)
- ❌ Narracji

---

## Ograniczenia środowiska

### Playwright MCP
- **NIE obsługuje** natywnych JavaScript dialogs (confirm/alert/prompt)
- Testy wymagające confirm() → oznacz jako MANUAL TEST
- Dotyczy: TC-PROJ-015, TC-PROJ-016 (usuwanie projektu)

### Konto testowe
- **Login:** Mestwin / Kaktus,1
- **Subskrypcja:** BRAK - import plików zwraca 402 Payment Required
- **Uprawnienia:** admin

### Import plików
- **Obsługiwane formaty:** CSV, GML, SHP, GeoJSON, GeoTIFF, KML, GeoPackage
- **NIEOBSŁUGIWANE:** DXF, TopoJSON, WMTS
- **CSV ograniczenia:**
  - Kolumna "id" jest zabroniona (zmień na np. "punkt_id")
  - Wymaga kolumn lat/lon lub latitude/longitude
- TC-IMPORT-002+ → BLOCKED bez subskrypcji (402 Payment Required)

### Duże pliki
- TC-IMPORT-014 wymaga pliku >50MB
- Agent nie ma dostępu do takich plików → BLOCKED

### Dane testowe - DOSTĘPNE ✅

#### Projekt testowy: TESTAGENT
- **URL:** https://universe-mapmaker.web.app/projects/TESTAGENT
- **Warstwy:**
  - TestGroup (pusta grupa)
  - Obszary (KML polygon - Park Jordana)
  - Punkty testowe (KML points - Kraków, Wawel, Kazimierz, Nowa Huta)
  - test-lines (GeoJSON LineString - drogi, rzeka, ścieżka)
  - test-polygons (GeoJSON Polygon - 3 obszary A, B, C)
  - test-points (GeoJSON Point - 5 punktów z atrybutami)

#### Pliki testowe (C:\Users\Dom\.claude\agents\tester\test-files\)
- **test-points.geojson** - 5 punktów z id, name, category, value
- **test-polygons.geojson** - 3 poligony z id, name, type, area_ha
- **test-lines.geojson** - 3 linie z id, name, type, length_km
- **test-places.kml** - 4 placemarki + 1 polygon
- **test-data.csv** - 10 wierszy (wymaga naprawy formatu dla importu)
- **test-topo.json** - TopoJSON (format nieobsługiwany)
- **test-drawing.dxf** - DXF (format nieobsługiwany)

---

## Stabilne selektory

### Strona logowania (/login)
```
Email input: input[type="email"], [name="email"]
Hasło input: input[type="password"], [name="password"]
Przycisk: button:has-text("Zaloguj")
Błąd: .error, .alert-danger, [class*="error"]
```

### Strona projektów (/projects/my)
```
Lista: .project-card, [class*="project"]
Przycisk tworzenia: button:has-text("Utwórz projekt")
```

### Dialog importu warstwy
```
Zakładki: Plik, WMS, WFS (brak XYZ Tiles!)
Modal: .modal, [role="dialog"]
```

### Mapa
```
Kontrolki zoom: .mapboxgl-ctrl-zoom-in, .mapboxgl-ctrl-zoom-out
Bearing reset: .mapboxgl-ctrl-compass
```

---

## Znane flaki / niestabilności

### TC-LOGIN-008 (rejestracja)
- Jeśli Mestwin zalogowany → redirect na /dashboard zamiast formularza
- Rozwiązanie: wyloguj przed testem LUB oznacz BLOCKED

### API Asana
- Czasem zwraca 402 "Payment Required" dla search_tasks
- Rozwiązanie: użyj get_task bezpośrednio z GID kategorii

---

## Brakujące funkcje (confirmed)

| Funkcja | Status | Od |
|---------|--------|-----|
| Filtrowanie projektów | BRAK | 2026-01-27 |
| Sortowanie projektów | BRAK | 2026-01-27 |
| Wyszukiwanie projektów | BRAK | 2026-01-27 |
| Paginacja projektów | BRAK | 2026-01-27 |
| XYZ Tiles w imporcie | BRAK | 2026-02-03 |
| Reset widoku mapy | BRAK | 2026-01-28 |
| WMTS w imporcie | BRAK | 2026-02-05 |

---

## GID kategorii Asana

```
1. LOGOWANIE:          1212837488529448
2. PROJEKTY:           1212812926071907
3. WARSTWY-IMPORT:     1212837487510817
4. WARSTWY-ZARZĄDZANIE: 1212837487537647
5. WŁAŚCIWOŚCI:        1212812926071929
6. TABELA ATRYBUTÓW:   1212812373969967
7. MAPA-NAWIGACJA:     1212812926187046
8. NARZĘDZIA:          1212837487488859
9. PUBLIKOWANIE:       1212837497550766
10. INTERFEJS:         1212837487563876
11. WYDAJNOŚĆ:         1212812926155836
12. BŁĘDY:             1212837496855208
```
