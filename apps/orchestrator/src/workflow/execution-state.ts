export type ExecutionStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled";

export interface ExecutionState {
  readonly status: ExecutionStatus;
  readonly attempts: number;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly lastError?: string;
}

export class ExecutionStateTracker {
  private readonly states = new Map<string, ExecutionState>();

  markStarted(taskId: string): ExecutionState {
    const existing = this.states.get(taskId) ?? {
      status: "pending",
      attempts: 0,
    };
    const next: ExecutionState = {
      status: "running",
      attempts: existing.attempts + 1,
      startedAt: new Date().toISOString(),
      completedAt: undefined,
      lastError: undefined,
    };
    this.states.set(taskId, next);
    return next;
  }

  markSucceeded(taskId: string): ExecutionState {
    const existing = this.states.get(taskId) ?? { status: "pending", attempts: 0 };
    const next: ExecutionState = {
      ...existing,
      status: "succeeded",
      completedAt: new Date().toISOString(),
      lastError: undefined,
    };
    this.states.set(taskId, next);
    return next;
  }

  markFailed(taskId: string, error: Error | string): ExecutionState {
    const existing = this.states.get(taskId) ?? { status: "pending", attempts: 0 };
    const next: ExecutionState = {
      ...existing,
      status: "failed",
      completedAt: new Date().toISOString(),
      lastError: error instanceof Error ? error.message : error,
    };
    this.states.set(taskId, next);
    return next;
  }

  markCancelled(taskId: string): ExecutionState {
    const existing = this.states.get(taskId) ?? { status: "pending", attempts: 0 };
    const next: ExecutionState = {
      ...existing,
      status: "cancelled",
      completedAt: new Date().toISOString(),
    };
    this.states.set(taskId, next);
    return next;
  }

  get(taskId: string): ExecutionState | undefined {
    return this.states.get(taskId);
  }
}
