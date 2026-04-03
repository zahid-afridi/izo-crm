import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get('workerId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Build date filter
    let dateFilter: any = {};
    
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      dateFilter = {
        gte: startDate,
        lte: endDate,
      };
    } else if (dateFrom && dateTo) {
      dateFilter = {
        gte: new Date(dateFrom),
        lte: new Date(dateTo),
      };
    }

    // Build worker filter
    const workerFilter = workerId ? { workerId } : {};

    // Get assignments with attendance data
    const assignments = await prisma.assignment.findMany({
      where: {
        ...workerFilter,
        ...(Object.keys(dateFilter).length > 0 && {
          assignedDate: dateFilter
        }),
      },
      include: {
        worker: {
          include: {
            worker: true,
          },
        },
        site: true,
        car: true,
      },
    });

    // Get attendance records
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        ...workerFilter,
        ...(Object.keys(dateFilter).length > 0 && {
          date: dateFilter
        }),
      },
    });

    // Group data by worker
    const workerReportsMap = new Map();

    assignments.forEach(assignment => {
      const workerId = assignment.workerId;
      const workerName = assignment.worker.fullName;
      
      if (!workerReportsMap.has(workerId)) {
        workerReportsMap.set(workerId, {
          workerId,
          workerName,
          totalWorkDays: 0,
          dailySalary: assignment.worker.worker?.hourlyRate ? assignment.worker.worker.hourlyRate * 8 : 0,
          totalAmount: 0,
          paidAmount: 0, // This would come from a payments table if implemented
          dueAmount: 0,
          workDates: new Set(),
          sites: new Set(),
        });
      }

      const report = workerReportsMap.get(workerId);
      report.workDates.add(assignment.assignedDate.toISOString().split('T')[0]);
      report.sites.add(assignment.site.name);
    });

    // Add attendance data
    attendanceRecords.forEach(attendance => {
      const workerId = attendance.workerId;
      if (workerReportsMap.has(workerId)) {
        const report = workerReportsMap.get(workerId);
        report.workDates.add(attendance.date.toISOString().split('T')[0]);
      }
    });

    // Convert to final format
    const reports = Array.from(workerReportsMap.values()).map(report => ({
      ...report,
      totalWorkDays: report.workDates.size,
      totalAmount: report.workDates.size * report.dailySalary,
      dueAmount: (report.workDates.size * report.dailySalary) - report.paidAmount,
      workDates: Array.from(report.workDates),
      sites: Array.from(report.sites),
    }));

    return NextResponse.json({
      success: true,
      reports,
    });

  } catch (error: any) {
    console.error('Worker attendance report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate worker attendance report', details: error.message },
      { status: 500 }
    );
  }
}