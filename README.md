# Pflanzen Datenbank v1.1

Private, kostenlose Web-App für die persönliche Pflanzenverwaltung auf dem Handy. Statisch über GitHub Pages, ohne Server, kostenpflichtige Datenbank oder API.

## Neu in v1.1
- Filter nach Überwinterungsart: draußen winterhart, frostfrei, drinnen, nicht nötig, noch offen
- Filter und Steckbrief-Feld für einjährig / mehrjährig
- separater Bereich **„Für später“** für Pflanzen, die erst künftig angeschafft oder gepflanzt werden sollen
- Wunschpflanzen mit geplantem Platz, Jahr, Priorität und Grund/Notizen
- Wunschpflanzen können mit **„Jetzt eingepflanzt“** in den normalen Bestand verschoben werden
- **ChatGPT fragen** direkt aus dem Pflanzen-Steckbrief: Die App erstellt einen kontextreichen Prompt und kann strukturierte Angaben aus der zurückkopierten Antwort in die Formularfelder übernehmen
- keine API-Kosten und kein API-Schlüssel in der App

## Wichtig zur ChatGPT-Funktion
Die GitHub-Pages-App sendet keine Pflanzendaten automatisch an OpenAI. Beim Tippen auf „Frage für ChatGPT kopieren“ wird nur lokal ein Prompt erzeugt und in die Zwischenablage kopiert. Danach wird ChatGPT separat geöffnet. Die Antwort kann zurück in die App kopiert und ausgewertet werden.

## Datenspeicherung
Alle Pflanzen, Wunschpflanzen und Fotos liegen lokal in IndexedDB des Browsers. Bestehende v1.0-Daten bleiben erhalten; fehlende neue Felder werden automatisch als „noch offen“ behandelt.

Regelmäßig über `…` > `Daten & Backup` eine JSON-Sicherung exportieren, besonders vor größeren Browser-/Geräteänderungen.

## GitHub Pages Update
Zum Aktualisieren einfach die Dateien aus diesem Ordner im bestehenden Repository durch die v1.1-Dateien ersetzen. GitHub Pages veröffentlicht die neue Version automatisch. Die lokal gespeicherten Pflanzendaten werden dadurch nicht gelöscht.
