export interface GoalDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly repositories: readonly string[];
  readonly constraints?: readonly string[];
}

export interface ParsedGoal {
  readonly goal: GoalDefinition;
  readonly normalizedText: string;
}
