import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/S3';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// GET all projects
export async function GET(request: NextRequest) {
  try {
    const projects = await prisma.project.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ projects }, { status: 200 });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST create new project
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract fields
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const client = formData.get('client') as string;
    const location = formData.get('location') as string;
    const completionDate = formData.get('completionDate') as string;
    const duration = formData.get('duration') as string;
    const publishOnWebsite = formData.get('publishOnWebsite') === 'true';
    const featured = formData.get('featured') === 'true';

    const videos = formData.getAll('videos') as string[];
    const documentsStr = formData.get('documents') as string;
    const documents = documentsStr ? JSON.parse(documentsStr) : null;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Upload images to Cloudinary
    const imageFiles = formData.getAll('images') as File[];
    const uploadedImages: string[] = [];

    for (const file of imageFiles) {
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;
        
        const result = await uploadFile(base64, 'izo/projects');
        uploadedImages.push(result.url);
      }
    }

    const project = await prisma.project.create({
      data: {
        title,
        description: description || null,
        client: client || null,
        location: location || null,
        completionDate: completionDate ? new Date(completionDate) : null,
        duration: duration || null,
        images: uploadedImages,
        videos: videos.filter(v => v),
        documents,
        publishOnWebsite,
        featured,
      },
    });

    return NextResponse.json(
      { message: 'Project created successfully', project },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
