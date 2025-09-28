/**
 * Job Creation API Route
 * Creates new competitive analysis jobs and adds them to the Redis queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { addAnalysisJob, AnalysisJobData } from '@/lib/queues/analysis-queue';
import { cacheClient } from '@/lib/cache/api-cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { competitors, businessContext, analysisMode = 'standard', userId } = body;

    // Validation
    if (!competitors || !Array.isArray(competitors) || competitors.length === 0) {
      return NextResponse.json(
        { error: 'Competitors array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!businessContext || typeof businessContext !== 'string') {
      return NextResponse.json(
        { error: 'Business context is required' },
        { status: 400 }
      );
    }

    if (competitors.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 competitors allowed per analysis' },
        { status: 400 }
      );
    }

    // Check for cached results first
    const cachedResult = await cacheClient.getCachedAnalysisResult(competitors, businessContext);
    if (cachedResult) {
      console.log('🎯 Returning cached analysis result');
      return NextResponse.json({
        success: true,
        cached: true,
        data: cachedResult,
        message: 'Analysis retrieved from cache',
      });
    }

    // Create job data
    const jobData: AnalysisJobData = {
      competitors: competitors.map((c: any) => typeof c === 'string' ? c : c.name),
      businessContext,
      analysisMode,
      userId: userId || 'anonymous',
    };

    // Add job to queue
    const job = await addAnalysisJob(jobData);

    console.log(`📋 Created analysis job ${job.id} for ${competitors.length} competitors`);

    return NextResponse.json({
      success: true,
      jobId: job.id?.toString(),
      queuePosition: await getQueuePosition(job.id?.toString()),
      estimatedTime: estimateAnalysisTime(competitors.length, analysisMode),
      message: `Analysis job created for ${competitors.length} competitor(s)`,
    });

  } catch (error) {
    console.error('Job creation error:', error);

    return NextResponse.json(
      {
        error: 'Failed to create analysis job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function getQueuePosition(jobId: string | undefined): Promise<number | undefined> {
  if (!jobId) return undefined;

  try {
    const { getAnalysisQueue } = await import('@/lib/queues/analysis-queue');
    const queue = getAnalysisQueue();
    const waitingJobs = await queue.getWaiting();
    const position = waitingJobs.findIndex(job => job.id?.toString() === jobId);
    return position >= 0 ? position + 1 : undefined;
  } catch (error) {
    console.error('Error getting queue position:', error);
    return undefined;
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