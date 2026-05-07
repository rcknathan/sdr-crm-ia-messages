import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { DashboardPage } from "@/components/DashboardPage";
import { AuthGuard } from "@/components/AuthGuard";

export const Route = createFileRoute("/dashboard")({
  component: () => <AuthGuard><AppLayout><DashboardPage /></AppLayout></AuthGuard>,
});