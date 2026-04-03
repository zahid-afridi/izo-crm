import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/S3';

// GET single slider
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const slider = await prisma.websiteSlider.findUnique({
      where: { id },
    });

    if (!slider) {
      return NextResponse.json(
        { error: 'Slider not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ slider }, { status: 200 });
  } catch (error) {
    console.error('Error fetching slider:', error);
    return NextResponse.json(
      { error: 'Failed to fetch slider' },
      { status: 500 }
    );
  }
}

// PUT update slider
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Check if slider exists
    const existingSlider = await prisma.websiteSlider.findUnique({
      where: { id },
    });

    if (!existingSlider) {
      return NextResponse.json(
        { error: 'Slider not found' },
        { status: 404 }
      );
    }

    let imageUrl = existingSlider.imageUrl;

    // Upload new image if provided
    const imageFile = formData.get('image') as File;
    
    if (imageFile && imageFile.size > 0) {
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = `data:${imageFile.type};base64,${buffer.toString('base64')}`;
      
      const uploadResult = await uploadFile(base64, 'izo/sliders');
      imageUrl = uploadResult.url;
    }

    const slider = await prisma.websiteSlider.update({
      where: { id },
      data: {
        title,
        description: description || null,
        imageUrl,
        buttonText: buttonText || null,
        buttonLink: buttonLink || null,
        isActive,
        displayOrder: displayOrder ? parseInt(displayOrder) : 0,
      },
    });

    return NextResponse.json(
      { message: 'Slider updated successfully', slider },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating slider:', error);
    
    return NextResponse.json(
      { error: 'Failed to update slider' },
      { status: 500 }
    );
  }
}

// DELETE slider
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.websiteSlider.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Slider deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting slider:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Slider not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete slider' },
      { status: 500 }
    );
  }
}
