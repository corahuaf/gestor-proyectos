<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import KanbanBoard from '$lib/components/KanbanBoard.svelte';

	export let data: PageData;

	// SvelteKit inyecta automáticamente los datos retornados por +page.server.ts en la prop 'data'
	$: proyecto = data.project;
	$: columnas = data.columns;
	$: totalTasks = columnas.reduce((total, column) => total + (column.tasks?.length || 0), 0);
</script>

<div class="flex h-full flex-col bg-slate-50">
	<div class="border-b border-slate-200 bg-white px-5 py-5 sm:px-8">
		<a
			href={resolve('/')}
			class="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-emerald-600"
		>
			<span aria-hidden="true">←</span> Volver a proyectos
		</a>
		<div class="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
			<div>
				<p class="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
					Proyecto activo
				</p>
				<h1 class="text-2xl font-bold tracking-tight text-slate-950">{proyecto.name}</h1>
				{#if proyecto.description}
					<p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{proyecto.description}</p>
				{/if}
			</div>
			<div class="flex gap-2 text-center">
				<div class="rounded-xl bg-slate-50 px-4 py-2">
					<p class="text-lg font-bold text-slate-900">{columnas.length}</p>
					<p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Columnas</p>
				</div>
				<div class="rounded-xl bg-emerald-50 px-4 py-2">
					<p class="text-lg font-bold text-emerald-700">{totalTasks}</p>
					<p class="text-[10px] font-semibold uppercase tracking-wider text-emerald-600/70">
						Tareas
					</p>
				</div>
			</div>
		</div>
	</div>

	<div class="min-h-0 min-w-0 flex-1 overflow-hidden">
		<KanbanBoard columns={columnas} />
	</div>
</div>
