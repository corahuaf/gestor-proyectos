<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { supabase } from '$lib/supabaseClient';

	let email = '';
	let password = '';
	let loading = false;
	let errorMsg = '';
	let successMsg = '';
	let isSignUp = false;

	function validateForm() {
		const normalizedEmail = email.trim().toLowerCase();
		if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
			return 'Escribe un correo electrónico válido.';
		}
		if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
		if (isSignUp && !/(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
			return 'Para registrarte, usa una contraseña con letras y números.';
		}
		return '';
	}

	function friendlyError(message: string) {
		const normalizedMessage = message.toLowerCase();
		if (normalizedMessage.includes('invalid login credentials')) {
			return 'El correo o la contraseña no son correctos.';
		}
		if (normalizedMessage.includes('user already registered')) {
			return 'Este correo ya está registrado. Prueba iniciar sesión.';
		}
		return message;
	}

	async function handleAuth() {
		errorMsg = '';
		successMsg = '';
		const validationError = validateForm();
		if (validationError) {
			errorMsg = validationError;
			return;
		}

		loading = true;
		try {
			const normalizedEmail = email.trim().toLowerCase();
			const result = isSignUp
				? await supabase.auth.signUp({ email: normalizedEmail, password })
				: await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

			if (result.error) {
				errorMsg = friendlyError(result.error.message);
			} else if (isSignUp) {
				successMsg = 'Cuenta creada. Revisa tu correo si la confirmación está activada.';
				isSignUp = false;
				password = '';
			} else {
				await goto(resolve('/'));
			}
		} catch {
			errorMsg = 'No se pudo conectar con el servicio. Inténtalo de nuevo.';
		} finally {
			loading = false;
		}
	}

	function toggleMode() {
		isSignUp = !isSignUp;
		errorMsg = '';
		successMsg = '';
		password = '';
	}
</script>

<main class="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
	<div
		class="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/10 lg:grid-cols-[0.9fr_1.1fr]"
	>
		<section
			class="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between"
		>
			<div
				class="absolute -right-24 -top-24 h-72 w-72 rounded-full border-28px border-emerald-400/20"
			></div>
			<div class="relative">
				<div class="mb-16 flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 font-black text-slate-950"
					>
						G
					</div>
					<span class="text-lg font-bold tracking-wide"
						>GESTOR<span class="text-emerald-400">PRO</span></span
					>
				</div>
				<p class="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
					Trabajo con intención
				</p>
				<h1 class="max-w-sm text-4xl font-bold leading-tight">Tus proyectos, en movimiento.</h1>
				<p class="mt-5 max-w-sm text-base leading-7 text-slate-400">
					Organiza prioridades, mantén el foco y lleva cada tarea hasta la meta.
				</p>
			</div>
			<p class="relative text-xs text-slate-500">Un espacio simple para avanzar cada día.</p>
		</section>

		<section class="flex items-center justify-center p-6 sm:p-10">
			<div class="w-full max-w-md">
				<div class="mb-8 lg:hidden">
					<p class="text-lg font-bold tracking-wide text-slate-900">
						GESTOR<span class="text-emerald-500">PRO</span>
					</p>
				</div>
				<p class="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
					{isSignUp ? 'Nuevo espacio' : 'Bienvenido de nuevo'}
				</p>
				<h2 class="text-3xl font-bold tracking-tight text-slate-950">
					{isSignUp ? 'Crea tu cuenta' : 'Entra a tu workspace'}
				</h2>
				<p class="mt-2 text-sm leading-6 text-slate-500">
					{isSignUp
						? 'Empieza a organizar tus proyectos hoy.'
						: 'Continúa exactamente donde lo dejaste.'}
				</p>

				{#if errorMsg}
					<div
						class="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
						role="alert"
					>
						{errorMsg}
					</div>
				{/if}
				{#if successMsg}
					<div
						class="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
						role="status"
					>
						{successMsg}
					</div>
				{/if}

				<form on:submit|preventDefault={handleAuth} class="mt-8 space-y-5" novalidate>
					<div>
						<label class="mb-2 block text-sm font-medium text-slate-700" for="email"
							>Correo electrónico</label
						>
						<input
							id="email"
							type="email"
							bind:value={email}
							autocomplete="email"
							required
							placeholder="tu@correo.com"
							class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
						/>
					</div>
					<div>
						<div class="mb-2 flex items-center justify-between">
							<label class="block text-sm font-medium text-slate-700" for="password"
								>Contraseña</label
							>
							<span class="text-xs text-slate-400">Mínimo 6 caracteres</span>
						</div>
						<input
							id="password"
							type="password"
							bind:value={password}
							autocomplete={isSignUp ? 'new-password' : 'current-password'}
							required
							minlength="6"
							placeholder="••••••••"
							class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
						/>
					</div>
					<button
						type="submit"
						disabled={loading}
						class="flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{loading ? 'Procesando...' : isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
					</button>
				</form>

				<p class="mt-8 text-center text-sm text-slate-500">
					{isSignUp ? '¿Ya tienes una cuenta?' : '¿Todavía no tienes cuenta?'}
					<button
						type="button"
						on:click={toggleMode}
						class="ml-1 font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
					>
						{isSignUp ? 'Inicia sesión' : 'Regístrate'}
					</button>
				</p>
			</div>
		</section>
	</div>
</main>
