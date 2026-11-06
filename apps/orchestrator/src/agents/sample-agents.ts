import type { TaskDefinition, TaskResult } from "../../../../packages/agent-sdk/src/contracts/task.js";
import type { TaskAgent } from "../../../../packages/agent-sdk/src/agents/agent.js";

export class DependencyBumpAgent implements TaskAgent {
  readonly id = "dependency-agent";

  async execute(task: TaskDefinition): Promise<TaskResult> {
    return { taskId: task.id, output: { status: "dependency-check-complete", repository: task.input }, metadata: { agent: this.id } };
  }
}

export class RefactorAgent implements TaskAgent {
  readonly id = "refactor-agent";

  async execute(task: TaskDefinition): Promise<TaskResult> {
    return { taskId: task.id, output: { status: "refactor-complete", repository: task.input }, metadata: { agent: this.id } };
  }
}

export class LintAgent implements TaskAgent {
  readonly id = "lint-agent";

  async execute(task: TaskDefinition): Promise<TaskResult> {
    return { taskId: task.id, output: { status: "lint-complete", repository: task.input }, metadata: { agent: this.id } };
  }
}

export class TestAgent implements TaskAgent {
  readonly id = "test-agent";

  async execute(task: TaskDefinition): Promise<TaskResult> {
    return { taskId: task.id, output: { status: "test-complete", repository: task.input }, metadata: { agent: this.id } };
  }
}

export class DocsAgent implements TaskAgent {
  readonly id = "docs-agent";

  async execute(task: TaskDefinition): Promise<TaskResult> {
    return { taskId: task.id, output: { status: "docs-complete", repository: task.input }, metadata: { agent: this.id } };
  }
}

export class PlannerAgent implements TaskAgent {
  readonly id = "planner";

  async execute(task: TaskDefinition): Promise<TaskResult> {
    return { taskId: task.id, output: { status: "plan-approved", repository: task.input }, metadata: { agent: this.id } };
  }
}
