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
import { eq, desc, and, or, ilike } from "drizzle-orm";

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

export class DatabaseStorage implements IStorage {
  async getPaper(paperId: string): Promise<Paper | undefined> {
    const [paper] = await db.select().from(papers).where(eq(papers.paperId, paperId));
    return paper;
  }

  async createPaper(insertPaper: InsertPaper): Promise<Paper> {
    const [paper] = await db.insert(papers).values([insertPaper]).returning();
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
    // Simple database search - in production this would integrate with Semantic Scholar API
    const searchResults = await db.select()
      .from(papers)
      .where(
        or(
          ilike(papers.title, `%${query}%`),
          ilike(papers.abstract, `%${query}%`)
        )
      )
      .limit(limit)
      .offset(offset);

    return {
      papers: searchResults,
      total: searchResults.length,
      offset,
      next: searchResults.length === limit ? offset + limit : undefined
    };
  }

  async getPaperConnections(paperId: string): Promise<PaperConnection[]> {
    return await db.select().from(paperConnections).where(
      or(
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
      or(...connectedPaperIds.map(id => eq(papers.paperId, id)))
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
      .orderBy(desc(chatSessions.createdAt));
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
      .orderBy(desc(collections.createdAt));
  }

  async addPaperToCollection(collectionId: number, paperId: string): Promise<void> {
    await db.insert(collectionPapers).values({ collectionId, paperId });
  }
}

export const storage = new DatabaseStorage();