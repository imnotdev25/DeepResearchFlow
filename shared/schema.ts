import { pgTable, text, serial, integer, jsonb, timestamp, varchar, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const papers = pgTable("papers", {
  id: serial("id").primaryKey(),
  paperId: text("paper_id").notNull().unique(), // Semantic Scholar paper ID
  title: text("title").notNull(),
  authors: jsonb("authors").$type<Array<{
    authorId?: string;
    name: string;
    affiliations?: string[];
    institution?: string;
    hIndex?: number;
  }>>().notNull().default([]),
  abstract: text("abstract"),
  year: integer("year"),
  venue: text("venue"),
  venueId: text("venue_id"),
  h5Index: integer("h5_index"),
  citationCount: integer("citation_count").default(0),
  referenceCount: integer("reference_count").default(0),
  url: text("url"),
  doi: text("doi"),
  fieldsOfStudy: jsonb("fields_of_study").$type<string[]>().default([]),
  keywords: jsonb("keywords").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paperConnections = pgTable("paper_connections", {
  id: serial("id").primaryKey(),
  sourcePaperId: text("source_paper_id").notNull(),
  targetPaperId: text("target_paper_id").notNull(),
  connectionType: text("connection_type").notNull(), // 'citation', 'reference', 'semantic'
  strength: integer("strength").default(1), // Connection strength for visualization
});

export const searchQueries = pgTable("search_queries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  query: text("query").notNull(),
  field: text("field"),
  year: integer("year"),
  resultCount: integer("result_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User accounts table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  openaiApiKey: text("openai_api_key"), // Encrypted user's OpenAI-compatible API key
  openaiBaseUrl: text("openai_base_url").default("https://api.openai.com/v1"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat sessions with papers
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  paperId: text("paper_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages within sessions
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => chatSessions.id),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User research collections
export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Papers in collections
export const collectionPapers = pgTable("collection_papers", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id").notNull().references(() => collections.id),
  paperId: text("paper_id").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  searchQueries: many(searchQueries),
  chatSessions: many(chatSessions),
  collections: many(collections),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user: one(users, {
    fields: [collections.userId],
    references: [users.id],
  }),
  papers: many(collectionPapers),
}));

export const collectionPapersRelations = relations(collectionPapers, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionPapers.collectionId],
    references: [collections.id],
  }),
}));

// Insert schemas
export const insertPaperSchema = createInsertSchema(papers).omit({
  id: true,
  createdAt: true,
});

export const insertPaperConnectionSchema = createInsertSchema(paperConnections).omit({
  id: true,
});

export const insertSearchQuerySchema = createInsertSchema(searchQueries).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertCollectionSchema = createInsertSchema(collections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Inferred types
export type Paper = typeof papers.$inferSelect;
export type InsertPaper = z.infer<typeof insertPaperSchema>;
export type PaperConnection = typeof paperConnections.$inferSelect;
export type InsertPaperConnection = z.infer<typeof insertPaperConnectionSchema>;
export type SearchQuery = typeof searchQueries.$inferSelect;
export type InsertSearchQuery = z.infer<typeof insertSearchQuerySchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Collection = typeof collections.$inferSelect;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;

// Frontend-specific types
export type GraphNode = {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  citationCount: number;
  x?: number;
  y?: number;
  cluster?: number;
};

export type GraphLink = {
  source: string;
  target: string;
  type: 'citation' | 'reference' | 'semantic';
  strength: number;
};

export type SearchFilters = {
  field?: string;
  year?: number;
  minCitations?: number;
};

export type PaperSearchResponse = {
  papers: Paper[];
  total: number;
  offset: number;
  next?: number;
};
