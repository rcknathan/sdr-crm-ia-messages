import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthForm } from "@/components/AuthForm";
import { WorkspaceSetup } from "@/components/WorkspaceSetup";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "SDR CRM — Gerencie leads e gere mensagens com IA" },
      { name: "description", content: "Mini CRM para equipes de pré-vendas (SDR) com geração de mensagens personalizadas por Inteligência Artificial." },
    ],
  }),
});

function Index() {
  const { user, loading: authLoading } = useAuth();
  const { currentWorkspace, loading: wsLoading } = useWorkspace();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user && !wsLoading && currentWorkspace) {
      navigate({ to: "/dashboard" });
    }
  }, [authLoading, user, wsLoading, currentWorkspace, navigate]);

  if (authLoading || (user && wsLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <AuthForm />;
  if (!currentWorkspace) return <WorkspaceSetup />;
  return null;
}
