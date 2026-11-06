import type { AgentRegistry } from "../../../../packages/agent-sdk/src/agents/agent.js";
import type {
  TaskDefinition,
  TaskPlan,
  TaskResult,
  WorkflowResult,
} from "../../../../packages/agent-sdk/src/contracts/task.js";
import { OrchestrationError, WorkflowExecutionError } from "../errors/orchestration-error.js";
import { validateTaskPlan } from "../planning/task-plan.js";

export interface OrchestratorOptions {
  /** Maximum number of independent tasks dispatched at once. */
  readonly maxConcurrency?: number;
}

/** Executes a validated dependency plan in bounded parallel waves. */
export class Orchestrator {
  private readonly maxConcurrency: number;

  constructor(
    private readonly agents: AgentRegistry,
    options: OrchestratorOptions = {},
  ) {
    this.maxConcurrency = options.maxConcurrency ?? 4;
    if (!Number.isInteger(this.maxConcurrency) || this.maxConcurrency < 1) {
      throw new RangeError("maxConcurrency must be a positive integer.");
    }
  }

  async execute(plan: TaskPlan, signal?: AbortSignal): Promise<WorkflowResult> {
    validateTaskPlan(plan);
    const pending = new Map(plan.tasks.map((task) => [task.id, task]));
    const completed = new Map<string, TaskResult>();

    while (pending.size > 0) {
      if (signal?.aborted) {
        throw new OrchestrationError("TASK_EXECUTION_FAILED", "Workflow was cancelled.", {
          reason: signal.reason,
        });
      }

      const ready = [...pending.values()].filter((task) =>
        task.dependsOn.every((id) => completed.has(id)),
      );
      // A valid DAG always has a ready task unless a prior task failed.
      if (ready.length === 0) {
        throw new OrchestrationError("INVALID_PLAN", "No runnable tasks remain in the plan.");
      }

      const waveFailures: { taskId: string; message: string }[] = [];
      for (let offset = 0; offset < ready.length; offset += this.maxConcurrency) {
        const batch = ready.slice(offset, offset + this.maxConcurrency);
        const settled = await Promise.allSettled(
          batch.map((task) => this.executeTask(plan, task, completed, signal)),
        );

        settled.forEach((result, index) => {
          const task = batch[index]!;
          pending.delete(task.id);
          if (result.status === "fulfilled") {
            completed.set(task.id, result.value);
          } else {
            waveFailures.push({ taskId: task.id, message: errorMessage(result.reason) });
          }
        });

        // Do not dispatch further tasks in this wave after a failed batch.
        if (waveFailures.length > 0) break;
      }

      if (waveFailures.length > 0) {
        throw new WorkflowExecutionError(waveFailures);
      }
    }

    return { goal: plan.goal, taskResults: completed };
  }

  private async executeTask(
    plan: TaskPlan,
    task: TaskDefinition,
    completed: ReadonlyMap<string, TaskResult>,
    signal?: AbortSignal,
  ): Promise<TaskResult> {
    const agent = this.agents.get(task.agentId);
    if (!agent) {
      throw new OrchestrationError(
        "AGENT_NOT_FOUND",
        `No agent is registered for id: ${task.agentId}`,
        { taskId: task.id, agentId: task.agentId },
      );
    }

    const dependencyResults = new Map<string, TaskResult>();
    for (const dependencyId of task.dependsOn) {
      dependencyResults.set(dependencyId, completed.get(dependencyId)!);
    }
    const result = await agent.execute(task, {
      goal: plan.goal,
      dependencyResults,
      signal,
    });
    if (result.taskId !== task.id) {
      throw new OrchestrationError(
        "TASK_EXECUTION_FAILED",
        `Agent ${agent.id} returned a result for a different task.`,
        { expectedTaskId: task.id, actualTaskId: result.taskId },
      );
    }
    return result;
  }
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}
