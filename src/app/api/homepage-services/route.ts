import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all homepage services
export async function GET(request: NextRequest) {
  try {
    const homepageServices = await prisma.homepageService.findMany({
      include: {
        service: {
          include: {
            subcategory: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });

    return NextResponse.json({ homepageServices }, { status: 200 });
  } catch (error) {
    console.error('Error fetching homepage services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage services' },
      { status: 500 }
    );
  }
}

// POST add service to homepage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceId, displayOrder } = body;

    if (!serviceId) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      );
    }

    // Check if service exists
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Check if already added to homepage
    const existing = await prisma.homepageService.findUnique({
      where: { serviceId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Service already added to homepage' },
        { status: 400 }
      );
    }

    const homepageService = await prisma.homepageService.create({
      data: {
        serviceId,
        displayOrder: displayOrder || 0,
        isActive: true,
      },
      include: {
        service: {
          include: {
            subcategory: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      { message: 'Service added to homepage', homepageService },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error adding service to homepage:', error);
    
    return NextResponse.json(
      { error: 'Failed to add service to homepage' },
      { status: 500 }
    );
  }
}
