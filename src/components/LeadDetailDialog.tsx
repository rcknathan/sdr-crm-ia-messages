import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Copy, Send, RefreshCw, Pencil } from "lucide-react";
import { LeadDialog } from "./LeadDialog";

interface Lead {
  id: string; name: string; email: string | null; company: string | null;
  stage_id: string; position: string | null; phone: string | null;
  lead_source: string | null; notes: string | null; assigned_to: string | null;
  workspace_id: string;
}

interface Props { lead: Lead; onClose: () => void; onSaved: () => void; }

export function LeadDetailDialog({ lead, onClose, onSaved }: Props) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [stages, setStages] = useState<any[]>([]);

  useEffect(() => {
    if (!currentWorkspace) return;
    supabase.from("campaigns").select("*").eq("workspace_id", currentWorkspace.id).eq("is_active", true).then(({ data }) => setCampaigns(data || []));
    supabase.from("generated_messages").select("*, campaigns(name)").eq("lead_id", lead.id).order("generated_at", { ascending: false }).then(({ data }) => setMessages(data || []));
    supabase.from("activity_log").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false }).limit(20).then(({ data }) => setActivities(data || []));
    supabase.from("funnel_stages").select("*").eq("workspace_id", currentWorkspace.id).order("position").then(({ data }) => setStages(data || []));
  }, [currentWorkspace, lead.id]);

  const generateMessages = async () => {
    if (!selectedCampaign || !user) return;
    setGenerating(true);
    const campaign = campaigns.find((c) => c.id === selectedCampaign);
    if (!campaign) { setGenerating(false); return; }

    // Fetch custom field values
    const { data: cfValues } = await supabase.from("custom_field_values").select("*, custom_fields(name)").eq("lead_id", lead.id);
    const customFieldsStr = (cfValues || []).map((v: any) => `${v.custom_fields?.name}: ${v.value}`).join("\n");

    const leadInfo = `Nome: ${lead.name}\nEmail: ${lead.email || "N/A"}\nEmpresa: ${lead.company || "N/A"}\nCargo: ${lead.position || "N/A"}\nTelefone: ${lead.phone || "N/A"}\nOrigem: ${lead.lead_source || "N/A"}\nObservações: ${lead.notes || "N/A"}\n${customFieldsStr}`;

    const systemPrompt = `Você é um assistente de vendas. Gere 3 variações de mensagens de abordagem personalizadas para o lead abaixo, baseadas no contexto e instruções da campanha.\n\nContexto da campanha:\n${campaign.context || "Sem contexto"}\n\nInstruções (prompt):\n${campaign.prompt || "Gere mensagens de abordagem profissionais."}\n\nDados do lead:\n${leadInfo}\n\nGere exatamente 3 variações de mensagens. Separe cada variação com "---SEPARATOR---". Não inclua numeração nem prefixos.`;

    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-message", {
        body: { prompt: systemPrompt },
      });
      if (error) throw error;
      const variants: string[] = data?.messages || [];

      // Delete old messages for this lead+campaign
      await supabase.from("generated_messages").delete().eq("lead_id", lead.id).eq("campaign_id", selectedCampaign);

      for (let i = 0; i < variants.length; i++) {
        await supabase.from("generated_messages").insert({
          lead_id: lead.id, campaign_id: selectedCampaign, content: variants[i], variant: i + 1,
        });
      }

      const { data: newMsgs } = await supabase.from("generated_messages").select("*, campaigns(name)").eq("lead_id", lead.id).order("generated_at", { ascending: false });
      setMessages(newMsgs || []);
    } catch (err) {
      console.error("Error generating messages:", err);
    }
    setGenerating(false);
  };

  const handleSend = async (messageId: string) => {
    if (!currentWorkspace || !user) return;
    await supabase.from("generated_messages").update({ is_sent: true, sent_at: new Date().toISOString() }).eq("id", messageId);
    // Move lead to "Tentando Contato"
    const tentandoStage = stages.find((s) => s.name === "Tentando Contato");
    if (tentandoStage) {
      await supabase.from("leads").update({ stage_id: tentandoStage.id }).eq("id", lead.id);
    }
    await supabase.from("activity_log").insert({
      workspace_id: currentWorkspace.id, lead_id: lead.id, user_id: user.id, action: "message_sent",
      details: { message_id: messageId },
    });
    onSaved();
  };

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const currentStage = stages.find((s) => s.id === lead.stage_id);

  return (
    <>
      <Dialog open={!showEdit} onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">{lead.name}</DialogTitle>
              {currentStage && <Badge style={{ backgroundColor: currentStage.color, color: "#fff" }}>{currentStage.name}</Badge>}
              <Button variant="ghost" size="icon" onClick={() => setShowEdit(true)}><Pencil className="h-4 w-4" /></Button>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {lead.email && <div><span className="text-muted-foreground">Email:</span> {lead.email}</div>}
            {lead.phone && <div><span className="text-muted-foreground">Telefone:</span> {lead.phone}</div>}
            {lead.company && <div><span className="text-muted-foreground">Empresa:</span> {lead.company}</div>}
            {lead.position && <div><span className="text-muted-foreground">Cargo:</span> {lead.position}</div>}
            {lead.lead_source && <div><span className="text-muted-foreground">Origem:</span> {lead.lead_source}</div>}
          </div>
          {lead.notes && <p className="text-sm text-muted-foreground">{lead.notes}</p>}

          <Tabs defaultValue="messages" className="mt-4">
            <TabsList>
              <TabsTrigger value="messages">Mensagens IA</TabsTrigger>
              <TabsTrigger value="activity">Atividades</TabsTrigger>
            </TabsList>

            <TabsContent value="messages" className="space-y-4">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma campanha" /></SelectTrigger>
                    <SelectContent>
                      {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={generateMessages} disabled={!selectedCampaign || generating}>
                  {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Gerar
                </Button>
              </div>

              {messages.filter((m) => !selectedCampaign || m.campaign_id === selectedCampaign).map((msg) => (
                <div key={msg.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{msg.campaigns?.name} — Variação {msg.variant}</Badge>
                    {msg.is_sent && <Badge className="bg-success text-success-foreground">Enviada</Badge>}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => copyMessage(msg.content)}>
                      <Copy className="mr-1 h-3 w-3" /> Copiar
                    </Button>
                    {!msg.is_sent && (
                      <Button size="sm" onClick={() => handleSend(msg.id)}>
                        <Send className="mr-1 h-3 w-3" /> Enviar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="activity" className="space-y-2">
              {activities.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>}
              {activities.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
                  <span>{a.action === "stage_change" ? `Movido de "${a.details?.from}" para "${a.details?.to}"` : a.action === "lead_created" ? "Lead criado" : a.action === "message_sent" ? "Mensagem enviada" : a.action}</span>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {showEdit && (
        <LeadDialog stageId={lead.stage_id} initialData={lead} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); onSaved(); }} />
      )}
    </>
  );
}