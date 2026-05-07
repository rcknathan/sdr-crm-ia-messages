import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { DashboardPage } from "@/components/DashboardPage";

export const Route = createFileRoute("/dashboard")({
  component: () => <AppLayout><DashboardPage /></AppLayout>,
});