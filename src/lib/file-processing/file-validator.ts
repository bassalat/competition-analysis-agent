/**
 * File validation utilities for secure file processing
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedFileName?: string;
}

export interface FileValidationOptions {
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  maxFileNameLength?: number;
  scanForMaliciousContent?: boolean;
  requireFileExtension?: boolean;
}

/**
 * Default validation options
 */
export const DEFAULT_VALIDATION_OPTIONS: Required<FileValidationOptions> = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'application/rtf',
    'text/html',
    'text/csv',
    'application/json',
  ],
  allowedExtensions: ['.pdf', '.docx', '.doc', '.txt', '.rtf', '.html', '.htm', '.csv', '.json'],
  maxFileNameLength: 255,
  scanForMaliciousContent: true,
  requireFileExtension: true,
};

/**
 * Dangerous file extensions that should never be allowed
 */
const DANGEROUS_EXTENSIONS = [
  '.exe', '.com', '.scr', '.bat', '.cmd', '.pif', '.vbs', '.js', '.jar',
  '.app', '.deb', '.pkg', '.dmg', '.run', '.msi', '.dll', '.so', '.dylib',
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.php', '.asp', '.jsp'
];

/**
 * Suspicious patterns in file names
 */
const SUSPICIOUS_PATTERNS = [
  /\.\./, // Directory traversal
  /[<>:"|?*]/, // Invalid filename characters
  /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i, // Reserved Windows names
  /^\s|\s$/, // Leading/trailing spaces
  /\x00-\x1f/, // Control characters
];

/**
 * Malicious content signatures (simplified)
 */
const MALICIOUS_SIGNATURES = [
  /<%[\s\S]*?%>/, // Server-side code
  /<script[\s\S]*?<\/script>/i, // JavaScript
  /<\?php[\s\S]*?\?>/i, // PHP code
  /eval\s*\(/, // Code evaluation
  /javascript:/i, // JavaScript protocol
  /vbscript:/i, // VBScript protocol
  /data:text\/html/, // Data URIs with HTML
  /\.exe\b/i, // Executable references
];

/**
 * Validate a single file
 */
export function validateFile(
  file: File,
  options: Partial<FileValidationOptions> = {}
): ValidationResult {
  const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic file checks
  if (!file) {
    errors.push('File is required');
    return { isValid: false, errors, warnings };
  }

  if (!file.name || file.name.trim().length === 0) {
    errors.push('File name is required');
    return { isValid: false, errors, warnings };
  }

  // File name validation
  const fileNameValidation = validateFileName(file.name, opts);
  errors.push(...fileNameValidation.errors);
  warnings.push(...fileNameValidation.warnings);

  // File size validation
  if (file.size === 0) {
    errors.push('File is empty');
  } else if (file.size > opts.maxFileSize) {
    errors.push(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(opts.maxFileSize)})`);
  }

  // MIME type validation
  if (opts.allowedMimeTypes.length > 0 && !opts.allowedMimeTypes.includes(file.type)) {
    errors.push(`File type '${file.type}' is not allowed. Allowed types: ${opts.allowedMimeTypes.join(', ')}`);
  }

  // File extension validation
  const extension = getFileExtension(file.name);
  if (opts.requireFileExtension && !extension) {
    errors.push('File must have an extension');
  } else if (extension && opts.allowedExtensions.length > 0 && !opts.allowedExtensions.includes(extension)) {
    errors.push(`File extension '${extension}' is not allowed. Allowed extensions: ${opts.allowedExtensions.join(', ')}`);
  }

  // Security checks
  const securityValidation = validateFileSecurity(file.name, file.type);
  errors.push(...securityValidation.errors);
  warnings.push(...securityValidation.warnings);

  const sanitizedFileName = fileNameValidation.sanitizedFileName;

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedFileName,
  };
}

/**
 * Validate multiple files
 */
export function validateFiles(
  files: File[],
  options: Partial<FileValidationOptions> = {}
): { results: ValidationResult[], overallValid: boolean, totalErrors: number, totalWarnings: number } {
  if (!files || files.length === 0) {
    return {
      results: [],
      overallValid: false,
      totalErrors: 1,
      totalWarnings: 0,
    };
  }

  const results = files.map(file => validateFile(file, options));
  const totalErrors = results.reduce((sum, result) => sum + result.errors.length, 0);
  const totalWarnings = results.reduce((sum, result) => sum + result.warnings.length, 0);
  const overallValid = results.every(result => result.isValid);

  return {
    results,
    overallValid,
    totalErrors,
    totalWarnings,
  };
}

/**
 * Validate file name
 */
function validateFileName(
  fileName: string,
  options: Required<FileValidationOptions>
): { errors: string[], warnings: string[], sanitizedFileName: string } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Length check
  if (fileName.length > options.maxFileNameLength) {
    errors.push(`File name too long (${fileName.length} characters). Maximum allowed: ${options.maxFileNameLength}`);
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(fileName)) {
      errors.push(`File name contains suspicious pattern: ${pattern}`);
    }
  }

  // Check for dangerous extensions
  const extension = getFileExtension(fileName);
  if (extension && DANGEROUS_EXTENSIONS.includes(extension.toLowerCase())) {
    errors.push(`Dangerous file extension detected: ${extension}`);
  }

  // Sanitize file name
  const sanitizedFileName = sanitizeFileName(fileName);
  if (sanitizedFileName !== fileName) {
    warnings.push('File name contains special characters that will be sanitized');
  }

  return { errors, warnings, sanitizedFileName };
}

/**
 * Validate file security
 */
function validateFileSecurity(
  fileName: string,
  mimeType: string
): { errors: string[], warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // MIME type mismatch check
  const extension = getFileExtension(fileName);
  if (extension) {
    const expectedMimeType = getMimeTypeFromExtension(extension);
    if (expectedMimeType && expectedMimeType !== mimeType) {
      warnings.push(`MIME type '${mimeType}' doesn't match file extension '${extension}'. Expected: ${expectedMimeType}`);
    }
  }

  // Check for executable masquerading as document
  if (mimeType.startsWith('application/') && fileName.toLowerCase().includes('.exe')) {
    errors.push('Suspicious file: executable content detected in document');
  }

  return { errors, warnings };
}

/**
 * Scan file content for malicious patterns (simplified)
 */
export async function scanFileContent(file: File): Promise<{ threats: string[], isClean: boolean }> {
  const threats: string[] = [];

  try {
    // Only scan text-based files
    if (file.type.startsWith('text/') ||
        file.type === 'application/json' ||
        file.name.endsWith('.html') ||
        file.name.endsWith('.htm')) {

      const content = await file.text();

      for (const signature of MALICIOUS_SIGNATURES) {
        if (signature.test(content)) {
          threats.push(`Suspicious content pattern detected: ${signature.source}`);
        }
      }

      // Check for excessive script tags
      const scriptMatches = content.match(/<script/gi);
      if (scriptMatches && scriptMatches.length > 10) {
        threats.push('Excessive script tags detected - potential malware');
      }

      // Check for obfuscated code
      if (content.includes('eval(') && content.includes('unescape(')) {
        threats.push('Potentially obfuscated code detected');
      }
    }
  } catch (error) {
    threats.push(`Content scanning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    threats,
    isClean: threats.length === 0,
  };
}

/**
 * Get file extension from filename
 */
function getFileExtension(fileName: string): string | null {
  const match = fileName.match(/\.[^.]*$/);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Get expected MIME type from file extension
 */
function getMimeTypeFromExtension(extension: string): string | null {
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.txt': 'text/plain',
    '.rtf': 'application/rtf',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.csv': 'text/csv',
    '.json': 'application/json',
  };

  return mimeTypes[extension.toLowerCase()] || null;
}

/**
 * Sanitize file name by removing dangerous characters
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[<>:"|?*]/g, '_') // Replace dangerous characters
    .replace(/\.\./g, '_') // Replace directory traversal
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .substring(0, 255); // Limit length
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Check if file type is considered safe
 */
export function isSafeFileType(mimeType: string, fileName: string): boolean {
  const safeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/csv',
    'application/json',
  ];

  return safeTypes.includes(mimeType) && !DANGEROUS_EXTENSIONS.some(ext =>
    fileName.toLowerCase().endsWith(ext)
  );
}

/**
 * Get validation summary for multiple files
 */
export function getValidationSummary(results: ValidationResult[]): {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  totalErrors: number;
  totalWarnings: number;
  commonErrors: string[];
  commonWarnings: string[];
} {
  const totalFiles = results.length;
  const validFiles = results.filter(r => r.isValid).length;
  const invalidFiles = totalFiles - validFiles;

  const allErrors = results.flatMap(r => r.errors);
  const allWarnings = results.flatMap(r => r.warnings);

  // Find most common errors and warnings
  const errorCounts = allErrors.reduce((acc, error) => {
    acc[error] = (acc[error] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const warningCounts = allWarnings.reduce((acc, warning) => {
    acc[warning] = (acc[warning] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const commonErrors = Object.entries(errorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([error]) => error);

  const commonWarnings = Object.entries(warningCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([warning]) => warning);

  return {
    totalFiles,
    validFiles,
    invalidFiles,
    totalErrors: allErrors.length,
    totalWarnings: allWarnings.length,
    commonErrors,
    commonWarnings,
  };
}

/**
 * Create file validation report
 */
export function createValidationReport(results: ValidationResult[]): string {
  const summary = getValidationSummary(results);

  let report = `File Validation Report\n`;
  report += `===================\n\n`;
  report += `Total files: ${summary.totalFiles}\n`;
  report += `Valid files: ${summary.validFiles}\n`;
  report += `Invalid files: ${summary.invalidFiles}\n`;
  report += `Total errors: ${summary.totalErrors}\n`;
  report += `Total warnings: ${summary.totalWarnings}\n\n`;

  if (summary.commonErrors.length > 0) {
    report += `Most common errors:\n`;
    summary.commonErrors.forEach((error, index) => {
      report += `${index + 1}. ${error}\n`;
    });
    report += '\n';
  }

  if (summary.commonWarnings.length > 0) {
    report += `Most common warnings:\n`;
    summary.commonWarnings.forEach((warning, index) => {
      report += `${index + 1}. ${warning}\n`;
    });
    report += '\n';
  }

  report += `Detailed Results:\n`;
  report += `================\n`;
  results.forEach((result, index) => {
    report += `\nFile ${index + 1}:\n`;
    report += `Status: ${result.isValid ? 'VALID' : 'INVALID'}\n`;
    if (result.errors.length > 0) {
      report += `Errors: ${result.errors.join(', ')}\n`;
    }
    if (result.warnings.length > 0) {
      report += `Warnings: ${result.warnings.join(', ')}\n`;
    }
  });

  return report;
}