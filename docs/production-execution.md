# Production execution layer

The production execution increment adds a fail-closed Docker command runner and an Octokit Git database adapter.

## Docker sandbox

`DockerSandboxRunner` requires a configured exact allowlist of container images pinned by sha256 digest. It invokes Docker via `spawn` with an argument array (never a shell), mounts only the resolved workspace, disables networking, makes the container root filesystem read-only, drops Linux capabilities, enables `no-new-privileges`, runs as an unprivileged UID, and applies CPU, memory, PID, timeout, and bounded-output limits. Cancellation and timeout send SIGTERM and then SIGKILL after a grace period.

The host Docker daemon remains a critical trust boundary. Run it on dedicated, patched workers; do not expose its socket to task containers; restrict who can configure allowed images and workspaces; and use an additional VM/microVM isolation layer for hostile workloads. The sandbox does not prevent malicious code from modifying files inside its explicitly mounted workspace.

Example construction:

```ts
const sandbox = new DockerSandboxRunner({
  allowedImages: ["registry.example.com/worker@sha256:<64-hex-digest>"],
});
```

The executor accepts an argument vector, not a shell string. Network access is deliberately not configurable beyond `none` in this implementation.

## GitHub connector

`GitHubOctokitClient` takes an authenticated `Octokit` instance (create it with a short-lived, least-privilege token). It creates branches from the configured default branch, creates multi-file commits through the Git database API, and opens pull requests. File paths and branch names are validated; the branch update is non-force. `cloneRepository` returns the public clone URL only and does not perform a clone. Never place tokens in clone URLs or task payloads.

## Validation

Run `npm install`, `npm run typecheck`, and `npm test`. These adapters are production-oriented components but still require integration testing against a dedicated Docker worker and GitHub test repository before deployment.
