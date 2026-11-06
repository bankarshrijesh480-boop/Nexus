import { spawn } from "node:child_process";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { SandboxExecutor, SandboxOptions, SandboxRequest, SandboxExecutionResult } from "./sandbox-executor.js";
import { validateContainerWorkingDirectory, validateEnvironment, validateSecurityPolicy } from "./security-policy.js";

export interface DockerSandboxRunnerConfig {
  /** Exact allowlist of digest-pinned images. Empty allowlists fail closed. */
  readonly allowedImages: readonly string[];
  readonly dockerPath?: string;
  readonly killGracePeriodMs?: number;
}

const MAX_TIMER_MS = 2_147_000_000;

/**
 * Docker-backed command executor. Requires a separately managed Docker daemon and host
 * hardening. It uses no shell, host networking, privileged mode, devices, or Docker socket
 * mount; only the declared workspace is bind-mounted into the container.
 */
export class DockerSandboxRunner implements SandboxExecutor {
  private readonly allowedImages: ReadonlySet<string>;
  private readonly dockerPath: string;
  private readonly killGracePeriodMs: number;

  constructor(config: DockerSandboxRunnerConfig) {
    this.allowedImages = new Set(config.allowedImages);
    this.dockerPath = config.dockerPath ?? "docker";
    this.killGracePeriodMs = config.killGracePeriodMs ?? 1_000;
    if (!Number.isInteger(this.killGracePeriodMs) || this.killGracePeriodMs < 0) {
      throw new RangeError("killGracePeriodMs must be a non-negative integer.");
    }
  }

  async execute(request: SandboxRequest, options: SandboxOptions, signal?: AbortSignal): Promise<SandboxExecutionResult> {
    const policy = {
      image: options.image,
      maxMemoryMb: options.memoryLimitMb,
      maxCpuQuota: options.cpuQuota,
      networkMode: options.networkMode,
      pidsLimit: options.pidsLimit ?? 256,
      outputLimitBytes: options.outputLimitBytes ?? 1_048_576,
    } as const;
    validateSecurityPolicy(policy, this.allowedImages);
    validateEnvironment(request.environment);
    if (request.command.length === 0 || request.command.some((part) => part.includes("\0"))) {
      throw new Error("Sandbox command must contain non-empty, NUL-free arguments.");
    }
    const timeoutMs = options.timeoutMs;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMER_MS) {
      throw new Error(`Sandbox timeout must be between 1 and ${MAX_TIMER_MS} milliseconds.`);
    }
    if (signal?.aborted) throw abortError(signal.reason);

    const workspacePath = await realpath(options.workingDir);
    const workspaceStats = await stat(workspacePath);
    if (!workspaceStats.isDirectory()) throw new Error("Sandbox workspace must be an existing directory.");
    const containerWorkingDir = validateContainerWorkingDirectory(request.workingDir ?? "/workspace");
    if (containerWorkingDir !== "/workspace" && !containerWorkingDir.startsWith("/workspace/")) {
      throw new Error("Container working directory must be within /workspace.");
    }

    const args = [
      "run", "--rm", "--init", "--network=none", "--read-only",
      "--cap-drop=ALL", "--security-opt=no-new-privileges:true", "--pids-limit", String(policy.pidsLimit),
      "--memory", `${policy.maxMemoryMb}m`, "--cpus", String(policy.maxCpuQuota),
      "--user", "65532:65532", "--tmpfs", "/tmp:rw,noexec,nosuid,nodev,size=64m",
      "--mount", `type=bind,src=${workspacePath},dst=/workspace,rw`,
      "--workdir", containerWorkingDir,
    ];
    for (const [key, value] of Object.entries(request.environment ?? {})) args.push("--env", `${key}=${value}`);
    args.push(options.image, ...request.command);

    return this.runDocker(args, timeoutMs, policy.outputLimitBytes, signal);
  }

  private runDocker(args: string[], timeoutMs: number, outputLimitBytes: number, signal?: AbortSignal): Promise<SandboxExecutionResult> {
    return new Promise((resolve, reject) => {
      let child: ChildProcessWithoutNullStreams;
      try {
        child = spawn(this.dockerPath, args, { stdio: ["ignore", "pipe", "pipe"], shell: false });
      } catch (error) {
        reject(error);
        return;
      }

      let stdout = Buffer.alloc(0);
      let stderr = Buffer.alloc(0);
      let timedOut = false;
      let aborted = false;
      let outputExceeded = false;
      let settled = false;
      let killTimer: NodeJS.Timeout | undefined;
      const appendBounded = (current: Buffer, chunk: Buffer): Buffer => {
        const remaining = Math.max(0, outputLimitBytes - current.length);
        if (chunk.length > remaining) outputExceeded = true;
        return Buffer.concat([current, chunk.subarray(0, remaining)]);
      };
      const timeout = setTimeout(() => {
        timedOut = true;
        terminate();
      }, timeoutMs);
      const onAbort = () => {
        aborted = true;
        terminate();
      };
      const cleanup = () => {
        clearTimeout(timeout);
        if (killTimer) clearTimeout(killTimer);
        signal?.removeEventListener("abort", onAbort);
      };
      const terminate = () => {
        if (child.exitCode !== null || child.signalCode !== null) return;
        child.kill("SIGTERM");
        killTimer = setTimeout(() => child.kill("SIGKILL"), this.killGracePeriodMs);
        killTimer.unref();
      };
      const finishError = (error: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      signal?.addEventListener("abort", onAbort, { once: true });
      child.stdout.on("data", (chunk: Buffer) => { stdout = appendBounded(stdout, chunk); if (outputExceeded) terminate(); });
      child.stderr.on("data", (chunk: Buffer) => { stderr = appendBounded(stderr, chunk); if (outputExceeded) terminate(); });
      child.once("error", (error) => finishError(new Error(`Unable to start Docker sandbox: ${error.message}`, { cause: error })));
      child.once("close", (code, childSignal) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (aborted) {
          reject(abortError(signal?.reason));
          return;
        }
        if (timedOut) {
          reject(new Error(`Docker sandbox exceeded its ${timeoutMs}ms timeout.`));
          return;
        }
        if (outputExceeded) {
          reject(new Error(`Docker sandbox output exceeded ${outputLimitBytes} bytes.`));
          return;
        }
        resolve({
          exitCode: code ?? (childSignal ? 128 : 1),
          stdout: stdout.toString("utf8"),
          stderr: stderr.toString("utf8"),
        });
      });
      if (signal?.aborted) onAbort();
    });
  }
}

function abortError(reason: unknown): Error {
  return new Error("Docker sandbox execution was cancelled.", { cause: reason });
}
