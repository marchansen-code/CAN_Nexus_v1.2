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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Folder, FileText, ArrowLeft, Check, File, Table2, HardDrive, Users } from "lucide-react";

const GoogleDriveImportDialog = ({ open, onOpenChange, onImport, targetFolderId }) => {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [sharedDrives, setSharedDrives] = useState([]);
  const [sharedDrivesLoading, setSharedDrivesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("my-drive");
  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [folderPath, setFolderPath] = useState([{ id: "root", name: "Meine Ablage" }]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab("my-drive");
      loadFiles("root");
      setFolderPath([{ id: "root", name: "Meine Ablage" }]);
      loadSharedDrives();
    }
  }, [open]);

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

  const loadFiles = async (folderId) => {
    setLoading(true);
    setSelectedFile(null);
    try {
      const response = await axios.get(`${API}/drive/files`, {
        params: { folder_id: folderId }
      });
      setFolders(response.data.folders || []);
      setFiles(response.data.files || []);
      setCurrentFolderId(folderId);
    } catch (error) {
      console.error("Failed to load Drive files:", error);
      toast.error("Fehler beim Laden der Google Drive Dateien");
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folder) => {
    setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
    loadFiles(folder.id);
  };

  const navigateBack = () => {
    if (folderPath.length > 1) {
      const newPath = folderPath.slice(0, -1);
      setFolderPath(newPath);
      loadFiles(newPath[newPath.length - 1].id);
    }
  };

  const navigateToPathItem = (index) => {
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    loadFiles(newPath[newPath.length - 1].id);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedFile(null);
    if (tab === "my-drive") {
      setFolderPath([{ id: "root", name: "Meine Ablage" }]);
      loadFiles("root");
    }
  };

  const handleSharedDriveClick = (drive) => {
    setFolderPath([{ id: drive.id, name: drive.name }]);
    loadFiles(drive.id);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    
    setImporting(true);
    try {
      const response = await axios.post(`${API}/drive/import/${selectedFile.id}`, null, {
        params: { folder_id: targetFolderId }
      });
      toast.success(response.data.message);
      onImport?.(response.data);
      onOpenChange(false);
    } catch (error) {
      console.error("Import failed:", error);
      toast.error(error.response?.data?.detail || "Import fehlgeschlagen");
    } finally {
      setImporting(false);
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes("spreadsheet") || mimeType?.includes("excel") || mimeType?.includes("csv")) {
      return <Table2 className="w-5 h-5 text-green-600" />;
    }
    if (mimeType?.includes("word") || mimeType?.includes("document")) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }
    if (mimeType?.includes("pdf")) {
      return <FileText className="w-5 h-5 text-red-600" />;
    }
    return <File className="w-5 h-5 text-slate-500" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderBreadcrumb = () => (
    <div className="flex items-center gap-1 text-sm text-slate-600 border-b pb-2 px-1">
      {folderPath.length > 1 && (
        <Button variant="ghost" size="sm" onClick={navigateBack} className="h-7 px-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
      )}
      {folderPath.map((item, index) => (
        <React.Fragment key={item.id}>
          {index > 0 && <span className="text-slate-400">/</span>}
          <button
            onClick={() => navigateToPathItem(index)}
            className="hover:text-slate-900 hover:underline truncate max-w-[150px]"
          >
            {item.name}
          </button>
        </React.Fragment>
      ))}
    </div>
  );

  const renderFileList = () => (
    <div className="space-y-1">
      {/* Folders */}
      {folders.map((folder) => (
        <div
          key={folder.id}
          onClick={() => navigateToFolder(folder)}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <Folder className="w-5 h-5 text-amber-500" />
          <span className="flex-1 font-medium truncate">{folder.name}</span>
        </div>
      ))}

      {/* Files */}
      {files.map((file) => (
        <div
          key={file.id}
          onClick={() => setSelectedFile(file)}
          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
            selectedFile?.id === file.id
              ? "bg-blue-50 border border-blue-200"
              : "hover:bg-slate-100"
          }`}
        >
          {getFileIcon(file.mimeType)}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{file.name}</p>
            <p className="text-xs text-slate-500">
              {file.isGoogleDoc && <span className="text-blue-600">Google Docs • </span>}
              {formatFileSize(file.size)}
            </p>
          </div>
          {selectedFile?.id === file.id && (
            <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
          )}
        </div>
      ))}

      {folders.length === 0 && files.length === 0 && !loading && (
        <div className="text-center py-12 text-slate-500">
          <p>Keine unterstützten Dateien in diesem Ordner</p>
          <p className="text-sm mt-1">Unterstützt: PDF, DOCX, TXT, CSV, XLSX</p>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
              <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
            </svg>
            Von Google Drive importieren
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-drive" className="gap-2">
              <HardDrive className="w-4 h-4" />
              Meine Ablage
            </TabsTrigger>
            <TabsTrigger value="shared-drives" className="gap-2">
              <Users className="w-4 h-4" />
              Geteilte Ablagen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-drive" className="mt-4">
            {renderBreadcrumb()}
            <ScrollArea className="h-[350px] mt-2">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : (
                renderFileList()
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="shared-drives" className="mt-4">
            {folderPath.length > 1 ? (
              <>
                {renderBreadcrumb()}
                <ScrollArea className="h-[350px] mt-2">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    renderFileList()
                  )}
                </ScrollArea>
              </>
            ) : (
              <ScrollArea className="h-[380px]">
                {sharedDrivesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  </div>
                ) : sharedDrives.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>Keine geteilten Ablagen verfügbar</p>
                    <p className="text-sm mt-1">Sie haben Zugriff auf keine geteilten Ablagen.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {sharedDrives.map((drive) => (
                      <div
                        key={drive.id}
                        onClick={() => handleSharedDriveClick(drive)}
                        className="flex items-center gap-3 p-4 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors border"
                      >
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
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
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || importing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importiere...
              </>
            ) : (
              "Importieren"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleDriveImportDialog;
