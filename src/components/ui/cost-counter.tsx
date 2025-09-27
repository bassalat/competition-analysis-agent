'use client';

import React, { useState, useEffect } from 'react';
import { globalCostTracker, formatCost, formatTokenCount, type SessionCosts } from '@/lib/cost-tracker';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  Activity,
  Clock,
  Zap,
  RefreshCw,
  TrendingUp,
  Eye,
  AlertTriangle
} from 'lucide-react';

export function CostCounter() {
  const [costs, setCosts] = useState<SessionCosts>(globalCostTracker.getSessionCosts());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = globalCostTracker.subscribe(setCosts);
    return unsubscribe;
  }, []);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes === 0) {
      return `${remainingSeconds}s`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusColor = (cost: number): string => {
    if (cost < 1) return 'text-green-600';
    if (cost < 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (cost: number) => {
    if (cost < 1) return <Zap className="w-3 h-3 text-green-600" />;
    if (cost < 5) return <Activity className="w-3 h-3 text-yellow-600" />;
    return <AlertTriangle className="w-3 h-3 text-red-600" />;
  };

  const costByModel = globalCostTracker.getCostByModel();
  const currentCost = costs.estimatedCost ?? costs.totalCost;
  const duration = Date.now() - costs.startTime;

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Compact Cost Display */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-lg">
        <CardContent className="p-3">
          <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-white hover:bg-white/10"
              >
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(currentCost)}
                    <DollarSign className="w-3 h-3" />
                    <span className={`font-mono text-sm font-semibold ${getStatusColor(currentCost)}`}>
                      {formatCost(currentCost)}
                    </span>
                  </div>

                  {costs.estimatedCost && (
                    <div className="flex items-center space-x-1 text-xs text-gray-300">
                      <Activity className="w-3 h-3 animate-pulse" />
                      <span>Running...</span>
                    </div>
                  )}

                  <div className="text-xs text-gray-400">
                    <Eye className="w-3 h-3 inline mr-1" />
                    Details
                  </div>
                </div>
              </Button>
            </DialogTrigger>

            {/* Detailed Cost Breakdown Dialog */}
            <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-md border-gray-200">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span>Analysis Cost Breakdown</span>
                </DialogTitle>
                <DialogDescription>
                  Real-time tracking of your competitive intelligence analysis costs
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <div>
                          <p className="text-xs text-gray-500">Total Cost</p>
                          <p className={`text-lg font-bold ${getStatusColor(currentCost)}`}>
                            {formatCost(currentCost)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-xs text-gray-500">Requests</p>
                          <p className="text-lg font-bold text-gray-900">
                            {costs.requestCount}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <div>
                          <p className="text-xs text-gray-500">Duration</p>
                          <p className="text-lg font-bold text-gray-900">
                            {formatDuration(duration)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-yellow-600" />
                        <div>
                          <p className="text-xs text-gray-500">Tokens</p>
                          <p className="text-lg font-bold text-gray-900">
                            {formatTokenCount(costs.totalInputTokens + costs.totalOutputTokens)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Model Breakdown */}
                {Object.keys(costByModel).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost by Model</h3>
                    <div className="space-y-3">
                      {Object.entries(costByModel).map(([model, stats]) => {
                        const percentage = (stats.cost / costs.totalCost) * 100;
                        const modelName = model.split('-').slice(0, 2).join(' ').toUpperCase();

                        return (
                          <div key={model} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">
                                {modelName}
                              </span>
                              <div className="flex items-center space-x-3 text-sm text-gray-500">
                                <span>{stats.requests} calls</span>
                                <span className="font-semibold text-gray-900">
                                  {formatCost(stats.cost)}
                                </span>
                              </div>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Token Breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Input Tokens</h4>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatTokenCount(costs.totalInputTokens)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Cost: {formatCost(costs.breakdown.reduce((sum, b) => sum + b.inputCost, 0))}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Output Tokens</h4>
                      <p className="text-2xl font-bold text-green-600">
                        {formatTokenCount(costs.totalOutputTokens)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Cost: {formatCost(costs.breakdown.reduce((sum, b) => sum + b.outputCost, 0))}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Cost Status and Warning */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    {currentCost > 5 && (
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {currentCost < 1 ? 'Low Cost' :
                         currentCost < 5 ? 'Moderate Cost' :
                         'High Cost Analysis'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {currentCost < 1 ? 'Great! Your analysis is cost-efficient.' :
                         currentCost < 5 ? 'Reasonable cost for comprehensive analysis.' :
                         'Consider using Quick mode for cost savings.'}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => globalCostTracker.reset()}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                </div>

                {costs.estimatedCost && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
                      <p className="text-sm text-blue-800">
                        Analysis in progress... Estimated cost: {formatCost(costs.estimatedCost)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}