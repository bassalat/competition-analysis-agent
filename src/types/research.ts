/**
 * Type definitions for the competitor research system
 * Following the exact structure from company-research-agent repository
 */

import { Competitor, BusinessContext } from './api';

// Research workflow steps (matching the repository)
export type ResearchStep =
  | 'grounding'
  | 'company_analyzer'
  | 'industry_analyzer'
  | 'financial_analyst'
  | 'news_scanner'
  | 'collector'
  | 'curator'
  | 'enricher'
  | 'briefing'
  | 'editor';

// Research state interface (mirrors the repository's ResearchState)
export interface ResearchState {
  // Core information
  company: string;
  industry: string;
  hq_location: string;

  // Research data by category
  company_data?: Record<string, DocumentData>;
  industry_data?: Record<string, DocumentData>;
  financial_data?: Record<string, DocumentData>;
  news_data?: Record<string, DocumentData>;

  // Processed briefings
  company_briefing?: string;
  industry_briefing?: string;
  financial_briefing?: string;
  news_briefing?: string;

  // Enrichment data
  company_enrichment?: string;
  industry_enrichment?: string;
  financial_enrichment?: string;
  news_enrichment?: string;
  cross_category_insights?: string;

  // Final report
  report?: string;

  // Progress tracking
  currentStep?: ResearchStep;
  completedSteps?: ResearchStep[];
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;

  // Metadata
  job_id?: string;
  status?: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  startTime?: string;
  endTime?: string;

  // References for final report
  references?: string[];
  reference_info?: Record<string, ReferenceInfo>;
  reference_titles?: Record<string, string>;

  // Site scraping data (if company website is available)
  site_scrape?: Record<string, DocumentData>;
}

// Document data structure (from search and scraping)
export interface DocumentData {
  url: string;
  title: string;
  content: string;
  snippet?: string;
  query?: string; // Which search query found this document
  date?: string;
  position?: number;
  relevance_score?: number;
  source: 'serper' | 'firecrawl' | 'site_scrape';
  scraped_at?: string;
  categories?: string[]; // Categories this document belongs to
  category?: string; // Primary category for this document
}

// Reference information for citations
export interface ReferenceInfo {
  title: string;
  date?: string;
  relevance_score?: number;
}

// Research metadata for results
export interface ResearchMetadata {
  totalDocuments: number;
  documentsPerCategory: {
    company: number;
    industry: number;
    financial: number;
    news: number;
  };
  costEstimate: number;
  duration: number;
  queriesGenerated: string[];
  sourcesUsed: string[];
}

// Research update for SSE streaming
export interface ResearchUpdate {
  type: 'status' | 'progress' | 'result' | 'error' | 'query_generated' | 'documents_found' | 'content_scraped' | 'briefing_generated' | 'report_chunk';
  step: ResearchStep;
  node?: string; // Which research node is active
  message: string;
  progress?: number; // 0-100
  data?: {
    queries?: string[];
    documentsFound?: number;
    documentsScraped?: number;
    briefingLength?: number;
    briefingsGenerated?: string[]; // Array of briefing categories generated
    totalBriefings?: number; // Total number of briefings generated
    chunk?: string; // For streaming final report
    totalSteps?: number;
    currentStepIndex?: number;
    report?: string; // Full report data
    briefings?: Record<string, string>; // Briefings data by section
    metadata?: ResearchMetadata; // Metadata
    competitor?: Competitor; // Competitor data
  };
  timestamp: string;
}

// Competitor research request
export interface CompetitorResearchRequest {
  competitor: Competitor;
  businessContext?: BusinessContext;
  options?: {
    skipWebsiteScraping?: boolean;
    maxDocumentsPerCategory?: number;
    includeNews?: boolean;
    timeframe?: 'recent' | 'all'; // For news searches
    onUpdate?: (update: ResearchUpdate) => Promise<void>;
  };
}

// Research result for a single competitor
export interface CompetitorResearchResult {
  competitor: Competitor;
  state: ResearchState;
  report: string;
  briefings: {
    company: string;
    industry: string;
    financial: string;
    news: string;
  };
  metadata: {
    totalDocuments: number;
    documentsPerCategory: {
      company: number;
      industry: number;
      financial: number;
      news: number;
    };
    costEstimate: number;
    duration: number; // in seconds
    queriesGenerated: string[];
    sourcesUsed: string[];
  };
  success: boolean;
  error?: string;
}

// Research progress for UI display
export interface ResearchProgress {
  competitor: Competitor;
  currentStep: ResearchStep;
  completedSteps: ResearchStep[];
  progress: number; // 0-100
  isRunning: boolean;
  isCompleted: boolean;
  hasError: boolean;
  error?: string;
  result?: CompetitorResearchResult;
  liveCounters: {
    queriesGenerated: number;
    documentsFound: number;
    documentsScraped: number;
    briefingsGenerated: number;
  };
  estimatedTimeRemaining?: number; // in seconds
}

// Exact prompts from the repository
export const RESEARCH_PROMPTS = {
  COMPANY: `Generate queries on the company fundamentals of {company} in the {industry} industry such as:
- Core products and services
- Company history and milestones
- Leadership team
- Business model and strategy`,

  INDUSTRY: `Generate queries on the industry analysis of {company} in the {industry} industry such as:
- Market position
- Competitors
- {industry} industry trends and challenges
- Market size and growth`,

  FINANCIAL: `Generate queries on the financial analysis of {company} in the {industry} industry such as:
- Fundraising history and valuation
- Financial statements and key metrics
- Revenue and profit sources`,

  NEWS: `Generate detailed queries to find comprehensive recent news and developments for {company} including:
- Product launches and feature announcements with dates
- Business partnerships and collaborations
- Funding rounds and investment news
- Awards and industry recognition
- Company milestones and achievements
- Leadership changes and organizational updates
- Market expansion and new service offerings
- Quarterly reports and transparency updates
- Strategic initiatives and company statements
- Press releases from 2024-2025`,

  INDUSTRY_DETECTION: `What industry is {company} in? Respond with ONLY the industry name (e.g., "Software", "Healthcare", "E-commerce", etc.).`,
} as const;

// Targeted prompts with source prioritization and temporal awareness
export const TARGETED_PROMPTS = {
  COMPANY_SOURCES: `Search authoritative sources for {company} with current year {year}:
- site:crunchbase.com "{company}" funding valuation employees
- site:{company_domain}/about OR site:{company_domain}/press "{year}"
- "{company}" "founded in" headquarters CEO founder "{year}"
- "{company}" annual revenue ARR "{year}" millions billions`,

  FINANCIAL_SOURCES: `Find exact financial metrics for {company} as of {year}:
- "{company}" site:crunchbase.com OR site:pitchbook.com "raised $" "{year}"
- "{company}" valuation billion million "{year}" "as of"
- "{company}" revenue earnings "fiscal year {year}" OR "FY{year}"
- site:businesswire.com OR site:prnewswire.com "{company}" funding "{year}"`,

  INDUSTRY_SOURCES: `Research {company} market position in {industry} for {year}:
- site:gartner.com OR site:forrester.com "{company}" {industry} "{year}"
- "{company}" vs competitors market share percentage "{year}"
- site:g2.com OR site:capterra.com "{company}" reviews ratings
- "{industry}" market size growth "{company}" position "{year}"`
} as const;

// Research workflow configuration
export const RESEARCH_WORKFLOW = {
  STEPS: [
    'grounding',
    'company_analyzer',
    'industry_analyzer',
    'financial_analyst',
    'news_scanner',
    'collector',
    'curator',
    'enricher',
    'briefing',
    'editor'
  ] as const,

  PARALLEL_RESEARCH_NODES: [
    'company_analyzer',
    'industry_analyzer',
    'financial_analyst',
    'news_scanner'
  ] as const,

  STEP_WEIGHTS: {
    grounding: 5,
    company_analyzer: 15,
    industry_analyzer: 15,
    financial_analyst: 15,
    news_scanner: 15,
    collector: 5,
    curator: 10,
    enricher: 5,
    briefing: 10,
    editor: 10,
  } as const,
} as const;

// Final report structure (exact format from repository)
export interface FinalReport {
  title: string;
  sections: {
    companyOverview: string;
    industryOverview: string;
    financialOverview: string;
    news: string;
    references: string;
  };
  metadata: {
    generatedAt: string;
    company: string;
    industry: string;
    sources: number;
    wordCount: number;
  };
}