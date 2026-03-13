import { execCommand } from "./git";
import { GitHubRepo, GitHubPullRequest } from "@/types/github";

export interface ValidatedGitHubRepo {
  owner: string;
  repo: string;
  fullName: string;
  defaultBranch: string;
  description?: string;
}

export async function checkGitHubAuth(): Promise<boolean> {
  try {
    await execCommand("gh auth status");
    return true;
  } catch {
    return false;
  }
}

export async function searchGitHubRepos(query: string): Promise<GitHubRepo[]> {
  try {
    const { stdout } = await execCommand(
      `gh search repos "${query}" --json id,name,fullName,description,url,sshUrl,httpUrl,isPrivate,defaultBranch,owner --limit 50`,
    );

    const repos = JSON.parse(stdout);
    return repos.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.fullName,
      description: repo.description,
      url: repo.url,
      sshUrl: repo.sshUrl,
      httpsUrl: repo.httpUrl,
      isPrivate: repo.isPrivate,
      defaultBranch: repo.defaultBranch,
      owner: repo.owner,
    }));
  } catch (error) {
    throw new Error(
      `Failed to search GitHub repos: ${(error as Error).message}`,
    );
  }
}

export function parseGitHubRepoInput(input: string): { owner: string; repo: string } {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    throw new Error("Please enter a repository URL");
  }

  if (trimmedInput.includes("github.com/")) {
    const match = trimmedInput.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
    if (!match) {
      throw new Error("Invalid GitHub URL format");
    }

    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, ""),
    };
  }

  const parts = trimmedInput.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("Invalid format. Use https://github.com/org/repo or org/repo");
  }

  return {
    owner: parts[0],
    repo: parts[1].replace(/\.git$/, ""),
  };
}

export async function validateGitHubRepo(
  input: string,
): Promise<ValidatedGitHubRepo> {
  const { owner, repo } = parseGitHubRepoInput(input);

  if (!(await checkGitHubAuth())) {
    throw new Error("GitHub CLI is not authenticated");
  }

  try {
    const { stdout } = await execCommand(
      `gh repo view "${owner}/${repo}" --json name,nameWithOwner,description,defaultBranchRef,owner`,
    );
    const repoData = JSON.parse(stdout) as {
      name: string;
      nameWithOwner: string;
      description?: string | null;
      defaultBranchRef?: { name?: string | null } | null;
      owner?: { login?: string | null } | null;
    };

    return {
      owner: repoData.owner?.login || owner,
      repo: repoData.name || repo,
      fullName: repoData.nameWithOwner || `${owner}/${repo}`,
      defaultBranch: repoData.defaultBranchRef?.name || "main",
      description: repoData.description || undefined,
    };
  } catch (error) {
    throw new Error(
      `Failed to validate repository: ${(error as Error).message}`,
    );
  }
}

export async function getPullRequests(
  repoFullName: string,
  branch: string,
): Promise<GitHubPullRequest[]> {
  try {
    const { stdout } = await execCommand(
      `gh pr list --repo "${repoFullName}" --head "${branch}" --json number,url,state,title,head --limit 10`,
    );

    const prs = JSON.parse(stdout);
    return prs.map((pr: any) => ({
      number: pr.number,
      url: pr.url,
      state: pr.state,
      title: pr.title,
      head: pr.head,
    }));
  } catch (error) {
    // If no PRs found or other error, return empty array
    return [];
  }
}

export async function getGitHubAuthUrl(): Promise<string> {
  try {
    const { stdout } = await execCommand(
      "gh auth login --web --with-token 2>&1 | head -1",
    );
    // This is a fallback - in practice, we'd direct users to gh auth login
    return "https://github.com/login/oauth/authorize";
  } catch {
    return "https://github.com/login/oauth/authorize";
  }
}
