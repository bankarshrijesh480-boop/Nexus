import type { TaskDefinition, TaskPlan } from "../../../../packages/agent-sdk/src/contracts/task.js";
import { OrchestrationError } from "../errors/orchestration-error.js";

/** Validate task identifiers and dependency references, and reject cycles. */
export function validateTaskPlan(plan: TaskPlan): void {
  const taskIds = new Set<string>();
  for (const task of plan.tasks) {
    if (!task.id.trim() || taskIds.has(task.id)) {
      throw new OrchestrationError("INVALID_PLAN", `Task id is empty or duplicated: ${task.id}`);
    }
    taskIds.add(task.id);
  }

  const tasksById = new Map(plan.tasks.map((task) => [task.id, task]));
  for (const task of plan.tasks) {
    const dependencies = new Set<string>();
    for (const dependencyId of task.dependsOn) {
      if (dependencyId === task.id || !tasksById.has(dependencyId)) {
        throw new OrchestrationError(
          "INVALID_PLAN",
          `Task ${task.id} references an invalid dependency: ${dependencyId}`,
          { taskId: task.id, dependencyId },
        );
      }
      if (dependencies.has(dependencyId)) {
        throw new OrchestrationError(
          "INVALID_PLAN",
          `Task ${task.id} declares dependency ${dependencyId} more than once.`,
        );
      }
      dependencies.add(dependencyId);
    }
  }

  if (hasDependencyCycle(plan.tasks, tasksById)) {
    throw new OrchestrationError("INVALID_PLAN", "Task dependencies contain a cycle.");
  }
}

function hasDependencyCycle(
  tasks: readonly TaskDefinition[],
  tasksById: ReadonlyMap<string, TaskDefinition>,
): boolean {
  const indegree = new Map(tasks.map((task) => [task.id, task.dependsOn.length]));
  const dependents = new Map<string, string[]>();
  for (const task of tasks) {
    for (const dependency of task.dependsOn) {
      const entries = dependents.get(dependency) ?? [];
      entries.push(task.id);
      dependents.set(dependency, entries);
    }
  }

  const ready = tasks.filter((task) => indegree.get(task.id) === 0).map((task) => task.id);
  let visited = 0;
  while (ready.length > 0) {
    const id = ready.pop()!;
    visited += 1;
    for (const dependentId of dependents.get(id) ?? []) {
      const next = indegree.get(dependentId)! - 1;
      indegree.set(dependentId, next);
      if (next === 0) ready.push(dependentId);
    }
  }
  return visited !== tasksById.size;
}
