'use client';

/**
 * Research results display component
 * Formats and displays the final research report with export options
 */

import React, { useState } from 'react';
import { Download, FileText, Eye, Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CompetitorResearchResult } from '@/types/research';

interface ResearchResultsProps {
  result: CompetitorResearchResult;
  className?: string;
  showMetadata?: boolean;
}

export function ResearchResults({
  result,
  className = '',
  showMetadata = true,
}: ResearchResultsProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Copy text to clipboard
  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Export as Markdown
  const exportMarkdown = () => {
    const blob = new Blob([result.report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.competitor.name.replace(/[^a-z0-9]/gi, '_')}_research_report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export as PDF (simplified)
  const exportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const formattedReport = result.report
        .replace(/\n/g, '<br>')
        .replace(/^# (.+)/gm, '<h1>$1</h1>')
        .replace(/^## (.+)/gm, '<h2>$1</h2>')
        .replace(/^### (.+)/gm, '<h3>$1</h3>')
        .replace(/^\* (.+)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');

      printWindow.document.write(`
        <html>
          <head>
            <title>${result.competitor.name} Research Report</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                margin: 40px;
                line-height: 1.6;
                color: #333;
              }
              h1 {
                color: #1a1a1a;
                border-bottom: 3px solid #3b82f6;
                padding-bottom: 10px;
                margin-bottom: 30px;
              }
              h2 {
                color: #374151;
                border-bottom: 1px solid #e5e7eb;
                margin-top: 40px;
                padding-bottom: 8px;
              }
              h3 {
                color: #4b5563;
                margin-top: 24px;
              }
              ul { margin: 16px 0; padding-left: 24px; }
              li { margin: 8px 0; }
              @media print {
                body { margin: 20px; }
                h1 { page-break-before: avoid; }
                h2 { page-break-before: avoid; }
              }
            </style>
          </head>
          <body>
            ${formattedReport}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Format content for display
  const formatContent = (content: string) => {
    return content
      .replace(/\n/g, '<br>')
      .replace(/^# (.+)/gm, '<h1 class="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-blue-500 pb-2">$1</h1>')
      .replace(/^## (.+)/gm, '<h2 class="text-xl font-semibold text-gray-800 mt-6 mb-3 border-b border-gray-200 pb-1">$1</h2>')
      .replace(/^### (.+)/gm, '<h3 class="text-lg font-medium text-gray-700 mt-4 mb-2">$1</h3>')
      .replace(/^\* (.+)/gm, '<li class="ml-4 text-gray-600">$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1 <svg class="inline h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a>');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-gray-900">
                Research Results: {result.competitor.name}
              </CardTitle>
              {result.competitor.website && (
                <p className="text-sm text-gray-500 mt-1">
                  <a
                    href={result.competitor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 inline-flex items-center gap-1"
                  >
                    {result.competitor.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => copyToClipboard(result.report, 'full')}
                size="sm"
                variant="outline"
                className="text-gray-600"
              >
                {copiedSection === 'full' ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copiedSection === 'full' ? 'Copied!' : 'Copy'}
              </Button>
              <Button
                onClick={exportMarkdown}
                size="sm"
                variant="outline"
                className="text-gray-600"
              >
                <Download className="h-4 w-4 mr-2" />
                Markdown
              </Button>
              <Button
                onClick={exportPDF}
                size="sm"
                variant="outline"
                className="text-gray-600"
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>

        {showMetadata && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-900">{result.metadata.totalDocuments}</div>
                <div className="text-gray-500">Documents</div>
              </div>
              <div>
                <div className="font-medium text-gray-900">{result.metadata.duration.toFixed(1)}s</div>
                <div className="text-gray-500">Duration</div>
              </div>
              <div>
                <div className="font-medium text-gray-900">${result.metadata.costEstimate.toFixed(3)}</div>
                <div className="text-gray-500">Est. Cost</div>
              </div>
              <div>
                <div className="font-medium text-gray-900">{result.metadata.sourcesUsed.length}</div>
                <div className="text-gray-500">Sources</div>
              </div>
              <div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Eye className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Research Content Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="overview" className="w-full">
            <div className="border-b">
              <TabsList className="grid w-full grid-cols-5 rounded-none bg-gray-50 h-auto">
                <TabsTrigger value="overview" className="data-[state=active]:bg-white py-3">
                  Company Overview
                </TabsTrigger>
                <TabsTrigger value="industry" className="data-[state=active]:bg-white py-3">
                  Industry Analysis
                </TabsTrigger>
                <TabsTrigger value="financial" className="data-[state=active]:bg-white py-3">
                  Financial Overview
                </TabsTrigger>
                <TabsTrigger value="news" className="data-[state=active]:bg-white py-3">
                  News & Updates
                </TabsTrigger>
                <TabsTrigger value="full" className="data-[state=active]:bg-white py-3">
                  Full Report
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="overview" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Company Overview</h3>
                    <Button
                      onClick={() => copyToClipboard(result.briefings.company, 'company')}
                      size="sm"
                      variant="ghost"
                    >
                      {copiedSection === 'company' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div
                    className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700"
                    dangerouslySetInnerHTML={{
                      __html: formatContent(result.briefings.company)
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="industry" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Industry Analysis</h3>
                    <Button
                      onClick={() => copyToClipboard(result.briefings.industry, 'industry')}
                      size="sm"
                      variant="ghost"
                    >
                      {copiedSection === 'industry' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div
                    className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700"
                    dangerouslySetInnerHTML={{
                      __html: formatContent(result.briefings.industry)
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="financial" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Financial Overview</h3>
                    <Button
                      onClick={() => copyToClipboard(result.briefings.financial, 'financial')}
                      size="sm"
                      variant="ghost"
                    >
                      {copiedSection === 'financial' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div
                    className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700"
                    dangerouslySetInnerHTML={{
                      __html: formatContent(result.briefings.financial)
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="news" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Recent News & Updates</h3>
                    <Button
                      onClick={() => copyToClipboard(result.briefings.news, 'news')}
                      size="sm"
                      variant="ghost"
                    >
                      {copiedSection === 'news' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div
                    className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-ul:list-disc"
                    dangerouslySetInnerHTML={{
                      __html: formatContent(result.briefings.news)
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="full" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Complete Research Report</h3>
                    <Button
                      onClick={() => copyToClipboard(result.report, 'full')}
                      size="sm"
                      variant="ghost"
                    >
                      {copiedSection === 'full' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div
                    className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-ul:list-disc"
                    dangerouslySetInnerHTML={{
                      __html: formatContent(result.report)
                    }}
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Error State */}
      {!result.success && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {result.error || 'Research failed to complete successfully.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}