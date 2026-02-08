import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BookingItem } from '../types';

interface PdfGeneratorData {
    name?: string;
    phone?: string;
    address?: string;
    description?: string;
    items?: BookingItem[];
    price: number;
    service?: string;
}

export const generateQuotationPDF = (data: PdfGeneratorData): jsPDF => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- Header ---
    doc.setFillColor(33, 150, 243); // Blue Header Background
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Refri-Express", 15, 20);

    doc.setFontSize(12);
    doc.text("Soluciones en Refrigeración y Aire Acondicionado", 15, 28);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, pageWidth - 15, 28, { align: 'right' });

    // --- Customer Info ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("Información del Cliente", 15, 55);

    doc.setFontSize(11);
    doc.text(`Nombre: ${data.name || 'Cliente'}`, 15, 63);
    doc.text(`Teléfono: ${data.phone || 'N/A'}`, 15, 70);
    doc.text(`Dirección: ${data.address || 'N/A'}`, 15, 77);

    // --- Problem / Request Description ---
    if (data.description) {
        doc.setFillColor(240, 240, 240);
        doc.rect(15, 85, pageWidth - 30, 25, 'F');
        doc.setFontSize(12);
        doc.text("Descripción del Problema:", 20, 93);
        doc.setFontSize(10);

        const splitDesc = doc.splitTextToSize(data.description, pageWidth - 40);
        doc.text(splitDesc, 20, 100);
    }

    // --- Quotation Table ---
    // If it's a generated quotation with price items, show them. 
    // If it's just a request (price 0), show "Presupuesto Pendiente".

    const startY = data.description ? 120 : 90;

    const tableBody: any[] = [];
    let total = 0;

    if (data.items && data.items.length > 0) {
        data.items.forEach(item => {
            tableBody.push([
                item.name,
                `$${item.price.toFixed(2)}`
            ]);
            total += item.price;
        });
    } else if (data.price > 0) {
        // If total price manually set but no items
        tableBody.push([
            data.service || 'Servicio General',
            `$${Number(data.price).toFixed(2)}`
        ]);
        total = Number(data.price);
    } else {
        tableBody.push([
            (data.service || 'Servicio') + " (Diagnóstico Inicial)",
            "Por Cotizar"
        ]);
    }

    autoTable(doc, {
        startY: startY,
        head: [['Concepto', 'Costo Estimado']],
        body: tableBody,
        foot: total > 0 ? [['Total', `$${total.toFixed(2)}`]] : [],
        theme: 'grid',
        headStyles: { fillColor: [33, 150, 243] },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // --- Footer ---
    const lastAutoTable = (doc as any).lastAutoTable;
    const finalY = lastAutoTable ? lastAutoTable.finalY + 20 : startY + 50;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Términos y Condiciones:", 15, finalY);
    doc.setFontSize(9);
    doc.text("- Esta cotización es válida por 15 días hábiles.", 15, finalY + 6);
    doc.text("- El diagnóstico final puede variar si se encuentran daños ocultos.", 15, finalY + 11);
    doc.text("- Se requiere un anticipo del 50% para refacciones mayores.", 15, finalY + 16);

    doc.setFillColor(33, 150, 243);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("Gracias por confiar en Refri-Express", pageWidth / 2, pageHeight - 6, { align: 'center' });

    return doc;
};
