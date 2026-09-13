<script lang="ts">
	import type { Task } from '$lib/types';
	import { createEventDispatcher } from 'svelte';
	export let task: Task;
	export let disabled = false;

	const dispatch = createEventDispatcher();

	const priorityStyles = {
		baja: 'bg-slate-100 text-slate-600',
		media: 'bg-blue-100 text-blue-700',
		alta: 'bg-orange-100 text-orange-700',
		critica: 'bg-red-100 text-red-700'
	};

	function handlePriorityChange(event: Event) {
		const priority = (event.currentTarget as HTMLSelectElement).value as Task['priority'];
		dispatch('update', { taskId: task.id, changes: { priority } });
	}

	function handleDueDateChange(event: Event) {
		const dueDate = (event.currentTarget as HTMLInputElement).value || null;
		dispatch('update', { taskId: task.id, changes: { due_date: dueDate } });
	}
</script>

<!-- La tarjeta requiere el cursor-grab para integrarse bien con svelte-dnd-action -->
<div
	class="bg-white p-3 rounded-md shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:border-emerald-400 transition-colors"
>
	<div class="flex items-start justify-between gap-2">
		<h4 class="font-medium text-sm text-slate-800 mb-1">{task.title}</h4>
		<button
			type="button"
			{disabled}
			on:click|stopPropagation={() => dispatch('delete')}
			aria-label="Eliminar tarea"
			class="text-slate-400 hover:text-red-600 disabled:opacity-50"
		>
			&times;
		</button>
	</div>

	{#if task.description}
		<p class="text-xs text-slate-500 mb-3 line-clamp-2">{task.description}</p>
	{/if}

	<div class="flex items-center justify-between mt-2">
		<span
			class="text-[10px] font-bold px-2 py-0.5 rounded uppercase {priorityStyles[task.priority]}"
		>
			{task.priority}
		</span>
		<select
			aria-label="Prioridad de la tarea"
			value={task.priority}
			on:change={handlePriorityChange}
			class="text-xs border-0 bg-transparent text-slate-500 focus:ring-0"
		>
			<option value="baja">Baja</option>
			<option value="media">Media</option>
			<option value="alta">Alta</option>
			<option value="critica">Crítica</option>
		</select>

		{#if task.due_date}
			<span class="text-xs text-slate-400 flex items-center gap-1">
				📅 {new Date(task.due_date).toLocaleDateString()}
			</span>
		{/if}
	</div>
	<label class="block mt-2 text-[11px] text-slate-400">
		Fecha límite
		<input
			type="date"
			aria-label="Fecha límite de la tarea"
			value={task.due_date?.slice(0, 10) || ''}
			on:change={handleDueDateChange}
			class="block w-full mt-1 text-xs text-slate-500 border border-slate-200 rounded px-2 py-1"
		/>
	</label>
</div>
