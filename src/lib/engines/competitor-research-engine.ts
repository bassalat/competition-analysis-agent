/**
 * Main Competitor Research Engine
 * Orchestrates the complete research workflow following company-research-agent repository
 */

import { CompanyAnalyzer } from './nodes/company-analyzer';
import { IndustryAnalyzer } from './nodes/industry-analyzer';
import { FinancialAnalyst } from './nodes/financial-analyst';
import { NewsScanner } from './nodes/news-scanner';
import { Collector } from './nodes/collector';
import { Curator } from './nodes/curator';
import { Enricher } from './nodes/enricher';
import { Briefing } from './nodes/briefing';
import { Editor } from './nodes/editor';

import { getClaudeClient } from '@/lib/api-clients/claude-client';
import { getFirecrawlClient } from '@/lib/api-clients/firecrawl-client';
import { config } from '@/lib/config';

import {
  ResearchState,
  ResearchUpdate,
  CompetitorResearchRequest,
  CompetitorResearchResult,
  ResearchStep,
  ResearchMetadata,
  RESEARCH_PROMPTS,
  RESEARCH_WORKFLOW,
} from '@/types/research';
import { Competitor, BusinessContext } from '@/types/api';

export interface ResearchOptions {
  skipWebsiteScraping?: boolean;
  maxDocumentsPerCategory?: number;
  includeNews?: boolean;
  onUpdate?: (update: ResearchUpdate) => Promise<void>;
}

export class CompetitorResearchEngine {
  private claude = getClaudeClient();
  private firecrawl = getFirecrawlClient();

  // Research nodes (following exact repository pattern)
  private companyAnalyzer = new CompanyAnalyzer();
  private industryAnalyzer = new IndustryAnalyzer();
  private financialAnalyst = new FinancialAnalyst();
  private newsScanner = new NewsScanner();
  private collector = new Collector();
  private curator = new Curator();
  private enricher = new Enricher();
  private briefing = new Briefing();
  private editor = new Editor();

  /**
   * Main research method - follows exact workflow from repository
   */
  async research(request: CompetitorResearchRequest): Promise<CompetitorResearchResult> {
    const startTime = Date.now();
    const { competitor, businessContext, options = {} } = request;

    console.log(`🚀 Starting research for ${competitor.name}`);

    try {
      // Initialize research state
      const state = await this.initializeState(competitor, businessContext, options);

      // Execute research workflow (exact sequence from repository)
      await this.executeWorkflow(state, options);

      // Calculate metadata
      const duration = (Date.now() - startTime) / 1000;
      const metadata = this.calculateMetadata(state, duration);

      return {
        competitor,
        state,
        report: state.report || '',
        briefings: {
          company: state.company_briefing || '',
          industry: state.industry_briefing || '',
          financial: state.financial_briefing || '',
          news: state.news_briefing || '',
        },
        metadata,
        success: true,
      };

    } catch (error) {
      console.error(`❌ Research failed for ${competitor.name}:`, error);

      const duration = (Date.now() - startTime) / 1000;

      return {
        competitor,
        state: {} as ResearchState,
        report: '',
        briefings: { company: '', industry: '', financial: '', news: '' },
        metadata: {
          totalDocuments: 0,
          documentsPerCategory: { company: 0, industry: 0, financial: 0, news: 0 },
          costEstimate: 0,
          duration,
          queriesGenerated: [],
          sourcesUsed: [],
        },
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Initialize research state with competitor context
   */
  private async initializeState(
    competitor: Competitor,
    businessContext?: BusinessContext,
    options: ResearchOptions = {}
  ): Promise<ResearchState> {
    // Get industry information using the three-tier approach
    const context = await this.getCompetitorContext(competitor, businessContext);

    const state: ResearchState = {
      company: competitor.name,
      industry: context.industry,
      hq_location: context.hq_location,
      currentStep: 'grounding',
      completedSteps: [],
      messages: [],
      job_id: `research_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'processing',
      startTime: new Date().toISOString(),
      references: [],
      reference_info: {},
      reference_titles: {},
    };

    // Scrape company website if available and not skipped
    if (!options.skipWebsiteScraping && competitor.website) {
      await this.scrapeCompanyWebsite(state, competitor.website, options);
    }

    return state;
  }

  /**
   * Get competitor context (industry, location) using three-tier approach
   */
  private async getCompetitorContext(
    competitor: Competitor,
    businessContext?: BusinessContext
  ): Promise<{ company: string; industry: string; hq_location: string }> {
    // Priority 1: From document processing
    if (businessContext?.industry) {
      return {
        company: competitor.name,
        industry: businessContext.industry,
        hq_location: 'Unknown'
      };
    }

    // Priority 2: From competitor object (if manually entered)
    if (competitor.description && competitor.description.includes('industry')) {
      // Simple keyword detection for industry
      return {
        company: competitor.name,
        industry: 'Technology', // Default fallback
        hq_location: 'Unknown'
      };
    }

    // Priority 3: Ask Claude (single quick call)
    try {
      const response = await this.claude.complete(
        RESEARCH_PROMPTS.INDUSTRY_DETECTION.replace('{company}', competitor.name),
        {
          model: config.claude.quickModel,
          maxTokens: 50,
          temperature: 0
        }
      );

      const industry = response.success && response.data
        ? response.data.trim()
        : 'Technology';

      return {
        company: competitor.name,
        industry,
        hq_location: 'Unknown'
      };
    } catch (error) {
      console.error('Error detecting industry:', error);
      return {
        company: competitor.name,
        industry: 'Technology',
        hq_location: 'Unknown'
      };
    }
  }

  /**
   * Scrape company website for additional context
   */
  private async scrapeCompanyWebsite(
    state: ResearchState,
    website: string,
    options: ResearchOptions
  ): Promise<void> {
    try {
      if (options.onUpdate) {
        await options.onUpdate({
          type: 'status',
          step: 'grounding',
          message: `Scraping company website: ${website}`,
          timestamp: new Date().toISOString(),
        });
      }

      console.log(`🌐 Scraping company website: ${website}`);

      const scrapeResponse = await this.firecrawl.scrape(website, {
        onlyMainContent: true,
        timeout: 30000,
      });

      if (scrapeResponse.success && scrapeResponse.data) {
        state.site_scrape = {
          [website]: {
            url: website,
            title: scrapeResponse.data.metadata.title || state.company,
            content: scrapeResponse.data.content,
            source: 'firecrawl',
            scraped_at: new Date().toISOString(),
          }
        };

        console.log(`✅ Scraped company website (${scrapeResponse.data.content.length} chars)`);
      }
    } catch (error) {
      console.error(`⚠️ Failed to scrape company website:`, error);
      // Continue without website data
    }
  }

  /**
   * Helper function to safely push to completedSteps
   */
  private addCompletedStep(state: ResearchState, step: ResearchStep): void {
    if (!state.completedSteps) {
      state.completedSteps = [];
    }
    state.completedSteps.push(step);
  }

  /**
   * Execute the complete research workflow (exact sequence from repository)
   */
  private async executeWorkflow(state: ResearchState, options: ResearchOptions): Promise<void> {
    const { onUpdate } = options;

    // Step 1: Grounding (already done in initialization)
    state.currentStep = 'grounding';
    if (!state.completedSteps) {
      state.completedSteps = [];
    }
    state.completedSteps = ['grounding'];

    if (onUpdate) {
      await onUpdate({
        type: 'progress',
        step: 'grounding',
        message: `Research initialized for ${state.company}`,
        progress: this.calculateProgress(state),
        timestamp: new Date().toISOString(),
      });
    }

    // Step 2: Parallel Research Nodes (company, industry, financial, news)
    console.log('🔍 Executing parallel research nodes...');

    const researchNodes = [
      { name: 'company_analyzer', node: this.companyAnalyzer },
      { name: 'industry_analyzer', node: this.industryAnalyzer },
      { name: 'financial_analyst', node: this.financialAnalyst },
      { name: 'news_scanner', node: this.newsScanner },
    ];

    // Execute research nodes in parallel (like the repository)
    const researchPromises = researchNodes.map(async ({ name, node }) => {
      try {
        state.currentStep = name as ResearchStep;
        await node.run(state, onUpdate);
        this.addCompletedStep(state, name as ResearchStep);

        if (onUpdate) {
          await onUpdate({
            type: 'progress',
            step: name as ResearchStep,
            message: `${name} completed`,
            progress: this.calculateProgress(state),
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(`Error in ${name}:`, error);
        throw error;
      }
    });

    await Promise.all(researchPromises);

    // Step 3: Collector
    console.log('📊 Running collector...');
    state.currentStep = 'collector';
    await this.collector.run(state, onUpdate);
    this.addCompletedStep(state, 'collector');

    if (onUpdate) {
      await onUpdate({
        type: 'progress',
        step: 'collector',
        message: 'Data collection completed',
        progress: this.calculateProgress(state),
        timestamp: new Date().toISOString(),
      });
    }

    // Step 4: Curator
    console.log('🎯 Running curator...');
    state.currentStep = 'curator';
    await this.curator.run(state, onUpdate);
    this.addCompletedStep(state, 'curator');

    if (onUpdate) {
      await onUpdate({
        type: 'progress',
        step: 'curator',
        message: 'Content curation completed',
        progress: this.calculateProgress(state),
        timestamp: new Date().toISOString(),
      });
    }

    // Step 5: Enricher
    console.log('🌟 Running enricher...');
    state.currentStep = 'enricher';
    await this.enricher.run(state, onUpdate);
    this.addCompletedStep(state, 'enricher');

    if (onUpdate) {
      await onUpdate({
        type: 'progress',
        step: 'enricher',
        message: 'Content enrichment completed',
        progress: this.calculateProgress(state),
        timestamp: new Date().toISOString(),
      });
    }

    // Step 6: Briefing
    console.log('📋 Running briefing...');
    state.currentStep = 'briefing';
    await this.briefing.run(state, onUpdate);
    this.addCompletedStep(state, 'briefing');

    if (onUpdate) {
      await onUpdate({
        type: 'progress',
        step: 'briefing',
        message: 'Section briefings completed',
        progress: this.calculateProgress(state),
        timestamp: new Date().toISOString(),
      });
    }

    // Step 7: Editor (Final Report)
    console.log('📑 Running editor...');
    state.currentStep = 'editor';
    await this.editor.run(state, onUpdate);
    this.addCompletedStep(state, 'editor');

    if (onUpdate) {
      await onUpdate({
        type: 'result',
        step: 'editor',
        message: 'Research completed successfully',
        progress: 100,
        data: { report: state.report },
        timestamp: new Date().toISOString(),
      });
    }

    state.status = 'completed';
    state.endTime = new Date().toISOString();

    console.log(`✅ Research completed for ${state.company}`);
  }

  /**
   * Calculate progress percentage based on completed steps
   */
  private calculateProgress(state: ResearchState): number {
    const totalSteps = RESEARCH_WORKFLOW.STEPS.length;
    const completedCount = (state.completedSteps || []).length;
    return Math.round((completedCount / totalSteps) * 100);
  }

  /**
   * Calculate research metadata
   */
  private calculateMetadata(state: ResearchState, duration: number): ResearchMetadata {
    const categoryCounts = {
      company: Object.keys(state.company_data || {}).length,
      industry: Object.keys(state.industry_data || {}).length,
      financial: Object.keys(state.financial_data || {}).length,
      news: Object.keys(state.news_data || {}).length,
    };

    const totalDocuments = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);

    // Estimate cost (11 Claude calls + 14 Serper + 11 Firecrawl ≈ $0.30)
    const costEstimate = 0.30;

    return {
      totalDocuments,
      documentsPerCategory: categoryCounts,
      costEstimate,
      duration,
      queriesGenerated: [], // Would be populated from actual run
      sourcesUsed: state.references || [],
    };
  }
}

// Singleton instance
let engineInstance: CompetitorResearchEngine | null = null;

export function getCompetitorResearchEngine(): CompetitorResearchEngine {
  if (!engineInstance) {
    engineInstance = new CompetitorResearchEngine();
  }
  return engineInstance;
}