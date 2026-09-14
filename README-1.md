# Tier-Schiebepuzzle Studio

Eine mobile-first 3×3-Schiebepuzzle-PWA ohne Backend, CDN, Tracker oder Build-Schritt.

## Funktionen
- Tippen/Klicken, Rückgängig, Timer, Par und BFS-Tipp
- BFS-Auto-Löser: kürzeste Lösung, Einzelschritte und direkt anklickbare Zugliste
- Validierter Varianten-Code und localStorage-Varianten
- Lokaler Bild- und Kameraimport mit geometrischem 3×3-Zuschnitt
- Offline-Cache über Service Worker

## Startcode
`G1,F3,F1,G2,K1,F2,G3,K2,.` – Giraffe Kopf/Hals/Beine, Flamingo Kopf/Körper/Beine, Koala Kopf/Baum, `.` frei.

## Lokal und Pages
Lokal beispielsweise mit `python3 -m http.server` starten. Für GitHub Pages: **Settings → Pages → Deploy from a branch → main → /(root) → Save**.

## BFS und Parität
BFS durchsucht alle Zustände in steigender Entfernung. Die erste Ziellösung hat deshalb die minimale Zugzahl. Bei einem 3×3-Puzzle ist nur eine gerade Inversionsparität erreichbar; vollständige, aber andersparitätige Codes sind unlösbar.

## Datenschutz und Grenze
Die Bildverarbeitung läuft lokal per Canvas. Der Import teilt ein Bild geometrisch in neun Felder, behauptet aber keine automatische semantische Bilderkennung. Das bereitgestellte Foto dokumentiert den Ausgangszustand; die Datei `puzzle-aufbau-geloest.jpg` ist bis zu einem echten Lösungsfoto bewusst dieselbe Aufnahme.

## Lizenz
MIT.
