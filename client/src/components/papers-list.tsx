import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Network, MessageSquare, Calendar, Users, Quote, BookOpen } from "lucide-react";
import { type Paper } from "@shared/schema";

interface PapersListProps {
  papers: Paper[];
  onPaperSelect: (paper: Paper) => void;
  onVisualize: (paper: Paper) => void;
  onChat: (paper: Paper) => void;
}

export function PapersList({ papers, onPaperSelect, onVisualize, onChat }: PapersListProps) {
  if (papers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-400" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
            No Papers Found
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Try searching for academic papers using the search box above.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Search Results ({papers.length} papers)
      </h3>
      <ScrollArea className="h-[600px]">
        <div className="space-y-4 pr-4">
          {papers.map((paper) => (
            <Card key={paper.paperId} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle 
                  className="text-base leading-tight hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2"
                  onClick={() => onPaperSelect(paper)}
                >
                  {paper.title}
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {paper.year}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Quote className="w-3 h-3" />
                    {paper.citationCount} citations
                  </Badge>
                  {paper.authors && paper.authors.length > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {paper.authors.length} authors
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {paper.abstract && (
                  <CardDescription className="line-clamp-3 mb-4">
                    {paper.abstract}
                  </CardDescription>
                )}
                {paper.authors && paper.authors.length > 0 && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    <strong>Authors:</strong> {paper.authors.slice(0, 3).join(", ")}
                    {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onVisualize(paper)}
                    className="flex items-center gap-1"
                  >
                    <Network className="w-4 h-4" />
                    Visualize
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onChat(paper)}
                    className="flex items-center gap-1"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}