import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  Search, 
  FileText, 
  Calendar,
  Hash,
  TrendingUp,
  RefreshCw
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SearchQuery } from "@shared/schema";

interface SearchHistoryProps {
  onSelectSearch: (query: string, field?: string, year?: number, minCitations?: number) => void;
  isCollapsed?: boolean;
}

export function SearchHistory({ onSelectSearch, isCollapsed = false }: SearchHistoryProps) {
  const [showAll, setShowAll] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const { data: historyData, refetch, isLoading, error } = useQuery({
    queryKey: ['/api/search/history'],
    queryFn: async () => {
      const response = await fetch('/api/search/history?limit=20', {
        credentials: 'include', // Use session cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication expired. Please log in again.');
        }
        throw new Error(`Failed to fetch search history: ${response.status}`);
      }
      
      const data = await response.json();
      return data.searchHistory as SearchQuery[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Don't retry on auth errors
    enabled: isAuthenticated && !!user, // Only run if authenticated
  });

  // Don't show anything if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  const searchHistory = historyData || [];
  const displayedHistory = showAll ? searchHistory : searchHistory.slice(0, 5);

  const handleSearchSelect = (search: SearchQuery) => {
    onSelectSearch(search.query, search.field || undefined, search.year || undefined, search.minCitations || undefined);
  };

  const formatSearchFilters = (search: SearchQuery) => {
    const filters = [];
    if (search.field) filters.push(`Field: ${search.field}`);
    if (search.year) filters.push(`Year: ${search.year}`);
    if (search.minCitations) filters.push(`Min Citations: ${search.minCitations}`);
    return filters.join(" • ");
  };

  if (isCollapsed) {
    return (
      <Card className="w-64">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Searches
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-48">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-sm text-slate-500 text-center py-4">
                Failed to load history
              </div>
            ) : searchHistory.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-4">
                No search history yet
              </div>
            ) : (
              <div className="space-y-2">
                {displayedHistory.map((search, index) => (
                  <div
                    key={search.id}
                    className="p-2 rounded-md border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => handleSearchSelect(search)}
                    data-testid={`search-history-item-${index}`}
                  >
                    <div className="text-xs font-medium truncate">
                      {search.query}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {search.resultCount} results
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Search History
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            data-testid="button-refresh-history"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading search history...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <p className="text-slate-600 dark:text-slate-400 mb-2">
              {error.message.includes('Authentication') 
                ? 'Please log in to view search history' 
                : 'Failed to load search history'}
            </p>
            {!error.message.includes('Authentication') && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()} 
                className="mt-2"
                data-testid="button-retry-history"
              >
                Try again
              </Button>
            )}
          </div>
        ) : searchHistory.length === 0 ? (
          <div className="text-center py-8">
            <Search className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No Search History
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Your search history will appear here after you perform searches.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedHistory.map((search, index) => (
              <div key={search.id} className="space-y-3">
                <div
                  className="p-4 rounded-lg border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => handleSearchSelect(search)}
                  data-testid={`search-history-item-${index}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 flex-1 pr-2">
                      {search.query}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="w-4 h-4" />
                      {formatDistanceToNow(new Date(search.createdAt || ''), { addSuffix: true })}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {search.resultCount} results
                    </div>
                    
                    {formatSearchFilters(search) && (
                      <div className="flex items-center gap-1">
                        <Hash className="w-4 h-4" />
                        {formatSearchFilters(search)}
                      </div>
                    )}
                  </div>

                  {search.resultsData && search.resultsData.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-slate-500 mb-2">Preview:</div>
                      <div className="space-y-1">
                        {search.resultsData.slice(0, 2).map((result: any, idx: number) => (
                          <div key={idx} className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            • {result.title}
                          </div>
                        ))}
                        {search.resultsData.length > 2 && (
                          <div className="text-xs text-slate-500">
                            +{search.resultsData.length - 2} more papers
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {index < displayedHistory.length - 1 && <Separator />}
              </div>
            ))}
            
            {searchHistory.length > 5 && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAll(!showAll)}
                  data-testid="button-toggle-history"
                >
                  {showAll ? "Show Less" : `Show All ${searchHistory.length} Searches`}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}