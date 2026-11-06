import path from "node:path";

export type NetworkMode = "none";

export interface SandboxSecurityPolicy {
  readonly image: string;
  readonly maxMemoryMb: number;
  readonly maxCpuQuota: number;
  readonly networkMode: NetworkMode;
  readonly pidsLimit: number;
  readonly outputLimitBytes: number;
}

const IMAGE_DIGEST_PATTERN = /^(?:[a-z0-9.-]+(?::[0-9]+)?\/)?[a-z0-9._/-]+@sha256:[a-f0-9]{64}$/i;

export function validateSecurityPolicy(policy: SandboxSecurityPolicy, allowedImages: ReadonlySet<string>): void {
  if (!IMAGE_DIGEST_PATTERN.test(policy.image) || !allowedImages.has(policy.image)) {
    throw new Error("Sandbox image must be an allowlisted, immutable sha256 digest reference.");
  }
  if (!Number.isFinite(policy.maxMemoryMb) || policy.maxMemoryMb < 128 || policy.maxMemoryMb > 65_536) {
    throw new Error("Sandbox memory limit must be between 128 and 65536 MiB.");
  }
  if (!Number.isFinite(policy.maxCpuQuota) || policy.maxCpuQuota <= 0 || policy.maxCpuQuota > 64) {
    throw new Error("Sandbox CPU quota must be greater than 0 and at most 64 cores.");
  }
  if (!Number.isInteger(policy.pidsLimit) || policy.pidsLimit < 16 || policy.pidsLimit > 4096) {
    throw new Error("Sandbox PID limit must be an integer between 16 and 4096.");
  }
  if (!Number.isInteger(policy.outputLimitBytes) || policy.outputLimitBytes < 1024) {
    throw new Error("Sandbox output limit must be at least 1024 bytes.");
  }
  if (policy.networkMode !== "none") {
    throw new Error("Sandbox network access is disabled; only networkMode 'none' is supported.");
  }
}

export function validateContainerWorkingDirectory(value: string): string {
  if (!value.startsWith("/") || value.includes("\0") || value.split("/").includes("..")) {
    throw new Error("Container working directory must be an absolute, normalized path.");
  }
  return path.posix.normalize(value);
}

export function validateEnvironment(environment: Readonly<Record<string, string>> = {}): void {
  for (const [key, value] of Object.entries(environment)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || key.startsWith("DOCKER_")) {
      throw new Error(`Invalid sandbox environment variable name: ${key}`);
    }
    if (value.includes("\0")) throw new Error(`Environment value for ${key} contains a NUL byte.`);
  }
}
