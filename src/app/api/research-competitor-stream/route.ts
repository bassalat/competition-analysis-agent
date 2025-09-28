/**
 * Streaming competitor research endpoint with SSE
 * Provides real-time updates during research workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCompetitorResearchEngine } from '@/lib/engines';
import { CompetitorResearchRequest, ResearchUpdate } from '@/types/research';
import { Competitor, BusinessContext } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting streaming competitor research...');

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

    console.log(`📊 Streaming research request for: ${competitor.name}`);

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Setup update callback for real-time progress
        const onUpdate = async (update: ResearchUpdate) => {
          try {
            const data = `data: ${JSON.stringify({
              ...update,
              type: 'update'
            })}\n\n`;

            controller.enqueue(encoder.encode(data));
            console.log(`📡 SSE: ${update.step} - ${update.message}`);
          } catch (error) {
            console.error('SSE update error:', error);
          }
        };

        // Execute research with streaming updates
        const executeResearch = async () => {
          try {
            // Send initial update
            await onUpdate({
              type: 'status',
              step: 'grounding',
              message: `Starting research for ${competitor.name}`,
              progress: 0,
              timestamp: new Date().toISOString(),
            });

            // Create research request
            const researchRequest: CompetitorResearchRequest = {
              competitor,
              businessContext,
              options: {
                skipWebsiteScraping: false,
                maxDocumentsPerCategory: 10,
                includeNews: true,
                onUpdate,
                ...options,
              },
            };

            // Execute research with streaming
            const engine = getCompetitorResearchEngine();
            const result = await engine.research(researchRequest);

            if (result.success) {
              // Send final result
              await onUpdate({
                type: 'result',
                step: 'editor',
                message: 'Research completed successfully',
                progress: 100,
                data: {
                  report: result.report,
                  briefings: result.briefings,
                  metadata: result.metadata,
                  competitor: result.competitor,
                },
                timestamp: new Date().toISOString(),
              });

              console.log(`✅ Streaming research completed for ${competitor.name}`);
            } else {
              // Send error
              await onUpdate({
                type: 'error',
                step: 'grounding',
                message: `Research failed: ${result.error}`,
                timestamp: new Date().toISOString(),
              });

              console.error(`❌ Streaming research failed for ${competitor.name}:`, result.error);
            }

            // Send completion signal
            const completionData = `data: ${JSON.stringify({
              type: 'complete',
              success: result.success,
              timestamp: new Date().toISOString(),
            })}\n\n`;

            controller.enqueue(encoder.encode(completionData));

          } catch (error) {
            console.error('❌ Streaming research error:', error);

            // Send error update
            const errorData = `data: ${JSON.stringify({
              type: 'error',
              step: 'grounding',
              message: `Research failed: ${error}`,
              timestamp: new Date().toISOString(),
            })}\n\n`;

            controller.enqueue(encoder.encode(errorData));
          } finally {
            // Close the stream
            controller.close();
          }
        };

        // Start research asynchronously
        executeResearch().catch(error => {
          console.error('Research execution error:', error);
          controller.close();
        });
      },

      cancel() {
        console.log('🛑 SSE stream cancelled');
      }
    });

    // Return SSE response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('❌ API Error in research-competitor-stream:', error);

    return NextResponse.json(
      {
        success: false,
        error: `Streaming research failed: ${error}`,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Competitor Research Streaming API',
      description: 'Use POST to start streaming research with real-time updates',
      contentType: 'text/event-stream',
      version: '1.0.0',
    },
    { status: 200 }
  );
}