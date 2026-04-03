import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadFile, deleteFile } from '@/lib/S3';

// Helper function to extract S3 key from URL
function extractS3Key(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    let key = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    
    if (key.startsWith('izogrup-ontop/')) {
      key = key.slice('izogrup-ontop/'.length);
    }
    
    return key;
  } catch (error) {
    console.error('Error extracting S3 key from URL:', url, error);
    return null;
  }
}

// GET single project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ project }, { status: 200 });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// PUT update project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    
    // Extract fields
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const client = formData.get('client') as string;
    const location = formData.get('location') as string;
    const completionDate = formData.get('completionDate') as string;
    const duration = formData.get('duration') as string;
    const publishOnWebsite = formData.get('publishOnWebsite');
    const featured = formData.get('featured');

    if (title) updateData.title = title;
    if (description !== null) updateData.description = description || null;
    if (client !== null) updateData.client = client || null;
    if (location !== null) updateData.location = location || null;
    if (completionDate !== null) updateData.completionDate = completionDate ? new Date(completionDate) : null;
    if (duration !== null) updateData.duration = duration || null;
    if (publishOnWebsite !== null) updateData.publishOnWebsite = publishOnWebsite === 'true';
    if (featured !== null) updateData.featured = featured === 'true';

    // Handle images
    const imageFiles = formData.getAll('images') as File[];
    const existingImagesStr = formData.get('existingImages') as string;
    const existingImages = existingImagesStr ? JSON.parse(existingImagesStr) : existingProject.images;

    const newUploadedImages: string[] = [];
    for (const file of imageFiles) {
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;
        
        const result = await uploadFile(base64, 'izo/projects');
        newUploadedImages.push(result.url);
      }
    }

    if (imageFiles.length > 0 || existingImagesStr) {
      updateData.images = [...existingImages, ...newUploadedImages];
    }

    // Handle videos
    const videos = formData.getAll('videos') as string[];
    if (videos.length > 0) {
      updateData.videos = videos.filter(v => v);
    }

    // Handle documents
    const documentsStr = formData.get('documents') as string;
    if (documentsStr !== null) {
      updateData.documents = documentsStr ? JSON.parse(documentsStr) : null;
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(
      { message: 'Project updated successfully', project },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating project:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get the project with all images to delete from S3
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        images: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Delete files from S3
    const filesToDelete: string[] = [];

    // Add images to delete list
    if (project.images && Array.isArray(project.images)) {
      project.images.forEach((imageUrl: string) => {
        const key = extractS3Key(imageUrl);
        if (key) filesToDelete.push(key);
      });
    }

    // Delete files from S3
    if (filesToDelete.length > 0) {
      try {
        console.log('🗑️ Deleting project images from S3:', filesToDelete);
        for (const key of filesToDelete) {
          await deleteFile(key);
        }
        console.log('✅ Project images deleted from S3');
      } catch (s3Error) {
        console.error('⚠️ Error deleting project images from S3:', s3Error);
        // Continue with project deletion even if S3 deletion fails
      }
    }

    // Delete from database
    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Project deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting project:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
