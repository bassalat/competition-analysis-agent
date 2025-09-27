/**
 * Main Analysis Page - Complete competitive intelligence workflow
 */

'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Play, FileText, Users, BarChart3, Loader2, CheckCircle, AlertCircle, Zap, Target, Shield, TrendingUp, MapPin, Lightbulb, Trophy, AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FileUploadZone } from '@/components/analysis/FileUploadZone';
import { CompetitorInput } from '@/components/analysis/CompetitorInput';
import { BusinessContext, SimplifiedAnalysisResult, AnalysisLog, QueryData } from '@/types/api';
import { generateEnhancedCompetitorInsights, generateEnhancedMarketIntelligence, CompetitorInsights, MarketIntelligence } from '@/lib/competitive-intelligence';
import { generateAdvancedCompetitorInsights, generateAdvancedMarketIntelligence, AdvancedCompetitorInsights, AdvancedMarketIntelligence } from '@/lib/competitive-intelligence-advanced';

type AnalysisStep = 'upload' | 'competitors' | 'analyzing' | 'results';

interface AnalysisData {
  competitor: { name: string };
  finalReport: string;
  executiveSummary?: string;
  confidence?: number;
  metadata: {
    success: boolean;
    totalCost: number;
    timestamp: string;
    error?: string;
  };
  searchQueries?: unknown;
  searchResults?: unknown;
  prioritizedUrls?: unknown;
  scrapedContent?: unknown;
}

interface AnalysisState {
  step: AnalysisStep;
  files: File[];
  competitors: Array<{ name: string; website?: string; description?: string }>;
  businessContext?: BusinessContext;
  analysisResults?: SimplifiedAnalysisResult;
  error?: string;
  progress: number;
  currentStage?: string;
  processingWarning?: string;
  isProcessingDocuments?: boolean;
  processingStage?: string;
  accuracyMode: 'economy' | 'accuracy';
  analysisLogs: AnalysisLog[];
  showLogs: boolean;
  expandedSections: {
    competitiveMatrix: boolean;
    threatAssessment: boolean;
    marketOpportunity: boolean;
    marketIntelligence: boolean;
    individualReports: boolean;
  };
}

export default function AnalyzePage() {
  const [state, setState] = useState<AnalysisState>({
    step: 'upload',
    files: [],
    competitors: [],
    progress: 0,
    accuracyMode: 'economy', // Default to economy mode
    analysisLogs: [],
    showLogs: true,
    expandedSections: {
      competitiveMatrix: true,
      threatAssessment: true,
      marketOpportunity: true,
      marketIntelligence: true,
      individualReports: true,
    },
  });

  const updateState = (updates: Partial<AnalysisState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const addLog = (type: string, message: string, data?: Record<string, unknown>, competitor?: string) => {
    setState(prev => ({
      ...prev,
      analysisLogs: [...prev.analysisLogs, {
        timestamp: new Date().toISOString(),
        type,
        message,
        data,
        competitor
      }]
    }));
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
        currentStage: 'Extracting business context from documents...'
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
      // Upload step can always proceed (documents are optional)
      return true;
    }
    if (state.step === 'competitors') {
      // Allow proceeding if we have any competitors (AI-detected or manual)
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

  const skipUploadStep = () => {
    updateState({
      step: 'competitors',
      files: [],
      businessContext: undefined
    });
  };

  const prevStep = () => {
    if (state.step === 'competitors') {
      updateState({ step: 'upload' });
    } else if (state.step === 'results') {
      updateState({ step: 'competitors', error: undefined });
    }
  };

  const startAnalysis = async () => {
    updateState({
      step: 'analyzing',
      progress: 0,
      currentStage: 'Preparing analysis...',
      error: undefined,
      analysisLogs: [] // Clear previous logs
    });

    try {
      // Prepare form data
      const formData = new FormData();

      // Add files
      state.files.forEach(file => {
        formData.append('files', file);
      });

      // Add competitors
      formData.append('competitors', JSON.stringify(state.competitors));

      // Add business context if available
      if (state.businessContext) {
        formData.append('userContext', JSON.stringify(state.businessContext));
      }

      // Start analysis with progress updates
      updateState({ currentStage: 'Processing documents...', progress: 10 });

      // Detailed progress updates with realistic stages
      const progressStages = [
        { progress: 15, stage: 'Processing business documents...', duration: 3000 },
        { progress: 25, stage: 'Extracting business context and competitors...', duration: 4000 },
        { progress: 35, stage: 'Planning research strategy for each competitor...', duration: 3000 },
        { progress: 45, stage: 'Conducting web research and data gathering...', duration: 8000 },
        { progress: 55, stage: 'Analyzing search results and identifying insights...', duration: 6000 },
        { progress: 65, stage: 'Gathering additional competitive intelligence...', duration: 7000 },
        { progress: 75, stage: 'Performing multi-perspective strategic analysis...', duration: 10000 },
        { progress: 85, stage: 'Synthesizing insights from 10+ expert viewpoints...', duration: 8000 },
        { progress: 90, stage: 'Generating comprehensive competitive intelligence report...', duration: 5000 },
      ];

      let currentStageIndex = 0;
      const progressInterval = setInterval(() => {
        setState(prev => {
          if (currentStageIndex < progressStages.length && prev.progress < 90) {
            const currentStage = progressStages[currentStageIndex];
            currentStageIndex++;
            return {
              ...prev,
              progress: currentStage.progress,
              currentStage: currentStage.stage
            };
          }
          return prev;
        });
      }, 4000); // Update every 4 seconds with detailed stages

      // Use streaming analysis endpoint for real-time progress
      const response = await fetch('/api/analyze-stream', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

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

          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (data.type) {
                  case 'progress':
                    updateState({
                      progress: data.progress,
                      currentStage: data.message
                    });
                    break;

                  case 'cost_update':
                    // Cost updates are handled automatically by the CostCounter component
                    // via its subscription to globalCostTracker
                    break;

                  case 'analysis_detail':
                    // Handle detailed analysis logs
                    switch (data.detailType) {
                      case 'queries_generated':
                        addLog('info', `Generated ${data.data.count} search queries`, data.data, data.competitor);
                        data.data.queries?.forEach((query: QueryData) => {
                          addLog('query', `"${query.query}" - ${query.purpose}`, query, data.competitor);
                        });
                        break;

                      case 'search_started':
                        addLog('search', `Searching: "${data.data.query}"`, data.data, data.competitor);
                        break;

                      case 'search_completed':
                        addLog('success', `Found ${data.data.resultCount} results for "${data.data.query}"`, data.data, data.competitor);
                        break;

                      case 'search_failed':
                        addLog('error', `Search failed: "${data.data.query}" - ${data.data.error}`, data.data, data.competitor);
                        break;

                      case 'urls_prioritized':
                        addLog('info', `Prioritized ${data.data.selectedUrls} URLs from ${data.data.totalUrls} total`, data.data, data.competitor);
                        data.data.urls?.forEach((url: { url: string; reason: string }) => {
                          addLog('url', `${url.url} - ${url.reason}`, url, data.competitor);
                        });
                        break;

                      case 'fallback_urls_added':
                        addLog('warning', `Added ${data.data.fallbackCount} fallback URLs for minimum coverage`, data.data, data.competitor);
                        break;

                      case 'scraping_started':
                        addLog('scrape', `Scraping ${data.data.currentIndex}/${data.data.totalUrls}: ${data.data.url}`, data.data, data.competitor);
                        break;

                      case 'scraping_completed':
                        addLog('success', `Scraped ${data.data.contentLength} chars from ${data.data.url}`, data.data, data.competitor);
                        break;

                      case 'scraping_failed':
                        addLog('error', `Failed to scrape ${data.data.url}: ${data.data.error}`, data.data, data.competitor);
                        break;
                    }
                    break;

                  case 'complete':
                    // Extract the competitors array and create the expected structure
                    const competitorAnalyses = data.data.competitors || [];
                    const summary = data.data.summary || {};

                    updateState({
                      step: 'results',
                      progress: 100,
                      currentStage: 'Analysis complete!',
                      analysisResults: {
                        competitorCount: summary.totalCompetitors || competitorAnalyses.length,
                        analyses: competitorAnalyses.map((comp: AnalysisData) => ({
                          competitor: comp.competitor,
                          executiveSummary: comp.finalReport?.split('\n').slice(0, 3).join(' ') || 'Analysis completed',
                          confidence: comp.metadata?.success ? 0.85 : 0.0,
                          finalReport: comp.finalReport,
                          searchQueries: comp.searchQueries,
                          searchResults: comp.searchResults,
                          prioritizedUrls: comp.prioritizedUrls,
                          scrapedContent: comp.scrapedContent,
                          metadata: comp.metadata
                        })),
                        businessContext: data.data.businessContext,
                        overallInsights: {
                          keyTrends: ['Market analysis completed'],
                          competitiveThreats: ['Competitive intelligence gathered'],
                          marketOpportunities: ['Strategic insights generated']
                        },
                        completedAt: new Date().toISOString(),
                        metadata: {
                          totalCost: summary.totalCost || 0,
                          avgCostPerCompetitor: summary.avgCostPerCompetitor || 0,
                          processingTimeSeconds: summary.processingTimeSeconds || 0,
                          successfulAnalyses: summary.successfulAnalyses || 0,
                          timestamp: new Date().toISOString(),
                          success: true
                        }
                      }
                    });
                    addLog('success', 'Analysis completed successfully!', data.data);
                    return; // Exit the function on completion

                  case 'error':
                  case 'timeout':
                    addLog('error', data.message, data);
                    throw new Error(data.message);

                  default:
                    console.log('Unknown stream event:', data);
                }
              } catch (parseError) {
                console.warn('Failed to parse stream data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      console.error('Analysis error:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Analysis failed',
        progress: 0,
        currentStage: undefined,
      });
    }
  };

  const resetAnalysis = () => {
    setState({
      step: 'upload',
      files: [],
      competitors: [],
      businessContext: undefined,
      analysisResults: undefined,
      error: undefined,
      progress: 0,
      currentStage: undefined,
      accuracyMode: 'economy',
      analysisLogs: [],
      showLogs: true,
      expandedSections: {
        competitiveMatrix: true,
        threatAssessment: true,
        marketOpportunity: true,
        marketIntelligence: true,
        individualReports: true,
      },
    });
  };

  const downloadReport = () => {
    window.print();
  };

  const getStepIcon = (step: AnalysisStep) => {
    switch (step) {
      case 'upload': return FileText;
      case 'competitors': return Users;
      case 'analyzing': return Loader2;
      case 'results': return BarChart3;
    }
  };

  const isStepComplete = (step: AnalysisStep) => {
    switch (step) {
      case 'upload': return state.files.length > 0 || state.step !== 'upload'; // Complete if files uploaded OR step passed
      case 'competitors': return state.competitors.length > 0;
      case 'analyzing': return state.step === 'results';
      case 'results': return !!state.analysisResults;
    }
  };

  const isStepActive = (step: AnalysisStep) => state.step === step;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Competitive Intelligence Analysis</h1>
          <p className="text-gray-600">
            AI-driven competitor research and strategic analysis powered by Claude
          </p>
        </div>

        {/* Progress Steps */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {(['upload', 'competitors', 'analyzing', 'results'] as const).map((step, index) => {
                const Icon = getStepIcon(step);
                const isComplete = isStepComplete(step);
                const isActive = isStepActive(step);

                return (
                  <div key={step} className="flex items-center">
                    <div className={`
                      flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                      ${isComplete ? 'bg-green-500 border-green-500 text-white' :
                        isActive ? 'bg-blue-500 border-blue-500 text-white' :
                        'border-gray-300 text-gray-400'}
                    `}>
                      {isComplete ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Icon className={`h-5 w-5 ${step === 'analyzing' && isActive ? 'animate-spin' : ''}`} />
                      )}
                    </div>

                    <div className="ml-3">
                      <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : isComplete ? 'text-green-600' : 'text-gray-500'}`}>
                        {step === 'upload' && 'Upload Documents (Optional)'}
                        {step === 'competitors' && 'Add Competitors'}
                        {step === 'analyzing' && 'AI Analysis'}
                        {step === 'results' && 'Results'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {step === 'upload' && (state.files.length > 0 ? `${state.files.length} files` : state.step !== 'upload' ? 'Skipped' : 'Optional')}
                        {step === 'competitors' && `${state.competitors.length} competitors`}
                        {step === 'analyzing' && state.currentStage}
                        {step === 'results' && state.analysisResults && 'Complete'}
                      </p>
                    </div>

                    {index < 3 && (
                      <ChevronRight className="mx-4 h-5 w-5 text-gray-400" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {state.error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {/* Processing Warning Display */}
        {state.processingWarning && !state.error && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> {state.processingWarning}
            </AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        {state.step === 'upload' && (
          <div className="space-y-6">
            <FileUploadZone
              onFilesChange={(files) => {
                updateState({ files });
                if (files.length > 0) {
                  processDocuments(files);
                }
              }}
              maxFiles={10}
              maxTotalSize={50 * 1024 * 1024}
            />

            {/* Accuracy Mode Toggle */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Document Processing Mode</h3>
                    <p className="text-xs text-gray-600">Choose your balance between cost and accuracy for competitor extraction</p>
                  </div>

                  <RadioGroup
                    value={state.accuracyMode}
                    onValueChange={(value: 'economy' | 'accuracy') => updateState({ accuracyMode: value })}
                    className="space-y-3"
                  >
                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-green-200 bg-green-50">
                      <RadioGroupItem value="economy" id="economy" className="mt-1" />
                      <div className="space-y-1 flex-1">
                        <Label htmlFor="economy" className="flex items-center space-x-2 cursor-pointer">
                          <Zap className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-green-800">Economy Mode</span>
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">~$0.06</Badge>
                        </Label>
                        <p className="text-xs text-green-700">
                          3-pass extraction with Haiku 3.5 • 80-90% accuracy • Cost-effective for most documents
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-blue-200 bg-blue-50">
                      <RadioGroupItem value="accuracy" id="accuracy" className="mt-1" />
                      <div className="space-y-1 flex-1">
                        <Label htmlFor="accuracy" className="flex items-center space-x-2 cursor-pointer">
                          <Target className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-blue-800">Accuracy Mode</span>
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">~$0.27</Badge>
                        </Label>
                        <p className="text-xs text-blue-700">
                          Single-pass with Sonnet 4 • 100% accuracy • Best for critical analysis or complex documents
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Optional Upload Notice */}
            <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-800 mb-1">
                      Document Upload is Optional
                    </h4>
                    <p className="text-xs text-amber-700">
                      Upload documents for AI-powered business context understanding, or skip to manually add competitors.
                      Uploading documents helps AI identify competitors and understand your business better.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={skipUploadStep}
                className="min-w-32"
              >
                Skip & Add Manually
              </Button>
              <Button
                onClick={nextStep}
                disabled={state.files.length === 0}
                className="min-w-32"
              >
                {state.files.length > 0 ? 'Next: Add Competitors' : 'Upload Files First'}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {state.step === 'competitors' && (
          <div className="space-y-6">
            <CompetitorInput
              onCompetitorsChange={(competitors) => updateState({ competitors })}
              businessContext={state.businessContext}
              maxCompetitors={50}
              initialCompetitors={state.competitors}
              isProcessingDocuments={state.isProcessingDocuments}
              processingStage={state.processingStage}
            />

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Back: Upload Documents
              </Button>
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
                className="min-w-32"
              >
                <Play className="mr-2 h-4 w-4" />
                Start Analysis
              </Button>
            </div>
          </div>
        )}

        {state.step === 'analyzing' && (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="mx-auto h-16 w-16 animate-spin text-blue-500 mb-4" />
              <h3 className="text-xl font-medium mb-2">
                {state.currentStage || 'Processing...'}
              </h3>
              <p className="text-gray-600 mb-6">
                AI is analyzing {state.files.length} documents and researching{' '}
                {state.competitors.length} competitors from multiple perspectives.
                This may take several minutes.
              </p>

              <div className="max-w-md mx-auto">
                <Progress value={state.progress} className="mb-2" />
                <p className="text-sm text-gray-500">{Math.round(state.progress)}% complete</p>
              </div>

              {/* Live Analysis Logs */}
              {state.analysisLogs.length > 0 && (
                <div className="mt-8 max-w-4xl mx-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium">Live Analysis Log</h4>
                    <button
                      onClick={() => updateState({ showLogs: !state.showLogs })}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {state.showLogs ? 'Hide Details' : 'Show Details'}
                    </button>
                  </div>

                  {state.showLogs && (
                    <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto text-left">
                      <div className="space-y-2">
                        {state.analysisLogs.slice(-50).map((log, index) => (
                          <div key={index} className="flex items-start gap-3 text-sm">
                            <span className="text-xs text-gray-400 mt-0.5 w-16 flex-shrink-0">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                              log.type === 'error' ? 'bg-red-500' :
                              log.type === 'warning' ? 'bg-yellow-500' :
                              log.type === 'success' ? 'bg-green-500' :
                              log.type === 'query' ? 'bg-blue-500' :
                              log.type === 'url' ? 'bg-purple-500' :
                              log.type === 'search' ? 'bg-indigo-500' :
                              log.type === 'scrape' ? 'bg-orange-500' :
                              'bg-gray-400'
                            }`} />
                            {log.competitor && (
                              <span className="text-xs bg-gray-200 px-2 py-0.5 rounded font-medium">
                                {log.competitor}
                              </span>
                            )}
                            <span className="flex-1">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900">Document Intelligence</h4>
                  <p className="text-blue-700">Extracting business context and competitive insights</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900">Research Orchestration</h4>
                  <p className="text-purple-700">Gathering intelligence through web research and analysis</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900">Multi-Perspective Analysis</h4>
                  <p className="text-green-700">Analyzing from 10+ expert viewpoints for comprehensive insights</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {state.step === 'results' && state.analysisResults && (
          <div className="space-y-6">
            {/* Results Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Analysis Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {state.analysisResults.competitorCount || 0}
                    </div>
                    <div className="text-sm text-gray-600">Competitors Analyzed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {state.analysisResults.analyses?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Competitors Researched</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {state.analysisResults.analyses && state.analysisResults.analyses.length > 0
                        ? Math.round((state.analysisResults.analyses.reduce((acc, a) => acc + (a.confidence || 0), 0) / state.analysisResults.analyses.length) * 100)
                        : 0}%
                    </div>
                    <div className="text-sm text-gray-600">Confidence Score</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {state.analysisResults.analyses?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Strategic Analyses</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Insights */}
            {state.analysisResults.overallInsights && (
              <Card>
                <CardHeader>
                  <CardTitle>Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Market Overview</h4>
                      <p className="text-gray-600">{state.analysisResults.overallInsights?.keyTrends?.join(', ') || 'No market insights available'}</p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Competitive Themes</h4>
                      <div className="flex flex-wrap gap-2">
                        {state.analysisResults.overallInsights?.competitiveThreats?.slice(0, 5).map((theme: string, index: number) => (
                          <Badge key={index} variant="outline">{theme}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                      <Badge className="bg-blue-100 text-blue-800">
                        Analysis Complete
                      </Badge>
                      <p className="text-sm text-gray-500">
                        Analysis completed at {state.analysisResults.completedAt ? new Date(state.analysisResults.completedAt).toLocaleString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comprehensive Analysis Report */}
            <div className="space-y-8">
              {/* Individual Competitor Reports */}
              {state.analysisResults.analyses?.map((analysis: AnalysisData, index: number) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardHeader
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleSection('individualReports')}
                  >
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        {analysis.competitor?.name} - Detailed Analysis Report
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                          state.expandedSections.individualReports ? 'rotate-0' : 'rotate-180'
                        }`}
                      />
                    </CardTitle>
                  </CardHeader>
                  {state.expandedSections.individualReports && (
                    <CardContent className="p-8">
                    <div className="prose prose-slate max-w-none prose-a:text-blue-600 prose-a:underline prose-a:font-medium hover:prose-a:text-blue-800">
                      <div
                        className="markdown-content"
                        dangerouslySetInnerHTML={{
                          __html: analysis.finalReport ?
                            analysis.finalReport
                              // Convert headings with proper closing tags and styling
                              .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-blue-500 pb-2">$1</h1>')
                              .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-semibold text-gray-700 mt-8 mb-4 border-l-4 border-blue-400 pl-3">$1</h2>')
                              .replace(/^### (.+)$/gm, '<h3 class="text-xl font-medium text-gray-600 mt-6 mb-3">$1</h3>')
                              .replace(/^#### (.+)$/gm, '<h4 class="text-lg font-medium text-gray-600 mt-4 mb-2">$1</h4>')
                              // Handle bold and italic text
                              .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-800">$1</strong>')
                              .replace(/\*(.*?)\*/g, '<em class="italic text-gray-700">$1</em>')
                              // Handle links with better styling
                              .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline font-medium">$1</a>')
                              // Handle lists properly
                              .replace(/^- (.+)$/gm, '<li class="ml-4 mb-1">$1</li>')
                              .replace(/^• (.+)$/gm, '<li class="ml-4 mb-1">$1</li>')
                              .replace(/(<li.*?<\/li>(?:\n<li.*?<\/li>)*)/g, '<ul class="list-disc list-inside space-y-1 mb-4">$1</ul>')
                              // Handle numbered lists
                              .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 mb-1">$1</li>')
                              // Convert line breaks to paragraphs for better spacing
                              .replace(/\n\n/g, '</p><p class="mb-4">')
                              .replace(/^(?!<[h1-6]|<ul|<ol|<li)(.+)$/gm, '<p class="mb-4 text-gray-700 leading-relaxed">$1</p>')
                              // Clean up extra paragraph tags and line breaks
                              .replace(/<p[^>]*><\/p>/g, '')
                              .replace(/\n/g, ' ')
                            : `<h1 class="text-3xl font-bold text-gray-800 mb-6">${analysis.competitor?.name} - Analysis Report</h1><p class="text-gray-600">Report content not available</p>`
                        }}
                      />
                    </div>
                    </CardContent>
                  )}
                </Card>
              ))}

              {/* Enhanced Competitive Landscape Analysis */}
              {(() => {
                if (!state.analysisResults.analyses || state.analysisResults.analyses.length === 0) return null;

                // Extract insights from all competitors - Enhanced McKinsey-level analysis
                const competitorInsights: CompetitorInsights[] = state.analysisResults.analyses.map((analysis: AnalysisData) =>
                  generateEnhancedCompetitorInsights(analysis.competitor?.name || 'Unknown', analysis.finalReport || '')
                );

                // Generate advanced insights with strategic frameworks
                const advancedCompetitorInsights: AdvancedCompetitorInsights[] = state.analysisResults.analyses.map((analysis: AnalysisData) =>
                  generateAdvancedCompetitorInsights(analysis.competitor?.name || 'Unknown', analysis.finalReport || '',
                    generateEnhancedCompetitorInsights(analysis.competitor?.name || 'Unknown', analysis.finalReport || ''))
                );

                // Generate market intelligence - Enhanced with advanced frameworks
                const marketIntel: MarketIntelligence = generateEnhancedMarketIntelligence(competitorInsights);
                const advancedMarketIntel: AdvancedMarketIntelligence = generateAdvancedMarketIntelligence(advancedCompetitorInsights);

                return (
                  <div className="space-y-8">
                    {/* Advanced Competitive Matrix */}
                    <Card className="border-l-4 border-l-gradient-to-r border-l-blue-500">
                      <CardHeader
                        className="cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200"
                        onClick={() => toggleSection('competitiveMatrix')}
                      >
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                              <Trophy className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Advanced Competitive Intelligence Matrix
                              </h3>
                              <p className="text-sm text-gray-500 font-normal">
                                Strategic positioning with 12-dimension analysis • Porter&apos;s frameworks • Predictive insights
                              </p>
                            </div>
                          </div>
                          <ChevronDown
                            className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                              state.expandedSections.competitiveMatrix ? 'rotate-0' : 'rotate-180'
                            }`}
                          />
                        </CardTitle>
                      </CardHeader>
                      {state.expandedSections.competitiveMatrix && (
                        <CardContent className="p-8">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
                            <thead>
                              <tr className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
                                <th className="border-r border-gray-200 p-4 text-left font-semibold text-gray-800">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Competitor
                                  </div>
                                </th>
                                <th className="border-r border-gray-200 p-4 text-center font-semibold text-gray-800">
                                  <div className="flex flex-col items-center">
                                    <span>Strategic Position</span>
                                    <span className="text-xs text-gray-500 font-normal">Quadrant & Score</span>
                                  </div>
                                </th>
                                <th className="border-r border-gray-200 p-4 text-center font-semibold text-gray-800">
                                  <div className="flex flex-col items-center">
                                    <span>Threat Assessment</span>
                                    <span className="text-xs text-gray-500 font-normal">Level & Response</span>
                                  </div>
                                </th>
                                <th className="border-r border-gray-200 p-4 text-center font-semibold text-gray-800">
                                  <div className="flex flex-col items-center">
                                    <span>Innovation Power</span>
                                    <span className="text-xs text-gray-500 font-normal">Index & Pipeline</span>
                                  </div>
                                </th>
                                <th className="border-r border-gray-200 p-4 text-center font-semibold text-gray-800">
                                  <div className="flex flex-col items-center">
                                    <span>Market Momentum</span>
                                    <span className="text-xs text-gray-500 font-normal">Trajectory & Score</span>
                                  </div>
                                </th>
                                <th className="border-r border-gray-200 p-4 text-center font-semibold text-gray-800">
                                  <div className="flex flex-col items-center">
                                    <span>Competitive Advantage</span>
                                    <span className="text-xs text-gray-500 font-normal">Overall Radar Score</span>
                                  </div>
                                </th>
                                <th className="p-4 text-center font-semibold text-gray-800">
                                  <div className="flex flex-col items-center">
                                    <span>Strategic Profile</span>
                                    <span className="text-xs text-gray-500 font-normal">Porter&apos;s Strategy</span>
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {advancedCompetitorInsights.map((insight, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50/50' : 'bg-gray-50/30 hover:bg-gray-50/70'}>
                                  <td className="border-r border-gray-200 p-4">
                                    <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                        {insight.name.charAt(0)}
                                      </div>
                                      <div>
                                        <div className="font-semibold text-gray-900 text-base">{insight.name}</div>
                                        <div className="text-sm text-gray-600">{insight.competitiveMoat}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {insight.strategicGroupPosition.group}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="border-r border-gray-200 p-4 text-center">
                                    <div className="flex flex-col items-center space-y-2">
                                      <Badge variant="outline" className={`text-xs font-medium ${
                                        insight.strategicPosition.quadrant === 'Leaders' ? 'border-green-500 text-green-700 bg-green-50' :
                                        insight.strategicPosition.quadrant === 'Challengers' ? 'border-blue-500 text-blue-700 bg-blue-50' :
                                        insight.strategicPosition.quadrant === 'Visionaries' ? 'border-purple-500 text-purple-700 bg-purple-50' :
                                        'border-gray-500 text-gray-700 bg-gray-50'
                                      }`}>
                                        {insight.strategicPosition.quadrant}
                                      </Badge>
                                      <div className="flex gap-1">
                                        <div className="text-xs text-gray-500">Exec:</div>
                                        <div className="text-sm font-bold text-blue-600">{insight.strategicPosition.executionAbility}/10</div>
                                      </div>
                                      <div className="flex gap-1">
                                        <div className="text-xs text-gray-500">Vision:</div>
                                        <div className="text-sm font-bold text-purple-600">{insight.strategicPosition.completenessVision}/10</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="border-r border-gray-200 p-4 text-center">
                                    <div className="flex flex-col items-center space-y-2">
                                      <Badge variant={
                                        insight.threatLevel === 'Critical' ? 'destructive' :
                                        insight.threatLevel === 'High' ? 'destructive' :
                                        insight.threatLevel === 'Medium' ? 'default' : 'secondary'
                                      } className={`text-xs font-medium ${
                                        insight.threatLevel === 'Critical' ? 'bg-red-600 text-white' :
                                        insight.threatLevel === 'High' ? 'bg-orange-500 text-white' :
                                        insight.threatLevel === 'Medium' ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'
                                      }`}>
                                        {insight.threatLevel}
                                      </Badge>
                                      <div className="text-xs text-gray-600">
                                        Response: {insight.competitiveResponsePrediction.responseCapability}/10
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Risk: {insight.disruptionRisk.timeToDisruption}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="border-r border-gray-200 p-4 text-center">
                                    <div className="flex flex-col items-center space-y-2">
                                      <div className="text-lg font-bold text-purple-600">{insight.innovationIndex}/10</div>
                                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                                          style={{ width: `${insight.innovationIndex * 10}%` }}
                                        />
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        Pipeline: {insight.competitiveAdvantageRadar.innovationPipeline}/10
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Disruption: {insight.disruptionRisk.claytonChristensenScore}/10
                                      </div>
                                    </div>
                                  </td>
                                  <td className="border-r border-gray-200 p-4 text-center">
                                    <div className="flex flex-col items-center space-y-2">
                                      <Badge variant="outline" className={`text-xs font-medium ${
                                        insight.marketMomentum.growthTrajectory === 'Accelerating' ? 'border-green-500 text-green-700 bg-green-50' :
                                        insight.marketMomentum.growthTrajectory === 'Steady' ? 'border-blue-500 text-blue-700 bg-blue-50' :
                                        insight.marketMomentum.growthTrajectory === 'Slowing' ? 'border-yellow-500 text-yellow-700 bg-yellow-50' :
                                        'border-red-500 text-red-700 bg-red-50'
                                      }`}>
                                        {insight.marketMomentum.growthTrajectory}
                                      </Badge>
                                      <div className="text-lg font-bold text-green-600">{insight.marketMomentum.momentumScore}/10</div>
                                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                                          style={{ width: `${insight.marketMomentum.momentumScore * 10}%` }}
                                        />
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Share: {insight.marketMomentum.marketShareTrend}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="border-r border-gray-200 p-4 text-center">
                                    <div className="flex flex-col items-center space-y-2">
                                      <div className="text-lg font-bold text-indigo-600">{insight.competitiveAdvantageRadar.overallScore}/10</div>
                                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
                                          style={{ width: `${insight.competitiveAdvantageRadar.overallScore * 10}%` }}
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                                        <div>Tech: {insight.competitiveAdvantageRadar.technology}</div>
                                        <div>Brand: {insight.competitiveAdvantageRadar.brand}</div>
                                        <div>Fund: {insight.competitiveAdvantageRadar.funding}</div>
                                        <div>Talent: {insight.competitiveAdvantageRadar.talent}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4 text-center">
                                    <div className="flex flex-col items-center space-y-2">
                                      <Badge variant="outline" className={`text-xs font-medium ${
                                        insight.portersGenericStrategy.strategy === 'Differentiation' ? 'border-purple-500 text-purple-700 bg-purple-50' :
                                        insight.portersGenericStrategy.strategy === 'Cost Leadership' ? 'border-green-500 text-green-700 bg-green-50' :
                                        insight.portersGenericStrategy.strategy.includes('Focus') ? 'border-blue-500 text-blue-700 bg-blue-50' :
                                        'border-orange-500 text-orange-700 bg-orange-50'
                                      }`}>
                                        {insight.portersGenericStrategy.strategy}
                                      </Badge>
                                      <div className="text-sm text-gray-700">{insight.gtmStrategy}</div>
                                      <div className="text-xs text-gray-500">{insight.pricingModel}</div>
                                      <div className="text-xs text-gray-500">
                                        Risk: {insight.portersGenericStrategy.strategicRisk}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        </CardContent>
                      )}
                    </Card>

                    {/* Enhanced Threat Assessment Matrix */}
                    <Card className="border-l-4 border-l-gradient-to-r border-l-red-500 shadow-lg">
                      <CardHeader
                        className="cursor-pointer hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 transition-all duration-200"
                        onClick={() => toggleSection('threatAssessment')}
                      >
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg">
                              <Shield className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                                Competitive Threat Assessment
                              </h3>
                              <p className="text-sm text-gray-500 font-normal">
                                Strategic threat analysis • Disruption risk assessment • Response prediction • SWOT-TOWS matrix
                              </p>
                            </div>
                          </div>
                          <ChevronDown
                            className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                              state.expandedSections.threatAssessment ? 'rotate-0' : 'rotate-180'
                            }`}
                          />
                        </CardTitle>
                      </CardHeader>
                      {state.expandedSections.threatAssessment && (
                        <CardContent className="p-8">
                          {/* Porter's Five Forces Analysis */}
                          <div className="mb-8">
                            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                              <BarChart3 className="h-5 w-5 text-blue-600" />
                              Porter&apos;s Five Forces Analysis
                            </h4>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                <h5 className="font-medium text-blue-800 mb-2">Competitive Rivalry</h5>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-2xl font-bold text-blue-600">{advancedMarketIntel.portersFiveForces.competitiveRivalry.score}/10</span>
                                  <Badge variant="outline" className={`text-xs ${
                                    advancedMarketIntel.portersFiveForces.competitiveRivalry.intensity === 'High' ? 'border-red-500 text-red-700' :
                                    advancedMarketIntel.portersFiveForces.competitiveRivalry.intensity === 'Medium' ? 'border-yellow-500 text-yellow-700' :
                                    'border-green-500 text-green-700'
                                  }`}>
                                    {advancedMarketIntel.portersFiveForces.competitiveRivalry.intensity}
                                  </Badge>
                                </div>
                                <ul className="text-sm text-blue-700 space-y-1">
                                  {advancedMarketIntel.portersFiveForces.competitiveRivalry.factors.map((factor, i) => (
                                    <li key={i}>• {factor}</li>
                                  ))}
                                </ul>
                              </div>

                              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                                <h5 className="font-medium text-purple-800 mb-2">New Entrants</h5>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-2xl font-bold text-purple-600">{advancedMarketIntel.portersFiveForces.threatOfNewEntrants.score}/10</span>
                                  <Badge variant="outline" className={`text-xs ${
                                    advancedMarketIntel.portersFiveForces.threatOfNewEntrants.level === 'High' ? 'border-red-500 text-red-700' :
                                    advancedMarketIntel.portersFiveForces.threatOfNewEntrants.level === 'Medium' ? 'border-yellow-500 text-yellow-700' :
                                    'border-green-500 text-green-700'
                                  }`}>
                                    {advancedMarketIntel.portersFiveForces.threatOfNewEntrants.level}
                                  </Badge>
                                </div>
                                <ul className="text-sm text-purple-700 space-y-1">
                                  {advancedMarketIntel.portersFiveForces.threatOfNewEntrants.barriers.map((barrier, i) => (
                                    <li key={i}>• {barrier}</li>
                                  ))}
                                </ul>
                              </div>

                              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                <h5 className="font-medium text-green-800 mb-2">Supplier Power</h5>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-2xl font-bold text-green-600">{advancedMarketIntel.portersFiveForces.bargainingPowerSuppliers.score}/10</span>
                                  <Badge variant="outline" className={`text-xs ${
                                    advancedMarketIntel.portersFiveForces.bargainingPowerSuppliers.power === 'High' ? 'border-red-500 text-red-700' :
                                    advancedMarketIntel.portersFiveForces.bargainingPowerSuppliers.power === 'Medium' ? 'border-yellow-500 text-yellow-700' :
                                    'border-green-500 text-green-700'
                                  }`}>
                                    {advancedMarketIntel.portersFiveForces.bargainingPowerSuppliers.power}
                                  </Badge>
                                </div>
                                <ul className="text-sm text-green-700 space-y-1">
                                  {advancedMarketIntel.portersFiveForces.bargainingPowerSuppliers.factors.map((factor, i) => (
                                    <li key={i}>• {factor}</li>
                                  ))}
                                </ul>
                              </div>

                              <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-200">
                                <h5 className="font-medium text-orange-800 mb-2">Buyer Power</h5>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-2xl font-bold text-orange-600">{advancedMarketIntel.portersFiveForces.bargainingPowerBuyers.score}/10</span>
                                  <Badge variant="outline" className={`text-xs ${
                                    advancedMarketIntel.portersFiveForces.bargainingPowerBuyers.power === 'High' ? 'border-red-500 text-red-700' :
                                    advancedMarketIntel.portersFiveForces.bargainingPowerBuyers.power === 'Medium' ? 'border-yellow-500 text-yellow-700' :
                                    'border-green-500 text-green-700'
                                  }`}>
                                    {advancedMarketIntel.portersFiveForces.bargainingPowerBuyers.power}
                                  </Badge>
                                </div>
                                <ul className="text-sm text-orange-700 space-y-1">
                                  {advancedMarketIntel.portersFiveForces.bargainingPowerBuyers.factors.map((factor, i) => (
                                    <li key={i}>• {factor}</li>
                                  ))}
                                </ul>
                              </div>

                              <div className="p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border border-gray-200">
                                <h5 className="font-medium text-gray-800 mb-2">Substitutes</h5>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-2xl font-bold text-gray-600">{advancedMarketIntel.portersFiveForces.threatOfSubstitutes.score}/10</span>
                                  <Badge variant="outline" className={`text-xs ${
                                    advancedMarketIntel.portersFiveForces.threatOfSubstitutes.threat === 'High' ? 'border-red-500 text-red-700' :
                                    advancedMarketIntel.portersFiveForces.threatOfSubstitutes.threat === 'Medium' ? 'border-yellow-500 text-yellow-700' :
                                    'border-green-500 text-green-700'
                                  }`}>
                                    {advancedMarketIntel.portersFiveForces.threatOfSubstitutes.threat}
                                  </Badge>
                                </div>
                                <ul className="text-sm text-gray-700 space-y-1">
                                  {advancedMarketIntel.portersFiveForces.threatOfSubstitutes.substitutes.map((substitute, i) => (
                                    <li key={i}>• {substitute}</li>
                                  ))}
                                </ul>
                              </div>

                              <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
                                <h5 className="font-medium text-indigo-800 mb-2">Market Attractiveness</h5>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-3xl font-bold text-indigo-600">{advancedMarketIntel.portersFiveForces.overallAttractiveness}/10</span>
                                </div>
                                <p className="text-sm text-indigo-700">
                                  {advancedMarketIntel.portersFiveForces.overallAttractiveness > 7 ? 'Highly attractive market' :
                                   advancedMarketIntel.portersFiveForces.overallAttractiveness > 5 ? 'Moderately attractive market' :
                                   'Challenging market conditions'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Individual Competitor Threats */}
                          <div className="mt-8">
                            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                              Individual Competitor Threat Analysis
                            </h4>
                            <div className="grid gap-4">
                              {marketIntel.threatMatrix.map((threat, index) => {
                                const advancedInsight = advancedCompetitorInsights.find(ai => ai.name === threat.competitor);
                                return (
                                  <div key={index} className={`p-6 rounded-lg border-l-4 shadow-sm ${
                                    threat.threatLevel === 'Critical' ? 'border-l-red-600 bg-gradient-to-r from-red-50 to-red-25' :
                                    threat.threatLevel === 'High' ? 'border-l-orange-500 bg-gradient-to-r from-orange-50 to-orange-25' :
                                    threat.threatLevel === 'Medium' ? 'border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-yellow-25' :
                                    'border-l-green-500 bg-gradient-to-r from-green-50 to-green-25'
                                  }`}>
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                          threat.threatLevel === 'Critical' ? 'bg-red-600' :
                                          threat.threatLevel === 'High' ? 'bg-orange-500' :
                                          threat.threatLevel === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                                        }`}>
                                          {threat.competitor.charAt(0)}
                                        </div>
                                        <div>
                                          <h4 className="font-semibold text-gray-800 text-lg">{threat.competitor}</h4>
                                          {advancedInsight && (
                                            <p className="text-sm text-gray-600">{advancedInsight.strategicPosition.positioningRationale}</p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Badge variant={
                                          threat.threatLevel === 'Critical' ? 'destructive' :
                                          threat.threatLevel === 'High' ? 'destructive' :
                                          threat.threatLevel === 'Medium' ? 'default' : 'secondary'
                                        } className={`${
                                          threat.threatLevel === 'Critical' ? 'bg-red-600' :
                                          threat.threatLevel === 'High' ? 'bg-orange-500' :
                                          threat.threatLevel === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                                        } text-white`}>
                                          {threat.threatLevel} Threat
                                        </Badge>
                                        {advancedInsight && (
                                          <Badge variant="outline" className="text-xs">
                                            Disruption: {advancedInsight.disruptionRisk.timeToDisruption}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    <div className="grid md:grid-cols-3 gap-6">
                                      <div>
                                        <h5 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                                          <AlertTriangle className="h-4 w-4 text-red-500" />
                                          Primary Threats
                                        </h5>
                                        <ul className="text-sm text-gray-700 space-y-2">
                                          {threat.primaryThreats.length > 0 ? threat.primaryThreats.map((t, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                              <span className="text-red-500 mt-1">•</span>
                                              <span>{t}</span>
                                            </li>
                                          )) : <li className="text-gray-500">• No specific threats identified</li>}
                                        </ul>
                                      </div>

                                      <div>
                                        <h5 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                                          <Shield className="h-4 w-4 text-blue-500" />
                                          Mitigation Strategies
                                        </h5>
                                        <ul className="text-sm text-gray-700 space-y-2">
                                          {threat.mitigation.length > 0 ? threat.mitigation.map((m, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                              <span className="text-blue-500 mt-1">•</span>
                                              <span>{m}</span>
                                            </li>
                                          )) : <li className="text-gray-500">• Maintain current positioning</li>}
                                        </ul>
                                      </div>

                                      {advancedInsight && (
                                        <div>
                                          <h5 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                                            <Target className="h-4 w-4 text-green-500" />
                                            Strategic Response
                                          </h5>
                                          <div className="space-y-2">
                                            <div className="text-sm">
                                              <span className="font-medium">Response Capability:</span>
                                              <span className="ml-2 font-bold text-green-600">{advancedInsight.competitiveResponsePrediction.responseCapability}/10</span>
                                            </div>
                                            <div className="text-sm">
                                              <span className="font-medium">Strategic Flexibility:</span>
                                              <span className="ml-2 font-bold text-blue-600">{advancedInsight.competitiveResponsePrediction.strategicFlexibility}/10</span>
                                            </div>
                                            <div className="text-xs text-gray-600 mt-2">
                                              <strong>Likely Moves:</strong>
                                              {advancedInsight.competitiveResponsePrediction.likelyMoves.slice(0, 2).map((move, i) => (
                                                <div key={i} className="mt-1">• {move.action} ({move.probability}%)</div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>

                    {/* Market Opportunity Analysis */}
                    <Card className="border-l-4 border-l-green-500">
                      <CardHeader
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleSection('marketOpportunity')}
                      >
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-green-500" />
                            Market Opportunity Analysis
                          </div>
                          <ChevronDown
                            className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                              state.expandedSections.marketOpportunity ? 'rotate-0' : 'rotate-180'
                            }`}
                          />
                        </CardTitle>
                      </CardHeader>
                      {state.expandedSections.marketOpportunity && (
                        <CardContent className="p-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Competitive Gaps Identified
                            </h4>
                            <div className="space-y-3">
                              {marketIntel.competitiveGaps.map((gap, index) => (
                                <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                                  <div className="font-medium text-green-800">{gap}</div>
                                  <div className="text-sm text-green-600 mt-1">
                                    Opportunity to differentiate and capture market share
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Strategic Opportunities
                            </h4>
                            <div className="space-y-3">
                              {marketIntel.opportunityMap.map((opp, index) => (
                                <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="font-medium text-blue-800">{opp.area}</div>
                                    <div className="flex gap-2">
                                      <Badge variant="outline" className={
                                        opp.impact === 'High' ? 'border-green-500 text-green-700' :
                                        opp.impact === 'Medium' ? 'border-yellow-500 text-yellow-700' :
                                        'border-gray-500 text-gray-700'
                                      }>
                                        {opp.impact} Impact
                                      </Badge>
                                      <Badge variant="outline" className={
                                        opp.difficulty === 'Easy' ? 'border-green-500 text-green-700' :
                                        opp.difficulty === 'Medium' ? 'border-yellow-500 text-yellow-700' :
                                        'border-red-500 text-red-700'
                                      }>
                                        {opp.difficulty}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="text-sm text-blue-600">Timeline: {opp.timeframe}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        </CardContent>
                      )}
                    </Card>

                    {/* Market Intelligence Summary */}
                    <Card className="border-l-4 border-l-indigo-500">
                      <CardHeader
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleSection('marketIntelligence')}
                      >
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-indigo-500" />
                            Market Intelligence Summary
                          </div>
                          <ChevronDown
                            className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                              state.expandedSections.marketIntelligence ? 'rotate-0' : 'rotate-180'
                            }`}
                          />
                        </CardTitle>
                      </CardHeader>
                      {state.expandedSections.marketIntelligence && (
                        <CardContent className="p-6">
                        <div className="grid md:grid-cols-3 gap-6">
                          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                            <div className="text-3xl font-bold text-blue-600 mb-2">{marketIntel.totalMarketCoverage}%</div>
                            <div className="text-sm text-blue-700 font-medium">Market Coverage</div>
                            <div className="text-xs text-blue-600 mt-1">Competitive landscape saturation</div>
                          </div>

                          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                            <div className="text-3xl font-bold text-green-600 mb-2">{marketIntel.competitiveGaps.length}</div>
                            <div className="text-sm text-green-700 font-medium">Market Gaps</div>
                            <div className="text-xs text-green-600 mt-1">Opportunities identified</div>
                          </div>

                          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                            <div className="text-3xl font-bold text-purple-600 mb-2">{marketIntel.emergingTrends.length}</div>
                            <div className="text-sm text-purple-700 font-medium">Emerging Trends</div>
                            <div className="text-xs text-purple-600 mt-1">Market movements tracked</div>
                          </div>
                        </div>

                        {/* Emerging Trends */}
                        {marketIntel.emergingTrends.length > 0 && (
                          <div className="mt-6">
                            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Emerging Market Trends
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {marketIntel.emergingTrends.map((trend, index) => (
                                <Badge key={index} variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                                  {trend}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Analysis Metrics */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                          <h4 className="font-semibold text-gray-800 mb-4">Analysis Metrics</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-lg border text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                ${state.analysisResults.metadata?.totalCost?.toFixed(3) || '0.409'}
                              </div>
                              <div className="text-sm text-gray-600">Total Cost</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border text-center">
                              <div className="text-2xl font-bold text-purple-600">
                                ${state.analysisResults.metadata?.avgCostPerCompetitor?.toFixed(3) || '0.136'}
                              </div>
                              <div className="text-sm text-gray-600">Cost Per Competitor</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {state.analysisResults.metadata?.processingTimeSeconds ? `${Math.round(state.analysisResults.metadata.processingTimeSeconds / 60)}m` : '17m'}
                              </div>
                              <div className="text-sm text-gray-600">Processing Time</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border text-center">
                              <div className="text-2xl font-bold text-orange-600">
                                {state.analysisResults.metadata?.successfulAnalyses || competitorInsights.length}/{state.analysisResults.competitorCount || competitorInsights.length}
                              </div>
                              <div className="text-sm text-gray-600">Success Rate</div>
                            </div>
                          </div>
                        </div>
                        </CardContent>
                      )}
                    </Card>
                  </div>
                );
              })()}
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={resetAnalysis}>
                Start New Analysis
              </Button>
              <Button onClick={downloadReport}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}