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
│   │   ├── engines/           # Analysis engines (competitor-research-engine.ts)
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
- **`/api/research-competitor`** - Main competitor research endpoint using comprehensive 9-step process
- **`/api/research-competitor-stream`** - Streaming research with real-time step updates
- **`/api/process-documents`** - Document processing and text extraction
- **`/api/health`** - System health and configuration validation

### Core Libraries (`src/lib/`)
- **`config.ts`** - Environment variable management and validation
- **`engines/competitor-research-engine.ts`** - Main comprehensive research engine (~$0.30/competitor)
- **`engines/nodes/`** - Research node implementations (company-analyzer.ts, industry-analyzer.ts, financial-analyst.ts, news-scanner.ts, collector.ts, curator.ts, enricher.ts, briefing.ts, editor.ts)
- **`engines/index.ts`** - Engine exports and initialization
- **`api-clients/`** - External API integrations (claude-client.ts, serper-client.ts, firecrawl-client.ts)
- **`file-processing/`** - Document extraction utilities (document-parser.ts, text-extractor.ts, file-validator.ts)
- **`cache.ts`** - Caching utilities for API responses
- **`utils.ts`** - General utility functions

### Type Definitions (`src/types/`)
- **`api.ts`** - Comprehensive API types for Claude, Serper, Firecrawl, and business entities
- **`research.ts`** - Research workflow types, ResearchState interface, and ResearchUpdate streaming types
- **`env.d.ts`** - Environment variable type definitions

### UI Components (`src/components/`)
- **`ui/`** - Shadcn/ui components: Button, Card, Dialog, Progress, Tabs, etc.
- **`analysis/`** - Document upload and competitor input components (FileUploadZone, CompetitorInput)
- **`research/`** - Research-specific components:
  - **`CompetitorResearchCard`** - Real-time research progress display with step tracking
  - **`ResearchProgress`** - Overall research workflow progress indicator
  - **`ResearchResults`** - Displays research results with briefings and final report
- **`layout/`** - Layout and navigation components
- All styled with Tailwind CSS v4

### Research State Management
The system uses a sophisticated state management pattern for research workflows:

**ResearchState Interface** (`src/types/research.ts`):
- **Core Information**: company, industry, hq_location
- **Research Data**: company_data, industry_data, financial_data, news_data (DocumentData records)
- **Briefings**: company_briefing, industry_briefing, financial_briefing, news_briefing
- **Progress Tracking**: currentStep, completedSteps, status, messages
- **References**: references array, reference_info, reference_titles for citations
- **Site Data**: site_scrape for company website content

**ResearchUpdate Interface** (SSE streaming):
- **Types**: 'status', 'progress', 'result', 'error'
- **Step Tracking**: Specific research step being executed
- **Progress Indicators**: Percentage completion with detailed messages
- **Data Payload**: Intermediate results and final research output
- **Timestamps**: Real-time progress tracking with ISO timestamps

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
- **Current status**: 8 errors, 5 warnings (primarily @typescript-eslint/no-explicit-any and unused variables)
- TypeScript strict mode enabled with proper type safety throughout the codebase
- **Important**: Address lint errors before committing, especially TypeScript any types
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

### Comprehensive Research Architecture
The system uses a comprehensive 9-step process following the company-research-agent pattern, targeting ~$0.30 per competitor:

**Step 1: Grounding** - Initialize research context and scrape company website if available
**Step 2-5: Parallel Research Nodes** - Execute company_analyzer, industry_analyzer, financial_analyst, news_scanner in parallel
**Step 6: Collector** - Aggregate all research data from parallel nodes
**Step 7: Curator** - Prioritize and filter collected information
**Step 8: Enricher** - Enhance data with additional context and analysis
**Step 9: Briefing & Editor** - Generate section briefings and final comprehensive report

### Cost Optimization
- **Research Nodes**: ~$0.10-0.15 across 4 parallel nodes using varied models
- **Collector/Curator/Enricher**: ~$0.05-0.08 using optimized prompts
- **Final Report Generation**: ~$0.10-0.12 using Sonnet 4
- **Total per competitor**: ~$0.25-0.30 (comprehensive analysis with multi-perspective insights)

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

### Simplified SSE Architecture (Current: Commit 29af79f)
The system implements a **unified SSE event model** for reliable real-time progress tracking:

**Single Event Type**: All updates use `type: 'update'` with complete state:
```javascript
{
  type: 'update',
  progress: 45,
  message: 'PureVPN: Scraping content',
  results: [{ competitor, currentStep, searchQueries, searchResults, urlsFound, contentScraped, finalReport, cost, isComplete, error }],
  isComplete: false,
  timestamp: '2025-09-28T...'
}
```

**Key Benefits**:
- **Eliminates "stuck at 99%" issues** - Complete state sent every update
- **Real-time competitor cards** - Live progress counters during analysis
- **Simplified debugging** - Single data flow instead of complex event choreography
- **Production ready** - Reduced failure points and timeout handling

### Comprehensive Research Engine Architecture
The system uses a sophisticated multi-node research engine following the company-research-agent pattern:

**CompetitorResearchEngine** (`src/lib/engines/competitor-research-engine.ts`):
- Implements the comprehensive 9-step research workflow with real-time callbacks
- Orchestrates parallel research nodes for multi-perspective analysis
- Returns all intermediate research data for full transparency
- Costs ~$0.30 per competitor analysis (comprehensive insights)
- Uses structured research state management with ResearchState interface
- Provides granular step-by-step callbacks for live UI updates

**Research Nodes** (`src/lib/engines/nodes/`):
- **CompanyAnalyzer** - Direct company research and competitive positioning
- **IndustryAnalyzer** - Market dynamics and industry trend analysis
- **FinancialAnalyst** - Business model and financial performance insights
- **NewsScanner** - Recent news and market developments
- **Collector** - Aggregates research data from all nodes
- **Curator** - Filters and prioritizes collected information
- **Enricher** - Enhances data with additional context
- **Briefing** - Generates section summaries for each research category
- **Editor** - Synthesizes final comprehensive competitive intelligence report

### Research Workflow Data Flow
1. **Grounding** → Initialize research context, scrape company website → **UI Update**
2. **Parallel Research Execution** → All research nodes execute simultaneously:
   - Company analysis queries and data collection → **UI Update**
   - Industry analysis and market research → **UI Update**
   - Financial analysis and business model research → **UI Update**
   - News scanning and recent developments → **UI Update**
3. **Collection** → Aggregate all research data from parallel nodes → **UI Update**
4. **Curation** → Filter and prioritize collected information → **UI Update**
5. **Enrichment** → Enhance data with additional context and analysis → **UI Update**
6. **Briefing** → Generate section summaries for each research category → **UI Update**
7. **Report Synthesis** → Create final comprehensive competitive intelligence report → **UI Update**

### Research Transparency Pattern
All intermediate research data is preserved and returned to users through ResearchState:
- `company_data` - Company-specific research documents and analysis
- `industry_data` - Industry analysis and market research results
- `financial_data` - Financial and business model insights
- `news_data` - Recent news and market developments
- `company_briefing` - Company analysis summary
- `industry_briefing` - Industry analysis summary
- `financial_briefing` - Financial analysis summary
- `news_briefing` - News analysis summary
- `references` - All source URLs and citations used
- `reference_info` - Detailed metadata for each source
- `finalReport` - Comprehensive competitive intelligence report

### Error Handling Strategy
- Configuration validation on startup with pre-flight API health checks
- Graceful API timeout handling (20 minute limit for streaming)
- Rate limiting with retry logic
- Specific error messages for common issues (missing API keys, file size limits)
- Stream connection resilience with reconnection logic

## File Processing Capabilities
- **Supported**: PDF, DOCX, DOC, TXT, RTF, HTML, CSV, JSON
- **Limits**: 50MB total upload size, 10 competitors max
- **Processing**: Intelligent text extraction based on document type

## Development Notes

### Production Research Mode
The `/api/research-competitor` and `/api/research-competitor-stream` endpoints are fully functional and integrate with all configured external APIs (Claude, Serper, Firecrawl) for comprehensive competitive intelligence research following the company-research-agent workflow.

**Streaming Architecture (Commit 29af79f)**:
- Single `update` event type with complete state transmission
- Real-time competitor progress cards with live counters
- 20-minute timeout handling for long analyses
- Pre-flight API health checks before analysis starts
- Transparent intermediate data display during processing

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

The system implements a comprehensive 9-step competitive intelligence research workflow following the company-research-agent pattern:

1. **Grounding**: Initialize research context and scrape company website if available
2. **Company Analysis**: Direct company research, competitive positioning, and business model analysis
3. **Industry Analysis**: Market dynamics, industry trends, and competitive landscape research
4. **Financial Analysis**: Business model insights, financial performance, and market positioning
5. **News Analysis**: Recent developments, market news, and trend identification
6. **Collection**: Aggregate and organize all research data from parallel analysis nodes
7. **Curation**: Filter, prioritize, and validate collected information for relevance and accuracy
8. **Enrichment**: Enhance research data with additional context and cross-referencing
9. **Report Generation**: Synthesize comprehensive competitive intelligence report with section briefings

### Key Features
- **Comprehensive**: Multi-perspective analysis with parallel research nodes (~$0.30 per competitor)
- **Transparent**: All intermediate research data preserved and accessible to users
- **Streaming**: Real-time progress updates via Server-Sent Events with granular step tracking
- **Format Agnostic**: Supports PDF, DOCX, TXT, and other document types for context extraction
- **Research Focused**: Following proven company-research-agent methodology for thorough competitive intelligence

This represents a comprehensive, research-driven competitive intelligence platform optimized for depth and accuracy.

## Current Architecture State

**Active Commit**: `daeffbe` - "Implement comprehensive competitor research system following company-research-agent"

This commit represents the current comprehensive research architecture:
- **Backend**: CompetitorResearchEngine with 9-step workflow using parallel research nodes
- **Research Nodes**: Company, Industry, Financial, and News analyzers with specialized prompts
- **Workflow**: Grounding → Parallel Research → Collection → Curation → Enrichment → Briefing → Report
- **Real-time UI**: Research progress tracking through ResearchState with granular step updates
- **Streaming**: SSE updates for each research step with detailed progress and intermediate results

**Note**: This architecture follows the proven company-research-agent methodology for comprehensive competitive intelligence.