import { ComposedEmailInput } from '@/lib/email/templates';

export const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';

export type GeminiKeyHealthStatus = 'active' | 'leaked' | 'invalid' | 'missing';

export interface GeminiAdminConfigSummary {
  configured: boolean;
  maskedKey: string;
  model: string;
  source?: 'encrypted_db' | 'env' | 'none';
  status?: GeminiKeyHealthStatus;
  statusMessage?: string;
  updatedAt?: number;
}

export interface AiEmailPlan {
  summary: string;
  toneMode: 'polished_corporate' | 'verbatim_preserved' | 'adjusted_per_request';
  designRationale: string;
  steps: string[];
  missingInfo?: string[];
}

export interface AiPlanResult {
  modelUsed: string;
  plan: AiEmailPlan;
  draft: ComposedEmailInput;
}
