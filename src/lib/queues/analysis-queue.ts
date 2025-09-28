/**
 * Analysis Job Queue
 * Manages competitive analysis jobs using Bull queue with Redis backend
 */

import Bull from 'bull';
import { getRedisClient } from '../redis/client';
import type { CompetitorAnalysisRequest, CompetitorAnalysisResponse } from '@/types/api';

export interface AnalysisJobData {
  competitors: string[];
  businessContext: string;
  files?: string[]; // File paths or identifiers
  userId?: string; // For tracking user sessions
  analysisMode?: 'quick' | 'standard' | 'comprehensive';
}

export interface AnalysisJobResult {
  success: boolean;
  data?: CompetitorAnalysisResponse;
  error?: string;
  timestamp: string;
}

export interface AnalysisJobProgress {
  step: string;
  progress: number;
  message: string;
  timestamp: string;
  competitor?: string;
}

// Create queue instance
let analysisQueue: Bull.Queue<AnalysisJobData> | null = null;

export function getAnalysisQueue(): Bull.Queue<AnalysisJobData> {
  if (!analysisQueue) {
    const redisClient = getRedisClient();

    analysisQueue = new Bull<AnalysisJobData>('competitive-analysis', {
      redis: {
        port: redisClient.options.port,
        host: redisClient.options.host,
        password: redisClient.options.password,
        db: redisClient.options.db || 0,
      },
      defaultJobOptions: {
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 5,      // Keep last 5 failed jobs
        attempts: 3,          // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000,        // Start with 2 second delay
        },
        delay: 0,             // Start immediately
        timeout: 600000,      // 10 minute timeout
      },
    });

    // Queue event handlers
    analysisQueue.on('waiting', (jobId) => {
      console.log(`📋 Job ${jobId} is waiting to be processed`);
    });

    analysisQueue.on('active', (job) => {
      console.log(`🔄 Job ${job.id} started processing`);
    });

    analysisQueue.on('completed', (job, result) => {
      console.log(`✅ Job ${job.id} completed successfully`);
    });

    analysisQueue.on('failed', (job, err) => {
      console.error(`❌ Job ${job.id} failed:`, err.message);
    });

    analysisQueue.on('progress', (job, progress) => {
      console.log(`📊 Job ${job.id} progress: ${progress}%`);
    });

    analysisQueue.on('stalled', (job) => {
      console.warn(`⚠️ Job ${job.id} stalled`);
    });
  }

  return analysisQueue;
}

export async function addAnalysisJob(
  data: AnalysisJobData,
  options?: Bull.JobOptions
): Promise<Bull.Job<AnalysisJobData>> {
  const queue = getAnalysisQueue();

  const jobData: AnalysisJobData = {
    ...data,
    analysisMode: data.analysisMode || 'standard',
  };

  const job = await queue.add('analyze-competitors', jobData, {
    ...options,
    priority: data.analysisMode === 'comprehensive' ? 1 :
              data.analysisMode === 'quick' ? 3 : 2, // Higher number = lower priority
  });

  console.log(`📋 Created analysis job ${job.id} for ${data.competitors.length} competitors`);

  return job;
}

export async function getJobStatus(jobId: string): Promise<{
  id: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'stalled';
  progress: number;
  data?: AnalysisJobData;
  result?: AnalysisJobResult;
  error?: any;
  createdAt: Date;
  processedAt?: Date;
  finishedAt?: Date;
  queuePosition?: number;
}> {
  const queue = getAnalysisQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  // Get queue position for waiting jobs
  let queuePosition: number | undefined;
  if (await job.isWaiting()) {
    const waitingJobs = await queue.getWaiting();
    queuePosition = waitingJobs.findIndex(j => j.id === job.id) + 1;
  }

  return {
    id: job.id!.toString(),
    status: await job.getState(),
    progress: job.progress() || 0,
    data: job.data,
    result: job.returnvalue,
    error: job.failedReason,
    createdAt: new Date(job.timestamp),
    processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
    finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
    queuePosition,
  };
}

export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queue = getAnalysisQueue();

  return {
    waiting: await queue.getWaiting().then(jobs => jobs.length),
    active: await queue.getActive().then(jobs => jobs.length),
    completed: await queue.getCompleted().then(jobs => jobs.length),
    failed: await queue.getFailed().then(jobs => jobs.length),
    delayed: await queue.getDelayed().then(jobs => jobs.length),
  };
}

export async function cancelJob(jobId: string): Promise<boolean> {
  const queue = getAnalysisQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return false;
  }

  try {
    await job.remove();
    console.log(`🗑️ Cancelled job ${jobId}`);
    return true;
  } catch (error) {
    console.error(`Failed to cancel job ${jobId}:`, error);
    return false;
  }
}

export function closeQueue(): void {
  if (analysisQueue) {
    analysisQueue.close();
    analysisQueue = null;
  }
}