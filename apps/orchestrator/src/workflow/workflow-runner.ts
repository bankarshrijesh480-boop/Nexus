import type { AgentRegistry } from "../../../../packages/agent-sdk/src/agents/agent.js";
import type {
  TaskDefinition,
  TaskPlan,
  TaskResult,
  WorkflowResult,
} from "../../../../packages/agent-sdk/src/contracts/task.js";
import { OrchestrationError, WorkflowExecutionError } from "../errors/orchestration-error.js";
import { validateTaskPlan } from "../planning/task-plan.js";
import { ExecutionStateTracker } from "./execution-state.js";
import { DefaultRetryPolicy, getRetryDelayMs, type RetryPolicy } from "./retry-policy.js";

export interface WorkflowRunnerOptions {
  readonly maxConcurrency?: number;
  readonly retryPolicy?: RetryPolicy;
}

export class WorkflowRunner {
  private readonly maxConcurrency: number;
  private readonly retryPolicy: RetryPolicy;

  constructor(
    private readonly agents: AgentRegistry,
    options: WorkflowRunnerOptions = {},
  ) {
    this.maxConcurrency = options.maxConcurrency ?? 4;
    this.retryPolicy = options.retryPolicy ?? new DefaultRetryPolicy();
  }

  async run(plan: TaskPlan, signal?: AbortSignal): Promise<WorkflowResult> {
    validateTaskPlan(plan);

    const pending = new Map(plan.tasks.map((task) => [task.id, task]));
    const completed = new Map<string, TaskResult>();
    const tracker = new ExecutionStateTracker();

    while (pending.size > 0) {
      if (signal?.aborted) {
        throw new OrchestrationError("TASK_EXECUTION_FAILED", "Workflow was cancelled.", {
          reason: signal.reason,
        });
      }

      const ready = [...pending.values()].filter((task) => task.dependsOn.every((id) => completed.has(id)));
      if (ready.length === 0) {
        const blocked = [...pending.keys()];
        throw new WorkflowExecutionError(
          blocked.map((taskId) => ({
            taskId,
            message: `Task is blocked by unmet dependencies: ${pending.get(taskId)?.dependsOn.join(", ") ?? "n/a"}`,
          })),
        );
      }

      const batch = ready.slice(0, this.maxConcurrency);
      const failures: { taskId: string; message: string }[] = [];

      for (const task of batch) {
        try {
          tracker.markStarted(task.id);
          const result = await this.executeWithRetry(task, plan, completed, signal, tracker);
          completed.set(task.id, result);
          tracker.markSucceeded(task.id);
          pending.delete(task.id);
        } catch (error) {
          tracker.markFailed(task.id, error instanceof Error ? error : String(error));
          failures.push({
            taskId: task.id,
            message: error instanceof Error ? error.message : String(error),
          });
          pending.delete(task.id);
        }
      }

      if (failures.length > 0) {
        throw new WorkflowExecutionError(failures);
      }
    }

    return {
      goal: plan.goal,
      taskResults: completed,
    };
  }

  private async executeWithRetry(
    task: TaskDefinition,
    plan: TaskPlan,
    completed: ReadonlyMap<string, TaskResult>,
    signal: AbortSignal | undefined,
    tracker: ExecutionStateTracker,
  ): Promise<TaskResult> {
    const dependencyResults = new Map<string, TaskResult>();
    for (const dependencyId of task.dependsOn) {
      const result = completed.get(dependencyId);
      if (!result) {
        throw new OrchestrationError(
          "INVALID_PLAN",
          `Dependency result missing for task ${task.id}: ${dependencyId}`,
          { taskId: task.id, dependencyId },
        );
      }
      dependencyResults.set(dependencyId, result);
    }

    let attempt = 0;
    while (attempt < this.retryPolicy.maxAttempts) {
      attempt += 1;
      const agent = this.agents.get(task.agentId);
      if (!agent) {
        throw new OrchestrationError(
          "AGENT_NOT_FOUND",
          `No agent is registered for id: ${task.agentId}`,
          { taskId: task.id, agentId: task.agentId },
        );
      }

      try {
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
      } catch (error) {
        if (attempt >= this.retryPolicy.maxAttempts) {
          throw error;
        }
        await this.delay(getRetryDelayMs(this.retryPolicy, attempt), signal);
        tracker.markStarted(task.id);
      }
    }

    throw new OrchestrationError("TASK_EXECUTION_FAILED", `Task execution exceeded retry budget: ${task.id}`);
  }

  private delay(ms: number, signal?: AbortSignal): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      const onAbort = () => {
        clearTimeout(timer);
        reject(new OrchestrationError("TASK_EXECUTION_FAILED", "Workflow was cancelled during retry delay.", {
          reason: signal?.reason,
        }));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      };
      Promise.resolve().then(cleanup).catch(cleanup);
    });
  }
}
