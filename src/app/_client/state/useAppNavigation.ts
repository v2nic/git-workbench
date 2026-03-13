import { useState, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";

export type Tab =
  | "repositories"
  | "favorites"
  | "worktrees"
  | "branches"
  | "pull-requests";

export function useAppNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");

  // Derive activeTab from pathname - single source of truth
  // Always returns 'favorites' for SSR consistency, then updates on client
  const activeTab = useMemo((): Tab => {
    if (pathname.includes("/repositories")) return "repositories";
    if (pathname.includes("/worktrees")) return "worktrees";
    if (pathname.includes("/branches")) return "branches";
    if (pathname.includes("/pull-requests")) return "pull-requests";
    // Default to favorites for both SSR and any unknown paths
    return "favorites";
  }, [pathname]);

  // Navigate to a tab by updating the URL
  const setActiveTab = useCallback(
    (tab: Tab) => {
      router.push(`/${tab}`, { scroll: false });
    },
    [router],
  );

  const jumpToRepo = useCallback(
    (repoName: string) => {
      setSearchQuery("");
      router.push("/worktrees", { scroll: false });
    },
    [router],
  );

  const jumpToWorktrees = useCallback(() => {
    router.push("/worktrees", { scroll: false });
  }, [router]);

  const jumpToRepositories = useCallback(
    (repoName?: string) => {
      setSearchQuery("");
      if (repoName) {
        router.push(`/repositories?repo=${encodeURIComponent(repoName)}`, {
          scroll: false,
        });
        return;
      }

      router.push("/repositories", { scroll: false });
    },
    [router],
  );

  const jumpToWorktreesForRepo = useCallback(
    (repoName: string, worktreePath?: string) => {
      setSearchQuery("");
      const params = new URLSearchParams();
      params.set("repo", repoName);
      if (worktreePath) {
        params.set("worktree", encodeURIComponent(worktreePath));
      }
      router.push(`/worktrees?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  const jumpToPullRequests = useCallback(() => {
    router.push("/pull-requests", { scroll: false });
  }, [router]);

  const jumpToRepoPullRequests = useCallback(
    (repoName: string) => {
      setSearchQuery("");
      router.push(`/pull-requests?repo=${encodeURIComponent(repoName)}`, {
        scroll: false,
      });
    },
    [router],
  );

  const jumpToBranches = useCallback(() => {
    router.push("/branches", { scroll: false });
  }, [router]);

  const jumpToRepoBranches = useCallback(
    (repoName: string) => {
      setSearchQuery("");
      router.push(`/branches?repo=${encodeURIComponent(repoName)}`, {
        scroll: false,
      });
    },
    [router],
  );

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    jumpToRepo,
    jumpToWorktrees,
    jumpToRepositories,
    jumpToWorktreesForRepo,
    jumpToPullRequests,
    jumpToRepoPullRequests,
    jumpToBranches,
    jumpToRepoBranches,
  };
}
