import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, status, format, export: shouldExport } = body;

    // Build where clause
    const where: any = {};
    if (clientId) {
      where.id = clientId;
    }
    if (status) {
      where.status = status;
    }

    // Fetch clients
    const clientsData = await prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    if (clientsData.length === 0) {
      return NextResponse.json({ report: [] });
    }

    // Fetch orders for each client to calculate totals
    const clientIds = clientsData.map(c => c.id);
    const orders = await prisma.order.findMany({
      where: {
        clientId: { in: clientIds },
      },
      include: {
        assignedTo: {
          select: {
            fullName: true,
            role: true
          }
        }
      }
    });

    // Get assigned sales agents from orders
    const assignedSalesAgentsByClient = new Map();
    
    orders.forEach(order => {
      if (order.assignedTo && order.assignedTo.role === 'sales_agent' && order.clientId) {
        if (!assignedSalesAgentsByClient.has(order.clientId)) {
          assignedSalesAgentsByClient.set(order.clientId, order.assignedTo.fullName);
        }
      }
    });

    // Build report data with all required fields
    const previewData = clientsData.map(client => {
      const clientOrders = orders.filter(o => o.clientId === client.id);
      const totalRevenue = clientOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      
      // Determine client type based on name patterns (basic heuristic)
      let clientType = 'Individual';
      if (client.fullName.toLowerCase().includes('ltd') || 
          client.fullName.toLowerCase().includes('llc') || 
          client.fullName.toLowerCase().includes('inc') ||
          client.fullName.toLowerCase().includes('company') ||
          client.fullName.toLowerCase().includes('corp')) {
        clientType = 'Company';
      } else if (client.fullName.toLowerCase().includes('shop') || 
                 client.fullName.toLowerCase().includes('store')) {
        clientType = 'Shop';
      }

      return {
        // Required export fields
        clientId: client.id,
        clientType: clientType,
        clientStatus: client.status === 'active' ? 'Active' : 'Disabled',
        address: client.address || 'N/A',
        phoneNumber: client.phone || 'N/A',
        email: client.email || 'N/A',
        createdBy: 'System', // Default value since we don't track this in the current schema
        assignedSalesAgent: assignedSalesAgentsByClient.get(client.id) || 'Not Assigned',
        creationDate: new Date(client.createdAt).toLocaleDateString(),
        totalOrdersCount: clientOrders.length || 0,
        totalRevenueGenerated: totalRevenue || 0,
        
        // Additional fields for backward compatibility
        id: client.id,
        clientName: client.fullName,
        phone: client.phone || 'N/A',
        status: client.status,
        createdDate: new Date(client.createdAt).toLocaleDateString(),
        totalOrders: clientOrders.length || 0,
        totalRevenue: totalRevenue || 0
      };
    });

    // PREVIEW - return simple array for table display
    if (!shouldExport) {
      return NextResponse.json({ report: previewData });
    }

    // PDF EXPORT
    if (format === 'pdf') {
      const buffer = generatePDF(previewData);
      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=client-report-${new Date().getTime()}.pdf`,
        },
      });
    }

    // CSV EXPORT
    if (format === 'excel') {
      const csv = generateCSV(previewData);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=client-report-${new Date().getTime()}.csv`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Export failed: ' + err.message }, { status: 500 });
  }
}

function generatePDF(data: any[]): Buffer {
  let pdf = '%PDF-1.4\n';
  let content = '';
  let yPos = 750;
  const pageHeight = 792;
  const pageWidth = 612;
  const margin = 40;
  const lineHeight = 12;

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

  // Title Section
  addText('IZOGRUP', margin, yPos, 20, true);
  yPos -= 30;

  addText('Client Export Report', margin, yPos, 14, false);
  yPos -= 8;

  addText(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos, 9, false);
  yPos -= 20;

  drawLine(margin, yPos, pageWidth - margin, 1);
  yPos -= 15;

  // Summary Section
  addText('SUMMARY', margin, yPos, 11, true);
  yPos -= 14;

  const totalRevenue = data.reduce((sum, r) => sum + r.totalRevenueGenerated, 0);
  const totalOrders = data.reduce((sum, r) => sum + r.totalOrdersCount, 0);
  const summaryInfo = [
    ['Total Clients:', data.length.toString()],
    ['Total Orders:', totalOrders.toString()],
    ['Total Revenue:', `€${totalRevenue.toFixed(2)}`],
    ['Active Clients:', data.filter((c: any) => c.clientStatus === 'Active').length.toString()],
    ['Disabled Clients:', data.filter((c: any) => c.clientStatus === 'Disabled').length.toString()],
  ];

  summaryInfo.forEach(([label, value]) => {
    addText(label, margin + 10, yPos, 9, true);
    addText(value, margin + 120, yPos, 9, false);
    yPos -= lineHeight;
  });

  yPos -= 15;

  // Client Details Table
  if (data.length > 0) {
    addText('CLIENT DETAILS', margin, yPos, 11, true);
    yPos -= 20;

    data.forEach((client: any, index: number) => {
      // Check if we need a new page
      if (yPos < margin + 120) {
        yPos = pageHeight - margin - 20;
      }

      // Client header
      addText(`Client #${index + 1}`, margin, yPos, 10, true);
      yPos -= 15;

      // Client information in two columns
      const leftColumn = [
        ['Client ID:', client.clientId.substring(0, 20)],
        ['Client Type:', client.clientType],
        ['Status:', client.clientStatus],
        ['Phone:', client.phoneNumber],
        ['Email:', client.email.substring(0, 25)],
        ['Created By:', client.createdBy],
      ];

      const rightColumn = [
        ['Address:', (client.address || 'N/A').substring(0, 25)],
        ['Assigned Agent:', client.assignedSalesAgent.substring(0, 20)],
        ['Creation Date:', client.creationDate],
        ['Total Orders:', client.totalOrdersCount.toString()],
        ['Total Revenue:', `€${client.totalRevenueGenerated.toFixed(2)}`],
        ['', ''], // Empty for alignment
      ];

      // Print left column
      leftColumn.forEach(([label, value], i) => {
        addText(label, margin + 10, yPos - (i * lineHeight), 8, true);
        addText(value, margin + 90, yPos - (i * lineHeight), 8, false);
      });

      // Print right column
      rightColumn.forEach(([label, value], i) => {
        if (label) { // Skip empty entries
          addText(label, margin + 280, yPos - (i * lineHeight), 8, true);
          addText(value, margin + 380, yPos - (i * lineHeight), 8, false);
        }
      });

      yPos -= (leftColumn.length * lineHeight) + 10;

      // Separator line
      drawLine(margin, yPos, pageWidth - margin, 0.3);
      yPos -= 15;
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

function generateCSV(data: any[]): string {
  let csv = 'CLIENT EXPORT REPORT\n\n';

  // Summary
  const totalRevenue = data.reduce((sum, r) => sum + r.totalRevenueGenerated, 0);
  const totalOrders = data.reduce((sum, r) => sum + r.totalOrdersCount, 0);
  csv += 'SUMMARY\n';
  csv += `Total Clients,${data.length}\n`;
  csv += `Total Orders,${totalOrders}\n`;
  csv += `Total Revenue,€${totalRevenue.toFixed(2)}\n`;
  csv += `Active Clients,${data.filter((c: any) => c.clientStatus === 'Active').length}\n`;
  csv += `Disabled Clients,${data.filter((c: any) => c.clientStatus === 'Disabled').length}\n\n`;

  // Client Details with all required fields
  csv += 'CLIENT DETAILS\n';
  csv += 'Client ID,Client Type,Client Status,Address,Phone Number,Email,Created By,Assigned Sales Agent,Creation Date,Total Orders Count,Total Revenue Generated\n';
  
  data.forEach((client: any) => {
    csv += `"${client.clientId}","${client.clientType}","${client.clientStatus}","${client.address}","${client.phoneNumber}","${client.email}","${client.createdBy}","${client.assignedSalesAgent}","${client.creationDate}","${client.totalOrdersCount}","€${client.totalRevenueGenerated.toFixed(2)}"\n`;
  });

  return csv;
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n]/g, ' ');
}