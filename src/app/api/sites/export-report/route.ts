import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, dateFrom, dateTo, format, export: shouldExport } = body;

    if (!siteId || !dateFrom || !dateTo) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

    if (startDate > endDate) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    // Fetch complete site information
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      include: {
        siteManager: true,
      },
    });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Fetch all assignments for the site within date range
    const assignments = await prisma.assignment.findMany({
      where: {
        siteId,
        assignedDate: { gte: startDate, lte: endDate },
      },
      include: {
        worker: {
          include: { worker: true },
        },
      },
      orderBy: { assignedDate: 'asc' },
    });

    // Calculate total time (in days)
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Build preview data for frontend table (simple format)
    const previewData = [{
      id: site.id,
      siteId: site.id,
      siteName: site.name,
      address: site.address,
      workersAssigned: assignments.length > 0 ? new Set(assignments.map(a => a.workerId)).size : 0,
      progress: site.progress,
      siteManager: site.siteManager?.fullName || 'Not Assigned',
      totalTime: `${totalDays} days`,
      status: site.status,
    }];

    // Build detailed report data for PDF/CSV export
    const reportData = {
      site: {
        id: site.id,
        name: site.name,
        address: site.address,
        city: site.city || 'N/A',
        postalCode: site.postalCode || 'N/A',
        client: site.client || 'N/A',
        status: site.status,
        progress: site.progress,
        startDate: new Date(site.startDate).toLocaleDateString(),
        estimatedEndDate: site.estimatedEndDate ? new Date(site.estimatedEndDate).toLocaleDateString() : 'TBD',
        actualEndDate: site.actualEndDate ? new Date(site.actualEndDate).toLocaleDateString() : 'N/A',
        progressNotes: site.progressNotes || 'N/A',
        createdAt: new Date(site.createdAt).toLocaleDateString(),
      },
      siteManager: site.siteManager ? {
        fullName: site.siteManager.fullName,
        email: site.siteManager.email,
        phone: site.siteManager.phone || 'N/A',
      } : null,
      assignments: assignments.map(a => ({
        workerName: a.worker?.fullName || 'N/A',
        workerEmail: a.worker?.email || 'N/A',
        assignedDate: new Date(a.assignedDate).toLocaleDateString(),
        status: a.status,
      })),
      summary: {
        totalAssignments: assignments.length,
        uniqueWorkers: new Set(assignments.map(a => a.workerId)).size,
        reportPeriod: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
        totalDays: totalDays,
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
          'Content-Disposition': `attachment; filename=site-report-${siteId}.pdf`,
        },
      });
    }

    // CSV EXPORT
    if (format === 'excel') {
      const csv = generateCSV(reportData, startDate, endDate);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=site-report-${siteId}.csv`,
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

  addText('Site Report', margin, yPos, 14, false);
  yPos -= 8;

  addText(`Report Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`, margin, yPos, 9, false);
  yPos -= 20;

  drawLine(margin, yPos, pageWidth - margin, 1);
  yPos -= 15;

  // Site Information Section
  addText('SITE INFORMATION', margin, yPos, 11, true);
  yPos -= 14;

  const siteInfo = [
    ['Site Name:', data.site.name],
    ['Address:', data.site.address],
    ['City:', data.site.city],
    ['Postal Code:', data.site.postalCode],
    ['Client:', data.site.client],
    ['Status:', data.site.status],
    ['Progress:', `${data.site.progress}%`],
    ['Start Date:', data.site.startDate],
    ['Estimated End Date:', data.site.estimatedEndDate],
  ];

  siteInfo.forEach(([label, value]) => {
    addText(label, margin + 10, yPos, 9, true);
    addText(value, margin + 120, yPos, 9, false);
    yPos -= lineHeight;
  });

  yPos -= 10;

  // Site Manager Section
  if (data.siteManager) {
    checkNewPage();
    addText('SITE MANAGER', margin, yPos, 11, true);
    yPos -= 14;

    const managerInfo = [
      ['Name:', data.siteManager.fullName],
      ['Email:', data.siteManager.email],
      ['Phone:', data.siteManager.phone],
    ];

    managerInfo.forEach(([label, value]) => {
      addText(label, margin + 10, yPos, 9, true);
      addText(value, margin + 120, yPos, 9, false);
      yPos -= lineHeight;
    });

    yPos -= 10;
  }

  // Summary Section
  checkNewPage();
  addText('SUMMARY', margin, yPos, 11, true);
  yPos -= 14;

  const summaryInfo = [
    ['Total Assignments:', data.summary.totalAssignments.toString()],
    ['Unique Workers:', data.summary.uniqueWorkers.toString()],
    ['Report Period:', data.summary.reportPeriod],
    ['Total Days:', data.summary.totalDays.toString()],
  ];

  summaryInfo.forEach(([label, value]) => {
    addText(label, margin + 10, yPos, 9, true);
    addText(value, margin + 120, yPos, 9, false);
    yPos -= lineHeight;
  });

  yPos -= 10;

  // Assignments Section
  if (data.assignments.length > 0) {
    checkNewPage();
    addText('WORKER ASSIGNMENTS', margin, yPos, 11, true);
    yPos -= 14;

    // Table header
    addText('Worker Name', margin + 10, yPos, 9, true);
    addText('Email', margin + 180, yPos, 9, true);
    addText('Assigned Date', margin + 350, yPos, 9, true);
    addText('Status', margin + 480, yPos, 9, true);
    yPos -= 12;

    drawLine(margin, yPos, pageWidth - margin, 0.5);
    yPos -= 8;

    // Table rows
    data.assignments.forEach((assignment: any) => {
      if (yPos < margin + 30) {
        yPos = pageHeight - margin;
      }

      addText(assignment.workerName.substring(0, 25), margin + 10, yPos, 8, false);
      addText(assignment.workerEmail.substring(0, 20), margin + 180, yPos, 8, false);
      addText(assignment.assignedDate, margin + 350, yPos, 8, false);
      addText(assignment.status, margin + 480, yPos, 8, false);

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
  let csv = 'SITE REPORT\n\n';

  // Site Information
  csv += 'SITE INFORMATION\n';
  csv += `Site Name,${data.site.name}\n`;
  csv += `Address,${data.site.address}\n`;
  csv += `City,${data.site.city}\n`;
  csv += `Postal Code,${data.site.postalCode}\n`;
  csv += `Client,${data.site.client}\n`;
  csv += `Status,${data.site.status}\n`;
  csv += `Progress,${data.site.progress}%\n`;
  csv += `Start Date,${data.site.startDate}\n`;
  csv += `Estimated End Date,${data.site.estimatedEndDate}\n\n`;

  // Site Manager
  if (data.siteManager) {
    csv += 'SITE MANAGER\n';
    csv += `Name,${data.siteManager.fullName}\n`;
    csv += `Email,${data.siteManager.email}\n`;
    csv += `Phone,${data.siteManager.phone}\n\n`;
  }

  // Summary
  csv += 'SUMMARY\n';
  csv += `Total Assignments,${data.summary.totalAssignments}\n`;
  csv += `Unique Workers,${data.summary.uniqueWorkers}\n`;
  csv += `Report Period,${data.summary.reportPeriod}\n`;
  csv += `Total Days,${data.summary.totalDays}\n\n`;

  // Assignments
  if (data.assignments.length > 0) {
    csv += 'WORKER ASSIGNMENTS\n';
    csv += 'Worker Name,Email,Assigned Date,Status\n';
    data.assignments.forEach((assignment: any) => {
      csv += `"${assignment.workerName}","${assignment.workerEmail}","${assignment.assignedDate}","${assignment.status}"\n`;
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
