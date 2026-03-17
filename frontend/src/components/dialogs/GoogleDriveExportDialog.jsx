import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Folder, ChevronRight, ExternalLink, HardDrive, Users, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const GoogleDriveLogo = ({ className }) => (
  <svg className={className} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45-4.5-1.2z" fill="#2684fc"/>
    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
  </svg>
);

const GoogleDriveExportDialog = ({ open, onOpenChange, articleId, articleTitle }) => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("my-drive");
  const [format, setFormat] = useState("pdf");
  
  // My Drive state
  const [myFolders, setMyFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("root");
  const [expandedFolders, setExpandedFolders] = useState(new Set(["root"]));
  
  // Shared Drives state
  const [sharedDrives, setSharedDrives] = useState([]);
  const [sharedDrivesLoading, setSharedDrivesLoading] = useState(false);
  const [selectedSharedDrive, setSelectedSharedDrive] = useState(null);
  const [sharedDriveFolders, setSharedDriveFolders] = useState([]);

  useEffect(() => {
    if (open) {
      setActiveTab("my-drive");
      setSelectedFolder("root");
      setSelectedSharedDrive(null);
      setFormat("pdf");
      loadMyFolders();
      loadSharedDrives();
    }
  }, [open]);

  const loadMyFolders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/drive/folders`);
      setMyFolders(response.data.folders || []);
    } catch (error) {
      console.error("Failed to load Drive folders:", error);
      toast.error("Fehler beim Laden der Ordner");
    } finally {
      setLoading(false);
    }
  };

  const loadSharedDrives = async () => {
    setSharedDrivesLoading(true);
    try {
      const response = await axios.get(`${API}/drive/shared-drives`);
      setSharedDrives(response.data.drives || []);
    } catch (error) {
      console.error("Failed to load shared drives:", error);
    } finally {
      setSharedDrivesLoading(false);
    }
  };

  const loadSharedDriveFolders = async (driveId) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/drive/shared-drive-folders/${driveId}`);
      setSharedDriveFolders(response.data.folders || []);
    } catch (error) {
      console.error("Failed to load shared drive folders:", error);
      toast.error("Fehler beim Laden der Ordner");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "my-drive") {
      setSelectedSharedDrive(null);
    }
  };

  const handleSharedDriveClick = (drive) => {
    setSelectedSharedDrive(drive);
    setSelectedFolder(drive.id);
    loadSharedDriveFolders(drive.id);
  };

  const navigateBackToSharedDrives = () => {
    setSelectedSharedDrive(null);
    setSharedDriveFolders([]);
  };

  const buildFolderTree = (folders) => {
    const folderMap = new Map();
    const roots = [];

    folders.forEach(f => {
      folderMap.set(f.id, { ...f, children: [] });
    });

    folders.forEach(f => {
      const folder = folderMap.get(f.id);
      if (f.parent && folderMap.has(f.parent)) {
        folderMap.get(f.parent).children.push(folder);
      } else if (f.id === "root" || !f.parent || f.parent === selectedSharedDrive?.id) {
        roots.push(folder);
      }
    });

    const sortChildren = (node) => {
      if (node.children) {
        node.children.sort((a, b) => a.name.localeCompare(b.name));
        node.children.forEach(sortChildren);
      }
    };
    roots.forEach(sortChildren);

    return roots;
  };

  const toggleExpanded = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFolder = (folder, depth = 0) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolder === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-2 rounded cursor-pointer transition-colors",
            isSelected ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-100"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => setSelectedFolder(folder.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(folder.id);
              }}
              className="p-0.5 hover:bg-slate-200 rounded"
            >
              <ChevronRight
                className={cn(
                  "w-4 h-4 text-slate-500 transition-transform",
                  isExpanded && "rotate-90"
                )}
              />
            </button>
          ) : (
            <span className="w-5" />
          )}
          <Folder className={cn("w-4 h-4", isSelected ? "text-blue-600" : "text-amber-500")} />
          <span className={cn("text-sm truncate", isSelected && "font-medium text-blue-700")}>
            {folder.name}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {folder.children.map((child) => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await axios.post(
        `${API}/drive/export/article/${articleId}`,
        null,
        { params: { format, folder_id: selectedFolder } }
      );
      
      toast.success(
        <div>
          <p>{response.data.message}</p>
          {response.data.webViewLink && (
            <a
              href={response.data.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline text-sm mt-1"
            >
              <ExternalLink className="w-3 h-3" />
              In Google Drive öffnen
            </a>
          )}
        </div>
      );
      onOpenChange(false);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(error.response?.data?.detail || "Export fehlgeschlagen");
    } finally {
      setExporting(false);
    }
  };

  const myFolderTree = buildFolderTree(myFolders);
  const sharedFolderTree = buildFolderTree(sharedDriveFolders);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GoogleDriveLogo className="w-5 h-5 flex-shrink-0" />
            Nach Google Drive exportieren
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Article info */}
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">Artikel:</p>
            <p className="font-medium truncate">{articleTitle}</p>
          </div>

          {/* Format selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Format</Label>
            <RadioGroup value={format} onValueChange={setFormat} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="cursor-pointer">PDF</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="docx" id="docx" />
                <Label htmlFor="docx" className="cursor-pointer">Word (DOCX)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Tabs */}
          <div className="grid w-full grid-cols-2 gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => handleTabChange("my-drive")}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === "my-drive"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <HardDrive className="w-4 h-4" />
              Meine Ablage
            </button>
            <button
              onClick={() => handleTabChange("shared-drives")}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === "shared-drives"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="w-4 h-4" />
              Geteilte Ablagen
            </button>
          </div>

          {/* Folder selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Zielordner</Label>
            {activeTab === "my-drive" ? (
              <ScrollArea className="h-[200px] border rounded-lg p-2">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : (
                  myFolderTree.map((folder) => renderFolder(folder))
                )}
              </ScrollArea>
            ) : (
              <ScrollArea className="h-[200px] border rounded-lg">
                {selectedSharedDrive ? (
                  <div className="p-2">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                      <Button variant="ghost" size="sm" onClick={navigateBackToSharedDrives} className="h-7 px-2">
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-medium truncate">{selectedSharedDrive.name}</span>
                    </div>
                    
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                      </div>
                    ) : sharedFolderTree.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <p className="text-sm">Keine Unterordner vorhanden</p>
                        <p className="text-xs mt-1">Export in Stammverzeichnis möglich</p>
                      </div>
                    ) : (
                      sharedFolderTree.map((folder) => renderFolder(folder))
                    )}
                  </div>
                ) : sharedDrivesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : sharedDrives.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <Users className="w-12 h-12 mb-2 text-slate-300" />
                    <p>Keine geteilten Ablagen verfügbar</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {sharedDrives.map((drive) => (
                      <div
                        key={drive.id}
                        onClick={() => handleSharedDriveClick(drive)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors border"
                      >
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{drive.name}</p>
                          <p className="text-xs text-slate-500">Geteilte Ablage</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || !selectedFolder}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exportiere...
              </>
            ) : (
              <>
                <GoogleDriveLogo className="w-4 h-4 mr-2" />
                Exportieren
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleDriveExportDialog;
