<script lang="ts">
	import { flip } from 'svelte/animate';
	import { dndzone } from 'svelte-dnd-action';
	import TaskCard from './TaskCard.svelte';
	import { supabase } from '$lib/supabaseClient';
	import type { Column, Task } from '$lib/types';

	export let columns: Column[] = [];
	export let projectId = '';
	const flipDurationMs = 200;
	let newTaskTitle: Record<string, string> = {};
	let addingTaskFor: string | null = null;
	let deletingTaskId: string | null = null;
	let actionError = '';
	let newColumnName = '';
	let addingColumn = false;
	let showAddColumnForm = false;
	let taskErrors: Record<string, string> = {};
	let editingColumnId: string | null = null;
	let editingColumnName = '';
	let updatingColumnId: string | null = null;
	function validTasks(column: Column) {
		return (column.tasks || []).filter((task) => task?.id && task.title);
	}

	// Actualiza el array temporalmente mientras se arrastra
	function handleDndConsider(e: CustomEvent<{ items: Column['tasks'] }>, columnId: string) {
		const colIndex = columns.findIndex((c) => c.id === columnId);
		if (colIndex === -1) return;
		columns[colIndex].tasks = e.detail.items || [];
		columns = [...columns];
	}

	// Fija la posición final al soltar el mouse
	async function handleDndFinalize(e: CustomEvent<{ items: Column['tasks'] }>, columnId: string) {
		const colIndex = columns.findIndex((c) => c.id === columnId);
		if (colIndex === -1) return;
		columns[colIndex].tasks = e.detail.items || [];
		columns = [...columns];
		await persistBoard();
	}

	async function persistBoard() {
		actionError = '';
		const updates = columns.flatMap((column) =>
			(column.tasks || []).map((task, positionIndex) =>
				supabase
					.from('tasks')
					.update({ column_id: column.id, position_index: positionIndex })
					.eq('id', task.id)
			)
		);
		const results = await Promise.all(updates);
		const failed = results.find((result) => result.error);
		if (failed?.error) actionError = `No se pudo guardar el orden: ${failed.error.message}`;
	}

	async function addTask(column: Column) {
		return addTaskWithParent(column, null, newTaskTitle[column.id] || '');
	}

	async function addTaskWithParent(column: Column, parentTaskId: string | null, rawTitle: string) {
		const title = rawTitle.trim();
		if (title.length < 2) {
			taskErrors = { ...taskErrors, [column.id]: 'Escribe al menos 2 caracteres.' };
			return;
		}
		if (title.length > 255) {
			taskErrors = { ...taskErrors, [column.id]: 'El título no puede superar los 255 caracteres.' };
			return;
		}

		addingTaskFor = column.id;
		actionError = '';
		taskErrors = { ...taskErrors, [column.id]: '' };
		const positionIndex = column.tasks?.length || 0;
		const { data: task, error } = await supabase
			.from('tasks')
			.insert({
				project_id: column.project_id,
				column_id: column.id,
				parent_task_id: parentTaskId,
				title,
				description: null,
				priority: 'media',
				due_date: null,
				reminder_sent: false,
				position_index: positionIndex
			})
			.select()
			.single();

		if (error || !task) {
			actionError = error?.message || 'No se pudo crear la tarea.';
		} else {
			column.tasks = [...(column.tasks || []), task];
			columns = [...columns];
			newTaskTitle = { ...newTaskTitle, [column.id]: '' };
			taskErrors = { ...taskErrors, [column.id]: '' };
		}
		addingTaskFor = null;
	}

	function handleTaskInput(columnId: string, event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		newTaskTitle = { ...newTaskTitle, [columnId]: value };
		if (taskErrors[columnId]) taskErrors = { ...taskErrors, [columnId]: '' };
	}

	async function deleteTask(taskId: string) {
		deletingTaskId = taskId;
		actionError = '';
		const { error } = await supabase.from('tasks').delete().eq('id', taskId);
		if (error) {
			actionError = `No se pudo eliminar la tarea: ${error.message}`;
		} else {
			columns = columns.map((column) => ({
				...column,
				tasks: (column.tasks || []).filter((task) => task.id !== taskId)
			}));
			await persistBoard();
		}
		deletingTaskId = null;
	}

	async function updateTask(taskId: string, changes: Partial<Task>) {
		actionError = '';
		const { error } = await supabase.from('tasks').update(changes).eq('id', taskId);
		if (error) {
			actionError = `No se pudo actualizar la tarea: ${error.message}`;
			return;
		}

		columns = columns.map((column) => ({
			...column,
			tasks: (column.tasks || []).map((task) =>
				task.id === taskId ? { ...task, ...changes } : task
			)
		}));
	}

	function handleTaskUpdate(event: CustomEvent<{ taskId: string; changes: Partial<Task> }>) {
		void updateTask(event.detail.taskId, event.detail.changes);
	}

	function handleSubtaskAdd(event: CustomEvent<{ parentTaskId: string; title: string }>) {
		const parent = columns
			.flatMap((column) => column.tasks || [])
			.find((task) => task.id === event.detail.parentTaskId);
		const column = columns.find((item) => item.id === parent?.column_id);
		if (column) void addTaskWithParent(column, event.detail.parentTaskId, event.detail.title);
	}

	async function addColumn() {
		const name = newColumnName.trim();
		if (name.length < 2) {
			actionError = 'El nombre del estado debe tener al menos 2 caracteres.';
			return;
		}
		if (name.length > 100) {
			actionError = 'El nombre del estado no puede superar los 100 caracteres.';
			return;
		}
		if (!projectId) {
			actionError = 'No se puede determinar el proyecto de este tablero.';
			return;
		}

		addingColumn = true;
		actionError = '';
		const { data: column, error } = await supabase
			.from('columns')
			.insert({
				project_id: projectId,
				name,
				position_index: columns.length
			})
			.select()
			.single();

		if (error || !column) {
			actionError = error?.message || 'No se pudo crear el estado.';
		} else {
			columns = [...columns, { ...column, tasks: [] }];
			newColumnName = '';
			showAddColumnForm = false;
		}
		addingColumn = false;
	}

	function startEditingColumn(column: Column) {
		editingColumnId = column.id;
		editingColumnName = column.name;
		actionError = '';
	}

	function cancelEditingColumn() {
		editingColumnId = null;
		editingColumnName = '';
	}

	async function renameColumn(column: Column) {
		const name = editingColumnName.trim();
		if (name.length < 2 || name.length > 100) {
			actionError = 'El nombre del estado debe tener entre 2 y 100 caracteres.';
			return;
		}

		updatingColumnId = column.id;
		actionError = '';
		const { error } = await supabase.from('columns').update({ name }).eq('id', column.id);
		if (error) {
			actionError = `No se pudo renombrar el estado: ${error.message}`;
		} else {
			columns = columns.map((item) => (item.id === column.id ? { ...item, name } : item));
			cancelEditingColumn();
		}
		updatingColumnId = null;
	}

	async function deleteColumn(column: Column) {
		if ((column.tasks || []).length > 0) {
			actionError = 'No puedes eliminar un estado con tareas. Mueve o elimina sus tareas primero.';
			return;
		}
		if (!window.confirm(`¿Eliminar el estado "${column.name}"?`)) return;

		updatingColumnId = column.id;
		actionError = '';
		const { error } = await supabase.from('columns').delete().eq('id', column.id);
		if (error) {
			actionError = `No se pudo eliminar el estado: ${error.message}`;
		} else {
			columns = columns
				.filter((item) => item.id !== column.id)
				.map((item, position_index) => ({ ...item, position_index }));
			await Promise.all(
				columns.map((item) =>
					supabase.from('columns').update({ position_index: item.position_index }).eq('id', item.id)
				)
			);
		}
		updatingColumnId = null;
	}

	function handleColumnRenameKeydown(event: KeyboardEvent, column: Column) {
		if (event.key === 'Enter') void renameColumn(column);
		if (event.key === 'Escape') cancelEditingColumn();
	}
</script>

<div class="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-50 p-4 sm:p-6">
	<div
		class="mb-4 flex shrink-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
	>
		<div>
			<p class="text-sm font-semibold text-slate-800">Flujo de trabajo</p>
			<p class="text-xs text-slate-500">
				Organiza tus tareas por estado y arrástralas entre columnas.
			</p>
		</div>
		{#if showAddColumnForm}
			<form
				on:submit|preventDefault={addColumn}
				class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"
			>
				<label class="sr-only" for="new-column">Nombre del nuevo estado</label>
				<input
					id="new-column"
					bind:value={newColumnName}
					maxlength="100"
					placeholder="Nombre del estado"
					class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 sm:w-48"
				/>
				<button
					type="submit"
					disabled={addingColumn || newColumnName.trim().length < 2}
					class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{addingColumn ? 'Guardando...' : 'Agregar estado'}
				</button>
				<button
					type="button"
					on:click={() => (showAddColumnForm = false)}
					class="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
					>Cancelar</button
				>
			</form>
		{:else}
			<button
				type="button"
				on:click={() => (showAddColumnForm = true)}
				class="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
			>
				+ Agregar estado
			</button>
		{/if}
	</div>

	<div class="flex min-h-0 flex-1 items-start gap-4 overflow-x-auto pb-3">
		{#each columns as column (column.id)}
			<div
				class="flex max-h-full min-h-0 w-80 shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-200/50 p-3"
			>
				<div class="mb-3 flex items-start justify-between gap-2 px-1">
					{#if editingColumnId === column.id}
						<input
							value={editingColumnName}
							on:input={(event) =>
								(editingColumnName = (event.currentTarget as HTMLInputElement).value)}
							on:keydown={(event) => handleColumnRenameKeydown(event, column)}
							class="min-w-0 flex-1 rounded-lg border border-emerald-400 bg-white px-2 py-1 text-sm font-bold text-slate-700 outline-none"
							aria-label="Nombre del estado"
						/>
					{:else}
						<h3 class="min-w-0 flex-1 truncate font-bold text-slate-700">{column.name}</h3>
					{/if}
					<div class="flex shrink-0 items-center gap-1">
						{#if editingColumnId === column.id}
							<button
								type="button"
								on:click={() => renameColumn(column)}
								disabled={updatingColumnId === column.id}
								class="rounded px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
								aria-label="Guardar nombre">Guardar</button
							>
							<button
								type="button"
								on:click={cancelEditingColumn}
								class="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-200"
								aria-label="Cancelar edición">Cancelar</button
							>
						{:else}
							<button
								type="button"
								on:click={() => startEditingColumn(column)}
								class="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-200"
								aria-label={`Editar ${column.name}`}>Editar</button
							>
							<button
								type="button"
								on:click={() => deleteColumn(column)}
								disabled={updatingColumnId === column.id}
								class="rounded px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
								aria-label={`Eliminar ${column.name}`}>×</button
							>
						{/if}
					</div>
					<span class="bg-slate-300 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">
						{column.tasks?.length || 0}
					</span>
				</div>
				<form
					on:submit|preventDefault={() => addTask(column)}
					class="mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
				>
					<label for={`task-${column.id}`} class="mb-2 block text-xs font-semibold text-slate-600"
						>Nueva tarea</label
					>
					<div class="flex gap-2">
						<input
							id={`task-${column.id}`}
							aria-label="Título de la nueva tarea"
							placeholder="Escribe el título..."
							maxlength="255"
							value={newTaskTitle[column.id] || ''}
							on:input={(event) => handleTaskInput(column.id, event)}
							class="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
						/>
						<button
							type="submit"
							disabled={addingTaskFor === column.id ||
								(newTaskTitle[column.id] || '').trim().length < 2}
							class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{addingTaskFor === column.id ? '...' : 'Añadir'}
						</button>
					</div>
					{#if taskErrors[column.id]}
						<p class="mt-2 text-xs font-medium text-red-600" role="alert">
							{taskErrors[column.id]}
						</p>
					{/if}
				</form>

				<div
					class="flex-1 min-h-36 overflow-y-auto space-y-2 p-1"
					use:dndzone={{ items: validTasks(column), flipDurationMs, zoneTabIndex: -1 }}
					on:consider={(e) => handleDndConsider(e, column.id)}
					on:finalize={(e) => handleDndFinalize(e, column.id)}
				>
					{#each validTasks(column) as task (task.id)}
						<div animate:flip={{ duration: flipDurationMs }}>
							<TaskCard
								{task}
								on:delete={() => deleteTask(task.id)}
								on:update={handleTaskUpdate}
								on:add-subtask={handleSubtaskAdd}
								disabled={deletingTaskId === task.id}
							/>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
{#if actionError}
	<div
		class="fixed bottom-4 right-4 max-w-md rounded-md bg-red-600 px-4 py-3 text-sm text-white shadow-lg"
	>
		{actionError}
	</div>
{/if}
