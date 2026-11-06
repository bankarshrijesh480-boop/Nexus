import type { TaskPlan } from "../../../../packages/agent-sdk/src/contracts/task.js";
import type { GoalDefinition } from "../../../../packages/agent-sdk/src/contracts/goal.js";
import { validateTaskPlan } from "../planning/task-plan.js";
import { GoalParser } from "../planning/goal-parser.js";

export class TaskPlanner {
  constructor(private readonly parser: GoalParser = new GoalParser()) {}

  plan(goal: GoalDefinition): TaskPlan {
    const plan = this.parser.parse(goal);
    validateTaskPlan(plan);
    return plan;
  }
}
