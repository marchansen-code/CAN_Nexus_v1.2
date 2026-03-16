import React, { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, AuthContext } from "@/App";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Plus,
  RefreshCw,
  Languages,
  Trash2,
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Edit,
  MoveRight,
  Check,
  X,
  Home,
  MoreVertical,
  PanelLeftOpen,
  FileEdit,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocumentViewer, { FileIcon } from "@/components/DocumentViewer";

const ACCEPTED_FILES = '.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx';

// Status components
const StatusIcon = ({ status, fileType }) => {
  if (status === "completed") {
    return <FileIcon fileType={fileType || '.pdf'} />;
  }
  switch (status) {
    case "pending":
      return <Clock className="w-5 h-5 text-slate-500" />;
    case "processing":
      return <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />;
    case "failed":
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <FileText className="w-5 h-5 text-muted-foreground" />;
  }
};

const StatusBadge = ({ status }) => {
  const styles = {
    pending: "bg-slate-100 text-slate-700 border-slate-200",
    processing: "bg-indigo-50 text-indigo-700 border-indigo-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    failed: "bg-red-50 text-red-700 border-red-200"
  };
  
  const labels = {
    pending: "Wartend",
    processing: "Verarbeitung",
    completed: "Abgeschlossen",
    failed: "Fehlgeschlagen"
  };

  return (
    <Badge variant="outline" className={`${styles[status]} border`}>
      {labels[status]}
    </Badge>
  );
};

// Folder Tree Component
const FolderTree = ({ folders = [], selectedFolderId, onSelectFolder, onCreateSubfolder, canEdit }) => {
  const [expandedIds, setExpandedIds] = useState([]);
  
  const toggleExpand = (id) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  const buildTree = (parentId = null) => {
    if (!folders || !Array.isArray(folders)) return [];
    return folders
      .filter(f => f.parent_id === parentId)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  };
  
  const renderFolder = (folder, level = 0) => {
    const children = buildTree(folder.folder_id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.includes(folder.folder_id);
    const isSelected = selectedFolderId === folder.folder_id;
    
    return (
      <div key={folder.folder_id}>
        <div 
          className={cn(
            "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors group",
            isSelected && "bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-500"
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => onSelectFolder(folder.folder_id)}
        >
          {hasChildren ? (
            <button 
              onClick={(e) => { e.stopPropagation(); toggleExpand(folder.folder_id); }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}
          
          {hasChildren && isExpanded ? (
            <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-amber-500 shrink-0" />
          )}
          
          <span className="text-sm flex-1 truncate">{folder.name}</span>
          
          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onCreateSubfolder(folder.folder_id); }}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded transition-opacity"
              title="Unterordner erstellen"
            >
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {children.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };
  
  const rootFolders = buildTree(null);
  
  return (
    <div className="space-y-1">
      {/* Root folder option */}
      <div 
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors",
          (selectedFolderId === null || selectedFolderId === "root") && "bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-500"
        )}
        onClick={() => onSelectFolder(null)}
      >
        <Home className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-medium">Alle Dokumente</span>
      </div>
      
      <Separator className="my-2" />
      
      {rootFolders.map(folder => renderFolder(folder, 0))}
      
      {rootFolders.length === 0 && (
        <p className="text-xs text-muted-foreground p-2">Keine Ordner vorhanden</p>
      )}
    </div>
  );
};

// Folder Selector for upload dialog
const FolderSelector = ({ folders = [], selectedId, onSelect }) => {
  const [expandedIds, setExpandedIds] = useState([]);
  
  const toggleExpand = (id) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  const buildTree = (parentId = null) => {
    if (!folders || !Array.isArray(folders)) return [];
    return folders
      .filter(f => f.parent_id === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
  };
  
  const renderFolder = (folder, level = 0) => {
    const children = buildTree(folder.folder_id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.includes(folder.folder_id);
    const isSelected = selectedId === folder.folder_id;
    
    return (
      <div key={folder.folder_id}>
        <div 
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-accent",
            isSelected && "bg-indigo-100 dark:bg-indigo-900/30"
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => onSelect(folder.folder_id)}
        >
          {hasChildren ? (
            <button 
              onClick={(e) => { e.stopPropagation(); toggleExpand(folder.folder_id); }}
              className="p-0.5"
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <Folder className="w-4 h-4 text-amber-500" />
          <span className="text-sm flex-1">{folder.name}</span>
          {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
        </div>
        {hasChildren && isExpanded && children.map(c => renderFolder(c, level + 1))}
      </div>
    );
  };
  
  return (
    <div className="border rounded-md max-h-48 overflow-auto">
      <div 
        className={cn(
          "flex items-center gap-2 py-2 px-3 cursor-pointer hover:bg-accent",
          !selectedId && "bg-indigo-100 dark:bg-indigo-900/30"
        )}
        onClick={() => onSelect(null)}
      >
        <Home className="w-4 h-4 text-slate-500" />
        <span className="text-sm">Stammverzeichnis</span>
        {!selectedId && <Check className="w-4 h-4 text-indigo-600 ml-auto" />}
      </div>
      <Separator />
      {buildTree(null).map(f => renderFolder(f, 0))}
    </div>
  );
};

const Documents = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [targetLanguage, setTargetLanguage] = useState("de");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, doc: null });
  
  // Folder state
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [folderDialog, setFolderDialog] = useState({ open: false, folder: null, parentId: null });
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [deleteFolderDialog, setDeleteFolderDialog] = useState({ open: false, folder: null });
  const [folderPanelOpen, setFolderPanelOpen] = useState(false);
  
  // Upload dialog state
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadFolderId, setUploadFolderId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Move document dialog
  const [moveDialog, setMoveDialog] = useState({ open: false, doc: null });
  const [moveFolderId, setMoveFolderId] = useState(null);
  
  // PDF to Article conversion
  const [converting, setConverting] = useState(false);

  const isAdmin = user?.role === "admin";
  const canEdit = user?.role === "admin" || user?.role === "editor";

  const fetchData = useCallback(async () => {
    try {
      const [docsRes, foldersRes] = await Promise.all([
        axios.get(`${API}/documents`),
        axios.get(`${API}/document-folders`)
      ]);
      setDocuments(docsRes.data);
      setFolders(foldersRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Get documents for current folder
  const filteredDocuments = documents.filter(doc => {
    if (selectedFolderId === null || selectedFolderId === "root") {
      return !doc.folder_id;
    }
    return doc.folder_id === selectedFolderId;
  });

  // Get current folder name
  const currentFolder = folders.find(f => f.folder_id === selectedFolderId);

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file type is supported
    const supportedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.csv', '.xls', '.xlsx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!supportedExtensions.includes(ext)) {
      toast.error(`Dateityp nicht unterstützt. Erlaubte Formate: PDF, DOC, DOCX, TXT, CSV, XLS, XLSX`);
      return;
    }

    setSelectedFile(file);
    setUploadFolderId(selectedFolderId);
    setUploadDialog(true);
    event.target.value = "";
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("target_language", targetLanguage);
    if (uploadFolderId) {
      formData.append("folder_id", uploadFolderId);
    }

    try {
      await axios.post(`${API}/documents/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });
      
      toast.success("Dokument hochgeladen");
      fetchData();
      setUploadDialog(false);
      setSelectedFile(null);
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(error.response?.data?.detail || "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Folder management
  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast.error("Bitte geben Sie einen Ordnernamen ein");
      return;
    }

    try {
      await axios.post(`${API}/document-folders`, {
        name: folderName.trim(),
        parent_id: folderDialog.parentId,
        description: folderDescription.trim() || null
      });
      toast.success("Ordner erstellt");
      fetchData();
      setFolderDialog({ open: false, folder: null, parentId: null });
      setFolderName("");
      setFolderDescription("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Ordner konnte nicht erstellt werden");
    }
  };

  const handleUpdateFolder = async () => {
    if (!folderName.trim() || !folderDialog.folder) return;

    try {
      await axios.put(`${API}/document-folders/${folderDialog.folder.folder_id}`, {
        name: folderName.trim(),
        parent_id: folderDialog.folder.parent_id,
        description: folderDescription.trim() || null
      });
      toast.success("Ordner aktualisiert");
      fetchData();
      setFolderDialog({ open: false, folder: null, parentId: null });
      setFolderName("");
      setFolderDescription("");
    } catch (error) {
      toast.error("Ordner konnte nicht aktualisiert werden");
    }
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderDialog.folder) return;

    try {
      await axios.delete(`${API}/document-folders/${deleteFolderDialog.folder.folder_id}`);
      toast.success("Ordner gelöscht");
      if (selectedFolderId === deleteFolderDialog.folder.folder_id) {
        setSelectedFolderId(null);
      }
      fetchData();
    } catch (error) {
      toast.error("Ordner konnte nicht gelöscht werden");
    } finally {
      setDeleteFolderDialog({ open: false, folder: null });
    }
  };

  const handleMoveDocument = async () => {
    if (!moveDialog.doc) return;

    try {
      await axios.put(`${API}/documents/${moveDialog.doc.document_id}/move`, null, {
        params: { folder_id: moveFolderId || "" }
      });
      toast.success("Dokument verschoben");
      fetchData();
    } catch (error) {
      toast.error("Dokument konnte nicht verschoben werden");
    } finally {
      setMoveDialog({ open: false, doc: null });
      setMoveFolderId(null);
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteDialog.doc) return;
    
    try {
      await axios.delete(`${API}/documents/${deleteDialog.doc.document_id}`);
      toast.success("Dokument gelöscht");
      fetchData();
    } catch (error) {
      toast.error("Dokument konnte nicht gelöscht werden");
    } finally {
      setDeleteDialog({ open: false, doc: null });
    }
  };

  const handleConvertToArticle = async () => {
    if (!selectedDoc) return;
    
    setConverting(true);
    try {
      // Call the PDF-to-HTML conversion API
      const response = await axios.get(`${API}/documents/${selectedDoc.document_id}/convert-to-html`);
      
      if (response.data.success) {
        // Store the HTML content in sessionStorage for the article editor
        const articleData = {
          title: selectedDoc.filename.replace(/\.pdf$/i, ''),
          content: response.data.html_content,
          source_document_id: selectedDoc.document_id
        };
        sessionStorage.setItem('pdf_import_data', JSON.stringify(articleData));
        
        toast.success("PDF erfolgreich konvertiert! Wird zum Editor weitergeleitet...");
        
        // Navigate to article editor with the converted content
        navigate('/articles/new?from_pdf=true');
      }
    } catch (error) {
      console.error("Conversion failed:", error);
      toast.error(error.response?.data?.detail || "PDF-Konvertierung fehlgeschlagen");
    } finally {
      setConverting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col" data-testid="documents-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dokumente</h1>
          <p className="text-muted-foreground mt-1">
            Dokumente hochladen und organisieren
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button 
              variant="outline"
              onClick={() => {
                setFolderDialog({ open: true, folder: null, parentId: null });
                setFolderName("");
                setFolderDescription("");
              }}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Neuer Ordner
            </Button>
          )}
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Left Sidebar - Folder Tree (hidden on mobile, collapsible) */}
        <Card className="hidden lg:flex lg:col-span-1 flex-col">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Folder className="w-4 h-4" />
              Ordnerstruktur
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full px-2 pb-2">
              <FolderTree 
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
                onCreateSubfolder={(parentId) => {
                  setFolderDialog({ open: true, folder: null, parentId });
                  setFolderName("");
                  setFolderDescription("");
                }}
                canEdit={canEdit}
              />
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Mobile Folder Selector - Collapsible on small screens */}
        <div className="lg:hidden">
          <Collapsible open={folderPanelOpen} onOpenChange={setFolderPanelOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="py-3 px-4 cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <PanelLeftOpen className="w-4 h-4" />
                      {currentFolder ? currentFolder.name : "Alle Dokumente"}
                    </CardTitle>
                    <ChevronDown className={cn("w-4 h-4 transition-transform", folderPanelOpen && "rotate-180")} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-2 pt-0 max-h-48 overflow-auto">
                  <FolderTree 
                    folders={folders}
                    selectedFolderId={selectedFolderId}
                    onSelectFolder={(id) => {
                      setSelectedFolderId(id);
                      setFolderPanelOpen(false);
                    }}
                    onCreateSubfolder={(parentId) => {
                      setFolderDialog({ open: true, folder: null, parentId });
                      setFolderName("");
                      setFolderDescription("");
                    }}
                    canEdit={canEdit}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Right Side - Documents */}
        <div className="lg:col-span-3 flex flex-col min-h-0 space-y-4">
          {/* Folder Header & Upload */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentFolder ? (
                    <>
                      <Folder className="w-6 h-6 text-amber-500" />
                      <div>
                        <h2 className="font-semibold">{currentFolder.name}</h2>
                        {currentFolder.description && (
                          <p className="text-sm text-muted-foreground">{currentFolder.description}</p>
                        )}
                      </div>
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => {
                              setFolderDialog({ open: true, folder: currentFolder, parentId: null });
                              setFolderName(currentFolder.name);
                              setFolderDescription(currentFolder.description || "");
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Bearbeiten
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem 
                                onClick={() => setDeleteFolderDialog({ open: true, folder: currentFolder })}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Löschen
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </>
                  ) : (
                    <>
                      <Home className="w-6 h-6 text-slate-500" />
                      <div>
                        <h2 className="font-semibold">Alle Dokumente</h2>
                        <p className="text-sm text-muted-foreground">
                          {documents.length} Dokument{documents.length !== 1 ? 'e' : ''} gesamt
                        </p>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                    <SelectTrigger className="w-[120px] h-9">
                      <Languages className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="en">Englisch</SelectItem>
                      <SelectItem value="fr">Französisch</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <label>
                    <input
                      type="file"
                      accept={ACCEPTED_FILES}
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={uploading}
                    />
                    <Button asChild className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Datei hochladen
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents List */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardContent className="flex-1 p-0 overflow-auto">
              {filteredDocuments.length > 0 ? (
                <div className="p-4 space-y-3">
                  {filteredDocuments.map((doc) => (
                    <div
                      key={doc.document_id}
                      className="p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                      data-testid={`document-item-${doc.document_id}`}
                    >
                      {/* Document Info Row */}
                      <div className="flex items-start gap-3 mb-2">
                        <StatusIcon status={doc.status} fileType={doc.file_type} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium break-words" title={doc.filename}>{doc.filename}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{formatDate(doc.created_at)}</span>
                            {doc.page_count > 0 && <span>• {doc.page_count} Seiten</span>}
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions Row */}
                      <div className="flex items-center gap-2 justify-end">
                        <StatusBadge status={doc.status} />
                        
                        {doc.status === "completed" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedDoc(doc)}
                            data-testid={`doc-view-${doc.document_id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {canEdit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                data-testid={`doc-actions-${doc.document_id}`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setMoveDialog({ open: true, doc });
                                setMoveFolderId(doc.folder_id || null);
                              }}>
                                <MoveRight className="w-4 h-4 mr-2" />
                                In Ordner verschieben
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setDeleteDialog({ open: true, doc })}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Löschen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
                  <h3 className="font-semibold mb-2">Keine Dokumente</h3>
                  <p className="text-muted-foreground text-sm">
                    {currentFolder 
                      ? "Dieser Ordner ist leer. Laden Sie ein PDF hoch."
                      : "Laden Sie Ihr erstes PDF-Dokument hoch."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onOpenChange={(open) => !uploading && setUploadDialog(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PDF hochladen</DialogTitle>
            <DialogDescription>
              Wählen Sie den Ordner, in dem das Dokument gespeichert werden soll.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <FileText className="w-8 h-8 text-red-500" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Ordner auswählen</Label>
              <FolderSelector 
                folders={folders}
                selectedId={uploadFolderId}
                onSelect={setUploadFolderId}
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  setUploadDialog(false);
                  setFolderDialog({ open: true, folder: null, parentId: null });
                  setFolderName("");
                  setFolderDescription("");
                }}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                Neuen Ordner erstellen
              </Button>
            </div>
            
            {uploading && (
              <div>
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-1 text-center">{uploadProgress}%</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialog(false)} disabled={uploading}>
              Abbrechen
            </Button>
            <Button onClick={handleUpload} disabled={uploading} className="bg-indigo-600 hover:bg-indigo-700">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Hochladen...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Hochladen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Folder Create/Edit Dialog */}
      <Dialog open={folderDialog.open} onOpenChange={(open) => !open && setFolderDialog({ open: false, folder: null, parentId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {folderDialog.folder ? "Ordner bearbeiten" : "Neuer Ordner"}
            </DialogTitle>
            <DialogDescription>
              {folderDialog.parentId && !folderDialog.folder 
                ? "Erstellen Sie einen Unterordner."
                : "Geben Sie die Ordnerdetails ein."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Ordnername *</Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="z.B. Reiseunterlagen"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="folder-desc">Beschreibung (optional)</Label>
              <Textarea
                id="folder-desc"
                value={folderDescription}
                onChange={(e) => setFolderDescription(e.target.value)}
                placeholder="Kurze Beschreibung des Ordnerinhalts..."
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialog({ open: false, folder: null, parentId: null })}>
              Abbrechen
            </Button>
            <Button 
              onClick={folderDialog.folder ? handleUpdateFolder : handleCreateFolder}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {folderDialog.folder ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Document Dialog */}
      <Dialog open={moveDialog.open} onOpenChange={(open) => !open && setMoveDialog({ open: false, doc: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dokument verschieben</DialogTitle>
            <DialogDescription>
              Wählen Sie den Zielordner für "{moveDialog.doc?.filename}".
            </DialogDescription>
          </DialogHeader>
          
          <FolderSelector 
            folders={folders}
            selectedId={moveFolderId}
            onSelect={setMoveFolderId}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialog({ open: false, doc: null })}>
              Abbrechen
            </Button>
            <Button onClick={handleMoveDocument} className="bg-indigo-600 hover:bg-indigo-700">
              Verschieben
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      {selectedDoc && (
        <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
          <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
              <DialogTitle>{selectedDoc.filename}</DialogTitle>
              <DialogDescription>
                Verarbeitet am {formatDate(selectedDoc.processed_at)} • {selectedDoc.page_count || 0} Seiten
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="viewer" className="flex-1 flex flex-col min-h-0">
              <div className="px-6 pt-2 flex items-center justify-between border-b flex-shrink-0">
                <TabsList>
                  <TabsTrigger value="viewer" data-testid="document-viewer-tab">
                    <Eye className="w-4 h-4 mr-2" />
                    Dokument-Ansicht
                  </TabsTrigger>
                  <TabsTrigger value="text" data-testid="text-preview-tab">
                    <FileText className="w-4 h-4 mr-2" />
                    Extrahierter Text
                  </TabsTrigger>
                </TabsList>
                
                <div className="flex items-center gap-2 py-2">
                  <Button
                    onClick={handleConvertToArticle}
                    disabled={converting}
                    className="bg-indigo-600 hover:bg-indigo-700"
                    data-testid="convert-to-article-btn"
                  >
                    {converting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Konvertiere...
                      </>
                    ) : (
                      <>
                        <FileEdit className="w-4 h-4 mr-2" />
                        In Artikel umwandeln
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <TabsContent value="viewer" className="flex-1 m-0 min-h-0">
                <DocumentViewer 
                  documentId={selectedDoc.document_id}
                  url={`${API}/documents/${selectedDoc.document_id}/file`}
                  filename={selectedDoc.filename}
                  fileType={selectedDoc.file_type || '.pdf'}
                  className="h-full"
                />
              </TabsContent>
              
              <TabsContent value="text" className="flex-1 m-0 p-6 overflow-auto">
                {selectedDoc.extracted_text ? (
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {selectedDoc.extracted_text}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Kein extrahierter Text verfügbar
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Folder Dialog */}
      <AlertDialog open={deleteFolderDialog.open} onOpenChange={(open) => !open && setDeleteFolderDialog({ open: false, folder: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ordner löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Ordner "{deleteFolderDialog.folder?.name}" wird gelöscht. 
              Dokumente und Unterordner werden in den übergeordneten Ordner verschoben.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder} className="bg-red-600 hover:bg-red-700">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Document Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, doc: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dokument löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Dokument "{deleteDialog.doc?.filename}" wird in den Papierkorb verschoben.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDocument} className="bg-red-600 hover:bg-red-700">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Documents;
