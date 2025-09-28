/**
 * Serper.dev API client for web search functionality
 * Used for research query execution in competitor analysis
 */

import { config } from '@/lib/config';
import { ApiResponse } from '@/types/api';
import { withRateLimit, withTimeout, formatErrorMessage } from './api-utils';

export interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  position: number;
}

export interface SerperNewsResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
}

export interface SerperResponse {
  organic: SerperSearchResult[];
  news?: SerperNewsResult[];
  searchParameters: {
    q: string;
    gl: string;
    hl: string;
  };
  searchInformation: {
    totalResults: string;
    timeTaken: number;
  };
}

export interface SerperOptions {
  num?: number; // Number of results (1-100)
  gl?: string; // Country code
  hl?: string; // Language
  timeout?: number;
}

export class SerperClient {
  private rateLimitName = 'serper';
  private baseUrl = 'https://google.serper.dev';

  constructor() {
    if (!config.serperApiKey) {
      throw new Error('SERPER_API_KEY is not configured');
    }
  }

  /**
   * Perform a web search using Serper.dev
   */
  async search(
    query: string,
    options: SerperOptions = {}
  ): Promise<ApiResponse<SerperSearchResult[]>> {
    const {
      num = 10,
      gl = 'us',
      hl = 'en',
      timeout = 30000,
    } = options;

    const searchPayload = {
      q: query,
      num,
      gl,
      hl,
    };

    console.log(`🔍 Serper search: "${query}" (${num} results)`);

    const operation = async (): Promise<SerperSearchResult[]> => {
      const response = await withTimeout(
        fetch(`${this.baseUrl}/search`, {
          method: 'POST',
          headers: {
            'X-API-KEY': config.serperApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(searchPayload),
        }),
        timeout,
        'Serper search request timeout'
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Serper API error (${response.status}): ${errorText}`
        );
      }

      const data: SerperResponse = await response.json();

      if (!data.organic || !Array.isArray(data.organic)) {
        console.warn('⚠️ Serper returned no organic results');
        return [];
      }

      const results = data.organic.map((result, index) => ({
        title: result.title || 'No title',
        link: result.link || '',
        snippet: result.snippet || 'No snippet available',
        date: result.date,
        position: index + 1,
      }));

      console.log(`✅ Serper found ${results.length} results`);
      return results;
    };

    return withRateLimit(this.rateLimitName, config.rateLimits.serper, operation, {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
    });
  }

  /**
   * Search for news articles (recent content)
   */
  async searchNews(
    query: string,
    options: SerperOptions = {}
  ): Promise<ApiResponse<SerperSearchResult[]>> {
    const {
      num = 10,
      gl = 'us',
      hl = 'en',
      timeout = 30000,
    } = options;

    const searchPayload = {
      q: query,
      num,
      gl,
      hl,
    };

    console.log(`📰 Serper news search: "${query}"`);

    const operation = async (): Promise<SerperSearchResult[]> => {
      const response = await withTimeout(
        fetch(`${this.baseUrl}/news`, {
          method: 'POST',
          headers: {
            'X-API-KEY': config.serperApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(searchPayload),
        }),
        timeout,
        'Serper news search timeout'
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Serper News API error (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();

      if (!data.news || !Array.isArray(data.news)) {
        console.warn('⚠️ Serper returned no news results');
        return [];
      }

      const results = data.news.map((result: SerperNewsResult, index: number) => ({
        title: result.title || 'No title',
        link: result.link || '',
        snippet: result.snippet || 'No snippet available',
        date: result.date,
        position: index + 1,
      }));

      console.log(`✅ Serper news found ${results.length} results`);
      return results;
    };

    return withRateLimit(this.rateLimitName, config.rateLimits.serper, operation, {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
    });
  }

  /**
   * Health check for Serper API
   */
  async healthCheck(): Promise<ApiResponse<boolean>> {
    try {
      const response = await this.search('test query', { num: 1 });
      return {
        success: true,
        data: response.success,
      };
    } catch (error) {
      return {
        success: false,
        error: `Serper health check failed: ${formatErrorMessage(error)}`,
      };
    }
  }
}

// Singleton instance
let serperClientInstance: SerperClient | null = null;

export function getSerperClient(): SerperClient {
  if (!serperClientInstance) {
    serperClientInstance = new SerperClient();
  }
  return serperClientInstance;
}