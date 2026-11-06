export interface GitHubRepositoryTarget {
  readonly owner: string;
  readonly repo: string;
  readonly defaultBranch: string;
}

export interface GitHubPullRequestSpec {
  readonly title: string;
  readonly body: string;
  readonly headBranch: string;
  readonly baseBranch: string;
}

export interface GitHubClient {
  cloneRepository(target: GitHubRepositoryTarget): Promise<string>;
  createBranch(target: GitHubRepositoryTarget, branchName: string): Promise<void>;
  commit(target: GitHubRepositoryTarget, message: string): Promise<string>;
  createPullRequest(target: GitHubRepositoryTarget, spec: GitHubPullRequestSpec): Promise<string>;
}

/**
 * The GitHub API adapter remains intentionally thin so credentials and runtime integration
 * can be layered in without constraining task orchestration contracts.
 */
export class GitHubClientAdapter implements GitHubClient {
  async cloneRepository(target: GitHubRepositoryTarget): Promise<string> {
    return `https://github.com/${target.owner}/${target.repo}.git`;
  }

  async createBranch(target: GitHubRepositoryTarget, branchName: string): Promise<void> {
    void target;
    void branchName;
  }

  async commit(target: GitHubRepositoryTarget, message: string): Promise<string> {
    void target;
    void message;
    return "stub-commit-sha";
  }

  async createPullRequest(target: GitHubRepositoryTarget, spec: GitHubPullRequestSpec): Promise<string> {
    void target;
    void spec;
    return "stub-pr-url";
  }
}
