import { execCommand } from "./git";
import { promises as fs } from "fs";

export interface GitRepoInfo {
  httpsUrl?: string;
  sshUrl?: string;
  defaultBranch: string;
  fullName: string;
}

/**
 * Extract repository information from a bare Git repository
 */
export async function extractRepoInfo(
  barePath: string,
  repoNameOrFullName: string,
): Promise<GitRepoInfo> {
  const repoInfo: GitRepoInfo = {
    defaultBranch: "main",
    fullName: repoNameOrFullName,
  };

  // Extract remote URLs
  try {
    const remoteUrlResult = await execCommand(
      `git --git-dir "${barePath}" remote get-url origin`,
    );
    const url = remoteUrlResult.stdout.trim();

    if (url.startsWith("git@github.com:")) {
      repoInfo.sshUrl = url;
      repoInfo.httpsUrl = url.replace("git@github.com:", "https://github.com/");
      repoInfo.fullName = url
        .replace("git@github.com:", "")
        .replace(".git", "");
    } else if (url.startsWith("https://github.com/")) {
      repoInfo.httpsUrl = url;
      repoInfo.sshUrl =
        url
          .replace("https://github.com/", "git@github.com:")
          .replace(/\/$/, "") + ".git";
      repoInfo.fullName = url
        .replace("https://github.com/", "")
        .replace(".git", "");
    }
  } catch (error) {
    console.debug(`No remote URL found for ${repoNameOrFullName}:`, error);
    // No remote URL, that's ok for local repos
  }

  // Extract default branch
  try {
    const branchResult = await execCommand(
      `git --git-dir "${barePath}" symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'`,
    );
    repoInfo.defaultBranch = branchResult.stdout.trim() || "main";
  } catch {
    // Try to get default branch from HEAD
    try {
      const headContent = await fs.readFile(`${barePath}/HEAD`, "utf-8");
      const match = headContent.trim().match(/^ref: refs\/heads\/(.+)$/);
      if (match) {
        repoInfo.defaultBranch = match[1];
      }
    } catch {
      // Use default 'main'
      console.debug(
        `Could not determine default branch for ${repoNameOrFullName}, using 'main'`,
      );
    }
  }

  return repoInfo;
}
