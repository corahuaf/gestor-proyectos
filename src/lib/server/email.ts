import { Resend } from "resend";
import { env } from "$env/dynamic/private";

// $env/dynamic/private asegura que esta clave nunca llegue al código frontend del navegador
export const resend = new Resend(env.RESEND_API_KEY);

export async function enviarRecordatorioVencimiento(
  emailDestino: string,
  taskTitle: string,
  dueDate: string,
) {
  try {
    const data = await resend.emails.send({
      from: "GestorPro <notificaciones@tudominio.com>", // Cambia esto por tu dominio verificado en Resend
      to: [emailDestino],
      subject: `⏰ Vencimiento inminente: ${taskTitle}`,
      html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #0f172a;">Recordatorio de Tarea</h2>
                    <p>Hola,</p>
                    <p>La tarea <strong>${taskTitle}</strong> está próxima a vencer.</p>
                    <p><strong>Fecha límite:</strong> ${new Date(dueDate).toLocaleString()}</p>
                    <a href="https://tudominio.com/proyectos" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">Ir al tablero</a>
                </div>
            `,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Error al enviar el correo con Resend:", error);
    return { success: false, error };
  }
}
