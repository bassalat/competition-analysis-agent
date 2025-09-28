/**
 * Claude API client wrapper with error handling, rate limiting, and retry logic
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/lib/config';
import { ApiResponse, ClaudeMessage, ClaudeRequest } from '@/types/api';
import { withRateLimit, withTimeout, formatErrorMessage, validateApiKey } from './api-utils';

export interface ClaudeOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  timeout?: number;
  stream?: boolean;
  onProgress?: (chunk: string) => void;
  model?: string; // Allow overriding the model for specific use cases
}

export class ClaudeClient {
  private client: Anthropic;
  private rateLimitName = 'claude';

  /**
   * Get the appropriate max tokens for a given model
   */
  private getMaxTokensForModel(model: string, requestedTokens: number): number {
    // Use the configured max tokens or a conservative default
    return Math.min(requestedTokens, config.claude.maxTokens);
  }

  constructor() {
    // Validate configuration
    if (!validateApiKey(config.anthropicApiKey, 'sk-ant-')) {
      throw new Error('Invalid Anthropic API key format');
    }

    this.client = new Anthropic({
      apiKey: config.anthropicApiKey,
    });
  }

  /**
   * Complete a text prompt using Claude with fallback models
   */
  async complete(
    prompt: string,
    options: ClaudeOptions = {}
  ): Promise<ApiResponse<string>> {
    // If a specific model is requested, try only that model
    if (options.model && options.model !== config.claude.model) {
      return this.completeWithModel(prompt, options);
    }

    // Otherwise, try with fallback strategy
    const fallbackModels = [
      options.model || config.claude.model,
      config.claude.model,
    ];

    // Remove duplicates
    const uniqueModels = [...new Set(fallbackModels)];

    let lastError: string = '';

    for (let i = 0; i < uniqueModels.length; i++) {
      const modelToTry = uniqueModels[i];
      console.log(`Attempting Claude request with model: ${modelToTry}${i > 0 ? ' (fallback)' : ''}`);

      const result = await this.completeWithModel(prompt, { ...options, model: modelToTry });

      if (result.success) {
        return result;
      }

      lastError = result.error || 'Unknown error';

      // Don't retry for certain error types
      if (lastError.includes('unauthorized') || lastError.includes('authentication') || lastError.includes('invalid api key')) {
        break;
      }

      console.warn(`Model ${modelToTry} failed: ${lastError}`);
    }

    return {
      success: false,
      error: `All Claude models failed. Last error: ${lastError}`,
    };
  }

  /**
   * Complete a text prompt using a specific Claude model
   */
  private async completeWithModel(
    prompt: string,
    options: ClaudeOptions = {}
  ): Promise<ApiResponse<string>> {
    const {
      maxTokens = config.claude.maxTokens,
      temperature = 0.7,
      topP = 0.9,
      stopSequences = [],
      timeout = 900000, // 15 minutes for long operations
      stream = false,
      onProgress,
      model = config.claude.model,
    } = options;

    // Adjust max tokens based on the model being used
    const adjustedMaxTokens = this.getMaxTokensForModel(model, maxTokens);

    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const request: ClaudeRequest = {
      model: model,
      max_tokens: adjustedMaxTokens,
      messages,
      temperature,
      top_p: topP,
      stop_sequences: stopSequences,
      stream,
    };

    // Log token adjustment if it was changed
    if (adjustedMaxTokens !== maxTokens) {
      console.log(`🔧 Adjusted tokens for ${model}: ${maxTokens} → ${adjustedMaxTokens}`);
    }

    // Estimate cost before making request (for real-time tracking)

    const operation = async (): Promise<string> => {
      if (stream && onProgress) {
        // Use streaming for long operations
        let fullContent = '';
        const streamResponse = await this.client.messages.create({
          ...request,
          stream: true,
        }) as AsyncIterable<{ type: string; delta?: { text?: string } }>;

        for await (const chunk of streamResponse) {
          if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
            fullContent += chunk.delta.text;
            onProgress(chunk.delta.text);
          }
        }

        if (!fullContent || fullContent.trim().length === 0) {
          throw new Error('Claude returned empty response');
        }

        return fullContent;
      } else {
        // Use regular request with extended timeout for long operations
        console.log(`🤖 Making Claude API request with model: ${model}`);
        const response = await withTimeout(
          this.client.messages.create(request),
          timeout,
          'Claude request timeout - consider using streaming for long operations'
        );

        console.log('📥 Claude API response received');
        console.log('Response status:', response ? 'success' : 'null');

        if (!response) {
          console.error('❌ Claude API returned null/undefined response');
          throw new Error('Claude API returned null/undefined response');
        }

        // Check if it's a streaming response and handle appropriately
        if ('content' in response) {
          console.log('Response content length:', response.content?.length || 0);
          console.log('Response model:', response.model);
          console.log('Response stop reason:', response.stop_reason);
        } else {
          console.error('❌ Received streaming response when expecting message response');
          throw new Error('Received streaming response when expecting message response');
        }

        if (!response.content || response.content.length === 0) {
          console.error('❌ Claude returned empty response - no content in response');
          console.error('Full response object:', JSON.stringify(response, null, 2));
          throw new Error('Claude returned empty response - no content in response');
        }

        // Track actual usage
        if ('usage' in response && response.usage) {
          console.log('📊 Token usage:', response.usage);
        }

        const textContent = 'content' in response ? response.content
          .filter(content => content.type === 'text')
          .map(content => content.text)
          .join('') : '';

        console.log('✅ Extracted text content length:', textContent.length);
        console.log('Text content preview (first 200 chars):', textContent.substring(0, 200));

        if (!textContent || textContent.trim().length === 0) {
          console.error('❌ Claude returned empty text content - response had no text blocks');
          console.error('Content types found:', response.content.map(c => c.type));
          throw new Error('Claude returned empty text content - response had no text blocks');
        }

        return textContent;
      }
    };

    return withRateLimit(this.rateLimitName, config.rateLimits.claude, operation, {
      maxRetries: 4,
      baseDelay: 2000,
      maxDelay: 30000,
    });
  }

  /**
   * Have a conversation with Claude using message history
   */
  async chat(
    messages: ClaudeMessage[],
    options: ClaudeOptions = {}
  ): Promise<ApiResponse<string>> {
    const {
      maxTokens = config.claude.maxTokens,
      temperature = 0.7,
      topP = 0.9,
      stopSequences = [],
      timeout = 120000,
      model = config.claude.model,
    } = options;

    if (!messages || messages.length === 0) {
      return {
        success: false,
        error: 'No messages provided for chat',
      };
    }

    const request: ClaudeRequest = {
      model: model,
      max_tokens: maxTokens,
      messages,
      temperature,
      top_p: topP,
      stop_sequences: stopSequences,
    };

    // Estimate cost before making request (for real-time tracking)

    const operation = async (): Promise<string> => {
      const response = await withTimeout(
        this.client.messages.create(request),
        timeout,
        'Claude chat request timeout'
      );

      if (!response) {
        throw new Error('Claude API returned null/undefined response');
      }

      if (!('content' in response) || !response.content || response.content.length === 0) {
        throw new Error('Claude returned empty response - no content in response');
      }

      // Track actual usage
      if ('usage' in response && response.usage) {
        console.log('📊 Token usage:', response.usage);
      }

      const textContent = response.content
        .filter(content => content.type === 'text')
        .map(content => content.text)
        .join('');

      if (!textContent || textContent.trim().length === 0) {
        throw new Error('Claude returned empty text content - response had no text blocks');
      }

      return textContent;
    };

    return withRateLimit(this.rateLimitName, config.rateLimits.claude, operation, {
      maxRetries: 4,
      baseDelay: 2000,
      maxDelay: 30000,
    });
  }

  /**
   * Analyze structured data with Claude
   */
  async analyzeData(
    data: unknown,
    analysisPrompt: string,
    options: ClaudeOptions = {}
  ): Promise<ApiResponse<unknown>> {
    const prompt = `
${analysisPrompt}

Data to analyze:
${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}

Please provide a comprehensive analysis based on the data provided.
    `.trim();

    const response = await this.complete(prompt, options);

    if (!response.success) {
      return response;
    }

    try {
      // Try to parse as JSON if it looks like structured data
      const text = response.data!;
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        const parsed = JSON.parse(text);
        return {
          success: true,
          data: parsed,
          retries: response.retries,
        };
      } else {
        return {
          success: true,
          data: text,
          retries: response.retries,
        };
      }
    } catch {
      // Return as text if JSON parsing fails
      return response;
    }
  }

  /**
   * Generate multiple variants of a response
   */
  async generateVariants(
    prompt: string,
    count: number = 3,
    options: ClaudeOptions = {}
  ): Promise<ApiResponse<string[]>> {
    const variants: string[] = [];
    const errors: string[] = [];

    const promises = Array.from({ length: count }, async (_, index) => {
      const variantPrompt = `${prompt}\n\nGenerate variant ${index + 1}:`;
      const response = await this.complete(variantPrompt, {
        ...options,
        temperature: (options.temperature || 0.7) + (index * 0.1), // Vary temperature
      });

      if (response.success) {
        variants.push(response.data!);
      } else {
        errors.push(response.error!);
      }
    });

    await Promise.allSettled(promises);

    if (variants.length === 0) {
      return {
        success: false,
        error: `Failed to generate any variants: ${errors.join(', ')}`,
      };
    }

    return {
      success: true,
      data: variants,
    };
  }

  /**
   * Summarize long content with Claude
   */
  async summarize(
    content: string,
    maxLength: number = 500,
    options: ClaudeOptions = {}
  ): Promise<ApiResponse<string>> {
    const prompt = `
Please provide a concise summary of the following content in approximately ${maxLength} characters or less:

${content}

Focus on the key points, main insights, and most important information.
    `.trim();

    return this.complete(prompt, options);
  }

  /**
   * Extract structured information from unstructured text
   */
  async extractStructured(
    text: string,
    schema: string,
    options: ClaudeOptions = {}
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const prompt = `
Extract structured information from the following text according to this schema:

Schema: ${schema}

Text to extract from:
${text}

Please return the extracted information in JSON format following the specified schema.
    `.trim();

    const response = await this.complete(prompt, {
      ...options,
      temperature: 0.3, // Lower temperature for structured extraction
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error,
      };
    }

    try {
      const parsed = JSON.parse(response.data!);
      return {
        success: true,
        data: parsed,
        retries: response.retries,
      };
    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse extracted data as JSON: ${formatErrorMessage(parseError)}`,
      };
    }
  }

  /**
   * Health check for the Claude API
   */
  async healthCheck(): Promise<ApiResponse<boolean>> {
    const testPrompt = 'Please respond with exactly: "API is working"';

    try {
      // Use a direct API call to avoid circular dependency with complete()
      const response = await this.client.messages.create({
        model: config.claude.model, // Use configured model for health check
        max_tokens: 50,
        temperature: 0,
        messages: [{ role: 'user', content: testPrompt }]
      });

      if (!response.content || response.content.length === 0) {
        return {
          success: false,
          error: 'Claude API returned empty response in health check',
        };
      }

      const textContent = response.content
        .filter(content => content.type === 'text')
        .map(content => content.text)
        .join('');

      const isHealthy = textContent.trim().toLowerCase().includes('api is working');

      return {
        success: true,
        data: isHealthy,
      };
    } catch (error) {
      return {
        success: false,
        error: `Claude API health check failed: ${formatErrorMessage(error)}`,
      };
    }
  }

  /**
   * Comprehensive API diagnostic check
   */
  async diagnosticCheck(): Promise<ApiResponse<{
    apiKeyValid: boolean;
    connectionOk: boolean;
    modelsAvailable: string[];
    rateLimitsOk: boolean;
    diagnosticInfo: Record<string, unknown>;
  }>> {
    const results = {
      apiKeyValid: false,
      connectionOk: false,
      modelsAvailable: [] as string[],
      rateLimitsOk: false,
      diagnosticInfo: {
        timestamp: new Date().toISOString(),
        configuredModel: config.claude.model,
        error: undefined as string | undefined,
        issue: undefined as string | undefined,
      }
    };

    try {
      // Test API key validity with minimal request
      await this.client.messages.create({
        model: config.claude.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      });

      results.apiKeyValid = true;
      results.connectionOk = true;
      results.modelsAvailable = [config.claude.model];
      results.rateLimitsOk = true;

      return {
        success: true,
        data: results,
      };
    } catch (error: unknown) {
      const errorMsg = formatErrorMessage(error);
      results.diagnosticInfo.error = errorMsg;

      if (errorMsg.includes('unauthorized') || errorMsg.includes('authentication')) {
        results.diagnosticInfo.issue = 'Invalid API key';
      } else if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
        results.diagnosticInfo.issue = 'Rate limit exceeded';
      } else if (errorMsg.includes('timeout')) {
        results.diagnosticInfo.issue = 'Connection timeout';
      } else {
        results.diagnosticInfo.issue = 'Unknown API issue';
      }

      return {
        success: false,
        error: `Claude API diagnostic failed: ${errorMsg}`,
        data: results,
      };
    }
  }
}

// Singleton instance for use throughout the application
let claudeClientInstance: ClaudeClient | null = null;

export function getClaudeClient(): ClaudeClient {
  if (!claudeClientInstance) {
    claudeClientInstance = new ClaudeClient();
  }
  return claudeClientInstance;
}