import { Quote, Link as LinkIcon } from "lucide-react";
import { type Paper } from "@shared/schema";
import { cn } from "@/lib/utils";

interface PapersListProps {
  papers: Paper[];
  onPaperSelect: (paper: Paper) => void;
  selectedPaper: Paper | null;
}

export function PapersList({ papers, onPaperSelect, selectedPaper }: PapersListProps) {
  if (papers.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-center text-gray-500 mt-8">
          <p className="text-sm">No papers found</p>
          <p className="text-xs mt-1">Try searching for academic papers above</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700">Search Results</h3>
          <span className="text-xs text-gray-500">{papers.length} papers</span>
        </div>
        
        <div className="space-y-3">
          {papers.map((paper) => (
            <div
              key={paper.paperId}
              onClick={() => onPaperSelect(paper)}
              className={cn(
                "bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow duration-200 cursor-pointer",
                selectedPaper?.paperId === paper.paperId && "ring-2 ring-primary bg-blue-50"
              )}
            >
              <h4 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                {paper.title}
              </h4>
              <p className="text-xs text-gray-600 mb-2">
                {paper.authors.map(author => author.name).join(", ")}
              </p>
              {paper.abstract && (
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                  {paper.abstract}
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {paper.year} {paper.venue && ` • ${paper.venue}`}
                </span>
                <div className="flex items-center space-x-3 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Quote className="w-3 h-3 mr-1" />
                    {paper.citationCount || 0}
                  </span>
                  <span className="flex items-center">
                    <LinkIcon className="w-3 h-3 mr-1" />
                    {paper.referenceCount || 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
