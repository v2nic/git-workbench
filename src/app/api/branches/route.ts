import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { execCommand, expandPath } from "@/lib/git";
import { Branch } from "@/types/branches";
import { promises as fs } from "fs";

export const dynamic = "force-dynamic";

async function resolveGitDir(
  barePath: string,
): Promise<{ gitDir: string; exists: boolean }> {
  try {
    await fs.access(barePath);
    return { gitDir: barePath, exists: true };
  } catch {
    const regularRepoPath = barePath.replace(/\.git$/, "");
    try {
      await fs.access(regularRepoPath);
      return { gitDir: `${regularRepoPath}/.git`, exists: true };
    } catch {
      return { gitDir: barePath, exists: false };
    }
  }
}

async function getDefaultBranch(gitDir: string): Promise<string> {
  try {
    const { stdout } = await execCommand(
      `git --git-dir "${gitDir}" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null`,
    );
    const ref = stdout.trim();
    return ref.replace("refs/remotes/origin/", "");
  } catch {
    try {
      await execCommand(
        `git --git-dir "${gitDir}" rev-parse --verify refs/heads/main 2>/dev/null`,
      );
      return "main";
    } catch {
      return "master";
    }
  }
}

async function isBranchMerged(
  gitDir: string,
  branchName: string,
  defaultBranch: string,
): Promise<boolean> {
  try {
    const { stdout } = await execCommand(
      `git --git-dir "${gitDir}" branch --merged "${defaultBranch}" 2>/dev/null`,
    );
    const mergedBranches = stdout
      .trim()
      .split("\n")
      .map((b) => b.trim().replace("* ", ""));
    return mergedBranches.includes(branchName);
  } catch {
    return false;
  }
}

async function getWorktreeBranches(
  gitDir: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const { stdout } = await execCommand(
      `git --git-dir "${gitDir}" worktree list --porcelain`,
    );
    const blocks = stdout.trim().split("\n\n");
    for (const block of blocks) {
      const lines = block.split("\n");
      let wtPath = "";
      let wtBranch = "";
      for (const line of lines) {
        if (line.startsWith("worktree "))
          wtPath = line.replace("worktree ", "");
        if (line.startsWith("branch "))
          wtBranch = line.replace("branch refs/heads/", "");
      }
      if (wtBranch && wtPath) {
        map.set(wtBranch, wtPath);
      }
    }
  } catch {
    // ignore
  }
  return map;
}

async function getTrackingInfo(gitDir: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const { stdout } = await execCommand(
      `git --git-dir "${gitDir}" for-each-ref --format="%(refname:short) %(upstream:short)" refs/heads/ 2>/dev/null`,
    );
    for (const line of stdout.trim().split("\n")) {
      if (!line.trim()) continue;
      const parts = line.trim().split(" ");
      if (parts.length >= 2 && parts[1]) {
        map.set(parts[0], parts[1]);
      }
    }
  } catch {
    // ignore
  }
  return map;
}

async function getBranchesForRepo(
  repoName: string,
  repoFullName: string | undefined,
  gitDir: string,
  includeRemote: boolean,
): Promise<Branch[]> {
  const branches: Branch[] = [];
  const branchMap = new Map<string, Branch>();

  const defaultBranch = await getDefaultBranch(gitDir);
  const worktreeBranches = await getWorktreeBranches(gitDir);
  const trackingInfo = await getTrackingInfo(gitDir);

  try {
    const { stdout } = await execCommand(
      `git --git-dir "${gitDir}" for-each-ref --format="%(refname:short)|%(committerdate:iso8601)|%(subject)" refs/heads/ 2>/dev/null`,
    );
    for (const line of stdout.trim().split("\n")) {
      if (!line.trim()) continue;
      const [name, date, ...messageParts] = line.split("|");
      if (!name) continue;

      const merged = await isBranchMerged(gitDir, name, defaultBranch);
      const tracking = trackingInfo.get(name);
      const worktreePath = worktreeBranches.get(name);

      const branch: Branch = {
        name,
        repoName,
        repoFullName,
        isLocal: true,
        isRemote: false,
        trackingBranch: tracking,
        isMergedToMain: merged,
        hasWorktree: !!worktreePath,
        worktreePath,
        lastCommitDate: date || undefined,
        lastCommitMessage: messageParts.join("|") || undefined,
      };
      branchMap.set(name, branch);
    }
  } catch {
    // no local branches
  }

  if (includeRemote) {
    try {
      const { stdout } = await execCommand(
        `git --git-dir "${gitDir}" for-each-ref --format="%(refname:short)|%(committerdate:iso8601)|%(subject)" refs/remotes/ 2>/dev/null`,
      );
      for (const line of stdout.trim().split("\n")) {
        if (!line.trim()) continue;
        const [fullRef, date, ...messageParts] = line.split("|");
        if (!fullRef) continue;
        if (fullRef.endsWith("/HEAD")) continue;

        const parts = fullRef.split("/");
        const remoteName = parts[0];
        const branchName = parts.slice(1).join("/");

        const existing = branchMap.get(branchName);
        if (existing) {
          existing.isRemote = true;
          existing.remoteName = remoteName;
        } else {
          branchMap.set(`remote:${fullRef}`, {
            name: branchName,
            repoName,
            repoFullName,
            isLocal: false,
            isRemote: true,
            remoteName,
            isMergedToMain: false,
            hasWorktree: false,
            lastCommitDate: date || undefined,
            lastCommitMessage: messageParts.join("|") || undefined,
          });
        }
      }
    } catch {
      // no remote branches
    }
  }

  Array.from(branchMap.values()).forEach((branch) => {
    branches.push(branch);
  });

  branches.sort((a, b) => {
    if (a.lastCommitDate && b.lastCommitDate) {
      return (
        new Date(b.lastCommitDate).getTime() -
        new Date(a.lastCommitDate).getTime()
      );
    }
    return a.name.localeCompare(b.name);
  });

  return branches;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repoFilter = searchParams.get("repo");
    const includeRemote = searchParams.get("includeRemote") === "true";
    const favoritesOnly = searchParams.get("favoritesOnly") !== "false";

    const config = await getConfig();
    const allBranches: Branch[] = [];

    for (const repoConfig of config.repos) {
      const repoName =
        repoConfig.repoName || repoConfig.fullName!.split("/")[1];

      if (
        repoFilter &&
        repoName !== repoFilter &&
        repoConfig.fullName !== repoFilter
      ) {
        continue;
      }

      if (!repoFilter && favoritesOnly && !repoConfig.favorite) {
        continue;
      }

      const barePath =
        repoConfig.barePath ||
        `${expandPath(config.paths.bareRoot)}/${repoName}.git`;
      const { gitDir, exists } = await resolveGitDir(barePath);
      if (!exists) continue;

      const branches = await getBranchesForRepo(
        repoName,
        repoConfig.fullName,
        gitDir,
        includeRemote,
      );
      allBranches.push(...branches);
    }

    return NextResponse.json(allBranches);
  } catch (error) {
    console.error("Failed to get branches:", error);
    return NextResponse.json(
      { error: "Failed to get branches" },
      { status: 500 },
    );
  }
}
