export type NetworkMode = "none" | "bridge" | "host";

export interface SandboxSecurityPolicy {
  readonly image: string;
  readonly maxMemoryMb: number;
  readonly maxCpuQuota: number;
  readonly networkMode: NetworkMode;
  readonly readOnlyRootFilesystem: boolean;
  readonly allowedMounts: readonly string[];
  readonly allowPrivileged: boolean;
}

export function defaultSecurityPolicy(
  image: string,
  memoryLimitMb: number,
  cpuQuota: number,
  networkMode: NetworkMode,
): SandboxSecurityPolicy {
  return {
    image,
    maxMemoryMb: Math.max(256, memoryLimitMb),
    maxCpuQuota: Math.max(0.5, cpuQuota),
    networkMode,
    readOnlyRootFilesystem: true,
    allowedMounts: ["/workspace", "/tmp"],
    allowPrivileged: false,
  };
}

export function validateSecurityPolicy(policy: SandboxSecurityPolicy): void {
  if (!policy.image.trim()) {
    throw new Error("Sandbox policy requires a non-empty container image name.");
  }
  if (policy.maxMemoryMb <= 0) {
    throw new Error("Sandbox policy requires a positive memory limit.");
  }
  if (policy.maxCpuQuota <= 0) {
    throw new Error("Sandbox policy requires a positive CPU quota.");
  }
  if (policy.allowPrivileged) {
    throw new Error("Privileged sandbox execution is not permitted.");
  }
  if (policy.networkMode === "host") {
    throw new Error("Host networking is forbidden for sandboxed task execution.");
  }
}
