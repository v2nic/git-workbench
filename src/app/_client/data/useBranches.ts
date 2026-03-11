import useSWR from "swr";
import { Branch } from "@/types/branches";

interface UseBranchesOptions {
  repo?: string;
  includeRemote?: boolean;
  favoritesOnly?: boolean;
}

const fetcher = async (url: string): Promise<Branch[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch branches");
  }
  return response.json();
};

export function useBranches(options: UseBranchesOptions = {}) {
  const { repo, includeRemote = false, favoritesOnly = true } = options;

  const params = new URLSearchParams();
  if (repo) params.set("repo", repo);
  if (includeRemote) params.set("includeRemote", "true");
  params.set("favoritesOnly", String(favoritesOnly));

  const url = `/api/branches?${params.toString()}`;

  const { data, error, mutate } = useSWR(url, fetcher, {
    refreshInterval: 30000,
  });

  return {
    branches: data || [],
    isLoading: !error && !data,
    error,
    mutate,
  };
}
