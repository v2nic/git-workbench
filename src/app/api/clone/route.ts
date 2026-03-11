import { NextResponse } from "next/server";
import { getConfig, addRepo } from "@/lib/config";
import { execCommand, expandPath } from "@/lib/git";
import { extractRepoInfo } from "@/lib/gitRepoInfo";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { repoName, url, fullName } = body;

    // Support both legacy repoName and new URL-based cloning
    if (!repoName && !url) {
      return NextResponse.json(
        { error: "Missing required field: repoName or url" },
        { status: 400 },
      );
    }

    const config = await getConfig();

    let targetRepoName = repoName;
    let repoConfig: any = null;

    if (url) {
      // URL-based cloning - construct repo config from URL
      if (!fullName) {
        return NextResponse.json(
          { error: "Missing fullName for URL-based cloning" },
          { status: 400 },
        );
      }

      // Construct the GitHub HTTPS URL
      const httpsUrl = `https://github.com/${fullName}.git`;

      repoConfig = {
        repoName: targetRepoName,
        fullName,
        httpsUrl,
        defaultBranch: "main", // Will be updated after clone
        favorite: false,
      };
    } else {
      // Legacy repoName-based cloning
      targetRepoName = repoName;
      repoConfig = config.repos.find(
        (r) => r.repoName === repoName || r.fullName === repoName,
      );

      if (!repoConfig) {
        return NextResponse.json(
          { error: `Repository '${repoName}' not found in configuration` },
          { status: 404 },
        );
      }
    }

    // Check if repository already exists
    const targetPath =
      repoConfig.barePath ||
      `${expandPath(config.paths.bareRoot)}/${targetRepoName}.git`;

    try {
      await fs.access(targetPath);
      return NextResponse.json(
        { error: `Repository already exists at ${targetPath}` },
        { status: 409 },
      );
    } catch {
      // Repository doesn't exist, proceed with clone
    }

    // Get the remote URL - prefer HTTPS, fallback to SSH
    let remoteUrl = "";
    if (repoConfig.httpsUrl) {
      remoteUrl = repoConfig.httpsUrl;
    } else if (repoConfig.sshUrl) {
      // Try to use HTTPS by converting SSH URL to HTTPS if no HTTPS URL is provided
      remoteUrl = repoConfig.sshUrl.replace(
        "git@github.com:",
        "https://github.com/",
      );
    } else if (url) {
      // For URL-based cloning, use the constructed HTTPS URL
      remoteUrl = repoConfig.httpsUrl;
    } else {
      return NextResponse.json(
        { error: `No remote URL found for repository '${targetRepoName}'` },
        { status: 400 },
      );
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(targetPath);
    try {
      await fs.mkdir(parentDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create parent directory:", error);
      return NextResponse.json(
        { error: "Failed to create parent directory for repository" },
        { status: 500 },
      );
    }

    try {
      // Clone as bare repository
      await execCommand(`git clone --bare "${remoteUrl}" "${targetPath}"`);

      // If this was a URL-based clone, add the repository to configuration
      if (url && repoConfig) {
        try {
          // Get repository information from the cloned repository
          const repoInfo = await extractRepoInfo(
            targetPath,
            repoConfig.repoName || repoConfig.fullName!,
          );

          // Update repo config with extracted information
          repoConfig.defaultBranch = repoInfo.defaultBranch;
          if (repoInfo.httpsUrl && !repoConfig.httpsUrl) {
            repoConfig.httpsUrl = repoInfo.httpsUrl;
          }
          if (repoInfo.sshUrl && !repoConfig.sshUrl) {
            repoConfig.sshUrl = repoInfo.sshUrl;
          }
          if (repoInfo.fullName && !repoConfig.fullName) {
            repoConfig.fullName = repoInfo.fullName;
          }

          // Add to configuration
          await addRepo(repoConfig);
          console.log(`Repository '${targetRepoName}' added to configuration`);
        } catch (configError) {
          console.error(
            "Failed to add repository to configuration:",
            configError,
          );
          // Don't fail the clone operation if config update fails
        }
      }

      return NextResponse.json({
        success: true,
        message: `Repository '${targetRepoName}' cloned successfully`,
        repoName: targetRepoName,
        targetPath,
        remoteUrl,
      });
    } catch (gitError) {
      console.error("Git clone failed:", gitError);
      return NextResponse.json(
        {
          error: `Failed to clone repository: ${gitError instanceof Error ? gitError.message : "Unknown error"}`,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Clone operation failed:", error);
    return NextResponse.json(
      { error: "Failed to clone repository" },
      { status: 500 },
    );
  }
}
