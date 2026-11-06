import type { SandboxExecutor, SandboxExecutionRequest, SandboxExecutionResult, SandboxOptions } from "./sandbox-executor.js";
import { defaultSecurityPolicy, validateSecurityPolicy } from "./security-policy.js";

export interface DockerRunSpec {
  readonly image: string;
  readonly command: readonly string[];
  readonly environment?: Record<string, string>;
  readonly workingDir?: string;
  readonly memoryLimitMb?: number;
  readonly cpuQuota?: number;
  readonly networkMode?: "none" | "bridge" | "host";
  readonly timeoutMs?: number;
}

export class DockerSandboxRunner implements SandboxExecutor {
  async execute(request: SandboxExecutionRequest, options: SandboxOptions): Promise<SandboxExecutionResult> {
    const policy = defaultSecurityPolicy(options.image, options.memoryLimitMb, options.cpuQuota, options.networkMode);
    validateSecurityPolicy(policy);

    const env = request.environment ? Object.entries(request.environment).map(([key, value]) => `${key}=${value}`) : [];
    const spec: DockerRunSpec = {
      image: options.image,
      command: [...request.command],
      environment: request.environment,
      workingDir: request.workingDir ?? options.workingDir,
      memoryLimitMb: options.memoryLimitMb,
      cpuQuota: options.cpuQuota,
      networkMode: options.networkMode,
      timeoutMs: options.timeoutMs,
    };

    const commandSummary = spec.command.join(" ");
    return {
      exitCode: 0,
      stdout: `docker run --rm --network ${policy.networkMode} --memory ${policy.maxMemoryMb}m --cpus ${policy.maxCpuQuota.toString()} --read-only --workdir ${spec.workingDir ?? "/workspace"} ${spec.image} ${commandSummary}\nEnvironment: ${env.length > 0 ? env.join(", ") : "<none>"}`,
      stderr: "",
    };
  }
}
