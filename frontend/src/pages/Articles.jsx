import React, { useState, useEffect, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  Plus,
  Search,
  FileText,
  Clock,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  FolderTree,
  TrendingUp,
  Folder,
  FolderOpen,
  ArrowUpDown,
  MoveRight,
  GripVertical,
  Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { cn } from "@/lib/utils";

const StatusBadge = ({ status }) => {
  const styles = {
    draft: "status-draft",
    review: "status-review",
    published: "status-published"
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

// Droppable Category Component for Drag & Drop
const DroppableCategoryItem = ({ category, categories, selectedCategoryId, onSelect, expandedCategories, toggleExpand }) => {
  const childCategories = categories.filter(c => c.parent_id === category.category_id);
  const hasChildren = childCategories.length > 0;
  const isExpanded = expandedCategories.has(category.category_id);
  const isSelected = selectedCategoryId === category.category_id;

  const { setNodeRef, isOver } = useDroppable({
    id: `category-${category.category_id}`,
    data: { type: 'category', categoryId: category.category_id }
  });

  return (
    <div ref={setNodeRef}>
      <button
        onClick={() => {
          onSelect(category.category_id);
          if (hasChildren) toggleExpand(category.category_id);
        }}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left",
          isSelected 
            ? 'bg-primary/10 text-primary font-medium' 
            : 'hover:bg-muted text-foreground',
          isOver && 'bg-indigo-100 dark:bg-indigo-800/30 ring-2 ring-indigo-500'
        )}
      >
        {hasChildren ? (
          isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />
        ) : (
          <span className="w-4" />
        )}
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 shrink-0 text-amber-500" />
        ) : (
          <Folder className="w-4 h-4 shrink-0 text-amber-500" />
        )}
        <span className="truncate flex-1">{category.name}</span>
      </button>
      
      {isExpanded && hasChildren && (
        <div className="ml-4 mt-1 border-l border-slate-200 pl-2">
          {childCategories.map(child => (
            <DroppableCategoryItem
              key={child.category_id}
              category={child}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelect}
              expandedCategories={expandedCategories}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Draggable Article Component
const DraggableArticle = ({ article, children }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `article-${article.article_id}`,
    data: { type: 'article', article }
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

// Move Dialog Category Tree Item
const MoveCategoryItem = ({ category, categories, selectedCategoryId, onSelect, expandedCategories, toggleExpand, level = 0 }) => {
  const childCategories = categories.filter(c => c.parent_id === category.category_id);
  const hasChildren = childCategories.length > 0;
  const isExpanded = expandedCategories.has(category.category_id);
  const isSelected = selectedCategoryId === category.category_id;

  return (
    <div style={{ marginLeft: level > 0 ? `${level * 16}px` : 0 }}>
      <button
        onClick={() => {
          onSelect(category.category_id);
          if (hasChildren && !isExpanded) toggleExpand(category.category_id);
        }}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left",
          isSelected 
            ? 'bg-indigo-50 text-indigo-700 font-medium' 
            : 'hover:bg-muted text-foreground'
        )}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); toggleExpand(category.category_id); }}
            className="p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 shrink-0 text-amber-500" />
        ) : (
          <Folder className="w-4 h-4 shrink-0 text-amber-500" />
        )}
        <span className="truncate flex-1">{category.name}</span>
        {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
      </button>
      
      {isExpanded && hasChildren && (
        <div className="mt-1 border-l border-slate-200 ml-2 pl-1">
          {childCategories.map(child => (
            <MoveCategoryItem
              key={child.category_id}
              category={child}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelect}
              expandedCategories={expandedCategories}
              toggleExpand={toggleExpand}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Articles = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [topArticles, setTopArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [deleteDialog, setDeleteDialog] = useState({ open: false, article: null });
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortOrder, setSortOrder] = useState("desc");
  
  // Move article dialog state
  const [moveDialog, setMoveDialog] = useState({ open: false, article: null });
  const [moveTargetCategoryId, setMoveTargetCategoryId] = useState(null);
  const [movingArticle, setMovingArticle] = useState(false);
  const [moveExpandedCategories, setMoveExpandedCategories] = useState(new Set());
  
  // Drag & Drop state
  const [activeDragItem, setActiveDragItem] = useState(null);
  const [pendingDrop, setPendingDrop] = useState(null);
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

  const canEdit = user?.role === "admin" || user?.role === "editor";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [articlesRes, categoriesRes, topRes] = await Promise.all([
        axios.get(`${API}/articles`),
        axios.get(`${API}/categories`),
        axios.get(`${API}/articles/top-viewed?limit=10`)
      ]);
      setArticles(articlesRes.data);
      setCategories(categoriesRes.data);
      setTopArticles(topRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Daten konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.article) return;
    
    try {
      await axios.delete(`${API}/articles/${deleteDialog.article.article_id}`);
      toast.success("Artikel gelöscht");
      setArticles(articles.filter(a => a.article_id !== deleteDialog.article.article_id));
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Artikel konnte nicht gelöscht werden");
    } finally {
      setDeleteDialog({ open: false, article: null });
    }
  };

  // Move article to category
  const handleMoveArticle = async (articleId, categoryId) => {
    setMovingArticle(true);
    try {
      await axios.put(`${API}/articles/${articleId}`, {
        category_ids: categoryId ? [categoryId] : []
      });
      toast.success("Artikel verschoben");
      fetchData();
      setMoveDialog({ open: false, article: null });
      setMoveTargetCategoryId(null);
    } catch (error) {
      console.error("Failed to move article:", error);
      toast.error("Artikel konnte nicht verschoben werden");
    } finally {
      setMovingArticle(false);
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (event) => {
    const { active } = event;
    if (active.data.current?.type === 'article') {
      setActiveDragItem(active.data.current.article);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over || !canEdit) {
      setActiveDragItem(null);
      return;
    }
    
    // Check if we dropped on a category
    if (over.data.current?.type === 'category') {
      const targetCategoryId = over.data.current.categoryId;
      const targetCategory = categories.find(c => c.category_id === targetCategoryId);
      const targetCategoryName = targetCategory?.name || "Root-Kategorie";
      
      // If dragging an article
      if (active.data.current?.type === 'article') {
        const article = active.data.current.article;
        const currentCategoryIds = article.category_ids || (article.category_id ? [article.category_id] : []);
        
        // Don't move if already in this category
        if (currentCategoryIds.includes(targetCategoryId)) {
          setActiveDragItem(null);
          return;
        }
        
        // Show confirmation dialog
        setPendingDrop({
          article,
          articleTitle: article.title,
          targetCategoryId,
          targetCategoryName
        });
        setConfirmDropDialog(true);
      }
    }
    
    setActiveDragItem(null);
  };

  const handleDragCancel = () => {
    setActiveDragItem(null);
  };

  // Confirm and execute the drop
  const confirmDrop = async () => {
    if (!pendingDrop) return;
    
    const { article, targetCategoryId } = pendingDrop;
    await handleMoveArticle(article.article_id, targetCategoryId);
    setPendingDrop(null);
    setConfirmDropDialog(false);
  };

  const cancelDrop = () => {
    setPendingDrop(null);
    setConfirmDropDialog(false);
  };

  const toggleMoveExpand = (categoryId) => {
    const newExpanded = new Set(moveExpandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setMoveExpandedCategories(newExpanded);
  };

  const toggleExpand = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Get filtered articles based on selection
  const filteredArticles = articles.filter(article => {
    const matchesSearch = !searchTerm || 
      article.title.toLowerCase().includes(searchTerm.toLowerCase());
    // Support both old category_id and new category_ids
    const articleCategoryIds = article.category_ids || (article.category_id ? [article.category_id] : []);
    const matchesCategory = !selectedCategoryId || 
      articleCategoryIds.includes(selectedCategoryId);
    return matchesSearch && matchesCategory;
  });

  // Sort articles
  const sortedArticles = React.useMemo(() => {
    const sorted = [...filteredArticles].sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "title":
          aVal = (a.title || "").toLowerCase();
          bVal = (b.title || "").toLowerCase();
          return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case "view_count":
          aVal = a.view_count || 0;
          bVal = b.view_count || 0;
          return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
        case "created_at":
          aVal = new Date(a.created_at || 0);
          bVal = new Date(b.created_at || 0);
          return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
        case "updated_at":
        default:
          aVal = new Date(a.updated_at || a.created_at || 0);
          bVal = new Date(b.updated_at || b.created_at || 0);
          return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
    });
    return sorted;
  }, [filteredArticles, sortBy, sortOrder]);

  // Get subcategories for selected category
  const childCategories = selectedCategoryId 
    ? categories.filter(c => c.parent_id === selectedCategoryId)
    : [];

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.category_id === categoryId);
    return category?.name || "Ohne Kategorie";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const rootCategories = categories.filter(c => !c.parent_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
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
    <div className="space-y-4 animate-fadeIn h-full max-w-full overflow-hidden" data-testid="articles-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wissensartikel</h1>
          <p className="text-muted-foreground mt-1">Verwalten Sie Ihre Wissensbasis</p>
        </div>
        {canEdit && (
          <Button 
            onClick={() => navigate("/articles/new")} 
            className="bg-primary hover:bg-primary/90"
            data-testid="create-article-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Neuer Artikel
          </Button>
        )}
      </div>

      {/* Split Layout */}
      <div className="flex gap-6 h-[calc(100vh-14rem)]">
        {/* Left: Categories Tree */}
        <Card className="w-72 shrink-0 flex flex-col">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-amber-500" />
              Kategorien
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  selectedCategoryId === null 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <FileText className="w-4 h-4" />
                Alle Artikel
              </button>
              <Separator className="my-2" />
              {rootCategories.map(cat => (
                <DroppableCategoryItem
                  key={cat.category_id}
                  category={cat}
                  categories={categories}
                  selectedCategoryId={selectedCategoryId}
                  onSelect={setSelectedCategoryId}
                  expandedCategories={expandedCategories}
                  toggleExpand={toggleExpand}
                />
              ))}
              {rootCategories.length === 0 && (
                <p className="text-sm text-muted-foreground px-3">Keine Kategorien</p>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Right: Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search and Sort */}
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Artikel suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-articles-input"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Sortieren:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at">Aktualisiert</SelectItem>
                  <SelectItem value="created_at">Erstellt</SelectItem>
                  <SelectItem value="title">Titel</SelectItem>
                  <SelectItem value="view_count">Aufrufe</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="h-9 px-2"
              >
                {sortOrder === "asc" ? "↑ Aufst." : "↓ Abst."}
              </Button>
            </div>
          </div>

          {/* Current Location */}
          {selectedCategoryId && (
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <button 
                  onClick={() => setSelectedCategoryId(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Alle
                </button>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{getCategoryName(selectedCategoryId)}</span>
              </div>
              {canEdit && (
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/articles/new?category=${selectedCategoryId}`)}
                  className="text-xs"
                  data-testid="create-article-in-category-btn"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Neuer Artikel hier
                </Button>
              )}
            </div>
          )}

          {/* Subcategories (if any) */}
          {childCategories.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {childCategories.map(cat => (
                <button
                  key={cat.category_id}
                  onClick={() => setSelectedCategoryId(cat.category_id)}
                  className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-sm"
                >
                  <Folder className="w-4 h-4 text-amber-500" />
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Articles List */}
          <ScrollArea className="flex-1">
            {sortedArticles.length > 0 ? (
              <div className="space-y-3 pr-2">
                {sortedArticles.map((article) => (
                  <DraggableArticle key={article.article_id} article={article}>
                  <Card
                    className="hover:shadow-md transition-all duration-200"
                    data-testid={`article-card-${article.article_id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        {canEdit && (
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />
                        )}
                        <div 
                          className="flex-1 cursor-pointer min-w-0"
                          onClick={() => navigate(`/articles/${article.article_id}`)}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                            <h3 className="font-semibold truncate">{article.title}</h3>
                            <StatusBadge status={article.status} />
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(article.updated_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {article.view_count || 0}
                            </span>
                            {!selectedCategoryId && article.category_id && (
                              <span className="truncate max-w-[150px]">{getCategoryName(article.category_id)}</span>
                            )}
                          </div>
                        </div>
                        {canEdit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`article-menu-${article.article_id}`}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/articles/${article.article_id}`)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Anzeigen
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/articles/${article.article_id}/edit`)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Bearbeiten
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setMoveDialog({ open: true, article });
                                setMoveTargetCategoryId(article.category_id || null);
                              }}>
                                <MoveRight className="w-4 h-4 mr-2" />
                                Verschieben
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => setDeleteDialog({ open: true, article })}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Löschen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  </DraggableArticle>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Keine Artikel gefunden</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm || selectedCategoryId
                      ? "Versuchen Sie andere Suchkriterien"
                      : "Erstellen Sie Ihren ersten Wissensartikel"}
                  </p>
                  {canEdit && (
                    <Button onClick={() => navigate("/articles/new")}>
                      <Plus className="w-4 h-4 mr-2" />
                      Artikel erstellen
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, article: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Artikel löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Artikel "{deleteDialog.article?.title}" wirklich löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move Article Dialog */}
      <Dialog open={moveDialog.open} onOpenChange={(open) => !open && setMoveDialog({ open: false, article: null })}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MoveRight className="w-5 h-5" />
              Artikel verschieben
            </DialogTitle>
            <DialogDescription>
              Wählen Sie die Zielkategorie für "{moveDialog.article?.title}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="border rounded-lg p-3 max-h-[300px] overflow-y-auto">
            {/* Option for no category */}
            <button
              onClick={() => setMoveTargetCategoryId(null)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left mb-1",
                moveTargetCategoryId === null
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'hover:bg-muted text-foreground'
              )}
            >
              {moveTargetCategoryId === null && <Check className="w-4 h-4" />}
              <span className={moveTargetCategoryId !== null ? "ml-6" : ""}>Keine (Root-Kategorie)</span>
            </button>
            
            <Separator className="my-2" />
            
            {/* Category tree for move dialog */}
            {rootCategories.map(cat => (
              <MoveCategoryItem
                key={cat.category_id}
                category={cat}
                categories={categories}
                selectedCategoryId={moveTargetCategoryId}
                onSelect={setMoveTargetCategoryId}
                expandedCategories={moveExpandedCategories}
                toggleExpand={toggleMoveExpand}
              />
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialog({ open: false, article: null })}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => handleMoveArticle(moveDialog.article?.article_id, moveTargetCategoryId)}
              disabled={movingArticle}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {movingArticle ? "Verschiebe..." : "Verschieben"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drag & Drop Confirmation Dialog */}
      <AlertDialog open={confirmDropDialog} onOpenChange={(open) => !open && cancelDrop()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MoveRight className="w-5 h-5 text-indigo-500" />
              Verschieben bestätigen
            </AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie <strong>"{pendingDrop?.articleTitle}"</strong> wirklich nach{' '}
              <strong>"{pendingDrop?.targetCategoryName}"</strong> verschieben?
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
          <FileText className="w-5 h-5 text-indigo-500" />
          <span className="text-sm font-medium truncate max-w-[200px]">
            {activeDragItem.title}
          </span>
        </div>
      )}
    </DragOverlay>
    </DndContext>
  );
};

export default Articles;
