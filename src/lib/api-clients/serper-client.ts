/**
 * Serper.dev API client wrapper for web search functionality
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '@/lib/config';
import { globalCostTracker } from '@/lib/cost-tracker';
import { ApiResponse, SerperSearchRequest, SerperSearchResult, SerperImageResult } from '@/types/api';
import { withRateLimit, withTimeout, formatErrorMessage, isValidUrl } from './api-utils';

export interface SearchOptions {
  maxResults?: number;
  country?: string;
  language?: string;
  dateRange?: 'day' | 'week' | 'month' | 'year';
  safeSearch?: boolean;
  timeout?: number;
}

export interface AdvancedSearchOptions extends SearchOptions {
  site?: string;
  filetype?: string;
  exclude?: string[];
  includeWords?: string[];
  exactPhrase?: string;
  anyWords?: string[];
  dateAfter?: string;
  dateBefore?: string;
}

export class SerperClient {
  private client: AxiosInstance;
  private rateLimitName = 'serper';
  private baseUrl = 'https://google.serper.dev';

  constructor() {
    if (!config.serperApiKey) {
      throw new Error('Serper API key is required');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-API-KEY': config.serperApiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds default timeout
    });
  }

  /**
   * Perform a basic web search
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<ApiResponse<SerperSearchResult[]>> {
    const {
      maxResults = 10,
      country = 'us',
      language = 'en',
      timeout = 30000,
    } = options;

    if (!query || query.trim().length === 0) {
      return {
        success: false,
        error: 'Search query cannot be empty',
      };
    }

    const request: SerperSearchRequest = {
      q: query.trim(),
      gl: country,
      hl: language,
      num: Math.min(maxResults, 100), // Serper limit
      type: 'search',
    };

    const operation = async (): Promise<SerperSearchResult[]> => {
      console.log(`🔍 Making Serper search request for query: "${query}"`);
      console.log('Request payload:', JSON.stringify(request, null, 2));

      const response = await withTimeout(
        this.client.post('/search', request),
        timeout,
        'Serper search request timeout'
      );

      console.log('📥 Serper API response received');
      console.log('Response status:', response?.status);
      console.log('Response data keys:', Object.keys(response?.data || {}));

      if (!response.data) {
        console.error('❌ Serper API returned no data');
        console.error('Full response:', response);
        throw new Error(`Serper API returned no data for query: "${query}"`);
      }

      if (!response.data.organic) {
        console.error('❌ Serper API returned no organic results');
        console.error('Available data keys:', Object.keys(response.data));
        console.error('Response data:', JSON.stringify(response.data, null, 2));
        throw new Error(`Serper API returned no organic results for query: "${query}". Available data: ${Object.keys(response.data).join(', ')}`);
      }

      console.log(`✅ Found ${response.data.organic.length} organic results`);

      const results: SerperSearchResult[] = response.data.organic.map((result: {
        title?: string;
        link?: string;
        snippet?: string;
        position?: number;
        date?: string;
        imageUrl?: string;
      }) => ({
        title: result.title || '',
        link: result.link || '',
        snippet: result.snippet || '',
        position: result.position || 0,
        date: result.date,
        imageUrl: result.imageUrl,
      }));

      const limitedResults = results.slice(0, maxResults);
      console.log(`📊 Returning ${limitedResults.length} results (limited from ${results.length})`);

      // Track cost for this search query ($0.001 per search)
      globalCostTracker.trackExternalAPICost(
        'serper',
        `Search query: "${query}"`,
        0.001,
        1,
        'search'
      );

      return limitedResults;
    };

    return withRateLimit(this.rateLimitName, config.rateLimits.serper, operation);
  }

  /**
   * Perform advanced search with operators and filters
   */
  async advancedSearch(
    query: string,
    options: AdvancedSearchOptions = {}
  ): Promise<ApiResponse<SerperSearchResult[]>> {
    let enhancedQuery = query;

    // Add site restriction
    if (options.site) {
      enhancedQuery += ` site:${options.site}`;
    }

    // Add filetype filter
    if (options.filetype) {
      enhancedQuery += ` filetype:${options.filetype}`;
    }

    // Add exact phrase
    if (options.exactPhrase) {
      enhancedQuery += ` "${options.exactPhrase}"`;
    }

    // Add include words (must contain all)
    if (options.includeWords && options.includeWords.length > 0) {
      options.includeWords.forEach(word => {
        enhancedQuery += ` +${word}`;
      });
    }

    // Add any words (contains at least one)
    if (options.anyWords && options.anyWords.length > 0) {
      enhancedQuery += ` (${options.anyWords.join(' OR ')})`;
    }

    // Exclude words
    if (options.exclude && options.exclude.length > 0) {
      options.exclude.forEach(word => {
        enhancedQuery += ` -${word}`;
      });
    }

    // Date filters
    if (options.dateAfter) {
      enhancedQuery += ` after:${options.dateAfter}`;
    }
    if (options.dateBefore) {
      enhancedQuery += ` before:${options.dateBefore}`;
    }

    return this.search(enhancedQuery.trim(), options);
  }

  /**
   * Search for news articles
   */
  async searchNews(
    query: string,
    options: SearchOptions = {}
  ): Promise<ApiResponse<SerperSearchResult[]>> {
    const request: SerperSearchRequest = {
      q: query.trim(),
      gl: options.country || 'us',
      hl: options.language || 'en',
      num: Math.min(options.maxResults || 10, 100),
      type: 'news',
    };

    const operation = async (): Promise<SerperSearchResult[]> => {
      const response = await withTimeout(
        this.client.post('/news', request),
        options.timeout || 30000,
        'Serper news search timeout'
      );

      if (!response.data || !response.data.news) {
        throw new Error('No news results returned');
      }

      const results = response.data.news.map((result: {
        title?: string;
        link?: string;
        snippet?: string;
        position?: number;
        date?: string;
        imageUrl?: string;
      }) => ({
        title: result.title || '',
        link: result.link || '',
        snippet: result.snippet || '',
        position: result.position || 0,
        date: result.date,
        imageUrl: result.imageUrl,
      }));

      // Track cost for this news search query ($0.001 per search)
      globalCostTracker.trackExternalAPICost(
        'serper',
        `News search query: "${query}"`,
        0.001,
        1,
        'search'
      );

      return results;
    };

    return withRateLimit(this.rateLimitName, config.rateLimits.serper, operation);
  }

  /**
   * Search for images
   */
  async searchImages(
    query: string,
    options: SearchOptions = {}
  ): Promise<ApiResponse<SerperImageResult[]>> {
    const request: SerperSearchRequest = {
      q: query.trim(),
      gl: options.country || 'us',
      hl: options.language || 'en',
      num: Math.min(options.maxResults || 10, 100),
      type: 'images',
    };

    const operation = async (): Promise<SerperImageResult[]> => {
      const response = await withTimeout(
        this.client.post('/images', request),
        options.timeout || 30000,
        'Serper image search timeout'
      );

      if (!response.data || !response.data.images) {
        throw new Error('No image results returned');
      }

      return response.data.images;
    };

    return withRateLimit(this.rateLimitName, config.rateLimits.serper, operation);
  }

  /**
   * Generate multiple search query variations
   */
  generateQueryVariations(baseQuery: string, competitor: string): string[] {
    const variations = [
      // Direct searches
      `"${competitor}"`,
      `${competitor} company`,
      `${competitor} website`,

      // Product and service searches
      `${competitor} product features`,
      `${competitor} pricing`,
      `${competitor} reviews`,
      `${competitor} alternatives`,

      // Business information
      `${competitor} funding`,
      `${competitor} revenue`,
      `${competitor} team`,
      `${competitor} leadership`,
      `${competitor} careers`,

      // Market positioning
      `${competitor} vs competitors`,
      `${competitor} market share`,
      `${competitor} competitive advantage`,

      // Recent activity
      `${competitor} news`,
      `${competitor} press release`,
      `${competitor} announcement`,
      `${competitor} update`,

      // Customer feedback
      `${competitor} customer feedback`,
      `${competitor} testimonials`,
      `${competitor} case studies`,
      `${competitor} complaints`,

      // Technical information
      `${competitor} API`,
      `${competitor} integration`,
      `${competitor} technical documentation`,
      `${competitor} architecture`,

      // Financial and legal
      `${competitor} SEC filing`,
      `${competitor} investment`,
      `${competitor} acquisition`,
      `${competitor} partnership`,

      // Industry specific
      `${baseQuery} ${competitor}`,
      `${competitor} in ${baseQuery}`,
    ];

    return variations;
  }

  /**
   * Perform comprehensive competitor search
   */
  async comprehensiveCompetitorSearch(
    competitor: string,
    industry: string,
    maxQueriesPerType: number = 5
  ): Promise<ApiResponse<{ query: string; results: SerperSearchResult[] }[]>> {
    const queries = this.generateQueryVariations(industry, competitor);
    const searchResults: { query: string; results: SerperSearchResult[] }[] = [];
    const errors: string[] = [];

    // Limit queries to prevent rate limiting
    const limitedQueries = queries.slice(0, maxQueriesPerType);

    const searchPromises = limitedQueries.map(async (query) => {
      try {
        const response = await this.search(query, { maxResults: 5 });
        if (response.success) {
          searchResults.push({
            query,
            results: response.data!,
          });
        } else {
          errors.push(`Query "${query}": ${response.error}`);
        }
      } catch (error) {
        errors.push(`Query "${query}": ${formatErrorMessage(error)}`);
      }
    });

    await Promise.allSettled(searchPromises);

    if (searchResults.length === 0) {
      return {
        success: false,
        error: `All searches failed: ${errors.join(', ')}`,
      };
    }

    return {
      success: true,
      data: searchResults,
    };
  }

  /**
   * Filter search results by relevance and quality
   */
  filterResults(
    results: SerperSearchResult[],
    competitor: string,
    minRelevanceScore: number = 0.5
  ): SerperSearchResult[] {
    return results.filter(result => {
      const titleMatch = result.title.toLowerCase().includes(competitor.toLowerCase());
      const snippetMatch = result.snippet.toLowerCase().includes(competitor.toLowerCase());
      const urlMatch = result.link.toLowerCase().includes(competitor.toLowerCase());

      // Calculate relevance score
      let score = 0;
      if (titleMatch) score += 0.4;
      if (snippetMatch) score += 0.3;
      if (urlMatch) score += 0.3;

      return score >= minRelevanceScore && isValidUrl(result.link);
    });
  }

  /**
   * Health check for Serper API
   */
  async healthCheck(): Promise<ApiResponse<boolean>> {
    const testQuery = 'test query';

    const response = await this.search(testQuery, { maxResults: 1 });

    return {
      success: response.success,
      data: response.success,
      error: response.error,
    };
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