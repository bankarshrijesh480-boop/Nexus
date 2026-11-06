export interface TaskDefinition {
  readonly id: string;
  readonly description: string;
  readonly agentId: string;
  readonly dependsOn: readonly string[];
  readonly input?: unknown;
}

export interface TaskPlan {
  readonly goal: string;
  readonly tasks: readonly TaskDefinition[];
}

export interface TaskResult {
  readonly taskId: string;
  readonly output?: unknown;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface WorkflowResult {
  readonly goal: string;
  readonly taskResults: ReadonlyMap<string, TaskResult>;
}
