import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { KanbanBoard } from "@/components/KanbanBoard";

export const Route = createFileRoute("/leads")({
  component: () => <AppLayout><KanbanBoard /></AppLayout>,
});