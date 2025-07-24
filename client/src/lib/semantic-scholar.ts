// Type definitions for Semantic Scholar API responses
export interface SemanticScholarPaper {
  paperId: string;
  title: string;
  authors: Array<{
    authorId?: string;
    name: string;
  }>;
  abstract?: string;
  year?: number;
  venue?: string;
  citationCount?: number;
  referenceCount?: number;
  url?: string;
  fieldsOfStudy?: string[];
}

export interface SemanticScholarSearchResponse {
  data: SemanticScholarPaper[];
  total: number;
  offset: number;
  next?: number;
}

export interface SemanticScholarCitation {
  citingPaper: SemanticScholarPaper;
  contexts: string[];
  intents: string[];
  isInfluential: boolean;
}

export interface SemanticScholarReference {
  citedPaper: SemanticScholarPaper;
  contexts: string[];
  intents: string[];
  isInfluential: boolean;
}

// Utility functions for working with Semantic Scholar data
export function formatAuthors(authors: Array<{ name: string }>): string {
  if (!authors || authors.length === 0) return "Unknown authors";
  if (authors.length === 1) return authors[0].name;
  if (authors.length === 2) return `${authors[0].name} and ${authors[1].name}`;
  return `${authors[0].name} et al.`;
}

export function truncateTitle(title: string, maxLength: number = 60): string {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength).trim() + "...";
}

export function formatCitationCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export function calculatePaperAge(year?: number): number {
  if (!year) return 0;
  return new Date().getFullYear() - year;
}

export function getPaperUrl(paperId: string): string {
  return `https://www.semanticscholar.org/paper/${paperId}`;
}

// Semantic similarity calculation (basic implementation)
export function calculateSemanticSimilarity(paper1: SemanticScholarPaper, paper2: SemanticScholarPaper): number {
  // Basic keyword-based similarity
  const getKeywords = (paper: SemanticScholarPaper): Set<string> => {
    const words = new Set<string>();
    
    // Extract from title
    if (paper.title) {
      paper.title.toLowerCase().split(/\W+/).forEach(word => {
        if (word.length > 3) words.add(word);
      });
    }
    
    // Extract from abstract
    if (paper.abstract) {
      paper.abstract.toLowerCase().split(/\W+/).forEach(word => {
        if (word.length > 3) words.add(word);
      });
    }
    
    // Add fields of study
    if (paper.fieldsOfStudy) {
      paper.fieldsOfStudy.forEach(field => {
        field.toLowerCase().split(/\W+/).forEach(word => {
          if (word.length > 2) words.add(word);
        });
      });
    }
    
    return words;
  };
  
  const keywords1 = getKeywords(paper1);
  const keywords2 = getKeywords(paper2);
  
  // Calculate Jaccard similarity
  const intersection = new Set(Array.from(keywords1).filter(x => keywords2.has(x)));
  const union = new Set([...Array.from(keywords1), ...Array.from(keywords2)]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Graph layout utilities
export function createGraphLayout(papers: SemanticScholarPaper[], connections: Array<{ source: string, target: string, type: string }>): { nodes: any[], links: any[] } {
  const nodes = papers.map(paper => ({
    id: paper.paperId,
    title: paper.title,
    authors: paper.authors?.map(a => a.name) || [],
    year: paper.year,
    citationCount: paper.citationCount || 0,
    venue: paper.venue,
    fieldsOfStudy: paper.fieldsOfStudy || []
  }));
  
  const links = connections.map(conn => ({
    source: conn.source,
    target: conn.target,
    type: conn.type,
    strength: 1
  }));
  
  return { nodes, links };
}
