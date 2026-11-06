import { describe, expect, it } from "vitest";
import { InMemoryAgentRegistry, type TaskAgent } from "../packages/agent-sdk/src/agents/agent.js";
import type { TaskDefinition, TaskPlan, TaskResult } from "../packages/agent-sdk/src/contracts/task.js";
import { OrchestrationError, WorkflowExecutionError } from "../apps/orchestrator/src/errors/orchestration-error.js";
import { validateTaskPlan } from "../apps/orchestrator/src/planning/task-plan.js";
import { Orchestrator } from "../apps/orchestrator/src/workflow/orchestrator.js";

const task = (id: string, dependsOn: string[] = []): TaskDefinition => ({
  id,
  description: `Task ${id}`,
  agentId: "worker",
  dependsOn,
});

const plan = (...tasks: TaskDefinition[]): TaskPlan => ({ goal: "test goal", tasks });

function agent(
  execute: (task: TaskDefinition) => Promise<TaskResult> | TaskResult = async (item) => ({ taskId: item.id }),
): TaskAgent {
  return { id: "worker", execute: async (item) => execute(item) };
}

describe("validateTaskPlan", () => {
  it("rejects unknown dependencies", () => {
    expect(() => validateTaskPlan(plan(task("a", ["missing"])))).toThrow(OrchestrationError);
  });

  it("rejects dependency cycles", () => {
    expect(() => validateTaskPlan(plan(task("a", ["b"]), task("b", ["a"])))).toThrow(/cycle/i);
  });

  it("accepts a valid dependency graph", () => {
    expect(() => validateTaskPlan(plan(task("a"), task("b", ["a"])))).not.toThrow();
  });
});

describe("Orchestrator", () => {
  it("runs independent tasks in parallel and waits for dependencies", async () => {
    let active = 0;
    let maximumActive = 0;
    const executionOrder: string[] = [];
    const worker = agent(async (item) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      executionOrder.push(item.id);
      return { taskId: item.id };
    });
    const orchestrator = new Orchestrator(new InMemoryAgentRegistry([worker]), { maxConcurrency: 2 });

    const result = await orchestrator.execute(plan(task("a"), task("b"), task("c", ["a", "b"])));

    expect(maximumActive).toBe(2);
    expect(executionOrder.slice(0, 2)).toEqual(expect.arrayContaining(["a", "b"]));
    expect(executionOrder[2]).toBe("c");
    expect(result.taskResults.size).toBe(3);
  });

  it("bounds parallel task dispatch", async () => {
    let active = 0;
    let maximumActive = 0;
    const worker = agent(async (item) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return { taskId: item.id };
    });
    const orchestrator = new Orchestrator(new InMemoryAgentRegistry([worker]), { maxConcurrency: 2 });

    await orchestrator.execute(plan(task("a"), task("b"), task("c"), task("d")));

    expect(maximumActive).toBe(2);
  });

  it("returns structured failure details and does not run dependent tasks", async () => {
    const ran: string[] = [];
    const worker = agent(async (item) => {
      ran.push(item.id);
      if (item.id === "a") throw new Error("agent failed");
      return { taskId: item.id };
    });
    const orchestrator = new Orchestrator(new InMemoryAgentRegistry([worker]));

    await expect(orchestrator.execute(plan(task("a"), task("b", ["a"]))))
      .rejects.toMatchObject<Partial<WorkflowExecutionError>>({
        code: "TASK_EXECUTION_FAILED",
        failures: [{ taskId: "a", message: "agent failed" }],
      });
    expect(ran).toEqual(["a"]);
  });

  it("rejects a pre-cancelled workflow", async () => {
    const controller = new AbortController();
    controller.abort("cancelled by test");
    const orchestrator = new Orchestrator(new InMemoryAgentRegistry([agent()]));

    await expect(orchestrator.execute(plan(task("a")), controller.signal))
      .rejects.toMatchObject({ code: "TASK_EXECUTION_FAILED" });
  });
});
