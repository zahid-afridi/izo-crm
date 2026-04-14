import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function POST(request: NextRequest) {
  try {
    console.log('Workers export API called - comprehensive version');
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    const { workerId, dateFrom, dateTo, format, export: shouldExport } = body;

    // Validate that workerId is provided
    if (!workerId) {
      return NextResponse.json({ error: 'Worker ID is required' }, { status: 400 });
    }

    // Validate date range if provided
    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      
      if (fromDate > toDate) {
        return NextResponse.json({ error: 'Date from must be before date to' }, { status: 400 });
      }
    }

    // Test database connection first
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return NextResponse.json({ 
        error: 'Database connection failed. Please try again later.',
        details: 'The database server is temporarily unavailable. Please check your internet connection and try again.'
      }, { status: 503 });
    }

    // Fetch the specific worker with comprehensive details
    console.log('Fetching worker with ID:', workerId);
    
    let worker;
    try {
      worker = await prisma.users.findUnique({
        where: { id: workerId },
        include: { 
          worker: true,
        },
      });
    } catch (dbError) {
      console.error('Error fetching worker:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch worker data',
        details: 'Database query failed. Please try again.'
      }, { status: 500 });
    }

    console.log('Worker found:', worker ? 'Yes' : 'No');
    if (!worker) {
      console.log('Worker not found for ID:', workerId);
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    // Get all assignments for this worker with date filtering
    const assignmentWhere: any = {
      workerId: workerId,
    };

    if (dateFrom && dateTo) {
      assignmentWhere.assignedDate = {
        gte: new Date(dateFrom),
        lte: new Date(dateTo),
      };
    }

    let assignments: any[] = [];
    try {
      assignments = await prisma.assignment.findMany({
        where: assignmentWhere,
        include: {
          site: true,
          car: true,
        },
        orderBy: { assignedDate: 'desc' },
      });
      console.log(`Found ${assignments.length} assignments`);
    } catch (dbError) {
      console.error('Error fetching assignments:', dbError);
      // Continue with empty assignments array
    }

    // Get all attendance records for this worker with date filtering
    const attendanceWhere: any = {
      workerId: workerId,
    };

    if (dateFrom && dateTo) {
      attendanceWhere.date = {
        gte: new Date(dateFrom),
        lte: new Date(dateTo),
      };
    }

    let attendanceRecords: any[] = [];
    try {
      attendanceRecords = await prisma.siteAttendance.findMany({
        where: attendanceWhere,
        orderBy: { date: 'desc' },
      });
      console.log(`Found ${attendanceRecords.length} attendance records`);
    } catch (dbError) {
      console.error('Error fetching attendance records:', dbError);
      // Continue with empty attendance records array
    }

    // Get activity logs for this worker
    const activityLogsWhere: any = {
      userId: workerId,
    };

    if (dateFrom && dateTo) {
      activityLogsWhere.timestamp = {
        gte: new Date(dateFrom),
        lte: new Date(dateTo),
      };
    }

    let activityLogs: any[] = [];
    try {
      activityLogs = await prisma.activityLog.findMany({
        where: activityLogsWhere,
        orderBy: { timestamp: 'desc' },
        take: 100, // Limit to last 100 activities
      });
      console.log(`Found ${activityLogs.length} activity logs`);
    } catch (dbError) {
      console.error('Error fetching activity logs:', dbError);
      // Continue with empty activity logs array
    }

    // Get teams where worker is a member
    let workerTeams: any[] = [];
    try {
      workerTeams = await prisma.team.findMany({
        where: {
          memberIds: { has: workerId },
        },
      });
      console.log(`Found ${workerTeams.length} team memberships`);
    } catch (dbError) {
      console.error('Error fetching teams:', dbError);
      // Continue with empty teams array
    }

    // Build preview data for frontend table
    const previewData = [{
      id: worker.id,
      workerId: worker.id,
      workerName: worker.fullName,
      email: worker.email,
      phone: worker.phone || 'N/A',
      status: worker.status,
      employeeType: worker.worker?.employeeType || 'N/A',
      totalAssignments: assignments.length,
      timeSpent: calculateTotalTimeWorked(attendanceRecords),
      attendanceCount: attendanceRecords.length,
      createdDate: new Date(worker.createdAt).toLocaleDateString(),
    }];

    // For export, we need to get comprehensive data
    if (shouldExport) {
      console.log(`Worker ${workerId} export data:`, {
        assignmentsCount: assignments.length,
        attendanceCount: attendanceRecords.length,
        activityLogsCount: activityLogs.length,
        teamsCount: workerTeams.length,
        dateRange: dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 'All time',
      });

      // Build comprehensive data for the worker
      const comprehensiveData = {
        // Personal Information
        id: worker.id,
        fullName: worker.fullName,
        email: worker.email,
        phone: worker.phone || 'N/A',
        dateOfBirth: worker.dateOfBirth ? new Date(worker.dateOfBirth).toLocaleDateString() : 'N/A',
        idNumber: worker.idNumber || 'N/A',
        address: worker.address || 'N/A',
        username: worker.username || 'N/A',
        role: worker.role,
        status: worker.status,
        isLocked: worker.isLocked,
        createdAt: new Date(worker.createdAt).toLocaleDateString(),
        updatedAt: new Date(worker.updatedAt).toLocaleDateString(),
        
        // Date range info
        dateRange: dateFrom && dateTo ? `${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}` : 'All time',
        
        // Employment Details
        employeeType: worker.worker?.employeeType || 'N/A',
        hourlyRate: worker.worker?.hourlyRate || 'N/A',
        monthlyRate: worker.worker?.monthlyRate || 'N/A',
        removeStatus: worker.worker?.removeStatus || 'Active',
        
        // Teams
        teams: workerTeams.map(t => ({
          name: t.name,
          description: t.description || 'N/A',
          status: t.status,
          createdAt: new Date(t.createdAt).toLocaleDateString()
        })),
        
        // Assignments with Sites
        assignments: assignments.map(a => ({
          siteName: a.site?.name || 'N/A',
          siteAddress: a.site?.address || 'N/A',
          siteCity: a.site?.city || 'N/A',
          siteClient: a.site?.client || 'N/A',
          siteStatus: a.site?.status || 'N/A',
          carName: a.car?.name || 'N/A',
          carNumber: a.car?.number || 'N/A',
          assignedDate: new Date(a.assignedDate).toLocaleDateString(),
          assignmentStatus: a.status,
          notes: a.notes || 'No notes'
        })),
        
        // Attendance Records
        attendanceRecords: attendanceRecords.map(att => {
          const assignment = assignments.find(a => a.id === att.assignmentId);
          
          return {
            date: new Date(att.date).toLocaleDateString(),
            checkInTime: att.checkInTime ? new Date(att.checkInTime).toLocaleString() : 'N/A',
            checkOutTime: att.checkOutTime ? new Date(att.checkOutTime).toLocaleString() : 'Still active',
            timeSpent: att.checkInTime && att.checkOutTime ? 
              (() => {
                const minutes = Math.floor((new Date(att.checkOutTime).getTime() - new Date(att.checkInTime).getTime()) / (1000 * 60));
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                return `${hours}h ${mins}m`;
              })() : 'Ongoing',
            siteName: assignment?.site?.name || 'Unknown Site',
            siteAddress: assignment?.site?.address || 'N/A',
            assignmentId: att.assignmentId || 'N/A',
            notes: att.notes || 'No notes'
          };
        }),
        
        // Activity Logs
        activityLogs: activityLogs.map(log => ({
          timestamp: new Date(log.timestamp).toLocaleString(),
          action: log.action,
          details: log.details || 'No details',
          ipAddress: log.ipAddress || 'N/A',
          userAgent: log.userAgent || 'N/A'
        })),
        
        // Summary Statistics
        totalAssignments: assignments.length,
        activeAssignments: assignments.filter(a => a.status === 'active').length,
        completedAssignments: assignments.filter(a => a.status === 'completed').length,
        totalTimeWorked: calculateTotalTimeWorked(attendanceRecords),
        totalAttendanceRecords: attendanceRecords.length,
        completedSessions: attendanceRecords.filter(a => a.checkOutTime).length,
        activeSessions: attendanceRecords.filter(a => !a.checkOutTime).length,
        totalActivityLogs: activityLogs.length,
        
        // Time breakdown by sites
        timePerSite: calculateTimePerSite(attendanceRecords, assignments),
      };

      // Generate export based on format
      if (format === 'pdf') {
        console.log('Generating comprehensive PDF for worker:', {
          workerId: comprehensiveData.id,
          fullName: comprehensiveData.fullName,
          assignmentsCount: comprehensiveData.assignments.length,
          attendanceCount: comprehensiveData.attendanceRecords.length,
          activityLogsCount: comprehensiveData.activityLogs.length,
        });
        
        const pdfBuffer = await generateComprehensiveWorkerPDF(comprehensiveData);
        return new NextResponse(pdfBuffer as BodyInit, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=worker-${worker.fullName.replace(/\s+/g, '-')}-comprehensive-report.pdf`,
          },
        });
      } else {
        // Generate CSV (default)
        const csv = generateWorkerComprehensiveCSV(comprehensiveData);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=worker-${worker.fullName.replace(/\s+/g, '-')}-comprehensive-report.csv`,
          },
        });
      }
    }

    // PREVIEW - return simple array for table display
    return NextResponse.json({ report: previewData });

  } catch (err: any) {
    console.error('Worker export error:', err);
    console.error('Error stack:', err.stack);
    
    // Check if it's a database connection error
    if (err.code === 'P1001' || err.message?.includes("Can't reach database")) {
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: 'The database server is temporarily unavailable. Please check your internet connection and try again in a few moments.',
        code: 'DB_CONNECTION_ERROR'
      }, { status: 503 });
    }
    
    // Check if it's a timeout error
    if (err.code === 'P1008' || err.message?.includes('timeout')) {
      return NextResponse.json({ 
        error: 'Database query timeout',
        details: 'The request took too long to process. Please try again with a smaller date range.',
        code: 'DB_TIMEOUT_ERROR'
      }, { status: 504 });
    }
    
    return NextResponse.json({ 
      error: 'Export failed: ' + err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : 'An unexpected error occurred. Please try again.',
      code: 'GENERAL_ERROR'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Workers export API is working' });
}

function calculateTotalTimeWorked(attendanceRecords: any[]): string {
  let totalMinutes = 0;
  attendanceRecords.forEach(record => {
    if (record.checkInTime && record.checkOutTime) {
      const checkIn = new Date(record.checkInTime);
      const checkOut = new Date(record.checkOutTime);
      const minutes = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60));
      totalMinutes += minutes;
    }
  });

  if (totalMinutes === 0) return 'No time logged';
  
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return `${totalHours}h ${remainingMinutes}m`;
}

function calculateTimePerSite(attendanceRecords: any[], assignments: any[]): any[] {
  const siteTimeMap = new Map();
  
  attendanceRecords.forEach(record => {
    if (record.checkInTime && record.checkOutTime) {
      const assignment = assignments.find(a => a.id === record.assignmentId);
      
      if (assignment && assignment.site) {
        const siteName = assignment.site.name;
        const siteId = assignment.site.id;
        const checkIn = new Date(record.checkInTime);
        const checkOut = new Date(record.checkOutTime);
        const minutes = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60));
        
        if (siteTimeMap.has(siteId)) {
          const existing = siteTimeMap.get(siteId);
          existing.totalMinutes += minutes;
          existing.sessions += 1;
        } else {
          siteTimeMap.set(siteId, {
            siteName: siteName,
            siteAddress: assignment.site.address || 'N/A',
            totalMinutes: minutes,
            sessions: 1
          });
        }
      }
    }
  });
  
  // Convert to array and format time
  const result = Array.from(siteTimeMap.values()).map(site => ({
    siteName: site.siteName,
    siteAddress: site.siteAddress,
    totalTime: site.totalMinutes > 0 ? 
      `${Math.floor(site.totalMinutes / 60)}h ${site.totalMinutes % 60}m` : 
      '0h 0m',
    sessions: site.sessions,
    averageSessionTime: site.sessions > 0 ? 
      `${Math.floor((site.totalMinutes / site.sessions) / 60)}h ${Math.floor((site.totalMinutes / site.sessions) % 60)}m` : 
      '0h 0m',
    totalMinutes: site.totalMinutes
  }));
  
  return result.sort((a, b) => b.totalMinutes - a.totalMinutes).map(site => ({
    siteName: site.siteName,
    siteAddress: site.siteAddress,
    totalTime: site.totalTime,
    sessions: site.sessions,
    averageSessionTime: site.averageSessionTime
  }));
}
async function generateComprehensiveWorkerPDF(worker: any): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();
    let yPosition = height - 50;
    
    // Colors - Professional black and gray palette
    const black = rgb(0, 0, 0);
    const darkGray = rgb(0.2, 0.2, 0.2);
    const mediumGray = rgb(0.5, 0.5, 0.5);
    const lightGray = rgb(0.9, 0.9, 0.9);
    const white = rgb(1, 1, 1);
    
    // Helper function to add new page if needed
    const checkPageSpace = (requiredSpace: number) => {
      if (yPosition - requiredSpace < 50) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }
    };
    
    // Helper function to draw text with proper wrapping
    const drawText = (text: string, x: number, y: number, options: any = {}) => {
      const maxWidth = options.maxWidth || (width - x - 40);
      const fontSize = options.size || 10;
      const font = options.bold ? helveticaBoldFont : helveticaFont;
      const color = options.color || black;
      
      // Simple text wrapping
      const words = (text || 'N/A').toString().split(' ');
      let line = '';
      let currentY = y;
      
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        
        if (testWidth > maxWidth && line !== '') {
          page.drawText(line.trim(), {
            x,
            y: currentY,
            size: fontSize,
            font,
            color,
          });
          line = words[i] + ' ';
          currentY -= fontSize + 2;
        } else {
          line = testLine;
        }
      }
      
      if (line.trim() !== '') {
        page.drawText(line.trim(), {
          x,
          y: currentY,
          size: fontSize,
          font,
          color,
        });
      }
      
      return currentY;
    };
    
    // Helper function to draw section header
    const drawSectionHeader = (title: string, y: number) => {
      // Header background
      page.drawRectangle({
        x: 40,
        y: y - 5,
        width: width - 80,
        height: 25,
        color: black,
      });
      
      // Header text
      page.drawText(title, {
        x: 50,
        y: y + 5,
        size: 12,
        font: helveticaBoldFont,
        color: white,
      });
      
      return y - 35;
    };
    
    // Helper function to draw a data row
    const drawDataRow = (label: string, value: string, y: number, isEven: boolean = false) => {
      // Alternate row background
      if (isEven) {
        page.drawRectangle({
          x: 40,
          y: y - 15,
          width: width - 80,
          height: 18,
          color: lightGray,
        });
      }
      
      // Label
      page.drawText(label + ':', {
        x: 50,
        y: y,
        size: 9,
        font: helveticaBoldFont,
        color: darkGray,
      });
      
      // Value
      const endY = drawText(value, 200, y, { size: 9, maxWidth: width - 250 });
      return Math.min(y - 20, endY - 10);
    };
    
    // HEADER SECTION
    page.drawRectangle({
      x: 0,
      y: height - 80,
      width: width,
      height: 80,
      color: black,
    });
    
    page.drawText('IZOGRUP CRM', {
      x: 50,
      y: height - 35,
      size: 20,
      font: helveticaBoldFont,
      color: white,
    });
    
    page.drawText('COMPREHENSIVE WORKER REPORT', {
      x: 50,
      y: height - 55,
      size: 14,
      font: helveticaFont,
      color: white,
    });
    
    // Report metadata
    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: width - 200,
      y: height - 35,
      size: 8,
      font: helveticaFont,
      color: white,
    });
    
    page.drawText(`Period: ${worker.dateRange}`, {
      x: width - 200,
      y: height - 50,
      size: 8,
      font: helveticaFont,
      color: white,
    });
    
    yPosition = height - 100;
    
    // WORKER OVERVIEW BOX
    page.drawRectangle({
      x: 40,
      y: yPosition - 60,
      width: width - 80,
      height: 60,
      color: lightGray,
      borderColor: darkGray,
      borderWidth: 1,
    });
    
    page.drawText(worker.fullName, {
      x: 50,
      y: yPosition - 20,
      size: 16,
      font: helveticaBoldFont,
      color: black,
    });
    
    page.drawText(`${worker.role.toUpperCase()} | ${worker.status.toUpperCase()}`, {
      x: 50,
      y: yPosition - 40,
      size: 10,
      font: helveticaFont,
      color: darkGray,
    });
    
    page.drawText(`ID: ${worker.id}`, {
      x: 50,
      y: yPosition - 55,
      size: 8,
      font: helveticaFont,
      color: mediumGray,
    });
    
    yPosition -= 80;
    
    // PERSONAL INFORMATION SECTION
    checkPageSpace(200);
    yPosition = drawSectionHeader('PERSONAL INFORMATION', yPosition);
    
    const personalInfo = [
      ['Full Name', worker.fullName],
      ['Email Address', worker.email],
      ['Phone Number', worker.phone],
      ['Date of Birth', worker.dateOfBirth],
      ['ID Number', worker.idNumber],
      ['Address', worker.address],
      ['Username', worker.username],
      ['Account Status', worker.status],
      ['Account Locked', worker.isLocked ? 'Yes' : 'No'],
      ['Created Date', worker.createdAt],
      ['Last Updated', worker.updatedAt],
    ];
    
    personalInfo.forEach((item, index) => {
      checkPageSpace(25);
      yPosition = drawDataRow(item[0], item[1], yPosition, index % 2 === 0);
    });
    
    yPosition -= 20;
    
    // EMPLOYMENT DETAILS SECTION
    checkPageSpace(150);
    yPosition = drawSectionHeader('EMPLOYMENT DETAILS', yPosition);
    
    const employmentInfo = [
      ['Employee Type', worker.employeeType],
      ['Hourly Rate', worker.hourlyRate !== 'N/A' ? `€${worker.hourlyRate}` : 'Not set'],
      ['Monthly Rate', worker.monthlyRate !== 'N/A' ? `€${worker.monthlyRate}` : 'Not set'],
      ['Employment Status', worker.removeStatus],
    ];
    
    employmentInfo.forEach((item, index) => {
      checkPageSpace(25);
      yPosition = drawDataRow(item[0], item[1], yPosition, index % 2 === 0);
    });
    
    yPosition -= 20;
    
    // PERFORMANCE SUMMARY SECTION
    checkPageSpace(200);
    yPosition = drawSectionHeader('PERFORMANCE SUMMARY', yPosition);
    
    const summaryStats = [
      ['Total Assignments', worker.totalAssignments.toString()],
      ['Active Assignments', worker.activeAssignments.toString()],
      ['Completed Assignments', worker.completedAssignments.toString()],
      ['Total Time Worked', worker.totalTimeWorked],
      ['Total Attendance Records', worker.totalAttendanceRecords.toString()],
      ['Completed Sessions', worker.completedSessions.toString()],
      ['Active Sessions', worker.activeSessions.toString()],
      ['Total Activity Logs', worker.totalActivityLogs.toString()],
    ];
    
    summaryStats.forEach((item, index) => {
      checkPageSpace(25);
      yPosition = drawDataRow(item[0], item[1], yPosition, index % 2 === 0);
    });
    
    yPosition -= 20;
    
    // TEAM MEMBERSHIPS SECTION
    if (worker.teams && worker.teams.length > 0) {
      checkPageSpace(100);
      yPosition = drawSectionHeader('TEAM MEMBERSHIPS', yPosition);
      
      worker.teams.forEach((team: any, index: number) => {
        checkPageSpace(60);
        
        if (index % 2 === 0) {
          page.drawRectangle({
            x: 40,
            y: yPosition - 45,
            width: width - 80,
            height: 45,
            color: lightGray,
          });
        }
        
        page.drawText(team.name, {
          x: 50,
          y: yPosition - 10,
          size: 10,
          font: helveticaBoldFont,
          color: black,
        });
        
        drawText(team.description, 50, yPosition - 25, { size: 9, color: darkGray, maxWidth: width - 100 });
        
        page.drawText(`Status: ${team.status} | Created: ${team.createdAt}`, {
          x: 50,
          y: yPosition - 40,
          size: 8,
          font: helveticaFont,
          color: mediumGray,
        });
        
        yPosition -= 50;
      });
      
      yPosition -= 10;
    }
    
    // SITE ASSIGNMENTS SECTION
    if (worker.assignments && worker.assignments.length > 0) {
      checkPageSpace(100);
      yPosition = drawSectionHeader('SITE ASSIGNMENTS', yPosition);
      
      worker.assignments.forEach((assignment: any, index: number) => {
        checkPageSpace(80);
        
        if (index % 2 === 0) {
          page.drawRectangle({
            x: 40,
            y: yPosition - 65,
            width: width - 80,
            height: 65,
            color: lightGray,
          });
        }
        
        page.drawText(`${assignment.siteName} - ${assignment.siteCity}`, {
          x: 50,
          y: yPosition - 10,
          size: 10,
          font: helveticaBoldFont,
          color: black,
        });
        
        drawText(`Address: ${assignment.siteAddress}`, 50, yPosition - 25, { size: 9, color: darkGray });
        
        page.drawText(`Vehicle: ${assignment.carName} (${assignment.carNumber})`, {
          x: 50,
          y: yPosition - 40,
          size: 9,
          font: helveticaFont,
          color: darkGray,
        });
        
        page.drawText(`Date: ${assignment.assignedDate} | Status: ${assignment.assignmentStatus}`, {
          x: 50,
          y: yPosition - 55,
          size: 8,
          font: helveticaFont,
          color: mediumGray,
        });
        
        yPosition -= 70;
      });
      
      yPosition -= 10;
    }
    
    // ATTENDANCE RECORDS SECTION
    if (worker.attendanceRecords && worker.attendanceRecords.length > 0) {
      checkPageSpace(100);
      yPosition = drawSectionHeader('ATTENDANCE RECORDS', yPosition);
      
      worker.attendanceRecords.slice(0, 20).forEach((record: any, index: number) => {
        checkPageSpace(60);
        
        if (index % 2 === 0) {
          page.drawRectangle({
            x: 40,
            y: yPosition - 45,
            width: width - 80,
            height: 45,
            color: lightGray,
          });
        }
        
        page.drawText(`${record.date} - ${record.siteName}`, {
          x: 50,
          y: yPosition - 10,
          size: 10,
          font: helveticaBoldFont,
          color: black,
        });
        
        page.drawText(`Check In: ${record.checkInTime} | Check Out: ${record.checkOutTime}`, {
          x: 50,
          y: yPosition - 25,
          size: 9,
          font: helveticaFont,
          color: darkGray,
        });
        
        page.drawText(`Duration: ${record.timeSpent}`, {
          x: 50,
          y: yPosition - 40,
          size: 9,
          font: helveticaBoldFont,
          color: black,
        });
        
        yPosition -= 50;
      });
      
      if (worker.attendanceRecords.length > 20) {
        page.drawText(`... and ${worker.attendanceRecords.length - 20} more records`, {
          x: 50,
          y: yPosition - 10,
          size: 9,
          font: helveticaFont,
          color: mediumGray,
        });
        yPosition -= 20;
      }
      
      yPosition -= 10;
    }
    
    // ACTIVITY LOGS SECTION
    if (worker.activityLogs && worker.activityLogs.length > 0) {
      checkPageSpace(100);
      yPosition = drawSectionHeader('RECENT ACTIVITY LOGS', yPosition);
      
      worker.activityLogs.slice(0, 15).forEach((log: any, index: number) => {
        checkPageSpace(60);
        
        if (index % 2 === 0) {
          page.drawRectangle({
            x: 40,
            y: yPosition - 45,
            width: width - 80,
            height: 45,
            color: lightGray,
          });
        }
        
        page.drawText(`${log.timestamp} - ${log.action}`, {
          x: 50,
          y: yPosition - 10,
          size: 9,
          font: helveticaBoldFont,
          color: black,
        });
        
        drawText(log.details, 50, yPosition - 25, { size: 8, color: darkGray, maxWidth: width - 100 });
        
        page.drawText(`IP: ${log.ipAddress}`, {
          x: 50,
          y: yPosition - 40,
          size: 7,
          font: helveticaFont,
          color: mediumGray,
        });
        
        yPosition -= 50;
      });
      
      if (worker.activityLogs.length > 15) {
        page.drawText(`... and ${worker.activityLogs.length - 15} more activity logs`, {
          x: 50,
          y: yPosition - 10,
          size: 9,
          font: helveticaFont,
          color: mediumGray,
        });
        yPosition -= 20;
      }
    }
    
    // TIME ANALYSIS BY SITES SECTION
    if (worker.timePerSite && worker.timePerSite.length > 0) {
      checkPageSpace(100);
      yPosition = drawSectionHeader('TIME ANALYSIS BY SITES', yPosition);
      
      worker.timePerSite.forEach((site: any, index: number) => {
        checkPageSpace(45);
        
        if (index % 2 === 0) {
          page.drawRectangle({
            x: 40,
            y: yPosition - 35,
            width: width - 80,
            height: 35,
            color: lightGray,
          });
        }
        
        page.drawText(site.siteName, {
          x: 50,
          y: yPosition - 10,
          size: 10,
          font: helveticaBoldFont,
          color: black,
        });
        
        page.drawText(`Total Time: ${site.totalTime} | Sessions: ${site.sessions} | Avg/Session: ${site.averageSessionTime}`, {
          x: 50,
          y: yPosition - 25,
          size: 9,
          font: helveticaFont,
          color: darkGray,
        });
        
        yPosition -= 40;
      });
    }
    
    // FOOTER
    const footerY = 30;
    page.drawLine({
      start: { x: 40, y: footerY },
      end: { x: width - 40, y: footerY },
      thickness: 1,
      color: darkGray,
    });
    
    page.drawText('IzoGrup Construction Management System - Confidential Report', {
      x: 50,
      y: footerY - 15,
      size: 8,
      font: helveticaFont,
      color: mediumGray,
    });
    
    page.drawText(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, {
      x: width - 200,
      y: footerY - 15,
      size: 8,
      font: helveticaFont,
      color: mediumGray,
    });
    
    // Serialize the PDF document to bytes
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
    
  } catch (error: unknown) {
    console.error('PDF generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`PDF generation failed: ${errorMessage}`);
  }
}
function generateWorkerComprehensiveCSV(worker: any): string {
  let csv = 'IZOGRUP CRM - COMPREHENSIVE WORKER REPORT\n';
  csv += `Generated on: ${new Date().toLocaleString()}\n`;
  csv += `Worker: ${worker.fullName}\n`;
  csv += `Date Range: ${worker.dateRange}\n\n`;
  
  csv += '='.repeat(80) + '\n\n';
  
  // Personal Information
  csv += 'PERSONAL INFORMATION\n';
  csv += 'Field,Value\n';
  csv += `Full Name,"${worker.fullName}"\n`;
  csv += `Email Address,"${worker.email}"\n`;
  csv += `Phone Number,"${worker.phone}"\n`;
  csv += `Date of Birth,"${worker.dateOfBirth}"\n`;
  csv += `ID Number,"${worker.idNumber}"\n`;
  csv += `Address,"${worker.address}"\n`;
  csv += `Username,"${worker.username}"\n`;
  csv += `Role,"${worker.role}"\n`;
  csv += `Status,"${worker.status}"\n`;
  csv += `Account Locked,"${worker.isLocked ? 'Yes' : 'No'}"\n`;
  csv += `Created Date,"${worker.createdAt}"\n`;
  csv += `Last Updated,"${worker.updatedAt}"\n\n`;
  
  // Employment Details
  csv += 'EMPLOYMENT DETAILS\n';
  csv += 'Field,Value\n';
  csv += `Employee Type,"${worker.employeeType}"\n`;
  csv += `Hourly Rate,"${worker.hourlyRate !== 'N/A' ? '€' + worker.hourlyRate : 'Not set'}"\n`;
  csv += `Monthly Rate,"${worker.monthlyRate !== 'N/A' ? '€' + worker.monthlyRate : 'Not set'}"\n`;
  csv += `Employment Status,"${worker.removeStatus}"\n\n`;
  
  // Performance Summary
  csv += 'PERFORMANCE SUMMARY\n';
  csv += 'Metric,Value\n';
  csv += `Total Assignments,${worker.totalAssignments}\n`;
  csv += `Active Assignments,${worker.activeAssignments}\n`;
  csv += `Completed Assignments,${worker.completedAssignments}\n`;
  csv += `Total Time Worked,"${worker.totalTimeWorked}"\n`;
  csv += `Total Attendance Records,${worker.totalAttendanceRecords}\n`;
  csv += `Completed Sessions,${worker.completedSessions}\n`;
  csv += `Active Sessions,${worker.activeSessions}\n`;
  csv += `Total Activity Logs,${worker.totalActivityLogs}\n\n`;
  
  // Teams
  csv += 'TEAM MEMBERSHIPS\n';
  if (worker.teams && worker.teams.length > 0) {
    csv += 'Team Name,Description,Status,Created Date\n';
    worker.teams.forEach((team: any) => {
      csv += `"${team.name}","${team.description}","${team.status}","${team.createdAt}"\n`;
    });
  } else {
    csv += 'No team memberships found\n';
  }
  csv += '\n';
  
  // Site Assignments
  csv += 'SITE ASSIGNMENTS\n';
  if (worker.assignments && worker.assignments.length > 0) {
    csv += 'Site Name,Site Address,Site City,Client,Site Status,Car Name,Car Number,Assigned Date,Assignment Status,Notes\n';
    worker.assignments.forEach((assignment: any) => {
      csv += `"${assignment.siteName}","${assignment.siteAddress}","${assignment.siteCity}","${assignment.siteClient}","${assignment.siteStatus}","${assignment.carName}","${assignment.carNumber}","${assignment.assignedDate}","${assignment.assignmentStatus}","${assignment.notes}"\n`;
    });
  } else {
    csv += 'No site assignments found\n';
  }
  csv += '\n';
  
  // Attendance Records
  csv += 'ATTENDANCE RECORDS\n';
  if (worker.attendanceRecords && worker.attendanceRecords.length > 0) {
    csv += 'Date,Site Name,Site Address,Check In Time,Check Out Time,Time Spent,Assignment ID,Notes\n';
    worker.attendanceRecords.forEach((attendance: any) => {
      csv += `"${attendance.date}","${attendance.siteName}","${attendance.siteAddress}","${attendance.checkInTime}","${attendance.checkOutTime}","${attendance.timeSpent}","${attendance.assignmentId}","${attendance.notes}"\n`;
    });
  } else {
    csv += 'No attendance records found\n';
  }
  csv += '\n';
  
  // Activity Logs
  csv += 'ACTIVITY LOGS\n';
  if (worker.activityLogs && worker.activityLogs.length > 0) {
    csv += 'Timestamp,Action,Details,IP Address,User Agent\n';
    worker.activityLogs.forEach((log: any) => {
      csv += `"${log.timestamp}","${log.action}","${log.details}","${log.ipAddress}","${log.userAgent}"\n`;
    });
  } else {
    csv += 'No activity logs found\n';
  }
  csv += '\n';
  
  // Time Breakdown by Sites
  csv += 'TIME ANALYSIS BY SITES\n';
  if (worker.timePerSite && worker.timePerSite.length > 0) {
    csv += 'Site Name,Site Address,Total Time Worked,Sessions,Average Session Time\n';
    worker.timePerSite.forEach((site: any) => {
      csv += `"${site.siteName}","${site.siteAddress}","${site.totalTime}","${site.sessions}","${site.averageSessionTime}"\n`;
    });
  } else {
    csv += 'No time analysis data available\n';
  }
  csv += '\n';
  
  csv += '='.repeat(80) + '\n';
  csv += `Report generated by IzoGrup CRM on ${new Date().toLocaleString()}\n`;
  csv += 'This report contains confidential information\n';

  return csv;
}