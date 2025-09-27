/**
 * Real-time cost tracking for Claude API usage
 * Based on official Anthropic pricing from Context7 MCP
 */

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface CostBreakdown {
  model: string;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
}

export interface ExternalAPICost {
  service: string;
  description: string;
  cost: number;
  units: number;
  unitType: string;
}

export interface SessionCosts {
  totalCost: number;
  breakdown: CostBreakdown[];
  externalAPICosts: ExternalAPICost[];
  totalInputTokens: number;
  totalOutputTokens: number;
  requestCount: number;
  startTime: number;
  estimatedCost?: number; // For ongoing requests
}

// Official Anthropic pricing per million tokens (as of Jan 2025)
const MODEL_PRICING = {
  // Claude 4 Models
  'claude-opus-4-1-20250805': { input: 15, output: 75 },
  'claude-opus-4-20250514': { input: 15, output: 75 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },

  // Claude 3.7 Models
  'claude-3-7-sonnet-20250219': { input: 3, output: 15 },
  'claude-3-7-sonnet-latest': { input: 3, output: 15 },

  // Claude 3.5 Models
  'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 },
  'claude-3-5-haiku-latest': { input: 0.25, output: 1.25 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-3-5-sonnet-20240620': { input: 3, output: 15 },

  // Claude 3 Models (Legacy)
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'claude-3-sonnet-20240229': { input: 3, output: 15 },
  'claude-3-opus-20240229': { input: 15, output: 75 },

  // Aliases map to latest versions
  'claude-opus-4-1': { input: 15, output: 75 },
  'claude-opus-4-0': { input: 15, output: 75 },
  'claude-sonnet-4-0': { input: 3, output: 15 },
} as const;

class CostTracker {
  private sessionCosts: SessionCosts = {
    totalCost: 0,
    breakdown: [],
    externalAPICosts: [],
    totalInputTokens: 0,
    totalOutputTokens: 0,
    requestCount: 0,
    startTime: Date.now(),
  };

  private subscribers: ((costs: SessionCosts) => void)[] = [];

  /**
   * Calculate cost for a single API call
   */
  calculateCost(model: string, usage: TokenUsage): CostBreakdown {
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];

    if (!pricing) {
      console.warn(`Unknown model pricing for: ${model}, using Sonnet 4 rates`);
      const fallbackPricing = MODEL_PRICING['claude-sonnet-4-20250514'];
      return this.calculateWithPricing(model, usage, fallbackPricing);
    }

    return this.calculateWithPricing(model, usage, pricing);
  }

  private calculateWithPricing(
    model: string,
    usage: TokenUsage,
    pricing: { input: number; output: number }
  ): CostBreakdown {
    const inputTokens = usage.input_tokens + (usage.cache_creation_input_tokens || 0);
    const outputTokens = usage.output_tokens;

    // Check for long context pricing (>200K input tokens for Sonnet 4)
    const isLongContext = model.includes('sonnet-4') && inputTokens > 200000;
    const inputRate = isLongContext ? pricing.input * 2 : pricing.input; // 2x for long context
    const outputRate = isLongContext ? pricing.output * 1.5 : pricing.output; // 1.5x for long context

    const inputCost = (inputTokens / 1000000) * inputRate;
    const outputCost = (outputTokens / 1000000) * outputRate;
    const totalCost = inputCost + outputCost;

    return {
      model,
      inputCost,
      outputCost,
      totalCost,
      inputTokens,
      outputTokens,
    };
  }

  /**
   * Track a completed API call
   */
  trackUsage(model: string, usage: TokenUsage): CostBreakdown {
    const costBreakdown = this.calculateCost(model, usage);

    this.sessionCosts.totalCost += costBreakdown.totalCost;
    this.sessionCosts.totalInputTokens += costBreakdown.inputTokens;
    this.sessionCosts.totalOutputTokens += costBreakdown.outputTokens;
    this.sessionCosts.requestCount += 1;
    this.sessionCosts.breakdown.push(costBreakdown);

    // Remove estimated cost since we now have actual
    delete this.sessionCosts.estimatedCost;

    this.notifySubscribers();
    return costBreakdown;
  }

  /**
   * Track external API costs (Serper, Firecrawl, etc.)
   */
  trackExternalAPICost(service: string, description: string, cost: number, units: number, unitType: string): ExternalAPICost {
    const externalCost: ExternalAPICost = {
      service,
      description,
      cost,
      units,
      unitType
    };

    this.sessionCosts.totalCost += cost;
    this.sessionCosts.externalAPICosts.push(externalCost);

    // Remove estimated cost since we now have actual
    delete this.sessionCosts.estimatedCost;

    this.notifySubscribers();
    return externalCost;
  }

  /**
   * Estimate cost for ongoing request
   */
  estimateCost(model: string, estimatedInputTokens: number, estimatedOutputTokens: number): void {
    const usage: TokenUsage = {
      input_tokens: estimatedInputTokens,
      output_tokens: estimatedOutputTokens,
    };

    const estimate = this.calculateCost(model, usage);
    this.sessionCosts.estimatedCost = this.sessionCosts.totalCost + estimate.totalCost;

    this.notifySubscribers();
  }

  /**
   * Subscribe to cost updates
   */
  subscribe(callback: (costs: SessionCosts) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Get current session costs
   */
  getSessionCosts(): SessionCosts {
    return { ...this.sessionCosts };
  }

  /**
   * Reset session costs
   */
  reset(): void {
    this.sessionCosts = {
      totalCost: 0,
      breakdown: [],
      externalAPICosts: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
      requestCount: 0,
      startTime: Date.now(),
    };
    this.notifySubscribers();
  }

  /**
   * Get cost per model breakdown
   */
  getCostByModel(): Record<string, { cost: number; requests: number }> {
    const breakdown: Record<string, { cost: number; requests: number }> = {};

    for (const item of this.sessionCosts.breakdown) {
      if (!breakdown[item.model]) {
        breakdown[item.model] = { cost: 0, requests: 0 };
      }
      breakdown[item.model].cost += item.totalCost;
      breakdown[item.model].requests += 1;
    }

    return breakdown;
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.getSessionCosts()));
  }
}

// Singleton instance for global cost tracking
export const globalCostTracker = new CostTracker();

/**
 * Format cost as currency
 */
export function formatCost(cost: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(cost);
}

/**
 * Format large numbers with commas
 */
export function formatTokenCount(count: number): string {
  return new Intl.NumberFormat('en-US').format(count);
}