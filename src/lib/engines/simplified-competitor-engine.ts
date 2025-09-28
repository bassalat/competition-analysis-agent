/**
 * Simplified Competitor Analysis Engine
 *
 * A streamlined approach to competitive intelligence with full transparency:
 * 1. Generate search queries with Claude (1 call)
 * 2. Execute searches with Serper
 * 3. Prioritize URLs with Claude (1 call)
 * 4. Scrape content with Firecrawl
 * 5. Synthesize report with Claude (1 call)
 *
 * Target: $0.20 per competitor with full raw data preserved
 */

import { getClaudeClient } from '@/lib/api-clients/claude-client';
import { getSerperClient } from '@/lib/api-clients/serper-client';
import { getFirecrawlClient } from '@/lib/api-clients/firecrawl-client';
import { globalCostTracker } from '@/lib/cost-tracker';
import type { BusinessContext } from '@/types/api';

export interface Competitor {
  name: string;
  website?: string;
  description?: string;
}

export interface SearchQuery {
  query: string;
  purpose: string;
}

export interface SearchResult {
  query: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

export interface PrioritizedUrl {
  url: string;
  reason: string;
  source: string;
}

export interface ScrapedContent {
  url: string;
  content: string;
  success: boolean;
  error?: string;
}

export interface CompetitorAnalysisResult {
  competitor: Competitor;
  searchQueries: SearchQuery[];
  searchResults: SearchResult[];
  prioritizedUrls: PrioritizedUrl[];
  scrapedContent: ScrapedContent[];
  finalReport: string;
  metadata: {
    totalCost: number;
    timestamp: string;
    success: boolean;
    error?: string;
  };
}

export class SimplifiedCompetitorEngine {
  private claude = getClaudeClient();
  private serper = getSerperClient();
  private firecrawl = getFirecrawlClient();

  /**
   * Analyze a single competitor using the 5-step process
   */
  async analyzeCompetitor(
    competitor: Competitor,
    businessContext?: BusinessContext,
    progressCallback?: (step: string, progress: number) => void,
    detailCallback?: (type: string, data: Record<string, unknown>) => void
  ): Promise<CompetitorAnalysisResult> {
    const result: CompetitorAnalysisResult = {
      competitor,
      searchQueries: [],
      searchResults: [],
      prioritizedUrls: [],
      scrapedContent: [],
      finalReport: '',
      metadata: {
        totalCost: 0,
        timestamp: new Date().toISOString(),
        success: false
      }
    };

    try {
      // Step 1: Generate search queries
      progressCallback?.('Generating search queries...', 5);
      result.searchQueries = await this.generateSearchQueries(competitor, detailCallback);

      // Step 2: Execute searches
      progressCallback?.('Searching for information...', 20);
      result.searchResults = await this.executeSearches(result.searchQueries, detailCallback);

      // Step 3: Prioritize URLs
      progressCallback?.('Prioritizing sources...', 35);
      result.prioritizedUrls = await this.prioritizeUrls(competitor, result.searchResults, detailCallback);

      // Step 4: Scrape content
      progressCallback?.('Scraping content...', 60);
      result.scrapedContent = await this.scrapeContent(result.prioritizedUrls, detailCallback);

      // Step 5: Synthesize report
      progressCallback?.('Synthesizing report...', 80);
      result.finalReport = await this.synthesizeReport(competitor, result, progressCallback);

      result.metadata.success = true;
      progressCallback?.('Analysis complete!', 100);

    } catch (error) {
      result.metadata.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Competitor analysis failed for ${competitor.name}:`, error);
    }

    result.metadata.totalCost = globalCostTracker.getSessionCosts().totalCost;
    return result;
  }

  /**
   * Step 1: Generate comprehensive search queries using Claude Haiku
   */
  private async generateSearchQueries(competitor: Competitor, detailCallback?: (type: string, data: Record<string, unknown>) => void): Promise<SearchQuery[]> {
    const prompt = `Generate effective search queries for competitive intelligence on "${competitor.name}".

Create queries that balance specificity with broad coverage to ensure we find relevant information:

**Target Information Areas:**
- Company overview and business model
- Products and key offerings
- Market position and industry standing
- Financial status and funding
- Recent news and developments
- Leadership and company size
- Technology and competitive advantages
- Customer base and pricing

**Query Guidelines:**
- Use 2-4 word queries that are focused but not overly specific
- Mix company name with key terms like "business model", "products", "funding", "news"
- Include some broader industry queries without company name
- Aim for 10-12 queries total
- Avoid lengthy, complex search terms that yield poor results

**Examples of GOOD queries:**
- "Acme Corp products" - Simple, effective
- "Acme Corp funding" - Direct and searchable
- "Acme Corp recent news" - Catches latest updates
- "software testing market leaders" - Industry context without company name

**Examples of BAD queries:**
- "Acme Corp comprehensive business model analysis and competitive positioning" - Too long/specific
- "Acme" - Too generic
- "What are Acme Corp's key differentiators in the enterprise software market" - Question format

Format as:
- [Query] - [Purpose]
- [Query] - [Purpose]
...`;

    const response = await this.claude.complete(prompt, {
      model: 'claude-3-5-haiku-20241022', // Use Haiku for cost efficiency
      maxTokens: 1000,
      temperature: 0.3
    });

    if (!response.success || !response.data) {
      throw new Error(`Failed to generate search queries: ${response.error || 'No data returned'}`);
    }

    const queries = this.parseSearchQueries(response.data);

    // Stream the generated queries
    detailCallback?.('queries_generated', {
      queries: queries.map(q => ({ query: q.query, purpose: q.purpose })),
      count: queries.length
    });

    return queries;
  }

  /**
   * Parse search queries from Claude's markdown response
   */
  private parseSearchQueries(response: string): SearchQuery[] {
    const queries: SearchQuery[] = [];
    const lines = response.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        const content = trimmed.substring(2);
        const dashIndex = content.lastIndexOf(' - ');

        if (dashIndex > 0) {
          const query = content.substring(0, dashIndex).replace(/["""]/g, '').trim();
          const purpose = content.substring(dashIndex + 3).trim();

          if (query.length > 0) {
            queries.push({ query, purpose });
          }
        }
      }
    }

    console.log(`Generated ${queries.length} search queries for competitive intelligence`);
    return queries;
  }

  /**
   * Step 2: Execute all search queries using Serper
   */
  private async executeSearches(queries: SearchQuery[], detailCallback?: (type: string, data: Record<string, unknown>) => void): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const { query } of queries) {
      try {
        // Stream search progress
        detailCallback?.('search_started', { query });

        const searchResponse = await this.serper.search(query, {
          maxResults: 10,
          country: 'us',
          language: 'en'
        });

        if (searchResponse.success && searchResponse.data) {
          const searchResult = {
            query,
            results: searchResponse.data.map(result => ({
              title: result.title || '',
              url: result.link || '',
              snippet: result.snippet || ''
            }))
          };

          results.push(searchResult);

          // Stream search results
          detailCallback?.('search_completed', {
            query,
            resultCount: searchResult.results.length,
            results: searchResult.results.slice(0, 3) // Send first 3 results as preview
          });
        } else {
          detailCallback?.('search_failed', { query, error: 'No results found' });
        }

        // Rate limiting - wait between searches
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.warn(`Search failed for query "${query}":`, error);
      }
    }

    const totalResults = results.reduce((sum, r) => sum + r.results.length, 0);
    console.log(`Executed ${results.length} searches, found ${totalResults} total results`);

    return results;
  }

  /**
   * Step 3: Prioritize URLs for scraping using Claude Haiku
   */
  private async prioritizeUrls(competitor: Competitor, searchResults: SearchResult[], detailCallback?: (type: string, data: Record<string, unknown>) => void): Promise<PrioritizedUrl[]> {
    const allUrls = searchResults.flatMap(sr =>
      sr.results.map(r => ({
        url: r.url,
        title: r.title,
        snippet: r.snippet,
        source: sr.query
      }))
    );

    if (allUrls.length === 0) {
      return [];
    }

    const urlsText = allUrls.map((item, index) =>
      `${index + 1}. **${item.title}**\n   URL: ${item.url}\n   Snippet: ${item.snippet}\n   Source: ${item.source}`
    ).join('\n\n');

    const prompt = `Review these search results for "${competitor.name}" and select the TOP 20 URLs to scrape for competitive intelligence.

**Search Results:**
${urlsText}

**Selection Priority (in order):**

1. **Funding/M&A Sources:**
   - Crunchbase, PitchBook company profiles
   - PRNewswire, BusinessWire press releases
   - Company press rooms/investor relations pages
   - TechCrunch, Forbes, Bloomberg tech coverage
   - Venture capital firm portfolio pages

2. **Analyst Coverage:**
   - Gartner, Forrester, IDC, GigaOm reports and mentions
   - Analyst blogs and research notes
   - Industry quadrants and wave reports
   - Consulting firm case studies

3. **Product Intelligence:**
   - Official company product pages and specs
   - Documentation, API docs, developer portals
   - GitHub repositories and technical content
   - Product Hunt, G2, Capterra, TrustRadius profiles
   - Release notes, changelogs, product roadmaps
   - Status pages and technical blogs

4. **GTM/Brand Intelligence:**
   - Company blog and official newsroom
   - Conference speaker listings and presentations
   - Partner/marketplace listings (AWS, Salesforce, etc.)
   - Case studies and customer testimonials
   - Webinar and event archives

5. **Hiring/Expansion Intelligence:**
   - LinkedIn company pages and job postings
   - Indeed, Glassdoor company profiles
   - Office location and expansion announcements
   - Team page and leadership bios

6. **Ambient Intelligence:**
   - Recent news mentions and industry coverage
   - Social media company updates (not personal profiles)
   - Industry forum discussions and mentions
   - Podcast appearances and interviews

**Domain Priority Examples:**
- Highest: crunchbase.com, pitchbook.com, gartner.com, forrester.com
- High: prnewswire.com, businesswire.com, techcrunch.com, forbes.com
- High: official company domains, github.com, g2.com, capterra.com
- Medium: linkedin.com/company, glassdoor.com, indeed.com

**Only avoid:**
- Obvious spam or unrelated content
- Dead links or error pages
- Personal social media profiles
- Generic business directories without substance

**Important:** Prioritize sources that provide deep competitive intelligence. Target exactly 20 URLs for maximum coverage across all intelligence categories.

Format as:
- [URL] - [Brief reason and category]
- [URL] - [Brief reason and category]
...

Select exactly 20 URLs, prioritizing the high-value data sources above.`;

    const response = await this.claude.complete(prompt, {
      model: 'claude-3-5-haiku-20241022', // Use Haiku for cost efficiency
      maxTokens: 1000,
      temperature: 0.3
    });

    if (!response.success || !response.data) {
      throw new Error(`Failed to prioritize URLs: ${response.error || 'No data returned'}`);
    }

    const prioritized = this.parsePrioritizedUrls(response.data, allUrls);

    // Stream prioritized URLs
    detailCallback?.('urls_prioritized', {
      totalUrls: allUrls.length,
      selectedUrls: prioritized.length,
      urls: prioritized.map(p => ({
        url: p.url,
        reason: p.reason,
        source: p.source
      }))
    });

    // Fallback: If we got fewer than 5 URLs, add the top results directly
    if (prioritized.length < 5 && allUrls.length > 0) {
      const fallbackUrls = allUrls
        .slice(0, Math.min(10, allUrls.length))
        .filter(url => !prioritized.some(p => p.url === url.url))
        .map(url => ({
          url: url.url,
          reason: 'Fallback selection - ensuring minimum coverage',
          source: url.source
        }));

      prioritized.push(...fallbackUrls);
      console.log(`Added ${fallbackUrls.length} fallback URLs to ensure minimum coverage`);

      // Stream fallback URLs
      if (fallbackUrls.length > 0) {
        detailCallback?.('fallback_urls_added', {
          fallbackCount: fallbackUrls.length,
          urls: fallbackUrls
        });
      }
    }

    return prioritized;
  }

  /**
   * Parse prioritized URLs from Claude's response
   */
  private parsePrioritizedUrls(response: string, allUrls: Array<{url: string, source: string}>): PrioritizedUrl[] {
    const prioritized: PrioritizedUrl[] = [];
    const lines = response.split('\n');

    console.log('=== Claude Response Debug ===');
    console.log('Response length:', response.length);
    console.log('First 500 chars:', response.substring(0, 500));
    console.log('Lines count:', lines.length);

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and headers
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('**')) {
        continue;
      }

      // Look for lines starting with dash OR numbered lists
      if (trimmed.startsWith('- ') || /^\d+\.\s/.test(trimmed)) {
        // Handle both "- URL" and "1. URL" formats
        const content = trimmed.startsWith('- ')
          ? trimmed.substring(2).trim()
          : trimmed.replace(/^\d+\.\s/, '').trim();

        // Try multiple parsing approaches
        let url = '';
        let reason = '';

        // Approach 1: Extract URL from brackets [URL]
        const bracketMatch = content.match(/\[([^\]]+)\]/);
        if (bracketMatch && bracketMatch[1].startsWith('http')) {
          url = bracketMatch[1];
          reason = content.replace(/\[[^\]]+\]/, '').replace(/^[\s\-]+|[\s\-]+$/g, '').trim();
        }
        // Approach 2: Extract first HTTP URL found in the line
        else {
          const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
          if (urlMatch) {
            url = urlMatch[1];
            // Remove the URL and any surrounding dashes/spaces to get reason
            reason = content.replace(urlMatch[1], '').replace(/^[\s\-]+|[\s\-]+$/g, '').trim();
          }
        }

        // Clean up URL (remove trailing punctuation)
        url = url.replace(/[,\.\)\]]+$/, '');

        if (url && url.startsWith('http')) {
          // Find the source query for this URL
          const urlData = allUrls.find(u => u.url === url);
          const source = urlData?.source || 'Unknown';

          prioritized.push({ url, reason: reason || 'Competitive intelligence source', source });
          console.log(`✓ Extracted URL: ${url}`);
        } else {
          console.log(`✗ Failed to extract URL from: "${content}"`);
        }
      }
    }

    console.log(`=== Prioritization Result: ${prioritized.length} URLs extracted ===`);
    return prioritized;
  }

  /**
   * Step 4: Scrape content from prioritized URLs using Firecrawl
   */
  private async scrapeContent(prioritizedUrls: PrioritizedUrl[], detailCallback?: (type: string, data: Record<string, unknown>) => void): Promise<ScrapedContent[]> {
    const scrapedContent: ScrapedContent[] = [];

    for (let i = 0; i < prioritizedUrls.length; i++) {
      const urlData = prioritizedUrls[i];
      try {
        // Stream scraping progress
        detailCallback?.('scraping_started', {
          url: urlData.url,
          progress: Math.round(((i + 1) / prioritizedUrls.length) * 100),
          currentIndex: i + 1,
          totalUrls: prioritizedUrls.length
        });

        const scrapeResponse = await this.firecrawl.scrapeUrl(urlData.url, {
          formats: ['markdown'],
          onlyMainContent: true,
          waitFor: 2000
        });

        if (scrapeResponse.success && scrapeResponse.data?.markdown) {
          const content = {
            url: urlData.url,
            content: scrapeResponse.data.markdown,
            success: true
          };
          scrapedContent.push(content);

          // Stream successful scrape
          detailCallback?.('scraping_completed', {
            url: urlData.url,
            success: true,
            contentLength: scrapeResponse.data.markdown.length,
            preview: scrapeResponse.data.markdown.substring(0, 150) + '...'
          });
        } else {
          const content = {
            url: urlData.url,
            content: '',
            success: false,
            error: scrapeResponse.error || 'No content returned'
          };
          scrapedContent.push(content);

          // Stream failed scrape
          detailCallback?.('scraping_failed', {
            url: urlData.url,
            error: content.error
          });
        }

        // Rate limiting - wait between scrapes
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.warn(`Scraping failed for ${urlData.url}:`, error);
        scrapedContent.push({
          url: urlData.url,
          content: '',
          success: false,
          error: error instanceof Error ? error.message : 'Scraping failed'
        });
      }
    }

    const successfulScrapes = scrapedContent.filter(sc => sc.success).length;
    console.log(`Scraped ${successfulScrapes}/${scrapedContent.length} URLs successfully`);

    return scrapedContent;
  }

  /**
   * Step 5: Synthesize comprehensive report using Claude Sonnet
   */
  private async synthesizeReport(competitor: Competitor, analysisData: CompetitorAnalysisResult, progressCallback?: (step: string, progress: number) => void): Promise<string> {
    const successfulContent = analysisData.scrapedContent.filter(sc => sc.success);

    if (successfulContent.length === 0) {
      return `# ${competitor.name} - Competitive Intelligence Report

## ⚠️ Limited Data Analysis

**Analysis Status:** Limited data available - scraping failed for all sources

### Research Attempted
- **Search Queries Generated:** ${analysisData.searchQueries.length}
- **Search Results Found:** ${analysisData.searchResults.reduce((sum, sr) => sum + sr.results.length, 0)}
- **URLs Attempted:** ${analysisData.scrapedContent.length}

### Search Queries Used
${analysisData.searchQueries.map(q => `- "${q.query}" - ${q.purpose}`).join('\n')}

### Available Competitor Information
- **Name:** ${competitor.name}
- **Website:** ${competitor.website || 'Not provided'}
- **Description:** ${competitor.description || 'No description provided'}

### Next Steps Required
1. Verify competitor website accessibility and permissions
2. Try alternative search terms or sources
3. Consider manual research through LinkedIn, company reports, or industry publications
4. Check if the competitor has alternative domain names or subsidiaries

---
*Note: This analysis was limited by data availability. For comprehensive competitive intelligence, additional manual research may be required.*`;
    }

    // Build comprehensive content analysis
    const detailedSources = successfulContent.map(sc => {
      const preview = sc.content.substring(0, 400) + (sc.content.length > 400 ? '...' : '');
      return `### 📄 Source: [${sc.url}](${sc.url})
**Content Preview:**
${preview}

**Key Information Found:**
${this.extractKeyPoints(sc.content).join('\n')}

---`;
    }).join('\n');

    const searchInsights = analysisData.searchResults.map(sr => {
      const topResults = sr.results.slice(0, 3).map(r =>
        `- [${r.title}](${r.url})\n  *${r.snippet}*`
      ).join('\n');
      return `**Query:** "${sr.query}"\n**Top Results:**\n${topResults}`;
    }).join('\n\n');

    const prompt = `Create a comprehensive competitive intelligence report for "${competitor.name}" based on the research data below. This report should be a complete analysis that provides actionable insights without requiring additional external research.

**COMPETITOR INFORMATION:**
- Name: ${competitor.name}
- Website: ${competitor.website || 'Not provided'}
- Description: ${competitor.description || 'No description provided'}

**SEARCH RESEARCH SUMMARY:**
${searchInsights}

**DETAILED SOURCE ANALYSIS:**
${detailedSources}

**SCRAPED CONTENT FOR ANALYSIS:**
${successfulContent.map(sc =>
  `**Source:** ${sc.url}\n**Full Content:**\n${sc.content.substring(0, 4000)}${sc.content.length > 4000 ? '\n[Content truncated - analysis based on first 4000 characters]' : ''}`
).join('\n\n=== END SOURCE ===\n\n')}

**REPORT REQUIREMENTS:**
Create a detailed, linear competitive intelligence report with the following structure. Include specific information found in the sources and cite the source URLs where information was found.

# ${competitor.name} - Comprehensive Competitive Intelligence Report

## 🎯 Executive Summary
[Provide a 3-4 sentence executive summary of who this competitor is, what they do, and their significance in the market]

## 🏢 Company Overview
- **Business Model:** [Detailed explanation of how they make money - subscription, one-time purchase, freemium, etc.]
- **Industry/Sector:** [Specific industry and sub-sectors they operate in]
- **Founded:** [Year founded if available]
- **Headquarters:** [Location if available]
- **Company Size:** [Employee count, revenue estimates, or other size indicators if available]
- **Leadership:** [Key executives or founders if mentioned]

## 🛠️ Products & Services Analysis
[Detailed breakdown of their main offerings, features, and how they position each product. Include pricing information if found.]

## 📊 Market Position & Strategy
- **Target Market:** [Detailed description of their customer segments]
- **Competitive Positioning:** [How they position themselves vs competitors]
- **Key Differentiators:** [What makes them unique or their claimed advantages]
- **Marketing Strategy:** [How they promote themselves, key messaging]

## 💰 Business & Financial Information
[Any available information about funding, revenue, growth, business model details, partnerships]

## 📈 Recent Developments & News
[Recent updates, product launches, partnerships, funding rounds, management changes - focus on last 6-12 months]

## ⚔️ Competitive Threats & Opportunities
### Strengths:
[Key competitive advantages they have]

### Weaknesses:
[Potential vulnerabilities or gaps in their offering]

### Threat Level Assessment:
[High/Medium/Low threat level with detailed reasoning]

## 🎯 Strategic Intelligence & Action Items
### Key Takeaways:
[Most important insights about this competitor]

### Recommended Actions:
[Specific actionable recommendations for how to compete against them]

### Monitoring Priorities:
[What aspects of this competitor should be tracked ongoing]

## 📚 Sources & References
[List all source URLs used in this analysis with brief descriptions of what was found in each]

**CRITICAL INSTRUCTIONS:**
1. Be extremely specific and detailed - this report should be comprehensive enough that the reader doesn't need to do additional research
2. Always cite the source URL when mentioning specific information: "(Source: [URL])"
3. If information is not available in the sources, clearly state "Information not available in current sources"
4. Focus on actionable competitive intelligence throughout
5. Include specific quotes or data points from sources when relevant
6. Make the threat assessment realistic and well-reasoned
7. Ensure the strategic recommendations are specific and implementable`;

    // Provide progressive updates during Claude API call
    progressCallback?.('Preparing Claude API request...', 82);

    // Start the Claude API call with a timeout for long operations
    progressCallback?.('Calling Claude AI for report synthesis...', 85);

    // Create a progress updater during the long Claude operation
    const progressTimer = setInterval(() => {
      const messages = [
        'Claude AI is analyzing scraped content...',
        'Generating comprehensive competitive analysis...',
        'Synthesizing strategic insights...',
        'Finalizing competitive intelligence report...'
      ];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      progressCallback?.(randomMessage, 87 + Math.random() * 5); // 87-92% progress
    }, 5000); // Update every 5 seconds

    try {
      const response = await this.claude.complete(prompt, {
        model: 'claude-sonnet-4-20250514', // Use Sonnet 4 for high-quality synthesis
        maxTokens: 4000, // Increased for more comprehensive reports
        temperature: 0.2 // Lower temperature for more factual, structured output
      });

      clearInterval(progressTimer);
      progressCallback?.('Report synthesis complete!', 95);

      if (!response.success || !response.data) {
        throw new Error(`Failed to synthesize report: ${response.error || 'No data returned'}`);
      }

      return response.data;
    } catch (error) {
      clearInterval(progressTimer);
      throw error;
    }
  }

  /**
   * Extract key points from scraped content
   */
  private extractKeyPoints(content: string): string[] {
    const points: string[] = [];

    // Look for pricing information
    if (content.toLowerCase().includes('price') || content.toLowerCase().includes('$') || content.toLowerCase().includes('cost')) {
      points.push('• Contains pricing/cost information');
    }

    // Look for product information
    if (content.toLowerCase().includes('product') || content.toLowerCase().includes('service') || content.toLowerCase().includes('feature')) {
      points.push('• Contains product/service details');
    }

    // Look for company information
    if (content.toLowerCase().includes('founded') || content.toLowerCase().includes('company') || content.toLowerCase().includes('about')) {
      points.push('• Contains company background information');
    }

    // Look for competitive information
    if (content.toLowerCase().includes('competitor') || content.toLowerCase().includes('versus') || content.toLowerCase().includes('compare')) {
      points.push('• Contains competitive analysis');
    }

    // Look for recent news
    if (content.toLowerCase().includes('2024') || content.toLowerCase().includes('2025') || content.toLowerCase().includes('news') || content.toLowerCase().includes('announcement')) {
      points.push('• Contains recent developments');
    }

    if (points.length === 0) {
      points.push('• General company/business information');
    }

    return points;
  }
}

/**
 * Get singleton instance of the simplified competitor engine
 */
let engineInstance: SimplifiedCompetitorEngine | null = null;

export function getSimplifiedCompetitorEngine(): SimplifiedCompetitorEngine {
  if (!engineInstance) {
    engineInstance = new SimplifiedCompetitorEngine();
  }
  return engineInstance;
}