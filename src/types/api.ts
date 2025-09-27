// Common API types and interfaces

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  retries?: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
}

// Claude API Types
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | Array<{
    type: 'text';
    text: string;
  } | {
    type: 'document';
    source: {
      type: 'base64';
      media_type: 'application/pdf';
      data: string;
    };
  }>;
}

export interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  stream?: boolean;
}

export interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// Serper API Types
export interface SerperSearchRequest {
  q: string;
  gl?: string;
  hl?: string;
  num?: number;
  page?: number;
  type?: 'search' | 'images' | 'videos' | 'places' | 'news';
}

export interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
  date?: string;
  imageUrl?: string;
}

export interface SerperImageResult {
  title: string;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  thumbnailUrl?: string;
  source?: string;
  link?: string;
}

export interface SerperResponse {
  searchParameters: {
    q: string;
    type: string;
    engine: string;
  };
  organic: SerperSearchResult[];
  peopleAlsoAsk?: Array<{
    question: string;
    snippet: string;
    title: string;
    link: string;
  }>;
  relatedSearches?: Array<{
    query: string;
  }>;
  answerBox?: {
    answer: string;
    title: string;
    link: string;
  };
  knowledgeGraph?: {
    title: string;
    type: string;
    description: string;
    descriptionSource: string;
  };
}

// Firecrawl API Types
export interface FirecrawlScrapeRequest {
  url: string;
  formats?: Array<'markdown' | 'html' | 'rawHtml' | 'screenshot'>;
  headers?: Record<string, string>;
  includeTags?: string[];
  excludeTags?: string[];
  onlyMainContent?: boolean;
  timeout?: number;
  waitFor?: number;
}

export interface ScrapedData {
  url: string;
  domain: string;
  title: string;
  description: string;
  markdown: string;
  html: string;
  text: string;
  metadata: Record<string, unknown>;
  scrapedAt: string;
  success: boolean;
  error?: string;
}

export interface FirecrawlResponse {
  success: boolean;
  data?: ScrapedData | ScrapedData[];
  error?: string;
}


// Common competitor types
export interface Competitor {
  name: string;
  website?: string;
  description?: string;
  industry?: string;
  size?: string;
  funding?: string;
  headquarters?: string;
}

export interface BusinessContext {
  company: string;
  industry: string;
  targetMarket: string[];
  businessModel: string;
  valueProposition: string;
  keyProducts: string[];
  competitiveAdvantages: string[];
  challenges: string[];
  objectives: string[];
}

export interface ResearchPlan {
  overview: string;
  priorities: string[];
  focusAreas: string[];
  searchStrategies: string[];
  expectedOutcomes: string[];
}

export interface ResearchDataItem {
  source: string;
  url: string;
  title: string;
  snippet: string;
  content?: string;
  relevanceScore?: number;
  category?: string;
  extractedAt: string;
}

export interface PerspectiveAnalysis {
  perspective: string;
  analyst: string;
  keyFindings: string[];
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  recommendations: string[];
  score: number;
}

export interface AnalysisSynthesis {
  overallAssessment: string;
  competitivePosition: string;
  marketShare?: string;
  keyDifferentiators: string[];
  strategicImplications: string[];
  riskFactors: string[];
}

export interface MetaInsights {
  confidenceLevel: number;
  dataQuality: string;
  gapsIdentified: string[];
  futureResearchNeeds: string[];
}

export interface Recommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  timeframe: 'immediate' | 'short-term' | 'medium-term' | 'long-term';
  title: string;
  description: string;
  impact: string;
  effort: string;
  rationale: string;
}

export interface CompetitiveBattleCard {
  competitor: string;
  overview: string;
  strengths: string[];
  weaknesses: string[];
  pricing: string;
  targetMarket: string[];
  keyMessages: string[];
  competitiveResponse: string[];
}

export interface MonitoringPlan {
  keyMetrics: string[];
  dataSource: string[];
  frequency: string;
  alertThresholds: Record<string, number>;
  stakeholders: string[];
}

export interface AnalysisResult {
  competitor: Competitor;
  researchData: ResearchDataItem[];
  perspectives: PerspectiveAnalysis[];
  synthesis: AnalysisSynthesis;
  metaInsights: MetaInsights;
  recommendations: Recommendation[];
  battleCards: CompetitiveBattleCard[];
  monitoringPlan: MonitoringPlan;
}

// Health check and diagnostics
export interface HealthDetails {
  responseLength?: number;
  model?: string;
  resultsCount?: number;
  hasResults?: boolean;
  title?: string;
  hasContent?: boolean;
  contentLength?: number;
  success?: boolean;
}

export interface DiagnosticInfo {
  timestamp: string;
  configuredModel: string;
  quickModel: string;
  analysisModel: string;
  error?: string;
  issue?: string;
}

// Claude streaming response
export interface StreamResponse {
  type: string;
  delta?: { text?: string };
  message?: {
    id: string;
    type: string;
    role: string;
    content: Array<{ type: string; text: string }>;
    model: string;
    stop_reason?: string;
    stop_sequence?: string | null;
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
}

// Analysis log and callback types
export interface AnalysisLog {
  timestamp: string;
  type: string;
  message: string;
  data?: Record<string, unknown>;
  competitor?: string;
}

export interface QueryData extends Record<string, unknown> {
  query: string;
  purpose: string;
}

export interface SearchData {
  query: string;
  resultCount?: number;
  error?: string;
}

export interface PrioritizedUrlData {
  url: string;
  reason: string;
}

export interface UrlPrioritizationData {
  selectedUrls: number;
  totalUrls: number;
  urls: PrioritizedUrlData[];
}

export interface ScrapingData {
  url: string;
  success: boolean;
  contentLength?: number;
  error?: string;
}

export interface DetailCallbackData {
  detailType: string;
  data: {
    count?: number;
    queries?: QueryData[];
    query?: string;
    resultCount?: number;
    error?: string;
    selectedUrls?: number;
    totalUrls?: number;
    urls?: PrioritizedUrlData[];
    url?: string;
    success?: boolean;
    contentLength?: number;
  };
  competitor?: string;
}

// Simplified analysis result type for the UI
export interface SimplifiedAnalysisResult {
  businessContext?: BusinessContext;
  analyses?: Array<{
    competitor: Competitor;
    finalReport: string;
    executiveSummary?: string;
    confidence?: number;
    metadata: {
      totalCost: number;
      timestamp: string;
      success: boolean;
      error?: string;
    };
  }>;
  summary?: string;
  totalCost?: number;
  timestamp?: string;
  completedAt?: string;
  competitorCount?: number;
  documentAnalysis?: string;
  overallInsights?: {
    keyTrends?: string[];
    marketOpportunities?: string[];
    competitiveThreats?: string[];
    strategicRecommendations?: string[];
  };
  metadata?: {
    totalCost: number;
    avgCostPerCompetitor?: number;
    processingTimeSeconds?: number;
    successfulAnalyses?: number;
    timestamp: string;
    success: boolean;
    error?: string;
  };
}

// Advanced Competitive Intelligence Types - McKinsey-level Analysis

export interface AdvancedStrategicPosition {
  quadrant: 'Leaders' | 'Challengers' | 'Visionaries' | 'Niche Players';
  executionAbility: number; // 1-10
  completenessVision: number; // 1-10
  marketShare: number; // 0-100%
  positioningRationale: string;
}

export interface AdvancedCompetitiveAdvantageRadar {
  technology: number; // 1-10
  marketShare: number; // 1-10
  brand: number; // 1-10
  patents: number; // 1-10
  talent: number; // 1-10
  funding: number; // 1-10
  growthRate: number; // 1-10
  customerSatisfaction: number; // 1-10
  productQuality: number; // 1-10
  innovationPipeline: number; // 1-10
  distribution: number; // 1-10
  partnerships: number; // 1-10
  overallScore: number; // 1-10
}

export interface AdvancedPortersGenericStrategy {
  strategy: 'Cost Leadership' | 'Differentiation' | 'Focus Cost Leadership' | 'Focus Differentiation' | 'Stuck in Middle';
  costPosition: number; // 1-10 (1=lowest cost, 10=highest cost)
  differentiationLevel: number; // 1-10
  marketScope: 'Broad' | 'Narrow';
  strategicRisk: 'Low' | 'Medium' | 'High';
  sustainability: 'Low' | 'Medium' | 'High';
}

export interface AdvancedDisruptionRisk {
  claytonChristensenScore: number; // 1-10
  disruptionVectors: string[];
  timeToDisruption: '0-2 years' | '2-5 years' | '5+ years' | 'Low Risk';
  disruptionReadiness: number; // 1-10
  vulnerabilities: string[];
  protectiveFactors: string[];
}

export interface AdvancedMarketMomentum {
  growthTrajectory: 'Accelerating' | 'Steady' | 'Slowing' | 'Declining';
  marketShareTrend: 'Gaining' | 'Stable' | 'Losing';
  fundingVelocity: 'High' | 'Medium' | 'Low';
  innovationCadence: 'High' | 'Medium' | 'Low';
  momentumScore: number; // 1-10
  predictedTrajectory: string;
}

export interface AdvancedStrategicGroupPosition {
  group: string;
  keyDimensions: { dimension: string; value: number }[];
  mobilityBarriers: string[];
  groupAttractiveness: number; // 1-10
  competitiveRivalry: 'Low' | 'Medium' | 'High';
}

export interface AdvancedValueCurveProfile {
  dimensions: { factor: string; value: number; industry: number }[];
  differentiationAreas: string[];
  parityAreas: string[];
  disadvantageAreas: string[];
  blueOceanPotential: number; // 1-10
}

export interface AdvancedJobsToBeHone {
  functionalJobs: string[];
  emotionalJobs: string[];
  socialJobs: string[];
  unmetNeeds: string[];
  jobImportanceScore: number; // 1-10
}

export interface AdvancedCompetitiveResponsePrediction {
  likelyMoves: Array<{
    action: string;
    probability: number; // 0-100%
    timeline: string;
    impact: 'Low' | 'Medium' | 'High';
  }>;
  responseCapability: number; // 1-10
  strategicFlexibility: number; // 1-10
}

export interface AdvancedPortersFiveForces {
  competitiveRivalry: {
    intensity: 'Low' | 'Medium' | 'High';
    score: number; // 1-10
    factors: string[];
  };
  threatOfNewEntrants: {
    level: 'Low' | 'Medium' | 'High';
    score: number; // 1-10
    barriers: string[];
  };
  bargainingPowerSuppliers: {
    power: 'Low' | 'Medium' | 'High';
    score: number; // 1-10
    factors: string[];
  };
  bargainingPowerBuyers: {
    power: 'Low' | 'Medium' | 'High';
    score: number; // 1-10
    factors: string[];
  };
  threatOfSubstitutes: {
    threat: 'Low' | 'Medium' | 'High';
    score: number; // 1-10
    substitutes: string[];
  };
  overallAttractiveness: number; // 1-10
}

export interface AdvancedSwotTowsMatrix {
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  tows: {
    soStrategies: string[]; // Strength-Opportunity
    woStrategies: string[]; // Weakness-Opportunity
    stStrategies: string[]; // Strength-Threat
    wtStrategies: string[]; // Weakness-Threat
  };
}

export interface AdvancedBlueOceanAnalysis {
  eliminateFactors: string[];
  reduceFactors: string[];
  raiseFactors: string[];
  createFactors: string[];
  blueOceanOpportunities: Array<{
    opportunity: string;
    attractiveness: number; // 1-10
    feasibility: number; // 1-10
    timeline: string;
  }>;
}

export interface AdvancedStrategicGroupMap {
  groups: Array<{
    name: string;
    competitors: string[];
    characteristics: string[];
    size: number; // Market share
    profitability: number; // 1-10
  }>;
  keyDimensions: [string, string]; // X and Y axis
  whitespaces: Array<{
    position: string;
    opportunity: string;
    attractiveness: number; // 1-10
  }>;
}

export interface AdvancedMarketForecast {
  timeframe: '1 year' | '3 years' | '5 years';
  marketSize: {
    current: number;
    projected: number;
    cagr: number;
  };
  keyDrivers: string[];
  disruptiveFactors: string[];
  scenarioAnalysis: Array<{
    scenario: 'Optimistic' | 'Base Case' | 'Pessimistic';
    probability: number; // 0-100%
    marketSize: number;
    implications: string[];
  }>;
}

export interface AdvancedTamSamSomAnalysis {
  totalAddressableMarket: {
    size: number;
    currency: string;
    methodology: string;
  };
  serviceableAddressableMarket: {
    size: number;
    currency: string;
    constraints: string[];
  };
  serviceableObtainableMarket: {
    size: number;
    currency: string;
    assumptions: string[];
  };
  marketPenetration: number; // 0-100%
}

export interface AdvancedAnsoffMatrix {
  marketPenetration: Array<{
    opportunity: string;
    attractiveness: number; // 1-10
    risk: 'Low' | 'Medium' | 'High';
  }>;
  productDevelopment: Array<{
    opportunity: string;
    attractiveness: number; // 1-10
    risk: 'Low' | 'Medium' | 'High';
  }>;
  marketDevelopment: Array<{
    opportunity: string;
    attractiveness: number; // 1-10
    risk: 'Low' | 'Medium' | 'High';
  }>;
  diversification: Array<{
    opportunity: string;
    attractiveness: number; // 1-10
    risk: 'Low' | 'Medium' | 'High';
  }>;
}

export interface AdvancedExecutiveDashboard {
  competitiveHealthScore: number; // 1-100
  marketPositionTrend: 'Improving' | 'Stable' | 'Declining';
  threatLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  opportunityScore: number; // 1-100
  innovationGap: number; // -10 to +10
  keyMetrics: Array<{
    metric: string;
    value: number;
    trend: 'Up' | 'Flat' | 'Down';
    benchmark: number;
  }>;
}

export interface AdvancedStrategicRecommendationsEngine {
  immediateActions: Array<{
    priority: 1 | 2 | 3;
    action: string;
    rationale: string;
    timeline: string;
    resources: string;
    expectedImpact: 'Low' | 'Medium' | 'High';
    riskLevel: 'Low' | 'Medium' | 'High';
  }>;
  strategicInitiatives: Array<{
    initiative: string;
    description: string;
    timeline: string;
    investment: string;
    expectedROI: string;
    dependencies: string[];
  }>;
  contingencyPlans: Array<{
    scenario: string;
    trigger: string;
    response: string;
    resources: string;
  }>;
}

// Enhanced analysis result with advanced features
export interface AdvancedAnalysisResult extends SimplifiedAnalysisResult {
  advancedInsights?: {
    portersFiveForces?: AdvancedPortersFiveForces;
    swotTowsMatrix?: AdvancedSwotTowsMatrix;
    blueOceanAnalysis?: AdvancedBlueOceanAnalysis;
    strategicGroupMap?: AdvancedStrategicGroupMap;
    marketForecast?: AdvancedMarketForecast;
    tamSamSomAnalysis?: AdvancedTamSamSomAnalysis;
    ansoffMatrix?: AdvancedAnsoffMatrix;
    competitiveIntelligenceScore?: number;
    executiveDashboard?: AdvancedExecutiveDashboard;
    strategicRecommendationsEngine?: AdvancedStrategicRecommendationsEngine;
  };
  competitorAdvancedInsights?: Array<{
    competitor: Competitor;
    strategicPosition?: AdvancedStrategicPosition;
    competitiveAdvantageRadar?: AdvancedCompetitiveAdvantageRadar;
    portersGenericStrategy?: AdvancedPortersGenericStrategy;
    disruptionRisk?: AdvancedDisruptionRisk;
    marketMomentum?: AdvancedMarketMomentum;
    strategicGroupPosition?: AdvancedStrategicGroupPosition;
    valueCurveProfile?: AdvancedValueCurveProfile;
    jobsToBeHone?: AdvancedJobsToBeHone;
    competitiveResponsePrediction?: AdvancedCompetitiveResponsePrediction;
  }>;
}