/**
 * Industry Analyzer - Researches industry analysis and market position
 * Follows the exact implementation from company-research-agent repository
 */

import { BaseResearcher, UpdateCallback } from './base-researcher';
import { ResearchState, DocumentData, RESEARCH_PROMPTS } from '@/types/research';

export class IndustryAnalyzer extends BaseResearcher {
  async analyze(
    state: ResearchState,
    onUpdate?: UpdateCallback
  ): Promise<{ message: string; industry_data: Record<string, DocumentData> }> {
    const company = state.company;
    const industry = state.industry;
    const msg = [`🏭 Industry Analyzer analyzing ${company} in ${industry}`];

    // Update current step
    state.currentStep = 'industry_analyzer';

    // Generate search queries using exact prompt from repository
    await this.sendUpdate(
      state,
      'Generating industry analysis queries',
      undefined,
      onUpdate
    );

    const queries = await this.generateQueries(state, RESEARCH_PROMPTS.INDUSTRY);

    // Send subqueries update (matching repo format)
    const subqueriesMsg = "🔍 Subqueries for industry analysis:\n" +
      queries.map(query => `• ${query}`).join('\n');

    msg.push(subqueriesMsg);

    await this.sendUpdate(
      state,
      'Industry analysis queries generated',
      {
        queries,
        step: 'Industry Analyst',
        analyst_type: 'Industry Analyst'
      },
      onUpdate
    );

    let industry_data: Record<string, DocumentData> = {};

    // Include site_scrape data for industry analysis (following repo pattern)
    if (state.site_scrape) {
      msg.push(`\n📊 Including ${Object.keys(state.site_scrape).length} pages from company website...`);
      industry_data = { ...state.site_scrape };
    }

    // Perform additional research with increased search depth
    try {
      await this.sendUpdate(
        state,
        'Searching for industry information',
        { queries },
        onUpdate
      );

      // Store documents with their respective queries
      const searchResults = await this.searchDocuments(state, queries);

      for (const [url, doc] of Object.entries(searchResults)) {
        industry_data[url] = doc;
      }

      // Scrape top URLs for full content
      if (Object.keys(searchResults).length > 0) {
        await this.sendUpdate(
          state,
          'Scraping industry web pages',
          { documentsToScrape: Math.min(3, Object.keys(searchResults).length) },
          onUpdate
        );

        industry_data = await this.scrapeDocuments(industry_data, 3, state, onUpdate);
      }

      msg.push(`\n✓ Found ${Object.keys(industry_data).length} documents`);

      await this.sendUpdate(
        state,
        `Used Serper Search to find ${Object.keys(industry_data).length} documents`,
        {
          step: 'Searching',
          analyst_type: 'Industry Analyst',
          queries,
          documentsFound: Object.keys(industry_data).length
        },
        onUpdate
      );

    } catch (error) {
      msg.push(`\n⚠️ Error during research: ${error}`);
      console.error('Industry analyzer error:', error);
    }

    // Update state with our findings
    state.industry_data = industry_data;

    const finalMessage = msg.join('\n');

    await this.sendUpdate(
      state,
      `Industry analysis completed with ${Object.keys(industry_data).length} documents`,
      {
        documentsFound: Object.keys(industry_data).length,
        queries,
        analyst_type: 'Industry Analyst'
      },
      onUpdate
    );

    return {
      message: finalMessage,
      industry_data: industry_data
    };
  }
}