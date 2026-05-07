import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { SettingsPage } from "@/components/SettingsPage";
import { AuthGuard } from "@/components/AuthGuard";

export const Route = createFileRoute("/settings")({
  component: () => <AuthGuard><AppLayout><SettingsPage /></AppLayout></AuthGuard>,
});