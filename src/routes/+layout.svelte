<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Session } from '@supabase/supabase-js';

	let session: Session | null = null;
	let initialized = false;
	$: currentPath = $page.url.pathname as string;
	$: pageTitle =
		currentPath === '/'
			? 'Dashboard'
			: currentPath.startsWith('/proyectos/')
				? 'Tablero'
				: 'Proyectos';

	onMount(() => {
		let active = true;
		supabase.auth.getSession().then(({ data }) => {
			if (!active) return;
			session = data.session;
			initialized = true;
			if (!session && currentPath !== '/login') {
				goto(resolve('/login'));
			}
		});

		const { data: authListener } = supabase.auth.onAuthStateChange((_event, _session) => {
			session = _session;
			initialized = true;
			if (!session && currentPath !== '/login') {
				goto(resolve('/login'));
			}
		});

		return () => {
			active = false;
			authListener.subscription.unsubscribe();
		};
	});
</script>

{#if currentPath === '/login'}
	<slot />
{:else if !initialized}
	<div class="flex min-h-screen items-center justify-center bg-slate-950">
		<div class="text-center">
			<div
				class="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400"
			></div>
			<p class="text-sm text-slate-400">Preparando tu espacio...</p>
		</div>
	</div>
{:else if session}
	<div class="flex h-screen w-full bg-slate-50 overflow-hidden">
		<Sidebar />
		<main class="flex-1 flex flex-col overflow-hidden">
			<header
				class="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8"
			>
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
						GestorPro
					</p>
					<h2 class="text-xl font-bold tracking-tight text-slate-900">{pageTitle}</h2>
				</div>
				<div class="flex items-center gap-3 sm:gap-5">
					<span class="hidden text-sm text-slate-500 sm:inline">{session.user.email}</span>
					<button
						on:click={() => supabase.auth.signOut()}
						class="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
					>
						Cerrar sesión
					</button>
				</div>
			</header>

			<div class="flex-1 overflow-auto">
				<slot />
			</div>
		</main>
	</div>
{/if}
