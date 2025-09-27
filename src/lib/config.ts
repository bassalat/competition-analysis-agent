/**
 * Application configuration loaded from environment variables
 * with validation and type safety
 */

export const config = {
  // API Keys
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  serperApiKey: process.env.SERPER_API_KEY || '',
  firecrawlApiKey: process.env.FIRECRAWL_API_KEY || '',

  // Next.js Configuration
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // Rate Limiting (requests per minute)
  rateLimits: {
    claude: parseInt(process.env.CLAUDE_REQUESTS_PER_MINUTE || '50', 10),
    serper: parseInt(process.env.SERPER_REQUESTS_PER_MINUTE || '100', 10),
    firecrawl: parseInt(process.env.FIRECRAWL_REQUESTS_PER_MINUTE || '10', 10),
  },

  // Claude Configuration
  claude: {
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '20000', 10),
    // Model selection for different use cases - read from environment variables
    quickModel: process.env.CLAUDE_QUICK_MODEL || 'claude-3-5-haiku-20241022', // For quick analysis (cheaper)
    standardModel: process.env.CLAUDE_STANDARD_MODEL || 'claude-sonnet-4-20250514', // For standard analysis
    comprehensiveModel: process.env.CLAUDE_COMPREHENSIVE_MODEL || 'claude-sonnet-4-20250514', // For comprehensive analysis (Sonnet 4 is powerful enough)

    // Specialized models for different tasks
    researchModel: process.env.CLAUDE_RESEARCH_MODEL || 'claude-3-5-haiku-20241022', // Fast for search query generation and basic research
    analysisModel: process.env.CLAUDE_ANALYSIS_MODEL || 'claude-sonnet-4-20250514', // Powerful for deep competitive analysis
    synthesisModel: process.env.CLAUDE_SYNTHESIS_MODEL || 'claude-sonnet-4-20250514', // Advanced for synthesis and strategic insights

    // Token limits for different phases
    researchTokens: parseInt(process.env.CLAUDE_RESEARCH_TOKENS || '8000', 10),
    analysisTokens: parseInt(process.env.CLAUDE_ANALYSIS_TOKENS || '20000', 10),
    synthesisTokens: parseInt(process.env.CLAUDE_SYNTHESIS_TOKENS || '25000', 10),

    // Model-specific token limits
    haikuMaxTokens: parseInt(process.env.CLAUDE_HAIKU_MAX_TOKENS || '8000', 10), // Haiku limit is 8,192
    sonnetMaxTokens: parseInt(process.env.CLAUDE_SONNET_MAX_TOKENS || '20000', 10), // Sonnet can handle 20k+
  },

  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};

/**
 * Validates that all required environment variables are set
 * Throws an error if any required variables are missing
 */
export function validateConfig() {
  const missingVars: string[] = [];

  if (!config.anthropicApiKey) missingVars.push('ANTHROPIC_API_KEY');
  if (!config.serperApiKey) missingVars.push('SERPER_API_KEY');
  if (!config.firecrawlApiKey) missingVars.push('FIRECRAWL_API_KEY');

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please set these variables in your .env.local file'
    );
  }
}

/**
 * Validates config on module load in development
 */
if (config.isDevelopment && typeof window === 'undefined') {
  try {
    validateConfig();
  } catch (error) {
    console.warn('Configuration validation warning:', (error as Error).message);
  }
}