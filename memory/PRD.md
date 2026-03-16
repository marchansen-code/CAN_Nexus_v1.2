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
- Iteration 15: Manuell getestet (Tabellen-Dialog, Bearbeitungsoptionen)
- Iteration 14: Backend 100% (8/8), Frontend 100% (23/23)
- Iteration 13: Backend 100% (11/11), Frontend 100% (14/14)
- Iteration 12: Backend 100% (19/19), Frontend 100%
- Last tested: 10.03.2026

## Backlog

### P2 (Medium)
- [ ] Schnellsuche (Strg+K)
- [ ] Benutzer-Suche in @-Mentions
- [ ] Artikel-Versionierung

### P3 (Nice to Have)
- [ ] OCR für gescannte PDFs
- [ ] Analytics Dashboard
- [ ] E-Mail-Benachrichtigungen
- [ ] Hochwertige PDF-zu-HTML-Konvertierung

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
