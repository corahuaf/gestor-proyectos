<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<aside
	class="w-64 bg-slate-950 text-white h-screen flex flex-col shrink-0 shadow-2xl shadow-slate-900/10"
>
	<div class="p-6 pb-8">
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
	</div>
	<nav class="flex-1 space-y-1 px-3" aria-label="Navegación principal">
		<a
			href={resolve('/')}
			class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
		>
			<span class="text-emerald-400">01</span> Dashboard
		</a>
		<a
			href={resolve('/proyectos')}
			class="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-emerald-400 transition-colors hover:bg-slate-700"
			>Mis Proyectos</a
		>
	</nav>
	<div class="border-t border-slate-800 p-4 text-xs text-slate-500">
		Tu espacio de trabajo personal
	</div>
</aside>
