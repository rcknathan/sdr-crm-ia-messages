import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Props {
  stageId: string;
  onClose: () => void;
  onSaved: () => void;
  initialData?: any;
}

export function LeadDialog({ stageId, onClose, onSaved, initialData }: Props) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<{ user_id: string; profiles: { full_name: string | null; email: string | null } }[]>([]);
  const [customFields, setCustomFields] = useState<{ id: string; name: string; field_type: string }[]>([]);
  const [form, setForm] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    company: initialData?.company || "",
    position: initialData?.position || "",
    lead_source: initialData?.lead_source || "",
    notes: initialData?.notes || "",
    assigned_to: initialData?.assigned_to || "",
  });
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!currentWorkspace) return;
    supabase.from("workspace_members")
    .select("user_id")
    .eq("workspace_id", currentWorkspace.id)
    .then(({ data }) => {
      setMembers((data || []) as any);
    });
    supabase.from("custom_fields").select("*").eq("workspace_id", currentWorkspace.id).then(({ data }) => {
      setCustomFields((data || []) as any);
    });
    if (initialData?.id) {
      supabase.from("custom_field_values").select("*").eq("lead_id", initialData.id).then(({ data }) => {
        const vals: Record<string, string> = {};
        (data || []).forEach((v: any) => { vals[v.field_id] = v.value || ""; });
        setCustomValues(vals);
      });
    }
  }, [currentWorkspace, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !user) return;
    setLoading(true);

  const leadData = {
    ...form,
    assigned_to:
      form.assigned_to === "unassigned"
        ? null
        : form.assigned_to || null,
    workspace_id: currentWorkspace.id,
    stage_id: stageId,
  };

    let leadId = initialData?.id;
    if (leadId) {
      await supabase.from("leads").update(leadData).eq("id", leadId);
    } else {
      const { data } = await supabase.from("leads").insert(leadData).select().single();
      leadId = data?.id;
      if (leadId) {
        await supabase.from("activity_log").insert({
          workspace_id: currentWorkspace.id, lead_id: leadId, user_id: user.id, action: "lead_created",
        });
      }
    }

    if (leadId) {
      for (const [fieldId, value] of Object.entries(customValues)) {
        await supabase.from("custom_field_values").upsert({ lead_id: leadId, field_id: fieldId, value }, { onConflict: "lead_id,field_id" });
      }
    }

    setLoading(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Lead" : "Novo Lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Empresa</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Cargo</Label>
              <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Origem</Label>
              <Input value={form.lead_source} onChange={(e) => setForm({ ...form, lead_source: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Responsável</Label>
            <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Nenhum</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.user_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
          {customFields.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-sm font-medium text-muted-foreground">Campos personalizados</p>
              {customFields.map((cf) => (
                <div key={cf.id} className="space-y-1">
                  <Label>{cf.name}</Label>
                  <Input value={customValues[cf.id] || ""} onChange={(e) => setCustomValues({ ...customValues, [cf.id]: e.target.value })} />
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}