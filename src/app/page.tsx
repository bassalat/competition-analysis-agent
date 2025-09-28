/**
 * Home Page - Competitor Intelligence System Landing Page
 */

'use client';

import Link from 'next/link';
import { Brain, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">
                AI Competitor Intelligence
              </h1>
            </div>
            <div className="flex items-center space-x-4">
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6 max-w-4xl mx-auto leading-tight">
            <span className="text-blue-600">GTM Competitor Intelligence Engine</span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Upload your business documents for competitive intelligence analysis.
            This is a basic version being incrementally developed.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/analyze">
              <Button size="lg" className="min-w-48">
                Start Analysis
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/api/health">
              <Button variant="outline" size="lg" className="min-w-48">
                System Health
              </Button>
            </Link>
          </div>
        </div>
      </section>


    </div>
  );
}
