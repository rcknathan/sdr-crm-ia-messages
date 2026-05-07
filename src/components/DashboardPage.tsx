import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Kanban, Megaphone, MessageSquare } from "lucide-react";

export function DashboardPage() {
  const { currentWorkspace } = useWorkspace();
  const [stats, setStats] = useState({ totalLeads: 0, totalCampaigns: 0, totalMessages: 0, byStage: [] as { name: string; color: string; count: number }[] });

  useEffect(() => {
    if (!currentWorkspace) return;
    const fetchStats = async () => {
      const [leads, campaigns, messages, stages] = await Promise.all([
        supabase.from("leads").select("id, stage_id", { count: "exact" }).eq("workspace_id", currentWorkspace.id),
        supabase.from("campaigns").select("id", { count: "exact" }).eq("workspace_id", currentWorkspace.id),
        supabase.from("generated_messages").select("id, leads!inner(workspace_id)", { count: "exact" }).eq("leads.workspace_id", currentWorkspace.id).eq("is_sent", true),
        supabase.from("funnel_stages").select("*").eq("workspace_id", currentWorkspace.id).order("position"),
      ]);
      const stageData = (stages.data || []).map((s: any) => ({
        name: s.name, color: s.color,
        count: (leads.data || []).filter((l: any) => l.stage_id === s.id).length,
      }));
      setStats({ totalLeads: leads.count || 0, totalCampaigns: campaigns.count || 0, totalMessages: messages.count || 0, byStage: stageData });
    };
    fetchStats();
  }, [currentWorkspace]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total de Leads</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.totalLeads}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Campanhas</CardTitle><Megaphone className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.totalCampaigns}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Mensagens Enviadas</CardTitle><MessageSquare className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.totalMessages}</div></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Leads por Etapa</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.byStage.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-sm flex-1">{s.name}</span>
                <span className="text-sm font-semibold">{s.count}</span>
                <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ backgroundColor: s.color, width: `${stats.totalLeads ? (s.count / stats.totalLeads) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}