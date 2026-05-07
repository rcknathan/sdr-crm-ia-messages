import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Workspace {
  id: string;
  name: string;
  created_by: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (ws: Workspace) => void;
  createWorkspace: (name: string) => Promise<Workspace | null>;
  loading: boolean;
  refetch: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = async () => {
    if (!user) { setWorkspaces([]); setLoading(false); return; }
    const { data } = await supabase
      .from("workspace_members")
      .select("workspace_id, workspaces(id, name, created_by)")
      .eq("user_id", user.id);
    const ws = (data || []).map((d: any) => d.workspaces).filter(Boolean) as Workspace[];
    setWorkspaces(ws);
    if (ws.length > 0 && !currentWorkspace) {
      const saved = localStorage.getItem("current_workspace");
      const found = ws.find((w) => w.id === saved);
      setCurrentWorkspace(found || ws[0]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchWorkspaces(); }, [user]);

  const createWorkspace = async (name: string) => {
    if (!user) return null;
    const { data, error } = await supabase.from("workspaces").insert({ name, created_by: user.id }).select().single();
    if (error || !data) return null;
    await fetchWorkspaces();
    setCurrentWorkspace(data);
    localStorage.setItem("current_workspace", data.id);
    return data;
  };

  const handleSetCurrent = (ws: Workspace) => {
    setCurrentWorkspace(ws);
    localStorage.setItem("current_workspace", ws.id);
  };

  return (
    <WorkspaceContext.Provider value={{ workspaces, currentWorkspace, setCurrentWorkspace: handleSetCurrent, createWorkspace, loading, refetch: fetchWorkspaces }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}