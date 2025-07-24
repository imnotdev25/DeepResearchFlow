import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Plus, ExternalLink, Quote, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Paper } from "@shared/schema";

interface PaperDetailsPanelProps {
  paper: Paper;
  onClose: () => void;
  onPaperSelect: (paper: Paper) => void;
}

export function PaperDetailsPanel({ paper, onClose, onPaperSelect }: PaperDetailsPanelProps) {
  // Fetch citations and references
  const { data: citations } = useQuery({
    queryKey: ["/api/papers", paper.paperId, "citations"],
    staleTime: 10 * 60 * 1000, // 10 minutes
  }) as { data: { data: any[] } | undefined };

  const { data: references } = useQuery({
    queryKey: ["/api/papers", paper.paperId, "references"],
    staleTime: 10 * 60 * 1000, // 10 minutes
  }) as { data: { data: any[] } | undefined };

  const handleOpenExternalLink = () => {
    if (paper.url) {
      window.open(paper.url, '_blank');
    }
  };

  const handleViewRelatedPaper = async (paperId: string) => {
    try {
      const response = await fetch(`/api/papers/${paperId}`);
      if (response.ok) {
        const relatedPaper = await response.json();
        onPaperSelect(relatedPaper);
      }
    } catch (error) {
      console.error("Error fetching related paper:", error);
    }
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Paper Details</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-base font-medium text-gray-900 mb-2">
              {paper.title}
            </h4>
            <p className="text-sm text-gray-600">
              {paper.authors.map(author => author.name).join(", ")}
            </p>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            {paper.year && (
              <span className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                {paper.year}
              </span>
            )}
            {paper.venue && <span>{paper.venue}</span>}
            <span className="flex items-center">
              <Quote className="w-3 h-3 mr-1" />
              {paper.citationCount || 0} citations
            </span>
          </div>
          
          <div className="flex space-x-2">
            <Button size="sm" className="flex-1">
              <Plus className="w-3 h-3 mr-2" />
              Add to Graph
            </Button>
            {paper.url && (
              <Button variant="outline" size="sm" onClick={handleOpenExternalLink}>
                <ExternalLink className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          {/* Abstract */}
          {paper.abstract && (
            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-2">Abstract</h5>
              <p className="text-sm text-gray-700 leading-relaxed">
                {paper.abstract}
              </p>
            </div>
          )}
          
          {/* Fields of Study */}
          {paper.fieldsOfStudy && paper.fieldsOfStudy.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-2">Fields of Study</h5>
              <div className="flex flex-wrap gap-2">
                {paper.fieldsOfStudy.map((field, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Keywords */}
          {paper.keywords && paper.keywords.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-2">Keywords</h5>
              <div className="flex flex-wrap gap-2">
                {paper.keywords.map((keyword, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Citations */}
          {citations && citations.data && citations.data.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-3">Papers Citing This Work</h5>
              <div className="space-y-3">
                {citations.data.slice(0, 5).map((citation: any, index: number) => {
                  const citingPaper = citation.citingPaper;
                  if (!citingPaper) return null;
                  
                  return (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <h6 className="text-sm font-medium text-gray-900 mb-1">
                        {citingPaper.title}
                      </h6>
                      <p className="text-xs text-gray-600 mb-2">
                        {citingPaper.authors?.map((a: any) => a.name).join(", ")} • {citingPaper.year}
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-6 p-0 text-primary hover:text-primary-foreground"
                        onClick={() => handleViewRelatedPaper(citingPaper.paperId)}
                      >
                        View Details →
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* References */}
          {references && references.data && references.data.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-3">Referenced Papers</h5>
              <div className="space-y-3">
                {references.data.slice(0, 5).map((reference: any, index: number) => {
                  const citedPaper = reference.citedPaper;
                  if (!citedPaper) return null;
                  
                  return (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <h6 className="text-sm font-medium text-gray-900 mb-1">
                        {citedPaper.title}
                      </h6>
                      <p className="text-xs text-gray-600 mb-2">
                        {citedPaper.authors?.map((a: any) => a.name).join(", ")} • {citedPaper.year}
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-6 p-0 text-primary hover:text-primary-foreground"
                        onClick={() => handleViewRelatedPaper(citedPaper.paperId)}
                      >
                        View Details →
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Citation Timeline Placeholder */}
          <div>
            <h5 className="text-sm font-medium text-gray-900 mb-3">Citation Timeline</h5>
            <div className="h-32 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
              <span className="text-xs text-gray-500">
                Citation timeline visualization coming soon
              </span>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
