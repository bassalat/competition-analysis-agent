/**
 * AI Engines - Simplified exports for the new $0.20/competitor analysis approach
 */

import {
  getSimplifiedCompetitorEngine as _getSimplifiedCompetitorEngine,
  SimplifiedCompetitorEngine
} from './simplified-competitor-engine';

// Main Simplified Engine Export (New $0.20/competitor approach)
export {
  SimplifiedCompetitorEngine,
  getSimplifiedCompetitorEngine,
} from './simplified-competitor-engine';

// Export types for the simplified engine
export type {
  Competitor,
  SearchQuery,
  SearchResult,
  PrioritizedUrl,
  ScrapedContent,
  CompetitorAnalysisResult
} from './simplified-competitor-engine';

/**
 * Get the simplified competitor engine instance
 */
export function getSimplifiedEngine(): SimplifiedCompetitorEngine {
  return _getSimplifiedCompetitorEngine();
}