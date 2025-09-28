/**
 * Enricher - Adds depth and context to research findings
 * Follows the exact implementation from company-research-agent repository
 */

import { BaseResearcher, UpdateCallback } from './base-researcher';
import { ResearchState } from '@/types/research';
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

          await this.enrichCategory(state, category.name, category.data, onUpdate);
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

      await this.addCrossCategoryInsights(state, onUpdate);
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
    categoryData: Record<string, any>,
    onUpdate?: UpdateCallback
  ): Promise<void> {
    const documents = Object.values(categoryData);
    if (documents.length === 0) return;

    // Create enrichment summary for this category
    const documentSummaries = documents
      .slice(0, 5) // Limit to top 5 documents to avoid token limits
      .map(doc => `Title: ${doc.title}\nContent: ${doc.content.substring(0, 300)}...`)
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
        const enrichmentKey = `${categoryName}_enrichment`;
        (state as any)[enrichmentKey] = response.data;

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

Provide enrichment analysis focusing on:
- Key business model insights
- Competitive positioning
- Strategic strengths and weaknesses
- Market differentiation factors

Keep the analysis concise and factual.`,

      industry: `${baseContext}

Research Data:
${documentSummaries}

Provide enrichment analysis focusing on:
- Market trends and dynamics
- Competitive landscape overview
- Industry growth factors
- Key challenges and opportunities

Keep the analysis concise and factual.`,

      financial: `${baseContext}

Research Data:
${documentSummaries}

Provide enrichment analysis focusing on:
- Financial health indicators
- Revenue model analysis
- Funding and investment patterns
- Financial risks and opportunities

Keep the analysis concise and factual.`,

      news: `${baseContext}

Research Data:
${documentSummaries}

Provide enrichment analysis focusing on:
- Recent strategic developments
- Market momentum indicators
- Partnership and expansion activities
- Key announcements and their implications

Keep the analysis concise and factual.`
    };

    return categoryPrompts[category as keyof typeof categoryPrompts] || categoryPrompts.company;
  }

  /**
   * Add insights that connect findings across categories
   */
  private async addCrossCategoryInsights(
    state: ResearchState,
    onUpdate?: UpdateCallback
  ): Promise<void> {
    try {
      const enrichments = [
        (state as any).company_enrichment,
        (state as any).industry_enrichment,
        (state as any).financial_enrichment,
        (state as any).news_enrichment,
      ].filter(Boolean);

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
        (state as any).cross_category_insights = response.data;
        console.log('🔗 Added cross-category insights');
      }
    } catch (error) {
      console.error('Error generating cross-category insights:', error);
    }
  }
}