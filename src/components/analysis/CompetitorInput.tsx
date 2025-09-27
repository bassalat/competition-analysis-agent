/**
 * CompetitorInput - Interface for adding competitors with AI suggestions
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Users, Lightbulb, Globe, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

interface Competitor {
  id: string;
  name: string;
  website?: string;
  description?: string;
  isManual: boolean;
}

interface CompetitorSuggestion {
  name: string;
  website: string;
  description: string;
  reasoning: string;
  threatLevel: 'high' | 'medium' | 'low';
  category: 'direct' | 'indirect' | 'emerging' | 'platform';
  confidence: number;
}

interface CompetitorInputProps {
  onCompetitorsChange: (competitors: Omit<Competitor, 'id' | 'isManual'>[]) => void;
  businessContext?: {
    company: string;
    industry: string;
    targetMarket: string[];
    businessModel: string;
    valueProposition: string;
    keyProducts: string[];
    competitiveAdvantages: string[];
    challenges: string[];
    objectives: string[];
  };
  maxCompetitors?: number;
  initialCompetitors?: Array<{ name: string; website?: string; description?: string; source?: string; confidence?: number; }>;
  isProcessingDocuments?: boolean;
  processingStage?: string;
}

export function CompetitorInput({
  onCompetitorsChange,
  businessContext,
  maxCompetitors = 50,
  initialCompetitors = [],
  isProcessingDocuments = false,
  processingStage,
}: CompetitorInputProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [newCompetitor, setNewCompetitor] = useState({ name: '', website: '', description: '' });
  const [suggestions, setSuggestions] = useState<CompetitorSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsGenerated, setSuggestionsGenerated] = useState(false);

  // Load initial competitors from document analysis
  useEffect(() => {
    if (initialCompetitors.length > 0 && competitors.length === 0) {
      const loadedCompetitors = initialCompetitors.map(comp => ({
        id: `init-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: comp.name,
        website: comp.website,
        description: comp.description,
        isManual: false,
      }));
      setCompetitors(loadedCompetitors);
    }
  }, [initialCompetitors, competitors.length]);

  // Generate suggestions function - defined before useEffect that references it
  const generateSuggestions = useCallback(async () => {
    if (!businessContext) return;

    setLoadingSuggestions(true);
    try {
      const response = await fetch('/api/suggest-competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessContext,
          existingCompetitors: competitors.map(c => ({ name: c.name })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } else {
        console.warn('Failed to generate suggestions:', response.statusText);
      }
    } catch (error) {
      console.warn('Error generating suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
      setSuggestionsGenerated(true);
    }
  }, [businessContext, competitors]);

  // Generate AI suggestions when business context is available
  useEffect(() => {
    if (businessContext && !suggestionsGenerated && competitors.length < 3) {
      generateSuggestions();
    }
  }, [businessContext, competitors.length, suggestionsGenerated, generateSuggestions]);

  // Notify parent of competitor changes (only for user-initiated changes)
  const notifyParentOfChanges = useCallback((updatedCompetitors: Competitor[]) => {
    const competitorData = updatedCompetitors.map(comp => ({
      name: comp.name,
      website: comp.website,
      description: comp.description,
    }));
    onCompetitorsChange(competitorData);
  }, [onCompetitorsChange]);

  const addCompetitor = (competitor: Omit<Competitor, 'id'>) => {
    if (competitors.length >= maxCompetitors) return;

    // Check for duplicates
    const duplicate = competitors.find(
      c => c.name.toLowerCase() === competitor.name.toLowerCase()
    );
    if (duplicate) return;

    const newComp: Competitor = {
      ...competitor,
      id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    const updatedCompetitors = [...competitors, newComp];
    setCompetitors(updatedCompetitors);
    notifyParentOfChanges(updatedCompetitors);
  };

  const addManualCompetitor = () => {
    if (!newCompetitor.name.trim()) return;

    addCompetitor({
      ...newCompetitor,
      name: newCompetitor.name.trim(),
      website: newCompetitor.website.trim() || undefined,
      description: newCompetitor.description.trim() || undefined,
      isManual: true,
    });

    setNewCompetitor({ name: '', website: '', description: '' });
  };

  const addSuggestedCompetitor = (suggestion: CompetitorSuggestion) => {
    addCompetitor({
      name: suggestion.name,
      website: suggestion.website,
      description: suggestion.description,
      isManual: false,
    });

    // Remove from suggestions
    setSuggestions(prev => prev.filter(s => s.name !== suggestion.name));
  };

  const removeCompetitor = (id: string) => {
    const updatedCompetitors = competitors.filter(c => c.id !== id);
    setCompetitors(updatedCompetitors);
    notifyParentOfChanges(updatedCompetitors);
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'direct': return 'text-purple-600 bg-purple-100';
      case 'indirect': return 'text-blue-600 bg-blue-100';
      case 'emerging': return 'text-orange-600 bg-orange-100';
      case 'platform': return 'text-teal-600 bg-teal-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Competitor Count and Actions - Only show when not processing */}
      {!isProcessingDocuments && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Add competitors here ({competitors.length}/{maxCompetitors})
              </div>
              {businessContext && !suggestionsGenerated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateSuggestions}
                  disabled={loadingSuggestions}
                >
                  {loadingSuggestions ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Get AI Suggestions
                    </>
                  )}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* AI Detection Notice */}
            {competitors.length > 0 && competitors.every(c => !c.isManual) && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  🤖 <strong>AI found {competitors.length} competitors</strong> from your documents.
                  You can proceed to analysis or optionally add more competitors below.
                </p>
              </div>
            )}

            {/* No Documents Notice */}
            {!businessContext && competitors.length === 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  📝 <strong>Manual competitor entry mode:</strong> Since no documents were uploaded,
                  please add competitors manually below. The AI will research each competitor thoroughly.
                </p>
              </div>
            )}

            {/* Manual Competitor Entry */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  placeholder="Competitor name *"
                  value={newCompetitor.name}
                  onChange={(e) => setNewCompetitor(prev => ({ ...prev, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && addManualCompetitor()}
                />
                <Input
                  placeholder="Website (optional)"
                  value={newCompetitor.website}
                  onChange={(e) => setNewCompetitor(prev => ({ ...prev, website: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && addManualCompetitor()}
                />
                <Input
                  placeholder="Description (optional)"
                  value={newCompetitor.description}
                  onChange={(e) => setNewCompetitor(prev => ({ ...prev, description: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && addManualCompetitor()}
                />
              </div>

              <Button
                onClick={addManualCompetitor}
                disabled={!newCompetitor.name.trim() || competitors.length >= maxCompetitors}
                className="w-full md:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Competitor
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Processing Status */}
      {isProcessingDocuments && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-blue-900">
                  Processing Documents...
                </h3>
                <p className="text-blue-700 mt-1">
                  {processingStage || 'Analyzing your documents to extract business context and identify competitors'}
                </p>
                <div className="mt-3 flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm text-blue-600 font-medium">AI is working on your documents</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Competitors */}
      {competitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selected Competitors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {competitors.map((competitor) => (
                <div
                  key={competitor.id}
                  className="flex items-start justify-between p-3 rounded-lg border bg-blue-50 border-blue-200"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{competitor.name}</h4>
                      <Badge variant={competitor.isManual ? 'default' : 'secondary'}>
                        {competitor.isManual ? 'Manually Added' : 'AI-Detected'}
                      </Badge>
                    </div>

                    {competitor.website && (
                      <p className="text-sm text-blue-600 flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {competitor.website}
                      </p>
                    )}

                    {competitor.description && (
                      <p className="text-sm text-gray-600">{competitor.description}</p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCompetitor(competitor.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions - Only show when no businessContext (manual mode) */}
      {!businessContext && (loadingSuggestions || suggestions.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              AI-Powered Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSuggestions ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-full" />
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-9 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : suggestions.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No additional competitors suggested. You can still add competitors manually above.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{suggestion.name}</h4>
                          {suggestion.website && (
                            <Globe className="h-4 w-4 text-gray-400" />
                          )}
                        </div>

                        <p className="text-sm text-gray-600">{suggestion.description}</p>
                        <p className="text-sm text-gray-500 italic">{suggestion.reasoning}</p>

                        <div className="flex gap-2 flex-wrap">
                          <Badge className={getCategoryColor(suggestion.category)}>
                            {suggestion.category}
                          </Badge>
                          <Badge className={getThreatLevelColor(suggestion.threatLevel)}>
                            {suggestion.threatLevel} threat
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(suggestion.confidence * 100)}% confidence
                          </Badge>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => addSuggestedCompetitor(suggestion)}
                        disabled={competitors.length >= maxCompetitors}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <div className="text-sm text-gray-500">
        {competitors.length > 0 && competitors.every(c => !c.isManual) ? (
          <div>
            <p className="mb-2">
              <strong>✨ AI automatically detected competitors</strong> from your business documents.
              You can proceed with these or optionally add/edit competitors below.
            </p>
            <p>
              <strong>Tip:</strong> The analysis will research each competitor thoroughly using web search and AI analysis.
            </p>
          </div>
        ) : !businessContext ? (
          <div>
            <p className="mb-2">
              <strong>Manual entry mode:</strong> Since no documents were uploaded, please add competitors manually.
              Each competitor will be thoroughly researched and analyzed using web search and AI.
            </p>
            <p>
              <strong>Tip:</strong> Include direct competitors, indirect competitors, and companies that solve similar problems
              in different ways for comprehensive competitive intelligence.
            </p>
          </div>
        ) : (
          <div>
            <p className="mb-2">
              <strong>Add competitors manually</strong> or use AI suggestions based on your business context.
              Each competitor will be thoroughly researched and analyzed.
            </p>
            <p>
              <strong>Tip:</strong> Include both direct competitors and companies that solve similar problems
              in different ways for comprehensive competitive intelligence.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}