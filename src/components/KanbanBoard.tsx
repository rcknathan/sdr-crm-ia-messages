import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, GripVertical, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeadDialog } from "./LeadDialog";
import { LeadDetailDialog } from "./LeadDetailDialog";

interface Stage { id: string; name: string; position: number; color: string; }
interface Lead {
  id: string; name: string; email: string | null; company: string | null;
  stage_id: string; position: string | null; phone: string | null;
  lead_source: string | null; notes: string | null; assigned_to: string | null;
  workspace_id: string;
}

export function KanbanBoard() {
  const { currentWorkspace } = useWorkspace();
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showCreate, setShowCreate] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [requiredFields, setRequiredFields] = useState<Record<string, { field_name: string; is_custom_field: boolean; custom_field_id: string | null }[]>>({});
  const [validationError, setValidationError] = useState<{ stageId: string; fields: string[] } | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentWorkspace) return;
    const [stagesRes, leadsRes, reqFieldsRes] = await Promise.all([
      supabase.from("funnel_stages").select("*").eq("workspace_id", currentWorkspace.id).order("position"),
      supabase.from("leads").select("*").eq("workspace_id", currentWorkspace.id),
      supabase.from("stage_required_fields").select("*, funnel_stages!inner(workspace_id)").eq("funnel_stages.workspace_id", currentWorkspace.id),
    ]);
    setStages((stagesRes.data || []) as Stage[]);
    setLeads((leadsRes.data || []) as Lead[]);
    const rfMap: Record<string, any[]> = {};
    (reqFieldsRes.data || []).forEach((rf: any) => {
      if (!rfMap[rf.stage_id]) rfMap[rf.stage_id] = [];
      rfMap[rf.stage_id].push(rf);
    });
    setRequiredFields(rfMap);
  }, [currentWorkspace]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const validateTransition = (lead: Lead, targetStageId: string): string[] => {
    const required = requiredFields[targetStageId] || [];
    const missing: string[] = [];
    for (const rf of required) {
      if (!rf.is_custom_field) {
        const val = (lead as any)[rf.field_name];
        if (!val || (typeof val === "string" && val.trim() === "")) {
          missing.push(rf.field_name);
        }
      }
    }
    return missing;
  };

  const handleDrop = async (targetStageId: string) => {
    setDragOverStage(null);
    if (!draggedLead) return;
    const lead = leads.find((l) => l.id === draggedLead);
    if (!lead || lead.stage_id === targetStageId) { setDraggedLead(null); return; }

    const missing = validateTransition(lead, targetStageId);
    if (missing.length > 0) {
      setValidationError({ stageId: targetStageId, fields: missing });
      setDraggedLead(null);
      setTimeout(() => setValidationError(null), 4000);
      return;
    }

    await supabase.from("leads").update({ stage_id: targetStageId }).eq("id", draggedLead);
    // Log activity
    if (currentWorkspace) {
      const fromStage = stages.find(s => s.id === lead.stage_id)?.name;
      const toStage = stages.find(s => s.id === targetStageId)?.name;
      await supabase.from("activity_log").insert({
        workspace_id: currentWorkspace.id,
        lead_id: lead.id,
        user_id: (await supabase.auth.getUser()).data.user!.id,
        action: "stage_change",
        details: { from: fromStage, to: toStage },
      });
    }
    setDraggedLead(null);
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leads</h1>
        <Button onClick={() => setShowCreate(stages[0]?.id || null)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Lead
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageLeads = leads.filter((l) => l.stage_id === stage.id);
          return (
            <div key={stage.id}
              className={cn("kanban-column w-72 min-w-[280px] flex-shrink-0 rounded-xl border bg-muted/40 p-3", dragOverStage === stage.id && "drag-over")}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={() => handleDrop(stage.id)}>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                <span className="text-sm font-semibold">{stage.name}</span>
                <Badge variant="secondary" className="ml-auto text-xs">{stageLeads.length}</Badge>
              </div>
              {validationError?.stageId === stage.id && (
                <div className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                  Campos obrigatórios faltando: {validationError.fields.join(", ")}
                </div>
              )}
              <div className="space-y-2">
                {stageLeads.map((lead) => (
                  <div key={lead.id}
                    draggable
                    onDragStart={() => setDraggedLead(lead.id)}
                    onClick={() => setSelectedLead(lead)}
                    className="cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground/40 cursor-grab" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{lead.name}</p>
                        {lead.company && <p className="truncate text-xs text-muted-foreground">{lead.company}</p>}
                        {lead.email && <p className="truncate text-xs text-muted-foreground">{lead.email}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-2 w-full text-muted-foreground" onClick={() => setShowCreate(stage.id)}>
                <Plus className="mr-1 h-3 w-3" /> Adicionar
              </Button>
            </div>
          );
        })}
      </div>

      {showCreate && (
        <LeadDialog stageId={showCreate} onClose={() => setShowCreate(null)} onSaved={fetchData} />
      )}
      {selectedLead && (
        <LeadDetailDialog lead={selectedLead} onClose={() => setSelectedLead(null)} onSaved={() => { fetchData(); setSelectedLead(null); }} />
      )}
    </div>
  );
}