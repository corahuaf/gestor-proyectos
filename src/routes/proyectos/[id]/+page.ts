import { error } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';
import type { PageLoad } from './$types';

export const ssr = false;

export const load: PageLoad = async ({ params }) => {
	const { data: project, error: projectError } = await supabase
		.from('projects')
		.select('*')
		.eq('id', params.id)
		.single();

	if (projectError || !project) {
		throw error(404, 'Proyecto no encontrado');
	}

	const { data: columns, error: columnsError } = await supabase
		.from('columns')
		.select(`
			id,
			project_id,
			name,
			position_index,
			tasks (
				id,
				project_id,
				column_id,
				parent_task_id,
				title,
				description,
				priority,
				due_date,
				reminder_sent,
				position_index
			)
		`)
		.eq('project_id', params.id)
		.order('position_index', { ascending: true })
		.order('position_index', { referencedTable: 'tasks', ascending: true });

	if (columnsError) {
		throw error(500, 'Error al cargar el tablero');
	}

	return {
		project,
		columns: columns || []
	};
};