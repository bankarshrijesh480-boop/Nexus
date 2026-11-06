import type { TaskDefinition } from "../../agent-sdk/src/contracts/task.js";

export interface RepositoryRef {
  readonly owner: string;
  readonly name: string;
  readonly baseBranch: string;
}

export interface PullRequestRequest {
  readonly title: string;
  readonly body: string;
  readonly headBranch: string;
  readonly baseBranch: string;
}

/** Integration seam; credentials and API implementation are intentionally out of scope here. */
export interface GitHubVcsConnector {
  checkout(repository: RepositoryRef, branchName: string): Promise<void>;
  createBranch(repository: RepositoryRef, branchName: string): Promise<void>;
  submitPullRequest(repository: RepositoryRef, request: PullRequestRequest): Promise<string>;
  taskBranchName(task: TaskDefinition): string;
}
