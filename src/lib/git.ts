import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";

const execAsync = promisify(exec);

// Lazy singleton for git path - verified once on first use
let gitPath: string | null = null;

function getGitPath(): string {
  if (gitPath) return gitPath;

  const candidates = [
    "/usr/bin/git",
    "/opt/homebrew/bin/git",
    "/usr/local/bin/git",
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      gitPath = path;
      return gitPath;
    }
  }
  gitPath = "git"; // fallback to PATH
  return gitPath;
}

export async function execCommand(
  command: string,
  cwd?: string,
): Promise<{ stdout: string; stderr: string }> {
  const result = await execAsync(command, { cwd });
  return {
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export async function execGitCommandSync(
  args: string[],
  cwd?: string,
): Promise<{ stdout: string; stderr: string }> {
  const command = `${getGitPath()} ${args.join(" ")}`;
  return execCommand(command, cwd);
}

export async function execGitCommand(
  args: string[],
  cwd?: string,
): Promise<{ stdout: string; stderr: string }> {
  return execGitCommandSync(args, cwd);
}

export function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    const home = process.env.HOME || process.env.USERPROFILE || "/home/node";
    return path.replace("~", home);
  }
  return path;
}

export function pathRelativeToHome(path: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || "/home/node";
  if (path.startsWith(home)) {
    return path.replace(home, "~");
  }
  return path;
}
