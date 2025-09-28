/**
 * Firecrawl API client for web scraping functionality
 * Used for extracting content from URLs found during research
 */

import { config } from '@/lib/config';
import { ApiResponse } from '@/types/api';
import { withRateLimit, withTimeout, formatErrorMessage } from './api-utils';

export interface FirecrawlScrapeResult {
  success: boolean;
  data?: {
    markdown: string;
    content: string;
    metadata: {
      title: string;
      description?: string;
      keywords?: string;
      robots?: string;
      ogTitle?: string;
      ogDescription?: string;
      ogUrl?: string;
      ogImage?: string;
      ogLocale?: string;
      ogSiteName?: string;
      sourceURL: string;
      statusCode: number;
    };
  };
  error?: string;
}

export interface FirecrawlMetadata {
  title: string;
  description?: string;
  keywords?: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  ogImage?: string;
  ogLocale?: string;
  ogSiteName?: string;
  sourceURL: string;
  statusCode: number;
}

export interface FirecrawlOptions {
  formats?: ('markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot')[];
  headers?: Record<string, string>;
  includeTags?: string[];
  excludeTags?: string[];
  onlyMainContent?: boolean;
  timeout?: number;
}

export class FirecrawlClient {
  private rateLimitName = 'firecrawl';
  private baseUrl = 'https://api.firecrawl.dev/v1';

  constructor() {
    if (!config.firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY is not configured');
    }
  }

  /**
   * Scrape a single URL using Firecrawl
   */
  async scrape(
    url: string,
    options: FirecrawlOptions = {}
  ): Promise<ApiResponse<{ content: string; markdown: string; metadata: FirecrawlMetadata }>> {
    const {
      formats = ['markdown', 'html'],
      headers = {},
      includeTags = [],
      excludeTags = ['nav', 'footer', 'header', 'aside', 'script', 'style'],
      onlyMainContent = true,
      timeout = 60000,
    } = options;

    console.log(`🔥 Firecrawl scraping: ${url}`);

    const scrapePayload = {
      url,
      formats,
      headers,
      includeTags,
      excludeTags,
      onlyMainContent,
    };

    const operation = async (): Promise<{
      content: string;
      markdown: string;
      metadata: FirecrawlMetadata;
    }> => {
      const response = await withTimeout(
        fetch(`${this.baseUrl}/scrape`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(scrapePayload),
        }),
        timeout,
        'Firecrawl scrape request timeout'
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Firecrawl API error (${response.status}): ${errorText}`
        );
      }

      const result: FirecrawlScrapeResult = await response.json();

      if (!result.success || !result.data) {
        throw new Error(`Firecrawl scraping failed: ${result.error || 'Unknown error'}`);
      }

      const { data } = result;
      const content = data.content || data.markdown || '';
      const markdown = data.markdown || data.content || '';

      if (!content.trim()) {
        console.warn(`⚠️ Firecrawl returned empty content for ${url}`);
      }

      console.log(`✅ Firecrawl scraped ${content.length} characters from ${url}`);

      return {
        content: content.trim(),
        markdown: markdown.trim(),
        metadata: data.metadata,
      };
    };

    return withRateLimit(this.rateLimitName, config.rateLimits.firecrawl, operation, {
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 20000,
    });
  }

  /**
   * Scrape multiple URLs in sequence (with rate limiting)
   */
  async scrapeMultiple(
    urls: string[],
    options: FirecrawlOptions = {}
  ): Promise<ApiResponse<Array<{
    url: string;
    content: string;
    markdown: string;
    metadata: FirecrawlMetadata;
    success: boolean;
    error?: string;
  }>>> {
    console.log(`🔥 Firecrawl scraping ${urls.length} URLs`);

    const results: Array<{
      url: string;
      content: string;
      markdown: string;
      metadata: FirecrawlMetadata;
      success: boolean;
      error?: string;
    }> = [];

    for (const url of urls) {
      try {
        const result = await this.scrape(url, options);
        if (result.success && result.data) {
          results.push({
            url,
            content: result.data.content,
            markdown: result.data.markdown,
            metadata: result.data.metadata,
            success: true,
          });
        } else {
          results.push({
            url,
            content: '',
            markdown: '',
            metadata: { title: '', sourceURL: url, statusCode: 0 } as FirecrawlMetadata,
            success: false,
            error: result.error || 'Scraping failed',
          });
        }
      } catch (error) {
        results.push({
          url,
          content: '',
          markdown: '',
          metadata: { title: '', sourceURL: url, statusCode: 0 } as FirecrawlMetadata,
          success: false,
          error: formatErrorMessage(error),
        });
      }

      // Add delay between requests to avoid rate limiting
      if (urls.indexOf(url) < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Firecrawl completed: ${successCount}/${urls.length} successful`);

    return {
      success: true,
      data: results,
    };
  }

  /**
   * Check if a URL is scrapeable (without actually scraping)
   */
  async checkUrl(url: string): Promise<ApiResponse<boolean>> {
    try {
      // Simple HEAD request to check if URL is accessible
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CompetitorIntel/1.0)',
        },
      });

      const isAccessible = response.ok;
      return {
        success: true,
        data: isAccessible,
      };
    } catch (error) {
      return {
        success: false,
        error: `URL check failed: ${formatErrorMessage(error)}`,
      };
    }
  }

  /**
   * Health check for Firecrawl API
   */
  async healthCheck(): Promise<ApiResponse<boolean>> {
    try {
      // Try to scrape a simple, reliable page
      const testUrl = 'https://httpbin.org/html';
      const response = await this.scrape(testUrl, { timeout: 10000 });
      return {
        success: true,
        data: response.success,
      };
    } catch (error) {
      return {
        success: false,
        error: `Firecrawl health check failed: ${formatErrorMessage(error)}`,
      };
    }
  }
}

// Singleton instance
let firecrawlClientInstance: FirecrawlClient | null = null;

export function getFirecrawlClient(): FirecrawlClient {
  if (!firecrawlClientInstance) {
    firecrawlClientInstance = new FirecrawlClient();
  }
  return firecrawlClientInstance;
}