/**
 * Simplified Analysis Page - Incremental competitive intelligence workflow
 */

'use client';

import React, { useState } from 'react';
import { ChevronRight, Play, FileText, Users, BarChart3, Loader2, CheckCircle, AlertCircle, Target, TrendingUp, Download } from 'lucide-react';
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
  currentStep: string;
  searchQueries: string[];
  searchResults: number;
  urlsFound: number;
  contentScraped: number;
  finalReport: string;
  cost: number;
  isComplete: boolean;
  error: string | null;
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

  // Simplified analysis results
  analysisResults: CompetitorResult[];
  summary?: {
    totalCompetitors: number;
    successfulAnalyses: number;
    totalCost: number;
    avgCostPerCompetitor: number;
    processingTimeSeconds: number;
  };
  isAnalysisComplete: boolean;
}

export default function AnalyzePage() {
  const [state, setState] = useState<AnalysisState>({
    step: 'upload',
    files: [],
    competitors: [],
    progress: 0,
    accuracyMode: 'economy',
    analysisResults: [],
    isAnalysisComplete: false,
  });

  const updateState = (updates: Partial<AnalysisState>) => {
    setState(prev => ({ ...prev, ...updates }));
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
      analysisResults: [],
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

                // Simple single event handler
                if (data.type === 'update') {
                  updateState({
                    progress: data.progress || 0,
                    currentStage: data.message || 'Processing...',
                    analysisResults: data.results || [],
                    summary: data.summary,
                    isAnalysisComplete: data.isComplete || false,
                    error: data.error,
                  });

                  // Move to results when complete
                  if (data.isComplete) {
                    updateState({ step: 'results' });
                  }
                }
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


  const resetAnalysis = () => {
    updateState({
      step: 'upload',
      progress: 0,
      currentStage: undefined,
      error: undefined,
      analysisResults: [],
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
            {state.analysisResults.map((result, index) => (
              <Card key={index} className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-400" />
                    {result.competitor.name}
                    {result.isComplete ? (
                      result.error ? (
                        <AlertCircle className="h-5 w-5 text-red-400 ml-auto" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-400 ml-auto" />
                      )
                    ) : (
                      <Loader2 className="h-5 w-5 text-blue-400 ml-auto animate-spin" />
                    )}
                  </CardTitle>
                  <p className="text-sm text-slate-400">
                    Current step: {result.currentStep}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-slate-700/50 p-3 rounded-lg">
                      <h4 className="text-xs font-medium text-slate-400 mb-1">Search Queries</h4>
                      <p className="text-lg font-bold text-white">
                        {result.searchQueries.length}
                      </p>
                    </div>
                    <div className="bg-slate-700/50 p-3 rounded-lg">
                      <h4 className="text-xs font-medium text-slate-400 mb-1">Search Results</h4>
                      <p className="text-lg font-bold text-white">
                        {result.searchResults}
                      </p>
                    </div>
                    <div className="bg-slate-700/50 p-3 rounded-lg">
                      <h4 className="text-xs font-medium text-slate-400 mb-1">URLs Found</h4>
                      <p className="text-lg font-bold text-white">
                        {result.urlsFound}
                      </p>
                    </div>
                    <div className="bg-slate-700/50 p-3 rounded-lg">
                      <h4 className="text-xs font-medium text-slate-400 mb-1">Content Scraped</h4>
                      <p className="text-lg font-bold text-white">
                        {result.contentScraped}
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

                  {result.error && (
                    <div className="bg-red-900/20 p-4 rounded-lg mt-4">
                      <p className="text-red-300 text-sm">{result.error}</p>
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
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-400" />
                  Competitor Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {state.analysisResults.map((result, index) => (
                    <div key={index} className="border border-slate-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">{result.competitor.name}</h3>
                        <div className="flex items-center gap-2">
                          {result.isComplete && !result.error ? (
                            <>
                              <Badge className="bg-green-900 text-green-300">Success</Badge>
                              <span className="text-sm text-slate-400">${result.cost.toFixed(4)}</span>
                            </>
                          ) : result.error ? (
                            <Badge className="bg-red-900 text-red-300">Failed</Badge>
                          ) : (
                            <Badge className="bg-blue-900 text-blue-300">In Progress</Badge>
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

                      {result.error && (
                        <div className="bg-red-900/20 p-4 rounded-lg mt-4">
                          <p className="text-red-300 text-sm">{result.error}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
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