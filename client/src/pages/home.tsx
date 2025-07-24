import { useState } from "react";
import { SearchPanel } from "@/components/search-panel";
import { PapersList } from "@/components/papers-list";
import { GraphVisualization } from "@/components/graph-visualization";
import { PaperDetailsPanel } from "@/components/paper-details-panel";
import { LoadingOverlay } from "@/components/loading-overlay";
import { Settings, HelpCircle, ChartGantt } from "lucide-react";
import { type Paper } from "@shared/schema";

export default function Home() {
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [showPaperDetails, setShowPaperDetails] = useState(false);
  const [searchResults, setSearchResults] = useState<Paper[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handlePaperSelect = (paper: Paper) => {
    setSelectedPaper(paper);
    setShowPaperDetails(true);
  };

  const handleClosePaperDetails = () => {
    setShowPaperDetails(false);
    setSelectedPaper(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <ChartGantt className="text-white w-4 h-4" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">DeepResearchFlow</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                <Settings className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-screen pt-16">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <SearchPanel 
            onSearch={setSearchResults}
            onSearching={setIsSearching}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
          <PapersList 
            papers={searchResults} 
            onPaperSelect={handlePaperSelect}
            selectedPaper={selectedPaper}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <GraphVisualization 
            selectedPaper={selectedPaper}
            onPaperSelect={handlePaperSelect}
          />
        </div>

        {/* Paper Details Panel */}
        {showPaperDetails && selectedPaper && (
          <PaperDetailsPanel 
            paper={selectedPaper}
            onClose={handleClosePaperDetails}
            onPaperSelect={handlePaperSelect}
          />
        )}
      </div>

      {/* Loading Overlay */}
      {isSearching && <LoadingOverlay message="Searching for papers..." />}
    </div>
  );
}
