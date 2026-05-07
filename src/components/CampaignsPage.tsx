import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

export function CampaignsPage() {
  const { currentWorkspace } = useWorkspace();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", context: "", prompt: "", trigger_stage_id: "", is_active: true });

  const fetchData = async () => {
    if (!currentWorkspace) return;
    const [c, s] = await Promise.all([
      supabase.from("campaigns").select("*, funnel_stages(name)").eq("workspace_id", currentWorkspace.id).order("created_at", { ascending: false }),
      supabase.from("funnel_stages").select("*").eq("workspace_id", currentWorkspace.id).order("position"),
    ]);
    setCampaigns(c.data || []);
    setStages(s.data || []);
  };

  useEffect(() => { fetchData(); }, [currentWorkspace]);

  const openCreate = () => { setEditing(null); setForm({ name: "", context: "", prompt: "", trigger_stage_id: "", is_active: true }); setShowForm(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ name: c.name, context: c.context || "", prompt: c.prompt || "", trigger_stage_id: c.trigger_stage_id || "", is_active: c.is_active }); setShowForm(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    setLoading(true);
    const data = { ...form, trigger_stage_id: form.trigger_stage_id || null, workspace_id: currentWorkspace.id };
    if (editing) {
      await supabase.from("campaigns").update(data).eq("id", editing.id);
    } else {
      await supabase.from("campaigns").insert(data);
    }
    setLoading(false);
    setShowForm(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("campaigns").delete().eq("id", id);
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campanhas</h1>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Nova Campanha</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((c) => (
          <Card key={c.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{c.name}</CardTitle>
              <div className="flex gap-1">
                <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Ativa" : "Inativa"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {c.context && <p className="text-xs text-muted-foreground line-clamp-2">{c.context}</p>}
              {c.funnel_stages?.name && <Badge variant="outline">Gatilho: {c.funnel_stages.name}</Badge>}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(c)}><Pencil className="mr-1 h-3 w-3" /> Editar</Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="mr-1 h-3 w-3" /> Excluir</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {showForm && (
        <Dialog open onOpenChange={() => setShowForm(false)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Editar Campanha" : "Nova Campanha"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-1"><Label>Contexto</Label><Textarea value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} rows={4} placeholder="Descrição da campanha, produto, oferta..." /></div>
              <div className="space-y-1"><Label>Prompt de geração</Label><Textarea value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} rows={4} placeholder="Instruções de tom, formato, persona..." /></div>
              <div className="space-y-1">
                <Label>Etapa gatilho (diferencial)</Label>
                <Select value={form.trigger_stage_id} onValueChange={(v) => setForm({ ...form, trigger_stage_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Ativa</Label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}