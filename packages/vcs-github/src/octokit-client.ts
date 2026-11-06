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

export interface GitHubFileChange {
  /** Safe, repository-relative path, e.g. src/index.ts. */
  readonly path: string;
  readonly content: string;
  readonly executable?: boolean;
}

/** Octokit adapter using the Git database API for coherent multi-file commits. */
export class GitHubOctokitClient {
  constructor(private readonly octokit: Octokit) {}

  /** Returns the unauthenticated clone URL; credentials are never embedded in URLs. */
  cloneRepository(target: GitHubRepositoryTarget): string {
    return `https://github.com/${target.owner}/${target.repo}.git`;
  }

  async createBranch(target: GitHubRepositoryTarget, branchName: string): Promise<void> {
    validateBranchName(branchName);
    const ref = await this.octokit.repos.getBranch({ owner: target.owner, repo: target.repo, branch: target.defaultBranch });
    await this.octokit.git.createRef({
      owner: target.owner,
      repo: target.repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.data.commit.sha,
    });
  }

  async commit(
    target: GitHubRepositoryTarget,
    branchName: string,
    message: string,
    changes: readonly GitHubFileChange[],
  ): Promise<string> {
    validateBranchName(branchName);
    if (!message.trim()) throw new Error("Commit message must not be empty.");
    if (changes.length === 0) throw new Error("At least one file change is required to create a commit.");
    const branch = await this.octokit.repos.getBranch({ owner: target.owner, repo: target.repo, branch: branchName });
    const parentSha = branch.data.commit.sha;
    const baseTreeSha = branch.data.commit.commit.tree.sha;
    const blobs = await Promise.all(changes.map(async (change) => {
      validateRepositoryPath(change.path);
      const blob = await this.octokit.git.createBlob({
        owner: target.owner,
        repo: target.repo,
        content: Buffer.from(change.content, "utf8").toString("base64"),
        encoding: "base64",
      });
      return { path: change.path, mode: change.executable ? "100755" as const : "100644" as const, type: "blob" as const, sha: blob.data.sha };
    }));
    const tree = await this.octokit.git.createTree({ owner: target.owner, repo: target.repo, base_tree: baseTreeSha, tree: blobs });
    const commit = await this.octokit.git.createCommit({
      owner: target.owner,
      repo: target.repo,
      message,
      tree: tree.data.sha,
      parents: [parentSha],
    });
    await this.octokit.git.updateRef({
      owner: target.owner,
      repo: target.repo,
      ref: `heads/${branchName}`,
      sha: commit.data.sha,
      force: false,
    });
    return commit.data.sha;
  }

  async createPullRequest(target: GitHubRepositoryTarget, spec: GitHubPullRequestSpec): Promise<string> {
    validateBranchName(spec.headBranch);
    validateBranchName(spec.baseBranch);
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
}

function validateBranchName(branch: string): void {
  if (!branch || branch.startsWith("-") || branch.startsWith("/") || branch.endsWith("/") || branch.endsWith(".")) {
    throw new Error("Invalid Git branch name.");
  }
  if (/\.\.|[\s~^:?*\[\\]|@\{|\/{2}/.test(branch) || branch.endsWith(".lock")) {
    throw new Error("Invalid Git branch name.");
  }
}

function validateRepositoryPath(filePath: string): void {
  if (!filePath || filePath.startsWith("/") || filePath.includes("\\") || filePath.includes("\0")) {
    throw new Error(`Invalid repository-relative path: ${filePath}`);
  }
  const segments = filePath.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`Invalid repository-relative path: ${filePath}`);
  }
}
