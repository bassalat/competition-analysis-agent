/**
 * Briefing - Generates section summaries for each research area
 * Follows the exact implementation from company-research-agent repository
 */

import { BaseResearcher, UpdateCallback } from './base-researcher';
import { ResearchState, DocumentData } from '@/types/research';
import { config } from '@/lib/config';

export class Briefing extends BaseResearcher {
  async analyze(
    state: ResearchState,
    onUpdate?: UpdateCallback
  ): Promise<{ message: string; briefings_generated: string[] }> {
    console.log('📋 Briefing generating section summaries...');

    // Update current step
    state.currentStep = 'briefing';

    await this.sendUpdate(
      state,
      'Generating research briefings for each section',
      undefined,
      onUpdate
    );

    const briefingsGenerated: string[] = [];

    // Define briefing categories
    const categories = [
      { name: 'company', dataKey: 'company_data', briefingKey: 'company_briefing' },
      { name: 'industry', dataKey: 'industry_data', briefingKey: 'industry_briefing' },
      { name: 'financial', dataKey: 'financial_data', briefingKey: 'financial_briefing' },
      { name: 'news', dataKey: 'news_data', briefingKey: 'news_briefing' },
    ];

    for (const category of categories) {
      const categoryData = (() => {
        switch (category.dataKey) {
          case 'company_data': return state.company_data || {};
          case 'industry_data': return state.industry_data || {};
          case 'financial_data': return state.financial_data || {};
          case 'news_data': return state.news_data || {};
          default: return {};
        }
      })();

      if (categoryData && Object.keys(categoryData).length > 0) {
        try {
          await this.sendUpdate(
            state,
            `Generating ${category.name} briefing`,
            {
              category: category.name,
              documentsCount: Object.keys(categoryData).length
            },
            onUpdate
          );

          const briefing = await this.generateCategoryBriefing(
            state,
            category.name,
            categoryData
          );

          if (briefing) {
            // Set briefing directly on state with proper typing
            switch (category.briefingKey) {
              case 'company_briefing':
                state.company_briefing = briefing;
                break;
              case 'industry_briefing':
                state.industry_briefing = briefing;
                break;
              case 'financial_briefing':
                state.financial_briefing = briefing;
                break;
              case 'news_briefing':
                state.news_briefing = briefing;
                break;
            }
            briefingsGenerated.push(category.name);
            console.log(`✅ Generated ${category.name} briefing (${briefing.length} chars)`);
          }
        } catch (error) {
          console.error(`Error generating ${category.name} briefing:`, error);
        }
      } else {
        console.log(`⚠️ No data available for ${category.name} briefing`);
      }
    }

    const msg = [
      `📋 Briefing completed section generation:`,
      `- Generated briefings: ${briefingsGenerated.join(', ')}`,
      `- Total sections: ${briefingsGenerated.length}`,
      `- Ready for final report compilation`
    ].join('\n');

    await this.sendUpdate(
      state,
      `Generated ${briefingsGenerated.length} section briefings`,
      {
        briefingsGenerated,
        totalBriefings: briefingsGenerated.length,
        step: 'Briefing'
      },
      onUpdate
    );

    return {
      message: msg,
      briefings_generated: briefingsGenerated
    };
  }

  /**
   * Generate briefing for a specific category
   */
  private async generateCategoryBriefing(
    state: ResearchState,
    categoryName: string,
    categoryData: Record<string, DocumentData>
  ): Promise<string> {
    const documents = Object.values(categoryData);

    // Combine document content for analysis
    const combinedContent = documents
      .slice(0, 10) // Limit documents to avoid token limits
      .map(doc => {
        const content = doc.content || doc.snippet || '';
        return `Source: ${doc.title}\nURL: ${doc.url}\nContent: ${content.substring(0, 500)}...`;
      })
      .join('\n\n');

    // Get enrichment data if available
    const enrichmentData = (() => {
      switch (categoryName) {
        case 'company': return state.company_enrichment || '';
        case 'industry': return state.industry_enrichment || '';
        case 'financial': return state.financial_enrichment || '';
        case 'news': return state.news_enrichment || '';
        default: return '';
      }
    })();

    const prompt = this.getBriefingPrompt(
      categoryName,
      state.company,
      state.industry,
      combinedContent,
      enrichmentData
    );

    try {
      const response = await this.claude.complete(prompt, {
        model: config.claude.quickModel, // Use Haiku for briefings
        maxTokens: 2000,
        temperature: 0.3,
      });

      if (!response.success || !response.data) {
        throw new Error(`Failed to generate ${categoryName} briefing`);
      }

      return response.data.trim();
    } catch (error) {
      console.error(`Error generating ${categoryName} briefing:`, error);
      throw error;
    }
  }

  /**
   * Get briefing prompt based on category
   */
  private getBriefingPrompt(
    category: string,
    company: string,
    industry: string,
    combinedContent: string,
    enrichmentData: string
  ): string {
    const currentDate = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();

    const temporalInstructions = `
TEMPORAL REQUIREMENTS (Today is ${currentDate}):
- Include specific dates/years for all data points
- Prioritize information from ${currentYear} and ${currentYear - 1}
- Mark older data with "as of [date]" notation
- Use exact dates instead of "recently" or "latest"
- For financial data, always include the reporting period (Q1 2024, FY 2024, etc.)
- Extract and include specific metrics (not ranges) when available
- Flag any conflicting data with source attributions`;

    const baseInstruction = `Generate a comprehensive ${category} briefing for ${company} in the ${industry} industry.
${temporalInstructions}`;

    const categoryPrompts = {
      company: `${baseInstruction}

Research Data:
${combinedContent}

${enrichmentData ? `Enrichment Analysis:\n${enrichmentData}\n` : ''}

Create a detailed company overview briefing covering:
### Core Business
- Business model and value proposition
- Key products and services
- Target markets and customers

### Leadership & Organization
- Key leadership team
- Organizational structure
- Company culture and values

### Strategic Position
- Competitive advantages
- Market positioning
- Strategic initiatives

Use markdown formatting with ### subsections. Be factual and comprehensive.`,

      industry: `${baseInstruction}

Research Data:
${combinedContent}

${enrichmentData ? `Enrichment Analysis:\n${enrichmentData}\n` : ''}

Create a detailed industry overview briefing covering:
### Market Landscape
- Industry size and growth trends
- Key market dynamics
- Regulatory environment

### Competitive Analysis
- Major competitors and market share
- Competitive positioning of ${company}
- Market differentiation factors

### Industry Trends
- Emerging trends and technologies
- Growth opportunities
- Market challenges and risks

Use markdown formatting with ### subsections. Be factual and comprehensive.`,

      financial: `${baseInstruction}

Research Data:
${combinedContent}

${enrichmentData ? `Enrichment Analysis:\n${enrichmentData}\n` : ''}

Create a detailed financial overview briefing covering:
### Financial Performance
- Revenue and growth metrics
- Profitability indicators
- Financial health assessment

### Funding & Investment
- Funding history and rounds
- Investment partners and valuations
- Capital structure

### Business Model Economics
- Revenue streams and monetization
- Cost structure analysis
- Financial projections and outlook

Use markdown formatting with ### subsections. Be factual and comprehensive.`,

      news: `${baseInstruction}

Research Data:
${combinedContent}

${enrichmentData ? `Enrichment Analysis:\n${enrichmentData}\n` : ''}

Create a comprehensive news briefing with recent developments for ${company}.

IMPORTANT: Format each item with specific dates and detailed information, following this exact pattern:

[Date]: [Detailed description of the development/announcement]

Examples of the desired format:
June 27, 2025: Launched a fully customizable White-Label Password Manager as part of its expanding B2B Privacy Suite.
May 16, 2025: Published its Q1 2025 Transparency Report.
January 20, 2025: Reaffirmed commitment to protecting digital freedom worldwide.

Include all types of developments:
- Product launches and feature announcements
- Business partnerships and collaborations
- Awards and industry recognition
- Company milestones and achievements
- Funding and investment news
- Strategic initiatives and policy updates
- Market expansion activities
- Leadership changes
- Quarterly reports and transparency updates

Requirements:
1. Start each line with a specific date (Month DD, YYYY format)
2. Include concrete details about what was announced/achieved
3. Focus on recent developments (2024-2025 preferred)
4. Order chronologically with most recent first
5. Extract exact dates from the research data when available
6. If exact dates aren't available but timeframe is mentioned (e.g., "Q1 2025", "2024"), use approximate dates
7. Prioritize significant business developments over minor updates

Do NOT use generic bullet points without dates. Each item must have a date and specific details.`
    };

    return categoryPrompts[category as keyof typeof categoryPrompts] || categoryPrompts.company;
  }
}