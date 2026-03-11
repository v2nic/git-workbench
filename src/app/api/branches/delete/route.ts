import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { execCommand, expandPath } from "@/lib/git";
import { DeleteBranchRequest, DeleteBranchResponse } from "@/types/branches";
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

export async function POST(request: NextRequest) {
  try {
    const body: DeleteBranchRequest = await request.json();
    const { repoName, branchName, deleteLocal, deleteRemote, force } = body;

    if (!repoName || !branchName) {
      return NextResponse.json(
        { error: "repoName and branchName are required" },
        { status: 400 },
      );
    }

    if (!deleteLocal && !deleteRemote) {
      return NextResponse.json(
        { error: "At least one of deleteLocal or deleteRemote must be true" },
        { status: 400 },
      );
    }

    const config = await getConfig();
    const repoConfig = config.repos.find(
      (r) => r.repoName === repoName || r.fullName === repoName,
    );

    if (!repoConfig) {
      return NextResponse.json(
        { error: `Repository '${repoName}' not found` },
        { status: 404 },
      );
    }

    const repoNameResolved =
      repoConfig.repoName || repoConfig.fullName!.split("/")[1];
    const barePath =
      repoConfig.barePath ||
      `${expandPath(config.paths.bareRoot)}/${repoNameResolved}.git`;
    const { gitDir, exists } = await resolveGitDir(barePath);

    if (!exists) {
      return NextResponse.json(
        { error: `Repository not found on disk` },
        { status: 404 },
      );
    }

    const result: DeleteBranchResponse = {
      localDeleted: false,
      remoteDeleted: false,
    };

    if (deleteLocal) {
      try {
        const flag = force ? "-D" : "-d";
        await execCommand(
          `git --git-dir "${gitDir}" branch ${flag} "${branchName}"`,
        );
        result.localDeleted = true;
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        if (msg.includes("not fully merged")) {
          return NextResponse.json(
            {
              error: `Branch '${branchName}' is not fully merged. Use force delete to proceed.`,
              requiresForce: true,
            },
            { status: 409 },
          );
        }
        return NextResponse.json(
          { error: `Failed to delete local branch: ${msg}` },
          { status: 500 },
        );
      }
    }

    if (deleteRemote) {
      try {
        await execCommand(
          `git --git-dir "${gitDir}" push origin --delete "${branchName}"`,
        );
        result.remoteDeleted = true;
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
          {
            error: `Failed to delete remote branch: ${msg}`,
            localDeleted: result.localDeleted,
            remoteDeleted: false,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to delete branch:", error);
    return NextResponse.json(
      { error: "Failed to delete branch" },
      { status: 500 },
    );
  }
}
