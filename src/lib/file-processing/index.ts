/**
 * File Processing Utilities - Centralized exports
 */

// Text extraction exports
export {
  extractTextFromFile,
  extractTextFromFiles,
  getExtractionSummary,
  getFileType,
  isSupportedFileType,
  isValidFileSize,
  validateFile as validateFileForExtraction,
  SUPPORTED_FILE_TYPES,
  MAX_FILE_SIZES,
} from './text-extractor';

export type {
  ExtractedText,
  FileInfo,
} from './text-extractor';

// Document parsing exports
export {
  parseDocument,
  parseDocuments,
  generateDocumentInsights,
  generateComprehensiveInsights,
} from './document-parser';

export type {
  DocumentSection,
  ParsedDocument,
  DocumentInsights,
} from './document-parser';

// File validation exports
export {
  validateFile,
  validateFiles,
  scanFileContent,
  isSafeFileType,
  getValidationSummary,
  createValidationReport,
  DEFAULT_VALIDATION_OPTIONS,
} from './file-validator';

// Import for internal use
import { validateFile as validateFileInternal } from './file-validator';
import { getFileType, extractTextFromFile } from './text-extractor';
import { parseDocument, generateDocumentInsights, generateComprehensiveInsights } from './document-parser';

// Import types for internal use
import type { ValidationResult, FileValidationOptions } from './file-validator';
import type { ExtractedText } from './text-extractor';
import type { ParsedDocument, DocumentInsights } from './document-parser';

export type {
  ValidationResult,
  FileValidationOptions,
} from './file-validator';



// Combined processing function for convenience
export interface FileProcessingResult {
  validation: ValidationResult;
  extraction: ExtractedText;
  parsed: ParsedDocument;
  insights: DocumentInsights;
}

/**
 * Process a single file through the complete pipeline
 */
export async function processFile(
  file: File,
  validationOptions?: Partial<FileValidationOptions>
): Promise<FileProcessingResult> {
  // Step 1: Validate file
  const validation = validateFileInternal(file, validationOptions);

  // Initialize result with validation
  const result: FileProcessingResult = {
    validation,
    extraction: {
      content: '',
      metadata: {
        wordCount: 0,
        characterCount: 0,
        fileName: file.name,
        fileType: getFileType(file.type, file.name),
        fileSize: file.size,
        extractedAt: new Date().toISOString(),
      },
      success: false,
    },
    parsed: {} as ParsedDocument,
    insights: {} as DocumentInsights,
  };

  // If validation fails, return early
  if (!validation.isValid) {
    return result;
  }

  try {
    // Step 2: Extract text
    result.extraction = await extractTextFromFile(file);

    // If extraction fails, return with extraction result
    if (!result.extraction.success) {
      return result;
    }

    // Step 3: Parse document
    result.parsed = parseDocument(result.extraction);

    // Step 4: Generate insights
    result.insights = generateDocumentInsights(result.parsed);

    return result;
  } catch (error) {
    result.extraction.error = error instanceof Error ? error.message : 'Processing failed';
    return result;
  }
}

/**
 * Process multiple files through the complete pipeline
 */
export async function processFiles(
  files: File[],
  validationOptions?: Partial<FileValidationOptions>
): Promise<{
  results: FileProcessingResult[];
  summary: {
    totalFiles: number;
    successfullyProcessed: number;
    validationFailures: number;
    extractionFailures: number;
    overallSuccess: boolean;
  };
  consolidatedInsights?: ReturnType<typeof generateComprehensiveInsights>;
}> {
  if (!files || files.length === 0) {
    return {
      results: [],
      summary: {
        totalFiles: 0,
        successfullyProcessed: 0,
        validationFailures: 0,
        extractionFailures: 0,
        overallSuccess: false,
      },
    };
  }

  // Process all files
  const results = await Promise.all(
    files.map(file => processFile(file, validationOptions))
  );

  // Calculate summary
  const totalFiles = results.length;
  const validationFailures = results.filter(r => !r.validation.isValid).length;
  const extractionFailures = results.filter(r => r.validation.isValid && !r.extraction.success).length;
  const successfullyProcessed = results.filter(r => r.validation.isValid && r.extraction.success).length;

  const summary = {
    totalFiles,
    successfullyProcessed,
    validationFailures,
    extractionFailures,
    overallSuccess: successfullyProcessed > 0,
  };

  // Generate consolidated insights for successful files
  let consolidatedInsights;
  const successfulParsedDocs = results
    .filter(r => r.validation.isValid && r.extraction.success && r.parsed)
    .map(r => r.parsed);

  if (successfulParsedDocs.length > 0) {
    consolidatedInsights = generateComprehensiveInsights(successfulParsedDocs);
  }

  return {
    results,
    summary,
    consolidatedInsights,
  };
}

/**
 * Extract business context from processed files
 */
export function extractBusinessContextFromFiles(results: FileProcessingResult[]): {
  companyName?: string;
  industry?: string;
  products: string[];
  competitors: string[];
  marketSegments: string[];
  strategicGoals: string[];
  financialMetrics: string[];
  keyTopics: string[];
  documentTypes: Record<string, number>;
} {
  const successfulResults = results.filter(r => r.validation.isValid && r.extraction.success);

  if (successfulResults.length === 0) {
    return {
      products: [],
      competitors: [],
      marketSegments: [],
      strategicGoals: [],
      financialMetrics: [],
      keyTopics: [],
      documentTypes: {},
    };
  }

  const insights = successfulResults.map(r => r.insights);
  const parsed = successfulResults.map(r => r.parsed);

  // Find most common company name
  const companyNames = insights
    .map(i => i.businessContext.companyName)
    .filter(Boolean) as string[];
  const companyName = companyNames.length > 0 ?
    companyNames.reduce((acc, name) => {
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) : {};

  const mostCommonCompany = Object.entries(companyName)
    .sort(([, a], [, b]) => b - a)[0]?.[0];

  // Find most common industry
  const industries = insights
    .map(i => i.businessContext.industry)
    .filter(Boolean) as string[];
  const industryCount = industries.reduce((acc, industry) => {
    acc[industry] = (acc[industry] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostCommonIndustry = Object.entries(industryCount)
    .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0];

  // Aggregate data from all documents
  const products = [...new Set(insights.flatMap(i => i.businessContext.products || []))];
  const competitors = [...new Set(insights.flatMap(i => i.businessContext.competitors || []))];
  const marketSegments = [...new Set(insights.flatMap(i => i.businessContext.marketSegments || []))];
  const strategicGoals = [...new Set(insights.flatMap(i => i.businessContext.strategicGoals || []))];
  const financialMetrics = [...new Set(insights.flatMap(i => i.businessContext.financialMetrics || []))];

  // Get key topics from all documents
  const allKeywords = parsed.flatMap(p => p.metadata.keywords);
  const keywordCounts = allKeywords.reduce((acc, keyword) => {
    acc[keyword] = (acc[keyword] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const keyTopics = Object.entries(keywordCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 20)
    .map(([keyword]) => keyword);

  // Document type distribution
  const documentTypes = insights.reduce((acc, insight) => {
    acc[insight.documentType] = (acc[insight.documentType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    companyName: mostCommonCompany,
    industry: mostCommonIndustry,
    products,
    competitors,
    marketSegments,
    strategicGoals,
    financialMetrics,
    keyTopics,
    documentTypes,
  };
}

/**
 * Generate processing report
 */
export function generateProcessingReport(
  results: FileProcessingResult[],
  summary: {
    totalFiles: number;
    successfullyProcessed: number;
    validationFailures: number;
    extractionFailures: number;
    overallSuccess: boolean;
  }
): string {
  let report = 'File Processing Report\n';
  report += '=====================\n\n';

  report += `Summary:\n`;
  report += `- Total files: ${summary.totalFiles}\n`;
  report += `- Successfully processed: ${summary.successfullyProcessed}\n`;
  report += `- Validation failures: ${summary.validationFailures}\n`;
  report += `- Extraction failures: ${summary.extractionFailures}\n`;
  report += `- Overall success: ${summary.overallSuccess ? 'Yes' : 'No'}\n\n`;

  if (summary.successfullyProcessed > 0) {
    const businessContext = extractBusinessContextFromFiles(results);

    report += `Business Context:\n`;
    if (businessContext.companyName) {
      report += `- Company: ${businessContext.companyName}\n`;
    }
    if (businessContext.industry) {
      report += `- Industry: ${businessContext.industry}\n`;
    }
    if (businessContext.products.length > 0) {
      report += `- Products: ${businessContext.products.slice(0, 5).join(', ')}\n`;
    }
    if (businessContext.competitors.length > 0) {
      report += `- Competitors: ${businessContext.competitors.slice(0, 5).join(', ')}\n`;
    }
    if (businessContext.keyTopics.length > 0) {
      report += `- Key topics: ${businessContext.keyTopics.slice(0, 10).join(', ')}\n`;
    }
    report += '\n';
  }

  report += 'File Details:\n';
  report += '=============\n';

  results.forEach((result, index) => {
    const file = result.extraction.metadata;
    report += `\n${index + 1}. ${file.fileName} (${file.fileType}, ${(file.fileSize / 1024).toFixed(1)} KB)\n`;

    if (result.validation.isValid) {
      if (result.extraction.success) {
        report += `   ✓ Processed successfully\n`;
        report += `   - ${file.wordCount} words, ${result.parsed.sections?.length || 0} sections\n`;
        if (result.insights.documentType !== 'other') {
          report += `   - Document type: ${result.insights.documentType}\n`;
        }
      } else {
        report += `   ✗ Extraction failed: ${result.extraction.error}\n`;
      }
    } else {
      report += `   ✗ Validation failed: ${result.validation.errors.join(', ')}\n`;
    }
  });

  return report;
}