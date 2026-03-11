import { Metadata } from "next";
import AppShell from "../_client/AppShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pull Requests",
};

export default function PullRequestsPage() {
  return <AppShell />;
}
