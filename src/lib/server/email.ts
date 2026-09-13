import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

// $env/dynamic/private asegura que esta clave nunca llegue al código frontend del navegador
export const resend = new Resend(env.RESEND_API_KEY);

const sender = env.RESEND_FROM_EMAIL || 'GestorPro <onboarding@resend.dev>';
const appUrl = env.PUBLIC_APP_URL || 'http://localhost:5173';
const emailTimeoutMs = 8000;

function timeoutError() {
	return new Error(`Resend no respondió en ${emailTimeoutMs} ms`);
}

export async function enviarRecordatorioVencimiento(
	emailDestino: string,
	taskTitle: string,
	dueDate: string
) {
	try {
		const sendRequest = resend.emails.send({
			from: sender,
			to: [emailDestino],
			subject: `Vencimiento inminente: ${taskTitle}`,
			html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0f172a;">Recordatorio de tarea</h2>
          <p>La tarea <strong>${taskTitle}</strong> está próxima a vencer.</p>
          <p><strong>Fecha límite:</strong> ${new Date(dueDate).toLocaleString()}</p>
          <a href="${appUrl}/proyectos" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">Ir al tablero</a>
        </div>
      `
		});
		const timeout = new Promise<never>((_, reject) =>
			setTimeout(() => reject(timeoutError()), emailTimeoutMs)
		);
		const data = await Promise.race([sendRequest, timeout]);
		return { success: true, data };
	} catch (error) {
		console.error('Error al enviar el correo con Resend:', error);
		return { success: false, error };
	}
}
