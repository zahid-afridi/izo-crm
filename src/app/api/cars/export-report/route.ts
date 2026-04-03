import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { carId, dateFrom, dateTo, format, export: shouldExport } = body;

    if (!carId || !dateFrom || !dateTo) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

    if (startDate > endDate) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    // Fetch car information
    const car = await prisma.car.findUnique({
      where: { id: carId },
    });

    if (!car) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    }

    // Fetch all assignments for the car within date range with detailed information
    const assignments = await prisma.assignment.findMany({
      where: {
        carId,
        assignedDate: { gte: startDate, lte: endDate },
      },
      include: {
        worker: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
          }
        },
        site: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            client: true,
            status: true,
            startDate: true,
            estimatedEndDate: true,
            actualEndDate: true,
          }
        },
      },
      orderBy: { assignedDate: 'desc' },
    });

    // Get attendance records for this car's assignments to show actual usage times
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        assignmentId: { in: assignments.map(a => a.id) },
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'desc' },
    });

    // Group attendance by assignment
    const attendanceByAssignment = attendanceRecords.reduce((acc, attendance) => {
      if (!acc[attendance.assignmentId]) {
        acc[attendance.assignmentId] = [];
      }
      acc[attendance.assignmentId].push(attendance);
      return acc;
    }, {} as Record<string, any[]>);

    // Get unique sites where this car was used
    const uniqueSites = assignments.reduce((acc, assignment) => {
      if (assignment.site && !acc.find(s => s.id === assignment.site!.id)) {
        acc.push(assignment.site);
      }
      return acc;
    }, [] as any[]);

    // Calculate usage statistics
    const totalAssignments = assignments.length;
    const totalUniqueSites = uniqueSites.length;
    const totalWorkingDays = attendanceRecords.length;
    
    // Calculate total working hours
    const totalWorkingHours = attendanceRecords.reduce((total, attendance) => {
      if (attendance.checkInTime && attendance.checkOutTime) {
        const hours = (new Date(attendance.checkOutTime).getTime() - new Date(attendance.checkInTime).getTime()) / (1000 * 60 * 60);
        return total + hours;
      }
      return total;
    }, 0);

    // Build preview data for frontend table (simple format)
    const previewData = [{
      id: car.id,
      carId: car.id,
      carName: car.name,
      plateNumber: car.number,
      carNumber: car.number,
      carColor: car.color,
      carStatus: car.status,
    }];

    // Build detailed report data for PDF/CSV export
    const reportData = {
      car: {
        id: car.id,
        name: car.name,
        number: car.number,
        color: car.color,
        model: car.model,
        status: car.status,
        createdAt: new Date(car.createdAt).toLocaleDateString(),
      },
      assignments: assignments.map(assignment => {
        const attendanceForAssignment = attendanceByAssignment[assignment.id] || [];
        return {
          id: assignment.id,
          assignedDate: new Date(assignment.assignedDate).toLocaleDateString(),
          assignedDateTime: new Date(assignment.assignedDate).toLocaleString(),
          status: assignment.status,
          notes: assignment.notes || 'No notes',
          worker: {
            name: assignment.worker?.fullName || 'N/A',
            email: assignment.worker?.email || 'N/A',
            phone: assignment.worker?.phone || 'N/A',
            role: assignment.worker?.role || 'N/A',
          },
          site: {
            name: assignment.site?.name || 'N/A',
            address: assignment.site?.address || 'N/A',
            city: assignment.site?.city || 'N/A',
            client: assignment.site?.client || 'N/A',
            status: assignment.site?.status || 'N/A',
            startDate: assignment.site?.startDate ? new Date(assignment.site.startDate).toLocaleDateString() : 'N/A',
            estimatedEndDate: assignment.site?.estimatedEndDate ? new Date(assignment.site.estimatedEndDate).toLocaleDateString() : 'N/A',
          },
          attendance: attendanceForAssignment.map(att => ({
            date: new Date(att.date).toLocaleDateString(),
            checkInTime: att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString() : 'N/A',
            checkOutTime: att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString() : 'Not checked out',
            workingHours: att.checkInTime && att.checkOutTime ? 
              ((new Date(att.checkOutTime).getTime() - new Date(att.checkInTime).getTime()) / (1000 * 60 * 60)).toFixed(2) + ' hours' : 
              'Incomplete',
            notes: att.notes || 'No notes',
          })),
        };
      }),
      uniqueSites: uniqueSites.map(site => ({
        name: site.name,
        address: site.address,
        city: site.city || 'N/A',
        client: site.client || 'N/A',
        status: site.status,
        startDate: new Date(site.startDate).toLocaleDateString(),
        estimatedEndDate: site.estimatedEndDate ? new Date(site.estimatedEndDate).toLocaleDateString() : 'N/A',
        assignmentCount: assignments.filter(a => a.siteId === site.id).length,
      })),
      summary: {
        totalAssignments,
        totalUniqueSites,
        totalWorkingDays,
        totalWorkingHours: totalWorkingHours.toFixed(2) + ' hours',
        averageHoursPerDay: totalWorkingDays > 0 ? (totalWorkingHours / totalWorkingDays).toFixed(2) + ' hours' : '0 hours',
        reportPeriod: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
        lastUsed: assignments.length > 0 ? new Date(assignments[0].assignedDate).toLocaleDateString() : 'Never used',
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
          'Content-Disposition': `attachment; filename=car-report-${carId}.pdf`,
        },
      });
    }

    // CSV EXPORT
    if (format === 'excel') {
      const csv = generateCSV(reportData, startDate, endDate);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=car-report-${carId}.csv`,
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
  const checkNewPage = (requiredSpace: number = 50) => {
    if (yPos < margin + requiredSpace) {
      content += 'Q\nQ\n';
      yPos = pageHeight - margin;
      return true;
    }
    return false;
  };

  // Title Section
  addText('IZOGRUP', margin, yPos, 20, true);
  yPos -= 30;

  addText('Car Usage Report', margin, yPos, 14, false);
  yPos -= 8;

  addText(`Report Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`, margin, yPos, 9, false);
  yPos -= 20;

  drawLine(margin, yPos, pageWidth - margin, 1);
  yPos -= 15;

  // Car Information Section
  addText('CAR INFORMATION', margin, yPos, 11, true);
  yPos -= 14;

  const carInfo = [
    ['Car ID:', data.car.id],
    ['Car Name:', data.car.name],
    ['Plate Number:', data.car.number],
    ['Car Number:', data.car.number],
    ['Color:', data.car.color],
    ['Model:', data.car.model],
    ['Status:', data.car.status],
    ['Created Date:', data.car.createdAt],
  ];

  carInfo.forEach(([label, value]) => {
    addText(label, margin + 10, yPos, 9, true);
    addText(value, margin + 120, yPos, 9, false);
    yPos -= lineHeight;
  });

  yPos -= 10;

  // Usage Summary Section
  checkNewPage(100);
  addText('USAGE SUMMARY', margin, yPos, 11, true);
  yPos -= 14;

  const summaryInfo = [
    ['Total Assignments:', data.summary.totalAssignments.toString()],
    ['Unique Sites Used:', data.summary.totalUniqueSites.toString()],
    ['Total Working Days:', data.summary.totalWorkingDays.toString()],
    ['Total Working Hours:', data.summary.totalWorkingHours],
    ['Average Hours/Day:', data.summary.averageHoursPerDay],
    ['Last Used:', data.summary.lastUsed],
    ['Report Period:', data.summary.reportPeriod],
  ];

  summaryInfo.forEach(([label, value]) => {
    addText(label, margin + 10, yPos, 9, true);
    addText(value, margin + 140, yPos, 9, false);
    yPos -= lineHeight;
  });

  yPos -= 15;

  // Sites Used Section
  if (data.uniqueSites.length > 0) {
    checkNewPage(100);
    addText('SITES WHERE CAR WAS USED', margin, yPos, 11, true);
    yPos -= 14;

    data.uniqueSites.forEach((site: any, index: number) => {
      checkNewPage(80);
      
      addText(`${index + 1}. ${site.name}`, margin + 10, yPos, 9, true);
      yPos -= 12;
      
      addText(`Address: ${site.address}, ${site.city}`, margin + 20, yPos, 8, false);
      yPos -= 10;
      
      addText(`Client: ${site.client}`, margin + 20, yPos, 8, false);
      yPos -= 10;
      
      addText(`Status: ${site.status}`, margin + 20, yPos, 8, false);
      yPos -= 10;
      
      addText(`Project Period: ${site.startDate} - ${site.estimatedEndDate}`, margin + 20, yPos, 8, false);
      yPos -= 10;
      
      addText(`Times Used: ${site.assignmentCount} assignment(s)`, margin + 20, yPos, 8, false);
      yPos -= 15;
    });
  }

  // Detailed Assignments Section
  if (data.assignments.length > 0) {
    checkNewPage(100);
    addText('DETAILED ASSIGNMENT HISTORY', margin, yPos, 11, true);
    yPos -= 14;

    data.assignments.forEach((assignment: any, index: number) => {
      checkNewPage(120);
      
      addText(`Assignment #${index + 1}`, margin + 10, yPos, 9, true);
      yPos -= 12;
      
      addText(`Date: ${assignment.assignedDate} (${assignment.assignedDateTime})`, margin + 20, yPos, 8, false);
      yPos -= 10;
      
      addText(`Site: ${assignment.site.name}`, margin + 20, yPos, 8, false);
      yPos -= 10;
      
      addText(`Address: ${assignment.site.address}, ${assignment.site.city}`, margin + 20, yPos, 8, false);
      yPos -= 10;
      
      addText(`Client: ${assignment.site.client}`, margin + 20, yPos, 8, false);
      yPos -= 10;
      
      addText(`Worker: ${assignment.worker.name} (${assignment.worker.role})`, margin + 20, yPos, 8, false);
      yPos -= 10;
      
      addText(`Status: ${assignment.status}`, margin + 20, yPos, 8, false);
      yPos -= 10;
      
      if (assignment.notes !== 'No notes') {
        addText(`Notes: ${assignment.notes}`, margin + 20, yPos, 8, false);
        yPos -= 10;
      }
      
      // Attendance details for this assignment
      if (assignment.attendance.length > 0) {
        addText(`Attendance Records:`, margin + 20, yPos, 8, true);
        yPos -= 10;
        
        assignment.attendance.forEach((att: any) => {
          checkNewPage(30);
          addText(`  • ${att.date}: ${att.checkInTime} - ${att.checkOutTime} (${att.workingHours})`, margin + 30, yPos, 7, false);
          yPos -= 9;
        });
      } else {
        addText(`No attendance records found`, margin + 20, yPos, 8, false);
        yPos -= 10;
      }
      
      yPos -= 10;
    });
  }

  // Footer
  yPos = 30;
  drawLine(margin, yPos + 10, pageWidth - margin, 0.5);
  addText('Generated by IZOGRUP CRM System', pageWidth / 2 - 80, yPos, 8, false);
  addText(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2 - 60, yPos - 10, 7, false);

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
  let csv = 'CAR USAGE REPORT\n\n';

  // Car Information
  csv += 'CAR INFORMATION\n';
  csv += `Car ID,${data.car.id}\n`;
  csv += `Car Name,${data.car.name}\n`;
  csv += `Plate Number,${data.car.number}\n`;
  csv += `Car Number,${data.car.number}\n`;
  csv += `Color,${data.car.color}\n`;
  csv += `Model,${data.car.model}\n`;
  csv += `Status,${data.car.status}\n`;
  csv += `Created Date,${data.car.createdAt}\n\n`;

  // Usage Summary
  csv += 'USAGE SUMMARY\n';
  csv += `Total Assignments,${data.summary.totalAssignments}\n`;
  csv += `Unique Sites Used,${data.summary.totalUniqueSites}\n`;
  csv += `Total Working Days,${data.summary.totalWorkingDays}\n`;
  csv += `Total Working Hours,${data.summary.totalWorkingHours}\n`;
  csv += `Average Hours Per Day,${data.summary.averageHoursPerDay}\n`;
  csv += `Last Used,${data.summary.lastUsed}\n`;
  csv += `Report Period,${data.summary.reportPeriod}\n\n`;

  // Sites Used
  if (data.uniqueSites && data.uniqueSites.length > 0) {
    csv += 'SITES WHERE CAR WAS USED\n';
    csv += 'Site Name,Address,City,Client,Status,Project Start,Project End,Times Used\n';
    data.uniqueSites.forEach((site: any) => {
      csv += `"${site.name}","${site.address}","${site.city}","${site.client}","${site.status}","${site.startDate}","${site.estimatedEndDate}","${site.assignmentCount}"\n`;
    });
    csv += '\n';
  }

  // Detailed Assignments
  if (data.assignments && data.assignments.length > 0) {
    csv += 'DETAILED ASSIGNMENT HISTORY\n';
    csv += 'Assignment Date,Assignment DateTime,Site Name,Site Address,Site City,Client,Worker Name,Worker Email,Worker Phone,Worker Role,Assignment Status,Assignment Notes\n';
    data.assignments.forEach((assignment: any) => {
      csv += `"${assignment.assignedDate}","${assignment.assignedDateTime}","${assignment.site.name}","${assignment.site.address}","${assignment.site.city}","${assignment.site.client}","${assignment.worker.name}","${assignment.worker.email}","${assignment.worker.phone}","${assignment.worker.role}","${assignment.status}","${assignment.notes}"\n`;
    });
    csv += '\n';

    // Attendance Records
    csv += 'ATTENDANCE RECORDS\n';
    csv += 'Assignment Date,Attendance Date,Check In Time,Check Out Time,Working Hours,Notes\n';
    data.assignments.forEach((assignment: any) => {
      if (assignment.attendance && assignment.attendance.length > 0) {
        assignment.attendance.forEach((att: any) => {
          csv += `"${assignment.assignedDate}","${att.date}","${att.checkInTime}","${att.checkOutTime}","${att.workingHours}","${att.notes}"\n`;
        });
      }
    });
  }

  csv += `\nReport Generated: ${new Date().toLocaleString()}\n`;
  csv += 'Generated by IZOGRUP CRM System\n';

  return csv;
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n]/g, ' ');
}
