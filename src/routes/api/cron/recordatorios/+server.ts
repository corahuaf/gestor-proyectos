import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';
import { enviarRecordatorioVencimiento } from '$lib/server/email';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    // 1. Verificación de seguridad para evitar llamadas no autorizadas
    const token = url.searchParams.get('token');
    if (token !== env.CRON_SECRET) {
        return json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
        // 2. Calcular ventana de tiempo (Próximas 24 horas)
        const manana = new Date();
        manana.setHours(manana.getHours() + 24);
        
        const ahora = new Date();

        // 3. Consultar tareas por vencer que no han sido notificadas
        const { data: tareasVencidas, error: dbError } = await supabase
            .from('tasks')
            .select('id, title, due_date, project_id')
            .not('due_date', 'is', null)
            .gte('due_date', ahora.toISOString())
            .lte('due_date', manana.toISOString())
            .eq('reminder_sent', false);

        if (dbError) throw dbError;

        if (!tareasVencidas || tareasVencidas.length === 0) {
            return json({ message: 'No hay recordatorios pendientes.' });
        }

        const procesados = [];

        // 4. Iterar y enviar correos
        for (const tarea of tareasVencidas) {
            // Nota: Aquí debes poner el correo del usuario asignado. 
            // Para uso personal, puedes quemar tu propio correo.
            const emailDestino = 'tu_correo_personal@gmail.com'; 
            
            const emailResult = await enviarRecordatorioVencimiento(
                emailDestino, 
                tarea.title, 
                tarea.due_date
            );

            if (emailResult.success) {
                // 5. Marcar como notificada en la base de datos
                await supabase
                    .from('tasks')
                    .update({ reminder_sent: true })
                    .eq('id', tarea.id);
                    
                procesados.push(tarea.id);
            }
        }

        return json({ 
            success: true, 
            procesados: procesados.length,
            tareas: procesados 
        });

    } catch (error) {
        console.error('Error en cron job:', error);
        return json({ error: 'Fallo interno al procesar recordatorios' }, { status: 500 });
    }
};