/**
 * Text extraction utilities for various file formats
 */

import * as mammoth from 'mammoth';

export interface ExtractedText {
  content: string;
  metadata: {
    pageCount?: number;
    wordCount: number;
    characterCount: number;
    fileName: string;
    fileType: string;
    fileSize: number;
    extractedAt: string;
    language?: string;
  };
  success: boolean;
  error?: string;
}

export interface FileInfo {
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

/**
 * Supported file types for text extraction
 */
export const SUPPORTED_FILE_TYPES = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  DOC: 'application/msword',
  TXT: 'text/plain',
  RTF: 'application/rtf',
  HTML: 'text/html',
  CSV: 'text/csv',
  JSON: 'application/json',
} as const;

/**
 * Maximum file size limits (in bytes)
 */
export const MAX_FILE_SIZES = {
  PDF: 50 * 1024 * 1024, // 50MB
  DOCX: 20 * 1024 * 1024, // 20MB
  DOC: 20 * 1024 * 1024, // 20MB
  TXT: 10 * 1024 * 1024, // 10MB
  RTF: 10 * 1024 * 1024, // 10MB
  HTML: 5 * 1024 * 1024, // 5MB
  CSV: 10 * 1024 * 1024, // 10MB
  JSON: 5 * 1024 * 1024, // 5MB
} as const;

/**
 * Extract text from PDF files
 */
async function extractFromPDF(buffer: Buffer, fileName: string, fileSize: number): Promise<ExtractedText> {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);

    return {
      content: data.text,
      metadata: {
        pageCount: data.numpages,
        wordCount: data.text.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: data.text.length,
        fileName,
        fileType: 'PDF',
        fileSize,
        extractedAt: new Date().toISOString(),
      },
      success: true,
    };
  } catch (error) {
    return {
      content: '',
      metadata: {
        wordCount: 0,
        characterCount: 0,
        fileName,
        fileType: 'PDF',
        fileSize,
        extractedAt: new Date().toISOString(),
      },
      success: false,
      error: `PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract text from DOCX files
 */
async function extractFromDOCX(buffer: Buffer, fileName: string, fileSize: number): Promise<ExtractedText> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const content = result.value;

    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: content.length,
        fileName,
        fileType: 'DOCX',
        fileSize,
        extractedAt: new Date().toISOString(),
      },
      success: true,
    };
  } catch (error) {
    return {
      content: '',
      metadata: {
        wordCount: 0,
        characterCount: 0,
        fileName,
        fileType: 'DOCX',
        fileSize,
        extractedAt: new Date().toISOString(),
      },
      success: false,
      error: `DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract text from plain text files
 */
async function extractFromText(buffer: Buffer, fileName: string, fileSize: number, fileType: string): Promise<ExtractedText> {
  try {
    const content = buffer.toString('utf-8');

    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: content.length,
        fileName,
        fileType: fileType.toUpperCase(),
        fileSize,
        extractedAt: new Date().toISOString(),
      },
      success: true,
    };
  } catch (error) {
    return {
      content: '',
      metadata: {
        wordCount: 0,
        characterCount: 0,
        fileName,
        fileType: fileType.toUpperCase(),
        fileSize,
        extractedAt: new Date().toISOString(),
      },
      success: false,
      error: `Text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract text from HTML files
 */
async function extractFromHTML(buffer: Buffer, fileName: string, fileSize: number): Promise<ExtractedText> {
  try {
    const html = buffer.toString('utf-8');

    // Simple HTML to text conversion (remove tags)
    const content = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
      .replace(/<[^>]*>/g, ' ') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp;
      .replace(/&amp;/g, '&') // Replace &amp;
      .replace(/&lt;/g, '<') // Replace &lt;
      .replace(/&gt;/g, '>') // Replace &gt;
      .replace(/&quot;/g, '"') // Replace &quot;
      .replace(/&#39;/g, "'") // Replace &#39;
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: content.length,
        fileName,
        fileType: 'HTML',
        fileSize,
        extractedAt: new Date().toISOString(),
      },
      success: true,
    };
  } catch (error) {
    return {
      content: '',
      metadata: {
        wordCount: 0,
        characterCount: 0,
        fileName,
        fileType: 'HTML',
        fileSize,
        extractedAt: new Date().toISOString(),
      },
      success: false,
      error: `HTML extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract text from JSON files
 */
async function extractFromJSON(buffer: Buffer, fileName: string, fileSize: number): Promise<ExtractedText> {
  try {
    const jsonString = buffer.toString('utf-8');
    const jsonData = JSON.parse(jsonString);

    // Convert JSON to readable text
    const content = JSON.stringify(jsonData, null, 2);

    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: content.length,
        fileName,
        fileType: 'JSON',
        fileSize,
        extractedAt: new Date().toISOString(),
      },
      success: true,
    };
  } catch (error) {
    return {
      content: '',
      metadata: {
        wordCount: 0,
        characterCount: 0,
        fileName,
        fileType: 'JSON',
        fileSize,
        extractedAt: new Date().toISOString(),
      },
      success: false,
      error: `JSON extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Determine file type from MIME type or file extension
 */
export function getFileType(mimeType: string, fileName: string): string {
  // First try MIME type
  const mimeToType: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/msword': 'DOC',
    'text/plain': 'TXT',
    'application/rtf': 'RTF',
    'text/html': 'HTML',
    'text/csv': 'CSV',
    'application/json': 'JSON',
  };

  if (mimeToType[mimeType]) {
    return mimeToType[mimeType];
  }

  // Fall back to file extension
  const extension = fileName.toLowerCase().split('.').pop();
  const extensionToType: Record<string, string> = {
    'pdf': 'PDF',
    'docx': 'DOCX',
    'doc': 'DOC',
    'txt': 'TXT',
    'rtf': 'RTF',
    'html': 'HTML',
    'htm': 'HTML',
    'csv': 'CSV',
    'json': 'JSON',
  };

  return extensionToType[extension || ''] || 'UNKNOWN';
}

/**
 * Check if file type is supported
 */
export function isSupportedFileType(mimeType: string, fileName: string): boolean {
  const fileType = getFileType(mimeType, fileName);
  return Object.keys(MAX_FILE_SIZES).includes(fileType);
}

/**
 * Check if file size is within limits
 */
export function isValidFileSize(fileSize: number, mimeType: string, fileName: string): boolean {
  const fileType = getFileType(mimeType, fileName) as keyof typeof MAX_FILE_SIZES;
  const maxSize = MAX_FILE_SIZES[fileType];

  return maxSize ? fileSize <= maxSize : false;
}

/**
 * Validate file before processing
 */
export function validateFile(file: FileInfo): { valid: boolean; error?: string } {
  if (!file.name || file.name.trim().length === 0) {
    return { valid: false, error: 'File name is required' };
  }

  if (!isSupportedFileType(file.type, file.name)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Supported types: PDF, DOCX, DOC, TXT, RTF, HTML, CSV, JSON`
    };
  }

  if (!isValidFileSize(file.size, file.type, file.name)) {
    const fileType = getFileType(file.type, file.name) as keyof typeof MAX_FILE_SIZES;
    const maxSizeMB = Math.round(MAX_FILE_SIZES[fileType] / 1024 / 1024);
    return {
      valid: false,
      error: `File too large. Maximum size for ${fileType} files is ${maxSizeMB}MB`
    };
  }

  return { valid: true };
}

/**
 * Main function to extract text from various file formats
 */
export async function extractTextFromFile(
  file: File | Buffer,
  fileName?: string,
  mimeType?: string
): Promise<ExtractedText> {
  let buffer: Buffer;
  let fileInfo: FileInfo;

  if (file instanceof File) {
    fileInfo = {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
    };
    buffer = Buffer.from(await file.arrayBuffer());
  } else {
    if (!fileName || !mimeType) {
      throw new Error('File name and MIME type are required when passing Buffer');
    }
    fileInfo = {
      name: fileName,
      type: mimeType,
      size: file.length,
      lastModified: Date.now(),
    };
    buffer = file;
  }

  // Validate file
  const validation = validateFile(file as File);
  if (!validation.valid) {
    return {
      content: '',
      metadata: {
        wordCount: 0,
        characterCount: 0,
        fileName: fileInfo.name,
        fileType: getFileType(fileInfo.type, fileInfo.name),
        fileSize: fileInfo.size,
        extractedAt: new Date().toISOString(),
      },
      success: false,
      error: validation.error || 'Validation failed',
    };
  }

  const fileType = getFileType(fileInfo.type, fileInfo.name);

  try {
    switch (fileType) {
      case 'PDF':
        return await extractFromPDF(buffer, fileInfo.name, fileInfo.size);

      case 'DOCX':
        return await extractFromDOCX(buffer, fileInfo.name, fileInfo.size);

      case 'TXT':
      case 'RTF':
      case 'CSV':
        return await extractFromText(buffer, fileInfo.name, fileInfo.size, fileType);

      case 'HTML':
        return await extractFromHTML(buffer, fileInfo.name, fileInfo.size);

      case 'JSON':
        return await extractFromJSON(buffer, fileInfo.name, fileInfo.size);

      default:
        return {
          content: '',
          metadata: {
            wordCount: 0,
            characterCount: 0,
            fileName: fileInfo.name,
            fileType,
            fileSize: fileInfo.size,
            extractedAt: new Date().toISOString(),
          },
          success: false,
          error: `Unsupported file type: ${fileType}`,
        };
    }
  } catch (error) {
    return {
      content: '',
      metadata: {
        wordCount: 0,
        characterCount: 0,
        fileName: fileInfo.name,
        fileType,
        fileSize: fileInfo.size,
        extractedAt: new Date().toISOString(),
      },
      success: false,
      error: `Text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract text from multiple files
 */
export async function extractTextFromFiles(files: File[]): Promise<ExtractedText[]> {
  const results: ExtractedText[] = [];

  for (const file of files) {
    try {
      const result = await extractTextFromFile(file);
      results.push(result);
    } catch (error) {
      results.push({
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
        error: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  return results;
}

/**
 * Get summary statistics for extracted texts
 */
export function getExtractionSummary(extractions: ExtractedText[]): {
  totalFiles: number;
  successfulExtractions: number;
  failedExtractions: number;
  totalContent: string;
  totalWordCount: number;
  totalCharacterCount: number;
  averageWordsPerFile: number;
  fileTypes: Record<string, number>;
} {
  const successful = extractions.filter(e => e.success);
  const failed = extractions.filter(e => !e.success);
  const totalContent = successful.map(e => e.content).join('\n\n');
  const totalWordCount = successful.reduce((sum, e) => sum + e.metadata.wordCount, 0);
  const totalCharacterCount = successful.reduce((sum, e) => sum + e.metadata.characterCount, 0);

  const fileTypes = extractions.reduce((acc, extraction) => {
    const type = extraction.metadata.fileType;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalFiles: extractions.length,
    successfulExtractions: successful.length,
    failedExtractions: failed.length,
    totalContent,
    totalWordCount,
    totalCharacterCount,
    averageWordsPerFile: successful.length > 0 ? Math.round(totalWordCount / successful.length) : 0,
    fileTypes,
  };
}