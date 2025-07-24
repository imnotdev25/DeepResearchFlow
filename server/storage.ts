import { papers, paperConnections, searchQueries, type Paper, type InsertPaper, type PaperConnection, type InsertPaperConnection, type SearchQuery, type InsertSearchQuery, type SearchFilters, type PaperSearchResponse } from "@shared/schema";

export interface IStorage {
  // Paper operations
  getPaper(paperId: string): Promise<Paper | undefined>;
  createPaper(paper: InsertPaper): Promise<Paper>;
  updatePaper(paperId: string, updates: Partial<InsertPaper>): Promise<Paper | undefined>;
  searchPapers(query: string, filters: SearchFilters, offset: number, limit: number): Promise<PaperSearchResponse>;
  
  // Paper connection operations
  getPaperConnections(paperId: string): Promise<PaperConnection[]>;
  createPaperConnection(connection: InsertPaperConnection): Promise<PaperConnection>;
  getConnectedPapers(paperId: string): Promise<Paper[]>;
  
  // Search query operations
  createSearchQuery(query: InsertSearchQuery): Promise<SearchQuery>;
  getRecentSearches(limit: number): Promise<SearchQuery[]>;
}

export class MemStorage implements IStorage {
  private papers: Map<string, Paper>;
  private paperConnections: Map<number, PaperConnection>;
  private searchQueries: Map<number, SearchQuery>;
  private currentPaperId: number;
  private currentConnectionId: number;
  private currentQueryId: number;

  constructor() {
    this.papers = new Map();
    this.paperConnections = new Map();
    this.searchQueries = new Map();
    this.currentPaperId = 1;
    this.currentConnectionId = 1;
    this.currentQueryId = 1;
  }

  async getPaper(paperId: string): Promise<Paper | undefined> {
    return this.papers.get(paperId);
  }

  async createPaper(insertPaper: InsertPaper): Promise<Paper> {
    const id = this.currentPaperId++;
    const paper: Paper = { 
      ...insertPaper, 
      id,
      createdAt: new Date(),
      url: insertPaper.url || null,
      doi: insertPaper.doi || null,
      abstract: insertPaper.abstract || null,
      year: insertPaper.year || null,
      venue: insertPaper.venue || null
    };
    this.papers.set(insertPaper.paperId, paper);
    return paper;
  }

  async updatePaper(paperId: string, updates: Partial<InsertPaper>): Promise<Paper | undefined> {
    const existing = this.papers.get(paperId);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates } as Paper;
    this.papers.set(paperId, updated);
    return updated;
  }

  async searchPapers(query: string, filters: SearchFilters, offset: number = 0, limit: number = 20): Promise<PaperSearchResponse> {
    const allPapers = Array.from(this.papers.values());
    
    let filteredPapers = allPapers.filter(paper => {
      const matchesQuery = !query || 
        paper.title.toLowerCase().includes(query.toLowerCase()) ||
        paper.abstract?.toLowerCase().includes(query.toLowerCase()) ||
        paper.authors.some(author => author.name.toLowerCase().includes(query.toLowerCase()));
      
      const matchesField = !filters.field || 
        (paper.fieldsOfStudy && paper.fieldsOfStudy.some(field => field.toLowerCase().includes(filters.field!.toLowerCase())));
      
      const matchesYear = !filters.year || paper.year === filters.year;
      
      const matchesCitations = !filters.minCitations || 
        (paper.citationCount ?? 0) >= filters.minCitations;
      
      return matchesQuery && matchesField && matchesYear && matchesCitations;
    });

    // Sort by citation count descending
    filteredPapers.sort((a, b) => (b.citationCount ?? 0) - (a.citationCount ?? 0));
    
    const total = filteredPapers.length;
    const paginatedPapers = filteredPapers.slice(offset, offset + limit);
    
    return {
      papers: paginatedPapers,
      total,
      offset,
      next: offset + limit < total ? offset + limit : undefined
    };
  }

  async getPaperConnections(paperId: string): Promise<PaperConnection[]> {
    return Array.from(this.paperConnections.values()).filter(
      conn => conn.sourcePaperId === paperId || conn.targetPaperId === paperId
    );
  }

  async createPaperConnection(insertConnection: InsertPaperConnection): Promise<PaperConnection> {
    const id = this.currentConnectionId++;
    const connection: PaperConnection = { 
      ...insertConnection, 
      id,
      strength: insertConnection.strength || 1
    };
    this.paperConnections.set(id, connection);
    return connection;
  }

  async getConnectedPapers(paperId: string): Promise<Paper[]> {
    const connections = await this.getPaperConnections(paperId);
    const connectedPaperIds = connections.map(conn => 
      conn.sourcePaperId === paperId ? conn.targetPaperId : conn.sourcePaperId
    );
    
    return connectedPaperIds
      .map(id => this.papers.get(id))
      .filter(paper => paper !== undefined) as Paper[];
  }

  async createSearchQuery(insertQuery: InsertSearchQuery): Promise<SearchQuery> {
    const id = this.currentQueryId++;
    const query: SearchQuery = { 
      ...insertQuery, 
      id,
      createdAt: new Date(),
      field: insertQuery.field || null,
      year: insertQuery.year || null,
      resultCount: insertQuery.resultCount || null
    };
    this.searchQueries.set(id, query);
    return query;
  }

  async getRecentSearches(limit: number = 10): Promise<SearchQuery[]> {
    const queries = Array.from(this.searchQueries.values());
    return queries
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
