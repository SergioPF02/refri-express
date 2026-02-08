const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false
    },
    // Force IPv4 to avoid IPv6 timeouts
    family: 4,
    logger: true,
    debug: true
});

const sendQuotationEmail = async (to, pdfBuffer, customerName) => {
    // ... (Existing implementation preserved)
    const mailOptions = {
        from: `"Refri-Express" <${process.env.EMAIL_USER}>`,
        to: to,
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
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ]
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}`);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};

const sendCompletionEmail = async (to, pdfBuffer, customerName, serviceName) => {
    const mailOptions = {
        from: `"Refri-Express" <${process.env.EMAIL_USER}>`,
        to: to,
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
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ]
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Completion Email sent to ${to}`);
        return true;
    } catch (error) {
        console.error("Error sending completion email:", error);
        // Don't throw, just log, so we don't break the response
        return false;
    }
};

module.exports = { sendQuotationEmail, sendCompletionEmail };
