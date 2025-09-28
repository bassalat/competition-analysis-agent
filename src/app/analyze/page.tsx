/**
 * Simplified Analysis Page - Incremental competitive intelligence workflow
 */

'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Play, FileText, Users, BarChart3, Loader2, CheckCircle, AlertCircle, Target, TrendingUp, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FileUploadZone } from '@/components/analysis/FileUploadZone';
import { CompetitorInput } from '@/components/analysis/CompetitorInput';
import { BusinessContext } from '@/types/api';

type AnalysisStep = 'upload' | 'competitors' | 'analyzing' | 'results';

interface CompetitorResult {
  competitor: { name: string; website?: string; description?: string };
  finalReport?: string;
  searchQueries?: string[];
  searchResults?: unknown[];
  prioritizedUrls?: string[];
  scrapedContent?: unknown[];
  metadata: {
    success: boolean;
    totalCost: number;
    timestamp: string;
    error?: string;
  };
  currentStep?: string;
  stepProgress?: number;
  isComplete?: boolean;
}

interface AnalysisState {
  step: AnalysisStep;
  files: File[];
  competitors: Array<{ name: string; website?: string; description?: string }>;
  businessContext?: BusinessContext;
  error?: string;
  progress: number;
  currentStage?: string;
  processingWarning?: string;
  isProcessingDocuments?: boolean;
  processingStage?: string;
  accuracyMode: 'economy' | 'accuracy';

  // New incremental results
  competitorResults: Map<string, CompetitorResult>;
  summary?: {
    totalCompetitors: number;
    successfulAnalyses: number;
    totalCost: number;
    avgCostPerCompetitor: number;
    processingTimeSeconds: number;
  };
  isAnalysisComplete: boolean;

  expandedSections: {
    individualReports: boolean;
  };
}

export default function AnalyzePage() {
  const [state, setState] = useState<AnalysisState>({
    step: 'upload',
    files: [],
    competitors: [],
    progress: 0,
    accuracyMode: 'economy',
    competitorResults: new Map(),
    isAnalysisComplete: false,
    expandedSections: {
      individualReports: true,
    },
  });

  const updateState = (updates: Partial<AnalysisState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const updateCompetitorResult = (competitorName: string, updates: Partial<CompetitorResult>) => {
    setState(prev => {
      const newResults = new Map(prev.competitorResults);
      const existing = newResults.get(competitorName) || {
        competitor: { name: competitorName },
        metadata: { success: false, totalCost: 0, timestamp: new Date().toISOString() }
      };
      newResults.set(competitorName, { ...existing, ...updates });
      return { ...prev, competitorResults: newResults };
    });
  };

  const toggleSection = (section: keyof typeof state.expandedSections) => {
    setState(prev => ({
      ...prev,
      expandedSections: {
        ...prev.expandedSections,
        [section]: !prev.expandedSections[section]
      }
    }));
  };

  // Process documents to extract business context and competitors
  const processDocuments = async (files: File[]) => {
    if (files.length === 0) return;

    try {
      console.log('🔄 Processing documents...', files.length, 'files');
      updateState({
        isProcessingDocuments: true,
        processingStage: 'Extracting business context from documents...',
      });

      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
        console.log('📄 Added file to form data:', file.name, file.type);
      });

      // Add accuracy mode to request
      formData.append('accuracyMode', state.accuracyMode);

      // Update processing stage
      updateState({ processingStage: 'Analyzing document content and structure...' });

      console.log('📡 Sending request to /api/process-documents with accuracy mode:', state.accuracyMode);
      const response = await fetch('/api/process-documents', {
        method: 'POST',
        body: formData,
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        // Update processing stage
        updateState({ processingStage: 'Identifying competitors and extracting insights...' });

        const result = await response.json();
        console.log('✅ Document processing result:', result);

        const competitors = result.suggestedCompetitors || [];
        console.log('🏢 Found competitors:', competitors.length, competitors);

        // Show warning if using fallback extraction
        if (result.warning) {
          console.warn('⚠️ Document processing warning:', result.warning);
        }

        // Complete processing with a brief delay to show the final stage
        setTimeout(() => {
          updateState({
            businessContext: result.businessContext,
            competitors: competitors,
            processingWarning: result.warning,
            isProcessingDocuments: false,
            processingStage: undefined,
          });
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('❌ Document processing failed:', response.status, errorText);
        updateState({
          processingWarning: `Document processing failed: ${errorText}`,
          isProcessingDocuments: false,
          processingStage: undefined,
        });
      }
    } catch (error) {
      console.error('❌ Failed to process documents:', error);
      updateState({
        isProcessingDocuments: false,
        processingStage: undefined,
      });
    }
  };

  const canProceed = () => {
    if (state.step === 'upload') {
      return true;
    }
    if (state.step === 'competitors') {
      return state.competitors.length > 0;
    }
    return false;
  };

  const nextStep = () => {
    if (state.step === 'upload') {
      updateState({ step: 'competitors' });
    } else if (state.step === 'competitors' && canProceed()) {
      startAnalysis();
    }
  };

  const startAnalysis = async () => {
    updateState({
      step: 'analyzing',
      progress: 0,
      currentStage: 'Preparing analysis...',
      error: undefined,
      competitorResults: new Map(),
      isAnalysisComplete: false,
    });

    try {
      // Prepare form data
      const formData = new FormData();

      // Add competitors
      formData.append('competitors', JSON.stringify(state.competitors));

      // Add business context if available
      if (state.businessContext) {
        formData.append('businessContext', JSON.stringify(state.businessContext));
      }

      // Start streaming analysis
      console.log('🚀 Starting streaming analysis...');
      updateState({ currentStage: 'Connecting to analysis service...', progress: 5 });

      const response = await fetch('/api/analyze-stream', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to start analysis stream');
      }

      if (!response.body) {
        throw new Error('Stream not available');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                handleStreamEvent(data);
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError);
              }
            }
          }
        }
      } catch (streamError) {
        console.error('Stream reading error:', streamError);
        updateState({
          error: 'Stream connection lost',
          currentStage: 'Connection failed'
        });
      }

    } catch (error) {
      console.error('Analysis failed:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Analysis failed',
        currentStage: 'Analysis failed'
      });
    }
  };

  const handleStreamEvent = (data: Record<string, unknown>) => {
    console.log('📡 Received SSE event:', data.type, data);

    switch (data.type) {
      case 'progress':
        updateState({
          progress: typeof data.progress === 'number' ? data.progress : 0,
          currentStage: typeof data.message === 'string' ? data.message : 'Processing...'
        });
        break;

      case 'step_progress':
        // Update progress for a specific competitor and step
        updateState({
          progress: typeof data.progress === 'number' ? data.progress : 0,
          currentStage: typeof data.message === 'string' ? data.message : 'Processing...'
        });

        if (typeof data.competitor === 'string') {
          updateCompetitorResult(data.competitor, {
            currentStep: typeof data.step === 'string' ? data.step : 'Processing',
            stepProgress: typeof data.stepProgress === 'number' ? data.stepProgress : 0
          });
        }
        break;

      case 'incremental_result':
        // Handle incremental data for each step
        if (typeof data.competitor === 'string' && typeof data.detailType === 'string' && data.data) {
          const updates: Partial<CompetitorResult> = {};

          switch (data.detailType) {
            case 'queries_generated':
              updates.searchQueries = (data.data && typeof data.data === 'object' && 'queries' in data.data && Array.isArray(data.data.queries))
                ? data.data.queries.map((q: unknown) => (typeof q === 'object' && q && 'query' in q && typeof q.query === 'string') ? q.query : '')
                : [];
              break;
            case 'search_results':
              updates.searchResults = (data.data && typeof data.data === 'object' && 'results' in data.data && Array.isArray(data.data.results))
                ? data.data.results
                : [];
              break;
            case 'urls_prioritized':
              updates.prioritizedUrls = (data.data && typeof data.data === 'object' && 'urls' in data.data && Array.isArray(data.data.urls))
                ? data.data.urls
                : [];
              break;
            case 'content_scraped':
              updates.scrapedContent = (data.data && typeof data.data === 'object' && 'content' in data.data && Array.isArray(data.data.content))
                ? data.data.content
                : [];
              break;
          }

          updateCompetitorResult(data.competitor, updates);
        }
        break;

      case 'competitor_complete':
        // Mark competitor as complete and add final report
        if (typeof data.competitor === 'string' && data.result && typeof data.result === 'object') {
          const result = data.result as {
            finalReport?: string;
            searchQueries?: string[];
            searchResults?: unknown[];
            prioritizedUrls?: string[];
            scrapedContent?: unknown[];
            metadata?: {
              success: boolean;
              totalCost: number;
              timestamp: string;
              error?: string;
            };
          };
          updateCompetitorResult(data.competitor, {
            finalReport: typeof result.finalReport === 'string' ? result.finalReport : '',
            searchQueries: Array.isArray(result.searchQueries) ? result.searchQueries : [],
            searchResults: Array.isArray(result.searchResults) ? result.searchResults : [],
            prioritizedUrls: Array.isArray(result.prioritizedUrls) ? result.prioritizedUrls : [],
            scrapedContent: Array.isArray(result.scrapedContent) ? result.scrapedContent : [],
            metadata: result.metadata || { success: false, totalCost: 0, timestamp: new Date().toISOString() },
            isComplete: true,
            currentStep: 'Complete'
          });
        }
        break;

      case 'complete':
        // Final completion with summary
        console.log('✅ Analysis completed!', data);
        updateState({
          step: 'results',
          progress: 100,
          currentStage: 'Analysis complete!',
          isAnalysisComplete: true,
          summary: (data.data && typeof data.data === 'object' && 'summary' in data.data) ? data.data.summary as {
            totalCompetitors: number;
            successfulAnalyses: number;
            totalCost: number;
            avgCostPerCompetitor: number;
            processingTimeSeconds: number;
          } : undefined
        });
        break;

      case 'error':
        console.error('❌ Analysis error:', data.message);
        updateState({
          error: typeof data.message === 'string' ? data.message : 'Analysis failed',
          currentStage: 'Analysis failed'
        });
        break;

      case 'competitor_error':
        if (typeof data.competitor === 'string') {
          updateCompetitorResult(data.competitor, {
            metadata: {
              success: false,
              totalCost: 0,
              timestamp: new Date().toISOString(),
              error: typeof data.error === 'string' ? data.error : 'Unknown error'
            },
            isComplete: true,
            currentStep: 'Failed'
          });
        }
        break;

      default:
        console.log('Unhandled SSE event type:', data.type);
    }
  };

  const resetAnalysis = () => {
    updateState({
      step: 'upload',
      progress: 0,
      currentStage: undefined,
      error: undefined,
      competitorResults: new Map(),
      isAnalysisComplete: false,
      summary: undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            AI Competitor Intelligence
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Upload documents, identify competitors, and get comprehensive competitive intelligence powered by Claude AI
          </p>
        </div>

        {/* Progress Bar */}
        {state.step === 'analyzing' && (
          <Card className="mb-6 bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-300">
                  {state.currentStage || 'Processing...'}
                </span>
                <span className="text-sm text-slate-400">
                  {state.progress}%
                </span>
              </div>
              <Progress value={state.progress} className="h-2" />

              {state.error && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upload Step */}
        {state.step === 'upload' && (
          <Card className="mb-6 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                Upload Business Documents (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <FileUploadZone
                  onFilesChange={(files) => updateState({ files })}
                />

                {state.isProcessingDocuments && state.processingStage && (
                  <div className="bg-slate-700/50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                      <span className="text-slate-300 text-sm">{state.processingStage}</span>
                    </div>
                  </div>
                )}

                {state.processingWarning && (
                  <Alert className="border-yellow-500 bg-yellow-500/10">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="text-yellow-200">
                      {state.processingWarning}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-300">Analysis Mode</h3>
                  <RadioGroup
                    value={state.accuracyMode}
                    onValueChange={(value: 'economy' | 'accuracy') => updateState({ accuracyMode: value })}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="flex items-center space-x-2 bg-slate-700/50 p-3 rounded-lg">
                      <RadioGroupItem value="economy" id="economy" />
                      <Label htmlFor="economy" className="text-slate-300 cursor-pointer">
                        <div>
                          <div className="font-medium">Economy Mode</div>
                          <div className="text-xs text-slate-400">Faster, lower cost (~$0.20/competitor)</div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 bg-slate-700/50 p-3 rounded-lg">
                      <RadioGroupItem value="accuracy" id="accuracy" />
                      <Label htmlFor="accuracy" className="text-slate-300 cursor-pointer">
                        <div>
                          <div className="font-medium">High Accuracy</div>
                          <div className="text-xs text-slate-400">More thorough analysis</div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex gap-3">
                  {state.files.length > 0 && (
                    <Button
                      onClick={() => processDocuments(state.files)}
                      disabled={state.isProcessingDocuments}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {state.isProcessingDocuments ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Process Documents'
                      )}
                    </Button>
                  )}
                  <Button
                    onClick={nextStep}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Continue <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Competitors Step */}
        {state.step === 'competitors' && (
          <Card className="mb-6 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-green-400" />
                Competitors to Analyze
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CompetitorInput
                initialCompetitors={state.competitors}
                onCompetitorsChange={(competitors) => updateState({ competitors })}
                businessContext={state.businessContext}
              />
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => updateState({ step: 'upload' })}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Back
                </Button>
                <Button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analysis in Progress */}
        {state.step === 'analyzing' && (
          <div className="space-y-6">
            {/* Live Competitor Results */}
            {Array.from(state.competitorResults.entries()).map(([name, result]) => (
              <Card key={name} className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-400" />
                    {name}
                    {result.isComplete ? (
                      <CheckCircle className="h-5 w-5 text-green-400 ml-auto" />
                    ) : (
                      <Loader2 className="h-5 w-5 text-blue-400 ml-auto animate-spin" />
                    )}
                  </CardTitle>
                  {result.currentStep && (
                    <p className="text-sm text-slate-400">
                      Current step: {result.currentStep}
                      {result.stepProgress && ` (${result.stepProgress}%)`}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-slate-700/50 p-3 rounded-lg">
                      <h4 className="text-xs font-medium text-slate-400 mb-1">Search Queries</h4>
                      <p className="text-lg font-bold text-white">
                        {result.searchQueries?.length || 0}
                      </p>
                    </div>
                    <div className="bg-slate-700/50 p-3 rounded-lg">
                      <h4 className="text-xs font-medium text-slate-400 mb-1">Search Results</h4>
                      <p className="text-lg font-bold text-white">
                        {result.searchResults?.length || 0}
                      </p>
                    </div>
                    <div className="bg-slate-700/50 p-3 rounded-lg">
                      <h4 className="text-xs font-medium text-slate-400 mb-1">URLs Found</h4>
                      <p className="text-lg font-bold text-white">
                        {result.prioritizedUrls?.length || 0}
                      </p>
                    </div>
                    <div className="bg-slate-700/50 p-3 rounded-lg">
                      <h4 className="text-xs font-medium text-slate-400 mb-1">Content Scraped</h4>
                      <p className="text-lg font-bold text-white">
                        {result.scrapedContent?.length || 0}
                      </p>
                    </div>
                  </div>

                  {result.finalReport && (
                    <div className="bg-slate-700/30 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-slate-300 mb-2">Analysis Report</h4>
                      <div className="text-sm text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {result.finalReport.substring(0, 500)}
                        {result.finalReport.length > 500 && '...'}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Results Step */}
        {state.step === 'results' && (
          <div className="space-y-6">
            {/* Summary Card */}
            {state.summary && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-400" />
                    Analysis Complete
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-white">{state.summary.totalCompetitors}</div>
                      <div className="text-sm text-slate-400">Total Competitors</div>
                    </div>
                    <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-400">{state.summary.successfulAnalyses}</div>
                      <div className="text-sm text-slate-400">Successful</div>
                    </div>
                    <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-400">${state.summary.totalCost.toFixed(3)}</div>
                      <div className="text-sm text-slate-400">Total Cost</div>
                    </div>
                    <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-400">{state.summary.processingTimeSeconds}s</div>
                      <div className="text-sm text-slate-400">Processing Time</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Individual Results */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                    Competitor Analysis Results
                  </CardTitle>
                  <Button
                    onClick={() => toggleSection('individualReports')}
                    variant="ghost"
                    className="text-slate-400 hover:text-white"
                  >
                    {state.expandedSections.individualReports ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              {state.expandedSections.individualReports && (
                <CardContent>
                  <div className="space-y-6">
                    {Array.from(state.competitorResults.entries()).map(([name, result]) => (
                      <div key={name} className="border border-slate-600 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-white">{name}</h3>
                          <div className="flex items-center gap-2">
                            {result.metadata.success ? (
                              <>
                                <Badge className="bg-green-900 text-green-300">Success</Badge>
                                <span className="text-sm text-slate-400">${result.metadata.totalCost.toFixed(4)}</span>
                              </>
                            ) : (
                              <Badge className="bg-red-900 text-red-300">Failed</Badge>
                            )}
                          </div>
                        </div>

                        {result.finalReport && (
                          <div className="bg-slate-700/30 p-4 rounded-lg">
                            <div className="prose prose-invert max-w-none">
                              <div className="whitespace-pre-wrap text-sm text-slate-300">
                                {result.finalReport}
                              </div>
                            </div>
                          </div>
                        )}

                        {result.metadata.error && (
                          <div className="bg-red-900/20 p-4 rounded-lg mt-4">
                            <p className="text-red-300 text-sm">{result.metadata.error}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <Button
                onClick={resetAnalysis}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Play className="h-4 w-4 mr-2" />
                New Analysis
              </Button>
              <Button
                onClick={() => {
                  // TODO: Implement download functionality
                  console.log('Download results');
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Results
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}