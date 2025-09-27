/**
 * API utilities for error handling, rate limiting, and retry logic
 */

import { ApiResponse, RateLimitInfo } from '@/types/api';

// Rate limiting store (in-memory for MVP)
const rateLimitStore = new Map<string, { requests: number; resetTime: number }>();

/**
 * Check if we can make a request based on rate limits
 */
export function checkRateLimit(apiName: string, limit: number): boolean {
  const now = Date.now();
  const key = apiName;
  const current = rateLimitStore.get(key);

  if (!current) {
    rateLimitStore.set(key, { requests: 1, resetTime: now + 60000 }); // 1 minute
    return true;
  }

  // Reset if time window has passed
  if (now > current.resetTime) {
    rateLimitStore.set(key, { requests: 1, resetTime: now + 60000 });
    return true;
  }

  // Check if under limit
  if (current.requests < limit) {
    current.requests++;
    return true;
  }

  return false;
}

/**
 * Get remaining rate limit info
 */
export function getRateLimitInfo(apiName: string, limit: number): RateLimitInfo {
  const current = rateLimitStore.get(apiName);
  const now = Date.now();

  if (!current || now > current.resetTime) {
    return {
      limit,
      remaining: limit,
      resetTime: now + 60000,
    };
  }

  return {
    limit,
    remaining: Math.max(0, limit - current.requests),
    resetTime: current.resetTime,
  };
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<ApiResponse<T>> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return {
        success: true,
        data: result,
        retries: attempt,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMessage = lastError.message.toLowerCase();

      // Don't retry certain types of errors
      if (errorMessage.includes('authentication') ||
          errorMessage.includes('unauthorized') ||
          errorMessage.includes('invalid api key') ||
          errorMessage.includes('quota exceeded') ||
          errorMessage.includes('forbidden') ||
          (errorMessage.includes('status code 400') && !errorMessage.includes('rate limit')) ||
          (errorMessage.includes('status code 403') && !errorMessage.includes('rate limit'))) {
        console.error(`Non-retryable error, failing immediately:`, lastError.message);
        return {
          success: false,
          error: lastError.message,
          retries: attempt,
        };
      }

      if (attempt === maxRetries) {
        break;
      }

      // Different delays for different error types
      let delay: number;
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        // Much longer delay for rate limits (especially for token limits)
        if (errorMessage.includes('output tokens per minute')) {
          // Token rate limit - wait longer (up to 2 minutes)
          delay = Math.min(baseDelay * Math.pow(3, attempt + 3) + Math.random() * 60000, 120000);
        } else {
          // Connection rate limit - shorter delay
          delay = Math.min(baseDelay * Math.pow(2, attempt + 2) + Math.random() * 2000, maxDelay * 2);
        }
      } else if (errorMessage.includes('timeout') || errorMessage.includes('streaming is required')) {
        // Medium delay for timeouts
        delay = Math.min(baseDelay * Math.pow(2, attempt + 1) + Math.random() * 1000, maxDelay);
      } else {
        // Standard delay for other errors
        delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 1000, maxDelay);
      }

      console.warn(`API request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay.toFixed(0)}ms:`, lastError.message);
      await sleep(delay);
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Unknown error occurred',
    retries: maxRetries,
  };
}

/**
 * Rate limited request wrapper with configurable retry options
 */
export async function withRateLimit<T>(
  apiName: string,
  limit: number,
  operation: () => Promise<T>,
  retryOptions?: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
  }
): Promise<ApiResponse<T>> {
  const rateLimitInfo = getRateLimitInfo(apiName, limit);

  if (rateLimitInfo.remaining <= 0) {
    const waitTime = rateLimitInfo.resetTime - Date.now();
    return {
      success: false,
      error: `Rate limit exceeded for ${apiName}. Try again in ${Math.ceil(waitTime / 1000)} seconds.`,
    };
  }

  if (!checkRateLimit(apiName, limit)) {
    return {
      success: false,
      error: `Rate limit exceeded for ${apiName}. Please wait before making more requests.`,
    };
  }

  return withRetry(
    operation,
    retryOptions?.maxRetries,
    retryOptions?.baseDelay,
    retryOptions?.maxDelay
  );
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - remove scripts and other dangerous content
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string, prefix: string): boolean {
  return apiKey.startsWith(prefix) && apiKey.length > prefix.length + 10;
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string') return error.message;
    if ('error' in error && typeof error.error === 'string') return error.error;
  }
  return 'An unexpected error occurred';
}

/**
 * Create a timeout promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Request timeout'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}