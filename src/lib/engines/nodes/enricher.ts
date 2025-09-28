/**
 * Enricher - Adds depth and context to research findings
 * Follows the exact implementation from company-research-agent repository
 */

import { BaseResearcher, UpdateCallback } from './base-researcher';
import { ResearchState, DocumentData } from '@/types/research';
import { config } from '@/lib/config';

export class Enricher extends BaseResearcher {
  async analyze(
    state: ResearchState,
    onUpdate?: UpdateCallback
  ): Promise<{ message: string; enriched_categories: string[] }> {
    console.log('🌟 Enricher adding depth to research findings...');

    // Update current step
    state.currentStep = 'enricher';

    await this.sendUpdate(
      state,
      'Enriching research findings with additional context',
      undefined,
      onUpdate
    );

    const enrichedCategories: string[] = [];

    // Check which categories have data to enrich
    const categories = [
      { name: 'company', data: state.company_data, key: 'company_data' },
      { name: 'industry', data: state.industry_data, key: 'industry_data' },
      { name: 'financial', data: state.financial_data, key: 'financial_data' },
      { name: 'news', data: state.news_data, key: 'news_data' },
    ];

    for (const category of categories) {
      if (category.data && Object.keys(category.data).length > 0) {
        try {
          await this.sendUpdate(
            state,
            `Enriching ${category.name} data`,
            { category: category.name, documentsCount: Object.keys(category.data).length },
            onUpdate
          );

          await this.enrichCategory(state, category.name, category.data);
          enrichedCategories.push(category.name);

          console.log(`✅ Enriched ${category.name} category with ${Object.keys(category.data).length} documents`);
        } catch (error) {
          console.error(`Error enriching ${category.name}:`, error);
        }
      }
    }

    // Add cross-category insights
    if (enrichedCategories.length > 1) {
      await this.sendUpdate(
        state,
        'Generating cross-category insights',
        { categories: enrichedCategories },
        onUpdate
      );

      await this.addCrossCategoryInsights(state);
    }

    const msg = [
      `🌟 Enricher completed depth analysis:`,
      `- Enriched categories: ${enrichedCategories.join(', ')}`,
      `- Added contextual insights across ${enrichedCategories.length} research areas`,
      `- Enhanced data quality for briefing generation`
    ].join('\n');

    await this.sendUpdate(
      state,
      `Enriched ${enrichedCategories.length} research categories`,
      {
        enrichedCategories,
        step: 'Enricher'
      },
      onUpdate
    );

    return {
      message: msg,
      enriched_categories: enrichedCategories
    };
  }

  /**
   * Enrich data for a specific category
   */
  private async enrichCategory(
    state: ResearchState,
    categoryName: string,
    categoryData: Record<string, DocumentData>
  ): Promise<void> {
    const currentDate = new Date();
    const documents = Object.values(categoryData);
    if (documents.length === 0) return;

    // Separate recent vs older data for better prioritization
    const recentDocs = documents.filter(doc => {
      if (doc.date) {
        const docDate = new Date(doc.date);
        const monthsOld = (currentDate.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return monthsOld <= 12; // Consider data recent if within 12 months
      }
      return false; // If no date, treat as unknown age
    });

    // Prioritize recent documents in summaries, fallback to all if no recent ones
    const docsToAnalyze = recentDocs.length > 0 ? recentDocs : documents;

    // Create enrichment summary with source attribution
    const documentSummaries = docsToAnalyze
      .slice(0, 5) // Limit to top 5 documents to avoid token limits
      .map(doc => `Source: ${doc.title} (${doc.url})\nDate: ${doc.date || 'Unknown'}\nContent: ${doc.content.substring(0, 300)}...`)
      .join('\n\n');

    const enrichmentPrompt = this.getEnrichmentPrompt(categoryName, state.company, state.industry, documentSummaries);

    try {
      const response = await this.claude.complete(enrichmentPrompt, {
        model: config.claude.quickModel, // Use Haiku for enrichment
        maxTokens: 1000,
        temperature: 0.5,
      });

      if (response.success && response.data) {
        // Store enrichment insights in state for later use in briefings
        // Store enrichment with proper typing
        switch (categoryName) {
          case 'company':
            state.company_enrichment = response.data;
            break;
          case 'industry':
            state.industry_enrichment = response.data;
            break;
          case 'financial':
            state.financial_enrichment = response.data;
            break;
          case 'news':
            state.news_enrichment = response.data;
            break;
        }

        console.log(`📈 Added enrichment insights for ${categoryName} (${response.data.length} chars)`);
      }
    } catch (error) {
      console.error(`Error enriching ${categoryName}:`, error);
    }
  }

  /**
   * Get enrichment prompt based on category
   */
  private getEnrichmentPrompt(
    category: string,
    company: string,
    industry: string,
    documentSummaries: string
  ): string {
    const baseContext = `Analyze the following ${category} research data for ${company} in the ${industry} industry.`;

    const categoryPrompts = {
      company: `${baseContext}

Research Data:
${documentSummaries}

Validate and extract:
- Specific numbers (not ranges) with sources
- Exact dates for all events and metrics
- Most recent data available (prefer ${new Date().getFullYear()} data)
- Flag any conflicting information between sources

Provide enrichment analysis focusing on:
- Key business model insights with metrics
- Competitive positioning with market data
- Strategic strengths and weaknesses with evidence
- Market differentiation factors with specifics

Keep the analysis concise and factual with source attributions.`,

      industry: `${baseContext}

Research Data:
${documentSummaries}

Validate and extract:
- Market size figures and growth percentages with sources
- Competitor rankings and market share data
- Specific trend data with timeframes
- Industry analysis with recent dates

Provide enrichment analysis focusing on:
- Market trends and dynamics with metrics
- Competitive landscape with specific positioning
- Industry growth factors with data points
- Key challenges and opportunities with evidence

Keep the analysis concise and factual with source attributions.`,

      financial: `${baseContext}

Research Data:
${documentSummaries}

Validate and extract:
- Exact financial figures (not ranges) with reporting periods
- Funding amounts and dates with investor names
- Revenue data with fiscal year specifications
- Valuation figures with date stamps

Provide enrichment analysis focusing on:
- Financial health indicators with metrics
- Revenue model analysis with numbers
- Funding and investment patterns with specifics
- Financial risks and opportunities with data

Keep the analysis concise and factual with source attributions.`,

      news: `${baseContext}

Research Data:
${documentSummaries}

Validate and extract:
- Specific dates for all announcements and developments
- Partnership details with company names and terms
- Product launch information with dates and features
- Strategic initiatives with timelines

Provide enrichment analysis focusing on:
- Recent strategic developments with dates
- Market momentum indicators with metrics
- Partnership and expansion activities with specifics
- Key announcements and their implications with timing

Keep the analysis concise and factual with source attributions.`
    };

    return categoryPrompts[category as keyof typeof categoryPrompts] || categoryPrompts.company;
  }

  /**
   * Add insights that connect findings across categories
   */
  private async addCrossCategoryInsights(
    state: ResearchState
  ): Promise<void> {
    try {
      const enrichments = [
        state.company_enrichment,
        state.industry_enrichment,
        state.financial_enrichment,
        state.news_enrichment,
      ].filter(Boolean) as string[];

      if (enrichments.length < 2) return;

      const crossAnalysisPrompt = `Based on the following research insights about ${state.company} in the ${state.industry} industry, identify key connections and strategic implications:

${enrichments.map((enrichment, i) => `Analysis ${i + 1}:\n${enrichment}`).join('\n\n')}

Provide a brief cross-category analysis highlighting:
- Strategic coherence across business areas
- Key risks and opportunities
- Competitive positioning implications
- Notable trends or patterns

Keep the analysis concise (3-4 key points).`;

      const response = await this.claude.complete(crossAnalysisPrompt, {
        model: config.claude.quickModel,
        maxTokens: 800,
        temperature: 0.4,
      });

      if (response.success && response.data) {
        state.cross_category_insights = response.data;
        console.log('🔗 Added cross-category insights');
      }
    } catch (error) {
      console.error('Error generating cross-category insights:', error);
    }
  }
}