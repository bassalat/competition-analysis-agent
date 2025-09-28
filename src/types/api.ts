// Common API types and interfaces

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  retries?: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
}

// Claude API Types
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | Array<{
    type: 'text';
    text: string;
  } | {
    type: 'document';
    source: {
      type: 'base64';
      media_type: 'application/pdf';
      data: string;
    };
  }>;
}

export interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  stream?: boolean;
}

export interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}



// Common competitor types
export interface Competitor {
  name: string;
  website?: string;
  description?: string;
  industry?: string;
  size?: string;
  funding?: string;
  headquarters?: string;
}

export interface BusinessContext {
  company: string;
  industry: string;
  targetMarket: string[];
  businessModel: string;
  valueProposition: string;
  keyProducts: string[];
  competitiveAdvantages: string[];
  challenges: string[];
  objectives: string[];
}



