-- Ejecuta este archivo completo en Supabase SQL Editor.
-- Primero crea las columnas; después crea las políticas que las utilizan.

ALTER TABLE public.projects
	ADD COLUMN IF NOT EXISTS owner_id UUID;

ALTER TABLE public.tasks
	ADD COLUMN IF NOT EXISTS assigned_to UUID;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'projects_owner_id_fkey'
	) THEN
		ALTER TABLE public.projects
			ADD CONSTRAINT projects_owner_id_fkey
			FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'tasks_assigned_to_fkey'
	) THEN
		ALTER TABLE public.tasks
			ADD CONSTRAINT tasks_assigned_to_fkey
			FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
	END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_authenticated_access ON public.projects;
DROP POLICY IF EXISTS columns_authenticated_access ON public.columns;
DROP POLICY IF EXISTS tasks_authenticated_access ON public.tasks;
DROP POLICY IF EXISTS projects_owner_access ON public.projects;
DROP POLICY IF EXISTS columns_owner_access ON public.columns;
DROP POLICY IF EXISTS tasks_owner_access ON public.tasks;

CREATE POLICY projects_owner_access ON public.projects
	FOR ALL TO authenticated
	USING (owner_id = auth.uid())
	WITH CHECK (owner_id = auth.uid());

CREATE POLICY columns_owner_access ON public.columns
	FOR ALL TO authenticated
	USING (
		EXISTS (
			SELECT 1 FROM public.projects p
			WHERE p.id = project_id AND p.owner_id = auth.uid()
		)
	)
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.projects p
			WHERE p.id = project_id AND p.owner_id = auth.uid()
		)
	);

CREATE POLICY tasks_owner_access ON public.tasks
	FOR ALL TO authenticated
	USING (
		EXISTS (
			SELECT 1 FROM public.projects p
			WHERE p.id = project_id AND p.owner_id = auth.uid()
		)
	)
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.projects p
			WHERE p.id = project_id AND p.owner_id = auth.uid()
		)
	);

-- Verificación final: ambas columnas deben aparecer en el resultado.
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
	AND ((table_name = 'projects' AND column_name = 'owner_id')
		OR (table_name = 'tasks' AND column_name = 'assigned_to'))
ORDER BY table_name, column_name;
