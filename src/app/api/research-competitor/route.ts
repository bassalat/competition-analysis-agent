/**
 * Main competitor research endpoint
 * Executes the complete research workflow following company-research-agent repository
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCompetitorResearchEngine } from '@/lib/engines';
import { CompetitorResearchRequest } from '@/types/research';
import { Competitor, BusinessContext } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting competitor research...');

    // Parse request body
    const body = await request.json();
    const { competitor, businessContext, options } = body as {
      competitor: Competitor;
      businessContext?: BusinessContext;
      options?: {
        skipWebsiteScraping?: boolean;
        maxDocumentsPerCategory?: number;
        includeNews?: boolean;
      };
    };

    // Validate required fields
    if (!competitor || !competitor.name) {
      return NextResponse.json(
        { success: false, error: 'Competitor name is required' },
        { status: 400 }
      );
    }

    console.log(`📊 Research request for: ${competitor.name}`);

    // Create research request
    const researchRequest: CompetitorResearchRequest = {
      competitor,
      businessContext,
      options: {
        skipWebsiteScraping: false,
        maxDocumentsPerCategory: 10,
        includeNews: true,
        ...options,
      },
    };

    // Execute research
    const engine = getCompetitorResearchEngine();
    const result = await engine.research(researchRequest);

    if (!result.success) {
      console.error(`❌ Research failed for ${competitor.name}:`, result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Research failed',
          competitor: competitor.name,
        },
        { status: 500 }
      );
    }

    console.log(`✅ Research completed for ${competitor.name}`);
    console.log(`📄 Report length: ${result.report.length} characters`);
    console.log(`📊 Total documents: ${result.metadata.totalDocuments}`);
    console.log(`⏱️ Duration: ${result.metadata.duration.toFixed(2)} seconds`);
    console.log(`💰 Estimated cost: $${result.metadata.costEstimate.toFixed(3)}`);

    return NextResponse.json({
      success: true,
      data: {
        competitor: result.competitor,
        report: result.report,
        briefings: result.briefings,
        metadata: result.metadata,
        state: {
          status: result.state.status,
          completedSteps: result.state.completedSteps,
          startTime: result.state.startTime,
          endTime: result.state.endTime,
        },
      },
    });

  } catch (error) {
    console.error('❌ API Error in research-competitor:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        error: `Research failed: ${errorMessage}`,
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Competitor Research API',
      endpoints: {
        POST: '/api/research-competitor',
        'POST (streaming)': '/api/research-competitor-stream',
      },
      version: '1.0.0',
    },
    { status: 200 }
  );
}