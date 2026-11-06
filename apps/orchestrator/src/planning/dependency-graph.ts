import type { TaskDefinition } from "../../../../packages/agent-sdk/src/contracts/task.js";

export type DependencyEdge = {
  readonly from: string;
  readonly to: string;
};

/**
 * Small DAG-oriented helper used to formalize task ordering once a plan is built.
 */
export class DependencyGraph {
  private readonly adjacency = new Map<string, Set<string>>();

  constructor(tasks: readonly TaskDefinition[]) {
    for (const task of tasks) {
      this.adjacency.set(task.id, new Set(task.dependsOn));
    }
  }

  getTopologicalOrder(): string[] {
    const inDegree = new Map<string, number>();
    for (const [taskId, dependencies] of this.adjacency.entries()) {
      inDegree.set(taskId, dependencies.size);
    }

    const ready: string[] = [...inDegree.entries()]
      .filter(([, degree]) => degree === 0)
      .map(([taskId]) => taskId);

    const order: string[] = [];
    while (ready.length > 0) {
      const taskId = ready.shift()!;
      order.push(taskId);
      for (const [candidateId, dependencies] of this.adjacency.entries()) {
        if (!dependencies.has(taskId)) continue;
        const nextDegree = (inDegree.get(candidateId) ?? 0) - 1;
        inDegree.set(candidateId, nextDegree);
        if (nextDegree === 0) ready.push(candidateId);
      }
    }

    if (order.length !== this.adjacency.size) {
      throw new Error("Dependency graph contains a cycle.");
    }

    return order;
  }

  getEdges(): DependencyEdge[] {
    const edges: DependencyEdge[] = [];
    for (const [taskId, dependencies] of this.adjacency.entries()) {
      for (const dependency of dependencies) {
        edges.push({ from: dependency, to: taskId });
      }
    }
    return edges;
  }
}
