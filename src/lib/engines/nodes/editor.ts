/**
 * Editor - Compiles final research report
 * Follows the exact implementation from company-research-agent repository
 */

import { BaseResearcher, UpdateCallback } from './base-researcher';
import { ResearchState } from '@/types/research';
import { config } from '@/lib/config';

export class Editor extends BaseResearcher {
  async analyze(
    state: ResearchState,
    onUpdate?: UpdateCallback
  ): Promise<{ message: string; report: string }> {
    console.log('📑 Editor compiling final research report...');

    // Update current step
    state.currentStep = 'editor';

    await this.sendUpdate(
      state,
      `Starting report compilation for ${state.company}`,
      {
        step: 'Editor',
        substep: 'initialization'
      },
      onUpdate
    );

    const company = state.company;

    // Collect individual briefings
    const briefingKeys = {
      company: 'company_briefing',
      industry: 'industry_briefing',
      financial: 'financial_briefing',
      news: 'news_briefing'
    };

    await this.sendUpdate(
      state,
      'Collecting section briefings',
      {
        step: 'Editor',
        substep: 'collecting_briefings'
      },
      onUpdate
    );

    const individualBriefings: Record<string, string> = {};
    for (const [category, key] of Object.entries(briefingKeys)) {
      const content = (() => {
        switch (key) {
          case 'company_briefing': return state.company_briefing;
          case 'industry_briefing': return state.industry_briefing;
          case 'financial_briefing': return state.financial_briefing;
          case 'news_briefing': return state.news_briefing;
          default: return undefined;
        }
      })();
      if (content) {
        individualBriefings[category] = content;
        console.log(`Found ${category} briefing (${content.length} characters)`);
      } else {
        console.log(`No ${category} briefing available`);
      }
    }

    if (Object.keys(individualBriefings).length === 0) {
      const errorMsg = '⚠️ No briefing sections available to compile';
      console.error(errorMsg);

      await this.sendUpdate(
        state,
        errorMsg,
        { step: 'Editor', error: 'No briefings available' },
        onUpdate
      );

      return { message: errorMsg, report: '' };
    }

    try {
      // Step 1: Initial Compilation
      await this.sendUpdate(
        state,
        'Compiling initial research report',
        {
          step: 'Editor',
          substep: 'compilation'
        },
        onUpdate
      );

      const initialReport = await this.compileContent(state, individualBriefings);
      if (!initialReport) {
        throw new Error('Initial compilation failed');
      }

      // Step 2: Final formatting and cleanup
      await this.sendUpdate(
        state,
        'Formatting final report',
        {
          step: 'Editor',
          substep: 'format'
        },
        onUpdate
      );

      const finalReport = await this.formatFinalReport(state, initialReport, onUpdate);

      if (!finalReport.trim()) {
        throw new Error('Final report is empty');
      }

      console.log(`✅ Final report compiled (${finalReport.length} characters)`);

      // Update state with the final report
      state.report = finalReport;
      state.status = 'completed';

      await this.sendUpdate(
        state,
        'Research report completed',
        {
          step: 'Editor',
          report: finalReport,
          company: company,
          is_final: true,
          status: 'completed'
        },
        onUpdate
      );

      return { message: 'Final report compiled successfully', report: finalReport };

    } catch (error) {
      console.error('Error in Editor:', error);
      const errorMsg = `Report compilation failed: ${error}`;

      await this.sendUpdate(
        state,
        errorMsg,
        { step: 'Editor', error: String(error) },
        onUpdate
      );

      return { message: errorMsg, report: '' };
    }
  }

  /**
   * Initial compilation of research sections (following exact repo pattern)
   */
  private async compileContent(
    state: ResearchState,
    briefings: Record<string, string>
  ): Promise<string> {
    const combinedContent = Object.values(briefings).join('\n\n');

    // Format references section
    let referenceText = '';
    if (state.references && state.references.length > 0) {
      console.log(`Adding ${state.references.length} references to report`);

      const referenceTitles = state.reference_titles || {};

      const formattedReferences = state.references
        .map((url, index) => {
          const title = referenceTitles[url] || 'Source';
          return `[${index + 1}] ${title} - ${url}`;
        })
        .join('\n');

      referenceText = `\n\n## References\n${formattedReferences}`;
    }

    const company = state.company;
    const industry = state.industry;
    const hq_location = state.hq_location;
    const currentDate = new Date().toISOString().split('T')[0];

    const prompt = `You are compiling a research report about ${company} as of ${currentDate}.

Compiled briefings:
${combinedContent}

STRICT DATA REQUIREMENTS:
1. Always include dates/timeframes for metrics (e.g., "500 employees (2024)")
2. Use specific numbers instead of ranges when available
3. Attribute key data points to sources (e.g., "per Crunchbase")
4. Mark estimates clearly (e.g., "estimated $25M revenue")
5. For financial data, include reporting period (Q3 2024, FY 2024)
6. Replace vague terms like "recently" with specific dates/quarters

Examples of proper formatting:
✅ "Founded in 2007 by Uzair Gadit in Hong Kong"
✅ "Revenue of $25M (FY 2024, per industry reports)"
✅ "Raised $10M Series A (March 2024, Crunchbase)"
❌ "Revenue between $10M-$30M" (use specific value if available)
❌ "Recently raised funding" (include specific date)

Create a comprehensive and focused report on ${company}, a ${industry} company headquartered in ${hq_location} that:
1. Integrates information from all sections with temporal specificity
2. Maintains important details with dates and sources
3. Logically organizes information with data quality standards
4. Uses clear section headers and structure

Formatting rules:
Strictly enforce this EXACT document structure:

# ${company} Research Report

## Company Overview
[Company content with ### subsections]

## Industry Overview
[Industry content with ### subsections]

## Financial Overview
[Financial content with ### subsections]

## News
[News content with ### subsections]

Return the report in clean markdown format. No explanations or commentary.`;

    try {
      const response = await this.claude.complete(prompt, {
        model: config.claude.standardModel, // Use Sonnet for compilation
        maxTokens: 4000,
        temperature: 0,
      });

      if (!response.success || !response.data) {
        throw new Error('Failed to compile initial report');
      }

      let initialReport = response.data.trim();

      // Append references section after LLM processing
      if (referenceText) {
        initialReport = `${initialReport}${referenceText}`;
      }

      return initialReport;
    } catch (error) {
      console.error('Error in initial compilation:', error);
      return combinedContent; // Fallback to combined content
    }
  }

  /**
   * Format and clean up the final report (following exact repo pattern)
   */
  private async formatFinalReport(
    state: ResearchState,
    content: string,
    onUpdate?: UpdateCallback
  ): Promise<string> {
    const company = state.company;
    const currentDate = new Date().toISOString().split('T')[0];

    const prompt = `You are an expert briefing editor. You are given a report on ${company} as of ${currentDate}.

Current report:
${content}

DATA QUALITY ENFORCEMENT:
1. Ensure all metrics include dates/timeframes
2. Convert ranges to specific values when possible
3. Remove redundant or repetitive information
4. Remove information not relevant to ${company}
5. Remove sections lacking substantial content
6. Remove any meta-commentary
7. Ensure temporal consistency across sections

When multiple values exist for the same metric:
- Prefer specific numbers over ranges
- Use most recent data with dates
- Include source credibility indicators
- Flag uncertain data with "reportedly" or "estimated"

CRITICAL: The original report contains a ## References section with numbered URLs. You MUST preserve this section exactly as it appears - do not replace it with placeholder text.

Strictly enforce this EXACT document structure:

## Company Overview
[Company content with ### subsections]

## Industry Overview
[Industry content with ### subsections]

## Financial Overview
[Financial content with ### subsections]

## News
[News content with ### subsections]

## References
[Preserve the exact references from the original document - do NOT use placeholder text]

Critical rules:
1. The document MUST start with "# ${company} Research Report"
2. The document MUST ONLY use these exact ## headers in this order:
   - ## Company Overview
   - ## Industry Overview
   - ## Financial Overview
   - ## News
   - ## References
3. NO OTHER ## HEADERS ARE ALLOWED
4. Use ### for subsections in Company/Industry/Financial sections
5. News section should only use bullet points (*), never headers
6. Never use code blocks (\`\`\`)
7. Never use more than one blank line between sections
8. Format all bullet points with *
9. Add one blank line before and after each section/list
10. PRESERVE all reference URLs exactly as provided in the original text

Return the polished report in flawless markdown format. No explanation.

Return the cleaned report in flawless markdown format. No explanations or commentary.`;

    try {
      // Use streaming for final formatting with chunk updates
      const response = await this.claude.complete(prompt, {
        model: config.claude.quickModel, // Use Haiku for final cleanup
        maxTokens: 4000,
        temperature: 0,
        stream: true,
        onProgress: async (chunk: string) => {
          if (onUpdate) {
            await onUpdate({
              type: 'report_chunk',
              step: 'editor',
              message: 'Formatting final report',
              data: { chunk },
              timestamp: new Date().toISOString(),
            });
          }
        }
      });

      if (!response.success || !response.data) {
        throw new Error('Failed to format final report');
      }

      return response.data.trim();
    } catch (error) {
      console.error('Error in final formatting:', error);
      return content; // Return original content if formatting fails
    }
  }
}