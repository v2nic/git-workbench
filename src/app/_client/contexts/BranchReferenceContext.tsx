import React, { createContext, useContext } from "react";

interface BranchReferenceContextValue {
  getRemoteRef: (branchName: string) => string;
  getLocalRef: (branchRef: string) => string;
  isRemoteRef: (ref: string) => boolean;
}

export const BranchReferenceContext =
  createContext<BranchReferenceContextValue>({
    getRemoteRef: (branch) => `origin/${branch}`,
    getLocalRef: (ref) => ref.replace(/^origin\//, ""),
    isRemoteRef: (ref) => ref.startsWith("origin/"),
  });

export function useBranchReference() {
  const context = useContext(BranchReferenceContext);
  if (!context) {
    throw new Error(
      "useBranchReference must be used within a BranchReferenceProvider",
    );
  }
  return context;
}

export function BranchReferenceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value: BranchReferenceContextValue = {
    getRemoteRef: (branch: string) => {
      // Don't double-prefix if it's already a remote reference
      if (branch.startsWith("origin/")) {
        return branch;
      }
      return `origin/${branch}`;
    },
    getLocalRef: (ref: string) => {
      // Remove origin/ prefix if present
      return ref.replace(/^origin\//, "");
    },
    isRemoteRef: (ref: string) => {
      return ref.startsWith("origin/");
    },
  };

  return (
    <BranchReferenceContext.Provider value={value}>
      {children}
    </BranchReferenceContext.Provider>
  );
}
