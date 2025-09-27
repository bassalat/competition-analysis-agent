/**
 * API Clients - Centralized exports
 */

// Client exports
export { ClaudeClient, getClaudeClient } from './claude-client';
export { SerperClient, getSerperClient } from './serper-client';
export { FirecrawlClient, getFirecrawlClient } from './firecrawl-client';

// Import functions for internal use
import { getClaudeClient } from './claude-client';
import { getSerperClient } from './serper-client';
import { getFirecrawlClient } from './firecrawl-client';

// Import types for the interface
import type { ClaudeClient } from './claude-client';
import type { SerperClient } from './serper-client';
import type { FirecrawlClient } from './firecrawl-client';

// Utility exports
export * from './api-utils';

// Type exports
export type {
  ApiResponse,
  ClaudeMessage,
  SerperSearchResult,
  SerperResponse,
  FirecrawlResponse,
  ScrapedData,
} from '@/types/api';

// Combined client interface for convenience
export interface ApiClients {
  claude: ClaudeClient;
  serper: SerperClient;
  firecrawl: FirecrawlClient;
}

/**
 * Get all API clients in a single object
 */
export function getAllApiClients(): ApiClients {
  return {
    claude: getClaudeClient(),
    serper: getSerperClient(),
    firecrawl: getFirecrawlClient(),
  };
}

/**
 * Health check all API clients
 */
export async function healthCheckAllClients(): Promise<{
  claude: boolean;
  serper: boolean;
  firecrawl: boolean;
  overall: boolean;
}> {
  const clients = getAllApiClients();

  const [claudeHealth, serperHealth, firecrawlHealth] = await Promise.allSettled([
    clients.claude.healthCheck(),
    clients.serper.healthCheck(),
    clients.firecrawl.healthCheck(),
  ]);

  const claudeStatus = claudeHealth.status === 'fulfilled' ? claudeHealth.value.data || false : false;
  const serperStatus = serperHealth.status === 'fulfilled' ? serperHealth.value.data || false : false;
  const firecrawlStatus = firecrawlHealth.status === 'fulfilled' ? firecrawlHealth.value.data || false : false;

  return {
    claude: claudeStatus,
    serper: serperStatus,
    firecrawl: firecrawlStatus,
    overall: claudeStatus && serperStatus && firecrawlStatus,
  };
}