/**
 * Job Status API Route
 * Retrieves the current status and progress of analysis jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus, getQueueStats } from '@/lib/queues/analysis-queue';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Get job status
    const jobStatus = await getJobStatus(jobId);

    // Get queue stats for additional context
    const queueStats = await getQueueStats();

    const response = {
      job: {
        id: jobStatus.id,
        status: jobStatus.status,
        progress: jobStatus.progress,
        queuePosition: jobStatus.queuePosition,
        createdAt: jobStatus.createdAt,
        processedAt: jobStatus.processedAt,
        finishedAt: jobStatus.finishedAt,
        data: jobStatus.data,
        result: jobStatus.result,
        error: jobStatus.error,
      },
      queue: queueStats,
      estimatedTimeRemaining: calculateEstimatedTime(jobStatus, queueStats),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Job status error:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to get job status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function calculateEstimatedTime(
  jobStatus: any,
  queueStats: any
): string | null {
  // If job is completed or failed, no time remaining
  if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
    return null;
  }

  // If job is active, estimate based on progress
  if (jobStatus.status === 'active') {
    const progress = jobStatus.progress || 0;
    if (progress > 0) {
      const elapsed = Date.now() - new Date(jobStatus.processedAt || jobStatus.createdAt).getTime();
      const totalEstimated = (elapsed / progress) * 100;
      const remaining = Math.max(0, totalEstimated - elapsed);
      return formatTime(remaining);
    }
    return '5-10 minutes'; // Default estimate for active jobs
  }

  // If job is waiting, estimate based on queue position
  if (jobStatus.status === 'waiting' && jobStatus.queuePosition) {
    const avgJobTime = 5 * 60 * 1000; // 5 minutes per job
    const estimatedWait = (jobStatus.queuePosition - 1) * avgJobTime;
    return formatTime(estimatedWait);
  }

  return 'Calculating...';
}

function formatTime(milliseconds: number): string {
  const minutes = Math.ceil(milliseconds / (1000 * 60));

  if (minutes < 1) {
    return 'Less than 1 minute';
  }

  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  return `${hours}h ${remainingMinutes}m`;
}