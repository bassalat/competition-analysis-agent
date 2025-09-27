# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-first competitor intelligence system built with Next.js 15 that leverages Claude 4 for comprehensive competitive analysis. The system processes business documents, researches competitors, and provides strategic recommendations through multi-perspective analysis.

## Project Structure

**IMPORTANT**: All development commands must be run from the root directory of the repository.

```
competitor-intel-ai/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes for analysis and health checks
│   │   ├── analyze/           # Analysis UI page
│   │   ├── page.tsx           # Landing page
│   │   └── layout.tsx         # Root layout
│   ├── lib/                   # Core libraries and engines
│   │   ├── engines/           # Analysis engines (simplified-competitor-engine.ts)
│   │   ├── api-clients/       # External API integrations
│   │   ├── file-processing/   # Document processing utilities
│   │   ├── config.ts          # Environment configuration
│   │   └── cache.ts           # Caching utilities
│   ├── components/            # React components
│   │   ├── analysis/          # Analysis-specific components
│   │   ├── layout/            # Layout components
│   │   └── ui/                # Shadcn/ui components
│   └── types/                 # TypeScript definitions
├── package.json
├── .env.example
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
└── README.md
```

## Core Architecture

### Frontend (Next.js App Router)
- **Main Entry**: `src/app/page.tsx` - Landing page with feature showcase
- **Analysis UI**: `src/app/analyze/page.tsx` - Document upload and analysis interface
- **Layout**: `src/app/layout.tsx` - Root layout with metadata and global styles

### Backend API Routes (`src/app/api/`)
- **`/api/analyze`** - Main analysis endpoint using simplified 5-step process
- **`/api/analyze-stream`** - Streaming analysis with real-time step updates
- **`/api/process-documents`** - Document processing and text extraction
- **`/api/suggest-competitors`** - AI-powered competitor suggestions
- **`/api/health`** - System health and configuration validation

### Core Libraries (`src/lib/`)
- **`config.ts`** - Environment variable management and validation
- **`engines/simplified-competitor-engine.ts`** - Main 5-step analysis engine (~$0.20/competitor)
- **`engines/index.ts`** - Engine exports and initialization
- **`api-clients/`** - External API integrations (claude-client.ts, serper-client.ts, firecrawl-client.ts)
- **`file-processing/`** - Document extraction utilities (document-parser.ts, text-extractor.ts, file-validator.ts)
- **`cache.ts`** - Caching utilities for API responses
- **`utils.ts`** - General utility functions

### Type Definitions (`src/types/`)
- **`api.ts`** - Comprehensive API types for Claude, Serper, Firecrawl, and business entities
- **`env.d.ts`** - Environment variable type definitions

### UI Components (`src/components/`)
- **`ui/`** - Shadcn/ui components: Button, Card, Dialog, Progress, Tabs, etc.
- **`analysis/`** - Analysis-specific components
- **`layout/`** - Layout and navigation components
- All styled with Tailwind CSS v4

## Development Commands

### Primary Development
```bash
npm run dev                # Start development server (opens http://localhost:3000)
npm run build              # Build for production (uses Turbopack)
npm run start              # Start production server
npm run lint               # Run ESLint (currently has 0 errors, 0 warnings)
```

### Installation
```bash
npm install                # Install all dependencies
```

### Linting and Code Quality
- The project uses ESLint with TypeScript rules
- **Current status**: All lint issues have been resolved (0 errors, 0 warnings)
- TypeScript strict mode enabled with proper type safety throughout the codebase
- **Important**: Maintain code quality by fixing any new lint errors before committing
- TypeScript compilation: Run `npx tsc --noEmit` to check types without building

## Configuration Setup

### Required Environment Variables
Copy `.env.example` to `.env.local` and configure:
- `ANTHROPIC_API_KEY` - Claude API key from console.anthropic.com
- `SERPER_API_KEY` - Search API key from serper.dev
- `FIRECRAWL_API_KEY` - Web scraping API key from firecrawl.dev
- `NEXT_PUBLIC_APP_URL` - Application URL (default: http://localhost:3000)
- `CLAUDE_MODEL` - Claude model to use (default: claude-sonnet-4-20250514)

### Cost Optimization Configuration
To reduce API costs by up to 70%, configure different Claude models for different analysis modes:
- `CLAUDE_QUICK_MODEL` - Fast, cost-effective analysis (default: claude-3-5-haiku-20241022)
- `CLAUDE_STANDARD_MODEL` - Balanced cost/quality (default: claude-sonnet-4-20250514)
- `CLAUDE_COMPREHENSIVE_MODEL` - Detailed analysis with more perspectives (default: claude-sonnet-4-20250514)

### API Rate Limits (configurable)
- Claude: 50 requests/minute
- Serper: 100 requests/minute
- Firecrawl: 10 requests/minute

### Simplified Analysis Architecture
The system uses a streamlined 5-step process targeting ~$0.20 per competitor:

**Step 1: Query Generation** (Haiku 3.5) - Generate 12 targeted search queries
**Step 2: Search Execution** (Serper API) - Execute searches and collect results
**Step 3: URL Prioritization** (Haiku 3.5) - Select most relevant URLs to scrape
**Step 4: Content Scraping** (Firecrawl API) - Extract content from prioritized URLs
**Step 5: Report Synthesis** (Sonnet 4) - Generate final competitive intelligence report

### Cost Optimization
- **Query Generation**: ~$0.01 using Haiku 3.5
- **URL Prioritization**: ~$0.01 using Haiku 3.5
- **Report Synthesis**: ~$0.15-0.18 using Sonnet 4
- **Total per competitor**: ~$0.17-0.20 (90% cost reduction from previous system)

## Key Dependencies

### AI & External APIs
- `@anthropic-ai/sdk` v0.63.1 - Claude API integration
- `axios` v1.12.2 - HTTP client for external APIs
- `cheerio` v1.1.2 - HTML parsing for web scraping

### File Processing
- `pdf-parse` v1.1.1 - PDF text extraction
- `mammoth` v1.11.0 - DOCX document processing

### UI Framework
- `next` v15.5.4 with App Router and Turbopack
- `react` v19.1.0
- `tailwindcss` v4 - Styling framework
- `@radix-ui/*` - Accessible UI primitives
- `lucide-react` v0.544.0 - Icon library
- `react-dropzone` v14.3.8 - File upload handling

## Architecture Patterns

### Simplified Engine Architecture
The system uses a single, streamlined engine instead of multiple complex engines:

**SimplifiedCompetitorEngine** (`src/lib/engines/simplified-competitor-engine.ts`):
- Implements the 5-step analysis process
- Returns all intermediate data for full transparency
- Costs ~$0.20 per competitor analysis
- Uses markdown format throughout (no complex JSON structures)

### Data Flow
1. **Document Upload** → Extract business context and competitors
2. **Query Generation** → Claude generates 12 targeted search queries
3. **Search & Prioritization** → Serper searches + Claude URL selection
4. **Content Extraction** → Firecrawl scrapes prioritized URLs
5. **Report Generation** → Claude synthesizes final intelligence report

### Transparency Pattern
All intermediate data is preserved and returned to users:
- `searchQueries` - Generated search terms
- `searchResults` - Raw search results from Serper
- `prioritizedUrls` - URLs selected for scraping
- `scrapedContent` - Raw content from Firecrawl
- `finalReport` - Synthesized competitive intelligence

### Error Handling Strategy
- Configuration validation on startup
- Graceful API timeout handling (10 minute limit)
- Rate limiting with retry logic
- Specific error messages for common issues (missing API keys, file size limits)

## File Processing Capabilities
- **Supported**: PDF, DOCX, DOC, TXT, RTF, HTML, CSV, JSON
- **Limits**: 50MB total upload size, 10 competitors max
- **Processing**: Intelligent text extraction based on document type

## Development Notes

### Production Analysis Mode
The `/api/analyze` and `/api/analyze-stream` endpoints are fully functional and integrate with all configured external APIs (Claude, Serper, Firecrawl) for comprehensive competitive intelligence analysis.

### TypeScript Configuration
- Strict type checking enabled
- Comprehensive type definitions in `src/types/`
- Environment variable validation at startup
- Path aliases configured: `@/*` maps to `./src/*`

### UI/UX Patterns
- Gradient backgrounds and glassmorphism effects
- Progressive disclosure of complex information
- Real-time feedback during analysis
- Responsive design with mobile-first approach

## Testing Strategy

**Note**: No automated test scripts are currently configured in package.json.

### Type Checking
```bash
npx tsc --noEmit    # Check TypeScript types without building
```

### Manual Testing
- Upload various document types to verify processing
- Test competitor analysis workflow end-to-end
- Validate error handling for missing configuration
- Check responsive design across devices

### API Testing
- Use `/api/health` endpoint for system status
- Test file upload limits and validation
- Verify timeout handling with large analyses

## Deployment Considerations

- Environment variables must be set in production
- API rate limits should be monitored
- File upload storage is temporary (server storage)
- No persistent database - results are ephemeral

## Key Business Logic

The system implements a streamlined 5-step competitive intelligence workflow:

1. **Document Intelligence**: Extract business context from uploaded documents
2. **Query Generation**: Generate 12 targeted search queries using Claude Haiku 3.5
3. **Search & Discovery**: Execute searches via Serper API and collect organic results
4. **Content Prioritization**: Use Claude Haiku 3.5 to select most relevant URLs for scraping
5. **Intelligence Synthesis**: Generate comprehensive competitive analysis using Claude Sonnet 4

### Key Features
- **Cost Efficient**: ~$0.20 per competitor (90% cost reduction)
- **Transparent**: All intermediate data visible to users
- **Streaming**: Real-time progress updates via Server-Sent Events
- **Format Agnostic**: Supports PDF, DOCX, TXT, and other document types
- **Markdown Native**: Uses markdown throughout for better readability

This represents a simplified, cost-effective competitive intelligence platform optimized for speed and transparency.