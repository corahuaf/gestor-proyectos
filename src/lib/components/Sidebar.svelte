<script lang="ts">
	import { resolve } from '$app/paths';
	import { createEventDispatcher } from 'svelte';

	export let mobileOpen = false;
	const dispatch = createEventDispatcher();
</script>

<aside
	class:translate-x-0={mobileOpen}
	class="fixed inset-y-0 left-0 z-50 flex h-screen w-72 shrink-0 -translate-x-full flex-col bg-slate-950 text-white shadow-2xl shadow-slate-900/10 transition-transform duration-200 md:static md:z-auto md:translate-x-0"
>
	<div class="flex items-start justify-between p-6 pb-8">
		<div class="flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 font-black text-slate-950"
			>
				G
			</div>
			<div>
				<h1 class="text-lg font-bold tracking-wide text-white">
					GESTOR<span class="text-emerald-400">PRO</span>
				</h1>
				<p class="text-[11px] uppercase tracking-[0.18em] text-slate-500">Workspace</p>
			</div>
		</div>
		<button
			type="button"
			on:click={() => dispatch('close')}
			class="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
			aria-label="Cerrar menú"
		>
			<span aria-hidden="true" class="text-xl leading-none">&times;</span>
		</button>
	</div>
	<nav class="flex-1 space-y-1 px-3" aria-label="Navegación principal">
		<a
			href={resolve('/')}
			on:click={() => dispatch('close')}
			class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
		>
			<span class="text-emerald-400">01</span> Dashboard
		</a>
		<a
			href={resolve('/proyectos')}
			on:click={() => dispatch('close')}
			class="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-emerald-400 transition-colors hover:bg-slate-700"
			>Mis Proyectos</a
		>
	</nav>
	<div class="border-t border-slate-800 p-4 text-xs text-slate-500">
		Tu espacio de trabajo personal
	</div>
</aside>
