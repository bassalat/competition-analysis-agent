declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // API Keys
      ANTHROPIC_API_KEY: string;
      SERPER_API_KEY: string;
      FIRECRAWL_API_KEY: string;

      // Next.js Configuration
      NEXT_PUBLIC_APP_URL: string;

      // Rate Limiting
      CLAUDE_REQUESTS_PER_MINUTE: string;
      SERPER_REQUESTS_PER_MINUTE: string;
      FIRECRAWL_REQUESTS_PER_MINUTE: string;

      // Claude Configuration
      CLAUDE_MODEL: string;
      CLAUDE_MAX_TOKENS: string;

      // Environment
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

export {};