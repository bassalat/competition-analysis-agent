/**
 * Simplified Streaming Analysis API Endpoint
 *
 * Provides real-time incremental updates for the 5-step competitive intelligence workflow:
 * 1. Generate search queries → Send queries to UI immediately
 * 2. Execute searches → Send results to UI immediately
 * 3. Prioritize URLs → Send URLs to UI immediately
 * 4. Scrape content → Send content to UI immediately
 * 5. Synthesize report → Send final report to UI immediately
 */

import { NextRequest } from 'next/server';
import { getSimplifiedCompetitorEngine } from '@/lib/engines/simplified-competitor-engine';
import { validateConfig } from '@/lib/config';
import { globalCostTracker } from '@/lib/cost-tracker';
import { getClaudeClient } from '@/lib/api-clients/claude-client';
import { getSerperClient } from '@/lib/api-clients/serper-client';

// Maximum number of competitors to analyze
const MAX_COMPETITORS = 50;

// Request timeout (20 minutes for streaming analysis)
const REQUEST_TIMEOUT = 20 * 60 * 1000;

export async function POST(request: NextRequest) {
  console.log('Starting simplified competitive intelligence analysis...');

  try {
    // Validate configuration
    validateConfig();

    // Pre-flight API health checks
    const claude = getClaudeClient();
    const serper = getSerperClient();

    console.log('🔍 Performing pre-flight API health checks...');

    // Test Claude API
    const claudeHealth = await claude.diagnosticCheck();
    if (!claudeHealth.success) {
      console.error('Claude API health check failed:', claudeHealth.error);
      return new Response(
        `data: ${JSON.stringify({
          type: 'error',
          message: `Claude API not available: ${claudeHealth.error}. Please check your ANTHROPIC_API_KEY.`
        })}\n\n`,
        {
          status: 503,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    // Test Serper API
    try {
      const serperHealth = await serper.search('test health check', { maxResults: 1 });
      if (!serperHealth.success) {
        console.warn('Serper API health check failed:', serperHealth.error);
        return new Response(
          `data: ${JSON.stringify({
            type: 'error',
            message: `Serper API not available: ${serperHealth.error}. Please check your SERPER_API_KEY.`
          })}\n\n`,
          {
            status: 503,
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          }
        );
      }
    } catch (serperError) {
      console.warn('Serper API health check failed:', serperError);
      return new Response(
        `data: ${JSON.stringify({
          type: 'error',
          message: `Serper API connection failed. Please check your SERPER_API_KEY.`
        })}\n\n`,
        {
          status: 503,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    console.log('✅ All API health checks passed!');

    // Parse multipart form data
    const formData = await request.formData();

    // Extract competitors
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

    // Validate that we have competitors
    if (competitors.length === 0) {
      return new Response(
        `data: ${JSON.stringify({
          type: 'error',
          message: 'No competitors provided. Please add competitors for analysis.'
        })}\n\n`,
        {
          status: 400,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    console.log(`🚀 Analysis started for ${competitors.length} competitors`);

    // Create response stream
    const stream = new ReadableStream({
      start(controller) {
        let isClosed = false;
        const encoder = new TextEncoder();

        // Helper to send SSE data safely
        const sendData = (data: Record<string, unknown>) => {
          if (isClosed) {
            console.warn('Attempted to send data but connection is closed:', data.type);
            return;
          }
          try {
            const message = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
            console.log('✓ Sent SSE data:', data.type);
          } catch (error) {
            console.error('Failed to send data:', error);
            isClosed = true;
          }
        };

        // Set up timeout for the analysis
        const timeoutId = setTimeout(() => {
          if (!isClosed) {
            sendData({
              type: 'error',
              message: 'Analysis timeout - process taking too long',
              timestamp: new Date().toISOString()
            });
            controller.close();
            isClosed = true;
          }
        }, REQUEST_TIMEOUT);

        // Reset cost tracking
        globalCostTracker.reset();

        // Subscribe to real-time cost updates
        const unsubscribeCosts = globalCostTracker.subscribe((costs) => {
          sendData({
            type: 'cost_update',
            totalCost: costs.totalCost,
            estimatedCost: costs.estimatedCost,
            timestamp: new Date().toISOString()
          });
        });

        // Simplified analysis with single update events
        (async () => {
          try {
            const engine = getSimplifiedCompetitorEngine();
            const startTime = Date.now();

            // Simple state to track everything
            const analysisState = {
              progress: 5,
              message: `Starting analysis for ${competitors.length} competitors`,
              currentCompetitor: '',
              results: [] as Array<{
                competitor: { name: string; website?: string; description?: string };
                currentStep: string;
                searchQueries: string[];
                searchResults: number;
                urlsFound: number;
                contentScraped: number;
                finalReport: string;
                cost: number;
                isComplete: boolean;
                error: string | null;
              }>,
              summary: null as {
                totalCompetitors: number;
                successfulAnalyses: number;
                totalCost: number;
                avgCostPerCompetitor: number;
                processingTimeSeconds: number;
              } | null,
              isComplete: false
            };

            // Helper to send current state
            const sendUpdate = () => {
              sendData({
                type: 'update',
                ...analysisState,
                timestamp: new Date().toISOString()
              });
            };

            sendUpdate();

            for (let i = 0; i < competitors.length; i++) {
              const competitor = competitors[i];
              const competitorProgress = 10 + (i / competitors.length) * 80;

              // Update current state
              analysisState.progress = competitorProgress;
              analysisState.message = `Analyzing ${competitor.name} (${i + 1}/${competitors.length})`;
              analysisState.currentCompetitor = competitor.name;
              sendUpdate();

              // Initialize competitor data
              const competitorData = {
                competitor,
                currentStep: 'Starting...',
                searchQueries: [] as string[],
                searchResults: 0,
                urlsFound: 0,
                contentScraped: 0,
                finalReport: '',
                cost: 0,
                isComplete: false,
                error: null as string | null
              };

              analysisState.results.push(competitorData);

              try {
                const result = await engine.analyzeCompetitor(
                  competitor,
                  undefined,
                  // Progress callback - update current step
                  (step, stepProgress) => {
                    const overallProgress = competitorProgress + (stepProgress / 100) * (80 / competitors.length);
                    analysisState.progress = Math.round(overallProgress);
                    analysisState.message = `${competitor.name}: ${step}`;

                    // Update competitor data
                    competitorData.currentStep = step;

                    sendUpdate();
                  },
                  // Detail callback - update specific data
                  (detailType, detailData) => {
                    switch (detailType) {
                      case 'queries_generated':
                        competitorData.searchQueries = (detailData as { queries?: string[] })?.queries || [];
                        break;
                      case 'search_results':
                        competitorData.searchResults = (detailData as { results?: unknown[] })?.results?.length || 0;
                        break;
                      case 'urls_prioritized':
                        competitorData.urlsFound = (detailData as { urls?: string[] })?.urls?.length || 0;
                        break;
                      case 'content_scraped':
                        competitorData.contentScraped = (detailData as { content?: unknown[] })?.content?.length || 0;
                        break;
                    }
                    sendUpdate();
                  }
                );

                // Mark as complete and add final data
                competitorData.finalReport = result.finalReport || '';
                competitorData.cost = result.metadata.totalCost;
                competitorData.isComplete = true;
                competitorData.currentStep = 'Complete';

                sendUpdate();

              } catch (error) {
                console.error(`Analysis failed for ${competitor.name}:`, error);

                competitorData.error = error instanceof Error ? error.message : 'Unknown error';
                competitorData.isComplete = true;
                competitorData.currentStep = 'Failed';
                competitorData.finalReport = `Analysis failed: ${competitorData.error}`;

                sendUpdate();
              }
            }

            // Calculate final summary
            const endTime = Date.now();
            const processingTime = Math.round((endTime - startTime) / 1000);
            const totalCost = globalCostTracker.getSessionCosts().totalCost;
            const avgCostPerCompetitor = totalCost / competitors.length;
            const successfulAnalyses = analysisState.results.filter(r => r.isComplete && !r.error).length;

            analysisState.summary = {
              totalCompetitors: competitors.length,
              successfulAnalyses,
              totalCost,
              avgCostPerCompetitor,
              processingTimeSeconds: processingTime
            };

            analysisState.progress = 100;
            analysisState.message = `Analysis completed! ${successfulAnalyses}/${competitors.length} successful`;
            analysisState.isComplete = true;

            sendUpdate();

            clearTimeout(timeoutId);
            unsubscribeCosts();

            // Close the stream
            setTimeout(() => {
              if (!isClosed) {
                controller.close();
                isClosed = true;
              }
            }, 1000);

          } catch (error) {
            clearTimeout(timeoutId);
            console.error('Streaming analysis failed:', error);

            if (!isClosed) {
              sendData({
                type: 'update',
                progress: 0,
                message: error instanceof Error ? error.message : 'Analysis failed',
                currentCompetitor: '',
                results: [],
                summary: null,
                isComplete: false,
                error: error instanceof Error ? error.message : 'Analysis failed',
                timestamp: new Date().toISOString()
              });

              setTimeout(() => {
                unsubscribeCosts();
                controller.close();
                isClosed = true;
              }, 100);
            }
          }
        })();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Stream setup failed:', error);

    const errorData = {
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to start analysis',
      timestamp: new Date().toISOString()
    };

    return new Response(
      `data: ${JSON.stringify(errorData)}\n\n`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({
      message: 'Simplified Streaming Competitor Intelligence Analysis API',
      version: '2.0.0',
      description: 'Server-Sent Events endpoint for real-time incremental analysis progress',
      usage: 'Send POST request with multipart form data containing competitors'
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );
}