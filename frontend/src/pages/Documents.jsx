import React, { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, AuthContext } from "@/App";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
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
  ArrowRight,
  Image as ImageIcon,
  Download,
  ZoomIn,
  Info,
  LayoutGrid as Grid,
  CheckSquare,
  Square,
  GripVertical
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
import { Checkbox } from "@/components/ui/checkbox";
import DocumentViewer, { FileIcon } from "@/components/DocumentViewer";
import GoogleDriveImportDialog from "@/components/dialogs/GoogleDriveImportDialog";
import DocumentDriveExportDialog from "@/components/dialogs/DocumentDriveExportDialog";
import MultiImageUploadDialog from "@/components/dialogs/MultiImageUploadDialog";

const ACCEPTED_FILES = '.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp';

// Status components
const StatusIcon = ({ status, fileType, isImage, imageId }) => {
  // Show thumbnail for images
  if (isImage && imageId) {
    return (
      <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
        <img 
          src={`${API}/images/${imageId}`} 
          alt="Vorschau"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
          }}
        />
      </div>
    );
  }
  
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
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    failed: "bg-red-50 text-red-700 border-red-200"
  };
  
  const labels = {
    pending: "Wartend",
    processing: "Verarbeitung",
    completed: "Abgeschlossen",
    active: "Abgeschlossen",
    failed: "Fehlgeschlagen"
  };

  return (
    <Badge variant="outline" className={`${styles[status] || styles.completed} border`}>
      {labels[status] || "Abgeschlossen"}
    </Badge>
  );
};

// Droppable AND Draggable Folder Component for Drag & Drop
const DroppableFolder = ({ folder, isSelected, level, hasChildren, isExpanded, onSelect, onToggleExpand, onCreateSubfolder, canEdit, children }) => {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `folder-${folder.folder_id}`,
    data: { type: 'folder', folderId: folder.folder_id }
  });

  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: `drag-folder-${folder.folder_id}`,
    data: { type: 'folder', folder: folder },
    disabled: !canEdit
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : undefined,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  // Combine refs
  const setNodeRef = (node) => {
    setDropRef(node);
    setDragRef(node);
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div 
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors group",
          isSelected && "bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-500",
          isOver && !isDragging && "bg-indigo-100 dark:bg-indigo-800/30 ring-2 ring-indigo-500",
          isDragging && "opacity-50"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onSelect(folder.folder_id)}
      >
        {canEdit && (
          <div {...listeners} className="cursor-grab active:cursor-grabbing p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
        {hasChildren ? (
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleExpand(folder.folder_id); }}
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
      {children}
    </div>
  );
};

// Droppable Root Folder
const DroppableRootFolder = ({ isSelected, onSelect }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'folder-root',
    data: { type: 'folder', folderId: null }
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors",
        isSelected && "bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-500",
        isOver && "bg-indigo-100 dark:bg-indigo-800/30 ring-2 ring-indigo-500"
      )}
      onClick={() => onSelect(null)}
    >
      <Home className="w-4 h-4 text-slate-500" />
      <span className="text-sm font-medium">Alle Dokumente</span>
    </div>
  );
};

// Draggable Document Component
const DraggableDocument = ({ doc, children }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `doc-${doc.document_id}`,
    data: { type: 'document', document: doc }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : undefined,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div {...listeners} className="cursor-grab active:cursor-grabbing">
        {children}
      </div>
    </div>
  );
};

// Folder Tree Component with Drag & Drop support
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
      <DroppableFolder
        key={folder.folder_id}
        folder={folder}
        isSelected={isSelected}
        level={level}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
        onSelect={onSelectFolder}
        onToggleExpand={toggleExpand}
        onCreateSubfolder={onCreateSubfolder}
        canEdit={canEdit}
      >
        {hasChildren && isExpanded && (
          <div>
            {children.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </DroppableFolder>
    );
  };
  
  const rootFolders = buildTree(null);
  
  return (
    <div className="space-y-1">
      {/* Root folder option */}
      <DroppableRootFolder 
        isSelected={selectedFolderId === null || selectedFolderId === "root"}
        onSelect={onSelectFolder}
      />
      
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
  const [imagePreview, setImagePreview] = useState(null);
  
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
  
  // Google Drive
  const [driveStatus, setDriveStatus] = useState({ connected: false });
  const [driveImportDialog, setDriveImportDialog] = useState(false);
  const [driveExportDialog, setDriveExportDialog] = useState({ open: false, doc: null });
  const [checkingDrive, setCheckingDrive] = useState(true);
  
  // Sorting and View Mode
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [viewMode, setViewMode] = useState("list"); // "list" or "gallery"
  const [imageUploadDialog, setImageUploadDialog] = useState(false);
  
  // Multi-select state
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [bulkMoveDialog, setBulkMoveDialog] = useState(false);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  
  // Drag & Drop state
  const [activeDragItem, setActiveDragItem] = useState(null);
  const [activeDragType, setActiveDragType] = useState(null); // 'document' or 'folder'
  const [pendingDrop, setPendingDrop] = useState(null); // { item, targetFolder, type }
  const [confirmDropDialog, setConfirmDropDialog] = useState(false);
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

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

  // Check Google Drive connection status
  useEffect(() => {
    const checkDriveStatus = async () => {
      try {
        const response = await axios.get(`${API}/drive/status`);
        setDriveStatus(response.data);
      } catch (error) {
        console.error("Failed to check Drive status:", error);
      } finally {
        setCheckingDrive(false);
      }
    };
    checkDriveStatus();
    
    // Check for drive_connected query param
    const params = new URLSearchParams(window.location.search);
    if (params.get('drive_connected') === 'true') {
      toast.success("Google Drive erfolgreich verbunden!");
      setDriveStatus({ connected: true });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('drive_error') === 'true') {
      toast.error("Google Drive Verbindung fehlgeschlagen");
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const connectGoogleDrive = async () => {
    try {
      const response = await axios.get(`${API}/drive/connect`);
      window.location.href = response.data.authorization_url;
    } catch (error) {
      console.error("Failed to connect Drive:", error);
      toast.error("Fehler beim Verbinden mit Google Drive");
    }
  };

  const disconnectGoogleDrive = async () => {
    try {
      await axios.post(`${API}/drive/disconnect`);
      setDriveStatus({ connected: false });
      toast.success("Google Drive getrennt");
    } catch (error) {
      console.error("Failed to disconnect Drive:", error);
      toast.error("Fehler beim Trennen von Google Drive");
    }
  };

  const handleDriveImport = (result) => {
    fetchData();
  };

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

  // Filter documents by selected folder, then sort
  const sortedDocuments = React.useMemo(() => {
    // First filter by selected folder
    const filtered = documents.filter(doc => {
      if (selectedFolderId === null || selectedFolderId === "root") {
        return !doc.folder_id;
      }
      return doc.folder_id === selectedFolderId;
    });
    
    // Then sort the filtered results
    const sorted = [...filtered].sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "title":
          aVal = (a.title || a.filename || "").toLowerCase();
          bVal = (b.title || b.filename || "").toLowerCase();
          return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case "file_size":
          aVal = a.file_size || 0;
          bVal = b.file_size || 0;
          return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
        case "created_at":
        default:
          aVal = new Date(a.created_at || 0);
          bVal = new Date(b.created_at || 0);
          return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
    });
    return sorted;
  }, [documents, selectedFolderId, sortBy, sortOrder]);

  // Filter images for gallery
  const imageDocuments = sortedDocuments.filter(doc => doc.is_image);
  const nonImageDocuments = sortedDocuments.filter(doc => !doc.is_image);

  // Multi-select helper functions
  const toggleDocSelection = (docId) => {
    setSelectedDocIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const selectAllImages = () => {
    const allImageIds = imageDocuments.map(doc => doc.document_id);
    setSelectedDocIds(new Set(allImageIds));
  };

  const clearSelection = () => {
    setSelectedDocIds(new Set());
  };

  const isAllImagesSelected = imageDocuments.length > 0 && 
    imageDocuments.every(doc => selectedDocIds.has(doc.document_id));

  // Bulk actions
  const handleBulkDownload = async () => {
    const selectedDocs = documents.filter(doc => selectedDocIds.has(doc.document_id));
    for (const doc of selectedDocs) {
      if (doc.image_id) {
        window.open(`${API}/images/${doc.image_id}`, '_blank');
      } else {
        window.open(`${API}/documents/${doc.document_id}/file`, '_blank');
      }
    }
    toast.success(`${selectedDocs.length} Datei(en) zum Download geöffnet`);
  };

  const handleBulkMove = async () => {
    if (selectedDocIds.size === 0) return;
    
    try {
      const promises = Array.from(selectedDocIds).map(docId =>
        axios.put(`${API}/documents/${docId}/move`, null, {
          params: { folder_id: moveFolderId || "" }
        })
      );
      await Promise.all(promises);
      toast.success(`${selectedDocIds.size} Dokument(e) verschoben`);
      fetchData();
      setSelectedDocIds(new Set());
      setBulkMoveDialog(false);
      setMoveFolderId(null);
    } catch (error) {
      toast.error("Einige Dokumente konnten nicht verschoben werden");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocIds.size === 0) return;
    
    try {
      const promises = Array.from(selectedDocIds).map(docId =>
        axios.delete(`${API}/documents/${docId}`)
      );
      await Promise.all(promises);
      toast.success(`${selectedDocIds.size} Dokument(e) gelöscht`);
      fetchData();
      setSelectedDocIds(new Set());
      setBulkDeleteDialog(false);
    } catch (error) {
      toast.error("Einige Dokumente konnten nicht gelöscht werden");
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (event) => {
    const { active } = event;
    if (active.data.current?.type === 'document') {
      setActiveDragItem(active.data.current.document);
      setActiveDragType('document');
    } else if (active.data.current?.type === 'folder') {
      setActiveDragItem(active.data.current.folder);
      setActiveDragType('folder');
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over || !canEdit) {
      setActiveDragItem(null);
      setActiveDragType(null);
      return;
    }
    
    // Check if we dropped on a folder
    if (over.data.current?.type === 'folder') {
      const targetFolderId = over.data.current.folderId;
      const targetFolder = folders.find(f => f.folder_id === targetFolderId);
      const targetFolderName = targetFolder?.name || "Alle Dokumente";
      
      // If dragging a document
      if (active.data.current?.type === 'document') {
        const document = active.data.current.document;
        
        // Don't move if already in this folder
        if (document.folder_id === targetFolderId) {
          setActiveDragItem(null);
          setActiveDragType(null);
          return;
        }
        
        // Show confirmation dialog
        setPendingDrop({
          item: document,
          itemName: document.filename || document.title,
          targetFolderId,
          targetFolderName,
          type: 'document'
        });
        setConfirmDropDialog(true);
      }
      
      // If dragging a folder
      if (active.data.current?.type === 'folder') {
        const folder = active.data.current.folder;
        
        // Don't move if already in this folder or moving to itself
        if (folder.parent_id === targetFolderId || folder.folder_id === targetFolderId) {
          setActiveDragItem(null);
          setActiveDragType(null);
          return;
        }
        
        // Show confirmation dialog
        setPendingDrop({
          item: folder,
          itemName: folder.name,
          targetFolderId,
          targetFolderName,
          type: 'folder'
        });
        setConfirmDropDialog(true);
      }
    }
    
    setActiveDragItem(null);
    setActiveDragType(null);
  };

  const handleDragCancel = () => {
    setActiveDragItem(null);
    setActiveDragType(null);
  };

  // Confirm and execute the drop
  const confirmDrop = async () => {
    if (!pendingDrop) return;
    
    const { item, targetFolderId, type } = pendingDrop;
    
    try {
      if (type === 'document') {
        await axios.put(`${API}/documents/${item.document_id}/move`, null, {
          params: { folder_id: targetFolderId || "" }
        });
        toast.success(`"${item.filename || item.title}" verschoben`);
      } else if (type === 'folder') {
        await axios.put(`${API}/document-folders/${item.folder_id}/move`, {
          target_folder_id: targetFolderId
        });
        toast.success(`Ordner "${item.name}" verschoben`);
      }
      fetchData();
    } catch (error) {
      console.error("Move error:", error);
      toast.error(error.response?.data?.detail || "Verschieben fehlgeschlagen");
    } finally {
      setPendingDrop(null);
      setConfirmDropDialog(false);
    }
  };

  const cancelDrop = () => {
    setPendingDrop(null);
    setConfirmDropDialog(false);
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
                        <p className="text-sm text-muted-foreground">
                          {currentFolder.description || `${sortedDocuments.length} Dokument${sortedDocuments.length !== 1 ? 'e' : ''}`}
                        </p>
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
                          {sortedDocuments.length} Dokument{sortedDocuments.length !== 1 ? 'e' : ''} im Stammverzeichnis
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
                  
                  {/* Google Drive Button */}
                  {driveStatus.connected ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-9" data-testid="google-drive-menu">
                          <svg className="w-4 h-4 mr-2" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                            <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                            <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                            <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                            <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                            <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                            <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                          </svg>
                          Google Drive
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDriveImportDialog(true)} data-testid="drive-import-btn">
                          <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                          Von Drive importieren
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={disconnectGoogleDrive} className="text-red-600">
                          <X className="w-4 h-4 mr-2" />
                          Drive trennen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="h-9" 
                      onClick={connectGoogleDrive}
                      disabled={checkingDrive}
                      data-testid="connect-google-drive"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                        <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                        <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                        <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                      </svg>
                      Drive verbinden
                    </Button>
                  )}
                  
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
                  
                  {/* Image Upload Button */}
                  <Button 
                    variant="outline" 
                    onClick={() => setImageUploadDialog(true)}
                    className="h-9"
                    data-testid="image-upload-btn"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Bilder
                  </Button>
                </div>
              </div>
              
              {/* Sorting and View Mode Toolbar */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sortieren:</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Datum</SelectItem>
                      <SelectItem value="title">Name</SelectItem>
                      <SelectItem value="file_size">Größe</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="h-8 px-2"
                  >
                    {sortOrder === "asc" ? "↑ Aufst." : "↓ Abst."}
                  </Button>
                </div>
                
                <div className="flex items-center gap-1 border rounded-md p-1">
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="h-7 px-2"
                    title="Listenansicht"
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "gallery" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("gallery")}
                    className="h-7 px-2"
                    title="Galerieansicht"
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents List / Gallery */}
          <Card className="flex-1 flex flex-col min-h-0">
            {/* Multi-select action bar */}
            {selectedDocIds.size > 0 && viewMode === "gallery" && (
              <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 border-b">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isAllImagesSelected}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        selectAllImages();
                      } else {
                        clearSelection();
                      }
                    }}
                    data-testid="select-all-checkbox"
                  />
                  <span className="text-sm font-medium">
                    {selectedDocIds.size} ausgewählt
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-muted-foreground"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Auswahl aufheben
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDownload}
                    data-testid="bulk-download-btn"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Herunterladen
                  </Button>
                  {canEdit && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBulkMoveDialog(true);
                          setMoveFolderId(null);
                        }}
                        data-testid="bulk-move-btn"
                      >
                        <MoveRight className="w-4 h-4 mr-2" />
                        Verschieben
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBulkDeleteDialog(true)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid="bulk-delete-btn"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Löschen
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
            <CardContent className="flex-1 p-0 overflow-auto">
              {sortedDocuments.length > 0 ? (
                viewMode === "gallery" ? (
                  /* Gallery View for Images */
                  <div className="p-4">
                    {imageDocuments.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium text-muted-foreground">
                            Bilder ({imageDocuments.length})
                          </h3>
                          {canEdit && imageDocuments.length > 0 && selectedDocIds.size === 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={selectAllImages}
                              className="text-xs"
                              data-testid="select-all-btn"
                            >
                              <CheckSquare className="w-3.5 h-3.5 mr-1" />
                              Alle auswählen
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {imageDocuments.map((doc) => {
                            const isSelected = selectedDocIds.has(doc.document_id);
                            return (
                            <div
                              key={doc.document_id}
                              className={cn(
                                "group relative aspect-square rounded-lg overflow-hidden bg-muted border transition-colors",
                                isSelected 
                                  ? "border-indigo-500 ring-2 ring-indigo-500/30" 
                                  : "hover:border-primary"
                              )}
                              data-testid={`gallery-image-${doc.document_id}`}
                            >
                              {/* Selection checkbox */}
                              <div 
                                className={cn(
                                  "absolute top-2 left-2 z-10 transition-opacity",
                                  isSelected || "opacity-0 group-hover:opacity-100"
                                )}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleDocSelection(doc.document_id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="bg-white/90 border-white/50 data-[state=checked]:bg-indigo-600"
                                  data-testid={`select-image-${doc.document_id}`}
                                />
                              </div>
                              
                              <img
                                src={`${API}/images/${doc.image_id}`}
                                alt={doc.title || doc.filename}
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => {
                                  if (selectedDocIds.size > 0) {
                                    toggleDocSelection(doc.document_id);
                                  } else {
                                    setImagePreview(doc);
                                  }
                                }}
                              />
                              
                              {/* Hover overlay with actions */}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex flex-col">
                                {/* Top action bar */}
                                <div className="flex-1 flex items-start justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="flex gap-1">
                                    <Button
                                      variant="secondary"
                                      size="icon"
                                      className="h-7 w-7 bg-white/90 hover:bg-white"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(`${API}/images/${doc.image_id}`, '_blank');
                                      }}
                                      title="Herunterladen"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </Button>
                                    {driveStatus.connected && (
                                      <Button
                                        variant="secondary"
                                        size="icon"
                                        className="h-7 w-7 bg-white/90 hover:bg-white"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDriveExportDialog({ open: true, doc });
                                        }}
                                        title="Nach Google Drive"
                                      >
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                                          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                                          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                                          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                                          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                                          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                                          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                                        </svg>
                                      </Button>
                                    )}
                                    <Button
                                      variant="secondary"
                                      size="icon"
                                      className="h-7 w-7 bg-white/90 hover:bg-white"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMoveDialog({ open: true, doc });
                                        setMoveFolderId(doc.folder_id || null);
                                      }}
                                      title="Verschieben"
                                    >
                                      <MoveRight className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Center zoom icon */}
                                <div 
                                  className="absolute inset-0 flex items-center justify-center cursor-pointer"
                                  onClick={() => setImagePreview(doc)}
                                >
                                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                              
                              {/* Bottom info */}
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                <p className="text-white text-xs truncate">
                                  {doc.title || doc.filename}
                                </p>
                              </div>
                            </div>
                          );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {nonImageDocuments.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                          Dokumente ({nonImageDocuments.length})
                        </h3>
                        <div className="space-y-2">
                          {nonImageDocuments.map((doc) => (
                            <div
                              key={doc.document_id}
                              className="p-3 rounded-lg border hover:bg-accent/50 transition-colors flex items-center gap-3"
                              data-testid={`document-item-${doc.document_id}`}
                            >
                              <StatusIcon status={doc.status} fileType={doc.file_type} />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{doc.filename || doc.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(doc.created_at)} • {(doc.file_size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <StatusBadge status={doc.status} />
                                {doc.status === "completed" && (
                                  <Button variant="outline" size="sm" onClick={() => setSelectedDoc(doc)}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* List View */
                  <div className="p-4 space-y-3">
                    {sortedDocuments.map((doc) => (
                      <DraggableDocument key={doc.document_id} doc={doc}>
                      <div
                        className="p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                        data-testid={`document-item-${doc.document_id}`}
                      >
                        {/* Document Info Row */}
                        <div className="flex items-start gap-3 mb-2">
                          {canEdit && (
                            <GripVertical className="w-4 h-4 text-muted-foreground mt-1 cursor-grab active:cursor-grabbing" />
                          )}
                          <StatusIcon 
                            status={doc.status} 
                            fileType={doc.file_type} 
                            isImage={doc.is_image}
                            imageId={doc.image_id}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium break-words" title={doc.filename}>{doc.filename || doc.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span>{formatDate(doc.created_at)}</span>
                              {doc.page_count > 0 && <span>• {doc.page_count} Seiten</span>}
                              {doc.file_size && (
                                <span>• {(doc.file_size / 1024).toFixed(1)} KB</span>
                              )}
                              {doc.is_image && <span>• Bild</span>}
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions Row */}
                        <div className="flex items-center gap-2 justify-end">
                          {/* Status badge - show "active" for images as completed */}
                          <StatusBadge status={doc.is_image ? (doc.status || "active") : doc.status} />
                          
                          {/* View button - different for images vs documents */}
                          {doc.is_image && doc.image_id ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setImagePreview(doc)}
                              data-testid={`image-view-${doc.document_id}`}
                              title="Bild ansehen"
                            >
                              <ZoomIn className="w-4 h-4" />
                            </Button>
                          ) : doc.status === "completed" && (
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
                                {driveStatus.connected && (
                                  <DropdownMenuItem onClick={() => setDriveExportDialog({ open: true, doc })}>
                                    <svg className="w-4 h-4 mr-2" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                                      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                                      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                                      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                                      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                                      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                                      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                                    </svg>
                                    Nach Google Drive
                                  </DropdownMenuItem>
                                )}
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
                      </DraggableDocument>
                    ))}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
                  <h3 className="font-semibold mb-2">Keine Dokumente</h3>
                  <p className="text-muted-foreground text-sm">
                    {currentFolder 
                      ? "Dieser Ordner ist leer. Laden Sie Dateien hoch."
                      : "Laden Sie Ihr erstes Dokument hoch."}
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

      {/* Google Drive Import Dialog */}
      <GoogleDriveImportDialog
        open={driveImportDialog}
        onOpenChange={setDriveImportDialog}
        onImport={handleDriveImport}
        targetFolderId={selectedFolderId}
      />

      {/* Google Drive Export Dialog */}
      <DocumentDriveExportDialog
        open={driveExportDialog.open}
        onOpenChange={(open) => !open && setDriveExportDialog({ open: false, doc: null })}
        documentId={driveExportDialog.doc?.document_id}
        documentName={driveExportDialog.doc?.filename}
      />

      {/* Image Preview Dialog */}
      <Dialog open={!!imagePreview} onOpenChange={(open) => !open && setImagePreview(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              {imagePreview?.title || imagePreview?.filename || "Bildvorschau"}
            </DialogTitle>
          </DialogHeader>
          
          {imagePreview && (
            <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
              {/* Image */}
              <div className="flex-1 min-h-0 flex items-center justify-center bg-muted rounded-lg overflow-hidden">
                <img
                  src={`${API}/images/${imagePreview.image_id}`}
                  alt={imagePreview.title || "Bild"}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              
              {/* Metadata */}
              <div className="flex-shrink-0 p-3 bg-muted rounded-lg space-y-2">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <Info className="w-4 h-4" />
                  Bild-Informationen
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Dateiname</p>
                    <p className="font-medium truncate" title={imagePreview.title}>
                      {imagePreview.title || imagePreview.filename}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Dateigröße</p>
                    <p className="font-medium">
                      {imagePreview.file_size 
                        ? `${(imagePreview.file_size / 1024).toFixed(1)} KB`
                        : "Unbekannt"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Typ</p>
                    <p className="font-medium uppercase">
                      {imagePreview.file_type || "Bild"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Hochgeladen</p>
                    <p className="font-medium">
                      {formatDate(imagePreview.created_at)}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <DialogFooter className="flex-shrink-0 flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open(`${API}/images/${imagePreview.image_id}`, '_blank');
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Herunterladen
                </Button>
                {driveStatus.connected && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImagePreview(null);
                      setDriveExportDialog({ open: true, doc: imagePreview });
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                    </svg>
                    Google Drive
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setImagePreview(null);
                    setMoveDialog({ open: true, doc: imagePreview });
                    setMoveFolderId(imagePreview.folder_id || null);
                  }}
                >
                  <MoveRight className="w-4 h-4 mr-2" />
                  Verschieben
                </Button>
                <Button onClick={() => setImagePreview(null)}>
                  Schließen
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Multi-Image Upload Dialog */}
      <MultiImageUploadDialog
        open={imageUploadDialog}
        onClose={() => {
          setImageUploadDialog(false);
          fetchData();
        }}
        onImagesUploaded={() => {
          fetchData();
        }}
      />

      {/* Bulk Move Dialog */}
      <Dialog open={bulkMoveDialog} onOpenChange={(open) => !open && setBulkMoveDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDocIds.size} Dokument{selectedDocIds.size !== 1 ? 'e' : ''} verschieben
            </DialogTitle>
            <DialogDescription>
              Wählen Sie den Zielordner für die ausgewählten Dokumente.
            </DialogDescription>
          </DialogHeader>
          
          <FolderSelector 
            folders={folders}
            selectedId={moveFolderId}
            onSelect={setMoveFolderId}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkMoveDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleBulkMove} className="bg-indigo-600 hover:bg-indigo-700">
              Verschieben
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialog} onOpenChange={(open) => !open && setBulkDeleteDialog(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedDocIds.size} Dokument{selectedDocIds.size !== 1 ? 'e' : ''} löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Die ausgewählten Dokumente werden in den Papierkorb verschoben.
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
              {selectedDocIds.size} Dokument{selectedDocIds.size !== 1 ? 'e' : ''} löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Drag & Drop Confirmation Dialog */}
      <AlertDialog open={confirmDropDialog} onOpenChange={(open) => !open && cancelDrop()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MoveRight className="w-5 h-5 text-indigo-500" />
              Verschieben bestätigen
            </AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie <strong>"{pendingDrop?.itemName}"</strong> wirklich nach{' '}
              <strong>"{pendingDrop?.targetFolderName}"</strong> verschieben?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDrop}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDrop} className="bg-indigo-600 hover:bg-indigo-700">
              Verschieben
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    
    {/* Drag Overlay */}
    <DragOverlay>
      {activeDragItem && (
        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border-2 border-indigo-500 shadow-lg flex items-center gap-3 min-w-[200px]">
          {activeDragType === 'folder' ? (
            <Folder className="w-5 h-5 text-amber-500" />
          ) : activeDragItem.is_image && activeDragItem.image_id ? (
            <div className="w-10 h-10 rounded overflow-hidden bg-muted">
              <img 
                src={`${API}/images/${activeDragItem.image_id}`} 
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <FileText className="w-5 h-5 text-indigo-500" />
          )}
          <span className="text-sm font-medium truncate max-w-[150px]">
            {activeDragType === 'folder' ? activeDragItem.name : (activeDragItem.filename || activeDragItem.title)}
          </span>
        </div>
      )}
    </DragOverlay>
    </DndContext>
  );
};

export default Documents;
