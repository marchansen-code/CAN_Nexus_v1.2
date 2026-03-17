# CANUSA Nexus - The Knowledge Hub - PRD

## Original Problem Statement
Wissensmanagement-Plattform für CANUSA Touristik GmbH & Co. KG und CU-Travel.

## Technology Stack
- **Frontend**: React 18, TailwindCSS, Shadcn/UI, TipTap Rich Editor
- **Backend**: FastAPI, Python 3.11, bcrypt, reportlab (PDF), python-docx (Word)
- **Database**: MongoDB
- **Auth**: E-Mail/Passwort mit Session-Cookies, Google OAuth

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

### Editor-Verbesserungen (Iteration 26) - 16.03.2026
- ✅ **Vollbild-Editor** - Editor kann in einem Pop-up-Fenster geöffnet werden
- ✅ **Vollbild über Card-Header** - Button "Vollbild" in der Inhalt-Card
- ✅ **Vollbild über Toolbar** - Button "Vollbild"/"Beenden" in der Editor-Toolbar
- ✅ **Escape zum Schließen** - Vollbild-Modus mit Esc beenden
- ✅ **FullscreenEditor-Komponente** - Separate React-Komponente für modulare Nutzung

### Benutzer-Mentions (Iteration 26) - 16.03.2026
- ✅ **@@ Trigger für Benutzer** - Unterscheidet von @ für Artikel
- ✅ **Benutzer-Dropdown** - Zeigt Name, E-Mail und Rolle
- ✅ **Rollen-Badges** - Admin (rot), Editor (blau)
- ✅ **Suchfilter** - Suche nach Name oder E-Mail
- ✅ **Backend-Endpunkt** - `GET /api/users/search/mention`

### Artikel-Versionierung (Iteration 26) - 16.03.2026
- ✅ **Automatische Versionierung** - Jede Änderung erstellt eine Version
- ✅ **Versionshistorie-Anzeige** - Timeline unterhalb des Artikels
- ✅ **Versionsnummern** - Fortlaufende Nummerierung mit Datum/Autor
- ✅ **Neue Kollektion** - `article_versions` in MongoDB

### Multi-Format-Dokumente (Iteration 27) - 16.03.2026
- ✅ **Erweiterte Dateiformate** - PDF, DOC/DOCX, TXT, CSV, XLS/XLSX
- ✅ **Format-spezifische Verarbeitung**:
  - PDF: `pdfplumber` für Text und Tabellen
  - DOCX: `python-docx` mit Heading-Erkennung
  - TXT: UTF-8/Latin-1 Encoding-Support
  - CSV/Excel: `pandas` + `openpyxl`/`xlrd`
- ✅ **Multi-Format-Viewer** - Dateityp-spezifische Anzeige
- ✅ **Dateityp-Icons** - Farbige Icons (PDF=rot, DOC=blau, CSV/XLS=grün)
- ✅ **Import-Dialog im Editor**:
  - Tab "Bestehende Dokumente" mit Suche
  - Tab "Neue Datei hochladen"
  - Polling für Upload-Completion
  - Quellenangabe beim Import
- ✅ **Neue Komponenten**:
  - `DocumentViewer.jsx` - Multi-Format-Viewer
  - `DocumentImportDialog.jsx` - Import-Dialog
- ✅ **Neue API-Endpunkte**:
  - `GET /api/documents/{id}/content` - HTML-Inhalt für Import

### Google OAuth Integration (Iteration 28) - 16.03.2026
- ✅ **"Mit Google anmelden" Button** - Auf der Login-Seite mit Google-Logo
- ✅ **OAuth-Endpunkt** - `GET /api/auth/google/login` leitet zu Google weiter
- ✅ **Callback-Verarbeitung** - `GET /api/auth/google/callback` erstellt/aktualisiert Benutzer
- ✅ **Session-Cookie** - Wird nach erfolgreicher Google-Anmeldung gesetzt
- ✅ **HTTPS-Redirect** - Automatische HTTPS-Korrektur für Redirect-URIs
- ✅ **Neue Benutzer-Erstellung** - Google-Benutzer werden mit Rolle "viewer" angelegt
- ✅ **Benutzer-Update** - Bestehende Benutzer bekommen Google-ID und Profilbild
- ✅ **Produktions-Domain** - Konfiguriert für `https://nexus-knows.de`

### Google Drive Integration (Iteration 29) - 16.03.2026
- ✅ **Drive-Verbindung** - OAuth-Flow mit `drive.file` Scope
- ✅ **Verbindungsstatus** - Button zeigt ob Drive verbunden ist
- ✅ **Datei-Import** - Dateien aus Google Drive in Dokumentenverwaltung importieren
  - PDF, DOCX, TXT, CSV, XLSX werden unterstützt
  - Google Docs werden automatisch zu DOCX konvertiert
  - Google Sheets werden automatisch zu XLSX konvertiert
- ✅ **Artikel-Export** - Artikel als PDF oder DOCX nach Google Drive exportieren
  - Zielordner kann ausgewählt werden
  - Link zum Öffnen in Drive wird angezeigt
- ✅ **Neue Dialoge**:
  - `GoogleDriveImportDialog.jsx` - Ordner durchsuchen und Dateien auswählen
  - `GoogleDriveExportDialog.jsx` - Format und Zielordner wählen
- ✅ **Neue API-Endpunkte**:
  - `GET /api/drive/connect` - OAuth-Flow starten
  - `GET /api/drive/callback` - OAuth-Callback verarbeiten
  - `GET /api/drive/status` - Verbindungsstatus prüfen
  - `POST /api/drive/disconnect` - Verbindung trennen
  - `GET /api/drive/files` - Dateien in Ordner auflisten
  - `GET /api/drive/folders` - Alle Ordner auflisten
  - `POST /api/drive/import/{file_id}` - Datei importieren
  - `POST /api/drive/export/article/{article_id}` - Artikel exportieren

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

### Google OAuth
- `GET /api/auth/google/login` - Startet OAuth-Flow
- `GET /api/auth/google/callback` - Verarbeitet Google-Antwort

### Google Drive
- `GET /api/drive/connect` - Startet Drive OAuth-Flow
- `GET /api/drive/callback` - Verarbeitet Drive OAuth-Callback
- `GET /api/drive/status` - Prüft Verbindungsstatus
- `POST /api/drive/disconnect` - Trennt Drive-Verbindung
- `GET /api/drive/files` - Listet Dateien auf
- `GET /api/drive/folders` - Listet Ordner auf
- `POST /api/drive/import/{file_id}` - Importiert Datei aus Drive
- `POST /api/drive/export/article/{article_id}` - Exportiert Artikel nach Drive

## Default Admin
- **E-Mail**: marc.hansen@canusa.de
- **Passwort**: CanusaNexus2024!

## Test Coverage
- Iteration 22: Backend 100% (14/14), Frontend 100% (11/11) - Notification System
- Iteration 29: Backend 100% (14/14), Frontend 100% (12/12)
- Iteration 28: Backend 100% (20/20), Frontend 100% (17/17)
- Iteration 27: Backend 100% (17/17), Frontend 100% (38/38)
- Iteration 26: Backend 100% (17/17), Frontend 100% (69/69)
- Iteration 25: Backend 100% (22/22), Frontend 100% (34/34)
- Iteration 24: Backend 100% (13/13), Frontend 100% (33/33)
- Last tested: 17.03.2026

## Backlog

### P2 (Medium)
- [x] ~~Benutzer-Suche in @-Mentions~~ (Erledigt in Iteration 26)
- [x] ~~Artikel-Versionierung~~ (Erledigt in Iteration 26)
- [x] ~~Multi-Format-Dokumente~~ (Erledigt in Iteration 27)
- [ ] Schnellsuche (Strg+K)

### P3 (Nice to Have)
- [ ] OCR für gescannte PDFs
- [x] ~~E-Mail-Benachrichtigungen~~ (Erledigt in Iteration 22 - 17.03.2026)
- [x] ~~Hochwertige PDF-zu-HTML-Konvertierung~~ (Erledigt in Iteration 24)
- [x] ~~Vollwertiger PDF-Viewer~~ (Erledigt in Iteration 25)

## Benachrichtigungssystem (Iteration 22) - 17.03.2026
- ✅ **@-Mentions Benachrichtigungen** - Benutzer werden per E-Mail benachrichtigt, wenn sie in einem Artikel erwähnt werden
- ✅ **Review-Anfragen** - Autoren können Reviewer für Entwürfe einladen, die per E-Mail benachrichtigt werden und temporäre Leseberechtigung erhalten
- ✅ **Favoriten-Updates** - Opt-in E-Mail-Benachrichtigungen bei Änderungen an favorisierten Artikeln
- ✅ **Statusänderungen** - E-Mail-Benachrichtigung wenn Benutzerrolle oder Kontostatus geändert wird
- ✅ **Kontaktperson-Änderung** - E-Mail-Benachrichtigung wenn Benutzer als Ansprechpartner für Artikel zugewiesen wird
- ✅ **Benachrichtigungs-Einstellungen** - Benutzer können ihre E-Mail-Benachrichtigungen in Einstellungen > Benachrichtigungen konfigurieren
- ✅ **Test-E-Mail Funktion** - Admins können Test-E-Mails senden um die SMTP-Konfiguration zu prüfen
- **Neue Komponenten**:
  - `ReviewRequestDialog.jsx` - Dialog zum Einladen von Reviewern
  - `NotificationSettings.jsx` - Einstellungsseite für E-Mail-Benachrichtigungen
- **Neue API-Endpunkte**:
  - `GET /api/notifications/preferences` - Benachrichtigungseinstellungen abrufen
  - `PUT /api/notifications/preferences` - Benachrichtigungseinstellungen aktualisieren
  - `POST /api/notifications/review-request` - Review-Anfrage senden
  - `GET /api/notifications/article/{id}/reviewers` - Reviewer eines Artikels abrufen
  - `DELETE /api/notifications/review-request/{article_id}/{reviewer_id}` - Reviewer entfernen
  - `POST /api/notifications/test-email` - Test-E-Mail senden (Admin only)
- **SMTP-Konfiguration**: Gmail erfordert App-spezifisches Passwort (nicht normales Passwort)

## Backend Architektur (nach Refactoring)

```
/app/backend/
├── server.py          # Hauptanwendung, Router-Einbindung
├── database.py        # MongoDB-Verbindung
├── dependencies.py    # Auth-Funktionen
├── models.py          # Pydantic-Modelle
├── services/
│   └── email_service.py # E-Mail-Versand für Benachrichtigungen
└── routes/
    ├── auth.py        # Login, Logout
    ├── users.py       # Benutzer-CRUD mit Status-Benachrichtigungen
    ├── groups.py      # Gruppen-CRUD
    ├── categories.py  # Kategorien-CRUD
    ├── articles.py    # Artikel, Kommentare, Tags mit Benachrichtigungen
    ├── search.py      # Suche
    ├── documents.py   # Dokument-Upload
    ├── recycle_bin.py # Papierkorb
    ├── images.py      # Bilder-Upload
    ├── stats.py       # Statistiken, Widget
    ├── backup.py      # Backup/Export/Import
    ├── exports.py     # PDF/DOCX-Export, Favoriten
    ├── versions.py    # Artikel-Versionierung
    ├── google_auth.py # Google OAuth Integration
    ├── google_drive.py # Google Drive Import/Export
    └── notifications.py # E-Mail-Benachrichtigungssystem
```
