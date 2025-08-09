# DeepResearchFlow - Academic Paper Search and Visualization Platform

## Overview

DeepResearchFlow is a fully functional full-stack web application designed for academic research discovery and visualization. The platform allows users to search for research papers, explore citation networks, and visualize research connections through interactive graphs. It integrates with the Semantic Scholar API to provide comprehensive academic paper data and citation analysis.

✓ **Completed Features:**
- Academic paper search with filtering (field, year, citations)
- Interactive D3.js graph visualization with force-directed layout
- Paper details panel with citations and references
- Real-time graph interactions (zoom, pan, drag nodes)
- Clean, responsive UI with loading states
- Semantic Scholar API integration for authentic data

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (January 2025)

✓ Built complete DeepResearchFlow application with PostgreSQL database
✓ Fixed infinite authentication loop issues
✓ Implemented proper authentication routing and redirects
✓ Removed API key requirement from signup - moved to settings page
✓ Added dedicated settings page for secure API key management
✓ Fixed landing page routing to not show on signup page
✓ Enhanced paper search with publication venue, H5 index, and authors' institutional backgrounds
✓ Implemented meaningful page routing for /search, /paper/:id, /paper/:id/graph, /paper/:id/chat
✓ Added Animated Research Journey Visualizer with D3.js timeline visualization
✓ Fixed citation network API endpoints to properly display connected papers

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state management
- **Build Tool**: Vite for fast development and optimized builds
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API architecture
- **Development**: tsx for TypeScript execution in development

### Data Visualization
- **Library**: D3.js for interactive graph visualizations
- **Features**: Force-directed layouts, zoom/pan controls, node interaction

## Key Components

### Database Layer
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL with Neon serverless driver
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Storage Strategy**: Dual storage implementation with in-memory fallback

### Authentication & Session Management
- **Session Store**: PostgreSQL-based sessions using connect-pg-simple
- **Security**: Environment-based configuration for database credentials

### External Integrations
- **Semantic Scholar API**: Primary data source for academic papers
- **Rate Limiting**: Built-in API key management and request throttling
- **Data Enrichment**: Automatic paper metadata extraction and storage

### UI/UX Components
- **Search Interface**: Advanced filtering by field, year, and citation count
- **Paper Lists**: Responsive paper browsing with metadata display
- **Graph Visualization**: Interactive citation network exploration
- **Detail Panels**: Comprehensive paper information and related work discovery

## Data Flow

### Search Process
1. User submits search query through SearchPanel component
2. Backend queries Semantic Scholar API with filters
3. Results are processed and stored in local database
4. Frontend displays paginated results in PapersList component
5. Search queries are logged for analytics

### Visualization Pipeline
1. User selects paper from search results
2. System fetches citation and reference data
3. Graph data is constructed with nodes (papers) and edges (connections)
4. D3.js renders interactive force-directed graph
5. Users can explore connections and drill down into related papers

### Data Storage Strategy
- **Primary Storage**: PostgreSQL database with Drizzle ORM for all persistent data
- **Database Tables**: Users, papers, chat sessions/messages, paper connections, search queries, collections
- **Session Storage**: PostgreSQL-based sessions for authentication state
- **Caching**: TanStack Query provides client-side caching with configurable stale times

## External Dependencies

### Core APIs
- **Semantic Scholar API**: Academic paper search and citation data
- **Rate Limiting**: Configurable API key usage and request throttling

### Development Tools
- **Replit Integration**: Runtime error overlay and cartographer for development
- **Hot Reload**: Vite HMR for fast development cycles
- **TypeScript**: Full type safety across frontend and backend

### Production Dependencies
- **Neon Database**: Serverless PostgreSQL hosting
- **Session Management**: Secure session storage and management
- **Error Handling**: Comprehensive error boundaries and API error handling

## Deployment Strategy

### Development Environment
- **Vite Dev Server**: Frontend development with HMR
- **Express Server**: Backend API serving on separate port
- **Database**: Development database with automatic schema pushing

### Production Build
- **Frontend**: Static asset generation via Vite build
- **Backend**: ESBuild compilation to single JavaScript bundle
- **Asset Serving**: Express serves both API routes and static frontend
- **Database**: Production PostgreSQL with connection pooling

### Environment Configuration
- **Database URL**: PostgreSQL connection string for persistent data storage
- **API Keys**: User-provided OpenAI API keys stored encrypted in database
- **Session Security**: PostgreSQL-based session storage with secure configuration
- **Optional**: Semantic Scholar API key for enhanced rate limits

### Scalability Considerations
- **Database**: Serverless PostgreSQL scales automatically
- **API Layer**: Stateless Express server suitable for horizontal scaling
- **Frontend**: Static assets can be served via CDN
- **Caching**: Client-side query caching reduces API load