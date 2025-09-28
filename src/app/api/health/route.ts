/**
 * Health Check API Endpoint
 *
 * Provides health status for the competitive intelligence system
 */

import { NextResponse } from 'next/server';
import { validateConfig } from '@/lib/config';
import { ClaudeClient } from '@/lib/api-clients/claude-client';

async function testClaudeAPI(): Promise<{ status: string; error?: string; details?: Record<string, unknown> }> {
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

    // Test Claude API service
    console.log('🔍 Testing Claude API...');

    const claudeResult = await testClaudeAPI();

    console.log('📊 Health check results:');
    console.log('- Configuration:', configStatus);
    console.log('- Claude API:', claudeResult.status);

    const overallStatus = configStatus === 'healthy' && claudeResult.status === 'healthy' ? 'healthy' : 'unhealthy';

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
        application: {
          status: 'healthy',
        },
      },
      capabilities: {
        documentProcessing: configStatus === 'healthy',
        aiAnalysis: configStatus === 'healthy' && claudeResult.status === 'healthy',
      },
      summary: {
        totalServices: 1,
        healthyServices: claudeResult.status === 'healthy' ? 1 : 0,
        issues: [
          ...(configStatus !== 'healthy' ? ['Configuration'] : []),
          ...(claudeResult.status !== 'healthy' ? ['Claude API'] : []),
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