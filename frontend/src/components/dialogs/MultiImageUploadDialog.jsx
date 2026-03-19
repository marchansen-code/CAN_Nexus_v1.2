import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Upload, X, Image as ImageIcon, Loader2, Check, AlertCircle, FolderOpen, FolderPlus, ChevronRight, ChevronDown, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

// Folder Tree Item for hierarchical selection
const FolderTreeItem = ({ folder, folders, selectedId, onSelect, expandedIds, toggleExpand, level = 0 }) => {
  const childFolders = folders.filter(f => f.parent_id === folder.folder_id);
  const hasChildren = childFolders.length > 0;
  const isExpanded = expandedIds.has(folder.folder_id);
  const isSelected = selectedId === folder.folder_id;

  return (
    <div style={{ marginLeft: level > 0 ? `${level * 12}px` : 0 }}>
      <button
        onClick={() => {
          onSelect(folder.folder_id);
          if (hasChildren && !isExpanded) toggleExpand(folder.folder_id);
        }}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
          isSelected 
            ? 'bg-indigo-50 text-indigo-700 font-medium' 
            : 'hover:bg-muted text-foreground'
        )}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); toggleExpand(folder.folder_id); }}
            className="p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 shrink-0 text-amber-500" />
        ) : (
          <Folder className="w-4 h-4 shrink-0 text-amber-500" />
        )}
        <span className="truncate flex-1">{folder.name}</span>
        {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
      </button>
      
      {isExpanded && hasChildren && (
        <div className="mt-0.5 border-l border-slate-200 ml-2 pl-1">
          {childFolders.map(child => (
            <FolderTreeItem
              key={child.folder_id}
              folder={child}
              folders={folders}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const MultiImageUploadDialog = ({ open, onClose, onImagesUploaded }) => {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saveToDocuments, setSaveToDocuments] = useState(true);
  const [results, setResults] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("auto");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [expandedFolderIds, setExpandedFolderIds] = useState(new Set());
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  useEffect(() => {
    if (open) {
      loadFolders();
    }
  }, [open]);

  const loadFolders = async () => {
    try {
      const response = await axios.get(`${API}/document-folders`);
      setFolders(response.data || []);
    } catch (error) {
      console.error("Failed to load folders:", error);
    }
  };

  const toggleFolderExpand = (folderId) => {
    setExpandedFolderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const createNewFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("Bitte Ordnernamen eingeben");
      return;
    }

    setCreatingFolder(true);
    try {
      const response = await axios.post(`${API}/document-folders`, {
        name: newFolderName.trim(),
        parent_id: null
      });
      toast.success(`Ordner "${newFolderName}" erstellt`);
      setSelectedFolderId(response.data.folder_id);
      setNewFolderName("");
      setShowNewFolderInput(false);
      loadFolders();
    } catch (error) {
      toast.error("Fehler beim Erstellen des Ordners");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleFileSelect = (selectedFiles) => {
    const imageFiles = Array.from(selectedFiles).filter(f => 
      f.type.startsWith('image/')
    );
    
    if (imageFiles.length === 0) {
      toast.error("Keine gültigen Bilddateien ausgewählt");
      return;
    }

    const newPreviews = imageFiles.map(file => ({
      file,
      name: file.name,
      size: file.size,
      preview: URL.createObjectURL(file),
      status: 'pending'
    }));

    setFiles(prev => [...prev, ...imageFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index) => {
    URL.revokeObjectURL(previews[index].preview);
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.remove('border-primary', 'bg-primary/5');
    
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.add('border-primary', 'bg-primary/5');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.remove('border-primary', 'bg-primary/5');
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    // Determine folder_id
    const folderId = selectedFolderId === "auto" ? null : selectedFolderId;

    try {
      const response = await axios.post(
        `${API}/images/upload-multiple`,
        formData,
        {
          params: {
            save_to_documents: saveToDocuments,
            folder_id: folderId
          },
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percent);
          }
        }
      );

      setResults(response.data);
      
      const updatedPreviews = previews.map(p => {
        const result = response.data.uploaded.find(u => u.filename === p.name);
        const error = response.data.errors.find(e => e.filename === p.name);
        return {
          ...p,
          status: result ? 'success' : 'error',
          url: result?.url,
          error: error?.error
        };
      });
      setPreviews(updatedPreviews);

      if (response.data.success_count > 0) {
        toast.success(`${response.data.success_count} Bilder hochgeladen`);
        
        if (onImagesUploaded) {
          onImagesUploaded(response.data.uploaded);
        }
      }
      
      if (response.data.error_count > 0) {
        toast.error(`${response.data.error_count} Bilder fehlgeschlagen`);
      }

    } catch (error) {
      toast.error("Fehler beim Hochladen der Bilder");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    previews.forEach(p => URL.revokeObjectURL(p.preview));
    setFiles([]);
    setPreviews([]);
    setResults(null);
    setProgress(0);
    setSelectedFolderId("auto");
    setShowNewFolderInput(false);
    setNewFolderName("");
    onClose();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getSelectedFolderName = () => {
    if (selectedFolderId === "auto") return "Bilder (automatisch)";
    const folder = folders.find(f => f.folder_id === selectedFolderId);
    return folder?.name || "Unbekannt";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Bilder hochladen
          </DialogTitle>
          <DialogDescription>
            Wählen Sie mehrere Bilder aus oder ziehen Sie sie hierher.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Drop Zone */}
          <div
            ref={dropZoneRef}
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              "hover:border-primary hover:bg-primary/5",
              uploading && "pointer-events-none opacity-50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Klicken oder Dateien hierher ziehen
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPEG, PNG, GIF, WebP (max. 10MB pro Bild)
            </p>
          </div>

          {/* File Previews */}
          {previews.length > 0 && (
            <ScrollArea className="h-[150px] border rounded-lg p-2">
              <div className="grid grid-cols-5 gap-2">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-md overflow-hidden bg-muted">
                      <img
                        src={preview.preview}
                        alt={preview.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {preview.status === 'success' && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center rounded-md">
                        <Check className="w-5 h-5 text-green-600" />
                      </div>
                    )}
                    {preview.status === 'error' && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center rounded-md">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      </div>
                    )}
                    
                    {!uploading && preview.status === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    
                    <p className="text-[10px] text-muted-foreground truncate mt-1" title={preview.name}>
                      {preview.name}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                {progress}% hochgeladen...
              </p>
            </div>
          )}

          {/* Results summary */}
          {results && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p><strong>{results.success_count}</strong> von {results.total} Bildern erfolgreich hochgeladen</p>
              {results.folder_id && saveToDocuments && (
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <FolderOpen className="w-4 h-4" />
                  Gespeichert in: {getSelectedFolderName()}
                </p>
              )}
            </div>
          )}

          {/* Save options */}
          <div className="space-y-3 border-t pt-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="save-to-docs"
                checked={saveToDocuments}
                onCheckedChange={setSaveToDocuments}
                disabled={uploading || results}
              />
              <Label htmlFor="save-to-docs" className="cursor-pointer text-sm">
                In Dokumenten speichern
              </Label>
            </div>

            {saveToDocuments && !results && (
              <div className="space-y-2 pl-6">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Zielordner:</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                    disabled={uploading}
                    className="text-xs h-7"
                  >
                    <FolderPlus className="w-3.5 h-3.5 mr-1" />
                    Neuer Ordner
                  </Button>
                </div>
                
                {/* Hierarchical folder tree */}
                <div className="border rounded-lg p-2 max-h-[180px] overflow-y-auto bg-muted/30">
                  {/* Auto option */}
                  <button
                    onClick={() => setSelectedFolderId("auto")}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                      selectedFolderId === "auto"
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'hover:bg-muted text-foreground'
                    )}
                  >
                    <FolderOpen className="w-4 h-4 text-amber-500" />
                    <span className="flex-1">Bilder (automatisch)</span>
                    {selectedFolderId === "auto" && <Check className="w-4 h-4 text-indigo-600" />}
                  </button>
                  
                  <Separator className="my-1.5" />
                  
                  {/* Folder tree */}
                  {folders.filter(f => !f.parent_id).map(folder => (
                    <FolderTreeItem
                      key={folder.folder_id}
                      folder={folder}
                      folders={folders}
                      selectedId={selectedFolderId}
                      onSelect={setSelectedFolderId}
                      expandedIds={expandedFolderIds}
                      toggleExpand={toggleFolderExpand}
                    />
                  ))}
                  
                  {folders.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Keine Ordner vorhanden
                    </p>
                  )}
                </div>

                {showNewFolderInput && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Neuer Ordnername..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && createNewFolder()}
                      disabled={creatingFolder}
                    />
                    <Button
                      onClick={createNewFolder}
                      disabled={creatingFolder || !newFolderName.trim()}
                      size="sm"
                    >
                      {creatingFolder ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Erstellen"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            {results ? "Schließen" : "Abbrechen"}
          </Button>
          {!results && (
            <Button
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              className="bg-red-500 hover:bg-red-600"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Hochladen...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {files.length} Bild{files.length !== 1 ? 'er' : ''} hochladen
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultiImageUploadDialog;
