import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all sites with filtering and populated data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { client: { contains: search, mode: 'insensitive' } },
      ];
    }

    const sites = await prisma.site.findMany({
      where,
      include: {
        siteManager: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch worker assignments for each site from the Assignment table
    const sitesWithWorkers = await Promise.all(
      sites.map(async (site) => {
        // Count current active assignments for this site
        const assignmentCount = await prisma.assignment.count({
          where: {
            siteId: site.id,
            status: 'active', // Only count active assignments
          },
        });

        // Get unique workers assigned to this site (in case of multiple assignments per worker)
        const uniqueWorkers = await prisma.assignment.findMany({
          where: {
            siteId: site.id,
            status: 'active',
          },
          select: {
            workerId: true,
            worker: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                role: true,
              },
            },
          },
          distinct: ['workerId'], // Get unique workers only
        });

        return {
          ...site,
          workers: uniqueWorkers.map(assignment => assignment.worker),
          assignedWorkers: uniqueWorkers.length, // Count of unique workers
          totalAssignments: assignmentCount, // Total assignments (including multiple per worker)
        };
      })
    );

    return NextResponse.json({ sites: sitesWithWorkers }, { status: 200 });
  } catch (error) {
    console.error('Error fetching sites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sites' },
      { status: 500 }
    );
  }
}

// POST create new site
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      address,
      city,
      postalCode,
      clientId,
      client,
      startDate,
      estimatedEndDate,
      status,
      siteManagerId,
      description,
    } = body;

    if (!name || !address || !startDate) {
      return NextResponse.json(
        { error: 'Name, address, and start date are required' },
        { status: 400 }
      );
    }

    // Verify site manager exists and has site_manager role
    if (siteManagerId) {
      const manager = await prisma.users.findUnique({
        where: { id: siteManagerId },
      });
      if (!manager || manager.role !== 'site_manager') {
        return NextResponse.json(
          { error: 'Invalid site manager. User must have site_manager role' },
          { status: 400 }
        );
      }
    }

    const resolvedStatus = status || 'scheduled';

    const site = await prisma.site.create({
      data: {
        name,
        address,
        city: city || null,
        postalCode: postalCode || null,
        clientId: clientId || null,
        client: client || null,
        startDate: new Date(startDate),
        estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
        status: resolvedStatus,
        // If a site is created directly with completed status, ensure progress is 100%
        progress: resolvedStatus === 'completed' ? 100 : 0,
        progressUpdatedAt: resolvedStatus === 'completed' ? new Date() : null,
        siteManagerId: siteManagerId || null,
        description: description || null,
        workerIds: [],
      },
      include: {
        siteManager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      { message: 'Site created successfully', site: { ...site, workers: [], assignedWorkers: 0, totalAssignments: 0 } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating site:', error);
    return NextResponse.json(
      { error: 'Failed to create site' },
      { status: 500 }
    );
  }
}
