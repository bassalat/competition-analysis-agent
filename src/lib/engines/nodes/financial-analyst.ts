/**
 * Financial Analyst - Researches financial data and metrics
 * Follows the exact implementation from company-research-agent repository
 */

import { BaseResearcher, UpdateCallback } from './base-researcher';
import { ResearchState, RESEARCH_PROMPTS } from '@/types/research';

export class FinancialAnalyst extends BaseResearcher {
  async analyze(
    state: ResearchState,
    onUpdate?: UpdateCallback
  ): Promise<{ message: string; financial_data: Record<string, any>; analyst_type: string; queries: string[] }> {
    const company = state.company;
    const industry = state.industry;

    // Update current step
    state.currentStep = 'financial_analyst';

    try {
      // Generate search queries using exact prompt from repository
      await this.sendUpdate(
        state,
        'Generating financial analysis queries',
        undefined,
        onUpdate
      );

      const queries = await this.generateQueries(state, RESEARCH_PROMPTS.FINANCIAL);

      // Send subqueries update (matching repo format)
      const subqueriesMsg = "🔍 Subqueries for financial analysis:\n" +
        queries.map(query => `• ${query}`).join('\n');

      await this.sendUpdate(
        state,
        'Financial analysis queries generated',
        {
          queries,
          step: 'Financial Analyst',
          analyst_type: 'Financial Analyst'
        },
        onUpdate
      );

      // Process site scrape data
      let financial_data: Record<string, any> = {};

      // Include site_scrape data for financial analysis (following repo pattern)
      if (state.site_scrape) {
        const siteCount = Object.keys(state.site_scrape).length;
        console.log(`📊 Including ${siteCount} pages from company website...`);
        financial_data = { ...state.site_scrape };

        await this.sendUpdate(
          state,
          `Including ${siteCount} pages from company website`,
          { sitePages: siteCount },
          onUpdate
        );
      }

      // Perform searches for each query
      for (const query of queries) {
        try {
          await this.sendUpdate(
            state,
            `Searching: ${query}`,
            { currentQuery: query },
            onUpdate
          );

          const searchResults = await this.searchDocuments(state, [query]);

          for (const [url, doc] of Object.entries(searchResults)) {
            financial_data[url] = doc;
          }
        } catch (error) {
          console.error(`Error searching for query "${query}":`, error);
        }
      }

      // Scrape top URLs for full content
      if (Object.keys(financial_data).length > 0) {
        await this.sendUpdate(
          state,
          'Scraping financial web pages',
          { documentsToScrape: Math.min(2, Object.keys(financial_data).length) },
          onUpdate
        );

        financial_data = await this.scrapeDocuments(financial_data, 2);
      }

      // Final status update
      const completionMsg = `Completed analysis with ${Object.keys(financial_data).length} documents`;

      await this.sendUpdate(
        state,
        `Used Serper Search to find ${Object.keys(financial_data).length} documents`,
        {
          step: 'Searching',
          analyst_type: 'Financial Analyst',
          queries,
          documentsFound: Object.keys(financial_data).length
        },
        onUpdate
      );

      // Update state
      state.financial_data = financial_data;

      // Send completion status with final queries
      await this.sendUpdate(
        state,
        completionMsg,
        {
          analyst_type: 'Financial Analyst',
          queries,
          documents_found: Object.keys(financial_data).length
        },
        onUpdate
      );

      return {
        message: completionMsg,
        financial_data: financial_data,
        analyst_type: 'financial_analyzer',
        queries: queries
      };

    } catch (error) {
      const errorMsg = `Financial analysis failed: ${error}`;
      console.error('Financial analyst error:', error);

      // Send error status
      await this.sendUpdate(
        state,
        errorMsg,
        {
          analyst_type: 'Financial Analyst',
          error: String(error)
        },
        onUpdate
      );

      throw error; // Re-raise to maintain error flow
    }
  }
}