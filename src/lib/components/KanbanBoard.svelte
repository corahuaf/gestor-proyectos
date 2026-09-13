<script lang="ts">
	import { flip } from 'svelte/animate';
	import { dndzone } from 'svelte-dnd-action';
	import TaskCard from './TaskCard.svelte';
	import { supabase } from '$lib/supabaseClient';
	import type { Column, Task } from '$lib/types';

	export let columns: Column[] = [];
	const flipDurationMs = 200;
	let newTaskTitle: Record<string, string> = {};
	let addingTaskFor: string | null = null;
	let deletingTaskId: string | null = null;
	let actionError = '';
	let newColumnName = '';
	let addingColumn = false;
	let editingColumnId: string | null = null;
	let editingColumnName = '';
	let updatingColumnId: string | null = null;

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
		const title = (newTaskTitle[column.id] || '').trim();
		if (!title) return;

		addingTaskFor = column.id;
		actionError = '';
		const positionIndex = column.tasks?.length || 0;
		const { data: task, error } = await supabase
			.from('tasks')
			.insert({
				project_id: column.project_id,
				column_id: column.id,
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
		}
		addingTaskFor = null;
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
		if (!columns[0]) {
			actionError = 'No se puede determinar el proyecto de esta columna.';
			return;
		}

		addingColumn = true;
		actionError = '';
		const { data: column, error } = await supabase
			.from('columns')
			.insert({
				project_id: columns[0].project_id,
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

<div class="flex h-full min-w-0 flex-1 items-start gap-4 overflow-x-auto bg-slate-50 p-4 sm:p-6">
	<div class="flex w-72 shrink-0 flex-col gap-3">
		<form
			on:submit|preventDefault={addColumn}
			class="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/70 p-3"
		>
			<label
				for="new-column"
				class="mb-2 block text-xs font-semibold uppercase tracking-wider text-emerald-800"
				>Nuevo estado</label
			>
			<div class="flex gap-2">
				<input
					id="new-column"
					bind:value={newColumnName}
					maxlength="100"
					placeholder="Ej. En revisión"
					class="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
				/>
				<button
					type="submit"
					disabled={addingColumn}
					class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
					>+</button
				>
			</div>
		</form>
	</div>
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
			<form on:submit|preventDefault={() => addTask(column)} class="flex gap-2 mb-3">
				<input
					aria-label="Título de la nueva tarea"
					placeholder="Nueva tarea..."
					bind:value={newTaskTitle[column.id]}
					class="min-w-0 flex-1 px-2 py-1.5 text-sm rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
				/>
				<button
					type="submit"
					disabled={addingTaskFor === column.id}
					aria-label="Añadir tarea"
					class="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
				>
					+
				</button>
			</form>

			<div
				class="flex-1 min-h-36 overflow-y-auto space-y-2 p-1"
				use:dndzone={{ items: column.tasks || [], flipDurationMs, zoneTabIndex: -1 }}
				on:consider={(e) => handleDndConsider(e, column.id)}
				on:finalize={(e) => handleDndFinalize(e, column.id)}
			>
				{#each column.tasks || [] as task (task.id)}
					<div animate:flip={{ duration: flipDurationMs }}>
						<TaskCard
							{task}
							on:delete={() => deleteTask(task.id)}
							on:update={handleTaskUpdate}
							disabled={deletingTaskId === task.id}
						/>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>
{#if actionError}
	<div
		class="fixed bottom-4 right-4 max-w-md rounded-md bg-red-600 px-4 py-3 text-sm text-white shadow-lg"
	>
		{actionError}
	</div>
{/if}
