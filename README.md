# fleet-engine

**fleet-engine** is an enterprise-oriented orchestration platform for coordinating engineering work across multiple repositories. This increment adds a concrete planning layer and a workflow runner that converts a goal into a task plan and executes the dependency-safe workflow with bounded parallelism and retry handling.

## Current architecture

The system is organized as a TypeScript/Node.js monorepo with four principal boundaries:

- **Orchestrator** accepts a high-level goal, validates dependency plans, and coordinates execution.
- **Agent SDK** defines task, goal, execution-context, and agent-registry contracts.
- **Sandbox** defines Docker-style execution boundaries and policy surfaces.
- **GitHub VCS connector** defines repository checkout, branch handling, and PR generation.

## Repository layout

```text
.
├── apps/orchestrator/src/
│   ├── errors/       # Typed orchestration errors and failure mapping
│   ├── planning/     # Goal parsing, dependency graph planning, task planner
│   └── workflow/     # Async execution coordination, retries, and state tracking
├── packages/
│   ├── agent-sdk/src/{agents,contracts}/
│   ├── sandbox/src/{executor,policies}/
│   └── vcs-github/src/
├── config/           # Local and deployment configuration examples
├── docs/             # Architecture decisions and operational guidance
├── tests/            # Orchestrator and execution-layer tests
├── README.md
└── package.json
```

## Execution layer highlights

This increment adds:

- `TaskPlanner` to convert issue text and metadata into a validated plan
- `WorkflowRunner` to execute dependency-safe task batches with bounded concurrency
- `RetryPolicy`/`ExecutionStateTracker` to provide structured retry and state reporting
- `GoalParser` and `DependencyGraph` primitives that turn goals into DAG ordering
- Sandbox and GitHub interfaces that are ready to be backed by real Docker/VM and GitHub API implementations

## Getting started

```bash
npm install
npm run typecheck
npm test
```

## Security and operations

- Require explicit authorization and repository allowlists before any orchestration begins.
- Use short-lived, least-privilege credentials and never hard-code secrets into plans or logs.
- Run task work in isolated runtimes with resource limits and default-deny networking.
- Keep repository changes reviewable through PRs and auditable execution records.

## License

No license has been selected yet.
