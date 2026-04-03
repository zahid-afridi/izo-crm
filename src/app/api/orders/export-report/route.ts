import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, dateFrom, dateTo, format, export: shouldExport } = body;

    if (!orderId || !dateFrom || !dateTo) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

    if (startDate > endDate) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    // Fetch order information
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Build preview data for frontend table (simple format)
    const previewData = [{
      id: order.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      client: order.client || 'N/A',
      orderDate: new Date(order.orderDate).toLocaleDateString(),
      orderStatus: order.orderStatus,
      totalAmount: order.totalAmount,
    }];

    // Build detailed report data for PDF/CSV export
    const reportData = {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        client: order.client || 'N/A',
        clientId: order.clientId || 'N/A',
        orderDate: new Date(order.orderDate).toLocaleDateString(),
        expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : 'N/A',
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod || 'N/A',
        deliveryMethod: order.deliveryMethod || 'N/A',
        deliveryAddress: order.deliveryAddress || 'N/A',
        deliveryInstructions: order.deliveryInstructions || 'N/A',
        deliveryCost: order.deliveryCost || 0,
        subtotal: order.subtotal || 0,
        totalAmount: order.totalAmount || 0,
        notes: order.notes || 'N/A',
        createdAt: new Date(order.createdAt).toLocaleDateString(),
      },
      items: order.items || [],
      summary: {
        totalItems: (order.items as any[])?.length || 0,
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
          'Content-Disposition': `attachment; filename=order-report-${orderId}.pdf`,
        },
      });
    }

    // CSV EXPORT
    if (format === 'excel') {
      const csv = generateCSV(reportData, startDate, endDate);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=order-report-${orderId}.csv`,
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

  addText('Order Report', margin, yPos, 14, false);
  yPos -= 8;

  addText(`Report Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`, margin, yPos, 9, false);
  yPos -= 20;

  drawLine(margin, yPos, pageWidth - margin, 1);
  yPos -= 15;

  // Order Information Section
  addText('ORDER INFORMATION', margin, yPos, 11, true);
  yPos -= 14;

  const orderInfo = [
    ['Order Number:', data.order.orderNumber],
    ['Client:', data.order.client],
    ['Order Date:', data.order.orderDate],
    ['Expected Delivery:', data.order.expectedDeliveryDate],
    ['Status:', data.order.orderStatus],
    ['Payment Status:', data.order.paymentStatus],
    ['Payment Method:', data.order.paymentMethod],
    ['Delivery Method:', data.order.deliveryMethod],
  ];

  orderInfo.forEach(([label, value]) => {
    addText(label, margin + 10, yPos, 9, true);
    addText(value, margin + 140, yPos, 9, false);
    yPos -= lineHeight;
  });

  yPos -= 10;

  // Delivery Information Section
  checkNewPage();
  addText('DELIVERY INFORMATION', margin, yPos, 11, true);
  yPos -= 14;

  addText('Address:', margin + 10, yPos, 9, true);
  addText(data.order.deliveryAddress.substring(0, 60), margin + 140, yPos, 9, false);
  yPos -= lineHeight;

  addText('Instructions:', margin + 10, yPos, 9, true);
  addText(data.order.deliveryInstructions.substring(0, 60), margin + 140, yPos, 9, false);
  yPos -= 20;

  // Financial Summary Section
  checkNewPage();
  addText('FINANCIAL SUMMARY', margin, yPos, 11, true);
  yPos -= 14;

  const financialInfo = [
    ['Subtotal:', `€${(data.order.subtotal || 0).toFixed(2)}`],
    ['Delivery Cost:', `€${(data.order.deliveryCost || 0).toFixed(2)}`],
    ['Total Amount:', `€${(data.order.totalAmount || 0).toFixed(2)}`],
  ];

  financialInfo.forEach(([label, value]) => {
    addText(label, margin + 10, yPos, 9, true);
    addText(value, margin + 140, yPos, 9, false);
    yPos -= lineHeight;
  });

  yPos -= 10;

  // Order Items Section
  if (data.items && data.items.length > 0) {
    checkNewPage();
    addText('ORDER ITEMS', margin, yPos, 11, true);
    yPos -= 14;

    addText(`Total Items: ${data.summary.totalItems}`, margin + 10, yPos, 9, false);
    yPos -= 14;

    // Table header
    addText('Product', margin + 10, yPos, 9, true);
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
  let csv = 'ORDER REPORT\n\n';

  // Order Information
  csv += 'ORDER INFORMATION\n';
  csv += `Order Number,${data.order.orderNumber}\n`;
  csv += `Client,${data.order.client}\n`;
  csv += `Order Date,${data.order.orderDate}\n`;
  csv += `Expected Delivery,${data.order.expectedDeliveryDate}\n`;
  csv += `Status,${data.order.orderStatus}\n`;
  csv += `Payment Status,${data.order.paymentStatus}\n`;
  csv += `Payment Method,${data.order.paymentMethod}\n`;
  csv += `Delivery Method,${data.order.deliveryMethod}\n\n`;

  // Delivery Information
  csv += 'DELIVERY INFORMATION\n';
  csv += `Address,"${data.order.deliveryAddress}"\n`;
  csv += `Instructions,"${data.order.deliveryInstructions}"\n\n`;

  // Financial Summary
  csv += 'FINANCIAL SUMMARY\n';
  csv += `Subtotal,€${(data.order.subtotal || 0).toFixed(2)}\n`;
  csv += `Delivery Cost,€${(data.order.deliveryCost || 0).toFixed(2)}\n`;
  csv += `Total Amount,€${(data.order.totalAmount || 0).toFixed(2)}\n\n`;

  // Order Items
  if (data.items && data.items.length > 0) {
    csv += 'ORDER ITEMS\n';
    csv += 'Product Name,Quantity,Unit Price,Total\n';
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
