
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Workspaces
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Workspace members
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Helper function: check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  )
$$;

-- Workspace RLS
CREATE POLICY "Members can view workspace" ON public.workspaces FOR SELECT
  USING (public.is_workspace_member(auth.uid(), id));
CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owners can update workspace" ON public.workspaces FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), id));

-- Workspace members RLS
CREATE POLICY "Members can view members" ON public.workspace_members FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert members" ON public.workspace_members FOR INSERT
  TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR auth.uid() = user_id);
CREATE POLICY "Members can delete own membership" ON public.workspace_members FOR DELETE
  USING (auth.uid() = user_id);

-- Funnel stages
CREATE TABLE public.funnel_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view stages" ON public.funnel_stages FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can manage stages" ON public.funnel_stages FOR INSERT
  TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update stages" ON public.funnel_stages FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete stages" ON public.funnel_stages FOR DELETE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Custom fields
CREATE TABLE public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view custom fields" ON public.custom_fields FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can manage custom fields" ON public.custom_fields FOR INSERT
  TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update custom fields" ON public.custom_fields FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete custom fields" ON public.custom_fields FOR DELETE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.funnel_stages(id) ON DELETE RESTRICT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  lead_source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view leads" ON public.leads FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can create leads" ON public.leads FOR INSERT
  TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update leads" ON public.leads FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete leads" ON public.leads FOR DELETE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Custom field values
CREATE TABLE public.custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  UNIQUE(lead_id, field_id)
);

ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view field values" ON public.custom_field_values FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND public.is_workspace_member(auth.uid(), l.workspace_id)));
CREATE POLICY "Members can manage field values" ON public.custom_field_values FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND public.is_workspace_member(auth.uid(), l.workspace_id)));
CREATE POLICY "Members can update field values" ON public.custom_field_values FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND public.is_workspace_member(auth.uid(), l.workspace_id)));
CREATE POLICY "Members can delete field values" ON public.custom_field_values FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND public.is_workspace_member(auth.uid(), l.workspace_id)));

-- Stage required fields
CREATE TABLE public.stage_required_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES public.funnel_stages(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  is_custom_field BOOLEAN NOT NULL DEFAULT false,
  custom_field_id UUID REFERENCES public.custom_fields(id) ON DELETE CASCADE
);

ALTER TABLE public.stage_required_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view stage required fields" ON public.stage_required_fields FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.funnel_stages s WHERE s.id = stage_id AND public.is_workspace_member(auth.uid(), s.workspace_id)));
CREATE POLICY "Members can manage stage required fields" ON public.stage_required_fields FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.funnel_stages s WHERE s.id = stage_id AND public.is_workspace_member(auth.uid(), s.workspace_id)));
CREATE POLICY "Members can update stage required fields" ON public.stage_required_fields FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.funnel_stages s WHERE s.id = stage_id AND public.is_workspace_member(auth.uid(), s.workspace_id)));
CREATE POLICY "Members can delete stage required fields" ON public.stage_required_fields FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.funnel_stages s WHERE s.id = stage_id AND public.is_workspace_member(auth.uid(), s.workspace_id)));

-- Campaigns
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  context TEXT,
  prompt TEXT,
  trigger_stage_id UUID REFERENCES public.funnel_stages(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view campaigns" ON public.campaigns FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can create campaigns" ON public.campaigns FOR INSERT
  TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update campaigns" ON public.campaigns FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete campaigns" ON public.campaigns FOR DELETE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Generated messages
CREATE TABLE public.generated_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  variant INT NOT NULL DEFAULT 1,
  is_sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view messages" ON public.generated_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND public.is_workspace_member(auth.uid(), l.workspace_id)));
CREATE POLICY "Members can create messages" ON public.generated_messages FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND public.is_workspace_member(auth.uid(), l.workspace_id)));
CREATE POLICY "Members can update messages" ON public.generated_messages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND public.is_workspace_member(auth.uid(), l.workspace_id)));
CREATE POLICY "Members can delete messages" ON public.generated_messages FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND public.is_workspace_member(auth.uid(), l.workspace_id)));

-- Activity log
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view activity" ON public.activity_log FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can create activity" ON public.activity_log FOR INSERT
  TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- Function to create default funnel stages for a new workspace
CREATE OR REPLACE FUNCTION public.create_default_funnel_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.funnel_stages (workspace_id, name, position, color) VALUES
    (NEW.id, 'Base', 0, '#94a3b8'),
    (NEW.id, 'Lead Mapeado', 1, '#3b82f6'),
    (NEW.id, 'Tentando Contato', 2, '#f59e0b'),
    (NEW.id, 'Conexão Iniciada', 3, '#8b5cf6'),
    (NEW.id, 'Desqualificado', 4, '#ef4444'),
    (NEW.id, 'Qualificado', 5, '#22c55e'),
    (NEW.id, 'Reunião Agendada', 6, '#06b6d4');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.create_default_funnel_stages();

-- Function to auto-add creator as workspace owner
CREATE OR REPLACE FUNCTION public.add_workspace_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_workspace_created_add_owner
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.add_workspace_owner();
