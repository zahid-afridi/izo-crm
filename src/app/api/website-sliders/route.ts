import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/S3';

// GET all sliders
export async function GET(request: NextRequest) {
  try {
    const sliders = await prisma.websiteSlider.findMany({
      orderBy: {
        displayOrder: 'asc',
      },
    });

    return NextResponse.json({ sliders }, { status: 200 });
  } catch (error) {
    console.error('Error fetching sliders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sliders' },
      { status: 500 }
    );
  }
}

// POST create new slider
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract fields
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const buttonText = formData.get('buttonText') as string;
    const buttonLink = formData.get('buttonLink') as string;
    const isActive = formData.get('isActive') === 'true';
    const displayOrder = formData.get('displayOrder') as string;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Upload image to Cloudinary
    const imageFile = formData.get('image') as File;
    
    if (!imageFile || imageFile.size === 0) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${imageFile.type};base64,${buffer.toString('base64')}`;
    
    const uploadResult = await uploadFile(base64, 'izo/sliders');

    const slider = await prisma.websiteSlider.create({
      data: {
        title,
        description: description || null,
        imageUrl: uploadResult.url,
        buttonText: buttonText || null,
        buttonLink: buttonLink || null,
        isActive,
        displayOrder: displayOrder ? parseInt(displayOrder) : 0,
      },
    });

    return NextResponse.json(
      { message: 'Slider created successfully', slider },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating slider:', error);
    
    return NextResponse.json(
      { error: 'Failed to create slider' },
      { status: 500 }
    );
  }
}
