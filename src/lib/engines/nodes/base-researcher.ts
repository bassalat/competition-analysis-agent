/**
 * Base researcher class that all research nodes extend
 * Follows the exact pattern from company-research-agent repository
 */

import { getClaudeClient } from '@/lib/api-clients/claude-client';
import { getSerperClient } from '@/lib/api-clients/serper-client';
import { getFirecrawlClient } from '@/lib/api-clients/firecrawl-client';
import { config } from '@/lib/config';
import { ResearchState, DocumentData, ResearchUpdate } from '@/types/research';

export interface UpdateCallback {
  (update: ResearchUpdate): Promise<void>;
}

export abstract class BaseResearcher {
  protected claude = getClaudeClient();
  protected serper = getSerperClient();
  protected firecrawl = getFirecrawlClient();

  constructor() {}

  /**
   * Generate search queries using Claude with the exact prompt pattern from repo
   */
  protected async generateQueries(
    state: ResearchState,
    promptTemplate: string
  ): Promise<string[]> {
    const prompt = promptTemplate
      .replace('{company}', state.company)
      .replace('{industry}', state.industry);

    console.log(`🧠 Generating queries for ${state.company} with prompt template`);

    try {
      const response = await this.claude.complete(
        `${prompt}\n\nGenerate 3-4 specific search queries. Return only the queries, one per line, no numbering or bullet points.`,
        {
          model: config.claude.quickModel, // Use Haiku for query generation
          maxTokens: 200,
          temperature: 0.7,
        }
      );

      if (!response.success || !response.data) {
        throw new Error('Failed to generate queries');
      }

      const queries = response.data
        .split('\n')
        .map(q => q.trim())
        .filter(q => q.length > 0 && !q.match(/^\d+\./) && !q.startsWith('•') && !q.startsWith('-'))
        .slice(0, 4); // Limit to 4 queries

      console.log(`✅ Generated ${queries.length} queries:`, queries);
      return queries;
    } catch (error) {
      console.error(`❌ Error generating queries:`, error);
      // Fallback queries if LLM fails
      return [
        `${state.company} company information`,
        `${state.company} ${state.industry} analysis`,
        `${state.company} business model`,
      ];
    }
  }

  /**
   * Search for documents using Serper (replacing Tavily from original repo)
   */
  protected async searchDocuments(
    state: ResearchState,
    queries: string[]
  ): Promise<Record<string, DocumentData>> {
    const documents: Record<string, DocumentData> = {};

    for (const query of queries) {
      try {
        console.log(`🔍 Searching: "${query}"`);

        const searchResponse = await this.serper.search(query, { num: 8 });

        if (!searchResponse.success || !searchResponse.data) {
          console.warn(`⚠️ Search failed for query: ${query}`);
          continue;
        }

        for (const result of searchResponse.data) {
          if (!result.link || documents[result.link]) {
            continue; // Skip if no link or already processed
          }

          documents[result.link] = {
            url: result.link,
            title: result.title,
            content: result.snippet || '',
            snippet: result.snippet,
            query: query,
            date: result.date,
            position: result.position,
            source: 'serper',
          };
        }
      } catch (error) {
        console.error(`❌ Search error for query "${query}":`, error);
      }
    }

    console.log(`📊 Found ${Object.keys(documents).length} unique documents`);
    return documents;
  }

  /**
   * Scrape content from selected URLs using Firecrawl
   */
  protected async scrapeDocuments(
    documents: Record<string, DocumentData>,
    maxUrls: number = 3
  ): Promise<Record<string, DocumentData>> {
    const urlsToScrape = Object.keys(documents)
      .slice(0, maxUrls)
      .filter(url => url.startsWith('http'));

    if (urlsToScrape.length === 0) {
      console.log('📄 No URLs to scrape');
      return documents;
    }

    console.log(`🔥 Scraping ${urlsToScrape.length} URLs`);

    try {
      const scrapeResponse = await this.firecrawl.scrapeMultiple(urlsToScrape, {
        onlyMainContent: true,
        timeout: 30000,
      });

      if (!scrapeResponse.success || !scrapeResponse.data) {
        console.warn('⚠️ Firecrawl scraping failed');
        return documents;
      }

      for (const result of scrapeResponse.data) {
        if (result.success && result.content.trim() && documents[result.url]) {
          documents[result.url] = {
            ...documents[result.url],
            content: result.content,
            source: 'firecrawl',
            scraped_at: new Date().toISOString(),
          };
        }
      }

      const scrapedCount = Object.values(documents).filter(
        doc => doc.source === 'firecrawl'
      ).length;

      console.log(`✅ Successfully scraped ${scrapedCount} documents`);
    } catch (error) {
      console.error('❌ Scraping error:', error);
    }

    return documents;
  }

  /**
   * Send status update (for SSE streaming)
   */
  protected async sendUpdate(
    state: ResearchState,
    message: string,
    data?: any,
    onUpdate?: UpdateCallback
  ): Promise<void> {
    if (onUpdate && state.currentStep) {
      await onUpdate({
        type: 'status',
        step: state.currentStep,
        node: this.constructor.name,
        message,
        data,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Abstract method that each research node must implement
   */
  abstract analyze(
    state: ResearchState,
    onUpdate?: UpdateCallback
  ): Promise<{ message: string; [key: string]: any }>;

  /**
   * Main run method that wraps the analyze method
   */
  async run(
    state: ResearchState,
    onUpdate?: UpdateCallback
  ): Promise<ResearchState> {
    try {
      const result = await this.analyze(state, onUpdate);

      // Add result message to state
      if (!state.messages) {
        state.messages = [];
      }
      state.messages.push({
        role: 'assistant',
        content: result.message,
      });

      return state;
    } catch (error) {
      console.error(`❌ Error in ${this.constructor.name}:`, error);

      if (onUpdate && state.currentStep) {
        await onUpdate({
          type: 'error',
          step: state.currentStep,
          node: this.constructor.name,
          message: `Error in ${this.constructor.name}: ${error}`,
          timestamp: new Date().toISOString(),
        });
      }

      state.error = `${this.constructor.name} failed: ${error}`;
      return state;
    }
  }
}