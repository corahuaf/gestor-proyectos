<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let show = false;
	export let title = 'Título del Modal';

	const dispatch = createEventDispatcher();

	function close() {
		show = false;
		dispatch('close');
	}
</script>

{#if show}
	<div
		class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
	>
		<div class="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
			<div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
				<h3 class="font-bold text-lg text-slate-800">{title}</h3>
				<button
					on:click={close}
					class="text-slate-400 hover:text-red-500 transition-colors text-2xl leading-none"
					>&times;</button
				>
			</div>

			<div class="p-6 overflow-y-auto">
				<slot />
			</div>
		</div>
	</div>
{/if}
