import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workerId, month, year, format } = body;

    if (!workerId || !month || !year) {
      return NextResponse.json({ error: 'Worker ID, month, and year are required' }, { status: 400 });
    }

    // Get worker details
    const worker = await prisma.users.findUnique({
      where: { id: workerId },
      include: { worker: true },
    });

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get assignments for the month
    const assignments = await prisma.assignment.findMany({
      where: {
        workerId,
        assignedDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        site: true,
      },
    });

    // Get attendance records for the month
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        workerId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calculate work days (unique dates from both assignments and attendance)
    const workDatesSet = new Set();
    
    assignments.forEach(assignment => {
      workDatesSet.add(assignment.assignedDate.toISOString().split('T')[0]);
    });
    
    attendanceRecords.forEach(attendance => {
      workDatesSet.add(attendance.date.toISOString().split('T')[0]);
    });

    const totalWorkDays = workDatesSet.size;
    const dailySalary = worker.worker?.hourlyRate ? worker.worker.hourlyRate * 8 : worker.worker?.monthlyRate ? worker.worker.monthlyRate / 30 : 0;
    const totalAmount = totalWorkDays * dailySalary;
    const paidAmount = 0; // This would come from a payments system
    const dueAmount = totalAmount - paidAmount;

    // Generate PDF
    if (format === 'pdf') {
      const pdfBuffer = await generateSalaryReportPDF({
        worker,
        month,
        year,
        totalWorkDays,
        dailySalary,
        totalAmount,
        paidAmount,
        dueAmount,
        workDates: Array.from(workDatesSet),
      });

      return new NextResponse(pdfBuffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=salary-report-${worker.fullName.replace(/\s+/g, '-')}-${year}-${month}.pdf`,
        },
      });
    }

    // Return JSON data
    return NextResponse.json({
      success: true,
      report: {
        worker: {
          id: worker.id,
          fullName: worker.fullName,
          email: worker.email,
        },
        period: {
          month,
          year,
          monthName: new Date(year, month - 1).toLocaleString('default', { month: 'long' }),
        },
        summary: {
          totalWorkDays,
          dailySalary,
          totalAmount,
          paidAmount,
          dueAmount,
        },
        workDates: Array.from(workDatesSet),
      },
    });

  } catch (error: any) {
    console.error('Worker salary report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate worker salary report', details: error.message },
      { status: 500 }
    );
  }
}

async function generateSalaryReportPDF(data: any): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();
    let yPosition = height - 60;

    // Colors
    const primaryColor = rgb(0.15, 0.35, 0.65); // Professional blue
    const darkGray = rgb(0.2, 0.2, 0.2);
    const lightGray = rgb(0.95, 0.95, 0.95);

    // Header with company branding
    page.drawRectangle({
      x: 0,
      y: height - 100,
      width: width,
      height: 100,
      color: primaryColor,
    });

    // Company name
    page.drawText('IzoGrup', {
      x: 50,
      y: height - 45,
      size: 28,
      font: helveticaBoldFont,
      color: rgb(1, 1, 1),
    });

    // Report title
    const monthName = new Date(data.year, data.month - 1).toLocaleString('default', { month: 'long' });
    const reportTitle = `Izogrup-Employees Economic Relationship For ${monthName} ${data.year}`;
    
    page.drawText(reportTitle, {
      x: 50,
      y: height - 75,
      size: 16,
      font: helveticaBoldFont,
      color: rgb(1, 1, 1),
    });

    yPosition = height - 130;

    // Employee Information Section
    page.drawRectangle({
      x: 40,
      y: yPosition - 40,
      width: width - 80,
      height: 40,
      color: lightGray,
    });

    page.drawText('EMPLOYEE INFORMATION', {
      x: 50,
      y: yPosition - 20,
      size: 14,
      font: helveticaBoldFont,
      color: primaryColor,
    });

    yPosition -= 60;

    // Employee details
    const employeeDetails = [
      ['Employee Name:', data.worker.fullName],
      ['Email:', data.worker.email],
      ['Report Period:', `${monthName} ${data.year}`],
      ['Report Generated:', new Date().toLocaleDateString()],
    ];

    employeeDetails.forEach(([label, value]) => {
      page.drawText(label, {
        x: 50,
        y: yPosition,
        size: 11,
        font: helveticaBoldFont,
        color: darkGray,
      });

      page.drawText(value, {
        x: 200,
        y: yPosition,
        size: 11,
        font: helveticaFont,
        color: darkGray,
      });

      yPosition -= 20;
    });

    yPosition -= 20;

    // Financial Summary Section
    page.drawRectangle({
      x: 40,
      y: yPosition - 40,
      width: width - 80,
      height: 40,
      color: lightGray,
    });

    page.drawText('FINANCIAL SUMMARY', {
      x: 50,
      y: yPosition - 20,
      size: 14,
      font: helveticaBoldFont,
      color: primaryColor,
    });

    yPosition -= 60;

    // Financial details
    const financialDetails = [
      ['Total Work Days:', data.totalWorkDays.toString()],
      ['Daily Salary:', `€${data.dailySalary.toFixed(2)}`],
      ['Total Amount:', `€${data.totalAmount.toFixed(2)}`],
      ['Due Amount:', `€${data.dueAmount.toFixed(2)}`],
    ];

    financialDetails.forEach(([label, value], index) => {
      const isTotal = index === financialDetails.length - 1;
      
      page.drawText(label, {
        x: 50,
        y: yPosition,
        size: isTotal ? 13 : 11,
        font: helveticaBoldFont,
        color: isTotal ? primaryColor : darkGray,
      });

      page.drawText(value, {
        x: 200,
        y: yPosition,
        size: isTotal ? 13 : 11,
        font: isTotal ? helveticaBoldFont : helveticaFont,
        color: isTotal ? primaryColor : darkGray,
      });

      if (isTotal) {
        // Draw line under total
        page.drawLine({
          start: { x: 50, y: yPosition - 5 },
          end: { x: 300, y: yPosition - 5 },
          thickness: 2,
          color: primaryColor,
        });
      }

      yPosition -= 25;
    });

    yPosition -= 20;

    // Work Days Details Section
    if (data.workDates.length > 0) {
      page.drawRectangle({
        x: 40,
        y: yPosition - 40,
        width: width - 80,
        height: 40,
        color: lightGray,
      });

      page.drawText('WORK DAYS BREAKDOWN', {
        x: 50,
        y: yPosition - 20,
        size: 14,
        font: helveticaBoldFont,
        color: primaryColor,
      });

      yPosition -= 60;

      // Display work dates in a grid
      const datesPerRow = 5;
      const sortedDates = data.workDates.sort();
      
      for (let i = 0; i < sortedDates.length; i += datesPerRow) {
        const rowDates = sortedDates.slice(i, i + datesPerRow);
        
        rowDates.forEach((date: string, index: number) => {
          const formattedDate = new Date(date).toLocaleDateString();
          page.drawText(formattedDate, {
            x: 50 + (index * 100),
            y: yPosition,
            size: 10,
            font: helveticaFont,
            color: darkGray,
          });
        });
        
        yPosition -= 20;
      }
    }

    // Footer
    yPosition = 60;
    page.drawLine({
      start: { x: 40, y: yPosition },
      end: { x: width - 40, y: yPosition },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    page.drawText('IzoGrup - Construction Management System', {
      x: 50,
      y: yPosition - 20,
      size: 9,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText(`Generated on ${new Date().toLocaleDateString()}`, {
      x: width - 200,
      y: yPosition - 20,
      size: 9,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Serialize the PDF document to bytes
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);

  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}