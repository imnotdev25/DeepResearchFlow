import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchPanel } from "@/components/search-panel";
import { PapersList } from "@/components/papers-list";
import { GraphVisualization } from "@/components/graph-visualization";
import { PaperDetails } from "@/components/paper-details";
import { ChatInterface } from "@/components/chat-interface";
import { ResearchJourneyVisualizer } from "@/components/research-journey-visualizer";
import { SearchHistory } from "@/components/search-history";
import { Settings, LogOut, MessageSquare, Network, Search, BookOpen, TrendingUp } from "lucide-react";
import { type Paper } from "@shared/schema";

interface HomeProps {
  defaultView?: "search" | "graph" | "chat";
  selectedPaperId?: string;
}

export default function Home({ defaultView = "search", selectedPaperId }: HomeProps = {}) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [view, setView] = useState<"search" | "graph" | "chat" | "journey">(defaultView as "search" | "graph" | "chat" | "journey");
  const [searchResults, setSearchResults] = useState<Paper[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchHistory, setShowSearchHistory] = useState(false);

  // Fetch paper by ID if provided in route
  const { data: routePaper } = useQuery({
    queryKey: ["/api/papers", selectedPaperId],
    enabled: !!selectedPaperId,
    retry: false,
  });

  useEffect(() => {
    if (routePaper && typeof routePaper === 'object' && 'paperId' in routePaper) {
      setSelectedPaper(routePaper as Paper);
    }
  }, [routePaper]);

  useEffect(() => {
    setView(defaultView);
  }, [defaultView]);

  const handlePaperSelect = (paper: Paper) => {
    setSelectedPaper(paper);
    navigate(`/paper/${paper.paperId}`);
  };

  const handleVisualizePaper = (paper: Paper) => {
    setSelectedPaper(paper);
    setView("graph");
    navigate(`/paper/${paper.paperId}/graph`);
  };

  const handleChatWithPaper = (paper: Paper) => {
    if (!user?.hasApiKey) {
      toast({
        title: "API Key Required",
        description: "Please add your OpenAI API key in settings to use chat.",
        variant: "destructive",
      });
      return;
    }
    setSelectedPaper(paper);
    setView("chat");
    navigate(`/paper/${paper.paperId}/chat`);
  };

  const handleSearch = async (query: string, filters: any) => {
    setIsSearching(true);
    try {
      const response = await fetch("/api/papers/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          query,
          field: filters.field,
          year: filters.year,
          minCitations: filters.minCitations,
          offset: 0,
          limit: 20
        }),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setSearchResults(data.papers);
      setView("search");
      navigate("/search");
      
      // Show cache status in toast
      if (data.cached) {
        toast({
          title: "Search Results (Cached)",
          description: `Found ${data.papers.length} papers from cache.`,
        });
      } else {
        toast({
          title: "Search Results",
          description: `Found ${data.papers.length} papers and saved to cache.`,
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search Error",
        description: "Failed to search papers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleHistorySearch = (query: string, field?: string, year?: number, minCitations?: number) => {
    setShowSearchHistory(false);
    handleSearch(query, { field, year, minCitations });
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="text-white w-4 h-4" />
                </div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  DeepResearchFlow
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Welcome, {user?.username}
              </span>
              <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={view} onValueChange={(value) => {
          const newView = value as "search" | "graph" | "chat" | "journey";
          setView(newView);
          if (selectedPaper) {
            if (newView === "search") navigate(`/paper/${selectedPaper.paperId}`);
            else if (newView === "journey") navigate('/journey');
            else navigate(`/paper/${selectedPaper.paperId}/${newView}`);
          } else if (newView === "search") {
            navigate('/search');
          } else if (newView === "journey") {
            navigate('/journey');
          }
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search Papers
            </TabsTrigger>
            <TabsTrigger value="graph" className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              Graph View
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="journey" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Journey
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-2">
                <SearchPanel 
                  onSearchResults={setSearchResults}
                  isSearching={isSearching}
                  onSearchingChange={setIsSearching}
                />
                <div className="mt-6">
                  <PapersList 
                    papers={searchResults}
                    onPaperSelect={handlePaperSelect}
                    onVisualize={handleVisualizePaper}
                    onChat={handleChatWithPaper}
                  />
                </div>
              </div>
              <div className="lg:col-span-1">
                {user && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                          Search History
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowSearchHistory(!showSearchHistory)}
                          data-testid="button-toggle-search-history"
                        >
                          {showSearchHistory ? "Hide" : "Show"}
                        </Button>
                      </div>
                      {showSearchHistory && (
                        <SearchHistory
                          onSelectSearch={handleHistorySearch}
                          isCollapsed={true}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="lg:col-span-1">
                {selectedPaper && (
                  <PaperDetails 
                    paper={selectedPaper}
                    onVisualize={() => handleVisualizePaper(selectedPaper)}
                    onChat={() => handleChatWithPaper(selectedPaper)}
                  />
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="graph" className="mt-6">
            {selectedPaper ? (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Citation Network</CardTitle>
                      <CardDescription>
                        Interactive visualization of {selectedPaper.title}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <GraphVisualization 
                        paperId={selectedPaper.paperId}
                        onNodeClick={handlePaperSelect}
                        maxCitations={5}
                        maxReferences={5}
                      />
                    </CardContent>
                  </Card>
                </div>
                <div className="lg:col-span-1">
                  <PaperDetails 
                    paper={selectedPaper}
                    onVisualize={() => handleVisualizePaper(selectedPaper)}
                    onChat={() => handleChatWithPaper(selectedPaper)}
                  />
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Network className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    No Paper Selected
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Search for a paper and click "Visualize" to see its citation network.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            {selectedPaper ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ChatInterface 
                    paper={selectedPaper}
                    onClose={() => setView("search")}
                  />
                </div>
                <div className="lg:col-span-1">
                  <PaperDetails 
                    paper={selectedPaper}
                    onVisualize={() => handleVisualizePaper(selectedPaper)}
                    onChat={() => handleChatWithPaper(selectedPaper)}
                  />
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    No Paper Selected
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Search for a paper and click "Chat" to start a conversation about it.
                  </p>
                  {!user?.hasApiKey && (
                    <p className="text-orange-600 dark:text-orange-400 mt-2 text-sm">
                      Note: You'll need to add your OpenAI API key in settings first.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="journey" className="mt-6">
            {searchResults.length > 0 ? (
              <ResearchJourneyVisualizer 
                papers={searchResults} 
                onPaperSelect={handlePaperSelect}
              />
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  No Research Data
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Search for papers first to see the animated research journey visualization.
                </p>
              </div>
            )}
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}