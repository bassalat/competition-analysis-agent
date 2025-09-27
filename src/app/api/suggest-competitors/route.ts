/**
 * Suggest Competitors API Endpoint
 *
 * Uses AI to suggest potential competitors based on business context
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClaudeClient } from '@/lib/api-clients';
import { config } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessContext, existingCompetitors = [] } = body;

    if (!businessContext) {
      return NextResponse.json(
        { error: 'Business context is required' },
        { status: 400 }
      );
    }

    const claude = getClaudeClient();

    const prompt = `
Based on the business context provided, suggest potential competitors that should be analyzed.

Business Context:
${JSON.stringify(businessContext, null, 2)}

Existing Competitors (don't repeat these):
${JSON.stringify(existingCompetitors, null, 2)}

Suggest competitors in these categories:

DIRECT COMPETITORS:
- Companies with similar products/services
- Same target market and business model
- Direct feature and pricing competition

INDIRECT COMPETITORS:
- Companies solving similar problems differently
- Alternative solutions customers might choose
- Adjacent market players

EMERGING THREATS:
- Startups that could disrupt the space
- Well-funded companies expanding into the market
- New technology approaches

PLATFORM THREATS:
- Large platforms that might expand
- Marketplace or aggregator companies
- Technology providers who could compete

For each competitor, provide:
- Company name
- Website URL (best guess if not certain)
- Brief description
- Why they're competitive
- Threat level (high/medium/low)
- Category (direct/indirect/emerging/platform)

Return as JSON array with 10-15 suggestions:
{
  "suggestions": [
    {
      "name": "Company Name",
      "website": "https://company.com",
      "description": "Brief description of what they do",
      "reasoning": "Why they're a competitor",
      "threatLevel": "high|medium|low",
      "category": "direct|indirect|emerging|platform",
      "confidence": 0.0-1.0
    }
  ]
}
    `.trim();

    const response = await claude.complete(prompt, {
      maxTokens: 8000, // Haiku max is 8192 tokens
      temperature: 0.4,
      model: config.claude.quickModel, // Use Haiku for cost-effective competitor suggestions
    });

    if (!response.success) {
      return NextResponse.json(
        { error: 'Failed to generate competitor suggestions' },
        { status: 500 }
      );
    }

    try {
      // Extract JSON from Claude's response (handle various formats)
      let jsonString = response.data!;

      // First try: Look for JSON in code blocks
      let jsonMatch = jsonString.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      } else {
        // Second try: Look for JSON object anywhere in the response
        jsonMatch = jsonString.match(/(\{[\s\S]*?\})/);
        if (jsonMatch) {
          jsonString = jsonMatch[1];
        }
      }

      const suggestions = JSON.parse(jsonString);
      return NextResponse.json({
        success: true,
        suggestions: suggestions.suggestions || [],
        generatedAt: new Date().toISOString(),
      });
    } catch (parseError) {
      console.warn('Failed to parse competitor suggestions:', parseError);
      // Return fallback suggestions on parse error
      return NextResponse.json({
        success: true,
        suggestions: [
          { name: 'Search for similar companies', reason: 'Fallback suggestion due to parsing error' },
          { name: 'Check industry reports', reason: 'Alternative research approach' },
          { name: 'Review competitor databases', reason: 'Manual research option' }
        ],
        generatedAt: new Date().toISOString(),
        fallback: true
      });
    }

  } catch (error) {
    console.error('Competitor suggestion failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to suggest competitors',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Competitor Suggestions API',
    method: 'POST',
    description: 'Generate AI-powered competitor suggestions based on business context',
    parameters: {
      businessContext: 'Business context object with industry, products, market info',
      existingCompetitors: 'Optional array of competitors to exclude from suggestions'
    },
    returns: {
      suggestions: 'Array of competitor suggestions with names, websites, and analysis'
    }
  });
}