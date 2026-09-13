<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import type { Project } from '$lib/types';
	import { resolve } from '$app/paths';

	let proyectos: Project[] = [];
	let loading = true;
	let saving = false;
	let showCreateForm = false;
	let projectName = '';
	let projectDescription = '';
	let formError = '';
	let loadError = '';
	let actionError = '';
	let deletingProjectId: string | null = null;
	let updatingArchiveId: string | null = null;
	let showArchived = false;
	$: visibleProjects = proyectos.filter((project) =>
		showArchived ? Boolean(project.archived_at) : !project.archived_at
	);

	async function loadProjects() {
		loading = true;
		loadError = '';
		const { data, error } = await supabase
			.from('projects')
			.select('*')
			.order('created_at', { ascending: false });

		if (error) {
			loadError = 'No pudimos cargar tus proyectos. Comprueba la conexión e inténtalo de nuevo.';
		} else if (data) {
			proyectos = data;
		}
		loading = false;
	}

	async function createProject() {
		const name = projectName.trim();
		if (name.length < 3) {
			formError = 'El nombre debe tener al menos 3 caracteres.';
			return;
		}
		if (name.length > 100) {
			formError = 'El nombre no puede superar los 100 caracteres.';
			return;
		}
		if (projectDescription.trim().length > 500) {
			formError = 'La descripción no puede superar los 500 caracteres.';
			return;
		}

		saving = true;
		formError = '';
		const { data: project, error } = await supabase
			.from('projects')
			.insert({ name, description: projectDescription.trim() || null })
			.select()
			.single();

		if (error || !project) {
			formError = error?.message || 'No se pudo crear el proyecto.';
			saving = false;
			return;
		}

		const { error: columnsError } = await supabase.from('columns').insert([
			{ project_id: project.id, name: 'Pendiente', position_index: 0 },
			{ project_id: project.id, name: 'En progreso', position_index: 1 },
			{ project_id: project.id, name: 'Completado', position_index: 2 }
		]);

		if (columnsError) {
			formError = `Proyecto creado, pero no se pudieron crear sus columnas: ${columnsError.message}`;
		} else {
			projectName = '';
			projectDescription = '';
			showCreateForm = false;
			await loadProjects();
		}
		saving = false;
	}

	async function deleteProject(project: Project) {
		const confirmed = window.confirm(
			`¿Eliminar "${project.name}"? Esta acción borrará también sus columnas y tareas.`
		);
		if (!confirmed) return;

		deletingProjectId = project.id;
		actionError = '';
		const { error: tasksError } = await supabase
			.from('tasks')
			.delete()
			.eq('project_id', project.id);
		if (tasksError) {
			actionError = `No se pudieron eliminar las tareas: ${tasksError.message}`;
			deletingProjectId = null;
			return;
		}

		const { error: columnsError } = await supabase
			.from('columns')
			.delete()
			.eq('project_id', project.id);
		if (columnsError) {
			actionError = `No se pudieron eliminar las columnas: ${columnsError.message}`;
			deletingProjectId = null;
			return;
		}

		const { error: projectError } = await supabase.from('projects').delete().eq('id', project.id);
		if (projectError) {
			actionError = `No se pudo eliminar el proyecto: ${projectError.message}`;
		} else {
			proyectos = proyectos.filter((item) => item.id !== project.id);
		}
		deletingProjectId = null;
	}

	async function setArchived(project: Project, archived: boolean) {
		const action = archived ? 'archivar' : 'restaurar';
		if (!window.confirm(`¿Quieres ${action} "${project.name}"?`)) return;

		updatingArchiveId = project.id;
		actionError = '';
		const { data, error } = await supabase
			.from('projects')
			.update({ archived_at: archived ? new Date().toISOString() : null })
			.eq('id', project.id)
			.select()
			.single();

		if (error || !data) {
			actionError = error?.message || `No se pudo ${action} el proyecto.`;
		} else {
			proyectos = proyectos.map((item) => (item.id === project.id ? data : item));
		}
		updatingArchiveId = null;
	}

	onMount(loadProjects);
</script>

<div class="mx-auto max-w-6xl p-5 sm:p-8">
	<div class="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
		<div>
			<p class="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
				Panel de control
			</p>
			<h1 class="text-3xl font-bold tracking-tight text-slate-950">Tus proyectos</h1>
			<p class="mt-2 text-sm text-slate-500">Un lugar claro para convertir ideas en avances.</p>
		</div>
		<button
			on:click={() => {
				showCreateForm = !showCreateForm;
				formError = '';
			}}
			class="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800"
		>
			{showCreateForm ? 'Cancelar' : '+ Nuevo Proyecto'}
		</button>
	</div>

	<div class="mb-6 flex items-center justify-between gap-4">
		<div
			class="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
			role="tablist"
		>
			<button
				type="button"
				on:click={() => (showArchived = false)}
				class:tab-active={!showArchived}
				class="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
				role="tab"
				aria-selected={!showArchived}
			>
				Activos
			</button>
			<button
				type="button"
				on:click={() => (showArchived = true)}
				class:tab-active={showArchived}
				class="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
				role="tab"
				aria-selected={showArchived}
			>
				Archivados
			</button>
		</div>
		<span class="text-sm text-slate-400"
			>{visibleProjects.length} proyecto{visibleProjects.length === 1 ? '' : 's'}</span
		>
	</div>

	{#if showCreateForm}
		<form
			on:submit|preventDefault={createProject}
			class="mb-8 space-y-4 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm"
		>
			<div>
				<label class="mb-1 block text-sm font-medium text-slate-700" for="project-name"
					>Nombre</label
				>
				<input
					id="project-name"
					bind:value={projectName}
					required
					maxlength="100"
					class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
				/>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium text-slate-700" for="project-description"
					>Descripción</label
				>
				<textarea
					id="project-description"
					bind:value={projectDescription}
					rows="3"
					maxlength="500"
					class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
				></textarea>
			</div>
			{#if formError}<p class="text-sm text-red-600">{formError}</p>{/if}
			<button
				type="submit"
				disabled={saving}
				class="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 disabled:opacity-60"
			>
				{saving ? 'Creando...' : 'Crear proyecto'}
			</button>
		</form>
	{/if}

	{#if loadError}
		<div class="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700" role="alert">
			<div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
				<span>{loadError}</span>
				<button type="button" on:click={loadProjects} class="font-semibold underline"
					>Reintentar</button
				>
			</div>
		</div>
	{:else}
		{#if actionError}
			<div
				class="mb-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
				role="alert"
			>
				{actionError}
			</div>
		{/if}

		{#if loading}
			<div class="grid grid-cols-1 gap-5 md:grid-cols-3">
				{#each Array(3) as _}
					<div class="h-40 animate-pulse rounded-2xl bg-white/70 shadow-sm"></div>
				{/each}
			</div>
		{:else if visibleProjects.length === 0}
			<div class="rounded-2xl border border-dashed border-slate-300 bg-white/70 py-20 text-center">
				<p class="font-semibold text-slate-700">
					{showArchived ? 'No hay proyectos archivados.' : 'Tu espacio está listo.'}
				</p>
				<p class="mt-1 text-sm text-slate-500">
					{showArchived
						? 'Los proyectos archivados aparecerán aquí.'
						: 'Crea tu primer proyecto para empezar a organizar el trabajo.'}
				</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
				{#each visibleProjects as proyecto (proyecto.id)}
					<div
						class="group relative min-h-40 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-950/5"
					>
						<a href={resolve(`/proyectos/${proyecto.id}`)} class="block">
							<div class="mb-6 flex items-center justify-between">
								<span
									class:archived-badge={showArchived}
									class="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700"
									>{showArchived ? 'Archivado' : 'Proyecto'}</span
								>
								<span class="text-slate-300 transition group-hover:text-emerald-500">↗</span>
							</div>
							<h3 class="mb-2 text-lg font-bold text-slate-900">{proyecto.name}</h3>
							<p class="line-clamp-2 text-sm leading-6 text-slate-500">
								{proyecto.description || 'Sin descripción'}
							</p>
						</a>
						<div class="mt-5 flex items-center gap-3">
							<button
								type="button"
								on:click={() => setArchived(proyecto, !showArchived)}
								disabled={updatingArchiveId === proyecto.id}
								class="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
							>
								{updatingArchiveId === proyecto.id
									? 'Guardando...'
									: showArchived
										? 'Restaurar'
										: 'Archivar'}
							</button>
							<button
								type="button"
								on:click={() => deleteProject(proyecto)}
								disabled={deletingProjectId === proyecto.id}
								class="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
								aria-label={`Eliminar proyecto ${proyecto.name}`}
							>
								{deletingProjectId === proyecto.id ? 'Eliminando...' : 'Eliminar'}
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>
