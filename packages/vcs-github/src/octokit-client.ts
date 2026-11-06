import { Octokit } from "@octokit/rest";

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

export class GitHubOctokitClient {
  constructor(private readonly octokit: Octokit) {}

  async cloneRepository(target: GitHubRepositoryTarget): Promise<string> {
    return `https://github.com/${target.owner}/${target.repo}.git`;
  }

  async createBranch(target: GitHubRepositoryTarget, branchName: string): Promise<void> {
    await this.octokit.git.createRef({
      owner: target.owner,
      repo: target.repo,
      ref: `refs/heads/${branchName}`,
      sha: await this.getBranchHeadSha(target),
    });
  }

  async commit(target: GitHubRepositoryTarget, message: string): Promise<string> {
    void target;
    void message;
    return "stub-commit-sha";
  }

  async createPullRequest(target: GitHubRepositoryTarget, spec: GitHubPullRequestSpec): Promise<string> {
    const response = await this.octokit.pulls.create({
      owner: target.owner,
      repo: target.repo,
      title: spec.title,
      head: spec.headBranch,
      base: spec.baseBranch,
      body: spec.body,
    });
    return response.data.html_url;
  }

  private async getBranchHeadSha(target: GitHubRepositoryTarget): Promise<string> {
    const ref = await this.octokit.repos.getBranch({
      owner: target.owner,
      repo: target.repo,
      branch: target.defaultBranch,
    });
    return ref.data.commit.sha;
  }
}
