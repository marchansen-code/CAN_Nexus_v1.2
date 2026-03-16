# CANUSA Nexus - The Knowledge Hub - PRD

## Original Problem Statement
Wissensmanagement-Plattform für CANUSA Touristik GmbH & Co. KG und CU-Travel.

## Technology Stack
- **Frontend**: React 18, TailwindCSS, Shadcn/UI, TipTap Rich Editor
- **Backend**: FastAPI, Python 3.11, bcrypt, reportlab (PDF), python-docx (Word)
- **Database**: MongoDB
- **Auth**: E-Mail/Passwort mit Session-Cookies

## Implemented Features

### Core Features
- ✅ E-Mail/Passwort Login mit "Angemeldet bleiben"
- ✅ Dashboard mit Statistiken, Favoriten, Beliebteste Artikel
- ✅ Keyword-basierte Suche mit Live-Vorschau
- ✅ Artikel-CRUD mit Status-Workflow
- ✅ Kategorieverwaltung (Baumstruktur)
- ✅ Dark/Light/Auto Theme (Light als Default)

### Kategorien-Baumstruktur (Iteration 13) - 05.03.2026
- ✅ **Hierarchische Kategorien-Anzeige** auf der Wissensartikel-Seite mit klappbaren Eltern-Kind-Beziehungen
- ✅ **Baumstruktur im ArticleEditor** mit Multi-Auswahl-Checkboxen
- ✅ **"Neuer Artikel hier"-Button** erscheint bei Kategorie-Auswahl
- ✅ **Vorausgewählte Kategorie** beim Erstellen eines neuen Artikels via URL-Parameter

### Artikel-Verlinkung (Iteration 14) - 05.03.2026
- ✅ **@-Mention-Funktion** im Editor: Tippe "@" um andere Artikel zu suchen und zu verlinken
- ✅ **Artikel-Suche-API** (`/api/articles/search/linkable`) für Mention-Dropdown
- ✅ **Klickbare Mention-Links** mit rosa/rotem Styling in Editor und Artikelansicht
- ✅ **Zusammenfassung-Feld entfernt** aus der Artikelansicht (ArticleView.jsx)

### Erweiterte Tabellen-Funktionalität (Iteration 15) - 10.03.2026
- ✅ **Tabellen-Dialog** mit wählbarer Zeilen-/Spaltenanzahl (1-20 Zeilen, 1-10 Spalten)
- ✅ **Live-Vorschau** der Tabellengröße im Erstellungsdialog
- ✅ **Kopfzeile-Option** beim Erstellen aktivierbar
- ✅ **Erweiterte Bearbeitungsoptionen**: Zeilen/Spalten hinzufügen/löschen via Untermenüs
- ✅ **Zellen-Formatierung**: Hintergrundfarben (Gelb, Grün, Blau, Rosa, Grau)
- ✅ **Zellen verbinden/teilen**, Kopfzellen umschalten
- ✅ **Kopfzeile/Kopfspalte** umschalten für bestehende Tabellen
- ✅ **Spaltenbreite per Drag & Drop** anpassen (roter Resize-Handle am Spaltenrand)
- ✅ **Tabellenbreite** anpassbar (100%, 75%, 50%, 33%, Auto) - Tabelle zentriert sich automatisch
- ✅ **Zellenhöhe** anpassbar (Auto, Kompakt, Normal, Groß, Sehr groß)

### Gruppen-System (Iteration 12)
- ✅ Admins können Gruppen erstellen/bearbeiten/löschen
- ✅ Admins können User zu Gruppen hinzufügen/entfernen
- ✅ Artikel können für bestimmte Gruppen eingeschränkt werden
- ✅ Gruppen-Management Seite `/groups`

### Artikel-Features (Iteration 12)
- ✅ **Mehrere Kategorien** pro Artikel (Checkboxen)
- ✅ **Tag-Vorschläge** beim Eingeben
- ✅ **Artikel-Gültigkeit** (Ablaufdatum → automatisch Entwurf)
- ✅ **Wichtig-Markierung** mit optionalem Ablaufdatum
- ✅ **Entwurf-Sichtbarkeit** nur für Admin + Ersteller
- ✅ **Gruppen-Sichtbarkeit** für Artikel
- ✅ **Nach Speichern zurück navigieren**
- ✅ **Zusammenfassung entfernt** (nicht mehr im Model)

### Backup & Export
- ✅ JSON-Backup (Artikel, Kategorien, Benutzer)
- ✅ ZIP-Backup für Dokumente (PDFs)
- ✅ PDF-Export für Artikel
- ✅ Word-Export für Artikel

### Admin Features
- ✅ Benutzer anlegen mit E-Mail/Passwort
- ✅ Benutzer-Passwörter ändern
- ✅ User sperren und löschen
- ✅ Dokumente löschen
- ✅ Rollenverwaltung (Admin/Editor/Viewer)

### UI/UX Verbesserungen (Iteration 12)
- ✅ Dark Mode Schriftfarbe verbessert
- ✅ Light Mode als Default für neue User
- ✅ Kalender `fixedWeeks` (springt nicht mehr)
- ✅ Top 10 aus Wissensartikel entfernt

### Editor & Kategorien Erweiterungen (Iteration 16) - 13.03.2026
- ✅ **"Zurück zu Entwurf"-Button** - Veröffentlichte Artikel können wieder in Entwurf versetzt werden
- ✅ **Entwurf-Sichtbarkeit** - Entwürfe nur für Ersteller sichtbar (Backend bereits implementiert)
- ✅ **Bildgrößen-Anpassung** im Editor (25%, 50%, 75%, 100%, Auto, 300px)
- ✅ **Hierarchischer Baum-Selektor** für "Übergeordnete Kategorie" beim Erstellen/Bearbeiten
- ✅ **"+"-Button für Unterkategorien** - Schnelles Erstellen von Unterkategorien bei Hover

### Papierkorb / Lösch-Historie (Iteration 17) - 13.03.2026
- ✅ **Soft-Delete** für Artikel und Dokumente - Items werden nicht sofort gelöscht
- ✅ **30-Tage-Aufbewahrung** mit Countdown-Anzeige
- ✅ **Admin-only Papierkorb-Seite** unter /trash mit Tabs für Artikel und Dokumente
- ✅ **Wiederherstellen-Funktion** - Gelöschte Items können wiederhergestellt werden
- ✅ **Endgültig löschen** - Items können vor Ablauf der 30 Tage dauerhaft entfernt werden
- ✅ **Auto-Cleanup** - Button zum Entfernen aller Items älter als 30 Tage

### Sicherheit & Session-Management (Iteration 18) - 16.03.2026
- ✅ **Fail2Ban-kompatibles Logging** - Fehlgeschlagene Anmeldeversuche werden geloggt
- ✅ **Log-Format**: `YYYY-MM-DD HH:MM:SS WARNING [AUTH] Failed login from IP for user`
- ✅ **Log-Datei**: `/app/backend/logs/auth_failures.log`
- ✅ **Session-Redirect** - Bei aktiver Session automatische Weiterleitung zum Dashboard
- ✅ **Root-URL Handling** - `/` leitet eingeloggte User zum Dashboard weiter

### Kommentarsystem (Iteration 19) - 16.03.2026
- ✅ **Kommentare für Artikel** - Benutzer können Kommentare zu veröffentlichten Artikeln schreiben
- ✅ **Kommentare aktivieren/deaktivieren** - Toggle im Editor pro Artikel
- ✅ **Kommentar-Anzeige** - In der Artikelansicht werden Kommentare angezeigt
- ✅ **Kommentar-Löschung** - Nur Admins können Kommentare löschen

### Backend Refactoring (Iteration 20) - 16.03.2026
- ✅ **Modulare Architektur** - server.py von 2.293 Zeilen auf 142 Zeilen reduziert
- ✅ **Separate Route-Dateien** - 12 spezialisierte Router-Module in `/routes/`
- ✅ **Zentrale Modelle** - Alle Pydantic-Modelle in `models.py`
- ✅ **Database-Modul** - MongoDB-Verbindung in `database.py`
- ✅ **Dependencies** - Auth-Funktionen in `dependencies.py`

### Tag-Suche & Artikel-Analytics (Iteration 21) - 16.03.2026
- ✅ **Tag-Suche** - Artikel können nach Tags gefiltert werden
- ✅ **Tag-Filter Panel** - Klickbare Tags zum Ein-/Ausschalten der Filter
- ✅ **Tags in Suchergebnissen** - Zeigt Tags der gefundenen Artikel an
- ✅ **Artikel-Analytics** - Dialog mit Metriken (Aufrufe, Favoriten, Kommentare)
- ✅ **Engagement-Score** - Berechnet aus Aufrufen, Favoriten und Kommentaren (0-100)
- ✅ **Vergleich mit Durchschnitt** - Zeigt ob Artikel über/unter Durchschnitt liegt
- ✅ **Zugriffskontrolle** - Nur Autor und Admins können Analytics sehen

### Erweiterte Suchfilter (Iteration 22) - 16.03.2026
- ✅ **Tag-Dropdown mit Suche** - Tags können durchsucht und mehrfach ausgewählt werden
- ✅ **Autor-Filter** - Artikel nach Autor filtern (mit Suchfunktion)
- ✅ **Status-Filter** - Nach "Veröffentlicht" oder "Entwurf" filtern
- ✅ **Wichtig-Markierung Filter** - Nur wichtige oder nicht-wichtige Artikel
- ✅ **Zeitraum-Filter** - "Erstellt ab" und "Erstellt bis" mit Datepicker
- ✅ **HTML-Bereinigung** - Content-Snippets zeigen reinen Text ohne HTML-Tags
- ✅ **Aktive Filter Anzeige** - Zeigt aktive Filter als Badges an

### Dokument-Ordnerstruktur (Iteration 23) - 16.03.2026
- ✅ **Hierarchische Ordnerstruktur** - Ordner mit beliebiger Verschachtelungstiefe
- ✅ **Split-View Design** - Links Ordnerbaum, rechts Dokumentenliste (wie Artikel)
- ✅ **Ordner erstellen** - Admins und Editoren können neue Ordner anlegen
- ✅ **Unterordner erstellen** - Per "+" Button beim Überfahren eines Ordners
- ✅ **Ordner beim Upload wählen** - Dialog zum Auswählen/Erstellen eines Ordners
- ✅ **Dokumente verschieben** - Per Kontextmenü in anderen Ordner verschieben
- ✅ **Ordner bearbeiten/löschen** - Für Admins mit Fallback für Inhalte

### Dokument-Aktionen & Responsive Layout (Iteration 24) - 16.03.2026
- ✅ **Responsive Dokument-Aktionen** - Buttons für Ansehen, Verschieben, Löschen sind bei allen Bildschirmbreiten sichtbar
- ✅ **Mobile Ordner-Panel** - Kollabierbare Ordnerauswahl auf schmalen Bildschirmen
- ✅ **Aktionen-Dropdown** - Drei-Punkte-Menü mit "In Ordner verschieben" und "Löschen"

### PDF Import Feature (Iteration 24) - 16.03.2026
- ✅ **PDF-zu-HTML-Konvertierung** - Neue API `/api/documents/{id}/convert-to-html`
- ✅ **pymupdf4llm Integration** - Hochwertige PDF-Extraktion mit Layout-Erhaltung
- ✅ **Tabellen-Erkennung** - Tabellen werden als HTML-Tabellen konvertiert
- ✅ **"In Artikel umwandeln" Button** - Im Dokumenten-Vorschau-Dialog
- ✅ **Automatische Artikel-Erstellung** - Weiterleitung zum Editor mit vorausgefülltem Inhalt
- ✅ **TipTap-kompatibles HTML** - Formatierung für den Rich-Text-Editor optimiert

### Vollwertiger PDF-Viewer (Iteration 25) - 16.03.2026
- ✅ **React-PDF Integration** - Native PDF-Darstellung im Browser mit PDF.js
- ✅ **PDF-Ansicht Tab** - Zeigt das PDF wie es ist
- ✅ **Extrahierter Text Tab** - Zeigt den reinen Text aus dem PDF
- ✅ **Seitennavigation** - Vor-/Zurück-Buttons und Seiteneingabe
- ✅ **Zoom-Steuerung** - Vergrößern/Verkleinern (50%-300%)
- ✅ **Drehen-Funktion** - PDF um 90° drehen
- ✅ **Download-Button** - PDF herunterladen
- ✅ **PDF-Streaming API** - Neuer Endpunkt `/api/documents/{id}/file`

## API Endpoints

### Groups (Admin only)
- `GET /api/groups` - Alle Gruppen
- `POST /api/groups` - Gruppe erstellen
- `PUT /api/groups/{id}` - Gruppe bearbeiten
- `DELETE /api/groups/{id}` - Gruppe löschen
- `GET /api/groups/{id}/members` - Mitglieder abrufen
- `PUT /api/users/{id}/groups` - User-Gruppen aktualisieren

### Tags
- `GET /api/tags` - Alle eindeutigen Tags

### Articles (erweitert)
- `POST /api/articles` mit:
  - `category_ids[]` - Mehrere Kategorien
  - `visible_to_groups[]` - Gruppen-Sichtbarkeit
  - `expiry_date` - Ablaufdatum
  - `is_important` - Wichtig-Markierung
  - `important_until` - Ablauf der Markierung

### Backup
- `GET /api/backup/preview` - Statistiken
- `GET /api/backup/export` - JSON-Backup
- `POST /api/backup/import` - JSON importieren
- `GET /api/backup/documents` - ZIP mit PDFs
- `POST /api/backup/documents/import` - ZIP importieren

### Article Export
- `GET /api/articles/{id}/export/pdf`
- `GET /api/articles/{id}/export/docx`

## Default Admin
- **E-Mail**: marc.hansen@canusa.de
- **Passwort**: CanusaNexus2024!

## Test Coverage
- Iteration 25: Backend 100% (22/22), Frontend 100% (34/34)
- Iteration 24: Backend 100% (13/13), Frontend 100% (33/33)
- Iteration 15: Manuell getestet (Tabellen-Dialog, Bearbeitungsoptionen)
- Iteration 14: Backend 100% (8/8), Frontend 100% (23/23)
- Last tested: 16.03.2026

## Backlog

### P2 (Medium)
- [ ] Schnellsuche (Strg+K)
- [ ] Benutzer-Suche in @-Mentions
- [ ] Artikel-Versionierung

### P3 (Nice to Have)
- [ ] OCR für gescannte PDFs
- [ ] E-Mail-Benachrichtigungen
- [x] ~~Hochwertige PDF-zu-HTML-Konvertierung~~ (Erledigt in Iteration 24)
- [x] ~~Vollwertiger PDF-Viewer~~ (Erledigt in Iteration 25)

## Backend Architektur (nach Refactoring)

```
/app/backend/
├── server.py          # 142 Zeilen - Hauptanwendung, Router-Einbindung
├── database.py        # 20 Zeilen - MongoDB-Verbindung
├── dependencies.py    # 77 Zeilen - Auth-Funktionen
├── models.py          # 209 Zeilen - Pydantic-Modelle
└── routes/
    ├── auth.py        # 91 Zeilen - Login, Logout
    ├── users.py       # 160 Zeilen - Benutzer-CRUD
    ├── groups.py      # 119 Zeilen - Gruppen-CRUD
    ├── categories.py  # 65 Zeilen - Kategorien-CRUD
    ├── articles.py    # 286 Zeilen - Artikel, Kommentare, Tags
    ├── search.py      # 129 Zeilen - Suche
    ├── documents.py   # 205 Zeilen - Dokument-Upload
    ├── recycle_bin.py # 157 Zeilen - Papierkorb
    ├── images.py      # 79 Zeilen - Bilder-Upload
    ├── stats.py       # 118 Zeilen - Statistiken, Widget
    ├── backup.py      # 322 Zeilen - Backup/Export/Import
    └── exports.py     # 351 Zeilen - PDF/DOCX-Export, Favoriten
```
