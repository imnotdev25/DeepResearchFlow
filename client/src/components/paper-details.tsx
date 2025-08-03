import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Network, MessageSquare, Calendar, Users, Quote, ExternalLink, FileText, Building, TrendingUp } from "lucide-react";
import { type Paper } from "@shared/schema";

interface PaperDetailsProps {
  paper: Paper;
  onVisualize: () => void;
  onChat: () => void;
}

export function PaperDetails({ paper, onVisualize, onChat }: PaperDetailsProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Paper Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 leading-tight">
            {paper.title}
          </h3>
          <div className="flex items-center gap-2 flex-wrap mb-3">
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
            {paper.venue && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Building className="w-3 h-3" />
                {paper.venue}
              </Badge>
            )}
            {paper.h5Index && (
              <Badge variant="outline" className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                H5: {paper.h5Index}
              </Badge>
            )}
          </div>
        </div>

        {paper.abstract && (
          <div>
            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Abstract</h4>
            <ScrollArea className="h-32">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed pr-4">
                {paper.abstract}
              </p>
            </ScrollArea>
          </div>
        )}

        {paper.authors && paper.authors.length > 0 && (
          <div>
            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Authors</h4>
            <div className="space-y-2">
              {paper.authors.slice(0, 5).map((author, index) => {
                const authorObj = typeof author === 'string' ? { name: author } : author;
                return (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {authorObj.name}
                    </span>
                    {authorObj.institution && (
                      <Badge variant="secondary" className="text-xs">
                        <Building className="w-2 h-2 mr-1" />
                        {authorObj.institution}
                      </Badge>
                    )}
                    {authorObj.hIndex && (
                      <Badge variant="secondary" className="text-xs">
                        h-index: {authorObj.hIndex}
                      </Badge>
                    )}
                  </div>
                );
              })}
              {paper.authors.length > 5 && (
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  +{paper.authors.length - 5} more authors
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Button onClick={onVisualize} className="w-full flex items-center gap-2">
            <Network className="w-4 h-4" />
            Visualize Citation Network
          </Button>
          <Button onClick={onChat} variant="outline" className="w-full flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat About Paper
          </Button>
          {paper.url && (
            <Button 
              variant="outline" 
              className="w-full flex items-center gap-2"
              onClick={() => window.open(paper.url || '', '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
              View Original Paper
            </Button>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Paper ID: {paper.paperId}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}