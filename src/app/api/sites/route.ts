import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all sites with filtering and populated data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};
    const allowedStatuses = ['active', 'pending', 'closed'];
    const normalizeSiteStatus = (s: unknown) => {
      const v = String(s ?? '').toLowerCase();
      if (v === 'scheduled') return 'pending';
      if (v === 'completed') return 'closed';
      if (v === 'on-hold' || v === 'on_hold') return 'pending';
      return v;
    };

    if (status && status !== 'all') {
      const resolvedStatus = normalizeSiteStatus(status);
      if (allowedStatuses.includes(resolvedStatus)) {
        where.status = resolvedStatus;
      }
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

    // Assignment module removed: use site.workerIds as assignment source.
    const sitesWithWorkers = await Promise.all(
      sites.map(async (site) => {
        const workers = site.workerIds.length
          ? await prisma.users.findMany({
              where: { id: { in: site.workerIds } },
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                role: true,
              },
            })
          : [];

        return {
          ...site,
          status: normalizeSiteStatus(site.status),
          workers,
          assignedWorkers: workers.length,
          totalAssignments: 0,
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

    const allowedStatuses = ['active', 'pending', 'closed'];
    const resolvedStatus = String(status || 'pending').toLowerCase();
    if (!allowedStatuses.includes(resolvedStatus)) {
      return NextResponse.json({ error: 'Invalid status. Must be active, pending, or closed' }, { status: 400 });
    }

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
        status: resolvedStatus as any,
        // Keep progress in sync with status
        progress: resolvedStatus === 'closed' ? 100 : 0,
        progressUpdatedAt: resolvedStatus === 'closed' ? new Date() : null,
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
