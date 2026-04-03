import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadFile, deleteMultipleFiles } from '@/lib/S3';

// Helper function to extract S3 key from URL
function extractS3Key(url: string): string | null {
  try {
    // S3 URL format: https://izogrup-ontop.fra1.digitaloceanspaces.com/izogrup-ontop/izo/services/filename
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    // Remove leading slash and bucket name prefix
    let key = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    
    // Remove bucket name prefix if present (izogrup-ontop/)
    if (key.startsWith('izogrup-ontop/')) {
      key = key.slice('izogrup-ontop/'.length);
    }
    
    console.log('Extracted S3 key from URL:', { url, key });
    return key;
  } catch (error) {
    console.error('Error extracting S3 key from URL:', url, error);
    return null;
  }
}

// GET single service
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
        subcategory: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ service }, { status: 200 });
  } catch (error) {
    console.error('Error fetching service:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service' },
      { status: 500 }
    );
  }
}

// PUT update service
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    
    const existingService = await prisma.service.findUnique({
      where: { id },
    });

    if (!existingService) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    
    // Extract fields
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const price = formData.get('price') as string;
    const status = formData.get('status') as string;
    const subcategoryId = formData.get('subcategoryId') as string;
    const categoryId = formData.get('categoryId') as string;
    const publishOnWebsite = formData.get('publishOnWebsite');
    const enableOnlineSales = formData.get('enableOnlineSales');
    const metaTitle = formData.get('metaTitle') as string;
    const metaDescription = formData.get('metaDescription') as string;

    if (title) updateData.title = title;
    
    // Check if service with same title already exists (excluding current service)
    if (title) {
      const existingService = await prisma.service.findFirst({
        where: {
          title: {
            equals: title,
            mode: 'insensitive', // Case-insensitive comparison
          },
          NOT: {
            id: id, // Exclude current service from check
          },
        },
      });

      if (existingService) {
        return NextResponse.json(
          { error: 'A service with this name already exists' },
          { status: 400 }
        );
      }
    }
    if (description !== null) updateData.description = description || null;
    if (price !== null) updateData.price = price ? parseFloat(price) : null;
    
    // Handle category/subcategory logic - only use subcategory when explicitly selected
    if (subcategoryId !== null || categoryId !== null) {
      let finalSubcategoryId: string | null = null;
      let finalCategoryId: string | null = null;
      if (subcategoryId && subcategoryId !== 'none' && subcategoryId.trim()) {
        finalSubcategoryId = subcategoryId;
      } else if (categoryId && categoryId.trim()) {
        // Main category selected but no subcategory - store category directly
        finalCategoryId = categoryId;
      }
      updateData.subcategoryId = finalSubcategoryId;
      updateData.categoryId = finalCategoryId;
    }
    
    if (publishOnWebsite !== null) updateData.publishOnWebsite = publishOnWebsite === 'true';
    if (enableOnlineSales !== null) updateData.enableOnlineSales = enableOnlineSales === 'true';
    if (metaTitle !== null) updateData.metaTitle = metaTitle || null;
    if (metaDescription !== null) updateData.metaDescription = metaDescription || null;
    if (status !== null) updateData.status = status;

    // Handle images
    const imageFiles = formData.getAll('images') as File[];
    const existingImagesStr = formData.get('existingImages') as string;
    const existingImages = existingImagesStr ? JSON.parse(existingImagesStr) : existingService.images;

    const newUploadedImages: string[] = [];
    for (const file of imageFiles) {
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;
        
        const result = await uploadFile(base64, 'izo/services');
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
    const documentFiles = formData.getAll('documents') as File[];
    const existingDocumentsStr = formData.get('existingDocuments') as string;
    let documents: any = existingDocumentsStr ? JSON.parse(existingDocumentsStr) : (existingService.documents || {});
    
    // Upload new document files to S3
    const uploadedDocuments: any[] = [];
    for (const file of documentFiles) {
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;
        
        const result = await uploadFile(base64, 'izo/documents');
        uploadedDocuments.push({
          title: file.name,
          url: result.url,
        });
      }
    }

    // Merge uploaded documents with existing ones
    if (uploadedDocuments.length > 0) {
      const existingFiles = Array.isArray(documents.files) ? documents.files : [];
      documents.files = [...existingFiles, ...uploadedDocuments];
    }
    
    updateData.documents = documents;

    const service = await prisma.service.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        subcategory: {
          include: {
            category: true,
          },
        },
      },
    });

    return NextResponse.json(
      { message: 'Service updated successfully', service },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating service:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update service' },
      { status: 500 }
    );
  }
}

// DELETE service
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get the service with all files to delete from S3
    const service = await prisma.service.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        images: true,
        documents: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Delete files from S3
    const filesToDelete: string[] = [];

    console.log('Service data for deletion:', {
      id: service.id,
      title: service.title,
      imagesCount: service.images?.length || 0,
      documentsType: typeof service.documents,
      documents: service.documents,
    });

    // Add image URLs to delete list
    if (service.images && Array.isArray(service.images)) {
      console.log('Processing images:', service.images);
      service.images.forEach((imageUrl: string) => {
        // Extract the key from the S3 URL
        const key = extractS3Key(imageUrl);
        console.log('Extracted image key:', key);
        if (key) filesToDelete.push(key);
      });
    }

    // Add document URLs to delete list
    if (service.documents && typeof service.documents === 'object') {
      const docs = service.documents as any;
      console.log('Processing documents:', docs);
      if (docs.files && Array.isArray(docs.files)) {
        console.log('Document files found:', docs.files);
        docs.files.forEach((doc: any) => {
          if (doc.url) {
            const key = extractS3Key(doc.url);
            console.log('Extracted document key:', key);
            if (key) filesToDelete.push(key);
          }
        });
      }
    }

    console.log('Files to delete from S3:', filesToDelete);

    // Delete files from S3
    if (filesToDelete.length > 0) {
      try {
        console.log('Starting S3 deletion for', filesToDelete.length, 'files');
        await deleteMultipleFiles(filesToDelete);
        console.log('Successfully deleted files from S3');
      } catch (s3Error) {
        console.error('Error deleting files from S3:', s3Error);
        // Continue with service deletion even if S3 deletion fails
      }
    } else {
      console.log('No files to delete from S3');
    }

    // Delete the service from database
    await prisma.service.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Service deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting service:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: 500 }
    );
  }
}
