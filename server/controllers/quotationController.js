const { sendQuotationEmail } = require('../utils/email');

exports.sendQuotation = async (req, res) => {
    try {
        const { email, pdfBase64, customerName } = req.body;

        if (!email || !pdfBase64) {
            return res.status(400).json({ error: "Faltan datos (email o PDF)" });
        }

        // Convert Base64 back to Buffer
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');

        await sendQuotationEmail(email, pdfBuffer, customerName || 'Cliente');

        res.json({ message: "Cotización enviada correctamente" });
    } catch (error) {
        console.error("Controller Error:", error);
        res.status(500).json({ error: "Error al enviar el correo" });
    }
};
