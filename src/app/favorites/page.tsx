import { Metadata } from "next";
import AppShell from "../_client/AppShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Favorites",
};

export default function FavoritesPage() {
  return <AppShell />;
}
