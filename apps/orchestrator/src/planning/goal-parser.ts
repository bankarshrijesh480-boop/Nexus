import type { TaskDefinition, TaskPlan } from "./task.js";
import type { GoalDefinition } from "./goal.js";

/**
 * Parses a raw issue or goal statement into a dependency-aware task plan.
 * This intentionally keeps the implementation heuristic-based and deterministic,
 * so it can be replaced by a richer LLM or rules engine later.
 */
export class GoalParser {
  parse(goal: GoalDefinition): TaskPlan {
    const normalized = goal.description.trim();
    const tasks: TaskDefinition[] = [];

    const repositoryNames = goal.repositories.length > 0
      ? goal.repositories
      : ["shared-repo"];

    const discoveredActions = this.extractActions(normalized);
    for (let index = 0; index < discoveredActions.length; index += 1) {
      const action = discoveredActions[index]!;
      const dependsOn = discoveredActions
        .slice(0, index)
        .map((item) => item.id);

      tasks.push({
        id: action.id,
        description: action.description,
        agentId: action.agentId,
        dependsOn,
        input: {
          repository: repositoryNames[0],
          goalTitle: goal.title,
          action,
        },
      });
    }

    if (tasks.length === 0) {
      tasks.push({
        id: "plan-init",
        description: "Initialize context and confirm execution scope.",
        agentId: "planner",
        dependsOn: [],
        input: {
          repository: repositoryNames[0],
          goalTitle: goal.title,
        },
      });
    }

    return {
      goal: goal.title,
      tasks,
    };
  }

  private extractActions(text: string): Array<{ id: string; description: string; agentId: string }> {
    const actionMap = [
      {
        keyword: /dependency|bump|upgrade|version/i,
        description: "Review dependency definitions and update compatible versions.",
        agentId: "dependency-agent",
      },
      {
        keyword: /refactor|cleanup|simplify|rename/i,
        description: "Refactor affected code paths and normalize interfaces.",
        agentId: "refactor-agent",
      },
      {
        keyword: /lint|format|style|quality/i,
        description: "Run linting and formatting checks on the impacted modules.",
        agentId: "lint-agent",
      },
      {
        keyword: /test|validate|verify|coverage/i,
        description: "Validate behavior with unit and integration checks.",
        agentId: "test-agent",
      },
      {
        keyword: /docs|readme|documentation/i,
        description: "Update the documentation and operational notes for the change.",
        agentId: "docs-agent",
      },
    ];

    const matches: Array<{ id: string; description: string; agentId: string }> = [];
    for (const [index, entry] of actionMap.entries()) {
      if (entry.keyword.test(text)) {
        matches.push({
          id: `task-${index + 1}`,
          description: entry.description,
          agentId: entry.agentId,
        });
      }
    }

    return matches;
  }
}
