/**
 * Firecrawl API client wrapper for web scraping functionality
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '@/lib/config';
import { globalCostTracker } from '@/lib/cost-tracker';
import { ApiResponse, ScrapedData } from '@/types/api';
import { withRateLimit, withTimeout, formatErrorMessage, isValidUrl, sanitizeHtml, extractDomain } from './api-utils';

export interface ScrapeOptions {
  formats?: Array<'markdown' | 'html' | 'rawHtml' | 'screenshot'>;
  headers?: Record<string, string>;
  includeTags?: string[];
  excludeTags?: string[];
  onlyMainContent?: boolean;
  timeout?: number;
  waitFor?: number;
  maxRetries?: number;
}


export class FirecrawlClient {
  private client: AxiosInstance;
  private rateLimitName = 'firecrawl';
  private baseUrl = 'https://api.firecrawl.dev/v1';

  constructor() {
    if (!config.firecrawlApiKey) {
      throw new Error('Firecrawl API key is required');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 1 minute default timeout
    });
  }

  /**
   * Scrape a single URL
   */
  async scrapeUrl(
    url: string,
    options: ScrapeOptions = {}
  ): Promise<ApiResponse<ScrapedData>> {
    if (!isValidUrl(url)) {
      return {
        success: false,
        error: `Invalid URL format: ${url}`,
      };
    }

    const {
      formats = ['markdown', 'html'],
      headers = {},
      includeTags = [],
      excludeTags = ['script', 'style', 'nav', 'footer', 'ads'],
      onlyMainContent = true,
      timeout = 60000,
    } = options;

    // Create clean request object without problematic timeout/waitFor combo
    const request: Record<string, unknown> = {
      url,
      formats,
      headers,
      onlyMainContent,
    };

    // Only add optional parameters if they're defined and valid
    if (includeTags.length > 0) {
      request.includeTags = includeTags;
    }
    if (excludeTags.length > 0) {
      request.excludeTags = excludeTags;
    }

    // Skip timeout and waitFor for now to avoid validation issues
    // The API works fine with defaults

    const operation = async (): Promise<ScrapedData> => {
      console.log(`🕷️ Making Firecrawl scrape request for URL: "${url}"`);
      console.log('Request payload (fixed format):', JSON.stringify(request, null, 2));

      const response = await withTimeout(
        this.client.post('/scrape', request),
        timeout + 10000, // Add buffer for request timeout
        'Firecrawl scrape request timeout'
      );

      console.log('📥 Firecrawl API response received');
      console.log('Response status:', response?.status);
      console.log('Response success:', response?.data?.success);

      if (!response.data) {
        console.error('❌ Firecrawl API returned no data');
        console.error('Full response:', response);
        throw new Error(`Firecrawl API returned no data for URL: "${url}"`);
      }

      if (!response.data.success) {
        console.error('❌ Firecrawl scraping failed');
        console.error('Error message:', response.data?.error);
        console.error('Response data:', JSON.stringify(response.data, null, 2));
        throw new Error(`Firecrawl scraping failed for URL "${url}": ${response.data?.error || 'Unknown error'}`);
      }

      const data = response.data.data;
      const domain = extractDomain(url);

      console.log('✅ Firecrawl scraping successful');
      console.log('Title:', data.metadata?.title);
      console.log('Markdown length:', data.markdown?.length || 0);
      console.log('HTML length:', data.html?.length || 0);

      // Extract text content from markdown
      const textContent = data.markdown
        ? data.markdown.replace(/[#*_`~\[\]()]/g, ' ').replace(/\s+/g, ' ').trim()
        : '';

      console.log('Extracted text length:', textContent.length);

      // Track cost for this URL scrape ($0.002 per URL)
      globalCostTracker.trackExternalAPICost(
        'firecrawl',
        `URL scrape: ${domain}`,
        0.002,
        1,
        'scrape'
      );

      return {
        url,
        domain,
        title: data.metadata?.title || '',
        description: data.metadata?.description || '',
        markdown: data.markdown || '',
        html: sanitizeHtml(data.html || ''),
        text: textContent,
        metadata: data.metadata || {},
        scrapedAt: new Date().toISOString(),
        success: true,
      };
    };

    const result = await withRateLimit(this.rateLimitName, config.rateLimits.firecrawl, operation);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        data: {
          url,
          domain: extractDomain(url),
          title: '',
          description: '',
          markdown: '',
          html: '',
          text: '',
          metadata: {},
          scrapedAt: new Date().toISOString(),
          success: false,
          error: result.error,
        },
      };
    }

    return result;
  }

  /**
   * Scrape multiple URLs concurrently
   */
  async scrapeUrls(
    urls: string[],
    options: ScrapeOptions = {}
  ): Promise<ApiResponse<ScrapedData[]>> {
    if (!urls || urls.length === 0) {
      return {
        success: false,
        error: 'No URLs provided for scraping',
      };
    }

    // Validate URLs
    const validUrls = urls.filter(url => isValidUrl(url));
    const invalidUrls = urls.filter(url => !isValidUrl(url));

    if (invalidUrls.length > 0) {
      console.warn('Invalid URLs skipped:', invalidUrls);
    }

    if (validUrls.length === 0) {
      return {
        success: false,
        error: 'No valid URLs to scrape',
      };
    }

    const results: ScrapedData[] = [];
    const errors: string[] = [];

    // Process URLs in batches to avoid overwhelming the API
    const batchSize = 3;
    const batches = [];

    for (let i = 0; i < validUrls.length; i += batchSize) {
      batches.push(validUrls.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (url) => {
        try {
          const response = await this.scrapeUrl(url, options);
          if (response.success && response.data) {
            results.push(response.data);
          } else {
            errors.push(`${url}: ${response.error}`);
          }
        } catch (error) {
          errors.push(`${url}: ${formatErrorMessage(error)}`);
        }
      });

      await Promise.allSettled(batchPromises);

      // Add delay between batches to respect rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return {
      success: results.length > 0,
      data: results,
      error: errors.length > 0 ? `Some URLs failed: ${errors.join(', ')}` : undefined,
    };
  }

  /**
   * Scrape a website's sitemap
   */
  async scrapeSitemap(
    sitemapUrl: string,
    maxUrls: number = 50,
    options: ScrapeOptions = {}
  ): Promise<ApiResponse<ScrapedData[]>> {
    // First scrape the sitemap to get URLs
    const sitemapResponse = await this.scrapeUrl(sitemapUrl, {
      formats: ['html', 'markdown'],
      onlyMainContent: false,
    });

    if (!sitemapResponse.success || !sitemapResponse.data) {
      return {
        success: false,
        error: `Failed to scrape sitemap: ${sitemapResponse.error}`,
      };
    }

    // Extract URLs from sitemap
    const content = sitemapResponse.data.html + sitemapResponse.data.markdown;
    const urlRegex = /<loc>(.*?)<\/loc>/g;
    const urls: string[] = [];
    let match;

    while ((match = urlRegex.exec(content)) !== null) {
      const url = match[1].trim();
      if (isValidUrl(url)) {
        urls.push(url);
      }
    }

    if (urls.length === 0) {
      return {
        success: false,
        error: 'No valid URLs found in sitemap',
      };
    }

    // Limit URLs to prevent overwhelming the system
    const limitedUrls = urls.slice(0, maxUrls);

    return this.scrapeUrls(limitedUrls, options);
  }

  /**
   * Extract specific data from scraped content using patterns
   */
  extractData(
    scrapedData: ScrapedData,
    patterns: { [key: string]: RegExp }
  ): { [key: string]: string[] } {
    const extracted: { [key: string]: string[] } = {};

    Object.entries(patterns).forEach(([key, pattern]) => {
      const matches: string[] = [];
      const content = `${scrapedData.text} ${scrapedData.markdown}`;

      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches.push(match[1] || match[0]);
      }

      extracted[key] = matches;
    });

    return extracted;
  }

  /**
   * Get website's main pages for comprehensive analysis
   */
  getImportantPages(domain: string): string[] {
    const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;

    return [
      baseUrl,
      `${baseUrl}/about`,
      `${baseUrl}/about-us`,
      `${baseUrl}/team`,
      `${baseUrl}/company`,
      `${baseUrl}/products`,
      `${baseUrl}/services`,
      `${baseUrl}/solutions`,
      `${baseUrl}/pricing`,
      `${baseUrl}/plans`,
      `${baseUrl}/features`,
      `${baseUrl}/customers`,
      `${baseUrl}/case-studies`,
      `${baseUrl}/testimonials`,
      `${baseUrl}/blog`,
      `${baseUrl}/news`,
      `${baseUrl}/press`,
      `${baseUrl}/careers`,
      `${baseUrl}/jobs`,
      `${baseUrl}/contact`,
      `${baseUrl}/support`,
      `${baseUrl}/help`,
      `${baseUrl}/api`,
      `${baseUrl}/docs`,
      `${baseUrl}/documentation`,
      `${baseUrl}/integrations`,
      `${baseUrl}/partners`,
    ].filter(url => isValidUrl(url));
  }

  /**
   * Perform comprehensive competitor website analysis
   */
  async analyzeCompetitorWebsite(
    domain: string,
    maxPages: number = 15,
    options: ScrapeOptions = {}
  ): Promise<ApiResponse<{
    domain: string;
    pages: ScrapedData[];
    analysis: {
      totalPages: number;
      successfulScrapes: number;
      failedScrapes: number;
      totalContent: number;
      avgPageSize: number;
      commonKeywords: string[];
    };
  }>> {
    const importantPages = this.getImportantPages(domain);
    const pagesToScrape = importantPages.slice(0, maxPages);

    const scrapeResponse = await this.scrapeUrls(pagesToScrape, {
      ...options,
      onlyMainContent: true,
      excludeTags: ['script', 'style', 'nav', 'footer', 'ads', 'cookie', 'popup'],
    });

    if (!scrapeResponse.success || !scrapeResponse.data) {
      return {
        success: false,
        error: scrapeResponse.error || 'Failed to scrape competitor website',
      };
    }

    const pages = scrapeResponse.data;
    const successfulScrapes = pages.filter(p => p.success).length;
    const totalContent = pages.reduce((sum, p) => sum + p.text.length, 0);
    const avgPageSize = totalContent / pages.length;

    // Extract common keywords (simple implementation)
    const allText = pages.map(p => p.text.toLowerCase()).join(' ');
    const words = allText.match(/\b\w{4,}\b/g) || [];
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonKeywords = Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word);

    return {
      success: true,
      data: {
        domain,
        pages,
        analysis: {
          totalPages: pagesToScrape.length,
          successfulScrapes,
          failedScrapes: pagesToScrape.length - successfulScrapes,
          totalContent,
          avgPageSize,
          commonKeywords,
        },
      },
    };
  }

  /**
   * Health check for Firecrawl API
   */
  async healthCheck(): Promise<ApiResponse<boolean>> {
    const testUrl = 'https://example.com';

    const response = await this.scrapeUrl(testUrl, {
      formats: ['markdown'],
      onlyMainContent: true,
      timeout: 30000,
    });

    return {
      success: response.success,
      data: !!(response.success && response.data?.text && response.data.text.length > 0),
      error: response.error,
    };
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