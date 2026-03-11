import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { getConfig, removeRepo } from "@/lib/config";
import { expandPath } from "@/lib/git";

export const dynamic = "force-dynamic";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { repoName } = await request.json();

    if (!repoName) {
      return NextResponse.json(
        { error: "Repository name is required" },
        { status: 400 },
      );
    }

    const config = await getConfig();
    const bareRoot = expandPath(config.paths.bareRoot);

    // Try to find the repository in tracked repos first
    const trackedRepo = config.repos.find(
      (r) => r.repoName === repoName || r.fullName?.split("/")[1] === repoName,
    );

    let repoPath: string;
    let wasTracked = false;

    if (trackedRepo) {
      // Use the barePath from config if available
      repoPath = trackedRepo.barePath || path.join(bareRoot, `${repoName}.git`);
      wasTracked = true;
    } else {
      // Check if it's a discovered bare repo
      repoPath = path.join(bareRoot, `${repoName}.git`);
    }

    // Check if repository exists
    try {
      await execAsync(`test -d "${repoPath}"`);
    } catch (error) {
      // If it was a tracked repo, remove it from config even if not on disk
      if (wasTracked && trackedRepo) {
        const identifier = trackedRepo.fullName || repoName;
        await removeRepo(identifier);
        return NextResponse.json({
          success: true,
          message: `Repository ${repoName} removed from configuration (was already deleted from disk)`,
          wasTracked,
          wasAlreadyDeleted: true,
        });
      }

      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 },
      );
    }

    // Remove the repository directory
    await execAsync(`rm -rf "${repoPath}"`);

    // If it was a tracked repo, remove it from config
    if (wasTracked && trackedRepo) {
      const identifier = trackedRepo.fullName || repoName;
      await removeRepo(identifier);
    }

    return NextResponse.json({
      success: true,
      message: `Repository ${repoName} deleted successfully`,
      wasTracked,
    });
  } catch (error) {
    console.error("Failed to delete repository:", error);
    return NextResponse.json(
      { error: "Failed to delete repository" },
      { status: 500 },
    );
  }
}
