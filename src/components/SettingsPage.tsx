import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, GripVertical } from "lucide-react";

export function SettingsPage() {
  const { currentWorkspace } = useWorkspace();
  const [stages, setStages] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newStageName, setNewStageName] = useState("");
  const [reqFields, setReqFields] = useState<Record<string, any[]>>({});
  const [selectedStage, setSelectedStage] = useState("");
  const [newReqField, setNewReqField] = useState("");

  const standardFields = ["name", "email", "phone", "company", "position", "lead_source", "notes"];

  const fetchData = async () => {
    if (!currentWorkspace) return;
    const [s, cf, rf] = await Promise.all([
      supabase.from("funnel_stages").select("*").eq("workspace_id", currentWorkspace.id).order("position"),
      supabase.from("custom_fields").select("*").eq("workspace_id", currentWorkspace.id).order("created_at"),
      supabase.from("stage_required_fields").select("*, funnel_stages!inner(workspace_id)").eq("funnel_stages.workspace_id", currentWorkspace.id),
    ]);
    setStages(s.data || []);
    setCustomFields(cf.data || []);
    const map: Record<string, any[]> = {};
    (rf.data || []).forEach((r: any) => { if (!map[r.stage_id]) map[r.stage_id] = []; map[r.stage_id].push(r); });
    setReqFields(map);
  };

  useEffect(() => { fetchData(); }, [currentWorkspace]);

  const addCustomField = async () => {
    if (!currentWorkspace || !newFieldName) return;
    await supabase.from("custom_fields").insert({ workspace_id: currentWorkspace.id, name: newFieldName, field_type: "text" });
    setNewFieldName("");
    fetchData();
  };

  const deleteCustomField = async (id: string) => {
    await supabase.from("custom_fields").delete().eq("id", id);
    fetchData();
  };

  const addStage = async () => {
    if (!currentWorkspace || !newStageName) return;
    const maxPos = stages.reduce((m, s) => Math.max(m, s.position), 0);
    await supabase.from("funnel_stages").insert({ workspace_id: currentWorkspace.id, name: newStageName, position: maxPos + 1 });
    setNewStageName("");
    fetchData();
  };

  const deleteStage = async (id: string) => {
    await supabase.from("funnel_stages").delete().eq("id", id);
    fetchData();
  };

  const addRequiredField = async () => {
    if (!selectedStage || !newReqField) return;
    await supabase.from("stage_required_fields").insert({ stage_id: selectedStage, field_name: newReqField, is_custom_field: false });
    setNewReqField("");
    fetchData();
  };

  const removeRequiredField = async (id: string) => {
    await supabase.from("stage_required_fields").delete().eq("id", id);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <Tabs defaultValue="funnel">
        <TabsList>
          <TabsTrigger value="funnel">Funil</TabsTrigger>
          <TabsTrigger value="fields">Campos Personalizados</TabsTrigger>
          <TabsTrigger value="rules">Regras de Transição</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Etapas do Funil</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {stages.map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-lg border p-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="flex-1 text-sm">{s.name}</span>
                  <Badge variant="outline">{s.position}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => deleteStage(s.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Input value={newStageName} onChange={(e) => setNewStageName(e.target.value)} placeholder="Nova etapa..." />
                <Button onClick={addStage}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Campos Personalizados</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {customFields.map((f) => (
                <div key={f.id} className="flex items-center gap-2 rounded-lg border p-2">
                  <span className="flex-1 text-sm">{f.name}</span>
                  <Badge variant="outline">{f.field_type}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => deleteCustomField(f.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Input value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} placeholder="Nome do campo..." />
                <Button onClick={addCustomField}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Campos Obrigatórios por Etapa</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Selecione a etapa</Label>
                <Select value={selectedStage} onValueChange={setSelectedStage}>
                  <SelectTrigger><SelectValue placeholder="Escolha uma etapa..." /></SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {selectedStage && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Campos obrigatórios para entrar nesta etapa:</p>
                  {(reqFields[selectedStage] || []).map((rf) => (
                    <div key={rf.id} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{rf.field_name}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => removeRequiredField(rf.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Select value={newReqField} onValueChange={setNewReqField}>
                      <SelectTrigger><SelectValue placeholder="Campo..." /></SelectTrigger>
                      <SelectContent>
                        {standardFields.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button onClick={addRequiredField}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}