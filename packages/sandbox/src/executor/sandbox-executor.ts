import type { TaskDefinition, TaskResult } from "../../../agent-sdk/src/contracts/task.js";

/** A bounded command invocation inside the sandbox. Never pass a shell command string. */
export interface SandboxRequest {
  readonly command: readonly [string, ...string[]];
  readonly workingDir?: string;
  readonly environment?: Readonly<Record<string, string>>;
}

export interface SandboxOptions {
  /** Must be an approved, immutable image reference pinned by sha256 digest. */
  readonly image: string;
  readonly workingDir: string;
  readonly memoryLimitMb: number;
  readonly cpuQuota: number;
  readonly timeoutMs: number;
  readonly networkMode: "none";
  readonly pidsLimit?: number;
  readonly outputLimitBytes?: number;
}

export interface SandboxExecutionResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

/** Executes an agent-produced task within an isolated execution boundary. */
export interface SandboxExecutor {
  execute(request: SandboxRequest, options: SandboxOptions, signal?: AbortSignal): Promise<SandboxExecutionResult>;
}

/** Existing task-level adapter contract retained for future agent integration. */
export interface TaskSandboxRequest {
  readonly task: TaskDefinition;
  readonly timeoutMs: number;
  readonly memoryLimitMb: number;
  readonly networkAccess: "denied" | "allowlisted";
}

export interface TaskSandboxResult {
  readonly taskResult: TaskResult;
  readonly exitCode: number;
  readonly logs: string;
}
