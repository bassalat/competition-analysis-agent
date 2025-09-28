/**
 * Document Processing API Endpoint
 *
 * Processes uploaded documents to extract business context and suggest competitors
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateConfig } from '@/lib/config';

/**
 * Claude-powered document processing and competitor extraction
 */
async function extractCompetitorsWithClaude(files: File[], accuracyMode: 'economy' | 'accuracy' = 'economy') {
  const { ClaudeClient } = await import('@/lib/api-clients/claude-client');
  const claude = new ClaudeClient();

  const competitors: Array<{ name: string; website: string; description: string; source: string; confidence: number }> = [];

  console.log(`📊 Using ${accuracyMode} mode for competitor extraction`);

  for (const file of files) {
    try {
      console.log(`Processing ${file.name} with Claude...`);

      let documentContent: string;
      let isBase64 = false;

      // Handle different file types as specified
      if (file.type === 'application/pdf') {
        // PDF: Send as base64 with media_type
        const arrayBuffer = await file.arrayBuffer();
        documentContent = Buffer.from(arrayBuffer).toString('base64');
        isBase64 = true;
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                 file.type === 'application/msword') {
        // DOCX: Extract text with mammoth first, then send as text
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        documentContent = result.value;
        isBase64 = false;
      } else {
        // TXT/MD files: Decode from base64 and send as text content
        const text = await file.text();
        documentContent = text;
        isBase64 = false;
      }

      // Create messages for Claude based on content type
      let messages;
      if (isBase64 && file.type === 'application/pdf') {
        messages = [
          {
            role: 'user' as const,
            content: [
              {
                type: 'text' as const,
                text: `I need you to analyze this PDF document and extract competitor information.

Document name: ${file.name}

Please:
1. Extract and read the text content from this PDF
2. Identify any companies mentioned that could be competitors
3. Look for competitive analysis, market positioning, or company comparisons
4. Extract business context if available

Return a JSON response with:
{
  "businessContext": {
    "company": "company name if found",
    "industry": "industry if identified",
    "businessModel": "business model if described"
  },
  "competitors": [
    {
      "name": "Competitor Name",
      "description": "Why they're a competitor based on document context",
      "confidence": 0.8
    }
  ]
}`
              },
              {
                type: 'document' as const,
                source: {
                  type: 'base64' as const,
                  media_type: 'application/pdf' as const,
                  data: documentContent
                }
              }
            ]
          }
        ];
      } else {
        messages = [
          {
            role: 'user' as const,
            content: `I need you to analyze this document and extract competitor information.

Document name: ${file.name}
Document type: ${file.type}

Document content:
${documentContent}

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. This document may contain multiple competitor companies - FIND ALL OF THEM
2. Scan the ENTIRE document thoroughly, including:
   - Company names in tables, lists, charts, footnotes, appendices
   - Startup names, vendor names, partner companies
   - Any competitive analysis sections, market studies
   - Market positioning discussions, SWOT analyses
   - Company comparisons, benchmarks, or rankings
3. Do not limit your response - include EVERY competitor mentioned regardless of how many
4. Be comprehensive - some documents have 3 competitors, others have 15+
5. Extract business context if available

IMPORTANT: Return a complete JSON response with ALL competitors found (however many exist in the document):
{
  "businessContext": {
    "company": "company name if found",
    "industry": "industry if identified",
    "businessModel": "business model if described"
  },
  "competitors": [
    {
      "name": "Competitor Name",
      "description": "Why they're a competitor based on document context",
      "confidence": 0.8
    }
  ]
}`
          }
        ];
      }

      // Configure model and parameters based on accuracy mode
      const config = (await import('@/lib/config')).config;
      const modelConfig = {
            model: config.claude.model, // Use configured model
            maxTokens: 8192,
            temperature: 0.3,
            description: 'document processing'
          };

      console.log(`🎯 Using ${modelConfig.description} for ${file.name}`);

      const response = await claude.chat(messages, {
        maxTokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
        model: modelConfig.model,
      });

      if (response.success && response.data) {
        try {
          // Extract JSON from Claude's response (handle various formats)
          let jsonString = response.data;

          // First try: Look for JSON in code blocks
          const jsonMatch = jsonString.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
          if (jsonMatch) {
            jsonString = jsonMatch[1];
          } else {
            // Second try: Find the first { and try to find the matching closing }
            const startIndex = jsonString.indexOf('{');
            if (startIndex !== -1) {
              let braceCount = 0;
              let endIndex = startIndex;

              for (let i = startIndex; i < jsonString.length; i++) {
                if (jsonString[i] === '{') braceCount++;
                if (jsonString[i] === '}') braceCount--;
                if (braceCount === 0) {
                  endIndex = i;
                  break;
                }
              }

              if (braceCount === 0) {
                jsonString = jsonString.substring(startIndex, endIndex + 1);
              }
            }
          }

          const analysis = JSON.parse(jsonString);

          if (analysis.competitors && Array.isArray(analysis.competitors)) {
            for (const comp of analysis.competitors) {
              competitors.push({
                name: comp.name,
                website: `https://${comp.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`,
                description: comp.description || `Competitor identified in ${file.name}`,
                source: 'claude-analysis',
                confidence: comp.confidence || 0.7,
              });
            }
          }

          // Store business context for later use
          if (analysis.businessContext) {
            console.log('📊 Business context extracted:', analysis.businessContext);
          }

          // Multi-pass extraction only in economy mode (Accuracy mode relies on single powerful pass)
          if (accuracyMode === 'economy') {
            // Second-pass extraction to ensure we didn't miss any competitors
            const currentCount = analysis.competitors?.length || 0;
            if (currentCount > 0) {
            console.log(`🔍 First pass found ${currentCount} competitors, doing focused extraction to catch any missed ones...`);

            const existingNames = analysis.competitors?.map((c: { name: string }) => c.name.toLowerCase()) || [];
            const focusedPrompt = `
Please do a FOCUSED search through this document ONLY for competitor companies that were NOT already identified.

Already found competitors: ${existingNames.join(', ')}

Document content:
${documentContent}

INSTRUCTIONS:
1. Look for ANY additional company names not in the "already found" list above
2. Check for subtle references, abbreviations, or partial matches
3. Look in tables, charts, lists, appendices, footnotes
4. Include startups, vendors, partners mentioned as competitive threats
5. Be exhaustive - find however many competitors exist in the document

Return ONLY new competitors in JSON format:
{
  "competitors": [
    {
      "name": "New Competitor Name",
      "description": "Why they're a competitor",
      "confidence": 0.8
    }
  ]
}`;

            const secondResponse = await claude.chat([{
              role: 'user',
              content: focusedPrompt
            }], {
              maxTokens: 4000,
              temperature: 0.3,
              model: (await import('@/lib/config')).config.claude.model,
            });

            if (secondResponse.success && secondResponse.data) {
              try {
                let secondJsonString = secondResponse.data;

                // Extract JSON (same logic as before)
                const secondJsonMatch = secondJsonString.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
                if (secondJsonMatch) {
                  secondJsonString = secondJsonMatch[1];
                } else {
                  const startIndex = secondJsonString.indexOf('{');
                  if (startIndex !== -1) {
                    let braceCount = 0;
                    let endIndex = startIndex;

                    for (let i = startIndex; i < secondJsonString.length; i++) {
                      if (secondJsonString[i] === '{') braceCount++;
                      if (secondJsonString[i] === '}') braceCount--;
                      if (braceCount === 0) {
                        endIndex = i;
                        break;
                      }
                    }

                    if (braceCount === 0) {
                      secondJsonString = secondJsonString.substring(startIndex, endIndex + 1);
                    }
                  }
                }

                const secondAnalysis = JSON.parse(secondJsonString);

                if (secondAnalysis.competitors && Array.isArray(secondAnalysis.competitors)) {
                  console.log(`🎯 Second pass found ${secondAnalysis.competitors.length} additional competitors`);
                  for (const comp of secondAnalysis.competitors) {
                    // Avoid duplicates
                    const isDuplicate = competitors.some(existing =>
                      existing.name.toLowerCase() === comp.name.toLowerCase()
                    );

                    if (!isDuplicate) {
                      competitors.push({
                        name: comp.name,
                        website: `https://${comp.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`,
                        description: comp.description || `Additional competitor identified in ${file.name}`,
                        source: 'claude-analysis-focused',
                        confidence: comp.confidence || 0.7,
                      });
                    }
                  }
                }
              } catch (secondParseError) {
                console.warn('Failed to parse second-pass response:', secondParseError);
              }
            }

            // Third-pass extraction for maximum coverage - focus on subtle mentions
            const totalFound = competitors.filter(c => c.name).length;
            console.log(`💎 Running third pass to catch subtle competitor mentions (found ${totalFound} so far)...`);

            const allFoundNames = competitors.map(c => c.name.toLowerCase());
            const thirdPassPrompt = `
Please do a FINAL SWEEP through this document looking for ANY company names that could be competitors, focusing on:

ALREADY FOUND (do NOT repeat): ${allFoundNames.join(', ')}

Document content:
${documentContent}

LOOK FOR THESE SPECIFIC PATTERNS:
1. Abbreviated company names (e.g., "MSFT" for Microsoft, "GOOG" for Google)
2. Company names in parentheses or brackets
3. URLs or domain names mentioning companies
4. Ticker symbols or stock codes
5. Partial company names or informal references
6. Companies mentioned in image captions, chart legends
7. Vendor names in fine print or footer text
8. Partnership/integration mentions ("works with X", "integrates with Y")

Be EXTREMELY thorough - scan every sentence, table cell, footnote.

Return ANY additional companies in JSON format:
{
  "competitors": [
    {
      "name": "Company Name",
      "description": "Found as [abbreviation/reference/context]",
      "confidence": 0.6
    }
  ]
}`;

            const thirdResponse = await claude.chat([{
              role: 'user',
              content: thirdPassPrompt
            }], {
              maxTokens: 4000,
              temperature: 0.2,
              model: (await import('@/lib/config')).config.claude.model,
            });

            if (thirdResponse.success && thirdResponse.data) {
              try {
                let thirdJsonString = thirdResponse.data;

                // Extract JSON (same logic as before)
                const thirdJsonMatch = thirdJsonString.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
                if (thirdJsonMatch) {
                  thirdJsonString = thirdJsonMatch[1];
                } else {
                  const startIndex = thirdJsonString.indexOf('{');
                  if (startIndex !== -1) {
                    let braceCount = 0;
                    let endIndex = startIndex;

                    for (let i = startIndex; i < thirdJsonString.length; i++) {
                      if (thirdJsonString[i] === '{') braceCount++;
                      if (thirdJsonString[i] === '}') braceCount--;
                      if (braceCount === 0) {
                        endIndex = i;
                        break;
                      }
                    }

                    if (braceCount === 0) {
                      thirdJsonString = thirdJsonString.substring(startIndex, endIndex + 1);
                    }
                  }
                }

                const thirdAnalysis = JSON.parse(thirdJsonString);

                if (thirdAnalysis.competitors && Array.isArray(thirdAnalysis.competitors)) {
                  console.log(`🏆 Third pass found ${thirdAnalysis.competitors.length} additional competitors`);
                  for (const comp of thirdAnalysis.competitors) {
                    // Avoid duplicates
                    const isDuplicate = competitors.some(existing =>
                      existing.name.toLowerCase() === comp.name.toLowerCase()
                    );

                    if (!isDuplicate && comp.name && comp.name.length > 1) {
                      competitors.push({
                        name: comp.name,
                        website: `https://${comp.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`,
                        description: comp.description || `Subtle competitor reference found in ${file.name}`,
                        source: 'claude-analysis-thorough',
                        confidence: comp.confidence || 0.6,
                      });
                    }
                  }
                }
              } catch (thirdParseError) {
                console.warn('Failed to parse third-pass response:', thirdParseError);
              }
            }
            }
          } // End of economy mode multi-pass extraction

        } catch (parseError) {
          console.warn(`Failed to parse Claude response for ${file.name}:`, parseError);
          console.log('Full raw response length:', response.data?.length);
          console.log('Raw response:', response.data?.slice(0, 1000));
          console.log('Response data available:', !!response.data);
        }
      } else {
        console.warn(`Claude analysis failed for ${file.name}:`, response.error);
      }

    } catch (error) {
      console.warn(`Failed to process ${file.name} with Claude:`, error);
    }
  }

  // Remove duplicates and return
  const uniqueCompetitors = competitors.filter(
    (comp, index, self) =>
      index === self.findIndex(c => c.name.toLowerCase() === comp.name.toLowerCase())
  );

  console.log(`🤖 Claude extracted ${uniqueCompetitors.length} competitors from ${files.length} files`);
  return uniqueCompetitors.slice(0, 10);
}

export async function POST(request: NextRequest) {
  try {
    // Validate configuration
    validateConfig();

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const accuracyMode = formData.get('accuracyMode') as 'economy' | 'accuracy' || 'economy';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    console.log(`🤖 Processing ${files.length} documents with ${accuracyMode} mode...`);

    // Use Claude directly for document processing (more reliable than old engine)
    const claudeResult = await extractCompetitorsWithClaude(files, accuracyMode);

    if (claudeResult.length > 0) {
      console.log(`✅ Claude successfully extracted ${claudeResult.length} competitors`);

      return NextResponse.json({
        success: true,
        businessContext: {
          company: files[0].name.split('.')[0] || 'Your Company',
          industry: 'Extracted from documents',
          businessModel: 'Analyzed by Claude',
          valueProposition: 'Competitive intelligence extracted from uploaded documents',
          targetMarket: [],
          keyProducts: [],
          competitiveAdvantages: [],
          challenges: [],
          objectives: [],
        },
        suggestedCompetitors: claudeResult,
        documentAnalysis: {
          totalFiles: files.length,
          successfullyProcessed: files.length,
          businessModel: 'Analyzed by Claude',
          industry: 'Extracted from documents',
          products: [],
          targetMarket: [],
          swotAnalysis: {
            strengths: [],
            weaknesses: [],
            opportunities: [],
            threats: []
          },
          strategies: { marketing: [], product: [], sales: [], operational: [] },
          insights: [`Claude successfully extracted ${claudeResult.length} competitors from your documents`],
          confidence: 0.8,
          analysisDepth: 'detailed' as const,
          wordCount: 0,
        },
        processedAt: new Date().toISOString(),
        metadata: {
          documentTypes: {},
          researchPriorities: [],
          processingMethod: 'claude-direct',
        }
      });
    } else {
      console.warn('⚠️ Claude document processing returned no competitors');

      return NextResponse.json({
        success: true,
        businessContext: {
          company: files[0].name.split('.')[0] || 'Unknown Company',
          industry: 'Unknown Industry',
          businessModel: 'Unknown',
          valueProposition: 'Could not extract from documents',
          targetMarket: [],
          keyProducts: [],
          competitiveAdvantages: [],
          challenges: ['No competitors found in documents'],
          objectives: [],
        },
        suggestedCompetitors: [],
        documentAnalysis: {
          totalFiles: files.length,
          successfullyProcessed: 0,
          businessModel: 'Unknown',
          industry: 'Unknown Industry',
          products: [],
          targetMarket: [],
          swotAnalysis: {
            strengths: [],
            weaknesses: ['No competitive information found in documents'],
            opportunities: [],
            threats: []
          },
          strategies: { marketing: [], product: [], sales: [], operational: [] },
          insights: ['No competitors found in the uploaded documents'],
          confidence: 0.2,
          analysisDepth: 'surface' as const,
          wordCount: 0,
        },
        processedAt: new Date().toISOString(),
        warning: 'No competitors were found in your documents. You can add competitors manually below.',
      });
    }

  } catch (error) {
    console.error('Document processing error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Document processing failed',
        details: 'Failed to extract business context from uploaded documents'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'Document Processing',
    description: 'Processes uploaded documents to extract business context and suggest competitors',
    methods: ['POST'],
    parameters: {
      files: 'FormData with uploaded files'
    }
  });
}