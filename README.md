# fleet-engine

**fleet-engine** is an enterprise-oriented orchestration platform for coordinating engineering work across multiple repositories. This increment adds the goal parsing and execution-layer primitives needed to transform a high-level issue into an actionable dependency graph and prepare the system for isolated execution.

## Current architecture

The system is organized as a TypeScript/Node.js monorepo with four principal boundaries:

- **Orchestrator** accepts a high-level goal, validates dependency plans, and coordinates execution.
- **Agent SDK** defines task, goal, and execution contracts.
- **Sandbox** defines Docker-style execution boundaries and policy surfaces.
- **GitHub VCS connector** defines repository checkout, branch handling, and pull request operations.

## Repository layout

```text
.
├── apps/orchestrator/src/
│   ├── errors/       # Typed orchestration errors and failure mapping
│   ├── planning/     # Goal parsing and dependency graph planning
│   └── workflow/     # Async execution coordination, retries, and state tracking
├── packages/
│   ├── agent-sdk/src/{agents,contracts}/
│   ├── sandbox/src/{executor,policies}/
│   └── vcs-github/src/
├── config/           # Local and deployment configuration examples
├── docs/             # Architecture decisions and operational guidance
├── tests/            # Orchestrator and execution-layer tests
└── README.md
```

## Execution layer highlights

This increment adds:

- `GoalParser` to convert issue text into tasks based on heuristics and repository context
- `DependencyGraph` for DAG validation and topological ordering
- `ExecutionStateTracker` to maintain task lifecycle state
- `RetryPolicy` helper for delay/backoff scheduling
- `DockerSandbox` interface stub to define isolated execution semantics
- `GitHubClientAdapter` to define repository and PR actions behind a typed boundary

## Getting started

```bash
npm install
npm run typecheck
npm test
```

## Security and operations

- Require explicit authorization and repository allowlists before any orchestration begins.
- Use short-lived, least-privilege credentials and never hard-code secrets into plans or logs.
- Run task work in actual isolated runtimes, with resource limits and default-deny networking.
- Keep repository changes reviewable through PRs and auditable execution records.

## License

No license has been selected yet.
