/**
 * Simplified Competitor Setup Page - Document upload and competitor entry
 */

'use client';

import React, { useState } from 'react';
import { ChevronRight, FileText, Users, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUploadZone } from '@/components/analysis/FileUploadZone';
import { CompetitorInput } from '@/components/analysis/CompetitorInput';
import { BusinessContext } from '@/types/api';

type SetupStep = 'upload' | 'competitors';

interface SetupState {
  step: SetupStep;
  files: File[];
  competitors: Array<{ name: string; website?: string; description?: string }>;
  businessContext?: BusinessContext;
  processingWarning?: string;
  isProcessingDocuments?: boolean;
  processingStage?: string;
}

export default function AnalyzePage() {
  const [state, setState] = useState<SetupState>({
    step: 'upload',
    files: [],
    competitors: [],
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
    }
  };

  const resetToUpload = () => {
    updateState({
      step: 'upload',
      files: [],
      competitors: [],
      businessContext: undefined,
      processingWarning: undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Competitor Setup
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Upload documents to extract competitors or manually add them to create your competitor list
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
      </div>
    </div>
  );
}