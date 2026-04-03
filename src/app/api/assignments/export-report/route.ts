import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignmentId, status, dateFrom, dateTo, format, export: shouldExport } = body;

    // Build where clause
    const where: any = {};
    if (assignmentId) {
      where.id = assignmentId;
    }
    if (status) {
      where.status = status;
    }
    if (dateFrom || dateTo) {
      where.assignedDate = {};
      if (dateFrom) {
        where.assignedDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.assignedDate.lte = new Date(dateTo);
      }
    }

    // Fetch assignments with related data
    const assignmentsData = await prisma.assignment.findMany({
      where,
      include: {
        worker: true,
        site: true,
        car: true,
      },
      orderBy: { assignedDate: 'desc' },
    });

    if (assignmentsData.length === 0) {
      return NextResponse.json({ report: [] });
    }

    // Build report data
    const previewData = assignmentsData.map(assignment => ({
      id: assignment.id,
      assignmentId: assignment.id,
      assignmentDate: new Date(assignment.assignedDate).toLocaleDateString(),
      workerName: assignment.worker?.fullName || 'N/A',
      workerEmail: assignment.worker?.email || 'N/A',
      workerPhone: assignment.worker?.phone || 'N/A',
      siteName: assignment.site?.name || 'N/A',
      siteAddress: assignment.site?.address || 'N/A',
      carName: assignment.car?.name || 'N/A',
      carNumber: assignment.car?.number || 'N/A',
      status: assignment.status,
      notes: assignment.notes || 'N/A',
    }));

    // PREVIEW - return simple array for table display
    if (!shouldExport) {
      return NextResponse.json({ report: previewData });
    }

    // Calculate summary statistics
    const summary = {
      totalAssignments: previewData.length,
      activeCount: previewData.filter(a => a.status === 'active').length,
      completedCount: previewData.filter(a => a.status === 'completed').length,
      cancelledCount: previewData.filter(a => a.status === 'cancelled').length,
      uniqueWorkers: new Set(previewData.map(a => a.workerName)).size,
      uniqueSites: new Set(previewData.map(a => a.siteName)).size,
    };

    // PDF EXPORT
    if (format === 'pdf') {
      const buffer = generatePDF(previewData, summary);
      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=assignment-report-${new Date().getTime()}.pdf`,
        },
      });
    }

    // CSV EXPORT
    if (format === 'excel') {
      const csv = generateCSV(previewData, summary);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=assignment-report-${new Date().getTime()}.csv`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Export failed: ' + err.message }, { status: 500 });
  }
}

function generatePDF(data: any[], summary: any): Buffer {
  let pdf = '%PDF-1.4\n';
  let content = '';
  let yPos = 750;
  const pageHeight = 792;
  const pageWidth = 612;
  const margin = 40;
  const lineHeight = 11;

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

  addText('Assignment Report', margin, yPos, 14, false);
  yPos -= 8;

  addText(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos, 9, false);
  yPos -= 20;

  drawLine(margin, yPos, pageWidth - margin, 1);
  yPos -= 15;

  // Summary Section
  addText('SUMMARY', margin, yPos, 11, true);
  yPos -= 14;

  const summaryInfo = [
    ['Total Assignments:', summary.totalAssignments.toString()],
    ['Active:', summary.activeCount.toString()],
    ['Completed:', summary.completedCount.toString()],
    ['Cancelled:', summary.cancelledCount.toString()],
    ['Unique Workers:', summary.uniqueWorkers.toString()],
    ['Unique Sites:', summary.uniqueSites.toString()],
  ];

  summaryInfo.forEach(([label, value]) => {
    addText(label, margin + 10, yPos, 9, true);
    addText(value, margin + 120, yPos, 9, false);
    yPos -= lineHeight;
  });

  yPos -= 10;

  // Assignments Table
  if (data.length > 0) {
    checkNewPage();
    addText('ASSIGNMENT DETAILS', margin, yPos, 11, true);
    yPos -= 14;

    // Table header
    addText('Worker', margin + 5, yPos, 8, true);
    addText('Site', margin + 120, yPos, 8, true);
    addText('Date', margin + 240, yPos, 8, true);
    addText('Car', margin + 310, yPos, 8, true);
    addText('Status', margin + 420, yPos, 8, true);
    yPos -= 12;

    drawLine(margin, yPos, pageWidth - margin, 0.5);
    yPos -= 8;

    // Table rows
    data.forEach((assignment: any) => {
      if (yPos < margin + 30) {
        yPos = pageHeight - margin;
      }

      addText(assignment.workerName.substring(0, 18), margin + 5, yPos, 7, false);
      addText(assignment.siteName.substring(0, 18), margin + 120, yPos, 7, false);
      addText(assignment.assignmentDate, margin + 240, yPos, 7, false);
      addText(assignment.carName.substring(0, 15), margin + 310, yPos, 7, false);
      addText(assignment.status, margin + 420, yPos, 7, false);

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

function generateCSV(data: any[], summary: any): string {
  let csv = 'ASSIGNMENT REPORT\n\n';

  // Summary
  csv += 'SUMMARY\n';
  csv += `Total Assignments,${summary.totalAssignments}\n`;
  csv += `Active,${summary.activeCount}\n`;
  csv += `Completed,${summary.completedCount}\n`;
  csv += `Cancelled,${summary.cancelledCount}\n`;
  csv += `Unique Workers,${summary.uniqueWorkers}\n`;
  csv += `Unique Sites,${summary.uniqueSites}\n\n`;

  // Assignment Details
  csv += 'ASSIGNMENT DETAILS\n';
  csv += 'Assignment ID,Date,Worker Name,Worker Email,Worker Phone,Site Name,Site Address,Car Name,Car Number,Status,Notes\n';
  data.forEach((assignment: any) => {
    csv += `"${assignment.assignmentId}","${assignment.assignmentDate}","${assignment.workerName}","${assignment.workerEmail}","${assignment.workerPhone}","${assignment.siteName}","${assignment.siteAddress}","${assignment.carName}","${assignment.carNumber}","${assignment.status}","${assignment.notes}"\n`;
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
