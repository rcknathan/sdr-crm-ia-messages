import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { CampaignsPage } from "@/components/CampaignsPage";

export const Route = createFileRoute("/campaigns")({
  component: () => <AppLayout><CampaignsPage /></AppLayout>,
});