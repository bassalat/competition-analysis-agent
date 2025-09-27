/**
 * Simplified Analysis API Endpoint
 *
 * This endpoint implements the new 5-step competitive intelligence workflow:
 * 1. Generate search queries with Claude
 * 2. Execute searches with Serper
 * 3. Prioritize URLs with Claude
 * 4. Scrape content with Firecrawl
 * 5. Synthesize report with Claude
 *
 * Target: $0.20 per competitor with full transparency
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSimplifiedCompetitorEngine } from '@/lib/engines/simplified-competitor-engine';
import { validateConfig } from '@/lib/config';
import { globalCostTracker } from '@/lib/cost-tracker';

// Maximum file size (50MB total)
const MAX_TOTAL_FILE_SIZE = 50 * 1024 * 1024;

// Maximum number of competitors to analyze
const MAX_COMPETITORS = 50;

// Request timeout (20 minutes for comprehensive analysis)
const REQUEST_TIMEOUT = 20 * 60 * 1000;

export async function POST(request: NextRequest) {
  console.log('Starting simplified competitive intelligence analysis...');

  try {
    // Validate configuration
    validateConfig();

    // Parse multipart form data
    const formData = await request.formData();

    // Extract competitors (files are now optional)
    const competitorsData = formData.get('competitors');
    let competitors: Array<{ name: string; website?: string; description?: string }> = [];

    if (competitorsData) {
      try {
        const parsed = JSON.parse(competitorsData as string);
        if (Array.isArray(parsed)) {
          competitors = parsed.filter(comp =>
            comp && typeof comp === 'object' && comp.name && comp.name.trim().length > 0
          ).slice(0, MAX_COMPETITORS);
        }
      } catch (error) {
        console.warn('Failed to parse competitors data:', error);
      }
    }

    if (competitors.length === 0) {
      return NextResponse.json(
        { error: 'No competitors provided. Please add competitors for analysis.' },
        { status: 400 }
      );
    }

    console.log(`🚀 Starting simplified analysis for ${competitors.length} competitors`);

    // Reset cost tracking for this session
    globalCostTracker.reset();

    const engine = getSimplifiedCompetitorEngine();
    const results = [];
    const startTime = Date.now();

    // Analyze each competitor
    for (let i = 0; i < competitors.length; i++) {
      const competitor = competitors[i];

      console.log(`📊 Analyzing competitor ${i + 1}/${competitors.length}: ${competitor.name}`);

      try {
        const result = await engine.analyzeCompetitor(competitor, undefined, (step, progress) => {
          console.log(`[${competitor.name}] ${step} (${progress}%)`);
        });

        results.push(result);

        console.log(`✅ ${competitor.name} analysis complete - Cost: $${result.metadata.totalCost.toFixed(4)}`);

      } catch (error) {
        console.error(`❌ Analysis failed for ${competitor.name}:`, error);

        // Add failed result to maintain structure
        results.push({
          competitor,
          searchQueries: [],
          searchResults: [],
          prioritizedUrls: [],
          scrapedContent: [],
          finalReport: `# ${competitor.name} - Analysis Failed\n\nAnalysis failed due to error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          metadata: {
            totalCost: 0,
            timestamp: new Date().toISOString(),
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }

    const endTime = Date.now();
    const processingTime = Math.round((endTime - startTime) / 1000);
    const totalCost = globalCostTracker.getSessionCosts().totalCost;
    const avgCostPerCompetitor = totalCost / competitors.length;
    const successfulAnalyses = results.filter(r => r.metadata.success).length;

    console.log(`🎯 Analysis complete! ${successfulAnalyses}/${competitors.length} successful`);
    console.log(`💰 Total cost: $${totalCost.toFixed(4)} | Avg per competitor: $${avgCostPerCompetitor.toFixed(4)}`);
    console.log(`⏱️ Processing time: ${processingTime}s`);

    // Return simplified response with all raw data
    return NextResponse.json({
      success: true,
      data: {
        competitors: results,
        summary: {
          totalCompetitors: competitors.length,
          successfulAnalyses,
          totalCost,
          avgCostPerCompetitor,
          costTargetMet: avgCostPerCompetitor <= 0.20,
          processingTimeSeconds: processingTime
        }
      },
      metadata: {
        processedAt: new Date().toISOString(),
        processingTime: `${processingTime} seconds`,
        competitorsAnalyzed: successfulAnalyses,
        totalCost,
        avgCostPerCompetitor,
        simplified: true
      }
    });

  } catch (error) {
    console.error('Simplified analysis failed:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          {
            error: 'Configuration error: Please ensure all API keys are properly set in your .env.local file',
            details: error.message
          },
          { status: 500 }
        );
      }

      if (error.message.includes('Rate limit')) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded: Too many requests. Please wait a moment and try again.',
            details: error.message
          },
          { status: 429 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Analysis failed due to an unexpected error. Please try again or contact support.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Competitor Intelligence Analysis API',
    version: '1.0.0',
    endpoints: {
      analyze: {
        method: 'POST',
        description: 'Perform comprehensive competitor analysis',
        parameters: {
          files: 'Business documents (PDF, DOCX, TXT, etc.)',
          competitors: 'Optional JSON array of competitor objects with name, website, description',
          userContext: 'Optional JSON object with additional business context'
        },
        limits: {
          maxFileSize: `${Math.round(MAX_TOTAL_FILE_SIZE / 1024 / 1024)}MB total`,
          maxCompetitors: MAX_COMPETITORS,
          timeout: `${Math.round(REQUEST_TIMEOUT / 1000 / 60)} minutes`
        }
      }
    },
    requirements: {
      apiKeys: ['ANTHROPIC_API_KEY', 'SERPER_API_KEY', 'FIRECRAWL_API_KEY'],
      supportedFileTypes: ['PDF', 'DOCX', 'DOC', 'TXT', 'RTF', 'HTML', 'CSV', 'JSON']
    }
  });
}

// Health check endpoint
export async function HEAD() {
  try {
    // Basic health check - verify configuration
    validateConfig();

    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Service-Status': 'healthy',
        'X-API-Version': '1.0.0'
      }
    });
  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'X-Service-Status': 'unhealthy',
        'X-Error': error instanceof Error ? error.message : 'Configuration error'
      }
    });
  }
}