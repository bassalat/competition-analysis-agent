/**
 * Analysis Worker
 * Processes competitive analysis jobs using the simplified competitor engine
 */

import Bull from 'bull';
import { SimplifiedCompetitorEngine } from '@/lib/engines/simplified-competitor-engine';
import { getAnalysisQueue, AnalysisJobData, AnalysisJobResult, AnalysisJobProgress } from '@/lib/queues/analysis-queue';
import { cacheClient } from '@/lib/cache/api-cache';

let worker: Bull.Queue | null = null;

export function startAnalysisWorker(): Bull.Queue {
  if (worker) {
    return worker;
  }

  const queue = getAnalysisQueue();
  worker = queue;

  queue.process('analyze-competitors', 1, async (job: Bull.Job<AnalysisJobData>) => {
    const { competitors, businessContext } = job.data;

    console.log(`🔄 Starting analysis job ${job.id} for ${competitors.length} competitors`);

    try {
      // Initialize the engine
      const engine = new SimplifiedCompetitorEngine();

      // Progress tracking function
      const updateProgress = (step: string, progress: number, message: string, competitor?: string) => {
        const progressData: AnalysisJobProgress = {
          step,
          progress,
          message,
          timestamp: new Date().toISOString(),
          competitor,
        };

        job.progress(progress);

        // Store progress data for client polling
        console.log(`📊 Job ${job.id} - ${step}: ${progress}% - ${message}`);

        return progressData;
      };

      // Start analysis
      updateProgress('initialization', 5, 'Initializing analysis...');

      // Process competitors individually and combine results
      const competitorResults = [];
      let completedCount = 0;

      for (const competitor of competitors) {
        updateProgress('analyzing', (completedCount / competitors.length) * 80 + 10, `Analyzing ${competitor}...`, competitor);

        const competitorResult = await engine.analyzeCompetitor(
          { name: competitor },
          {
            company: 'User Company',
            industry: 'Technology',
            targetMarket: ['General'],
            businessModel: 'B2B',
            valueProposition: businessContext,
            keyProducts: ['Software'],
            competitiveAdvantages: ['Innovation'],
            challenges: ['Market Competition'],
            objectives: ['Growth'],
          },
          (step, progress) => {
            const overallProgress = (completedCount / competitors.length) * 80 + (progress * 0.8 / competitors.length) + 10;
            updateProgress(step, overallProgress, `Analyzing ${competitor}...`, competitor);
          }
        );

        competitorResults.push(competitorResult);
        completedCount++;
      }

      // Create combined result
      const result = {
        competitorCount: competitors.length,
        analyses: competitorResults,
        summary: 'Analysis completed successfully',
        businessContext: {
          company: 'User Company',
          industry: 'Technology',
          targetMarket: ['General'],
          businessModel: 'B2B',
          valueProposition: businessContext,
          keyProducts: ['Software'],
          competitiveAdvantages: ['Innovation'],
          challenges: ['Market Competition'],
          objectives: ['Growth'],
        },
      };

      updateProgress('caching', 95, 'Caching results...');

      // Cache the results for 1 hour
      const cacheKey = `analysis:${competitors.join(',')}:${Buffer.from(businessContext).toString('base64').slice(0, 16)}`;
      await cacheClient.set(cacheKey, result, 3600);

      updateProgress('completed', 100, 'Analysis completed successfully!');

      const jobResult: AnalysisJobResult = {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };

      console.log(`✅ Analysis job ${job.id} completed successfully`);
      return jobResult;

    } catch (error) {
      console.error(`❌ Analysis job ${job.id} failed:`, error);

      const jobResult: AnalysisJobResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      };


      throw error; // Re-throw to mark job as failed
    }
  });

  // Queue event handlers
  queue.on('completed', (job, _result) => {
    console.log(`✅ Worker completed job ${job.id}`);
  });

  queue.on('failed', (job, err) => {
    console.error(`❌ Worker failed job ${job.id}:`, err.message);
  });

  queue.on('error', (error) => {
    console.error('❌ Worker error:', error);
  });

  queue.on('stalled', (job) => {
    console.warn(`⚠️ Worker stalled on job ${job.id}`);
  });

  console.log('🔄 Analysis worker started');
  return worker;
}

export function stopAnalysisWorker(): void {
  if (worker) {
    worker.close();
    worker = null;
    console.log('🛑 Analysis worker stopped');
  }
}

export function getWorkerStatus(): {
  running: boolean;
  workerCount: number;
} {
  return {
    running: worker !== null,
    workerCount: worker ? 1 : 0,
  };
}

// Auto-start worker when this module is imported in a server environment
if (typeof window === 'undefined') {
  // Only start in server environment (not in browser)
  process.nextTick(() => {
    try {
      startAnalysisWorker();
    } catch (error) {
      console.error('Failed to auto-start analysis worker:', error);
    }
  });
}