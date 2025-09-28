/**
 * Company Analyzer - Researches company fundamentals
 * Follows the exact implementation from company-research-agent repository
 */

import { BaseResearcher, UpdateCallback } from './base-researcher';
import { ResearchState, DocumentData, RESEARCH_PROMPTS, TARGETED_PROMPTS } from '@/types/research';

export class CompanyAnalyzer extends BaseResearcher {
  async analyze(
    state: ResearchState,
    onUpdate?: UpdateCallback
  ): Promise<{ message: string; company_data: Record<string, DocumentData> }> {
    const company = state.company;
    const currentYear = new Date().getFullYear();
    const msg = [`🏢 Company Analyzer analyzing ${company}`];

    // Update current step
    state.currentStep = 'company_analyzer';

    // Generate search queries using exact prompt from repository
    await this.sendUpdate(
      state,
      'Generating company analysis queries',
      undefined,
      onUpdate
    );

    // Use both original and targeted prompts for comprehensive coverage
    const baseQueries = await this.generateQueries(state, RESEARCH_PROMPTS.COMPANY);
    const companyDomain = company.toLowerCase().replace(/\s+/g, '') + '.com';
    const targetedPrompt = TARGETED_PROMPTS.COMPANY_SOURCES
      .replace(/{year}/g, currentYear.toString())
      .replace(/{company_domain}/g, companyDomain);
    const targetedQueries = await this.generateQueries(state, targetedPrompt);

    // Combine queries with base queries first, then top 3 targeted
    const queries = [...baseQueries, ...targetedQueries.slice(0, 3)];

    // Send subqueries update (matching repo format)
    const subqueriesMsg = "🔍 Subqueries for company analysis:\n" +
      queries.map(query => `• ${query}`).join('\n');

    msg.push(subqueriesMsg);

    await this.sendUpdate(
      state,
      'Company analysis queries generated',
      {
        queries,
        step: 'Company Analyst',
        analyst_type: 'Company Analyst'
      },
      onUpdate
    );

    let company_data: Record<string, DocumentData> = {};

    // Include site_scrape data if available (following repo pattern)
    if (state.site_scrape) {
      msg.push(`\n📊 Including ${Object.keys(state.site_scrape).length} pages from company website...`);
      company_data = { ...state.site_scrape };
    }

    // Perform additional research with comprehensive search
    try {
      await this.sendUpdate(
        state,
        'Searching for company information',
        { queries },
        onUpdate
      );

      // Store documents with their respective queries
      const searchResults = await this.searchDocuments(state, queries);

      for (const [url, doc] of Object.entries(searchResults)) {
        company_data[url] = doc;
      }

      // Scrape top URLs for full content
      if (Object.keys(searchResults).length > 0) {
        await this.sendUpdate(
          state,
          'Scraping company web pages',
          { documentsToScrape: Math.min(5, Object.keys(searchResults).length) },
          onUpdate
        );

        company_data = await this.scrapeDocuments(company_data, 5, state, onUpdate);
      }

      msg.push(`\n✓ Found ${Object.keys(company_data).length} documents`);

      await this.sendUpdate(
        state,
        `Used Serper Search to find ${Object.keys(company_data).length} documents`,
        {
          step: 'Searching',
          analyst_type: 'Company Analyst',
          queries,
          documentsFound: Object.keys(company_data).length
        },
        onUpdate
      );

    } catch (error) {
      msg.push(`\n⚠️ Error during research: ${error}`);
      console.error('Company analyzer error:', error);
    }

    // Update state with our findings
    state.company_data = company_data;

    const finalMessage = msg.join('\n');

    await this.sendUpdate(
      state,
      `Company analysis completed with ${Object.keys(company_data).length} documents`,
      {
        documentsFound: Object.keys(company_data).length,
        queries,
        analyst_type: 'Company Analyst'
      },
      onUpdate
    );

    return {
      message: finalMessage,
      company_data: company_data
    };
  }
}