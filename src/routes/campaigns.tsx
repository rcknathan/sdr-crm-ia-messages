import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { CampaignsPage } from "@/components/CampaignsPage";
import { AuthGuard } from "@/components/AuthGuard";

export const Route = createFileRoute("/campaigns")({
  component: () => <AuthGuard><AppLayout><CampaignsPage /></AppLayout></AuthGuard>,
});