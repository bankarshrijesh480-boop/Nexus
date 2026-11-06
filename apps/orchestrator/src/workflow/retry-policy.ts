export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly backoffMultiplier: number;
}

export class DefaultRetryPolicy implements RetryPolicy {
  readonly maxAttempts = 3;
  readonly baseDelayMs = 250;
  readonly backoffMultiplier = 2;
}

export function getRetryDelayMs(policy: RetryPolicy, attempt: number): number {
  if (attempt <= 0) return 0;
  return policy.baseDelayMs * (policy.backoffMultiplier ** (attempt - 1));
}
