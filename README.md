# fleet-engine

**fleet-engine** is an enterprise-oriented orchestration platform for coordinating engineering work across multiple repositories. This repository is being built incrementally; it currently contains the initial architecture, typed task and agent contracts, a dependency-aware orchestration stub, and sandbox/VCS adapter interfaces.

## Architecture

The system is organized as a TypeScript/Node.js monorepo with four boundaries:

- **Orchestrator** accepts a high-level goal, validates a dependency plan, and coordinates task execution with bounded concurrency.
- **Agent SDK** defines task, result, execution-context, and agent-registry contracts. Agent implementations remain replaceable.
- **Sandbox** defines the isolation executor contract and resource/network policy inputs; it is not yet a production sandbox implementation.
- **GitHub VCS connector** defines repository checkout, branch, and pull request operations; no live GitHub API integration is wired up yet.

Intended flow: goal intake → dependency-aware plan → bounded task dispatch → sandboxed execution → validation → reviewable changes and pull requests.

## Repository layout

```text
.
├── apps/orchestrator/src/
│   ├── errors/       # Typed orchestration errors and failure mapping
│   ├── planning/     # Dependency plan validation
│   └── workflow/     # Asynchronous task coordination
├── packages/
│   ├── agent-sdk/src/{agents,contracts}/
│   ├── sandbox/src/{executor,policies}/
│   └── vcs-github/src/
├── config/           # Local and deployment configuration examples
├── docs/             # Architecture decisions and operational guidance
└── tests/            # Orchestrator and cross-package tests
```

## Getting started

Requires Node.js 20 or newer. Install dependencies and run the checks:

```bash
npm install
npm run typecheck
npm test
```

## Development status

Current code is foundational scaffolding. It validates dependency references and cycles, schedules ready tasks in bounded parallel batches, passes dependency results and cancellation signals to agents, and reports task failures. It does not yet parse GitHub issues into plans, run task code in containers/VMs, access credentials, clone repositories, or open pull requests.

## Security and operations

- Require explicit authorization and repository allowlists for every goal.
- Use short-lived, least-privilege credentials; never place secrets in task payloads or logs.
- Run task code in a real isolated environment with resource limits and a deny-by-default network policy before enabling autonomous changes. The current sandbox module is only an interface.
- Keep execution auditable and route proposed changes through reviewable pull requests.
- Bound parallelism and define timeout, cancellation, retry, cleanup, and idempotency behavior.

## License

No license has been selected yet.
