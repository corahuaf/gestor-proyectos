<script lang="ts">
	import type { Task } from '$lib/types';
	import { createEventDispatcher } from 'svelte';

	export let task: Task;
	export let isSubtask = false;
	export let disabled = false;

	let editingPriority = false;
	let editingDueDate = false;
	let editingDetails = false;
	let addingSubtask = false;
	let subtaskTitle = '';
	let draftTitle = task.title;
	let draftDescription = task.description || '';

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
		editingPriority = false;
	}

	function handleDueDateChange(event: Event) {
		const dueDate = (event.currentTarget as HTMLInputElement).value || null;
		dispatch('update', { taskId: task.id, changes: { due_date: dueDate } });
		editingDueDate = false;
	}

	function handleKeydown(event: KeyboardEvent, close: () => void) {
		if (event.key === 'Escape') close();
	}

	function saveDetails() {
		const title = draftTitle.trim();
		if (title.length < 2 || title.length > 255) return;
		dispatch('update', {
			taskId: task.id,
			changes: { title, description: draftDescription.trim() || null }
		});
		editingDetails = false;
	}

	function cancelDetails() {
		draftTitle = task.title;
		draftDescription = task.description || '';
		editingDetails = false;
	}

	function createSubtask() {
		const title = subtaskTitle.trim();
		if (title.length < 2 || title.length > 255) return;
		dispatch('add-subtask', { parentTaskId: task.id, title });
		subtaskTitle = '';
		addingSubtask = false;
	}
</script>

<div
	class="cursor-grab rounded-md border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-emerald-400 active:cursor-grabbing"
>
	<div class="flex items-start justify-between gap-2">
		{#if editingDetails}
			<div class="min-w-0 flex-1 space-y-2">
				<input
					bind:value={draftTitle}
					maxlength="255"
					aria-label="Título de la tarea"
					class="w-full rounded-md border border-slate-200 px-2 py-1 text-sm font-medium outline-none focus:border-emerald-500"
				/>
				<textarea
					bind:value={draftDescription}
					maxlength="2000"
					rows="3"
					aria-label="Descripción de la tarea"
					placeholder="Añade una descripción..."
					class="w-full rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-emerald-500"
				></textarea>
				<div class="flex gap-2">
					<button
						type="button"
						on:click={saveDetails}
						disabled={draftTitle.trim().length < 2}
						class="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
						>Guardar</button
					>
					<button
						type="button"
						on:click={cancelDetails}
						class="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">Cancelar</button
					>
				</div>
			</div>
		{:else}
			<button
				type="button"
				on:click|stopPropagation={() => (editingDetails = true)}
				class="min-w-0 flex-1 text-left"
				aria-label="Editar tarea"
			>
				<h4 class="mb-1 truncate text-sm font-medium text-slate-800">{task.title}</h4>
				{#if task.description}<p class="line-clamp-2 text-xs text-slate-500">
						{task.description}
					</p>{/if}
			</button>
		{/if}
		<button
			type="button"
			{disabled}
			on:click|stopPropagation={() => dispatch('delete')}
			aria-label="Eliminar tarea"
			class="text-slate-400 hover:text-red-600 disabled:opacity-50">&times;</button
		>
	</div>

	<div class="mt-2">
		<span
			class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide {isSubtask
				? 'bg-amber-50 text-amber-700'
				: 'bg-emerald-50 text-emerald-700'}"
		>
			{isSubtask ? 'Subtarea' : 'Tarea'}
		</span>
	</div>

	<div class="mt-3 flex flex-wrap items-center gap-2">
		{#if editingPriority}
			<select
				aria-label="Cambiar prioridad"
				value={task.priority}
				on:change={handlePriorityChange}
				on:keydown={(event) => handleKeydown(event, () => (editingPriority = false))}
				class="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none focus:border-emerald-500"
			>
				<option value="baja">Baja</option><option value="media">Media</option><option value="alta"
					>Alta</option
				><option value="critica">Crítica</option>
			</select>
		{:else}
			<button
				type="button"
				on:click|stopPropagation={() => (editingPriority = true)}
				class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase transition hover:ring-2 hover:ring-emerald-300 {priorityStyles[
					task.priority
				]}"
				aria-label={`Cambiar prioridad: ${task.priority}`}>{task.priority}</button
			>
		{/if}

		{#if editingDueDate}
			<input
				type="date"
				aria-label="Cambiar fecha límite"
				value={task.due_date?.slice(0, 10) || ''}
				on:change={handleDueDateChange}
				on:keydown={(event) => handleKeydown(event, () => (editingDueDate = false))}
				class="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none focus:border-emerald-500"
			/>
		{:else}
			<button
				type="button"
				on:click|stopPropagation={() => (editingDueDate = true)}
				class="rounded-full px-2 py-0.5 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
				aria-label="Cambiar fecha límite"
				>{task.due_date
					? `📅 ${new Date(task.due_date).toLocaleDateString()}`
					: '📅 Sin fecha'}</button
			>
		{/if}
	</div>

	{#if addingSubtask}
		<form on:submit|preventDefault={createSubtask} class="mt-3 flex gap-2">
			<input
				bind:value={subtaskTitle}
				maxlength="255"
				placeholder="Nombre de la subtarea"
				aria-label="Nombre de la subtarea"
				class="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-emerald-500"
			/>
			<button
				type="submit"
				disabled={subtaskTitle.trim().length < 2}
				class="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
				>Añadir</button
			>
			<button type="button" on:click={() => (addingSubtask = false)} class="text-xs text-slate-400"
				>Cancelar</button
			>
		</form>
	{:else}
		<button
			type="button"
			on:click|stopPropagation={() => (addingSubtask = true)}
			class="mt-3 text-xs font-semibold text-slate-400 hover:text-emerald-600">+ Subtarea</button
		>
	{/if}
</div>
