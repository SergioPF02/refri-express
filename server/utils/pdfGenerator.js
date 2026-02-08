const PDFDocument = require('pdfkit');

/**
 * Generates a PDF Receipt for a completed booking
 * @param {Object} booking - The booking object from DB
 * @returns {Promise<Buffer>} - Recent PDF Buffer
 */
const generateReceiptPDF = (booking) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            let buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // --- HEADER ---
            // Draw a simple header background
            doc.rect(0, 0, 595.28, 120).fill('#0288D1'); // Light Blue Header

            // Title
            doc.fontSize(24).fillColor('white').text('REFRI-EXPRESS', 50, 45, { align: 'left' });
            doc.fontSize(10).text('Simplemente los mejores', 50, 75);

            // Invoice Info
            doc.fontSize(12).text('RECIBO DE SERVICIO', 400, 45, { align: 'right' });
            doc.fontSize(10).text(`Fecha: ${new Date().toLocaleDateString()}`, 400, 65, { align: 'right' });
            doc.text(`Folio: #${booking.id.toString().padStart(6, '0')}`, 400, 80, { align: 'right' });

            // --- CUSTOMER INFO ---
            doc.moveDown(4); // Move out of header
            doc.fillColor('black');

            const startY = 140;
            doc.fontSize(12).font('Helvetica-Bold').text('Datos del Cliente:', 50, startY);
            doc.fontSize(10).font('Helvetica')
                .text(`Nombre: ${booking.name || 'Cliente'}`, 50, startY + 20)
                .text(`Dirección: ${booking.address || 'N/A'}`, 50, startY + 35)
                .text(`Email: ${booking.user_email}`, 50, startY + 50)
                .text(`Teléfono: ${booking.phone || 'N/A'}`, 50, startY + 65);

            // --- SERVICE DETAILS ---
            const serviceY = startY + 100;
            doc.fontSize(12).font('Helvetica-Bold').text('Detalles del Servicio:', 50, serviceY);

            // Prepare Table Data
            // Booking usually has: service, tonnage, description, price, quantity
            // Items might be JSON in booking.items if available
            let items = [];
            if (booking.items && Array.isArray(booking.items) && booking.items.length > 0) {
                items = booking.items;
            } else {
                // Default item from main fields if no granular items
                items.push({
                    description: `${booking.service} - ${booking.tonnage} Ton - ${booking.description || ''}`,
                    quantity: booking.quantity || 1,
                    price: parseFloat(booking.price) || 0
                });
            }

            // Draw Table Header
            const tableTop = serviceY + 25;
            const itemX = 50;
            const qtyX = 350;
            const priceX = 400;
            const totalX = 480;

            doc.font('Helvetica-Bold');
            doc.text('Descripción', itemX, tableTop);
            doc.text('Cant.', qtyX, tableTop);
            doc.text('Precio Unit.', priceX, tableTop);
            doc.text('Total', totalX, tableTop);

            doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

            // Draw Items
            let currentY = tableTop + 25;
            let grandTotal = 0;
            doc.font('Helvetica');

            items.forEach(item => {
                const qty = item.quantity || 1;
                const price = parseFloat(item.price) || 0;
                const total = qty * price;
                grandTotal += total;

                // Description text wrapping
                doc.text(item.description || item.name || 'Servicio General', itemX, currentY, { width: 280 });
                doc.text(qty.toString(), qtyX, currentY);
                doc.text(`$${price.toFixed(2)}`, priceX, currentY);
                doc.text(`$${total.toFixed(2)}`, totalX, currentY);

                currentY += 20; // Simple increment, ideally dynamic based on text wrap
            });

            doc.moveTo(50, currentY + 10).lineTo(550, currentY + 10).stroke();

            // --- TOTAL ---
            currentY += 25;
            doc.fontSize(14).font('Helvetica-Bold').text(`TOTAL: $${grandTotal.toFixed(2)}`, 400, currentY, { align: 'right' });

            // --- FOOTER ---
            const footerY = 700;
            doc.fontSize(10).font('Helvetica').fillColor('#555')
                .text('Gracias por su preferencia.', 50, footerY, { align: 'center', width: 500 });
            doc.text('Refri-Express - Servicio Técnico Especializado', 50, footerY + 15, { align: 'center', width: 500 });

            doc.end();

        } catch (err) {
            reject(err);
        }
    });
};

module.exports = { generateReceiptPDF };
