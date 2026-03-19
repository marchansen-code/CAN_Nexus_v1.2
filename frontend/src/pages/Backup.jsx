import React, { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import { API, AuthContext } from "@/App";
import { toast } from "sonner";
import {
  Download,
  Upload,
  Database,
  FileJson,
  AlertTriangle,
  CheckCircle,
  Loader2,
  HardDrive,
  Users,
  FileText,
  FolderTree,
  RefreshCw,
  Info,
  FileArchive
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Backup = () => {
  const { user } = useContext(AuthContext);
  const fileInputRef = useRef(null);
  const docFileInputRef = useRef(null);
  
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingDocs, setExportingDocs] = useState(false);
  const [importingDocs, setImportingDocs] = useState(false);
  const [importing, setImporting] = useState(false);
  const [docImportResult, setDocImportResult] = useState(null);
  
  // Import settings
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importSettings, setImportSettings] = useState({
    import_articles: true,
    import_categories: true,
    import_users: true,
    merge_mode: true
  });
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/backup/preview`);
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      toast.error("Statistiken konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await axios.get(`${API}/backup/export`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from header or generate
      const contentDisposition = response.headers['content-disposition'];
      let filename = `canusa_nexus_backup_${new Date().toISOString().slice(0,10)}.json`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=(.+)/);
        if (match) filename = match[1];
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Backup erfolgreich erstellt");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Backup konnte nicht erstellt werden");
    } finally {
      setExporting(false);
    }
  };

  const handleExportDocuments = async () => {
    setExportingDocs(true);
    try {
      const response = await axios.get(`${API}/backup/documents`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = `canusa_nexus_documents_${new Date().toISOString().slice(0,10)}.zip`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=(.+)/);
        if (match) filename = match[1];
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Dokumente-Backup erfolgreich erstellt");
    } catch (error) {
      console.error("Documents export failed:", error);
      if (error.response?.status === 404) {
        toast.error("Keine Dokumente zum Exportieren vorhanden");
      } else {
        toast.error("Dokumente-Backup konnte nicht erstellt werden");
      }
    } finally {
      setExportingDocs(false);
    }
  };

  const handleDocFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.zip')) {
      toast.error("Bitte eine ZIP-Datei auswählen");
      return;
    }
    
    setImportingDocs(true);
    setDocImportResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API}/backup/documents/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setDocImportResult(response.data);
      toast.success("Dokumente erfolgreich importiert");
      fetchStats();
    } catch (error) {
      console.error("Documents import failed:", error);
      toast.error(error.response?.data?.detail || "Dokumente-Import fehlgeschlagen");
    } finally {
      setImportingDocs(false);
      if (docFileInputRef.current) {
        docFileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
      toast.error("Bitte eine JSON-Datei auswählen");
      return;
    }
    
    setImportFile(file);
    
    // Read and preview file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (!data.data) {
          toast.error("Ungültiges Backup-Format");
          setImportFile(null);
          return;
        }
        
        setImportPreview({
          version: data.version,
          created_at: data.created_at,
          created_by: data.created_by,
          statistics: data.statistics || {
            articles: data.data.articles?.length || 0,
            categories: data.data.categories?.length || 0,
            users: data.data.users?.length || 0
          },
          raw: data
        });
      } catch (error) {
        toast.error("Datei konnte nicht gelesen werden");
        setImportFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importPreview) return;
    
    setImporting(true);
    setConfirmDialog(false);
    
    try {
      const response = await axios.post(`${API}/backup/import`, {
        backup_data: importPreview.raw,
        ...importSettings
      });
      
      setImportResult(response.data);
      toast.success("Backup erfolgreich importiert");
      fetchStats(); // Refresh stats
    } catch (error) {
      console.error("Import failed:", error);
      toast.error(error.response?.data?.detail || "Import fehlgeschlagen");
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Zugriff verweigert</h2>
            <p className="text-muted-foreground">
              Diese Seite ist nur für Administratoren zugänglich.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn" data-testid="backup-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Backup & Wartung
        </h1>
        <p className="text-muted-foreground mt-1">
          Sichern und Wiederherstellen Ihrer Wissensdatenbank
        </p>
      </div>

      {/* Current Database Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Aktuelle Datenbank
          </CardTitle>
          <CardDescription>
            Übersicht über die gespeicherten Daten
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <FileText className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{stats?.articles || 0}</p>
                <p className="text-sm text-muted-foreground">Artikel</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <FolderTree className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                <p className="text-2xl font-bold">{stats?.categories || 0}</p>
                <p className="text-sm text-muted-foreground">Kategorien</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-violet-500" />
                <p className="text-2xl font-bold">{stats?.users || 0}</p>
                <p className="text-sm text-muted-foreground">Benutzer</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <HardDrive className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-bold">{stats?.documents || 0}</p>
                <p className="text-sm text-muted-foreground">Dokumente</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Backup erstellen
          </CardTitle>
          <CardDescription>
            Exportiert alle Artikel, Kategorien und Benutzer als JSON-Datei
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-700 dark:text-blue-300">Was wird gesichert?</p>
                <ul className="mt-1 text-blue-600 dark:text-blue-400 space-y-1">
                  <li>• Alle Artikel (inkl. Inhalt, Status, Kategoriezuordnung)</li>
                  <li>• Alle Kategorien (Baumstruktur)</li>
                  <li>• Alle Benutzer (ohne Passwörter aus Sicherheitsgründen)</li>
                  <li>• Dokument-Metadaten (PDF-Dateien müssen separat gesichert werden)</li>
                </ul>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleExport} 
            disabled={exporting}
            className="bg-primary hover:bg-primary/90"
            data-testid="export-backup-btn"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Wird erstellt...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Backup herunterladen
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Documents Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileArchive className="w-5 h-5" />
            Dokumente sichern
          </CardTitle>
          <CardDescription>
            Exportiert alle hochgeladenen PDF-Dokumente als ZIP-Datei
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-violet-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-violet-700 dark:text-violet-300">Was wird gesichert?</p>
                <ul className="mt-1 text-violet-600 dark:text-violet-400 space-y-1">
                  <li>• Alle hochgeladenen PDF-Dokumente</li>
                  <li>• manifest.json mit Metadaten (Dateiname, Upload-Datum, etc.)</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleExportDocuments} 
              disabled={exportingDocs || stats?.documents === 0}
              className="bg-violet-500 hover:bg-violet-600"
              data-testid="export-documents-btn"
            >
              {exportingDocs ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wird erstellt...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Dokumente als ZIP herunterladen
                </>
              )}
            </Button>
            
            <div className="relative">
              <input
                ref={docFileInputRef}
                type="file"
                accept=".zip"
                onChange={handleDocFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                data-testid="import-documents-input"
                disabled={importingDocs}
              />
              <Button 
                variant="outline"
                disabled={importingDocs}
                className="pointer-events-none"
              >
                {importingDocs ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird importiert...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    ZIP importieren
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Document Import Result */}
          {docImportResult && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-emerald-700 dark:text-emerald-300">Dokumente importiert</p>
                  <div className="mt-1 text-emerald-600 dark:text-emerald-400">
                    <p>• {docImportResult.results.imported} importiert</p>
                    <p>• {docImportResult.results.skipped} übersprungen (bereits vorhanden)</p>
                    {docImportResult.results.errors > 0 && (
                      <p className="text-red-600">• {docImportResult.results.errors} Fehler</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Backup wiederherstellen
          </CardTitle>
          <CardDescription>
            Importiert Daten aus einer zuvor erstellten Backup-Datei
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-300">Wichtige Hinweise</p>
                <ul className="mt-1 text-amber-600 dark:text-amber-400 space-y-1">
                  <li>• Importierte Benutzer erhalten das temporäre Passwort "TempPassword123!"</li>
                  <li>• Vorhandene Daten werden standardmäßig nicht überschrieben</li>
                  <li>• PDF-Dateien müssen separat wiederhergestellt werden</li>
                </ul>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Backup-Datei auswählen</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-medium
                file:bg-red-50 file:text-red-700
                hover:file:bg-red-100
                cursor-pointer"
              data-testid="import-file-input"
            />
          </div>

          {/* Import Preview */}
          {importPreview && (
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <FileJson className="w-4 h-4" />
                  Backup-Vorschau
                </h4>
                <Button variant="ghost" size="sm" onClick={resetImport}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Zurücksetzen
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground">Artikel</p>
                  <p className="font-semibold">{importPreview.statistics.articles}</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground">Kategorien</p>
                  <p className="font-semibold">{importPreview.statistics.categories}</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground">Benutzer</p>
                  <p className="font-semibold">{importPreview.statistics.users}</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground">Erstellt am</p>
                  <p className="font-semibold">
                    {importPreview.created_at ? new Date(importPreview.created_at).toLocaleDateString('de-DE') : '-'}
                  </p>
                </div>
              </div>

              {/* Import Options */}
              <div className="space-y-3 pt-2">
                <p className="text-sm font-medium">Import-Optionen</p>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="import-articles">Artikel importieren</Label>
                  <Switch
                    id="import-articles"
                    checked={importSettings.import_articles}
                    onCheckedChange={(checked) => setImportSettings({...importSettings, import_articles: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="import-categories">Kategorien importieren</Label>
                  <Switch
                    id="import-categories"
                    checked={importSettings.import_categories}
                    onCheckedChange={(checked) => setImportSettings({...importSettings, import_categories: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="import-users">Benutzer importieren</Label>
                  <Switch
                    id="import-users"
                    checked={importSettings.import_users}
                    onCheckedChange={(checked) => setImportSettings({...importSettings, import_users: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <Label htmlFor="merge-mode">Vorhandene Daten beibehalten</Label>
                    <p className="text-xs text-muted-foreground">Bestehende Einträge werden nicht überschrieben</p>
                  </div>
                  <Switch
                    id="merge-mode"
                    checked={importSettings.merge_mode}
                    onCheckedChange={(checked) => setImportSettings({...importSettings, merge_mode: checked})}
                  />
                </div>
              </div>

              <Button 
                onClick={() => setConfirmDialog(true)}
                disabled={importing}
                className="w-full bg-primary hover:bg-primary/90"
                data-testid="start-import-btn"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird importiert...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import starten
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div className="text-sm flex-1">
                  <p className="font-medium text-emerald-700 dark:text-emerald-300">Import abgeschlossen</p>
                  <div className="mt-2 space-y-1 text-emerald-600 dark:text-emerald-400">
                    <p>• Artikel: {importResult.results.articles.imported} importiert, {importResult.results.articles.skipped} übersprungen</p>
                    <p>• Kategorien: {importResult.results.categories.imported} importiert, {importResult.results.categories.skipped} übersprungen</p>
                    <p>• Benutzer: {importResult.results.users.imported} importiert, {importResult.results.users.skipped} übersprungen</p>
                  </div>
                  {importResult.results.users.imported > 0 && (
                    <p className="mt-2 text-amber-600 dark:text-amber-400 font-medium">
                      ⚠️ Neue Benutzer müssen ihr Passwort ändern (Temp: "TempPassword123!")
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Backup importieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Sie sind dabei, Daten aus dem Backup zu importieren. 
              {!importSettings.merge_mode && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Achtung: Vorhandene Daten können überschrieben werden!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport} className="bg-red-500 hover:bg-red-600">
              Import starten
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Backup;
