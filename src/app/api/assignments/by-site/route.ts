import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');

    console.log('GET /api/assignments/by-site - Date param:', dateParam || 'NO DATE (showing all)');

    let whereClause: any = {
      status: 'active'
    };

    // Only add date filter if date parameter is provided
    if (dateParam) {
      const targetDate = new Date(dateParam);
      
      // Set to start of day (00:00:00)
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      // Set to end of day (23:59:59)
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      console.log('Date range:', { startOfDay, endOfDay });

      whereClause.assignedDate = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        site: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            status: true,
            progress: true,
            startDate: true,
            estimatedEndDate: true,
            actualEndDate: true
          }
        },
        worker: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            phone: true,
            role: true,
            isLocked: true
          }
        },
        car: {
          select: {
            id: true,
            name: true,
            number: true,
            color: true,
            model: true,
            status: true,
            isLocked: true, // Include lock status for accurate counts
          }
        }
      },
      orderBy: [
        { site: { name: 'asc' } },
        { assignedDate: 'desc' }
      ]
    });

    console.log(`Found ${assignments.length} assignments for by-site`);

    // Group assignments by site
    const groupedBySite = assignments.reduce((acc: any, assignment) => {
      const siteId = assignment.siteId;
      
      if (!acc[siteId]) {
        acc[siteId] = {
          id: assignment.site.id,
          name: assignment.site.name,
          address: assignment.site.address,
          city: assignment.site.city,
          siteStatus: assignment.site.status,
          progress: assignment.site.progress,
          startDate: assignment.site.startDate,
          estimatedEndDate: assignment.site.estimatedEndDate,
          actualEndDate: assignment.site.actualEndDate,
          assignedDate: assignment.assignedDate,
          isCompleted: assignment.site.status === 'completed',
          workers: []
        };
      }

      acc[siteId].workers.push({
        id: assignment.id,
        workerId: assignment.worker.id,
        workerName: assignment.worker.fullName,
        workerUsername: assignment.worker.username,
        workerEmail: assignment.worker.email,
        workerPhone: assignment.worker.phone,
        workerRole: assignment.worker.role,
        workerIsLocked: assignment.worker.isLocked,
        showAssignmentHistory: assignment.showAssignmentHistory ?? false,
        car: assignment.car ? {
          id: assignment.car.id,
          name: assignment.car.name,
          number: assignment.car.number,
          color: assignment.car.color,
          model: assignment.car.model,
          status: assignment.car.status,
          isLocked: assignment.car.isLocked
        } : null,
        assignedDate: assignment.assignedDate,
        status: assignment.status,
        notes: assignment.notes,
        createdAt: assignment.createdAt
      });

      return acc;
    }, {});

    // Convert to array format
    const result = Object.values(groupedBySite);

    console.log(`Grouped into ${result.length} sites`);

    return NextResponse.json({ 
      assignments: result,
      totalAssignments: assignments.length,
      dateFilter: dateParam || null,
      message: dateParam ? `Assignments for ${dateParam}` : 'All assignments'
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching assignments by site:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}