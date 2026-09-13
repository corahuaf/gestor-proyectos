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
</script>

<div class="flex h-full min-w-0 flex-1 items-start gap-4 overflow-x-auto bg-slate-50 p-4 sm:p-6">
	{#each columns as column (column.id)}
		<div
			class="bg-slate-200/50 border border-slate-200 min-w-[320px] w-[320px] rounded-xl p-3 flex flex-col max-h-full"
		>
			<div class="flex justify-between items-center mb-3 px-1">
				<h3 class="font-bold text-slate-700">{column.name}</h3>
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
