import { 
  papers, 
  paperConnections, 
  searchQueries, 
  users,
  chatSessions,
  chatMessages,
  collections,
  collectionPapers,
  type Paper, 
  type InsertPaper, 
  type PaperConnection, 
  type InsertPaperConnection, 
  type SearchQuery, 
  type InsertSearchQuery, 
  type SearchFilters, 
  type PaperSearchResponse,
  type User,
  type InsertUser,
  type ChatSession,
  type InsertChatSession,
  type ChatMessage,
  type InsertChatMessage,
  type Collection,
  type InsertCollection
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

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
  getRecentSearches(userId?: number, limit?: number): Promise<SearchQuery[]>;
  
  // Chat operations
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSession(sessionId: number): Promise<ChatSession | undefined>;
  getUserChatSessions(userId: number): Promise<ChatSession[]>;
  addChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(sessionId: number): Promise<ChatMessage[]>;
  
  // Collection operations
  createCollection(collection: InsertCollection): Promise<Collection>;
  getUserCollections(userId: number): Promise<Collection[]>;
  addPaperToCollection(collectionId: number, paperId: string): Promise<void>;
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

export class DatabaseStorage implements IStorage {
  async getPaper(paperId: string): Promise<Paper | undefined> {
    const [paper] = await db.select().from(papers).where(eq(papers.paperId, paperId));
    return paper;
  }

  async createPaper(insertPaper: InsertPaper): Promise<Paper> {
    const [paper] = await db.insert(papers).values(insertPaper).returning();
    return paper;
  }

  async updatePaper(paperId: string, updates: Partial<InsertPaper>): Promise<Paper | undefined> {
    const [paper] = await db.update(papers)
      .set(updates)
      .where(eq(papers.paperId, paperId))
      .returning();
    return paper;
  }

  async searchPapers(query: string, filters: SearchFilters, offset: number = 0, limit: number = 20): Promise<PaperSearchResponse> {
    // This would use the Semantic Scholar API in production
    // For now, return empty results to demonstrate structure
    return {
      papers: [],
      total: 0,
      offset,
      next: undefined
    };
  }

  async getPaperConnections(paperId: string): Promise<PaperConnection[]> {
    return await db.select().from(paperConnections).where(
      and(
        eq(paperConnections.sourcePaperId, paperId),
        eq(paperConnections.targetPaperId, paperId)
      )
    );
  }

  async createPaperConnection(connection: InsertPaperConnection): Promise<PaperConnection> {
    const [newConnection] = await db.insert(paperConnections).values(connection).returning();
    return newConnection;
  }

  async getConnectedPapers(paperId: string): Promise<Paper[]> {
    const connections = await this.getPaperConnections(paperId);
    const connectedPaperIds = connections.map(conn => 
      conn.sourcePaperId === paperId ? conn.targetPaperId : conn.sourcePaperId
    );
    
    if (connectedPaperIds.length === 0) return [];
    
    return await db.select().from(papers).where(
      eq(papers.paperId, connectedPaperIds[0]) // Simplified for demo
    );
  }

  async createSearchQuery(insertQuery: InsertSearchQuery): Promise<SearchQuery> {
    const [query] = await db.insert(searchQueries).values(insertQuery).returning();
    return query;
  }

  async getRecentSearches(userId?: number, limit: number = 10): Promise<SearchQuery[]> {
    if (userId) {
      return await db.select().from(searchQueries)
        .where(eq(searchQueries.userId, userId))
        .orderBy(desc(searchQueries.createdAt))
        .limit(limit);
    }
    return await db.select().from(searchQueries)
      .orderBy(desc(searchQueries.createdAt))
      .limit(limit);
  }

  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    const [newSession] = await db.insert(chatSessions).values(session).returning();
    return newSession;
  }

  async getChatSession(sessionId: number): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, sessionId));
    return session;
  }

  async getUserChatSessions(userId: number): Promise<ChatSession[]> {
    return await db.select().from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt));
  }

  async addChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  async getChatMessages(sessionId: number): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt);
  }

  async createCollection(collection: InsertCollection): Promise<Collection> {
    const [newCollection] = await db.insert(collections).values(collection).returning();
    return newCollection;
  }

  async getUserCollections(userId: number): Promise<Collection[]> {
    return await db.select().from(collections)
      .where(eq(collections.userId, userId))
      .orderBy(desc(collections.updatedAt));
  }

  async addPaperToCollection(collectionId: number, paperId: string): Promise<void> {
    await db.insert(collectionPapers).values({
      collectionId,
      paperId
    });
  }
}

export const storage = new DatabaseStorage();
