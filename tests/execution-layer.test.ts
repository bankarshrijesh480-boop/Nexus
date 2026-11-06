import { describe, expect, it } from "vitest";
import { GoalParser } from "../apps/orchestrator/src/planning/goal-parser.js";
import { DependencyGraph } from "../apps/orchestrator/src/planning/dependency-graph.js";
import { ExecutionStateTracker } from "../apps/orchestrator/src/workflow/execution-state.js";

const goalParser = new GoalParser();

describe("GoalParser", () => {
  it("creates a dependency-aware task plan from a goal description", () => {
    const plan = goalParser.parse({
      id: "goal-1",
      title: "Modernize dependencies and add coverage",
      description: "Upgrade dependencies and refactor the API before running tests and docs updates.",
      repositories: ["platform/api"],
    });

    expect(plan.goal).toBe("Modernize dependencies and add coverage");
    expect(plan.tasks.length).toBeGreaterThan(0);
    expect(plan.tasks[0]?.dependsOn).toEqual([]);
    expect(plan.tasks[1]?.dependsOn).toContain("task-1");
  });
});

describe("DependencyGraph", () => {
  it("returns a valid topological order", () => {
    const graph = new DependencyGraph([
      { id: "a", description: "A", agentId: "planner", dependsOn: [] },
      { id: "b", description: "B", agentId: "planner", dependsOn: ["a"] },
      { id: "c", description: "C", agentId: "planner", dependsOn: ["a"] },
    ]);

    expect(graph.getTopologicalOrder()).toEqual(["a", "b", "c"]);
  });
});

describe("ExecutionStateTracker", () => {
  it("tracks execution lifecycle transitions", () => {
    const tracker = new ExecutionStateTracker();
    tracker.markStarted("task-1");
    tracker.markSucceeded("task-1");

    expect(tracker.get("task-1")?.status).toBe("succeeded");
  });
});
