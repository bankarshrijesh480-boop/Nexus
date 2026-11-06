#!/usr/bin/env node

import process from "node:process";
import { InMemoryAgentRegistry } from "../../../../packages/agent-sdk/src/agents/agent.js";
import type { GoalDefinition } from "../../../../packages/agent-sdk/src/contracts/goal.js";
import { TaskPlanner } from "../planning/task-planner.js";
import { WorkflowRunner } from "../workflow/workflow-runner.js";
import { DependencyBumpAgent, DocsAgent, LintAgent, PlannerAgent, RefactorAgent, TestAgent } from "../agents/sample-agents.js";

const goal: GoalDefinition = {
  id: "fleet-demo-goal",
  title: "Modernize dependency versions and validate the API",
  description: "Upgrade dependencies, refactor the API surface, run linting, verify tests, and update docs.",
  repositories: ["services/api", "services/web"],
  constraints: ["keep backward compatibility", "do not expand network access"],
};

const registry = new InMemoryAgentRegistry([
  new PlannerAgent(),
  new DependencyBumpAgent(),
  new RefactorAgent(),
  new LintAgent(),
  new TestAgent(),
  new DocsAgent(),
]);

const planner = new TaskPlanner();
const workflow = planner.plan(goal);
const runner = new WorkflowRunner(registry, { maxConcurrency: 2 });

const run = async () => {
  try {
    const result = await runner.run(workflow);
    console.log(JSON.stringify({ goal: goal.title, tasks: Array.from(result.taskResults.values()) }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
};

run();
