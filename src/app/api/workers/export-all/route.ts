import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    // Fetch all workers with their details
    const workers = await prisma.users.findMany({
      where: {
        role: 'worker',
      },
      include: {
        worker: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    });

    // Get recent assignments for each worker (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const assignments = await prisma.assignment.findMany({
      where: {
        assignedDate: { gte: thirtyDaysAgo },
        workerId: { in: workers.map(w => w.id) },
      },
      include: {
        site: true,
        car: true,
      },
    });

    // Get attendance records for the last 30 days
    const attendanceRecords = await prisma.siteAttendance.findMany({
      where: {
        date: { gte: thirtyDaysAgo },
        workerId: { in: workers.map(w => w.id) },
      },
    });

    // Get teams for all workers
    const teams = await prisma.team.findMany({
      where: {
        memberIds: { hasSome: workers.map(w => w.id) },
      },
    });

    // Process data for each worker with comprehensive information
    const workersData = await Promise.all(workers.map(async (worker) => {
      const workerAssignments = assignments.filter(a => a.workerId === worker.id);
      const workerAttendance = attendanceRecords.filter(a => a.workerId === worker.id);
      
      // Get teams for this worker
      const workerTeams = teams.filter(t => t.memberIds.includes(worker.id));

      // Calculate total time worked
      let totalMinutes = 0;
      workerAttendance.forEach(record => {
        if (record.checkInTime && record.checkOutTime) {
          const checkIn = new Date(record.checkInTime);
          const checkOut = new Date(record.checkOutTime);
          const minutes = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60));
          totalMinutes += minutes;
        }
      });

      const totalHours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;

      return {
        // Basic Info
        id: worker.id,
        fullName: worker.fullName,
        email: worker.email,
        phone: worker.phone || 'N/A',
        dateOfBirth: worker.dateOfBirth ? new Date(worker.dateOfBirth).toLocaleDateString() : 'N/A',
        idNumber: worker.idNumber || 'N/A',
        address: worker.address || 'N/A',
        role: worker.role,
        status: worker.status,
        isLocked: worker.isLocked,
        createdAt: new Date(worker.createdAt).toLocaleDateString(),
        
        // Worker Details
        employeeType: worker.worker?.employeeType || 'N/A',
        hourlyRate: worker.worker?.hourlyRate || 'N/A',
        monthlyRate: worker.worker?.monthlyRate || 'N/A',
        removeStatus: worker.worker?.removeStatus || 'N/A',
        
        // Statistics (Last 30 days)
        totalAssignments: workerAssignments.length,
        activeAssignments: workerAssignments.filter(a => a.status === 'active').length,
        completedAssignments: workerAssignments.filter(a => a.status === 'completed').length,
        totalTimeWorked: totalMinutes > 0 ? `${totalHours}h ${remainingMinutes}m` : 'No time logged',
        attendanceRecords: workerAttendance.length,
        completedSessions: workerAttendance.filter(a => a.checkOutTime).length,
        activeSessions: workerAttendance.filter(a => !a.checkOutTime).length,
        
        // Teams
        teams: workerTeams.map(t => t.name).join(', ') || 'No teams',
        teamsDetailed: workerTeams.map(t => ({
          name: t.name,
          description: t.description || 'N/A',
          status: t.status
        })),
        
        // Recent Sites
        recentSites: [...new Set(workerAssignments.map(a => a.site?.name).filter(Boolean))].join(', ') || 'No recent sites',
        sitesDetailed: workerAssignments.map(a => ({
          siteName: a.site?.name || 'N/A',
          siteAddress: a.site?.address || 'N/A',
          siteCity: a.site?.city || 'N/A',
          siteClient: a.site?.client || 'N/A',
          assignedDate: new Date(a.assignedDate).toLocaleDateString(),
          assignmentStatus: a.status
        })),
        
        // Attendance Details
        attendanceDetails: workerAttendance.map(att => ({
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
          notes: att.notes || 'No notes'
        }))
      };
    }));

    if (format === 'json') {
      return NextResponse.json({ workers: workersData });
    }

    // Generate CSV
    const csv = generateWorkersCSV(workersData);
    
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=all-workers-export.csv',
      },
    });

  } catch (error: any) {
    console.error('Error exporting all workers:', error);
    return NextResponse.json(
      { error: 'Failed to export workers data' },
      { status: 500 }
    );
  }
}

function generateWorkersCSV(workers: any[]): string {
  let csv = 'IZOGRUP CRM - ALL WORKERS COMPREHENSIVE EXPORT\n';
  csv += `Generated on: ${new Date().toLocaleString()}\n`;
  csv += `Total Workers: ${workers.length}\n\n`;

  workers.forEach((worker, index) => {
    csv += `WORKER ${index + 1}: ${worker.fullName}\n`;
    csv += '='.repeat(60) + '\n\n';
    
    // Personal Information
    csv += 'PERSONAL INFORMATION\n';
    csv += `Full Name,${worker.fullName}\n`;
    csv += `Email,${worker.email}\n`;
    csv += `Phone,${worker.phone}\n`;
    csv += `Date of Birth,${worker.dateOfBirth}\n`;
    csv += `ID Number,${worker.idNumber}\n`;
    csv += `Address,${worker.address}\n`;
    csv += `Role,${worker.role}\n`;
    csv += `Status,${worker.status}\n`;
    csv += `Is Locked,${worker.isLocked ? 'Yes' : 'No'}\n`;
    csv += `Created At,${worker.createdAt}\n\n`;
    
    // Employment Details
    csv += 'EMPLOYMENT DETAILS\n';
    csv += `Employee Type,${worker.employeeType}\n`;
    csv += `Hourly Rate,${worker.hourlyRate}\n`;
    csv += `Monthly Rate,${worker.monthlyRate}\n`;
    csv += `Remove Status,${worker.removeStatus}\n\n`;
    
    // Teams
    csv += 'TEAMS\n';
    if (worker.teamsDetailed && worker.teamsDetailed.length > 0) {
      csv += 'Team Name,Description,Status\n';
      worker.teamsDetailed.forEach((team: any) => {
        csv += `"${team.name}","${team.description}","${team.status}"\n`;
      });
    } else {
      csv += 'No teams assigned\n';
    }
    csv += '\n';
    
    // Site Assignments (Last 30 days)
    csv += 'SITE ASSIGNMENTS (Last 30 days)\n';
    if (worker.sitesDetailed && worker.sitesDetailed.length > 0) {
      csv += 'Site Name,Site Address,Site City,Client,Assigned Date,Assignment Status\n';
      worker.sitesDetailed.forEach((site: any) => {
        csv += `"${site.siteName}","${site.siteAddress}","${site.siteCity}","${site.siteClient}","${site.assignedDate}","${site.assignmentStatus}"\n`;
      });
    } else {
      csv += 'No assignments found in last 30 days\n';
    }
    csv += '\n';
    
    // Attendance Records (Last 30 days)
    csv += 'ATTENDANCE RECORDS (Last 30 days)\n';
    if (worker.attendanceDetails && worker.attendanceDetails.length > 0) {
      csv += 'Date,Check In Time,Check Out Time,Time Spent,Notes\n';
      worker.attendanceDetails.forEach((attendance: any) => {
        csv += `"${attendance.date}","${attendance.checkInTime}","${attendance.checkOutTime}","${attendance.timeSpent}","${attendance.notes}"\n`;
      });
    } else {
      csv += 'No attendance records found in last 30 days\n';
    }
    csv += '\n';
    
    // Summary Statistics
    csv += 'SUMMARY STATISTICS (Last 30 days)\n';
    csv += `Total Assignments,${worker.totalAssignments}\n`;
    csv += `Active Assignments,${worker.activeAssignments}\n`;
    csv += `Completed Assignments,${worker.completedAssignments}\n`;
    csv += `Total Time Worked,${worker.totalTimeWorked}\n`;
    csv += `Total Attendance Records,${worker.attendanceRecords}\n`;
    csv += `Completed Sessions,${worker.completedSessions}\n`;
    csv += `Active Sessions,${worker.activeSessions}\n\n`;
    
    if (index < workers.length - 1) {
      csv += '\n' + '='.repeat(80) + '\n\n';
    }
  });

  return csv;
}