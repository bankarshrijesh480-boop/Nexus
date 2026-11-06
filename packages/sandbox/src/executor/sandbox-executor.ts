import type { TaskDefinition, TaskResult } from "../../../agent-sdk/src/contracts/task.js";

export interface SandboxRequest {
  readonly task: TaskDefinition;
  readonly timeoutMs: number;
  readonly memoryLimitMb: number;
  readonly networkAccess: "denied" | "allowlisted";
}

export interface SandboxResult {
  readonly taskResult: TaskResult;
  readonly exitCode: number;
  readonly logs: string;
}

/** Adapter contract only; a production implementation must enforce isolation externally. */
export interface SandboxExecutor {
  execute(request: SandboxRequest, signal?: AbortSignal): Promise<SandboxResult>;
}
