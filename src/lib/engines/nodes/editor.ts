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
    const industry = state.industry;
    const hq_location = state.hq_location;

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
      const content = (state as any)[key];
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

      const initialReport = await this.compileContent(state, individualBriefings, onUpdate);
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
    briefings: Record<string, string>,
    onUpdate?: UpdateCallback
  ): Promise<string> {
    const combinedContent = Object.values(briefings).join('\n\n');

    // Format references section
    let referenceText = '';
    if (state.references && state.references.length > 0) {
      console.log(`Adding ${state.references.length} references to report`);

      const referenceInfo = state.reference_info || {};
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

    const prompt = `You are compiling a comprehensive research report about ${company}.

Compiled briefings:
${combinedContent}

Create a comprehensive and focused report on ${company}, a ${industry} company headquartered in ${hq_location} that:
1. Integrates information from all sections into a cohesive non-repetitive narrative
2. Maintains important details from each section
3. Logically organizes information and removes transitional commentary / explanations
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
    const industry = state.industry;
    const hq_location = state.hq_location;

    const prompt = `You are an expert briefing editor. You are given a report on ${company}.

Current report:
${content}

1. Remove redundant or repetitive information
2. Remove information that is not relevant to ${company}, the ${industry} company headquartered in ${hq_location}.
3. Remove sections lacking substantial content
4. Remove any meta-commentary (e.g. "Here is the news...")

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
[References in MLA format - PRESERVE EXACTLY AS PROVIDED]

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
10. DO NOT CHANGE the format of the references section

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