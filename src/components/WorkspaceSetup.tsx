import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Building2, LogOut } from "lucide-react";

export function WorkspaceSetup() {
  const { createWorkspace } = useWorkspace();
  const { signOut } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await createWorkspace(name);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Building2 className="mx-auto h-10 w-10 text-primary" />
          <CardTitle className="text-xl">Crie seu Workspace</CardTitle>
          <CardDescription>Um workspace representa sua empresa ou equipe.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="ws-name">Nome do workspace</Label>
              <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Minha Empresa" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Workspace
            </Button>
          </form>
          <Button variant="ghost" className="mt-4 w-full" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}