export interface Project {
	id: string;
	owner_id: string | null;
	name: string;
	description: string | null;
	archived_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface Task {
	id: string;
	project_id: string;
	column_id: string;
	parent_task_id: string | null;
	title: string;
	description: string | null;
	priority: 'baja' | 'media' | 'alta' | 'critica';
	due_date: string | null;
	reminder_sent: boolean;
	position_index: number;
	assigned_to?: string | null;
}

export interface Column {
	id: string;
	project_id: string;
	name: string;
	position_index: number;
	tasks?: Task[]; // Array anidado inyectado por la consulta a Supabase
}
