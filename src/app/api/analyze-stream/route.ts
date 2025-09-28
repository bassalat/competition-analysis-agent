/**
 * Enhanced Streaming Analysis API Endpoint with Redis Queue Integration
 *
 * Now supports both legacy SSE streaming and modern Redis queue-based processing:
 * - Legacy mode: Direct SSE streaming (for backwards compatibility)
 * - Queue mode: Redis job queue with polling (recommended for production)
 *
 * Provides real-time updates for the 5-step competitive intelligence workflow
 */

import { NextRequest } from 'next/server';
import { getSimplifiedCompetitorEngine } from '@/lib/engines/simplified-competitor-engine';
import { validateConfig } from '@/lib/config';
import { globalCostTracker } from '@/lib/cost-tracker';
import { getClaudeClient } from '@/lib/api-clients/claude-client';
import { getSerperClient } from '@/lib/api-clients/serper-client';
import { addAnalysisJob } from '@/lib/queues/analysis-queue';
import { cacheClient } from '@/lib/cache/api-cache';

// Maximum number of competitors to analyze
const MAX_COMPETITORS = 50;

// Request timeout (30 minutes for streaming analysis)
const REQUEST_TIMEOUT = 30 * 60 * 1000;

// Type definition for controller errors
interface ControllerError extends Error {
  code?: string;
}

// Type guard to safely check if error is a controller error
const isControllerError = (error: unknown): error is ControllerError => {
  return error instanceof Error;
};

export async function POST(request: NextRequest) {
  console.log('Starting enhanced competitive intelligence analysis...');

  try {
    // Check for queue mode parameter
    const url = new URL(request.url);
    const useQueue = url.searchParams.get('queue') === 'true';

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

    console.log(`🚀 Analysis started for ${competitors.length} competitors (Mode: ${useQueue ? 'Queue' : 'SSE'})`);

    // If queue mode is enabled, use Redis job queue
    if (useQueue) {
      return await handleQueueMode(competitors, formData);
    }

    // Legacy SSE streaming mode (for backwards compatibility)
    // Create response stream
    const stream = new ReadableStream({
      start(controller) {
        let isClosed = false;
        const encoder = new TextEncoder();

        // Helper to send SSE data safely with proper encoding
        const sendData = (data: Record<string, unknown>) => {
          if (isClosed) {
            console.warn('Attempted to send data but connection is closed:', data.type);
            return;
          }
          try {
            const message = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
            console.log('Successfully sent SSE data:', data.type, data.progress || 'no-progress');
          } catch (error) {
            console.error('Failed to send data:', error, 'Data type:', data.type);
            // Mark as closed if controller errors occur
            if (isControllerError(error) && (error.code === 'ERR_INVALID_STATE' || error.message?.includes('Controller is already closed'))) {
              isClosed = true;
            } else {
              isClosed = true;
            }
          }
        };

        // Helper to send keep-alive/flush messages for Railway proxy handling
        const sendKeepAlive = () => {
          if (isClosed) return;
          try {
            // Send a comment (keeps connection alive but invisible to client)
            const keepAlive = ": keep-alive\n\n";
            controller.enqueue(encoder.encode(keepAlive));
          } catch (error) {
            console.warn('Failed to send keep-alive:', error);
            // Mark as closed if controller errors occur
            if (isControllerError(error) && (error.code === 'ERR_INVALID_STATE' || error.message?.includes('Controller is already closed'))) {
              isClosed = true;
            }
          }
        };

        // Set up periodic keep-alive messages to prevent proxy buffering
        const keepAliveInterval = setInterval(() => {
          if (isClosed) {
            clearInterval(keepAliveInterval);
            return;
          }
          sendKeepAlive();
        }, 2000); // Every 2 seconds

        // Set up timeout for the analysis
        const timeoutId = setTimeout(() => {
          if (!isClosed) {
            clearInterval(keepAliveInterval);
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
              // Step 1: Send pre-completion signal to prepare frontend
              sendData({
                type: 'progress',
                progress: 99,
                message: 'Analysis complete, preparing final report...',
                timestamp: new Date().toISOString()
              });
              sendKeepAlive(); // Force a flush

              // Step 2: Send completion metadata first (smaller payload)
              setTimeout(() => {
                if (!isClosed) {
                  sendData({
                    type: 'completion_metadata',
                    message: `Analysis completed! ${successfulAnalyses}/${competitors.length} successful. Avg cost: $${avgCostPerCompetitor.toFixed(4)}/competitor`,
                    summary: finalData.summary,
                    timestamp: new Date().toISOString()
                  });
                  sendKeepAlive();
                }
              }, 200);

              // Step 3: Send the complete data in chunks to avoid buffering
              setTimeout(() => {
                if (!isClosed) {
                  // Break finalData into smaller chunks if it's large
                  const dataSize = JSON.stringify(finalData).length;
                  console.log(`Final data size: ${dataSize} bytes, competitors: ${competitors.length}, chunking: ${dataSize > 50000}`);
                  if (dataSize > 50000) { // If larger than 50KB
                    // Send competitors data in smaller batches
                    const competitors = finalData.competitors || [];

                    // Special case for single competitor - ensure data delivery
                    if (competitors.length === 1) {
                      console.log('Single competitor with large data, using direct delivery in complete event');
                      // Send complete event with full data immediately (no chunking needed for single competitor)
                      sendData({
                        type: 'complete',
                        progress: 100,
                        chunked: false, // Mark as non-chunked since we're delivering directly
                        data: {
                          competitors: finalData.competitors,
                          summary: finalData.summary
                        },
                        message: `Analysis completed! ${successfulAnalyses}/${competitors.length} successful. Avg cost: $${avgCostPerCompetitor.toFixed(4)}/competitor`,
                        timestamp: new Date().toISOString()
                      });
                      sendKeepAlive(); // Force immediate flush

                      // Send completion verification signal with aggressive flushing
                      setTimeout(() => {
                        if (!isClosed) {
                          sendData({
                            type: 'completion_verified',
                            progress: 100,
                            message: 'Analysis completed successfully',
                            timestamp: new Date().toISOString()
                          });
                          sendKeepAlive();
                          // Multiple flush attempts for Railway proxy
                          setTimeout(() => sendKeepAlive(), 100);
                          setTimeout(() => sendKeepAlive(), 300);
                          setTimeout(() => sendKeepAlive(), 500);
                        }
                      }, 200);
                      return; // Exit early to avoid normal chunked logic
                    }

                    const batchSize = Math.max(1, Math.floor(competitors.length / 3));

                    for (let i = 0; i < competitors.length; i += batchSize) {
                      const batch = competitors.slice(i, i + batchSize);
                      setTimeout(() => {
                        if (!isClosed) {
                          sendData({
                            type: 'data_chunk',
                            chunkIndex: Math.floor(i / batchSize),
                            totalChunks: Math.ceil(competitors.length / batchSize),
                            data: { competitors: batch },
                            timestamp: new Date().toISOString()
                          });
                          sendKeepAlive();
                        }
                      }, i * 100); // Stagger chunks by 100ms
                    }

                    // Send final completion after all chunks - INCLUDE SUMMARY DATA
                    setTimeout(() => {
                      if (!isClosed) {
                        sendData({
                          type: 'complete',
                          progress: 100,
                          chunked: true,
                          // CRITICAL FIX: Include summary data for chunked delivery
                          data: {
                            competitors: [], // Competitors already sent in chunks
                            summary: finalData.summary // Ensure summary is available for frontend
                          },
                          message: `Analysis completed! ${successfulAnalyses}/${competitors.length} successful. Avg cost: $${avgCostPerCompetitor.toFixed(4)}/competitor`,
                          timestamp: new Date().toISOString()
                        });
                        sendKeepAlive(); // Force immediate flush
                        // Send completion verification signal
                        setTimeout(() => {
                          if (!isClosed) {
                            sendData({
                              type: 'completion_verified',
                              progress: 100,
                              message: 'Analysis completed successfully',
                              timestamp: new Date().toISOString()
                            });
                            sendKeepAlive();
                          }
                        }, 200);
                      }
                    }, competitors.length * 100 + 500);
                  } else {
                    // Send complete data if it's small enough
                    console.log('Sending non-chunked completion data with', JSON.stringify(finalData).length, 'characters');
                    sendData({
                      type: 'complete',
                      progress: 100,
                      data: {
                        competitors: finalData.competitors,
                        summary: finalData.summary
                      }, // Fix data structure to match frontend expectations
                      message: `Analysis completed! ${successfulAnalyses}/${competitors.length} successful. Avg cost: $${avgCostPerCompetitor.toFixed(4)}/competitor`,
                      timestamp: new Date().toISOString()
                    });
                    sendKeepAlive(); // Ensure data is flushed
                    // Send completion verification signal
                    setTimeout(() => {
                      if (!isClosed) {
                        sendData({
                          type: 'completion_verified',
                          progress: 100,
                          message: 'Analysis completed successfully',
                          timestamp: new Date().toISOString()
                        });
                        sendKeepAlive();
                      }
                    }, 200);
                  }
                }
              }, 500);

              // Step 4: Aggressive cleanup with multiple flush attempts
              setTimeout(() => {
                if (!isClosed) {
                  clearInterval(keepAliveInterval);

                  // Multiple flush attempts with increasing delays
                  const flushAttempts = [100, 300, 500, 1000];
                  flushAttempts.forEach((delay, index) => {
                    setTimeout(() => {
                      if (!isClosed) {
                        try {
                          sendKeepAlive();
                          if (index === flushAttempts.length - 1) {
                            // Final cleanup
                            const endMessage = "event: end\ndata: {}\n\n";
                            controller.enqueue(encoder.encode(endMessage));
                            unsubscribeCosts();
                            controller.close();
                            isClosed = true;
                          }
                        } catch (error) {
                          console.warn(`Failed flush attempt ${index + 1}:`, error);
                        }
                      }
                    }, delay);
                  });
                }
              }, 1500); // Start flush sequence after 1.5s
            }

          } catch (error) {
            clearTimeout(timeoutId);
            console.error('Streaming analysis failed:', error);

            if (!isClosed) {
              clearInterval(keepAliveInterval);
              sendData({
                type: 'error',
                message: error instanceof Error ? error.message : 'Analysis failed',
                progress: -1,
                timestamp: new Date().toISOString()
              });

              // Add delay before closing on error as well
              setTimeout(() => {
                if (!isClosed) {
                  unsubscribeCosts();
                  controller.close();
                  isClosed = true;
                }
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
        'Transfer-Encoding': 'chunked',
        // Railway/nginx proxy buffering prevention
        'X-Accel-Buffering': 'no',
        'X-Proxy-Buffering': 'no',
        'Proxy-Buffering': 'no',
        'Buffering': 'no',
        // Additional Railway-specific headers
        'X-Content-Type-Options': 'nosniff',
        'X-Railway-No-Buffer': 'true',
        'X-Stream-Output': 'true',
        // CORS headers
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

/**
 * Handle queue-based analysis mode
 */
async function handleQueueMode(
  competitors: Array<{ name: string; website?: string; description?: string }>,
  formData: FormData
): Promise<Response> {
  try {
    // Extract business context from form data
    let businessContext = '';
    const contextData = formData.get('businessContext');
    if (contextData) {
      businessContext = contextData.toString();
    }

    // Extract files if any
    const files: string[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file') && value instanceof File) {
        files.push(value.name);
      }
    }

    // Check cache first
    const competitorNames = competitors.map(c => c.name);
    const cachedResult = await cacheClient.getCachedAnalysisResult(competitorNames, businessContext);

    if (cachedResult) {
      console.log('🎯 Returning cached analysis result');
      return Response.json({
        success: true,
        cached: true,
        data: cachedResult,
        message: 'Analysis retrieved from cache',
      });
    }

    // Create job
    const job = await addAnalysisJob({
      competitors: competitorNames,
      businessContext,
      files,
      analysisMode: 'standard',
    });

    console.log(`📋 Created analysis job ${job.id} for queue mode`);

    return Response.json({
      success: true,
      useQueue: true,
      jobId: job.id?.toString(),
      message: `Analysis job created for ${competitors.length} competitor(s)`,
      pollUrl: `/api/jobs/${job.id}/status`,
      estimatedTime: estimateAnalysisTime(competitors.length, 'standard'),
    });

  } catch (error) {
    console.error('Queue mode error:', error);
    return Response.json(
      {
        error: 'Failed to create analysis job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function estimateAnalysisTime(competitorCount: number, analysisMode: string): string {
  const baseTimeMinutes = analysisMode === 'quick' ? 2 :
                         analysisMode === 'comprehensive' ? 8 : 4;

  const totalMinutes = Math.ceil(baseTimeMinutes * competitorCount * 1.2); // Add 20% buffer

  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  return `${hours}h ${minutes}m`;
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