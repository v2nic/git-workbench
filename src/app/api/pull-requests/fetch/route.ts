import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { PRNotification } from "@/types/github";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Parse a GitHub PR URL and extract owner, repo, and PR number
function parsePRUrl(url: string): { owner: string; repo: string; number: number } | null {
  // Handle URLs like:
  // https://github.com/owner/repo/pull/123
  // https://github.com/owner/repo/pull/123/changes
  // https://github.com/owner/repo/pull/268/changes
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2],
    number: parseInt(match[3], 10),
  };
}

// Normalize a raw PR object to PRNotification format
function normalizePR(
  pr: any,
  reason: PRNotification["reason"] = "notification",
  repository?: string,
): PRNotification {
  return {
    title: pr.title,
    reason,
    url: pr.html_url || pr.url,
    html_url: pr.html_url || pr.url,
    state: (pr.state || "OPEN").toLowerCase() as PRNotification["state"],
    repository:
      repository ||
      pr.repository?.nameWithOwner ||
      pr.repository?.fullName ||
      pr.repository ||
      "Unknown",
    number: pr.number,
    headRef: pr.head?.ref || pr.headRefName || `pr-${pr.number}`,
    reviewDecision: pr.review_decision || pr.reviewDecision,
    merged: Boolean(pr.merged) || pr.state === "MERGED",
    draft: Boolean(pr.draft || pr.isDraft),
    closedAt: pr.closed_at || pr.closedAt,
    updatedAt: pr.updated_at || pr.updatedAt || new Date().toISOString(),
    createdAt: pr.created_at || pr.createdAt || new Date().toISOString(),
    author: {
      login: pr.user?.login || pr.author?.login || pr.author?.name || "Unknown",
      avatarUrl: pr.user?.avatar_url || pr.author?.avatarUrl,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prUrl = searchParams.get("url");

    if (!prUrl) {
      return NextResponse.json(
        { error: 'Parameter "url" is required' },
        { status: 400 },
      );
    }

    const parsed = parsePRUrl(prUrl);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid GitHub PR URL format" },
        { status: 400 },
      );
    }

    const { owner, repo, number } = parsed;

    // Fetch the PR details using gh CLI
    const { stdout } = await execAsync(
      `gh api repos/${owner}/${repo}/pulls/${number}`,
      { timeout: 20000 },
    );

    if (!stdout || stdout.trim() === "") {
      return NextResponse.json(
        { error: "Empty response from GitHub API" },
        { status: 502 },
      );
    }

    const prData = JSON.parse(stdout);

    // Check if PR is merged and convert state
    let state = prData.state;
    let merged = false;
    if (prData.merged === true || prData.merged_at) {
      merged = true;
      state = "merged";
    }

    const prNotification: PRNotification = normalizePR(
      {
        ...prData,
        state,
        merged,
      },
      "notification",
      `${owner}/${repo}`,
    );

    return NextResponse.json({
      pullRequest: prNotification,
    });
  } catch (error) {
    console.error("Failed to fetch pull request:", error);

    // Check if it's a "not found" error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("Not Found") ||
      errorMessage.includes("404")
    ) {
      return NextResponse.json(
        { error: "Pull request not found", found: false },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch pull request" },
      { status: 500 },
    );
  }
}
