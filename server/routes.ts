import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPaperSchema, insertSearchQuerySchema, insertUserSchema, type SearchFilters, type User } from "@shared/schema";
import { z } from "zod";
import { requireAuth, createUser, getUserByEmail, getUserByUsername, getUserById, verifyPassword, updateUserApiKey, generateToken } from "./auth";
import { generatePaperChat, testApiKey } from "./openai";

const SEMANTIC_SCHOLAR_API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY || process.env.S2_API_KEY;
const SEMANTIC_SCHOLAR_BASE_URL = "https://api.semanticscholar.org/graph/v1";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, username, password, openaiApiKey, openaiBaseUrl } = req.body;
      
      if (!email || !username || !password) {
        return res.status(400).json({ error: "Email, username, and password are required" });
      }

      // Check if user already exists
      const existingUserByEmail = await getUserByEmail(email);
      if (existingUserByEmail) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const existingUserByUsername = await getUserByUsername(username);
      if (existingUserByUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }

      // Test API key if provided
      if (openaiApiKey) {
        const isValidKey = await testApiKey(openaiApiKey, openaiBaseUrl);
        if (!isValidKey) {
          return res.status(400).json({ error: "Invalid OpenAI API key" });
        }
      }

      const user = await createUser({ email, username, password, openaiApiKey, openaiBaseUrl });
      const token = generateToken(user.id);
      
      console.log('Registration successful:', { userId: user.id });
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          username: user.username,
          hasApiKey: !!user.openaiApiKey 
        },
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { login, password } = req.body;
      
      if (!login || !password) {
        return res.status(400).json({ error: "Login and password are required" });
      }

      // Try to find user by email or username
      let user = await getUserByEmail(login);
      if (!user) {
        user = await getUserByUsername(login);
      }

      if (!user || !await verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = generateToken(user.id);
      
      console.log('Login successful:', { userId: user.id });
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          username: user.username,
          hasApiKey: !!user.openaiApiKey 
        },
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    // With JWT, logout is handled client-side by removing the token
    res.json({ success: true });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const user = await getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ 
        id: user.id, 
        email: user.email, 
        username: user.username,
        hasApiKey: !!user.openaiApiKey 
      });
    } catch (error: any) {
      console.error('Get user error:', error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.post("/api/auth/api-key", requireAuth, async (req, res) => {
    try {
      const { apiKey, baseUrl } = req.body;
      const userId = req.userId!;
      
      if (!apiKey) {
        return res.status(400).json({ error: "API key is required" });
      }

      const isValid = await testApiKey(apiKey, baseUrl);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid API key" });
      }

      await updateUserApiKey(userId, apiKey, baseUrl);
      res.json({ success: true });
    } catch (error) {
      console.error('Update API key error:', error);
      res.status(500).json({ error: "Failed to update API key" });
    }
  });

  // Chat routes
  app.post("/api/chat/session", requireAuth, async (req, res) => {
    try {
      const { paperId, title } = req.body;
      const userId = req.userId!;
      
      if (!paperId || !title) {
        return res.status(400).json({ error: "Paper ID and title are required" });
      }

      const session = await storage.createChatSession({
        userId,
        paperId,
        title
      });
      
      res.json({ session });
    } catch (error) {
      console.error('Create chat session error:', error);
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });

  app.get("/api/chat/sessions", requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const sessions = await storage.getUserChatSessions(userId);
      res.json({ sessions });
    } catch (error) {
      console.error('Get chat sessions error:', error);
      res.status(500).json({ error: "Failed to get chat sessions" });
    }
  });

  app.get("/api/chat/session/:sessionId/messages", requireAuth, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const userId = req.userId!;
      
      // Verify session belongs to user
      const session = await storage.getChatSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ error: "Chat session not found" });
      }
      
      const messages = await storage.getChatMessages(sessionId);
      res.json({ messages });
    } catch (error) {
      console.error('Get chat messages error:', error);
      res.status(500).json({ error: "Failed to get chat messages" });
    }
  });

  app.post("/api/chat/session/:sessionId/message", requireAuth, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const userId = req.userId!;
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "Message content is required" });
      }

      // Verify session belongs to user
      const session = await storage.getChatSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ error: "Chat session not found" });
      }

      // Get paper details
      const paper = await storage.getPaper(session.paperId);
      if (!paper) {
        return res.status(404).json({ error: "Paper not found" });
      }

      // Save user message
      await storage.addChatMessage({
        sessionId,
        role: 'user',
        content
      });

      // Get conversation history
      const messages = await storage.getChatMessages(sessionId);
      const conversationHistory = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

      // Generate AI response
      const assistantResponse = await generatePaperChat(userId, paper, conversationHistory);
      
      // Save assistant message
      const assistantMessage = await storage.addChatMessage({
        sessionId,
        role: 'assistant',
        content: assistantResponse
      });

      res.json({ message: assistantMessage });
    } catch (error: any) {
      console.error('Send chat message error:', error);
      res.status(500).json({ error: error.message || "Failed to send message" });
    }
  });
  
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
      searchUrl.searchParams.append('fields', 'paperId,title,authors,abstract,year,venue,journal,citationCount,referenceCount,url,fieldsOfStudy');
      
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
      
      // Enrich papers with additional data and store them
      for (const paperData of papers) {
        const existingPaper = await storage.getPaper(paperData.paperId);
        if (!existingPaper) {
          // Enrich author data with institutional information
          let enrichedAuthors = paperData.authors || [];
          
          // For each author, try to get additional data from Semantic Scholar
          if (enrichedAuthors.length > 0) {
            try {
              const authorPromises = enrichedAuthors.slice(0, 3).map(async (author: any) => {
                if (author.authorId) {
                  try {
                    const authorResponse = await fetch(
                      `${SEMANTIC_SCHOLAR_BASE_URL}/author/${author.authorId}?fields=name,affiliations,hIndex,paperCount`,
                      { headers }
                    );
                    if (authorResponse.ok) {
                      const authorData = await authorResponse.json();
                      return {
                        ...author,
                        institution: authorData.affiliations?.[0] || author.affiliations?.[0],
                        hIndex: authorData.hIndex,
                        affiliations: authorData.affiliations || author.affiliations
                      };
                    }
                  } catch (e) {
                    // Ignore individual author fetch errors
                  }
                }
                return {
                  ...author,
                  institution: author.affiliations?.[0],
                  hIndex: undefined
                };
              });
              
              enrichedAuthors = await Promise.all(authorPromises);
            } catch (e) {
              // If author enrichment fails, use original data
            }
          }

          await storage.createPaper({
            paperId: paperData.paperId,
            title: paperData.title || 'Untitled',
            authors: enrichedAuthors,
            abstract: paperData.abstract,
            year: paperData.year,
            venue: paperData.venue || paperData.journal?.name,
            venueId: paperData.journal?.id,
            h5Index: paperData.journal?.h5Index,
            citationCount: paperData.citationCount || 0,
            referenceCount: paperData.referenceCount || 0,
            url: paperData.url,
            doi: paperData.doi,
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
      
      // Extract citing papers from the response
      const citingPapers = citations.map((citation: any) => citation.citingPaper).filter(Boolean);
      res.json({ papers: citingPapers });
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
      
      // Extract cited papers from the response
      const citedPapers = references.map((reference: any) => reference.citedPaper).filter(Boolean);
      res.json({ papers: citedPapers });
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
