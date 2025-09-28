/**
 * Health Check API Endpoint
 *
 * Provides health status for the competitive intelligence system
 */

import { NextResponse } from 'next/server';
import { validateConfig } from '@/lib/config';
import { ClaudeClient } from '@/lib/api-clients/claude-client';
import { SerperClient } from '@/lib/api-clients/serper-client';
import { FirecrawlClient } from '@/lib/api-clients/firecrawl-client';
import { HealthDetails } from '@/types/api';

async function testClaudeAPI(): Promise<{ status: string; error?: string; details?: HealthDetails }> {
  try {
    const claude = new ClaudeClient();
    const response = await claude.complete('Test prompt: respond with "API working"');

    if (response.success && response.data) {
      return {
        status: 'healthy',
        details: {
          responseLength: response.data.length,
          model: 'connected',
        }
      };
    } else {
      return {
        status: 'unhealthy',
        error: response.error || 'No response data',
        details: { success: response.success }
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Claude API test failed',
    };
  }
}

async function testSerperAPI(): Promise<{ status: string; error?: string; details?: HealthDetails }> {
  try {
    const serper = new SerperClient();
    const response = await serper.search('test query', { maxResults: 1 });

    if (response.success && response.data) {
      return {
        status: 'healthy',
        details: {
          resultsCount: response.data.length,
          hasResults: response.data.length > 0,
        }
      };
    } else {
      return {
        status: 'unhealthy',
        error: response.error || 'No search results',
        details: { success: response.success }
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Serper API test failed',
    };
  }
}

async function testFirecrawlAPI(): Promise<{ status: string; error?: string; details?: HealthDetails }> {
  try {
    const firecrawl = new FirecrawlClient();
    // Test with a simple, reliable URL
    const response = await firecrawl.scrapeUrl('https://example.com');

    if (response.success && response.data) {
      return {
        status: 'healthy',
        details: {
          title: response.data.title,
          hasContent: !!response.data.text,
          contentLength: response.data.text?.length || 0,
        }
      };
    } else {
      return {
        status: 'unhealthy',
        error: response.error || 'Scraping failed',
        details: { success: response.success }
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Firecrawl API test failed',
    };
  }
}


export async function GET() {
  try {
    console.log('🏥 Starting comprehensive health check...');

    // Check configuration
    let configStatus = 'healthy';
    let configError = null;

    try {
      validateConfig();
      console.log('✅ Configuration validation passed');
    } catch (error) {
      configStatus = 'unhealthy';
      configError = error instanceof Error ? error.message : 'Configuration validation failed';
      console.error('❌ Configuration validation failed:', configError);
    }

    // Test each API service
    console.log('🔍 Testing API services...');

    const [claudeHealth, serperHealth, firecrawlHealth] = await Promise.allSettled([
      testClaudeAPI(),
      testSerperAPI(),
      testFirecrawlAPI(),
    ]);

    const getHealthResult = (result: PromiseSettledResult<{ status: string; error?: string; details?: HealthDetails }>) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          status: 'unhealthy',
          error: result.reason?.message || 'Promise rejected',
        };
      }
    };

    const claudeResult = getHealthResult(claudeHealth);
    const serperResult = getHealthResult(serperHealth);
    const firecrawlResult = getHealthResult(firecrawlHealth);

    console.log('📊 Health check results:');
    console.log('- Configuration:', configStatus);
    console.log('- Claude API:', claudeResult.status);
    console.log('- Serper API:', serperResult.status);
    console.log('- Firecrawl API:', firecrawlResult.status);

    const overallStatus = configStatus === 'healthy' &&
                         claudeResult.status === 'healthy' &&
                         serperResult.status === 'healthy' &&
                         firecrawlResult.status === 'healthy' ? 'healthy' : 'unhealthy';

    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        configuration: {
          status: configStatus,
          error: configError,
        },
        claude: claudeResult,
        serper: serperResult,
        firecrawl: firecrawlResult,
        application: {
          status: 'healthy',
        },
      },
      capabilities: {
        documentProcessing: configStatus === 'healthy',
        aiAnalysis: configStatus === 'healthy' && claudeResult.status === 'healthy',
        webSearch: configStatus === 'healthy' && serperResult.status === 'healthy',
        webScraping: configStatus === 'healthy' && firecrawlResult.status === 'healthy',
        streamingAnalysis: true
      },
      summary: {
        totalServices: 3,
        healthyServices: [claudeResult.status, serperResult.status, firecrawlResult.status].filter(s => s === 'healthy').length,
        issues: [
          ...(configStatus !== 'healthy' ? ['Configuration'] : []),
          ...(claudeResult.status !== 'healthy' ? ['Claude API'] : []),
          ...(serperResult.status !== 'healthy' ? ['Serper API'] : []),
          ...(firecrawlResult.status !== 'healthy' ? ['Firecrawl API'] : []),
        ]
      }
    };

    return NextResponse.json(healthData, {
      status: overallStatus === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('❌ Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed',
      },
      { status: 500 }
    );
  }
}