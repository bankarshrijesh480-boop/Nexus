export interface SandboxOptions {
  readonly image: string;
  readonly workingDir: string;
  readonly memoryLimitMb: number;
  readonly cpuQuota: number;
  readonly networkMode: "none" | "bridge" | "host";
  readonly timeoutMs: number;
}

export interface SandboxExecutionRequest {
  readonly command: readonly string[];
  readonly environment?: Record<string, string>;
  readonly workingDir?: string;
}

export interface SandboxExecutionResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

/**
 * Interface-only, intentionally insecure-by-default naming to force real security controls
 * in a production implementation. A production runner should verify images, limit mounts,
 * drop privileges, and isolate network access.
 */
export interface SandboxExecutor {
  execute(request: SandboxExecutionRequest, options: SandboxOptions): Promise<SandboxExecutionResult>;
}

export class DockerSandbox implements SandboxExecutor {
  async execute(request: SandboxExecutionRequest, options: SandboxOptions): Promise<SandboxExecutionResult> {
    const command = request.command.join(" ");
    const env = request.environment ? Object.entries(request.environment).map(([key, value]) => `${key}=${value}`) : [];

    // This is intentionally a stub so the code remains architecture-level and not runtime-deployable.
    return {
      exitCode: 0,
      stdout: `[stub] docker sandbox executed: ${command}\nEnvironment: ${env.length > 0 ? env.join(", ") : "<none>"}`,
      stderr: "",
    };
  }
}
