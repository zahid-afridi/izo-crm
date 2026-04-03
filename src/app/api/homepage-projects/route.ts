import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all homepage projects
export async function GET(request: NextRequest) {
  try {
    const homepageProjects = await prisma.homepageProject.findMany({
      include: {
        project: true,
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });

    return NextResponse.json({ homepageProjects }, { status: 200 });
  } catch (error) {
    console.error('Error fetching homepage projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage projects' },
      { status: 500 }
    );
  }
}

// POST add project to homepage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, displayOrder } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if already added to homepage
    const existing = await prisma.homepageProject.findUnique({
      where: { projectId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Project already added to homepage' },
        { status: 400 }
      );
    }

    const homepageProject = await prisma.homepageProject.create({
      data: {
        projectId,
        displayOrder: displayOrder || 0,
        isActive: true,
      },
      include: {
        project: true,
      },
    });

    return NextResponse.json(
      { message: 'Project added to homepage', homepageProject },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error adding project to homepage:', error);
    
    return NextResponse.json(
      { error: 'Failed to add project to homepage' },
      { status: 500 }
    );
  }
}
