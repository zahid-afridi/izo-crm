import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/S3';

// GET all services
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subcategoryId = searchParams.get('subcategoryId');
    const status = searchParams.get('status');
    const publishOnWebsite = searchParams.get('publishOnWebsite');
    const checkName = searchParams.get('checkName');

    // Handle name uniqueness check
    if (checkName) {
      const existingService = await prisma.service.findFirst({
        where: {
          title: {
            equals: checkName,
            mode: 'insensitive',
          },
        },
      });
      
      return NextResponse.json({ exists: !!existingService }, { status: 200 });
    }

    const where: any = {};
    
    if (subcategoryId) where.subcategoryId = subcategoryId;
    if (status) where.status = status;
    if (publishOnWebsite === 'true') where.publishOnWebsite = true;

    const services = await prisma.service.findMany({
      where,
      include: {
        category: true,
        subcategory: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ services }, { status: 200 });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

// POST create new service
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract fields
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const price = formData.get('price') as string;
    const status = formData.get('status') as string;
    const subcategoryId = formData.get('subcategoryId') as string;
    const categoryId = formData.get('categoryId') as string;
    const publishOnWebsite = formData.get('publishOnWebsite') === 'true';
    const enableOnlineSales = formData.get('enableOnlineSales') === 'true';
    const metaTitle = formData.get('metaTitle') as string;
    const metaDescription = formData.get('metaDescription') as string;

    const videos = formData.getAll('videos') as string[];
    const documentFiles = formData.getAll('documents') as File[];
    let documents: any = {};

    if (!title) {
      return NextResponse.json(
        { error: 'Service title is required' },
        { status: 400 }
      );
    }

    // Check if service with same title already exists
    const existingService = await prisma.service.findFirst({
      where: {
        title: {
          equals: title,
          mode: 'insensitive', // Case-insensitive comparison
        },
      },
    });

    if (existingService) {
      return NextResponse.json(
        { error: 'A service with this name already exists' },
        { status: 400 }
      );
    }

    // Handle category/subcategory logic - only use subcategory when explicitly selected
    let finalSubcategoryId: string | null = null;
    let finalCategoryId: string | null = null;
    if (subcategoryId && subcategoryId !== 'none' && subcategoryId.trim()) {
      finalSubcategoryId = subcategoryId;
    } else if (categoryId && categoryId.trim()) {
      // Main category selected but no subcategory - store category directly
      finalCategoryId = categoryId;
    }

    // Upload images to S3
    const imageFiles = formData.getAll('images') as File[];
    const uploadedImages: string[] = [];

    for (const file of imageFiles) {
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;
        
        const result = await uploadFile(base64, 'izo/services');
        uploadedImages.push(result.url);
      }
    }

    // Upload documents to S3
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

    // Set documents with uploaded files
    if (uploadedDocuments.length > 0) {
      documents.files = uploadedDocuments;
    }

    const service = await prisma.service.create({
      data: {
        title,
        description: description || null,
        price: price ? parseFloat(price) : null,
        status: status || 'active',
        categoryId: finalCategoryId,
        subcategoryId: finalSubcategoryId,
        images: uploadedImages,
        videos: videos.filter(v => v),
        documents,
        publishOnWebsite,
        enableOnlineSales,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
      },
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
      { message: 'Service created successfully', service },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating service:', error);
    
    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    );
  }
}
