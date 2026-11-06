import { describe, expect, it } from "vitest";
import { InMemoryAgentRegistry, type TaskAgent } from "../packages/agent-sdk/src/agents/agent.js";
import type { TaskDefinition, TaskResult } from "../packages/agent-sdk/src/contracts/task.js";
import { TaskPlanner } from "../apps/orchestrator/src/planning/task-planner.js";
import { WorkflowRunner } from "../apps/orchestrator/src/workflow/workflow-runner.js";

const task = (id: string, dependsOn: string[] = [], agentId = "worker"): TaskDefinition => ({
  id,
  description: `Task ${id}`,
  agentId,
  dependsOn,
});

function agentFactory(
  fn: (task: TaskDefinition) => Promise<TaskResult> | TaskResult,
): TaskAgent {
  return {
    id: "worker",
    execute: async (task) => fn(task),
  };
}

describe("TaskPlanner", () => {
  it("converts a goal into a valid task plan", () => {
    const planner = new TaskPlanner();
    const plan = planner.plan({
      id: "goal-1",
      title: "Upgrade dependencies and validate behavior",
      description: "Upgrade dependencies, refactor APIs, run tests, and update docs.",
      repositories: ["services/api"],
    });

    expect(plan.tasks.length).toBeGreaterThan(0);
    expect(plan.tasks[0]?.dependsOn).toEqual([]);
  });
});

describe("WorkflowRunner", () => {
  it("runs a dependency-ordered workflow and aggregates results", async () => {
    const worker = agentFactory(async (item) => ({ taskId: item.id }));
    const runner = new WorkflowRunner(new InMemoryAgentRegistry([worker]), { maxConcurrency: 2 });

    const result = await runner.run({
      goal: "validate dependency workflow",
      tasks: [task("a"), task("b", ["a"]), task("c", ["b"])],
    });

    expect(result.taskResults.size).toBe(3);
    expect(Array.from(result.taskResults.keys())).toEqual(["a", "b", "c"]);
  });
});
