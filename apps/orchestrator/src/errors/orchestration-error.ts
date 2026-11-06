export type OrchestrationErrorCode =
  | "INVALID_PLAN"
  | "AGENT_NOT_FOUND"
  | "TASK_EXECUTION_FAILED";

export class OrchestrationError extends Error {
  constructor(
    readonly code: OrchestrationErrorCode,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {},
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "OrchestrationError";
  }
}

export interface TaskFailure {
  readonly taskId: string;
  readonly message: string;
}

export class WorkflowExecutionError extends OrchestrationError {
  constructor(readonly failures: readonly TaskFailure[]) {
    super(
      "TASK_EXECUTION_FAILED",
      `${failures.length} task(s) failed; dependent tasks were not started.`,
      { failures },
    );
    this.name = "WorkflowExecutionError";
  }
}
