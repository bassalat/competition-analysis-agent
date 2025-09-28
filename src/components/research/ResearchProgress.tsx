'use client';

/**
 * Research progress visualization component
 * Shows detailed progress for each step in the research workflow
 */

import React from 'react';
import { CheckCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ResearchProgress, ResearchStep, RESEARCH_WORKFLOW } from '@/types/research';

interface ResearchProgressProps {
  progress: ResearchProgress;
  className?: string;
  showDetails?: boolean;
}

export function ResearchProgressComponent({
  progress,
  className = '',
  showDetails = true,
}: ResearchProgressProps) {
  const getStepStatus = (step: ResearchStep) => {
    if (progress.completedSteps.includes(step)) {
      return 'completed';
    } else if (progress.currentStep === step) {
      return 'in_progress';
    } else {
      return 'pending';
    }
  };

  const getStepIcon = (step: ResearchStep) => {
    const status = getStepStatus(step);

    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepName = (step: ResearchStep): string => {
    const names: Record<ResearchStep, string> = {
      grounding: 'Initializing',
      company_analyzer: 'Company Analysis',
      industry_analyzer: 'Industry Analysis',
      financial_analyst: 'Financial Analysis',
      news_scanner: 'News Analysis',
      collector: 'Data Collection',
      curator: 'Content Curation',
      enricher: 'Insight Enhancement',
      briefing: 'Report Generation',
      editor: 'Final Compilation',
    };
    return names[step] || step;
  };

  const getStepDescription = (step: ResearchStep): string => {
    const descriptions: Record<ResearchStep, string> = {
      grounding: 'Setting up research context and scraping company website',
      company_analyzer: 'Researching company fundamentals, products, and leadership',
      industry_analyzer: 'Analyzing market position and competitive landscape',
      financial_analyst: 'Gathering financial data, funding, and business metrics',
      news_scanner: 'Collecting recent news, announcements, and developments',
      collector: 'Aggregating and organizing research data',
      curator: 'Filtering content and scoring relevance',
      enricher: 'Adding contextual insights and analysis',
      briefing: 'Generating section summaries',
      editor: 'Compiling final research report',
    };
    return descriptions[step] || '';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">
            Research Progress for {progress.competitor.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{progress.progress}%</span>
            {progress.hasError && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Error
              </Badge>
            )}
            {progress.isCompleted && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Complete
              </Badge>
            )}
            {progress.isRunning && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Running
              </Badge>
            )}
          </div>
        </div>

        <Progress value={progress.progress} className="h-2" />

        {progress.estimatedTimeRemaining && progress.isRunning && (
          <p className="text-xs text-gray-500">
            Estimated time remaining: {Math.ceil(progress.estimatedTimeRemaining / 60)} minutes
          </p>
        )}
      </div>

      {/* Live Counters */}
      {showDetails && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {progress.liveCounters.queriesGenerated}
            </div>
            <div className="text-sm text-gray-500">Search Queries</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {progress.liveCounters.documentsFound}
            </div>
            <div className="text-sm text-gray-500">Documents Found</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {progress.liveCounters.documentsScraped}
            </div>
            <div className="text-sm text-gray-500">Content Scraped</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {progress.liveCounters.briefingsGenerated}
            </div>
            <div className="text-sm text-gray-500">Briefings Ready</div>
          </div>
        </div>
      )}

      {/* Detailed Step Progress */}
      {showDetails && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700 text-sm">Research Steps</h4>
          <div className="space-y-1">
            {RESEARCH_WORKFLOW.STEPS.map((step, index) => {
              const status = getStepStatus(step);
              const isActive = progress.currentStep === step;

              return (
                <div
                  key={step}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    isActive ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {getStepIcon(step)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        status === 'completed' ? 'text-green-700' :
                        status === 'in_progress' ? 'text-blue-700' :
                        'text-gray-500'
                      }`}>
                        {index + 1}. {getStepName(step)}
                      </span>

                      {status === 'completed' && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                          Done
                        </Badge>
                      )}
                      {status === 'in_progress' && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                          Active
                        </Badge>
                      )}
                    </div>

                    {isActive && (
                      <p className="text-xs text-gray-600 mt-1">
                        {getStepDescription(step)}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-xs text-gray-400">
                    {RESEARCH_WORKFLOW.STEP_WEIGHTS[step]}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Display */}
      {progress.hasError && progress.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Research Error</p>
              <p className="text-sm text-red-600 mt-1">{progress.error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}