import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getConfig, addRepo } from "@/lib/config";
import { execGitCommandSync, expandPath } from "@/lib/git";
import { CreateRepoData, CreateRepoResponse } from "@/types/config";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const data: CreateRepoData = await request.json();
    const {
      repoName,
      defaultBranch,
      worktreeName,
      worktreeBranchName,
      favorite,
    } = data;

    // Validate repository name
    if (!repoName || !repoName.trim()) {
      return NextResponse.json(
        { error: "Repository name is required" },
        { status: 400 },
      );
    }

    // Validate worktree name and branch name (mandatory)
    if (!worktreeName || !worktreeName.trim()) {
      return NextResponse.json(
        { error: "Worktree name is required" },
        { status: 400 },
      );
    }

    if (!worktreeBranchName || !worktreeBranchName.trim()) {
      return NextResponse.json(
        { error: "Worktree branch name is required" },
        { status: 400 },
      );
    }

    const cleanRepoName = repoName.trim();
    const cleanWorktreeName = worktreeName.trim();
    const cleanWorktreeBranchName = worktreeBranchName.trim();

    // Validate repository name format
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanRepoName)) {
      return NextResponse.json(
        {
          error:
            "Repository name can only contain letters, numbers, hyphens, and underscores",
        },
        { status: 400 },
      );
    }

    // Check for existing repository
    const config = await getConfig();
    const existingRepo = config.repos.find(
      (r) =>
        r.repoName === cleanRepoName ||
        r.fullName?.split("/")[1] === cleanRepoName,
    );

    if (existingRepo) {
      return NextResponse.json(
        { error: "Repository with this name already exists" },
        { status: 409 },
      );
    }

    // Get paths
    console.log("Config:", config);

    const bareRootPath = expandPath(config.paths.bareRoot);
    const worktreeRootPath = expandPath(config.paths.worktreeRoot);
    const bareRepoPath = path.join(bareRootPath, `${cleanRepoName}.git`);
    const worktreePath = path.join(worktreeRootPath, cleanRepoName);

    console.log("Paths:", {
      bareRoot: config.paths.bareRoot,
      worktreeRoot: config.paths.worktreeRoot,
      bareRootPath,
      worktreeRootPath,
      bareRepoPath,
      worktreePath,
    });

    // Check if bare repository already exists on filesystem
    try {
      await fs.access(bareRepoPath);
      return NextResponse.json(
        { error: "Repository directory already exists" },
        { status: 409 },
      );
    } catch {
      // Directory doesn't exist, continue
    }

    // Create bare repository
    try {
      // Ensure parent directory exists
      await fs.mkdir(path.dirname(bareRepoPath), { recursive: true });

      console.log("Creating bare repository at:", bareRepoPath);

      // Initialize bare repository first
      await execGitCommandSync(["init", "--bare", bareRepoPath], undefined);

      console.log("Setting default branch to:", defaultBranch);

      // Set default branch
      await execGitCommandSync(
        [
          "--git-dir",
          bareRepoPath,
          "symbolic-ref",
          "HEAD",
          `refs/heads/${defaultBranch}`,
        ],
        undefined,
      );

      console.log("Bare repository created successfully");
    } catch (error) {
      console.error("Failed to create bare repository:", error);
      return NextResponse.json(
        { error: "Failed to create bare repository" },
        { status: 500 },
      );
    }

    // Create worktree (mandatory)
    if (cleanWorktreeName) {
      try {
        // Create a temporary directory to make an initial commit
        const tempDir = `/tmp/temp-${cleanRepoName}-${Date.now()}`;
        await fs.mkdir(tempDir, { recursive: true });

        // Initialize a temporary repo, create a commit, then push to bare repo
        await execGitCommandSync(["init"], tempDir);
        await execGitCommandSync(
          ["config", "user.email", "test@example.com"],
          tempDir,
        );
        await execGitCommandSync(["config", "user.name", "Test User"], tempDir);

        // Create a README file
        await fs.writeFile(
          path.join(tempDir, "README.md"),
          `# ${cleanRepoName}\n\nInitial repository.`,
        );

        // Add and commit
        await execGitCommandSync(["add", "README.md"], tempDir);
        await execGitCommandSync(["commit", "-m", '"Initial commit"'], tempDir);

        // Add the bare repo as remote and push
        await execGitCommandSync(
          ["remote", "add", "origin", bareRepoPath],
          tempDir,
        );
        await execGitCommandSync(["push", "origin", defaultBranch], tempDir);

        // Clean up temp directory
        await fs.rm(tempDir, { recursive: true, force: true });

        // Now create the worktree with the specified branch
        const worktreeDir = path.join(worktreeRootPath, cleanWorktreeName);
        await fs.mkdir(worktreeDir, { recursive: true });

        // If worktree branch is different from default branch, create it first
        if (cleanWorktreeBranchName !== defaultBranch) {
          console.log(
            `Creating branch ${cleanWorktreeBranchName} from ${defaultBranch}`,
          );
          await execGitCommandSync(
            [
              "--git-dir",
              bareRepoPath,
              "branch",
              cleanWorktreeBranchName,
              defaultBranch,
            ],
            undefined,
          );
        }

        // Create worktree with the specified branch
        await execGitCommandSync(
          [
            "--git-dir",
            bareRepoPath,
            "worktree",
            "add",
            worktreeDir,
            cleanWorktreeBranchName,
          ],
          undefined,
        );
      } catch (error) {
        console.error("Failed to create worktree:", error);
        // Clean up bare repository if worktree creation fails
        try {
          await fs.rm(bareRepoPath, { recursive: true, force: true });
        } catch (cleanupError) {
          console.error("Failed to cleanup bare repository:", cleanupError);
        }
        return NextResponse.json(
          { error: "Failed to create worktree" },
          { status: 500 },
        );
      }
    }

    // Create repository configuration
    const repoConfig = {
      repoName: cleanRepoName,
      defaultBranch,
      favorite: favorite || false,
      barePath: bareRepoPath,
      // Note: No remote URLs for local repositories
    };

    // Add to configuration
    await addRepo(repoConfig);

    const response: CreateRepoResponse = {
      success: true,
      repo: repoConfig,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to create repository:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
