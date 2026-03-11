import { NextResponse } from "next/server";
import { getConfig, addRepo } from "@/lib/config";
import { extractRepoInfo } from "@/lib/gitRepoInfo";
import { expandPath } from "@/lib/git";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { repoNameOrFullName } = await request.json();

    if (!repoNameOrFullName) {
      return NextResponse.json(
        { error: "repoNameOrFullName is required" },
        { status: 400 },
      );
    }

    const config = await getConfig();

    // Check if already tracked
    const existingRepo = config.repos.find(
      (r) =>
        r.repoName === repoNameOrFullName || r.fullName === repoNameOrFullName,
    );

    if (existingRepo) {
      return NextResponse.json(
        { error: "Repository is already tracked" },
        { status: 409 },
      );
    }

    // Look for the repository in bareRoot
    const bareRootPath = expandPath(config.paths.bareRoot);
    const possibleBarePath = `${bareRootPath}/${repoNameOrFullName}.git`;

    try {
      await fs.access(possibleBarePath);

      // Repository exists, gather its information using the utility function
      const repoInfo = await extractRepoInfo(
        possibleBarePath,
        repoNameOrFullName,
      );

      // Create repository configuration
      const repoConfig = {
        repoName: repoNameOrFullName,
        fullName: repoInfo.fullName,
        httpsUrl: repoInfo.httpsUrl,
        sshUrl: repoInfo.sshUrl,
        defaultBranch: repoInfo.defaultBranch,
        favorite: false,
        barePath: possibleBarePath,
      };

      // Add to configuration
      await addRepo(repoConfig);

      return NextResponse.json({
        success: true,
        message: `Repository '${repoNameOrFullName}' is now tracked`,
        repo: repoConfig,
      });
    } catch {
      // Repository doesn't exist on disk
      return NextResponse.json(
        {
          error: `Repository '${repoNameOrFullName}' not found in ${bareRootPath}`,
        },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error("Failed to track repository:", error);
    return NextResponse.json(
      { error: "Failed to track repository" },
      { status: 500 },
    );
  }
}
