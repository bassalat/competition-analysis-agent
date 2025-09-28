/**
 * CompetitorInput - Interface for adding competitors manually and from documents
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Users, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Competitor {
  id: string;
  name: string;
  website?: string;
  description?: string;
  isManual: boolean;
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
  initialCompetitors?: Array<{ name: string; website?: string; description?: string; }>;
}

export function CompetitorInput({
  onCompetitorsChange,
  businessContext,
  maxCompetitors = 50,
  initialCompetitors = [],
}: CompetitorInputProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [newCompetitor, setNewCompetitor] = useState({ name: '', website: '', description: '' });

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


  const removeCompetitor = (id: string) => {
    const updatedCompetitors = competitors.filter(c => c.id !== id);
    setCompetitors(updatedCompetitors);
    notifyParentOfChanges(updatedCompetitors);
  };


  return (
    <div className="space-y-6">
      {/* Competitor Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Add Competitors ({competitors.length}/{maxCompetitors})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* AI Detection Notice */}
          {competitors.length > 0 && competitors.every(c => !c.isManual) && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                🤖 <strong>Found {competitors.length} competitors</strong> from your documents.
                You can add more competitors below if needed.
              </p>
            </div>
          )}

          {/* No Documents Notice */}
          {!businessContext && competitors.length === 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                📝 <strong>Manual entry mode:</strong> Add competitors manually using the form below.
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

      {/* Instructions */}
      <div className="text-sm text-gray-500">
        {competitors.length > 0 && competitors.every(c => !c.isManual) ? (
          <div>
            <p className="mb-2">
              <strong>✨ Competitors detected</strong> from your business documents.
              You can proceed with these or add more competitors above.
            </p>
          </div>
        ) : !businessContext ? (
          <div>
            <p className="mb-2">
              <strong>Manual entry mode:</strong> Add competitors using the form above.
              Include direct competitors, indirect competitors, and related companies.
            </p>
          </div>
        ) : (
          <div>
            <p className="mb-2">
              <strong>Add competitors manually</strong> using the form above.
              Include both direct and indirect competitors for better insights.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}