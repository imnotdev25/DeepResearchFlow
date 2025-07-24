import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const papers = pgTable("papers", {
  id: serial("id").primaryKey(),
  paperId: text("paper_id").notNull().unique(), // Semantic Scholar paper ID
  title: text("title").notNull(),
  authors: jsonb("authors").$type<Array<{
    authorId?: string;
    name: string;
    affiliations?: string[];
  }>>().notNull().default([]),
  abstract: text("abstract"),
  year: integer("year"),
  venue: text("venue"),
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
  query: text("query").notNull(),
  field: text("field"),
  year: integer("year"),
  resultCount: integer("result_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

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

export type Paper = typeof papers.$inferSelect;
export type InsertPaper = z.infer<typeof insertPaperSchema>;
export type PaperConnection = typeof paperConnections.$inferSelect;
export type InsertPaperConnection = z.infer<typeof insertPaperConnectionSchema>;
export type SearchQuery = typeof searchQueries.$inferSelect;
export type InsertSearchQuery = z.infer<typeof insertSearchQuerySchema>;

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
