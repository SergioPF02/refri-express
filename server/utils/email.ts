import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendQuotationEmail = async (to: string, pdfBuffer: Buffer, customerName: string) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Refri-Express <onboarding@resend.dev>', // Use verified domain or onboarding
            to: [to],
            subject: 'Cotización de Servicio - Refri-Express',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2 style="color: #2196F3;">¡Hola ${customerName}!</h2>
                    <p>Adjuntamos la cotización de tu servicio solicitado.</p>
                    <p>Si tienes alguna duda o deseas aprobar el presupuesto, puedes responder a este correo o contactarnos por WhatsApp.</p>
                    <br>
                    <p style="font-size: 0.9em; color: #777;">Atentamente,<br>El equipo de Refri-Express</p>
                </div>
            `,
            attachments: [
                {
                    filename: `Cotizacion_RefriExpress_${Date.now()}.pdf`,
                    content: pdfBuffer
                }
            ]
        });

        if (error) {
            console.error("Resend Error:", error);
            throw new Error(error.message);
        }

        console.log(`Email sent to ${to}, ID: ${data?.id}`);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};

export const sendCompletionEmail = async (to: string, pdfBuffer: Buffer, customerName: string, serviceName: string) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Refri-Express <onboarding@resend.dev>',
            to: [to],
            subject: '✅ Servicio Finalizado - Tu Recibo',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #0288D1; padding: 20px; text-align: center; color: white;">
                        <h1>¡Servicio Finalizado!</h1>
                    </div>
                    <div style="padding: 20px; border: 1px solid #ddd;">
                        <p>Hola <strong>${customerName}</strong>,</p>
                        <p>Nos complace informarte que tu servicio de <strong>${serviceName}</strong> ha sido completado con éxito.</p>
                        <p>Adjunto encontrarás el recibo con los detalles del servicio y el costo total.</p>
                        <p>Agradecemos tu confianza en nosotros.</p>
                    </div>
                    <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 0.8em; color: #666;">
                        <p>Refri-Express<br>¿Dudas? Contáctanos por este medio.</p>
                    </div>
                </div>
            `,
            attachments: [
                {
                    filename: `Recibo_RefriExpress_${Date.now()}.pdf`,
                    content: pdfBuffer
                }
            ]
        });

        if (error) {
            console.error("Resend Completion Error:", error);
            return false;
        }

        console.log(`Completion Email sent to ${to}, ID: ${data?.id}`);
        return true;
    } catch (error) {
        console.error("Error sending completion email:", error);
        return false;
    }
};
