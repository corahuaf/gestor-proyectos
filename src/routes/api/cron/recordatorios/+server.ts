import { json } from '@sveltejs/kit';
import { enviarRecordatorioVencimiento } from '$lib/server/email';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
	const startedAt = Date.now();
	const queryToken = url.searchParams.get('token');
	const authorization = request.headers.get('authorization');
	const headerToken = authorization?.startsWith('Bearer ')
		? authorization.slice('Bearer '.length)
		: null;
	if (!env.CRON_SECRET || (queryToken !== env.CRON_SECRET && headerToken !== env.CRON_SECRET)) {
		return json({ error: 'No autorizado' }, { status: 401 });
	}
	try {
		const supabaseAdmin = getSupabaseAdmin();
		// 2. Calcular ventana de tiempo (Próximas 24 horas)
		const manana = new Date();
		manana.setHours(manana.getHours() + 24);

		const ahora = new Date();

		// 3. Consultar tareas por vencer que no han sido notificadas
		const { data: tareasVencidas, error: dbError } = await supabaseAdmin
			.from('tasks')
			.select('id, title, due_date, project_id')
			.not('due_date', 'is', null)
			.gte('due_date', ahora.toISOString())
			.lte('due_date', manana.toISOString())
			.eq('reminder_sent', false);

		if (dbError) {
			console.error('Cron: error consultando tareas', dbError);
			return json({ error: 'No se pudieron consultar las tareas' }, { status: 502 });
		}

		if (!tareasVencidas || tareasVencidas.length === 0) {
			return json({ message: 'No hay recordatorios pendientes.' });
		}

		const resultados = await Promise.all(
			tareasVencidas.map(async (tarea) => {
				const emailDestino = env.REMINDER_EMAIL;

				if (!emailDestino) {
					return { id: tarea.id, ok: false, error: 'REMINDER_EMAIL no está configurado' };
				}

				try {
					if (!tarea.due_date) {
						return { id: tarea.id, ok: false, error: 'La tarea no tiene fecha de vencimiento' };
					}

					const emailResult = await enviarRecordatorioVencimiento(
						emailDestino,
						tarea.title,
						tarea.due_date
					);

					if (!emailResult.success) {
						return { id: tarea.id, ok: false, error: 'Resend no pudo enviar el correo' };
					}

					const { error: updateError } = await supabaseAdmin
						.from('tasks')
						.update({ reminder_sent: true })
						.eq('id', tarea.id);
					if (updateError) {
						return { id: tarea.id, ok: false, error: `No se pudo marcar: ${updateError.message}` };
					}

					return { id: tarea.id, ok: true };
				} catch (taskError) {
					const message = taskError instanceof Error ? taskError.message : String(taskError);
					console.error(`Cron: fallo en tarea ${tarea.id}`, taskError);
					return { id: tarea.id, ok: false, error: message };
				}
			})
		);

		const procesados = resultados.filter((result) => result.ok).map((result) => result.id);
		const fallidos = resultados
			.filter((result) => !result.ok)
			.map((result) => ({ id: result.id, error: result.error || 'Error desconocido' }));

		console.info('Cron de recordatorios finalizado', {
			total: tareasVencidas.length,
			procesados: procesados.length,
			fallidos: fallidos.length,
			duracionMs: Date.now() - startedAt
		});

		return json({
			success: true,
			procesados: procesados.length,
			tareas: procesados,
			fallidos
		});
	} catch (error) {
		console.error('Error en cron job:', error);
		return json({ error: 'Fallo interno al procesar recordatorios' }, { status: 500 });
	}
};
