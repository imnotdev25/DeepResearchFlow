import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPaperSchema, insertSearchQuerySchema, type SearchFilters } from "@shared/schema";
import { z } from "zod";

const SEMANTIC_SCHOLAR_API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY || process.env.S2_API_KEY;
const SEMANTIC_SCHOLAR_BASE_URL = "https://api.semanticscholar.org/graph/v1";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Search papers endpoint
  app.post("/api/papers/search", async (req, res) => {
    try {
      const { query, field, year, minCitations, offset = 0, limit = 20 } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required" });
      }

      // Save search query
      await storage.createSearchQuery({
        query,
        field,
        year: year ? parseInt(year) : undefined,
        resultCount: 0
      });

      // Search Semantic Scholar API
      const searchUrl = new URL(`${SEMANTIC_SCHOLAR_BASE_URL}/paper/search`);
      searchUrl.searchParams.append('query', query);
      searchUrl.searchParams.append('offset', offset.toString());
      searchUrl.searchParams.append('limit', limit.toString());
      searchUrl.searchParams.append('fields', 'paperId,title,authors,abstract,year,venue,citationCount,referenceCount,url,fieldsOfStudy');
      
      if (year) {
        searchUrl.searchParams.append('year', year.toString());
      }
      if (field) {
        searchUrl.searchParams.append('fieldsOfStudy', field);
      }

      const headers: Record<string, string> = {
        'User-Agent': 'DeepResearchFlow/1.0'
      };
      
      if (SEMANTIC_SCHOLAR_API_KEY) {
        headers['x-api-key'] = SEMANTIC_SCHOLAR_API_KEY;
      }

      const response = await fetch(searchUrl.toString(), { headers });
      
      if (!response.ok) {
        throw new Error(`Semantic Scholar API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const papers = data.data || [];
      
      // Store papers in local storage for caching
      for (const paperData of papers) {
        const existingPaper = await storage.getPaper(paperData.paperId);
        if (!existingPaper) {
          await storage.createPaper({
            paperId: paperData.paperId,
            title: paperData.title || 'Untitled',
            authors: paperData.authors || [],
            abstract: paperData.abstract,
            year: paperData.year,
            venue: paperData.venue,
            citationCount: paperData.citationCount || 0,
            referenceCount: paperData.referenceCount || 0,
            url: paperData.url,
            fieldsOfStudy: paperData.fieldsOfStudy || [],
            keywords: []
          });
        }
      }

      res.json({
        papers,
        total: data.total || papers.length,
        offset: data.offset || offset,
        next: data.next
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: "Failed to search papers" });
    }
  });

  // Get paper details
  app.get("/api/papers/:paperId", async (req, res) => {
    try {
      const { paperId } = req.params;
      
      // Try local storage first
      let paper = await storage.getPaper(paperId);
      
      if (!paper) {
        // Fetch from Semantic Scholar API
        const headers: Record<string, string> = {
          'User-Agent': 'DeepResearchFlow/1.0'
        };
        
        if (SEMANTIC_SCHOLAR_API_KEY) {
          headers['x-api-key'] = SEMANTIC_SCHOLAR_API_KEY;
        }

        const response = await fetch(
          `${SEMANTIC_SCHOLAR_BASE_URL}/paper/${paperId}?fields=paperId,title,authors,abstract,year,venue,citationCount,referenceCount,url,fieldsOfStudy`,
          { headers }
        );
        
        if (!response.ok) {
          return res.status(404).json({ error: "Paper not found" });
        }
        
        const paperData = await response.json();
        
        // Store in local cache
        paper = await storage.createPaper({
          paperId: paperData.paperId,
          title: paperData.title || 'Untitled',
          authors: paperData.authors || [],
          abstract: paperData.abstract,
          year: paperData.year,
          venue: paperData.venue,
          citationCount: paperData.citationCount || 0,
          referenceCount: paperData.referenceCount || 0,
          url: paperData.url,
          fieldsOfStudy: paperData.fieldsOfStudy || [],
          keywords: []
        });
      }
      
      res.json(paper);
    } catch (error) {
      console.error('Get paper error:', error);
      res.status(500).json({ error: "Failed to get paper details" });
    }
  });

  // Get paper citations (related papers)
  app.get("/api/papers/:paperId/citations", async (req, res) => {
    try {
      const { paperId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const headers: Record<string, string> = {
        'User-Agent': 'DeepResearchFlow/1.0'
      };
      
      if (SEMANTIC_SCHOLAR_API_KEY) {
        headers['x-api-key'] = SEMANTIC_SCHOLAR_API_KEY;
      }

      const response = await fetch(
        `${SEMANTIC_SCHOLAR_BASE_URL}/paper/${paperId}/citations?fields=contexts,intents,isInfluential,paperId,title,authors,year,venue,citationCount&limit=${limit}`,
        { headers }
      );
      
      if (!response.ok) {
        return res.status(404).json({ error: "Citations not found" });
      }
      
      const data = await response.json();
      const citations = data.data || [];
      
      // Store citation connections and papers
      for (const citation of citations) {
        const citingPaper = citation.citingPaper;
        if (citingPaper) {
          // Store citing paper
          const existingPaper = await storage.getPaper(citingPaper.paperId);
          if (!existingPaper) {
            await storage.createPaper({
              paperId: citingPaper.paperId,
              title: citingPaper.title || 'Untitled',
              authors: citingPaper.authors || [],
              abstract: '',
              year: citingPaper.year,
              venue: citingPaper.venue,
              citationCount: citingPaper.citationCount || 0,
              referenceCount: 0,
              url: '',
              fieldsOfStudy: [],
              keywords: []
            });
          }
          
          // Store connection
          await storage.createPaperConnection({
            sourcePaperId: citingPaper.paperId,
            targetPaperId: paperId,
            connectionType: 'citation',
            strength: citation.isInfluential ? 2 : 1
          });
        }
      }
      
      res.json(citations);
    } catch (error) {
      console.error('Get citations error:', error);
      res.status(500).json({ error: "Failed to get citations" });
    }
  });

  // Get paper references
  app.get("/api/papers/:paperId/references", async (req, res) => {
    try {
      const { paperId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const headers: Record<string, string> = {
        'User-Agent': 'DeepResearchFlow/1.0'
      };
      
      if (SEMANTIC_SCHOLAR_API_KEY) {
        headers['x-api-key'] = SEMANTIC_SCHOLAR_API_KEY;
      }

      const response = await fetch(
        `${SEMANTIC_SCHOLAR_BASE_URL}/paper/${paperId}/references?fields=contexts,intents,isInfluential,paperId,title,authors,year,venue,citationCount&limit=${limit}`,
        { headers }
      );
      
      if (!response.ok) {
        return res.status(404).json({ error: "References not found" });
      }
      
      const data = await response.json();
      const references = data.data || [];
      
      // Store reference connections and papers
      for (const reference of references) {
        const citedPaper = reference.citedPaper;
        if (citedPaper) {
          // Store cited paper
          const existingPaper = await storage.getPaper(citedPaper.paperId);
          if (!existingPaper) {
            await storage.createPaper({
              paperId: citedPaper.paperId,
              title: citedPaper.title || 'Untitled',
              authors: citedPaper.authors || [],
              abstract: '',
              year: citedPaper.year,
              venue: citedPaper.venue,
              citationCount: citedPaper.citationCount || 0,
              referenceCount: 0,
              url: '',
              fieldsOfStudy: [],
              keywords: []
            });
          }
          
          // Store connection
          await storage.createPaperConnection({
            sourcePaperId: paperId,
            targetPaperId: citedPaper.paperId,
            connectionType: 'reference',
            strength: reference.isInfluential ? 2 : 1
          });
        }
      }
      
      res.json(references);
    } catch (error) {
      console.error('Get references error:', error);
      res.status(500).json({ error: "Failed to get references" });
    }
  });

  // Get graph data for a paper and its connections
  app.get("/api/papers/:paperId/graph", async (req, res) => {
    try {
      const { paperId } = req.params;
      const depth = parseInt(req.query.depth as string) || 1;
      
      const visited = new Set<string>();
      const nodes = new Map<string, any>();
      const links: any[] = [];
      
      const exploreConnections = async (currentPaperId: string, currentDepth: number) => {
        if (visited.has(currentPaperId) || currentDepth > depth) return;
        visited.add(currentPaperId);
        
        // Get paper details
        const paper = await storage.getPaper(currentPaperId);
        if (paper) {
          nodes.set(currentPaperId, {
            id: currentPaperId,
            title: paper.title,
            authors: paper.authors.map(a => a.name),
            year: paper.year,
            citationCount: paper.citationCount || 0,
            venue: paper.venue
          });
        }
        
        if (currentDepth < depth) {
          // Get connections
          const connections = await storage.getPaperConnections(currentPaperId);
          
          for (const conn of connections) {
            const targetId = conn.sourcePaperId === currentPaperId ? conn.targetPaperId : conn.sourcePaperId;
            
            links.push({
              source: conn.sourcePaperId,
              target: conn.targetPaperId,
              type: conn.connectionType,
              strength: conn.strength || 1
            });
            
            await exploreConnections(targetId, currentDepth + 1);
          }
        }
      };
      
      await exploreConnections(paperId, 0);
      
      res.json({
        nodes: Array.from(nodes.values()),
        links
      });
    } catch (error) {
      console.error('Get graph error:', error);
      res.status(500).json({ error: "Failed to get graph data" });
    }
  });

  // Get recent searches
  app.get("/api/searches/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const searches = await storage.getRecentSearches(limit);
      res.json(searches);
    } catch (error) {
      console.error('Get recent searches error:', error);
      res.status(500).json({ error: "Failed to get recent searches" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
