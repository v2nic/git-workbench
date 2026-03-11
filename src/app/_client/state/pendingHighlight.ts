// Module-level variable to pass highlight path across router.push navigations.
// Extracted to its own file to avoid circular imports between AppShell and useAppNavigation.
// Read and clear are separate operations so React StrictMode's double-mount cycle
// doesn't lose the value (first mount reads, React discards state, second mount reads again).
let pendingWorktreePath: string | undefined;

export function setPendingHighlightWorktreePath(path: string) {
  pendingWorktreePath = path;
}

export function getPendingHighlightWorktreePath(): string | undefined {
  return pendingWorktreePath;
}

export function clearPendingHighlightWorktreePath() {
  pendingWorktreePath = undefined;
}
