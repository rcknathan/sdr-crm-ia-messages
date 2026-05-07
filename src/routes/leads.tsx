import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { KanbanBoard } from "@/components/KanbanBoard";
import { AuthGuard } from "@/components/AuthGuard";

export const Route = createFileRoute("/leads")({
  component: () => <AuthGuard><AppLayout><KanbanBoard /></AppLayout></AuthGuard>,
});