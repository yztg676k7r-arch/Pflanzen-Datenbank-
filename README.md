# My Plant Paradise v1.3

Private, mobile Pflanzen-Web-App für GitHub Pages. Keine zusätzlichen laufenden Kosten.

## Neu in v1.3

- Neuer Bereich **Archiv** neben „Meine Pflanzen“ und „Für später“
- Aktive Pflanzen können über ihren Steckbrief ins Archiv verschoben werden
- Archivierungsgründe: **Eingegangen**, **Saison beendet (einjährig)** oder **Nicht mehr aktiv / Sonstiges**
- Archivierungsdatum und optionale Notiz bleiben am Pflanzeneintrag gespeichert
- Archivierte Pflanzen behalten Fotos, Notizen, Standort- und Pflegeinformationen
- Archivierte Pflanzen können mit einem Tipp wieder aktiviert werden
- Mit **„Für nächstes Jahr“** kann aus einer archivierten Pflanze eine Wunschpflanze für das Folgejahr erstellt werden; der Archiveintrag bleibt erhalten
- Doppelte „Für nächstes Jahr“-Einträge aus derselben Archivpflanze werden verhindert
- Bei einjährigen Pflanzen wird beim Archivieren automatisch **„Saison beendet“** vorgeschlagen
- Backupformat auf App-Version 1.3 / Schema 3 aktualisiert; ältere Backups bleiben importierbar

## Daten bleiben erhalten

Version 1.3 verwendet weiterhin dieselbe IndexedDB-Datenbank **`pflanzen-db`**, denselben Object Store **`plants`** und dieselbe Datenbankversion. Es ist keine Migration nötig. Bestehende Pflanzen aus v1.2 bleiben erhalten.

## Bestehende Funktionen

- Pflanzen mit Foto und Steckbrief anlegen/bearbeiten
- Terrasse und Wohnung
- Suche und Filter
- Überwinterungs- und Lebensdauerfilter
- Bereich **Für später** für Pflanzenwünsche
- ChatGPT-Frageworkflow ohne API-Kosten
- Lokale Speicherung in IndexedDB
- Backup und Wiederherstellung
- Offline-/PWA-Unterstützung

## Update auf GitHub

Die Dateien aus diesem Ordner in deinem bestehenden Repository ersetzen bzw. ergänzen. GitHub Pages veröffentlicht die Änderung anschließend automatisch. Die lokalen Pflanzendaten werden durch dieses Update nicht gelöscht.

### iPhone / Offline-Cache

Der Service-Worker-Cache wurde auf **v1.3.0** angehoben. Wenn auf dem Homescreen kurz noch die alte Oberfläche erscheint, die App vollständig schließen und erneut öffnen. Bei hartnäckigem Cache kann Safari einmal direkt aufgerufen werden.
