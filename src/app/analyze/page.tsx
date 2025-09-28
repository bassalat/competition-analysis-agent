/**
 * Simplified Competitor Setup Page - Document upload and competitor entry
 */

'use client';

import React, { useState } from 'react';
import { ChevronRight, FileText, Users, Loader2, AlertCircle, Search, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUploadZone } from '@/components/analysis/FileUploadZone';
import { CompetitorInput } from '@/components/analysis/CompetitorInput';
import { CompetitorResearchCard } from '@/components/research';
import { BusinessContext, Competitor } from '@/types/api';
import { CompetitorResearchResult } from '@/types/research';

type SetupStep = 'upload' | 'competitors' | 'research';

interface SetupState {
  step: SetupStep;
  files: File[];
  competitors: Array<{ name: string; website?: string; description?: string }>;
  businessContext?: BusinessContext;
  processingWarning?: string;
  isProcessingDocuments?: boolean;
  processingStage?: string;
  researchResults: Record<string, CompetitorResearchResult>;
  completedAnalyses: number;
}

export default function AnalyzePage() {
  const [state, setState] = useState<SetupState>({
    step: 'upload',
    files: [],
    competitors: [],
    researchResults: {},
    completedAnalyses: 0,
  });

  const updateState = (updates: Partial<SetupState>) => {
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


      // Update processing stage
      updateState({ processingStage: 'Analyzing document content and structure...' });

      console.log('📡 Sending request to /api/process-documents');
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

  const nextStep = () => {
    if (state.step === 'upload') {
      updateState({ step: 'competitors' });
    } else if (state.step === 'competitors') {
      updateState({ step: 'research' });
    }
  };

  // Handle research completion
  const handleResearchComplete = (result: CompetitorResearchResult) => {
    const competitorKey = result.competitor.name;
    updateState({
      researchResults: {
        ...state.researchResults,
        [competitorKey]: result,
      },
      completedAnalyses: state.completedAnalyses + 1,
    });
  };

  // Handle research start
  const handleResearchStart = (competitor: Competitor) => {
    console.log(`🚀 Starting research for ${competitor.name}`);
  };

  const resetToUpload = () => {
    updateState({
      step: 'upload',
      files: [],
      competitors: [],
      businessContext: undefined,
      processingWarning: undefined,
      researchResults: {},
      completedAnalyses: 0,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            {state.step === 'upload' && 'Document Upload'}
            {state.step === 'competitors' && 'Competitor Setup'}
            {state.step === 'research' && 'Competitor Research'}
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            {state.step === 'upload' && 'Upload documents to extract competitors or continue to manual entry'}
            {state.step === 'competitors' && 'Add competitors manually or from extracted documents'}
            {state.step === 'research' && 'Analyze each competitor individually to generate comprehensive research reports'}
          </p>
        </div>

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
                Your Competitors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CompetitorInput
                initialCompetitors={state.competitors}
                onCompetitorsChange={(competitors) => updateState({ competitors })}
                businessContext={state.businessContext}
              />

              {state.competitors.length > 0 && (
                <div className="mt-6 bg-slate-700/30 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-slate-300 mb-3">
                    Competitor List ({state.competitors.length})
                  </h3>
                  <div className="space-y-2">
                    {state.competitors.map((competitor, index) => (
                      <div key={index} className="flex items-center justify-between text-sm text-slate-300 bg-slate-700/50 p-2 rounded">
                        <span>{competitor.name}</span>
                        {competitor.website && (
                          <span className="text-xs text-slate-400">{competitor.website}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => updateState({ step: 'upload' })}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Back
                </Button>
                {state.competitors.length > 0 && (
                  <Button
                    onClick={nextStep}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Start Research
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
                <Button
                  onClick={resetToUpload}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Start Over
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Research Step */}
        {state.step === 'research' && (
          <div className="space-y-6">
            {/* Progress Overview */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-400" />
                  Research Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-white">{state.competitors.length}</div>
                    <div className="text-slate-400 text-sm">Total Competitors</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">{state.completedAnalyses}</div>
                    <div className="text-slate-400 text-sm">Completed Analyses</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {state.competitors.length - state.completedAnalyses}
                    </div>
                    <div className="text-slate-400 text-sm">Remaining</div>
                  </div>
                </div>

                {state.completedAnalyses === state.competitors.length && state.competitors.length > 0 && (
                  <div className="mt-4 p-3 bg-green-900/30 border border-green-700 rounded-lg">
                    <div className="flex items-center gap-2 text-green-400">
                      <Brain className="h-4 w-4" />
                      <span className="font-medium">All competitor analyses completed!</span>
                    </div>
                    <p className="text-green-300 text-sm mt-1">
                      You can now review all research results and export reports.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Competitor Research Cards */}
            <div className="space-y-4">
              {state.competitors.map((competitor, index) => (
                <CompetitorResearchCard
                  key={`${competitor.name}-${index}`}
                  competitor={competitor as Competitor}
                  businessContext={state.businessContext}
                  onResearchStart={handleResearchStart}
                  onResearchComplete={handleResearchComplete}
                />
              ))}
            </div>

            {/* Navigation */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Button
                    onClick={() => updateState({ step: 'competitors' })}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Back to Competitors
                  </Button>
                  <Button
                    onClick={resetToUpload}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Start Over
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}