# Pflanzen Datenbank v1.0

Private, kostenlose Web-App für die persönliche Pflanzenverwaltung auf dem Handy. Sie kann statisch über GitHub Pages gehostet werden und benötigt weder Server noch API oder kostenpflichtige Datenbank.

## Funktionen in v1.0
- Pflanzen mit Foto anlegen, bearbeiten und löschen
- Terrasse/Wohnung, genauer Standort, Licht, Zustand und Topf/Kübel erfassen
- Gießen, Düngen, Überwinterung und persönliche Notizen speichern
- regelbasierte Gärtner-Hinweise ohne externe KI/API
- schnelle Suche und Filter für Terrasse, Wohnung und Pflegebedarf
- lokale Speicherung inklusive Fotos über IndexedDB
- JSON-Backup mit Export und Import
- PWA-/Offline-Unterstützung über Service Worker
- iPhone-optimiertes Layout inklusive Safe Areas und Dark Mode

## GitHub Pages veröffentlichen
1. Neues GitHub-Repository erstellen, z. B. `pflanzen-datenbank`.
2. Alle Dateien aus diesem Ordner direkt in das Hauptverzeichnis des Repositories hochladen.
3. In GitHub `Settings` > `Pages` öffnen.
4. Unter `Build and deployment` die Quelle `Deploy from a branch` wählen.
5. Branch `main` und Ordner `/ (root)` auswählen und speichern.
6. Die von GitHub angezeigte Pages-Adresse auf dem iPhone öffnen.
7. In Safari über `Teilen` > `Zum Home-Bildschirm` installieren.

## Datenspeicherung
Die Pflanzen-Daten liegen in v1.0 ausschließlich lokal im Browser des Geräts. GitHub erhält keine privaten Pflanzendaten oder Fotos.

Wichtig: Browserdaten können durch Löschen von Website-Daten verloren gehen. Deshalb regelmäßig über `…` > `Daten & Backup` ein Backup exportieren und in der Dateien-App sichern.

## Updates
Der App-Code ist von den lokalen Pflanzendaten getrennt. Normale Updates der Dateien im GitHub-Repository sollen die lokal gespeicherten Einträge nicht überschreiben.
