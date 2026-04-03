import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/S3';
import { getAuthUser } from '@/lib/auth-middleware';

// GET all products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subcategoryId = searchParams.get('subcategoryId');
    const status = searchParams.get('status');
    const checkName = searchParams.get('checkName');

    // Handle name uniqueness check
    if (checkName) {
      const existingProduct = await prisma.product.findFirst({
        where: {
          title: {
            equals: checkName,
            mode: 'insensitive',
          },
        },
      });
      
      return NextResponse.json({ exists: !!existingProduct }, { status: 200 });
    }

    const where: any = {};
    
    if (subcategoryId) where.subcategoryId = subcategoryId;
    if (status) where.status = status;

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        subcategory: {
          include: {
            category: true,
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST create new product
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    
    // Extract fields
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const sku = formData.get('sku') as string;
    const upc = formData.get('upc') as string;
    const unit = formData.get('unit') as string;
    const currency = formData.get('currency') as string;
    const price = formData.get('price') as string;
    const stock = formData.get('stock') as string;
    const status = formData.get('status') as string;
    const subcategoryId = formData.get('subcategoryId') as string;
    const categoryId = formData.get('categoryId') as string;
    const publishOnWebsite = formData.get('publishOnWebsite') === 'true';
    const enableOnlineSales = formData.get('enableOnlineSales') === 'true';
    const metaTitle = formData.get('metaTitle') as string;
    const metaDescription = formData.get('metaDescription') as string;

    const videos = formData.getAll('videos') as string[];
    let documents: any = {};
    
    // Add currency and UPC to documents if provided
    if (currency) {
      documents.currency = currency;
    }
    if (upc) {
      documents.upc = upc;
    }

    if (!title) {
      return NextResponse.json(
        { error: 'Product title is required' },
        { status: 400 }
      );
    }

    // Check if product with same title already exists
    const existingProduct = await prisma.product.findFirst({
      where: {
        title: {
          equals: title,
          mode: 'insensitive', // Case-insensitive comparison
        },
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: 'A product with this name already exists' },
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
        
        const result = await uploadFile(base64, 'izo/products');
        uploadedImages.push(result.url);
      }
    }

    // Upload documents to S3
    const documentFiles = formData.getAll('documents') as File[];
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

    // Merge uploaded documents with existing document metadata
    const existingFiles = Array.isArray(documents.files) ? documents.files : [];
    const finalDocuments = {
      ...documents,
      files: uploadedDocuments.length > 0 ? uploadedDocuments : existingFiles,
    };

    const product = await prisma.product.create({
      data: {
        title,
        description: description || null,
        sku: sku || null,
        unit: unit || null,
        price: price ? parseFloat(price) : null,
        stock: stock ? parseInt(stock) : 0,
        status: status || 'active',
        categoryId: finalCategoryId,
        subcategoryId: finalSubcategoryId,
        images: uploadedImages,
        videos: videos.filter(v => v),
        documents: finalDocuments,
        publishOnWebsite,
        enableOnlineSales,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        createdBy: authUser.userId, // Track who created this product
      },
      include: {
        category: true,
        subcategory: {
          include: {
            category: true,
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(
      { message: 'Product created successfully', product },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating product:', error);
    
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      if (target?.includes('sku')) {
        return NextResponse.json(
          { error: 'SKU already exists' },
          { status: 400 }
        );
      } else if (target?.includes('upc')) {
        return NextResponse.json(
          { error: 'UPC already exists' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Duplicate value found' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
