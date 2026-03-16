import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Loader2, 
  Search, 
  FileSpreadsheet, 
  File,
  CheckCircle2,
  Clock,
  XCircle,
  FolderOpen
} from 'lucide-react';
import { FileIcon } from './DocumentViewer';
import { cn } from '@/lib/utils';

const ACCEPTED_FILES = '.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx';

const StatusBadge = ({ status }) => {
  const badges = {
    completed: <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Bereit</Badge>,
    processing: <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Clock className="w-3 h-3 mr-1 animate-spin" />Verarbeitung</Badge>,
    pending: <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Wartend</Badge>,
    failed: <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Fehler</Badge>,
  };
  return badges[status] || null;
};

const DocumentImportDialog = ({ open, onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState('existing');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Import state
  const [importing, setImporting] = useState(false);

  // Load existing documents
  useEffect(() => {
    if (open) {
      loadDocuments();
    }
  }, [open]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/documents`);
      setDocuments(response.data.filter(d => d.status === 'completed'));
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('Dokumente konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('target_language', 'de');

      const response = await axios.post(`${API}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      toast.success('Datei hochgeladen. Verarbeitung läuft...');
      
      // Poll for completion
      const docId = response.data.document_id;
      let attempts = 0;
      const maxAttempts = 30;
      
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const docResponse = await axios.get(`${API}/documents/${docId}`);
          if (docResponse.data.status === 'completed') {
            clearInterval(pollInterval);
            toast.success('Datei erfolgreich verarbeitet. Importiere...');
            
            // Automatically import the content after successful upload
            try {
              const contentResponse = await axios.get(`${API}/documents/${docId}/content`);
              onImport({
                html: contentResponse.data.html_content,
                text: contentResponse.data.extracted_text,
                filename: contentResponse.data.filename,
                fileType: contentResponse.data.file_type
              });
              toast.success(`"${docResponse.data.filename}" wurde importiert`);
              loadDocuments();
              onClose();
            } catch (importErr) {
              console.error('Import after upload failed:', importErr);
              toast.error('Import fehlgeschlagen');
              // Fallback: show in existing docs
              setSelectedDoc(docResponse.data);
              setActiveTab('existing');
              loadDocuments();
            }
          } else if (docResponse.data.status === 'failed' || attempts >= maxAttempts) {
            clearInterval(pollInterval);
            toast.error('Verarbeitung fehlgeschlagen');
          }
        } catch (err) {
          clearInterval(pollInterval);
        }
      }, 2000);

    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error.response?.data?.detail || 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  const handleImport = async () => {
    if (!selectedDoc) return;

    setImporting(true);
    try {
      const response = await axios.get(`${API}/documents/${selectedDoc.document_id}/content`);
      onImport({
        html: response.data.html_content,
        text: response.data.extracted_text,
        filename: response.data.filename,
        fileType: response.data.file_type
      });
      toast.success(`"${selectedDoc.filename}" wurde importiert`);
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Import fehlgeschlagen');
    } finally {
      setImporting(false);
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Dokument importieren</DialogTitle>
          <DialogDescription>
            Wählen Sie ein bestehendes Dokument oder laden Sie eine neue Datei hoch.
            Unterstützte Formate: PDF, DOC/DOCX, TXT, CSV, XLS/XLSX
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              Bestehende Dokumente
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="w-4 h-4" />
              Neue Datei hochladen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="flex-1 flex flex-col min-h-0 mt-4">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Dokumente durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Document List */}
            <ScrollArea className="flex-1 border rounded-lg">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Keine Dokumente gefunden</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredDocs.map((doc) => (
                    <button
                      key={doc.document_id}
                      onClick={() => setSelectedDoc(doc)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                        selectedDoc?.document_id === doc.document_id
                          ? "bg-indigo-50 border-2 border-indigo-300 dark:bg-indigo-950"
                          : "hover:bg-muted border-2 border-transparent"
                      )}
                    >
                      <FileIcon fileType={doc.file_type || '.pdf'} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(doc.created_at)}
                        </p>
                      </div>
                      <StatusBadge status={doc.status} />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Import Button */}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!selectedDoc || importing}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importiere...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Importieren
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="flex-1 flex flex-col mt-4">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                {uploading ? (
                  <div className="space-y-4">
                    <Loader2 className="w-12 h-12 mx-auto animate-spin text-indigo-500" />
                    <div>
                      <p className="font-medium">Datei wird hochgeladen...</p>
                      <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
                    </div>
                    <div className="w-64 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept={ACCEPTED_FILES}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed rounded-lg p-12 hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors">
                      <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="font-medium mb-1">Datei zum Hochladen auswählen</p>
                      <p className="text-sm text-muted-foreground">
                        PDF, DOC, DOCX, TXT, CSV, XLS, XLSX
                      </p>
                      <Button variant="outline" className="mt-4">
                        Datei auswählen
                      </Button>
                    </div>
                  </label>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentImportDialog;
