import { describe, expect, it } from "vitest";
import { validateContainerWorkingDirectory, validateEnvironment, validateSecurityPolicy } from "../packages/sandbox/src/executor/security-policy.js";

const image = "registry.example.com/worker@sha256:" + "a".repeat(64);
const allowed = new Set([image]);
const policy = {
  image,
  maxMemoryMb: 512,
  maxCpuQuota: 1,
  networkMode: "none" as const,
  pidsLimit: 128,
  outputLimitBytes: 16_384,
};

describe("sandbox security policy", () => {
  it("accepts an allowlisted immutable image and bounded limits", () => {
    expect(() => validateSecurityPolicy(policy, allowed)).not.toThrow();
  });

  it("rejects unpinned or non-allowlisted images", () => {
    expect(() => validateSecurityPolicy({ ...policy, image: "latest" }, allowed)).toThrow(/allowlisted/);
    expect(() => validateSecurityPolicy({ ...policy, image: image.replace(/a+$/, "b".repeat(64)) }, allowed)).toThrow(/allowlisted/);
  });

  it("rejects host network and unsafe resource values", () => {
    expect(() => validateSecurityPolicy({ ...policy, networkMode: "host" as "none" }, allowed)).toThrow();
    expect(() => validateSecurityPolicy({ ...policy, pidsLimit: 0 }, allowed)).toThrow(/PID/);
  });

  it("confines container working directories to normalized workspace paths", () => {
    expect(validateContainerWorkingDirectory("/workspace/src")).toBe("/workspace/src");
    expect(() => validateContainerWorkingDirectory("/workspace/../etc")).toThrow();
  });

  it("validates environment variable names and values", () => {
    expect(() => validateEnvironment({ SAFE_VALUE: "ok" })).not.toThrow();
    expect(() => validateEnvironment({ "BAD-NAME": "no" })).toThrow();
  });
});
