/**
 * Simplified Streaming Analysis API Endpoint
 *
 * Provides real-time updates for the new 5-step competitive intelligence workflow:
 * 1. Generate search queries with Claude
 * 2. Execute searches with Serper
 * 3. Prioritize URLs with Claude
 * 4. Scrape content with Firecrawl
 * 5. Synthesize report with Claude
 *
 * Streams progress updates via Server-Sent Events for full transparency
 */

import { NextRequest } from 'next/server';
import { getSimplifiedCompetitorEngine } from '@/lib/engines/simplified-competitor-engine';
import { validateConfig } from '@/lib/config';
import { globalCostTracker } from '@/lib/cost-tracker';
import { getClaudeClient } from '@/lib/api-clients/claude-client';
import { getSerperClient } from '@/lib/api-clients/serper-client';

// Maximum number of competitors to analyze
const MAX_COMPETITORS = 50;

// Request timeout (30 minutes for streaming analysis)
const REQUEST_TIMEOUT = 30 * 60 * 1000;

export async function POST(request: NextRequest) {
  console.log('Starting simplified streaming competitive intelligence analysis...');

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
          error: `Claude API not available: ${claudeHealth.error}. Please check your ANTHROPIC_API_KEY.`
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
            error: `Serper API not available: ${serperHealth.error}. Please check your SERPER_API_KEY.`
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
          error: `Serper API connection failed. Please check your SERPER_API_KEY.`
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
          error: 'No competitors provided. Please add competitors for analysis.'
        })}\n\n`,
        {
          status: 400,
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    console.log(`🚀 Streaming analysis started for ${competitors.length} competitors`);

    // Create response stream
    const stream = new ReadableStream({
      start(controller) {
        let isClosed = false;

        // Helper to send SSE data safely
        const sendData = (data: Record<string, unknown>) => {
          if (isClosed) return;
          try {
            controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
          } catch (error) {
            console.warn('Failed to send data:', error);
            isClosed = true;
          }
        };

        // Set up timeout for the analysis
        const timeoutId = setTimeout(() => {
          if (!isClosed) {
            sendData({
              type: 'timeout',
              message: 'Analysis timeout - process taking too long',
              progress: -1,
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

        // Perform simplified analysis with streaming
        (async () => {
          try {
            const engine = getSimplifiedCompetitorEngine();
            const results = [];
            const startTime = Date.now();

            sendData({
              type: 'progress',
              progress: 5,
              message: `Starting analysis for ${competitors.length} competitors`,
              timestamp: new Date().toISOString()
            });

            for (let i = 0; i < competitors.length; i++) {
              const competitor = competitors[i];
              const competitorProgress = 10 + (i / competitors.length) * 80;

              sendData({
                type: 'progress',
                progress: competitorProgress,
                message: `Analyzing ${competitor.name} (${i + 1}/${competitors.length})`,
                timestamp: new Date().toISOString()
              });

              try {
                const result = await engine.analyzeCompetitor(
                  competitor,
                  undefined,
                  (step, stepProgress) => {
                    const overallProgress = competitorProgress + (stepProgress / 100) * (80 / competitors.length);
                    sendData({
                      type: 'progress',
                      progress: Math.round(overallProgress),
                      message: `[${competitor.name}] ${step}`,
                      timestamp: new Date().toISOString(),
                      competitor: competitor.name,
                      step: step,
                      stepProgress
                    });
                  },
                  (detailType, detailData) => {
                    // Stream detailed analysis data
                    sendData({
                      type: 'analysis_detail',
                      detailType,
                      data: detailData,
                      competitor: competitor.name,
                      timestamp: new Date().toISOString()
                    });
                  }
                );

                results.push(result);

                sendData({
                  type: 'competitor_complete',
                  competitor: competitor.name,
                  result,
                  cost: result.metadata.totalCost,
                  progress: Math.round(competitorProgress + (80 / competitors.length)),
                  timestamp: new Date().toISOString()
                });

              } catch (error) {
                console.error(`Analysis failed for ${competitor.name}:`, error);

                const failedResult = {
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
                };

                results.push(failedResult);

                sendData({
                  type: 'competitor_error',
                  competitor: competitor.name,
                  error: error instanceof Error ? error.message : 'Unknown error',
                  progress: Math.round(competitorProgress + (80 / competitors.length)),
                  timestamp: new Date().toISOString()
                });
              }
            }

            const endTime = Date.now();
            const processingTime = Math.round((endTime - startTime) / 1000);
            const totalCost = globalCostTracker.getSessionCosts().totalCost;
            const avgCostPerCompetitor = totalCost / competitors.length;
            const successfulAnalyses = results.filter(r => r.metadata.success).length;

            sendData({
              type: 'progress',
              progress: 95,
              message: 'Finalizing results...',
              timestamp: new Date().toISOString()
            });

            const finalData = {
              competitors: results,
              summary: {
                totalCompetitors: competitors.length,
                successfulAnalyses,
                totalCost,
                avgCostPerCompetitor,
                costTargetMet: avgCostPerCompetitor <= 0.20,
                processingTimeSeconds: processingTime
              }
            };

            clearTimeout(timeoutId);

            if (!isClosed) {
              sendData({
                type: 'complete',
                message: `Analysis completed! ${successfulAnalyses}/${competitors.length} successful. Avg cost: $${avgCostPerCompetitor.toFixed(4)}/competitor`,
                progress: 100,
                data: finalData,
                timestamp: new Date().toISOString()
              });
              unsubscribeCosts();
              controller.close();
              isClosed = true;
            }

          } catch (error) {
            clearTimeout(timeoutId);
            console.error('Streaming analysis failed:', error);

            if (!isClosed) {
              sendData({
                type: 'error',
                message: error instanceof Error ? error.message : 'Analysis failed',
                progress: -1,
                timestamp: new Date().toISOString()
              });
              unsubscribeCosts();
              controller.close();
              isClosed = true;
            }
          }
        })();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
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
      progress: -1,
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
      message: 'Streaming Competitor Intelligence Analysis API',
      version: '1.0.0',
      description: 'Server-Sent Events endpoint for real-time analysis progress',
      usage: 'Send POST request with multipart form data containing files and competitors'
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );
}