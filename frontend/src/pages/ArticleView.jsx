import React, { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { API, AuthContext } from "@/App";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Star,
  Clock,
  Tag,
  FolderTree,
  Calendar,
  Users,
  Eye,
  User,
  Download,
  FileText,
  FileDown,
  MessageSquare,
  Send,
  Trash2,
  Loader2,
  BarChart3,
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import GoogleDriveExportDialog from "@/components/dialogs/GoogleDriveExportDialog";

const StatusBadge = ({ status }) => {
  const styles = {
    draft: "bg-slate-100 text-slate-700 border-slate-300",
    review: "bg-amber-100 text-amber-700 border-amber-300",
    published: "bg-emerald-100 text-emerald-700 border-emerald-300"
  };
  
  const labels = {
    draft: "Entwurf",
    review: "Review",
    published: "Veröffentlicht"
  };

  return (
    <Badge variant="outline" className={`${styles[status]} border`}>
      {labels[status]}
    </Badge>
  );
};

const ArticleView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [article, setArticle] = useState(null);
  const [category, setCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [author, setAuthor] = useState(null);
  const [contactPerson, setContactPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeEditors, setActiveEditors] = useState([]);
  
  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleteCommentDialog, setDeleteCommentDialog] = useState({ open: false, commentId: null });
  
  // Analytics state
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  // Version history state
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  
  // Google Drive export state
  const [driveExportOpen, setDriveExportOpen] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  
  // Document preview state
  const [documentPreview, setDocumentPreview] = useState(null);

  const canEdit = user?.role === "admin" || user?.role === "editor";
  const isAdmin = user?.role === "admin";
  const isAuthor = article?.created_by === user?.user_id;
  const canViewAnalytics = isAdmin || isAuthor;

  // Handle clicks on document links in article content
  const handleContentClick = useCallback((event) => {
    const link = event.target.closest('a[data-document-id]');
    if (link) {
      event.preventDefault();
      const documentId = link.getAttribute('data-document-id');
      if (documentId) {
        axios.get(`${API}/documents/${documentId}`)
          .then(res => setDocumentPreview(res.data))
          .catch(err => console.error('Failed to load document:', err));
      }
    }
    // Handle internal doc-preview links
    const href = event.target.closest('a')?.getAttribute('href');
    if (href && href.startsWith('#doc-preview-')) {
      event.preventDefault();
      const documentId = href.replace('#doc-preview-', '');
      if (documentId) {
        axios.get(`${API}/documents/${documentId}`)
          .then(res => setDocumentPreview(res.data))
          .catch(err => console.error('Failed to load document:', err));
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Check Google Drive status
    axios.get(`${API}/drive/status`)
      .then(res => setDriveConnected(res.data.connected))
      .catch(() => {});
  }, [id]);

  const fetchData = async () => {
    try {
      const [articleRes, categoriesRes, usersRes] = await Promise.all([
        axios.get(`${API}/articles/${id}`),
        axios.get(`${API}/categories`),
        axios.get(`${API}/users`)
      ]);

      setArticle(articleRes.data);
      setCategories(categoriesRes.data);
      setIsFavorite(articleRes.data.favorited_by?.includes(user?.user_id));
      
      // Find category
      if (articleRes.data.category_id) {
        const cat = categoriesRes.data.find(c => c.category_id === articleRes.data.category_id);
        setCategory(cat);
      }

      // Find author
      const articleAuthor = usersRes.data.find(u => u.user_id === articleRes.data.created_by);
      setAuthor(articleAuthor);

      // Find contact person
      if (articleRes.data.contact_person_id) {
        const contact = usersRes.data.find(u => u.user_id === articleRes.data.contact_person_id);
        setContactPerson(contact);
      }

      // Mark as viewed
      axios.post(`${API}/articles/${id}/viewed`).catch(() => {});

      // Get active editors
      try {
        const presenceRes = await axios.post(`${API}/articles/${id}/presence`);
        setActiveEditors(presenceRes.data.active_editors || []);
      } catch (e) {
        console.error("Presence error:", e);
      }
      
      // Load comments
      fetchComments();
      
      // Load version history
      fetchVersions();
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Artikel konnte nicht geladen werden");
      navigate("/articles");
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    setVersionsLoading(true);
    try {
      const response = await axios.get(`${API}/versions/articles/${id}`);
      setVersions(response.data || []);
    } catch (error) {
      console.error("Failed to fetch versions:", error);
    } finally {
      setVersionsLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await axios.get(`${API}/articles/${id}/comments`);
      setComments(response.data.comments || []);
      setCommentsEnabled(response.data.comments_enabled !== false);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setSubmittingComment(true);
    try {
      await axios.post(`${API}/articles/${id}/comments`, { content: newComment });
      setNewComment("");
      fetchComments();
      toast.success("Kommentar hinzugefügt");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Fehler beim Erstellen des Kommentars");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async () => {
    const { commentId } = deleteCommentDialog;
    try {
      await axios.delete(`${API}/articles/${id}/comments/${commentId}`);
      fetchComments();
      toast.success("Kommentar gelöscht");
    } catch (error) {
      toast.error("Fehler beim Löschen des Kommentars");
    } finally {
      setDeleteCommentDialog({ open: false, commentId: null });
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const response = await axios.get(`${API}/articles/${id}/analytics`);
      setAnalytics(response.data);
    } catch (error) {
      toast.error("Fehler beim Laden der Statistiken");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleOpenAnalytics = () => {
    setAnalyticsOpen(true);
    fetchAnalytics();
  };

  const handleToggleFavorite = async () => {
    try {
      const response = await axios.post(`${API}/articles/${id}/favorite`);
      setIsFavorite(response.data.favorited);
      toast.success(response.data.message);
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      toast.error("Fehler beim Aktualisieren der Favoriten");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getInitials = (name) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  };

  const handleExport = async (format) => {
    try {
      const response = await axios.get(`${API}/articles/${id}/export/${format}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const safeTitle = article.title.replace(/[^a-zA-Z0-9äöüÄÖÜß\s-_]/g, '').trim().slice(0, 50);
      const extension = format === 'pdf' ? 'pdf' : 'docx';
      link.setAttribute('download', `${safeTitle}.${extension}`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Artikel als ${format.toUpperCase()} exportiert`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export fehlgeschlagen");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <div className="animate-fadeIn" data-testid="article-view">
      {/* Navigation Bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <Button variant="ghost" onClick={() => navigate("/articles")} data-testid="back-btn">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zu Artikeln
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleFavorite}
            className={isFavorite ? "text-amber-600 border-amber-300 bg-amber-50" : ""}
            data-testid="favorite-btn"
          >
            <Star className={`w-4 h-4 mr-1.5 ${isFavorite ? "fill-amber-500" : ""}`} />
            {isFavorite ? "Favorit" : "Favorisieren"}
          </Button>
          
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="export-dropdown">
                <Download className="w-4 h-4 mr-1.5" />
                Exportieren
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('pdf')} data-testid="export-pdf-btn">
                <FileDown className="w-4 h-4 mr-2 text-red-500" />
                Als PDF exportieren
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('docx')} data-testid="export-docx-btn">
                <FileText className="w-4 h-4 mr-2 text-blue-500" />
                Als Word exportieren
              </DropdownMenuItem>
              {driveConnected && (
                <>
                  <div className="h-px bg-slate-200 my-1" />
                  <DropdownMenuItem onClick={() => setDriveExportOpen(true)} data-testid="export-drive-btn">
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
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Analytics Button - only for author and admin */}
          {canViewAnalytics && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOpenAnalytics}
              data-testid="analytics-btn"
            >
              <BarChart3 className="w-4 h-4 mr-1.5" />
              Statistiken
            </Button>
          )}
          
          {canEdit && (
            <Button 
              onClick={() => navigate(`/articles/${id}/edit`)} 
              className="bg-primary hover:bg-primary/90"
              data-testid="edit-btn"
            >
              <Edit className="w-4 h-4 mr-1.5" />
              Bearbeiten
            </Button>
          )}
        </div>
      </div>

      {/* Active Editors Warning */}
      {activeEditors.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg mb-6">
          <Users className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-700">
            Wird gerade von {activeEditors.map(e => e.name).join(', ')} bearbeitet.
          </span>
        </div>
      )}

      {/* Article Content - Full Width */}
      <article className="max-w-none">
        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <StatusBadge status={article.status} />
          {category && (
            <Badge variant="outline" className="gap-1 bg-slate-50">
              <FolderTree className="w-3 h-3" />
              {category.name}
            </Badge>
          )}
          {article.view_count > 0 && (
            <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
              <Eye className="w-3 h-3" />
              {article.view_count} Aufrufe
            </Badge>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-canusa-dark-blue mb-4">
          {article.title}
        </h1>

        {/* Author & Date Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>Erstellt: {formatDate(article.created_at)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>Aktualisiert: {formatDate(article.updated_at)}</span>
          </div>
        </div>

        {/* Tags */}
        {article.tags?.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Tag className="w-4 h-4 text-muted-foreground" />
            {article.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <Separator className="my-6" />

        {/* Article Content */}
        <div 
          className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-p:leading-7 prose-p:my-3 prose-a:text-red-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-md prose-table:border-collapse prose-td:border prose-td:border-slate-300 prose-td:p-3 prose-th:border prose-th:border-slate-300 prose-th:p-3 prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-blockquote:border-l-4 prose-blockquote:border-red-500 prose-blockquote:bg-slate-50 dark:prose-blockquote:bg-slate-900 prose-blockquote:py-1 prose-blockquote:px-4 prose-ul:my-3 prose-ol:my-3 prose-li:my-1"
          dangerouslySetInnerHTML={{ __html: article.content }}
          onClick={handleContentClick}
          data-testid="article-content"
        />

        {/* Review Date */}
        {article.review_date && (
          <div className="mt-8 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">Wiedervorlage</p>
              <p className="text-sm text-amber-700">
                Überprüfung am {formatDate(article.review_date)} vorgemerkt.
              </p>
            </div>
          </div>
        )}

        <Separator className="my-8" />

        {/* Author & Contact Person Section */}
        <div className="bg-muted/50 rounded-lg p-6">
          <div className="flex flex-wrap gap-8">
            {/* Author */}
            {author && (
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={author.picture} alt={author.name} />
                  <AvatarFallback className="bg-red-100 text-red-700">
                    {getInitials(author.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Verfasst von</p>
                  <p className="font-medium">{author.name}</p>
                  <p className="text-sm text-muted-foreground">{author.email}</p>
                </div>
              </div>
            )}

            {/* Contact Person */}
            {contactPerson && (
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={contactPerson.picture} alt={contactPerson.name} />
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {getInitials(contactPerson.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Ansprechpartner</p>
                  <p className="font-medium">{contactPerson.name}</p>
                  <p className="text-sm text-muted-foreground">{contactPerson.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        {article.status === "published" && (
          <div className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <MessageSquare className="w-6 h-6" />
              Kommentare
              {comments.length > 0 && (
                <Badge variant="secondary" className="ml-2">{comments.length}</Badge>
              )}
            </h2>
            
            {commentsEnabled ? (
              <>
                {/* Comment Form */}
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <form onSubmit={handleSubmitComment}>
                      <Textarea
                        placeholder="Schreiben Sie einen Kommentar..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="mb-3 min-h-[100px]"
                        data-testid="comment-input"
                      />
                      <div className="flex justify-end">
                        <Button 
                          type="submit" 
                          disabled={submittingComment || !newComment.trim()}
                          data-testid="submit-comment-btn"
                        >
                          {submittingComment ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          Kommentar absenden
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Comments List */}
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Noch keine Kommentare vorhanden.</p>
                    <p className="text-sm">Seien Sie der Erste, der diesen Artikel kommentiert!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <Card key={comment.comment_id} className="group" data-testid="comment-card">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex gap-3 flex-1">
                              <Avatar className="w-10 h-10 shrink-0">
                                <AvatarFallback className="bg-slate-100 text-slate-700 text-sm">
                                  {comment.author_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{comment.author_name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(comment.created_at).toLocaleDateString("de-DE", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                              </div>
                            </div>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                                onClick={() => setDeleteCommentDialog({ open: true, commentId: comment.comment_id })}
                                data-testid="delete-comment-btn"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-lg">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Kommentare sind für diesen Artikel deaktiviert.</p>
              </div>
            )}
          </div>
        )}

        {/* Version History */}
        {versions.length > 0 && (
          <div className="mt-12 border-t pt-8" data-testid="version-history-section">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Änderungshistorie</h3>
            </div>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-200 dark:bg-slate-700" />
              
              <div className="space-y-4">
                {versions.map((version, index) => (
                  <div 
                    key={version.version_id} 
                    className="flex gap-4 relative"
                    data-testid={`version-entry-${version.version_number}`}
                  >
                    {/* Timeline dot */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                      index === 0 
                        ? 'bg-indigo-500 text-white' 
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}>
                      <span className="text-xs font-medium">{version.version_number}</span>
                    </div>
                    
                    {/* Version info */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {new Date(version.created_at).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          um {new Date(version.created_at).toLocaleTimeString('de-DE', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })} Uhr
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {version.created_by_name}
                        </span>
                        {version.change_summary && (
                          <Badge variant="outline" className="text-xs">
                            {version.change_summary}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </article>

      {/* Delete Comment Dialog */}
      <AlertDialog open={deleteCommentDialog.open} onOpenChange={(open) => !open && setDeleteCommentDialog({ open: false, commentId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kommentar löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Kommentar wird unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteComment} className="bg-red-500 hover:bg-red-600">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Analytics Dialog */}
      <Dialog open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-red-500" />
              Artikel-Statistiken
            </DialogTitle>
          </DialogHeader>
          
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              {/* Title and Status */}
              <div>
                <h3 className="font-semibold text-lg line-clamp-2">{analytics.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Von {analytics.author_name} • {analytics.created_at && new Date(analytics.created_at).toLocaleDateString('de-DE')}
                </p>
              </div>

              {/* Main Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-2">
                  <CardContent className="pt-4 text-center">
                    <Eye className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-bold">{analytics.metrics.view_count}</p>
                    <p className="text-xs text-muted-foreground">Aufrufe</p>
                  </CardContent>
                </Card>
                <Card className="border-2">
                  <CardContent className="pt-4 text-center">
                    <Heart className="w-6 h-6 mx-auto mb-2 text-red-500" />
                    <p className="text-2xl font-bold">{analytics.metrics.favorites_count}</p>
                    <p className="text-xs text-muted-foreground">Favoriten</p>
                  </CardContent>
                </Card>
                <Card className="border-2">
                  <CardContent className="pt-4 text-center">
                    <MessageSquare className="w-6 h-6 mx-auto mb-2 text-green-500" />
                    <p className="text-2xl font-bold">{analytics.metrics.comments_count}</p>
                    <p className="text-xs text-muted-foreground">Kommentare</p>
                  </CardContent>
                </Card>
              </div>

              {/* Engagement Score */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Engagement-Score</span>
                  <span className="text-sm font-bold">{analytics.metrics.engagement_score}/100</span>
                </div>
                <Progress 
                  value={analytics.metrics.engagement_score} 
                  className="h-3"
                />
                <p className="text-xs text-muted-foreground">
                  Berechnet aus Aufrufen, Favoriten und Kommentaren
                </p>
              </div>

              {/* Comparison with Average */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3">Vergleich mit Durchschnitt</h4>
                <div className="flex items-center gap-3">
                  {analytics.comparison.trend === "above_average" ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <TrendingUp className="w-5 h-5" />
                      <span className="font-medium">Überdurchschnittlich</span>
                    </div>
                  ) : analytics.comparison.trend === "below_average" ? (
                    <div className="flex items-center gap-2 text-amber-600">
                      <TrendingDown className="w-5 h-5" />
                      <span className="font-medium">Unterdurchschnittlich</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Minus className="w-5 h-5" />
                      <span className="font-medium">Durchschnittlich</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Ø {analytics.comparison.average_views} Aufrufe • Dieser Artikel: {analytics.comparison.percentile}% des Durchschnitts
                </p>
              </div>

              {/* Tags and Categories */}
              {(analytics.tags?.length > 0 || analytics.categories?.length > 0) && (
                <div className="space-y-2">
                  {analytics.categories?.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <FolderTree className="w-4 h-4 text-muted-foreground" />
                      {analytics.categories.map((cat, i) => (
                        <Badge key={i} variant="outline">{cat}</Badge>
                      ))}
                    </div>
                  )}
                  {analytics.tags?.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      {analytics.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Keine Statistiken verfügbar
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Google Drive Export Dialog */}
      <GoogleDriveExportDialog
        open={driveExportOpen}
        onOpenChange={setDriveExportOpen}
        articleId={article?.article_id}
        articleTitle={article?.title}
      />

      {/* Document Preview Dialog */}
      <Dialog open={!!documentPreview} onOpenChange={(open) => !open && setDocumentPreview(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {documentPreview?.filename || documentPreview?.title || 'Dokumentenvorschau'}
            </DialogTitle>
            <DialogDescription>
              {documentPreview?.file_size && (
                <span>{(documentPreview.file_size / 1024).toFixed(1)} KB</span>
              )}
              {documentPreview?.created_at && (
                <span className="ml-4">Hochgeladen: {new Date(documentPreview.created_at).toLocaleDateString('de-DE')}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 overflow-auto">
            {documentPreview && (
              documentPreview.is_image && documentPreview.image_id ? (
                // Image preview
                <div className="flex items-center justify-center p-4">
                  <img 
                    src={`${API}/images/${documentPreview.image_id}`} 
                    alt={documentPreview.filename}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  />
                </div>
              ) : documentPreview.file_type === '.pdf' ? (
                // PDF preview via iframe with inline endpoint
                <div className="h-[60vh]">
                  <iframe
                    src={`${API}/documents/${documentPreview.document_id}/preview`}
                    className="w-full h-full border-0 rounded-lg"
                    title={documentPreview.filename}
                  />
                </div>
              ) : documentPreview.html_content ? (
                // DOCX, XLSX, CSV etc. - show HTML content
                <div className="p-4 prose prose-slate dark:prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: documentPreview.html_content }} />
                </div>
              ) : documentPreview.extracted_text ? (
                // Fallback: show extracted text
                <div className="p-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono bg-slate-50 dark:bg-slate-900 p-4 rounded-lg overflow-auto max-h-[60vh]">
                    {documentPreview.extracted_text}
                  </pre>
                </div>
              ) : (
                // No preview available
                <div className="flex flex-col items-center justify-center h-[40vh] text-muted-foreground">
                  <FileText className="w-16 h-16 mb-4 opacity-30" />
                  <p>Keine Vorschau verfügbar</p>
                  <p className="text-sm">Klicken Sie unten, um die Datei zu öffnen</p>
                </div>
              )
            )}
          </div>
          
          <DialogFooter className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                const url = documentPreview.image_id 
                  ? `${API}/images/${documentPreview.image_id}`
                  : `${API}/documents/${documentPreview.document_id}/file`;
                window.open(url, '_blank');
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              In neuem Tab öffnen
            </Button>
            <Button onClick={() => setDocumentPreview(null)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArticleView;
