const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendQuotationEmail = async (to, pdfBuffer, customerName) => {
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

module.exports = { sendQuotationEmail };
