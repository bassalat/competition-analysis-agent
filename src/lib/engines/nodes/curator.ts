/**
 * Curator - Filters and scores content for relevance
 * Follows the exact implementation from company-research-agent repository
 */

import { BaseResearcher, UpdateCallback } from './base-researcher';
import { ResearchState, DocumentData } from '@/types/research';
import { config } from '@/lib/config';

export class Curator extends BaseResearcher {
  async analyze(
    state: ResearchState,
    onUpdate?: UpdateCallback
  ): Promise<{ message: string; curated_documents: number }> {
    console.log('🎯 Curator filtering and scoring content...');

    // Update current step
    state.currentStep = 'curator';

    await this.sendUpdate(
      state,
      'Analyzing and scoring content relevance',
      undefined,
      onUpdate
    );

    // Collect all documents from research categories
    const allDocuments: DocumentData[] = [];

    const categories = [
      { name: 'company', data: state.company_data },
      { name: 'industry', data: state.industry_data },
      { name: 'financial', data: state.financial_data },
      { name: 'news', data: state.news_data },
    ];

    for (const category of categories) {
      if (category.data) {
        const docs = Object.values(category.data);
        for (const doc of docs) {
          allDocuments.push({
            ...doc,
            category: category.name
          });
        }
      }
    }

    console.log(`📋 Curator processing ${allDocuments.length} documents`);

    if (allDocuments.length === 0) {
      const msg = '🎯 Curator: No documents to process';
      await this.sendUpdate(state, msg, { curatedDocuments: 0 }, onUpdate);
      return { message: msg, curated_documents: 0 };
    }

    await this.sendUpdate(
      state,
      `Scoring ${allDocuments.length} documents for relevance`,
      { totalDocuments: allDocuments.length },
      onUpdate
    );

    // Score documents for relevance using Claude
    const scoredDocuments = await this.scoreDocuments(state, allDocuments, onUpdate);

    // Filter documents by relevance threshold (0.4 like in the repository)
    const relevanceThreshold = 0.4;
    const relevantDocuments = scoredDocuments.filter(doc =>
      (doc.relevance_score || 0) >= relevanceThreshold
    );

    // Sort by relevance score (highest first)
    relevantDocuments.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

    console.log(`✅ Curator filtered ${allDocuments.length} → ${relevantDocuments.length} relevant documents`);

    // Update state with curated data
    const curatedByCategory: Record<string, Record<string, DocumentData>> = {
      company: {},
      industry: {},
      financial: {},
      news: {}
    };

    for (const doc of relevantDocuments) {
      const category = doc.category || 'company';
      if (curatedByCategory[category]) {
        curatedByCategory[category][doc.url] = doc;
      }
    }

    // Update state with curated data
    state.company_data = curatedByCategory.company;
    state.industry_data = curatedByCategory.industry;
    state.financial_data = curatedByCategory.financial;
    state.news_data = curatedByCategory.news;

    // Prepare reference info for final report
    if (!state.reference_info) {
      state.reference_info = {};
    }
    if (!state.reference_titles) {
      state.reference_titles = {};
    }

    for (const doc of relevantDocuments) {
      state.reference_info[doc.url] = {
        title: doc.title,
        date: doc.date,
        relevance_score: doc.relevance_score
      };
      state.reference_titles[doc.url] = doc.title;
    }

    const msg = [
      `🎯 Curator completed content curation:`,
      `- Processed: ${allDocuments.length} documents`,
      `- Relevant: ${relevantDocuments.length} documents`,
      `- Threshold: ${relevanceThreshold} relevance score`,
      `- Top relevance: ${Math.max(...relevantDocuments.map(d => d.relevance_score || 0)).toFixed(2)}`
    ].join('\n');

    await this.sendUpdate(
      state,
      `Curated ${relevantDocuments.length} relevant documents from ${allDocuments.length} total`,
      {
        curatedDocuments: relevantDocuments.length,
        totalDocuments: allDocuments.length,
        threshold: relevanceThreshold,
        step: 'Curator'
      },
      onUpdate
    );

    return {
      message: msg,
      curated_documents: relevantDocuments.length
    };
  }

  /**
   * Score documents for relevance using Claude (batch processing)
   */
  private async scoreDocuments(
    state: ResearchState,
    documents: DocumentData[],
    onUpdate?: UpdateCallback
  ): Promise<DocumentData[]> {
    const batchSize = 5; // Process in batches to avoid overwhelming Claude
    const scoredDocuments: DocumentData[] = [];

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      try {
        await this.sendUpdate(
          state,
          `Scoring batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)}`,
          { currentBatch: Math.floor(i / batchSize) + 1, totalBatches: Math.ceil(documents.length / batchSize) },
          onUpdate
        );

        const batchScores = await this.scoreBatch(state, batch);
        scoredDocuments.push(...batchScores);
      } catch (error) {
        console.error('Error scoring batch:', error);
        // Add documents with default score if scoring fails
        for (const doc of batch) {
          scoredDocuments.push({
            ...doc,
            relevance_score: 0.5 // Default score
          });
        }
      }
    }

    return scoredDocuments;
  }

  /**
   * Score a batch of documents using Claude
   */
  private async scoreBatch(
    state: ResearchState,
    documents: DocumentData[]
  ): Promise<DocumentData[]> {
    const prompt = `You are a content curator analyzing documents for relevance to ${state.company} in the ${state.industry} industry.

Score each document's relevance on a scale of 0.0 to 1.0, where:
- 1.0 = Highly relevant, directly about the company
- 0.8 = Very relevant, about the company or direct competitors
- 0.6 = Moderately relevant, about the industry or related topics
- 0.4 = Somewhat relevant, tangentially related
- 0.2 = Low relevance, minimal connection
- 0.0 = Not relevant, unrelated content

Documents to score:
${documents.map((doc, i) => `${i + 1}. Title: ${doc.title}\nSnippet: ${doc.snippet || doc.content.substring(0, 200)}...\n`).join('\n')}

Respond with only the scores as numbers separated by commas (e.g., 0.8,0.6,0.9,0.3,0.7):`;

    try {
      const response = await this.claude.complete(prompt, {
        model: config.claude.quickModel, // Use Haiku for scoring
        maxTokens: 100,
        temperature: 0.3,
      });

      if (!response.success || !response.data) {
        throw new Error('Failed to get relevance scores');
      }

      const scores = response.data
        .split(',')
        .map(s => parseFloat(s.trim()))
        .filter(s => !isNaN(s));

      if (scores.length !== documents.length) {
        console.warn(`Score count mismatch: expected ${documents.length}, got ${scores.length}`);
      }

      return documents.map((doc, index) => ({
        ...doc,
        relevance_score: scores[index] || 0.5 // Default score if parsing fails
      }));

    } catch (error) {
      console.error('Error scoring documents:', error);
      // Return documents with default scores
      return documents.map(doc => ({
        ...doc,
        relevance_score: 0.5
      }));
    }
  }
}