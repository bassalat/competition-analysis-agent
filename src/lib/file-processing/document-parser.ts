/**
 * Document parsing and structuring utilities
 */

import { ExtractedText } from './text-extractor';

export interface DocumentSection {
  title: string;
  content: string;
  level: number;
  startIndex: number;
  endIndex: number;
  wordCount: number;
}

export interface ParsedDocument {
  fileName: string;
  fileType: string;
  title?: string;
  sections: DocumentSection[];
  metadata: {
    totalSections: number;
    averageSectionLength: number;
    hasStructure: boolean;
    detectedLanguage?: string;
    keywords: string[];
    entities: string[];
    topics: string[];
  };
  rawContent: string;
  structuredContent: string;
}

export interface DocumentInsights {
  documentType: 'pitch_deck' | 'financial_report' | 'marketing_plan' | 'product_spec' | 'business_plan' | 'presentation' | 'report' | 'memo' | 'other';
  confidence: number;
  keyFindings: string[];
  businessContext: {
    companyName?: string;
    industry?: string;
    products?: string[];
    competitors?: string[];
    marketSegments?: string[];
    financialMetrics?: string[];
    strategicGoals?: string[];
  };
  extractedData: {
    dates: string[];
    numbers: string[];
    urls: string[];
    emails: string[];
    phoneNumbers: string[];
    addresses: string[];
  };
}

/**
 * Extract document title from content
 */
function extractTitle(content: string, fileName: string): string {
  const lines = content.split('\n').filter(line => line.trim().length > 0);

  // Try to find a title in the first few lines
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();

    // Skip very short lines or lines with mostly special characters
    if (line.length < 10 || line.match(/^[^a-zA-Z]*$/)) {
      continue;
    }

    // Look for title-like patterns
    if (
      line.length < 100 && // Not too long
      !line.includes('.') && // No sentences
      (line.toUpperCase() === line || // All caps
        line.split(' ').every(word => word[0]?.toUpperCase() === word[0])) // Title case
    ) {
      return line;
    }
  }

  // Fall back to first substantial line
  const firstLine = lines.find(line => line.length > 10 && line.length < 100);
  if (firstLine) {
    return firstLine;
  }

  // Fall back to filename
  return fileName.replace(/\.[^.]+$/, '');
}

/**
 * Parse document into sections
 */
function parseIntoSections(content: string): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const lines = content.split('\n');

  let currentSection: DocumentSection | null = null;
  let currentContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      if (currentContent.length > 0) {
        currentContent.push('');
      }
      continue;
    }

    // Detect section headers
    const headerLevel = detectHeaderLevel(line, trimmedLine);

    if (headerLevel > 0) {
      // Save previous section
      if (currentSection && currentContent.length > 0) {
        currentSection.content = currentContent.join('\n').trim();
        currentSection.endIndex = content.indexOf(line);
        currentSection.wordCount = currentSection.content.split(/\s+/).filter(w => w.length > 0).length;
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        title: trimmedLine.replace(/^#+\s*/, '').replace(/[\*\-\=\#]+/g, '').trim(),
        content: '',
        level: headerLevel,
        startIndex: content.indexOf(line),
        endIndex: 0,
        wordCount: 0,
      };
      currentContent = [];
    } else {
      // Add to current section content
      currentContent.push(line);
    }
  }

  // Add final section
  if (currentSection && currentContent.length > 0) {
    currentSection.content = currentContent.join('\n').trim();
    currentSection.endIndex = content.length;
    currentSection.wordCount = currentSection.content.split(/\s+/).filter(w => w.length > 0).length;
    sections.push(currentSection);
  }

  // If no sections were found, create a single section
  if (sections.length === 0) {
    sections.push({
      title: 'Document Content',
      content: content.trim(),
      level: 1,
      startIndex: 0,
      endIndex: content.length,
      wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
    });
  }

  return sections;
}

/**
 * Detect header level from line formatting
 */
function detectHeaderLevel(line: string, trimmedLine: string): number {
  // Markdown-style headers
  if (trimmedLine.match(/^#+\s/)) {
    const level = (trimmedLine.match(/^#+/) || [''])[0].length;
    return Math.min(level, 6);
  }

  // Underlined headers
  if (trimmedLine.length > 0 && (line.endsWith('===') || line.endsWith('---'))) {
    return 1;
  }

  // ALL CAPS short lines (likely headers)
  if (
    trimmedLine.length > 3 &&
    trimmedLine.length < 80 &&
    trimmedLine === trimmedLine.toUpperCase() &&
    trimmedLine.match(/^[A-Z0-9\s\-\:\(\)]+$/)
  ) {
    return 2;
  }

  // Numbered sections
  if (trimmedLine.match(/^\d+[\.\)]\s+[A-Z]/)) {
    return 3;
  }

  // Bulleted headers
  if (trimmedLine.match(/^[\*\-\+]\s+[A-Z]/) && trimmedLine.length < 80) {
    return 4;
  }

  return 0;
}

/**
 * Extract keywords from content
 */
function extractKeywords(content: string, maxKeywords: number = 20): string[] {
  // Simple keyword extraction - can be enhanced with NLP libraries
  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !isStopWord(word));

  // Count word frequency
  const wordCount = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sort by frequency and return top keywords
  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Check if word is a stop word
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'will', 'would',
    'should', 'could', 'can', 'may', 'might', 'must', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'his', 'hers',
    'ours', 'theirs', 'from', 'into', 'onto', 'upon', 'over', 'under', 'above', 'below'
  ]);

  return stopWords.has(word.toLowerCase());
}

/**
 * Extract entities (names, places, etc.)
 */
function extractEntities(content: string): string[] {
  const entities: string[] = [];

  // Extract capitalized words/phrases (potential entities)
  const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const matches = content.match(capitalizedPattern) || [];

  matches.forEach(match => {
    // Filter out common words that aren't entities
    if (
      match.length > 2 &&
      !isStopWord(match) &&
      !match.match(/^(The|This|That|These|Those|And|Or|But)$/)
    ) {
      entities.push(match);
    }
  });

  // Deduplicate and return top entities
  const uniqueEntities = [...new Set(entities)];
  return uniqueEntities.slice(0, 15);
}

/**
 * Extract structured data patterns
 */
function extractDataPatterns(content: string) {
  return {
    dates: extractDates(content),
    numbers: extractNumbers(content),
    urls: extractUrls(content),
    emails: extractEmails(content),
    phoneNumbers: extractPhoneNumbers(content),
    addresses: extractAddresses(content),
  };
}

function extractDates(content: string): string[] {
  const datePatterns = [
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, // MM/DD/YYYY
    /\b\d{4}-\d{1,2}-\d{1,2}\b/g,   // YYYY-MM-DD
    /\b\d{1,2}-\d{1,2}-\d{4}\b/g,   // MM-DD-YYYY
    /\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\b/g, // Month DD, YYYY
  ];

  const dates: string[] = [];
  datePatterns.forEach(pattern => {
    const matches = content.match(pattern) || [];
    dates.push(...matches);
  });

  return [...new Set(dates)].slice(0, 10);
}

function extractNumbers(content: string): string[] {
  const numberPatterns = [
    /\$[\d,]+(?:\.\d{2})?/g, // Currency
    /\b\d+(?:\.\d+)?%/g,     // Percentages
    /\b\d{1,3}(?:,\d{3})*\b/g, // Large numbers with commas
  ];

  const numbers: string[] = [];
  numberPatterns.forEach(pattern => {
    const matches = content.match(pattern) || [];
    numbers.push(...matches);
  });

  return [...new Set(numbers)].slice(0, 15);
}

function extractUrls(content: string): string[] {
  const urlPattern = /https?:\/\/[^\s]+/g;
  const matches = content.match(urlPattern) || [];
  return [...new Set(matches)].slice(0, 10);
}

function extractEmails(content: string): string[] {
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = content.match(emailPattern) || [];
  return [...new Set(matches)].slice(0, 10);
}

function extractPhoneNumbers(content: string): string[] {
  const phonePattern = /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g;
  const matches = content.match(phonePattern) || [];
  return [...new Set(matches)].slice(0, 5);
}

function extractAddresses(content: string): string[] {
  // Simple address detection - can be enhanced
  const addressPattern = /\d+\s+[A-Za-z0-9\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b[^.]*(?:[A-Z]{2}\s+\d{5})?/gi;
  const matches = content.match(addressPattern) || [];
  return [...new Set(matches)].slice(0, 5);
}

/**
 * Detect document type based on content patterns
 */
function detectDocumentType(content: string, sections: DocumentSection[]): { type: DocumentInsights['documentType'], confidence: number } {
  const lowerContent = content.toLowerCase();
  const sectionTitles = sections.map(s => s.title.toLowerCase()).join(' ');

  // Pattern scoring
  const patterns = {
    pitch_deck: [
      /\b(?:pitch|funding|investment|round|valuation|equity)\b/g,
      /\b(?:problem|solution|market|traction|competition)\b/g,
      /\b(?:slides?|presentation|deck)\b/g,
    ],
    financial_report: [
      /\b(?:revenue|profit|loss|earnings|financial|quarterly|annual)\b/g,
      /\b(?:balance sheet|income statement|cash flow)\b/g,
      /\b(?:assets|liabilities|equity|ebitda)\b/g,
    ],
    marketing_plan: [
      /\b(?:marketing|campaign|strategy|brand|advertising)\b/g,
      /\b(?:target audience|customer|segment|persona)\b/g,
      /\b(?:social media|content|seo|digital)\b/g,
    ],
    product_spec: [
      /\b(?:requirements|specifications|features|functionality)\b/g,
      /\b(?:user story|acceptance criteria|api|interface)\b/g,
      /\b(?:technical|architecture|design|implementation)\b/g,
    ],
    business_plan: [
      /\b(?:business plan|strategy|market analysis|competitive)\b/g,
      /\b(?:executive summary|mission|vision|goals)\b/g,
      /\b(?:operations|management|team|organization)\b/g,
    ],
  };

  let bestType: DocumentInsights['documentType'] = 'other';
  let bestScore = 0;

  Object.entries(patterns).forEach(([type, typePatterns]) => {
    let score = 0;

    typePatterns.forEach(pattern => {
      const matches = (lowerContent + ' ' + sectionTitles).match(pattern) || [];
      score += matches.length;
    });

    if (score > bestScore) {
      bestScore = score;
      bestType = type as DocumentInsights['documentType'];
    }
  });

  // Calculate confidence based on matches
  const totalWords = content.split(/\s+/).length;
  const confidence = Math.min(bestScore / Math.max(totalWords / 100, 1), 1);

  return { type: bestType, confidence };
}

/**
 * Parse document content into structured format
 */
export function parseDocument(extractedText: ExtractedText): ParsedDocument {
  const { content, metadata } = extractedText;

  const title = extractTitle(content, metadata.fileName);
  const sections = parseIntoSections(content);
  const keywords = extractKeywords(content);
  const entities = extractEntities(content);

  // Generate topics from keywords and section titles
  const topics = [
    ...keywords.slice(0, 10),
    ...sections.map(s => s.title).filter(t => t.length < 50)
  ].slice(0, 15);

  const structuredContent = sections
    .map(section => `## ${section.title}\n${section.content}`)
    .join('\n\n');

  return {
    fileName: metadata.fileName,
    fileType: metadata.fileType,
    title,
    sections,
    metadata: {
      totalSections: sections.length,
      averageSectionLength: sections.reduce((sum, s) => sum + s.wordCount, 0) / sections.length,
      hasStructure: sections.length > 1,
      keywords,
      entities,
      topics,
    },
    rawContent: content,
    structuredContent,
  };
}

/**
 * Generate insights from parsed document
 */
export function generateDocumentInsights(parsedDoc: ParsedDocument): DocumentInsights {
  const { type, confidence } = detectDocumentType(parsedDoc.rawContent, parsedDoc.sections);

  const extractedData = extractDataPatterns(parsedDoc.rawContent);

  // Extract business context
  const businessContext: DocumentInsights['businessContext'] = {
    companyName: extractCompanyName(parsedDoc.rawContent),
    industry: extractIndustry(parsedDoc.rawContent),
    products: extractProducts(parsedDoc.rawContent),
    competitors: extractCompetitors(parsedDoc.rawContent),
    marketSegments: extractMarketSegments(parsedDoc.rawContent),
    financialMetrics: extractedData.numbers.filter(n => n.includes('$') || n.includes('%')),
    strategicGoals: extractStrategicGoals(parsedDoc.sections),
  };

  const keyFindings = generateKeyFindings(parsedDoc, type);

  return {
    documentType: type,
    confidence,
    keyFindings,
    businessContext,
    extractedData,
  };
}

function extractCompanyName(content: string): string | undefined {
  // Simple heuristic - look for capitalized phrases that might be company names
  const patterns = [
    /\b([A-Z][a-z]+ Inc\.?)\b/,
    /\b([A-Z][a-z]+ Corp\.?)\b/,
    /\b([A-Z][a-z]+ LLC)\b/,
    /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:company|corporation|business)\b/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) return match[1];
  }

  return undefined;
}

function extractIndustry(content: string): string | undefined {
  const industries = [
    'technology', 'software', 'fintech', 'healthcare', 'education', 'ecommerce',
    'manufacturing', 'retail', 'consulting', 'marketing', 'real estate', 'finance',
    'media', 'entertainment', 'automotive', 'energy', 'agriculture', 'biotechnology'
  ];

  const lowerContent = content.toLowerCase();
  const foundIndustry = industries.find(industry =>
    lowerContent.includes(industry) || lowerContent.includes(industry + ' industry')
  );

  return foundIndustry;
}

function extractProducts(content: string): string[] {
  const productKeywords = ['product', 'service', 'solution', 'platform', 'application', 'software'];
  const products: string[] = [];

  productKeywords.forEach(keyword => {
    const pattern = new RegExp(`\\b(?:our |the )?${keyword}[^.]*`, 'gi');
    const matches = content.match(pattern) || [];
    products.push(...matches.slice(0, 3));
  });

  return products.slice(0, 5);
}

function extractCompetitors(content: string): string[] {
  const competitorPatterns = [
    /\b(?:competitors?|competing|vs\.?|versus)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:competitor|competition)\b/gi,
  ];

  const competitors: string[] = [];
  competitorPatterns.forEach(pattern => {
    const matches = [...content.matchAll(pattern)];
    competitors.push(...matches.map(match => match[1]));
  });

  return [...new Set(competitors)].slice(0, 10);
}

function extractMarketSegments(content: string): string[] {
  const segmentPatterns = [
    /\b(?:target|customer|market)\s+(?:segment|audience|group)[^.]*\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+market\b/gi,
  ];

  const segments: string[] = [];
  segmentPatterns.forEach(pattern => {
    const matches = [...content.matchAll(pattern)];
    segments.push(...matches.map(match => match[1] || match[0]));
  });

  return [...new Set(segments)].slice(0, 5);
}

function extractStrategicGoals(sections: DocumentSection[]): string[] {
  const goalKeywords = ['goal', 'objective', 'target', 'strategy', 'plan', 'vision', 'mission'];
  const goals: string[] = [];

  sections.forEach(section => {
    const hasGoalKeyword = goalKeywords.some(keyword =>
      section.title.toLowerCase().includes(keyword) ||
      section.content.toLowerCase().includes(keyword)
    );

    if (hasGoalKeyword) {
      // Extract sentences that might contain goals
      const sentences = section.content.split(/[.!?]+/).filter(s => s.trim().length > 20);
      goals.push(...sentences.slice(0, 2));
    }
  });

  return goals.slice(0, 5);
}

function generateKeyFindings(parsedDoc: ParsedDocument, docType: DocumentInsights['documentType']): string[] {
  const findings: string[] = [];

  // Add document structure findings
  findings.push(`Document contains ${parsedDoc.sections.length} sections with ${parsedDoc.metadata.keywords.length} key topics`);

  // Add type-specific findings
  switch (docType) {
    case 'pitch_deck':
      findings.push('Appears to be a pitch deck or investment presentation');
      break;
    case 'financial_report':
      findings.push('Contains financial data and performance metrics');
      break;
    case 'marketing_plan':
      findings.push('Focuses on marketing strategy and customer segments');
      break;
    case 'product_spec':
      findings.push('Contains technical specifications and requirements');
      break;
    case 'business_plan':
      findings.push('Comprehensive business planning document');
      break;
  }

  // Add content findings
  if (parsedDoc.metadata.entities.length > 0) {
    findings.push(`References key entities: ${parsedDoc.metadata.entities.slice(0, 3).join(', ')}`);
  }

  if (parsedDoc.metadata.keywords.length > 0) {
    findings.push(`Main topics include: ${parsedDoc.metadata.keywords.slice(0, 5).join(', ')}`);
  }

  return findings.slice(0, 10);
}

/**
 * Parse multiple documents
 */
export function parseDocuments(extractedTexts: ExtractedText[]): ParsedDocument[] {
  return extractedTexts
    .filter(text => text.success && text.content.length > 0)
    .map(text => parseDocument(text));
}

/**
 * Generate comprehensive insights from all documents
 */
export function generateComprehensiveInsights(parsedDocs: ParsedDocument[]): {
  documentSummary: {
    totalDocuments: number;
    documentTypes: Record<string, number>;
    totalSections: number;
    totalKeywords: number;
  };
  consolidatedBusinessContext: DocumentInsights['businessContext'];
  allKeyFindings: string[];
  commonThemes: string[];
  extractedData: DocumentInsights['extractedData'];
} {
  const insights = parsedDocs.map(doc => generateDocumentInsights(doc));

  // Count document types
  const documentTypes = insights.reduce((acc, insight) => {
    acc[insight.documentType] = (acc[insight.documentType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Consolidate business context
  const consolidatedBusinessContext: DocumentInsights['businessContext'] = {
    companyName: insights.find(i => i.businessContext.companyName)?.businessContext.companyName,
    industry: insights.find(i => i.businessContext.industry)?.businessContext.industry,
    products: [...new Set(insights.flatMap(i => i.businessContext.products || []))],
    competitors: [...new Set(insights.flatMap(i => i.businessContext.competitors || []))],
    marketSegments: [...new Set(insights.flatMap(i => i.businessContext.marketSegments || []))],
    financialMetrics: [...new Set(insights.flatMap(i => i.businessContext.financialMetrics || []))],
    strategicGoals: [...new Set(insights.flatMap(i => i.businessContext.strategicGoals || []))],
  };

  // Collect all findings
  const allKeyFindings = insights.flatMap(i => i.keyFindings);

  // Find common themes
  const allKeywords = parsedDocs.flatMap(doc => doc.metadata.keywords);
  const keywordCounts = allKeywords.reduce((acc, keyword) => {
    acc[keyword] = (acc[keyword] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const commonThemes = Object.entries(keywordCounts)
    .filter(([, count]) => count > 1)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([keyword]) => keyword);

  // Consolidate extracted data
  const extractedData: DocumentInsights['extractedData'] = {
    dates: [...new Set(insights.flatMap(i => i.extractedData.dates))],
    numbers: [...new Set(insights.flatMap(i => i.extractedData.numbers))],
    urls: [...new Set(insights.flatMap(i => i.extractedData.urls))],
    emails: [...new Set(insights.flatMap(i => i.extractedData.emails))],
    phoneNumbers: [...new Set(insights.flatMap(i => i.extractedData.phoneNumbers))],
    addresses: [...new Set(insights.flatMap(i => i.extractedData.addresses))],
  };

  return {
    documentSummary: {
      totalDocuments: parsedDocs.length,
      documentTypes,
      totalSections: parsedDocs.reduce((sum, doc) => sum + doc.sections.length, 0),
      totalKeywords: allKeywords.length,
    },
    consolidatedBusinessContext,
    allKeyFindings,
    commonThemes,
    extractedData,
  };
}