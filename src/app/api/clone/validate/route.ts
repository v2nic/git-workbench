import { NextResponse } from "next/server";
import { validateGitHubRepo } from "@/lib/github";

export const dynamic = "force-dynamic";

function getStatusCode(message: string): number {
  if (
    message === "Please enter a repository URL" ||
    message === "Invalid GitHub URL format" ||
    message === "Invalid format. Use https://github.com/org/repo or org/repo"
  ) {
    return 400;
  }

  if (message === "Repository not found") {
    return 404;
  }

  return 500;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim();

    if (!url) {
      return NextResponse.json(
        { error: "Missing required field: url" },
        { status: 400 },
      );
    }

    const repoInfo = await validateGitHubRepo(url);
    return NextResponse.json(repoInfo);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to validate repository";

    return NextResponse.json(
      { error: message },
      { status: getStatusCode(message) },
    );
  }
}
