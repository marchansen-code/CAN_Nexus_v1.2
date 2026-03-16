import React, { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, AuthContext } from "@/App";
import { 
  Search as SearchIcon, 
  FileText, 
  Clock, 
  Tag,
  Loader2,
  ArrowRight,
  FolderTree,
  Eye,
  X,
  Filter,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Check
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

// Debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Helper to strip HTML tags
const stripHtml = (html) => {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
};

const Search = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  
  // Tags
  const [allTags, setAllTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSearchOpen, setTagSearchOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  
  // Extended Filters
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [selectedAuthor, setSelectedAuthor] = useState("");
  const [isImportant, setIsImportant] = useState(null); // null, true, false
  const [selectedStatus, setSelectedStatus] = useState(""); // "", "published", "draft"
  const [allUsers, setAllUsers] = useState([]);
  const [authorSearchOpen, setAuthorSearchOpen] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  // Load all tags and users
  useEffect(() => {
    const loadData = async () => {
      try {
        const [tagsRes, usersRes] = await Promise.all([
          axios.get(`${API}/tags`),
          axios.get(`${API}/users`)
        ]);
        setAllTags(tagsRes.data.tags || []);
        setAllUsers(usersRes.data || []);
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };
    loadData();
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // Save search to recent
  const saveSearch = (searchQuery) => {
    if (!searchQuery.trim()) return;
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Count active filters
  const activeFilterCount = [
    selectedTags.length > 0,
    dateFrom !== null,
    dateTo !== null,
    selectedAuthor !== "",
    isImportant !== null,
    selectedStatus !== ""
  ].filter(Boolean).length;

  // Perform search
  const performSearch = useCallback(async (searchQuery, filters = {}) => {
    const { tags, author, important, status, from, to } = filters;
    
    const hasFilters = (tags && tags.length > 0) || author || important !== null || status || from || to;
    
    if (!searchQuery && !hasFilters) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    if (searchQuery && searchQuery.length < 2 && !hasFilters) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const response = await axios.post(`${API}/search`, {
        query: searchQuery || "",
        top_k: 30,
        tags: tags && tags.length > 0 ? tags : null,
        author_id: author || null,
        is_important: important,
        status: status || null,
        date_from: from ? from.toISOString() : null,
        date_to: to ? to.toISOString() : null
      });
      setResults(response.data.results || []);
      if (searchQuery) saveSearch(searchQuery);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search when filters change
  useEffect(() => {
    performSearch(debouncedQuery, {
      tags: selectedTags,
      author: selectedAuthor,
      important: isImportant,
      status: selectedStatus,
      from: dateFrom,
      to: dateTo
    });
  }, [debouncedQuery, selectedTags, selectedAuthor, isImportant, selectedStatus, dateFrom, dateTo, performSearch]);

  // Toggle tag selection
  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedTags([]);
    setDateFrom(null);
    setDateTo(null);
    setSelectedAuthor("");
    setIsImportant(null);
    setSelectedStatus("");
  };

  // Clear search
  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
  };

  // Navigate to article
  const handleArticleClick = async (articleId) => {
    try {
      await axios.post(`${API}/articles/${articleId}/viewed`);
    } catch (error) {
      console.error("Failed to mark as viewed:", error);
    }
    navigate(`/articles/${articleId}`);
  };

  // Highlight matching text
  const highlightMatch = (text, searchTerm) => {
    if (!searchTerm || !text) return text;
    const cleanText = stripHtml(text);
    const terms = searchTerm.toLowerCase().split(' ').filter(t => t.length > 1);
    if (terms.length === 0) return cleanText;
    
    const regex = new RegExp(`(${terms.join('|')})`, 'gi');
    const parts = cleanText.split(regex);
    
    return parts.map((part, i) => 
      terms.some(term => part.toLowerCase() === term) 
        ? <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark>
        : part
    );
  };

  // Get status badge
  const getStatusBadge = (status) => {
    if (status === 'published') {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Veröffentlicht</Badge>;
    }
    if (status === 'draft') {
      return <Badge variant="secondary">Entwurf</Badge>;
    }
    return null;
  };

  // Filter tags by search
  const filteredTags = tagSearchQuery 
    ? allTags.filter(tag => tag.toLowerCase().includes(tagSearchQuery.toLowerCase()))
    : allTags;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Wissenssuche</h1>
        <p className="text-muted-foreground">
          Durchsuchen Sie alle Artikel, Dokumente und Kategorien
        </p>
      </div>

      {/* Search Input */}
      <Card className="shadow-lg border-2 border-transparent focus-within:border-red-200 transition-colors">
        <CardContent className="p-4">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Suchbegriff eingeben... (z.B. Westkanada, Mietwagen, Hotels)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-12 pr-24 h-14 text-lg border-0 focus-visible:ring-0 bg-transparent"
              data-testid="search-input"
              autoFocus
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {query && (
                <Button variant="ghost" size="icon" onClick={clearSearch}>
                  <X className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant={showFilters ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={activeFilterCount > 0 ? "text-red-600" : ""}
                title="Erweiterte Filter"
              >
                <Filter className="w-4 h-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>
            {loading && (
              <Loader2 className="absolute right-24 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Extended Filters Panel */}
      {showFilters && (
        <Card className="border-dashed animate-in slide-in-from-top-2">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Erweiterte Filter
              </h3>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  Alle Filter zurücksetzen
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tags Dropdown with Search */}
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Tags
                </Label>
                <Popover open={tagSearchOpen} onOpenChange={setTagSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={tagSearchOpen}
                      className="w-full justify-between h-9 text-sm"
                    >
                      {selectedTags.length > 0 
                        ? `${selectedTags.length} Tag${selectedTags.length > 1 ? 's' : ''} ausgewählt`
                        : "Tags auswählen..."}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Tag suchen..." 
                        value={tagSearchQuery}
                        onValueChange={setTagSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>Kein Tag gefunden.</CommandEmpty>
                        <CommandGroup>
                          {filteredTags.map((tag) => (
                            <CommandItem
                              key={tag}
                              value={tag}
                              onSelect={() => toggleTag(tag)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedTags.includes(tag) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {tag}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Author Dropdown with Search */}
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Autor
                </Label>
                <Popover open={authorSearchOpen} onOpenChange={setAuthorSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={authorSearchOpen}
                      className="w-full justify-between h-9 text-sm"
                    >
                      {selectedAuthor 
                        ? allUsers.find(u => u.user_id === selectedAuthor)?.name || "Autor"
                        : "Autor auswählen..."}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Autor suchen..." />
                      <CommandList>
                        <CommandEmpty>Kein Autor gefunden.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value=""
                            onSelect={() => { setSelectedAuthor(""); setAuthorSearchOpen(false); }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", !selectedAuthor ? "opacity-100" : "opacity-0")} />
                            Alle Autoren
                          </CommandItem>
                          {allUsers.map((author) => (
                            <CommandItem
                              key={author.user_id}
                              value={author.name}
                              onSelect={() => { setSelectedAuthor(author.user_id); setAuthorSearchOpen(false); }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedAuthor === author.user_id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {author.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Status
                </Label>
                <Select value={selectedStatus || "all"} onValueChange={(v) => setSelectedStatus(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Status auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="published">Veröffentlicht</SelectItem>
                    <SelectItem value="draft">Entwurf</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Important Filter */}
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Wichtig-Markierung
                </Label>
                <Select 
                  value={isImportant === null ? "all" : isImportant.toString()} 
                  onValueChange={(v) => setIsImportant(v === "all" ? null : v === "true")}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Alle Artikel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Artikel</SelectItem>
                    <SelectItem value="true">Nur wichtige Artikel</SelectItem>
                    <SelectItem value="false">Nicht-wichtige Artikel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Erstellt ab
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9 text-sm",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd.MM.yyyy", { locale: de }) : "Datum wählen"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      locale={de}
                    />
                    {dateFrom && (
                      <div className="p-2 border-t">
                        <Button variant="ghost" size="sm" className="w-full" onClick={() => setDateFrom(null)}>
                          Datum löschen
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Erstellt bis
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9 text-sm",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd.MM.yyyy", { locale: de }) : "Datum wählen"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      locale={de}
                    />
                    {dateTo && (
                      <div className="p-2 border-t">
                        <Button variant="ghost" size="sm" className="w-full" onClick={() => setDateTo(null)}>
                          Datum löschen
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Selected Tags Display */}
            {selectedTags.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Ausgewählte Tags:</span>
                  {selectedTags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="default" 
                      className="bg-red-500 hover:bg-red-600 cursor-pointer text-xs"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Filters Summary (when filter panel is closed) */}
      {!showFilters && activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className="text-muted-foreground">Aktive Filter:</span>
          {selectedTags.length > 0 && (
            <Badge variant="outline" className="gap-1">
              <Tag className="w-3 h-3" />
              {selectedTags.length} Tag{selectedTags.length > 1 ? 's' : ''}
            </Badge>
          )}
          {selectedAuthor && (
            <Badge variant="outline" className="gap-1">
              <User className="w-3 h-3" />
              {allUsers.find(u => u.user_id === selectedAuthor)?.name}
            </Badge>
          )}
          {selectedStatus && (
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="w-3 h-3" />
              {selectedStatus === "published" ? "Veröffentlicht" : "Entwurf"}
            </Badge>
          )}
          {isImportant !== null && (
            <Badge variant="outline" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              {isImportant ? "Wichtig" : "Nicht wichtig"}
            </Badge>
          )}
          {(dateFrom || dateTo) && (
            <Badge variant="outline" className="gap-1">
              <Calendar className="w-3 h-3" />
              {dateFrom && format(dateFrom, "dd.MM.yy", { locale: de })}
              {dateFrom && dateTo && " - "}
              {dateTo && format(dateTo, "dd.MM.yy", { locale: de })}
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 px-2 text-xs">
            Alle löschen
          </Button>
        </div>
      )}

      {/* Recent Searches (when no query and no filters) */}
      {!query && activeFilterCount === 0 && recentSearches.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Letzte Suchen
          </h3>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => setQuery(search)}
                className="rounded-full"
              >
                {search}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {hasSearched && (
        <div className="space-y-4">
          {/* Result Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {results.length === 0 ? (
                "Keine Ergebnisse gefunden"
              ) : (
                <>{results.length} Artikel gefunden</>
              )}
            </p>
          </div>

          {/* Results List */}
          {results.length > 0 && (
            <div className="space-y-3">
              {results.map((result) => (
                <Card 
                  key={result.article_id}
                  className="group cursor-pointer hover:shadow-md hover:border-red-200 transition-all duration-200"
                  onClick={() => handleArticleClick(result.article_id)}
                  data-testid={`search-result-${result.article_id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Title */}
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-red-500 shrink-0" />
                          <h3 className="font-semibold text-lg group-hover:text-red-600 transition-colors truncate">
                            {highlightMatch(result.title, query)}
                          </h3>
                          {result.is_important && (
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" title="Wichtig" />
                          )}
                        </div>

                        {/* Snippet - HTML stripped */}
                        <p className="text-sm text-muted-foreground line-clamp-2 pl-8">
                          {highlightMatch(stripHtml(result.content_snippet), query)}
                        </p>

                        {/* Meta */}
                        <div className="flex items-center gap-3 pl-8 text-xs text-muted-foreground flex-wrap">
                          {result.category_name && (
                            <span className="flex items-center gap-1">
                              <FolderTree className="w-3 h-3" />
                              {result.category_name}
                            </span>
                          )}
                          {result.author_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {result.author_name}
                            </span>
                          )}
                          {result.created_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(result.created_at).toLocaleDateString('de-DE')}
                            </span>
                          )}
                          {result.view_count > 0 && (
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {result.view_count}
                            </span>
                          )}
                        </div>

                        {/* Tags */}
                        {result.tags && result.tags.length > 0 && (
                          <div className="flex items-center gap-2 pl-8 flex-wrap">
                            <Tag className="w-3 h-3 text-muted-foreground" />
                            {result.tags.slice(0, 5).map((tag) => (
                              <Badge 
                                key={tag} 
                                variant="outline" 
                                className={`text-xs ${
                                  selectedTags.includes(tag) 
                                    ? "bg-red-50 border-red-300 text-red-700" 
                                    : ""
                                }`}
                              >
                                {tag}
                              </Badge>
                            ))}
                            {result.tags.length > 5 && (
                              <span className="text-xs text-muted-foreground">
                                +{result.tags.length - 5}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right Side */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {getStatusBadge(result.status)}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Öffnen</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* No Results */}
          {results.length === 0 && !loading && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <SearchIcon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-2">Keine Ergebnisse</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  {query ? `Für "${query}" wurden keine Artikel gefunden.` : "Keine Artikel gefunden."} 
                  Versuchen Sie andere Suchbegriffe oder Filter.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Initial State */}
      {!hasSearched && !query && activeFilterCount === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <SearchIcon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">Suche starten</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Geben Sie einen Suchbegriff ein, um Artikel zu finden. Die Suche
              durchsucht Titel, Inhalt und Tags. Nutzen Sie die erweiterten Filter
              für präzisere Ergebnisse.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Search;
