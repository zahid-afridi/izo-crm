import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { offerId, dateFrom, dateTo, format, export: shouldExport } = body;

    if (!offerId || !dateFrom || !dateTo) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

    if (startDate > endDate) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    // Fetch offer information
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    // Build preview data for frontend table (simple format)
    const previewData = [{
      id: offer.id,
      offerId: offer.id,
      offerNumber: offer.offerNumber,
      client: offer.client || 'N/A',
      title: offer.title,
      createdDate: new Date(offer.offerDate).toLocaleDateString(),
      validDate: new Date(offer.validUntil).toLocaleDateString(),
      status: offer.offerStatus,
      totalAmount: offer.totalAmount,
    }];

    // Build detailed report data for PDF/CSV export
    const reportData = {
      offer: {
        id: offer.id,
        offerNumber: offer.offerNumber,
        client: offer.client || 'N/A',
        clientId: offer.clientId || 'N/A',
        title: offer.title,
        offerDate: new Date(offer.offerDate).toLocaleDateString(),
        validUntil: new Date(offer.validUntil).toLocaleDateString(),
        currency: offer.currency || 'EUR',
        offerStatus: offer.offerStatus,
        subtotal: offer.subtotal,
        discount: offer.discount,
        totalAmount: offer.totalAmount,
        paymentTerms: offer.paymentTerms || 'N/A',
        deliveryTerms: offer.deliveryTerms || 'N/A',
        validityPeriod: offer.validityPeriod || 'N/A',
        notes: offer.notes || 'N/A',
        createdAt: new Date(offer.createdAt).toLocaleDateString(),
        updatedAt: new Date(offer.updatedAt).toLocaleDateString(),
      },
      items: offer.items || [],
      summary: {
        totalItems: (offer.items as any[])?.length || 0,
        reportPeriod: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
      },
    };

    // PREVIEW - return simple array for table display
    if (!shouldExport) {
      return NextResponse.json({ report: previewData });
    }

    // PDF EXPORT
    if (format === 'pdf') {
      const buffer = generatePDF(reportData, startDate, endDate);
      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=offer-report-${offerId}.pdf`,
        },
      });
    }

    // CSV EXPORT
    if (format === 'excel') {
      const csv = generateCSV(reportData, startDate, endDate);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=offer-report-${offerId}.csv`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Export failed: ' + err.message }, { status: 500 });
  }
}

function generatePDF(data: any, startDate: Date, endDate: Date): Buffer {
  let pdf = '%PDF-1.4\n';
  let content = '';
  let yPos = 750;
  const pageHeight = 792;
  const pageWidth = 612;
  const margin = 40;
  const lineHeight = 14;

  // Helper to add text
  const addText = (text: string, x: number, y: number, fontSize: number, bold: boolean = false) => {
    const font = bold ? 'F2' : 'F1';
    const escapedText = escapeText(text.toString());
    content += `BT\n/${font} ${fontSize} Tf\n${x} ${y} Td\n(${escapedText}) Tj\nET\n`;
  };

  // Helper to draw line
  const drawLine = (x1: number, y: number, x2: number, width: number = 0.5) => {
    content += `q\n${width} w\n${x1} ${y} m\n${x2} ${y} l\nS\nQ\n`;
  };

  // Helper to check if we need new page
  const checkNewPage = () => {
    if (yPos < margin + 50) {
      content += 'Q\nQ\n';
      yPos = pageHeight - margin;
      return true;
    }
    return false;
  };

  // Title Section
  addText('IZOGRUP', margin, yPos, 20, true);
  yPos -= 30;

  addText('Offer Report', margin, yPos, 14, false);
  yPos -= 8;

  addText(`Report Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`, margin, yPos, 9, false);
  yPos -= 20;

  drawLine(margin, yPos, pageWidth - margin, 1);
  yPos -= 15;

  // Offer Information Section
  addText('OFFER INFORMATION', margin, yPos, 11, true);
  yPos -= 14;

  const offerInfo = [
    ['Offer Number:', data.offer.offerNumber],
    ['Client:', data.offer.client],
    ['Title:', data.offer.title],
    ['Status:', data.offer.offerStatus],
    ['Created Date:', data.offer.offerDate],
    ['Valid Until:', data.offer.validUntil],
    ['Currency:', data.offer.currency],
  ];

  offerInfo.forEach(([label, value]) => {
    addText(label, margin + 10, yPos, 9, true);
    addText(value, margin + 120, yPos, 9, false);
    yPos -= lineHeight;
  });

  yPos -= 10;

  // Financial Summary Section
  checkNewPage();
  addText('FINANCIAL SUMMARY', margin, yPos, 11, true);
  yPos -= 14;

  const financialInfo = [
    ['Subtotal:', `€${data.offer.subtotal.toFixed(2)}`],
    ['Discount:', `${data.offer.discount}%`],
    ['Total Amount:', `€${data.offer.totalAmount.toFixed(2)}`],
  ];

  financialInfo.forEach(([label, value]) => {
    addText(label, margin + 10, yPos, 9, true);
    addText(value, margin + 120, yPos, 9, false);
    yPos -= lineHeight;
  });

  yPos -= 10;

  // Terms Section
  if (data.offer.paymentTerms || data.offer.deliveryTerms) {
    checkNewPage();
    addText('TERMS & CONDITIONS', margin, yPos, 11, true);
    yPos -= 14;

    if (data.offer.paymentTerms) {
      addText('Payment Terms:', margin + 10, yPos, 9, true);
      yPos -= 12;
      addText(data.offer.paymentTerms.substring(0, 80), margin + 20, yPos, 8, false);
      yPos -= 12;
    }

    if (data.offer.deliveryTerms) {
      addText('Delivery Terms:', margin + 10, yPos, 9, true);
      yPos -= 12;
      addText(data.offer.deliveryTerms.substring(0, 80), margin + 20, yPos, 8, false);
      yPos -= 12;
    }

    yPos -= 10;
  }

  // Items Section
  if (data.items && data.items.length > 0) {
    checkNewPage();
    addText('OFFER ITEMS', margin, yPos, 11, true);
    yPos -= 14;

    addText(`Total Items: ${data.summary.totalItems}`, margin + 10, yPos, 9, false);
    yPos -= 14;

    // Table header
    addText('Item Name', margin + 10, yPos, 9, true);
    addText('Qty', margin + 280, yPos, 9, true);
    addText('Unit Price', margin + 320, yPos, 9, true);
    addText('Total', margin + 450, yPos, 9, true);
    yPos -= 12;

    drawLine(margin, yPos, pageWidth - margin, 0.5);
    yPos -= 8;

    // Table rows
    data.items.forEach((item: any) => {
      if (yPos < margin + 30) {
        yPos = pageHeight - margin;
      }

      addText(item.name?.substring(0, 30) || 'N/A', margin + 10, yPos, 8, false);
      addText(item.quantity?.toString() || '0', margin + 280, yPos, 8, false);
      addText(`€${item.unitPrice?.toFixed(2) || '0.00'}`, margin + 320, yPos, 8, false);
      addText(`€${item.total?.toFixed(2) || '0.00'}`, margin + 450, yPos, 8, false);

      yPos -= lineHeight;
    });
  }

  // Footer
  yPos = 30;
  drawLine(margin, yPos + 10, pageWidth - margin, 0.5);
  addText('Generated by IZOGRUP CRM System', pageWidth / 2 - 80, yPos, 8, false);

  // PDF Objects
  const obj1Start = pdf.length;
  pdf += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  const obj2Start = pdf.length;
  pdf += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

  const obj3Start = pdf.length;
  pdf += `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n`;

  const obj4Start = pdf.length;
  pdf += `4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`;

  const obj5Start = pdf.length;
  pdf += '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  const obj6Start = pdf.length;
  pdf += '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';

  const xrefStart = pdf.length;
  pdf += 'xref\n0 7\n';
  pdf += '0000000000 65535 f \n';
  pdf += `${String(obj1Start).padStart(10, '0')} 00000 n \n`;
  pdf += `${String(obj2Start).padStart(10, '0')} 00000 n \n`;
  pdf += `${String(obj3Start).padStart(10, '0')} 00000 n \n`;
  pdf += `${String(obj4Start).padStart(10, '0')} 00000 n \n`;
  pdf += `${String(obj5Start).padStart(10, '0')} 00000 n \n`;
  pdf += `${String(obj6Start).padStart(10, '0')} 00000 n \n`;

  pdf += 'trailer\n<< /Size 7 /Root 1 0 R >>\n';
  pdf += 'startxref\n';
  pdf += `${xrefStart}\n`;
  pdf += '%%EOF\n';

  return Buffer.from(pdf, 'utf-8');
}

function generateCSV(data: any, startDate: Date, endDate: Date): string {
  let csv = 'OFFER REPORT\n\n';

  // Offer Information
  csv += 'OFFER INFORMATION\n';
  csv += `Offer Number,${data.offer.offerNumber}\n`;
  csv += `Client,${data.offer.client}\n`;
  csv += `Title,${data.offer.title}\n`;
  csv += `Status,${data.offer.offerStatus}\n`;
  csv += `Created Date,${data.offer.offerDate}\n`;
  csv += `Valid Until,${data.offer.validUntil}\n`;
  csv += `Currency,${data.offer.currency}\n\n`;

  // Financial Summary
  csv += 'FINANCIAL SUMMARY\n';
  csv += `Subtotal,€${data.offer.subtotal.toFixed(2)}\n`;
  csv += `Discount,${data.offer.discount}%\n`;
  csv += `Total Amount,€${data.offer.totalAmount.toFixed(2)}\n\n`;

  // Terms
  if (data.offer.paymentTerms || data.offer.deliveryTerms) {
    csv += 'TERMS & CONDITIONS\n';
    csv += `Payment Terms,"${data.offer.paymentTerms}"\n`;
    csv += `Delivery Terms,"${data.offer.deliveryTerms}"\n\n`;
  }

  // Items
  if (data.items && data.items.length > 0) {
    csv += 'OFFER ITEMS\n';
    csv += 'Item Name,Quantity,Unit Price,Total\n';
    data.items.forEach((item: any) => {
      csv += `"${item.name}",${item.quantity},€${item.unitPrice?.toFixed(2) || '0.00'},€${item.total?.toFixed(2) || '0.00'}\n`;
    });
  }

  return csv;
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n]/g, ' ');
}
