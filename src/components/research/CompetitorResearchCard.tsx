'use client';

/**
 * Individual competitor research card with analysis controls and results display
 * Follows the design requirements: collapsible/expandable with individual start buttons
 */

import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Play, Download, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Competitor, BusinessContext } from '@/types/api';
import { ResearchProgress, CompetitorResearchResult, ResearchUpdate, ResearchState } from '@/types/research';

interface CompetitorResearchCardProps {
  competitor: Competitor;
  businessContext?: BusinessContext;
  onResearchStart?: (competitor: Competitor) => void;
  onResearchComplete?: (result: CompetitorResearchResult) => void;
}

export function CompetitorResearchCard({
  competitor,
  businessContext,
  onResearchStart,
  onResearchComplete,
}: CompetitorResearchCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [progress, setProgress] = useState<ResearchProgress | null>(null);
  const [result, setResult] = useState<CompetitorResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle starting research
  const handleStartResearch = useCallback(async () => {
    if (isResearching) return;

    setIsResearching(true);
    setError(null);
    setResult(null);
    setIsExpanded(true);

    // Initialize progress
    setProgress({
      competitor,
      currentStep: 'grounding',
      completedSteps: [],
      progress: 0,
      isRunning: true,
      isCompleted: false,
      hasError: false,
      liveCounters: {
        queriesGenerated: 0,
        documentsFound: 0,
        documentsScraped: 0,
        briefingsGenerated: 0,
      },
    });

    onResearchStart?.(competitor);

    try {
      // Start SSE connection for real-time updates
      const response = await fetch('/api/research-competitor-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          competitor,
          businessContext,
          options: {
            skipWebsiteScraping: false,
            maxDocumentsPerCategory: 10,
            includeNews: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Process SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              // Handle all research update types
              if (data.type === 'status' || data.type === 'progress' || data.type === 'result' || data.type === 'error') {
                handleProgressUpdate(data as ResearchUpdate);

                // If it's a result, we've received the final data
                if (data.type === 'result') {
                  console.log('✅ Research result received:', data);
                }
              } else if (data.type === 'complete') {
                console.log('✅ Research stream completed');
                break;
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', parseError);
            }
          }
        }
      }

    } catch (err) {
      console.error('Research error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Research failed';
      setError(errorMessage);

      setProgress(prev => prev ? {
        ...prev,
        isRunning: false,
        hasError: true,
        error: errorMessage,
      } : null);
    } finally {
      setIsResearching(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitor, businessContext, isResearching, onResearchStart]);

  // Handle progress updates from SSE
  const handleProgressUpdate = useCallback((update: ResearchUpdate) => {
    console.log('Progress update:', update);

    setProgress(prev => {
      if (!prev) return null;

      const newProgress = { ...prev };

      // Update current step and progress
      newProgress.currentStep = update.step;
      newProgress.progress = update.progress || prev.progress;

      // Update completed steps
      if (!newProgress.completedSteps.includes(update.step)) {
        newProgress.completedSteps = [...newProgress.completedSteps, update.step];
      }

      // Update live counters based on update data
      if (update.data) {
        if (update.data.queries) {
          newProgress.liveCounters.queriesGenerated += update.data.queries.length;
        }
        if (update.data.documentsFound) {
          newProgress.liveCounters.documentsFound += update.data.documentsFound;
        }
        if (update.data.documentsScraped) {
          newProgress.liveCounters.documentsScraped += update.data.documentsScraped;
        }
      }

      // Handle completion
      if (update.type === 'result' && update.data) {
        newProgress.isRunning = false;
        newProgress.isCompleted = true;
        newProgress.progress = 100;

        // Set final result
        const resultData = update.data;
        if (resultData?.report) {
          const finalResult: CompetitorResearchResult = {
            competitor,
            state: {
              company: competitor.name,
              industry: 'Unknown',
              hq_location: 'Unknown',
            } as ResearchState,
            report: resultData.report,
            briefings: {
              company: resultData.briefings?.company || '',
              industry: resultData.briefings?.industry || '',
              financial: resultData.briefings?.financial || '',
              news: resultData.briefings?.news || '',
            },
            metadata: resultData.metadata || {
              totalDocuments: 0,
              documentsPerCategory: { company: 0, industry: 0, financial: 0, news: 0 },
              costEstimate: 0,
              duration: 0,
              queriesGenerated: [],
              sourcesUsed: [],
            },
            success: true,
          };

          setResult(finalResult);
          onResearchComplete?.(finalResult);
        }
      }

      return newProgress;
    });
  }, [competitor, onResearchComplete]);

  // Export functions
  const exportAsMarkdown = useCallback(() => {
    if (!result) return;

    const blob = new Blob([result.report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${competitor.name.replace(/[^a-z0-9]/gi, '_')}_research_report.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, competitor.name]);

  const exportAsPDF = useCallback(() => {
    if (!result) return;

    // Simple PDF export using browser print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${competitor.name} Research Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
              h1, h2, h3 { color: #333; }
              h1 { border-bottom: 2px solid #333; }
              h2 { border-bottom: 1px solid #ccc; margin-top: 2em; }
            </style>
          </head>
          <body>
            ${result.report.replace(/\n/g, '<br>').replace(/^# (.+)/gm, '<h1>$1</h1>').replace(/^## (.+)/gm, '<h2>$1</h2>').replace(/^### (.+)/gm, '<h3>$1</h3>')}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }, [result, competitor.name]);

  return (
    <Card className="w-full border-2 border-gray-200 hover:border-gray-300 transition-colors">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-500" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{competitor.name}</h3>
              {competitor.website && (
                <p className="text-sm text-gray-500">{competitor.website}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {result && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
            {isResearching && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <Clock className="h-3 w-3 mr-1" />
                Analyzing...
              </Badge>
            )}
            {error && (
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                <AlertCircle className="h-3 w-3 mr-1" />
                Error
              </Badge>
            )}

            {!isResearching && !result && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartResearch();
                }}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Analysis
              </Button>
            )}
          </div>
        </CardTitle>

        {competitor.description && (
          <p className="text-sm text-gray-600 mt-2">{competitor.description}</p>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {progress && (
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Research Progress</h4>
                <span className="text-sm text-gray-500">{progress.progress}%</span>
              </div>

              <Progress value={progress.progress} className="h-2" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-medium text-gray-900">{progress.liveCounters.queriesGenerated}</div>
                  <div className="text-gray-500">Queries</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-900">{progress.liveCounters.documentsFound}</div>
                  <div className="text-gray-500">Documents</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-900">{progress.liveCounters.documentsScraped}</div>
                  <div className="text-gray-500">Scraped</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-900">{progress.liveCounters.briefingsGenerated}</div>
                  <div className="text-gray-500">Briefings</div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                Current: <span className="font-medium">{progress.currentStep.replace('_', ' ')}</span>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Research Results</h4>
                <div className="flex gap-2">
                  <Button
                    onClick={exportAsMarkdown}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Markdown
                  </Button>
                  <Button
                    onClick={exportAsPDF}
                    size="sm"
                    variant="outline"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="industry">Industry</TabsTrigger>
                  <TabsTrigger value="financial">Financial</TabsTrigger>
                  <TabsTrigger value="news">News</TabsTrigger>
                  <TabsTrigger value="full">Full Report</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                  <div className="prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{
                      __html: result.briefings.company.replace(/\n/g, '<br>')
                    }} />
                  </div>
                </TabsContent>

                <TabsContent value="industry" className="mt-4">
                  <div className="prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{
                      __html: result.briefings.industry.replace(/\n/g, '<br>')
                    }} />
                  </div>
                </TabsContent>

                <TabsContent value="financial" className="mt-4">
                  <div className="prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{
                      __html: result.briefings.financial.replace(/\n/g, '<br>')
                    }} />
                  </div>
                </TabsContent>

                <TabsContent value="news" className="mt-4">
                  <div className="prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{
                      __html: result.briefings.news.replace(/\n/g, '<br>')
                    }} />
                  </div>
                </TabsContent>

                <TabsContent value="full" className="mt-4">
                  <div className="prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{
                      __html: result.report.replace(/\n/g, '<br>').replace(/^# (.+)/gm, '<h1>$1</h1>').replace(/^## (.+)/gm, '<h2>$1</h2>').replace(/^### (.+)/gm, '<h3>$1</h3>')
                    }} />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="text-xs text-gray-500 border-t pt-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="font-medium">Total Documents:</span> {result.metadata.totalDocuments}
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span> {result.metadata.duration.toFixed(1)}s
                  </div>
                  <div>
                    <span className="font-medium">Estimated Cost:</span> ${result.metadata.costEstimate.toFixed(3)}
                  </div>
                  <div>
                    <span className="font-medium">Sources:</span> {result.metadata.sourcesUsed.length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}