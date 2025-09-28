/**
 * Collector - Aggregates research data from all nodes
 * Follows the exact implementation from company-research-agent repository
 */

import { BaseResearcher, UpdateCallback } from './base-researcher';
import { ResearchState, DocumentData } from '@/types/research';

export class Collector extends BaseResearcher {
  async analyze(
    state: ResearchState,
    onUpdate?: UpdateCallback
  ): Promise<{ message: string; total_documents: number }> {
    console.log('📊 Collector aggregating all research data...');

    // Update current step
    state.currentStep = 'collector';

    await this.sendUpdate(
      state,
      'Collecting and aggregating research data',
      undefined,
      onUpdate
    );

    // Combine all research data
    const allDocuments: Record<string, DocumentData> = {};
    let totalDocuments = 0;

    // Collect from each research category
    const categories = [
      { name: 'company', data: state.company_data },
      { name: 'industry', data: state.industry_data },
      { name: 'financial', data: state.financial_data },
      { name: 'news', data: state.news_data },
    ];

    const categoryCounts: Record<string, number> = {};

    for (const category of categories) {
      if (category.data) {
        const categoryDocs = Object.entries(category.data);
        categoryCounts[category.name] = categoryDocs.length;
        totalDocuments += categoryDocs.length;

        // Add category metadata to documents
        for (const [url, doc] of categoryDocs) {
          if (!allDocuments[url]) {
            allDocuments[url] = {
              ...doc,
              categories: [category.name]
            };
          } else {
            // Document appears in multiple categories
            allDocuments[url] = {
              ...allDocuments[url],
              categories: [...(allDocuments[url].categories || []), category.name]
            };
          }
        }
      } else {
        categoryCounts[category.name] = 0;
      }
    }

    // Remove duplicates and sort by relevance
    const uniqueDocuments = Object.values(allDocuments);
    const deduplicatedCount = uniqueDocuments.length;

    console.log('📈 Collection summary:');
    console.log(`- Company documents: ${categoryCounts.company}`);
    console.log(`- Industry documents: ${categoryCounts.industry}`);
    console.log(`- Financial documents: ${categoryCounts.financial}`);
    console.log(`- News documents: ${categoryCounts.news}`);
    console.log(`- Total collected: ${totalDocuments}`);
    console.log(`- Unique documents: ${deduplicatedCount}`);

    const msg = [
      `📊 Collector completed aggregation:`,
      `- Company: ${categoryCounts.company} documents`,
      `- Industry: ${categoryCounts.industry} documents`,
      `- Financial: ${categoryCounts.financial} documents`,
      `- News: ${categoryCounts.news} documents`,
      `- Total: ${totalDocuments} documents`,
      `- Unique: ${deduplicatedCount} documents`
    ].join('\n');

    await this.sendUpdate(
      state,
      `Collected ${totalDocuments} documents (${deduplicatedCount} unique)`,
      {
        totalDocuments,
        uniqueDocuments: deduplicatedCount,
        categoryCounts,
        step: 'Collector'
      },
      onUpdate
    );

    // Store aggregated data in state for next steps
    if (!state.references) {
      state.references = [];
    }

    // Add unique URLs to references
    for (const doc of uniqueDocuments) {
      if (doc.url && !state.references.includes(doc.url)) {
        state.references.push(doc.url);
      }
    }

    return {
      message: msg,
      total_documents: totalDocuments
    };
  }
}