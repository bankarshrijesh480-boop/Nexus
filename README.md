# fleet-engine

**fleet-engine** is an enterprise-oriented orchestration platform for coordinating engineering work across multiple repositories. This first increment establishes the repository structure and architectural boundaries. Executable orchestration, agent implementations, sandbox integrations, and GitHub API calls will be added in later increments.

## Architecture

The initial system is organized as a TypeScript/Node.js monorepo with four principal boundaries:

- **Orchestrator** accepts a high-level goal, plans task dependencies, and coordinates task execution.
- **Agent SDK** defines stable contracts for task requests, agent capabilities, and results while keeping implementations replaceable.
- **Sandbox** provides isolated execution interfaces and policy boundaries for task work.
- **GitHub VCS connector** encapsulates repository operations such as checkout, branch creation, and pull request submission.

The intended workflow is: goal intake → dependency-aware plan → bounded parallel task dispatch → sandboxed execution → validation → reviewable changes and pull requests.

## Repository layout

```text
.
├── apps/
│   └── orchestrator/
│       └── src/
│           ├── errors/          # Typed orchestration errors and failure mapping
│           ├── planning/        # Goal parsing and dependency graph planning
│           └── workflow/        # Async coordination and task lifecycle
├── packages/
│   ├── agent-sdk/
│   │   └── src/
│   │       ├── agents/          # Agent capability and registry abstractions
│   │       └── contracts/       # Shared task, result, and status types
│   ├── sandbox/
│   │   └── src/
│   │       ├── executor/        # Isolated runner interfaces and adapters
│   │       └── policies/        # Resource, network, and filesystem policy hooks
│   └── vcs-github/
│       └── src/                 # GitHub repository, branch, and PR adapter
├── config/                      # Local and deployment configuration examples
├── docs/                        # Architecture decisions and operational guidance
└── tests/                       # Cross-package integration test scaffolding
```

## Development status

This commit is structural scaffolding only. It does not execute agent tasks, access credentials, clone repositories, or create branches or pull requests. The next increment can add typed task and agent contracts, followed by dependency-aware orchestration with structured errors and bounded asynchronous execution.

## Security and operations

- Require explicit authorization and repository allowlists for every goal.
- Use short-lived, least-privilege credentials; never place secrets in task payloads or logs.
- Run task code in isolated environments with resource limits and a deny-by-default network policy.
- Keep execution auditable and route proposed changes through reviewable pull requests.
- Bound parallelism and define timeout, cancellation, retry, and cleanup behavior.

## License

No license has been selected yet.
