-- Funcionalidades de colaboración y seguridad por usuario.
ALTER TABLE public.projects
	ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.tasks
	ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);

CREATE TABLE IF NOT EXISTS public.tags (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
	name VARCHAR(50) NOT NULL,
	color VARCHAR(7) DEFAULT '#808080',
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(owner_id, name)
);

CREATE TABLE IF NOT EXISTS public.task_tags (
	task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
	tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
	PRIMARY KEY (task_id, tag_id)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_authenticated_access ON public.projects;
DROP POLICY IF EXISTS columns_authenticated_access ON public.columns;
DROP POLICY IF EXISTS tasks_authenticated_access ON public.tasks;
DROP POLICY IF EXISTS tags_authenticated_access ON public.tags;
DROP POLICY IF EXISTS task_tags_authenticated_access ON public.task_tags;

DROP POLICY IF EXISTS projects_owner_access ON public.projects;
CREATE POLICY projects_owner_access ON public.projects
	FOR ALL TO authenticated
	USING (owner_id = auth.uid())
	WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS columns_owner_access ON public.columns;
CREATE POLICY columns_owner_access ON public.columns
	FOR ALL TO authenticated
	USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()))
	WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

DROP POLICY IF EXISTS tasks_owner_access ON public.tasks;
CREATE POLICY tasks_owner_access ON public.tasks
	FOR ALL TO authenticated
	USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()))
	WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

DROP POLICY IF EXISTS tags_owner_access ON public.tags;
CREATE POLICY tags_owner_access ON public.tags
	FOR ALL TO authenticated
	USING (owner_id = auth.uid())
	WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS task_tags_owner_access ON public.task_tags;
CREATE POLICY task_tags_owner_access ON public.task_tags
	FOR ALL TO authenticated
	USING (EXISTS (
		SELECT 1 FROM public.tasks t
		JOIN public.projects p ON p.id = t.project_id
		WHERE t.id = task_id AND p.owner_id = auth.uid()
	))
	WITH CHECK (EXISTS (
		SELECT 1 FROM public.tasks t
		JOIN public.projects p ON p.id = t.project_id
		WHERE t.id = task_id AND p.owner_id = auth.uid()
	));
