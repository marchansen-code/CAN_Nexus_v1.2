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
  Filter
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

const Search = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagFilter, setShowTagFilter] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  // Load all tags
  useEffect(() => {
    const loadTags = async () => {
      try {
        const response = await axios.get(`${API}/tags`);
        setAllTags(response.data.tags || []);
      } catch (error) {
        console.error("Failed to load tags:", error);
      }
    };
    loadTags();
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

  // Perform search
  const performSearch = useCallback(async (searchQuery, tags = []) => {
    if (!searchQuery && tags.length === 0) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    if (searchQuery && searchQuery.length < 2 && tags.length === 0) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const response = await axios.post(`${API}/search`, {
        query: searchQuery || "",
        top_k: 20,
        tags: tags.length > 0 ? tags : null
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

  // Search on debounced query change or tag selection
  useEffect(() => {
    performSearch(debouncedQuery, selectedTags);
  }, [debouncedQuery, selectedTags, performSearch]);

  // Toggle tag selection
  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  // Clear all tag filters
  const clearTagFilters = () => {
    setSelectedTags([]);
  };

  // Handle article click
  const handleArticleClick = (articleId) => {
    navigate(`/articles/${articleId}`);
  };

  // Clear search
  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    const variants = {
      published: "bg-emerald-100 text-emerald-700 border-emerald-200",
      draft: "bg-slate-100 text-slate-700 border-slate-200",
      review: "bg-amber-100 text-amber-700 border-amber-200"
    };
    const labels = {
      published: "Veröffentlicht",
      draft: "Entwurf",
      review: "Review"
    };
    return (
      <Badge variant="outline" className={variants[status] || variants.draft}>
        {labels[status] || status}
      </Badge>
    );
  };

  // Highlight matching text
  const highlightMatch = (text, query) => {
    if (!query || !text) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={i} className="bg-yellow-200 text-yellow-900 px-0.5 rounded">{part}</mark> : part
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn" data-testid="search-page">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Wissenssuche
        </h1>
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearSearch}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant={showTagFilter ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setShowTagFilter(!showTagFilter)}
                className={selectedTags.length > 0 ? "text-red-600" : ""}
                title="Nach Tags filtern"
              >
                <Filter className="w-4 h-4" />
                {selectedTags.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {selectedTags.length}
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

      {/* Tag Filter Panel */}
      {showTagFilter && (
        <Card className="border-dashed animate-fadeIn">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Nach Tags filtern
              </h3>
              {selectedTags.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearTagFilters}>
                  Filter zurücksetzen
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className={`cursor-pointer transition-colors ${
                    selectedTags.includes(tag) 
                      ? "bg-red-500 hover:bg-red-600 text-white" 
                      : "hover:bg-red-50 hover:border-red-300"
                  }`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
              {allTags.length === 0 && (
                <p className="text-sm text-muted-foreground">Keine Tags vorhanden</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Tags Display */}
      {selectedTags.length > 0 && !showTagFilter && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Gefiltert nach:</span>
          {selectedTags.map((tag) => (
            <Badge 
              key={tag} 
              variant="default" 
              className="bg-red-500 hover:bg-red-600 cursor-pointer"
              onClick={() => toggleTag(tag)}
            >
              {tag}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}

      {/* Recent Searches (when no query) */}
      {!query && recentSearches.length > 0 && (
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
                        </div>

                        {/* Snippet */}
                        <p className="text-sm text-muted-foreground line-clamp-2 pl-8">
                          {highlightMatch(result.content_snippet, query)}
                        </p>

                        {/* Meta */}
                        <div className="flex items-center gap-3 pl-8 text-xs text-muted-foreground">
                          {result.category_name && (
                            <span className="flex items-center gap-1">
                              <FolderTree className="w-3 h-3" />
                              {result.category_name}
                            </span>
                          )}
                          {result.updated_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(result.updated_at).toLocaleDateString('de-DE')}
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
                  Für "{query}" wurden keine Artikel gefunden. 
                  Versuchen Sie es mit anderen Suchbegriffen oder prüfen Sie die Schreibweise.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Initial State */}
      {!hasSearched && !query && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <SearchIcon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">Suche starten</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Geben Sie einen Suchbegriff ein, um Artikel zu finden. 
              Die Suche durchsucht Titel, Inhalt und Tags.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Search;
