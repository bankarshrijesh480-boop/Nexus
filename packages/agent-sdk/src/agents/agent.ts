import type { TaskDefinition, TaskResult } from "../contracts/task.js";

export interface AgentExecutionContext {
  readonly goal: string;
  /** Results from the task's declared dependencies only. */
  readonly dependencyResults: ReadonlyMap<string, TaskResult>;
  readonly signal?: AbortSignal;
}

export interface TaskAgent {
  readonly id: string;
  execute(task: TaskDefinition, context: AgentExecutionContext): Promise<TaskResult>;
}

export interface AgentRegistry {
  get(agentId: string): TaskAgent | undefined;
}

export class InMemoryAgentRegistry implements AgentRegistry {
  private readonly agents = new Map<string, TaskAgent>();

  constructor(agents: readonly TaskAgent[] = []) {
    for (const agent of agents) {
      if (this.agents.has(agent.id)) {
        throw new Error(`Duplicate agent id: ${agent.id}`);
      }
      this.agents.set(agent.id, agent);
    }
  }

  get(agentId: string): TaskAgent | undefined {
    return this.agents.get(agentId);
  }
}
