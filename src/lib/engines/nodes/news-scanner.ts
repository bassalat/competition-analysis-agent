/**
 * News Scanner - Researches recent news and announcements
 * Follows the exact implementation from company-research-agent repository
 */

import { BaseResearcher, UpdateCallback } from './base-researcher';
import { ResearchState, DocumentData, RESEARCH_PROMPTS } from '@/types/research';

export class NewsScanner extends BaseResearcher {
  async analyze(
    state: ResearchState,
    onUpdate?: UpdateCallback
  ): Promise<{ message: string; news_data: Record<string, DocumentData> }> {
    const company = state.company;
    const msg = [`📰 News Scanner analyzing ${company}`];

    // Update current step
    state.currentStep = 'news_scanner';

    // Generate search queries using exact prompt from repository
    await this.sendUpdate(
      state,
      'Generating news analysis queries',
      undefined,
      onUpdate
    );

    const queries = await this.generateQueries(state, RESEARCH_PROMPTS.NEWS);

    // Send subqueries update (matching repo format)
    const subqueriesMsg = "🔍 Subqueries for news analysis:\n" +
      queries.map(query => `• ${query}`).join('\n');

    msg.push(subqueriesMsg);

    await this.sendUpdate(
      state,
      'News analysis queries generated',
      {
        queries,
        step: 'News Scanner',
        analyst_type: 'News Scanner'
      },
      onUpdate
    );

    let news_data: Record<string, DocumentData> = {};

    // Include site_scrape data for news analysis (following repo pattern)
    if (state.site_scrape) {
      msg.push(`\n📊 Including ${Object.keys(state.site_scrape).length} pages from company website...`);
      news_data = { ...state.site_scrape };
    }

    // Perform additional research with recent time filter
    try {
      await this.sendUpdate(
        state,
        'Searching for recent news',
        { queries },
        onUpdate
      );

      // Use news search for more recent content with date filtering
      for (const query of queries) {
        try {
          const currentYear = new Date().getFullYear();
          const enhancedQuery = `${query} ${currentYear} OR ${currentYear - 1}`;
          console.log(`📰 News searching: "${enhancedQuery}"`);
          const newsResponse = await this.serper.searchNews(enhancedQuery, { num: 8 });

          if (newsResponse.success && newsResponse.data) {
            for (const result of newsResponse.data) {
              if (!result.link || news_data[result.link]) {
                continue; // Skip if no link or already processed
              }

              news_data[result.link] = {
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
          }
        } catch (error) {
          console.error(`Error in news search for query "${query}":`, error);
          // Fallback to regular search
          const fallbackResults = await this.searchDocuments(state, [query]);
          for (const [url, doc] of Object.entries(fallbackResults)) {
            if (!news_data[url]) {
              news_data[url] = doc;
            }
          }
        }
      }

      // Scrape top news URLs for full content (limit to 4 for news)
      if (Object.keys(news_data).length > 0) {
        await this.sendUpdate(
          state,
          'Scraping news articles',
          { documentsToScrape: Math.min(4, Object.keys(news_data).length) },
          onUpdate
        );

        news_data = await this.scrapeDocuments(news_data, 4, state, onUpdate);
      }

      msg.push(`\n✓ Found ${Object.keys(news_data).length} documents`);

      await this.sendUpdate(
        state,
        `Used Serper Search to find ${Object.keys(news_data).length} documents`,
        {
          step: 'Searching',
          analyst_type: 'News Scanner',
          queries,
          documentsFound: Object.keys(news_data).length
        },
        onUpdate
      );

    } catch (error) {
      msg.push(`\n⚠️ Error during research: ${error}`);
      console.error('News scanner error:', error);
    }

    // Update state with our findings
    state.news_data = news_data;

    const finalMessage = msg.join('\n');

    await this.sendUpdate(
      state,
      `News analysis completed with ${Object.keys(news_data).length} documents`,
      {
        documentsFound: Object.keys(news_data).length,
        queries,
        analyst_type: 'News Scanner'
      },
      onUpdate
    );

    return {
      message: finalMessage,
      news_data: news_data
    };
  }
}