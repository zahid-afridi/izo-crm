import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadFile, deleteMultipleFiles } from '@/lib/S3';
import { getAuthUser } from '@/lib/auth-middleware';

// Helper function to extract S3 key from URL
function extractS3Key(url: string): string | null {
  try {
    // S3 URL format: https://izogrup-ontop.fra1.digitaloceanspaces.com/izogrup-ontop/izo/products/filename
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

// GET single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
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

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// PUT update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    
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
    const publishOnWebsite = formData.get('publishOnWebsite');
    const enableOnlineSales = formData.get('enableOnlineSales');
    const metaTitle = formData.get('metaTitle') as string;
    const metaDescription = formData.get('metaDescription') as string;

    if (title) updateData.title = title;
    
    // Check if product with same title already exists (excluding current product)
    if (title) {
      const existingProduct = await prisma.product.findFirst({
        where: {
          title: {
            equals: title,
            mode: 'insensitive', // Case-insensitive comparison
          },
          NOT: {
            id: id, // Exclude current product from check
          },
        },
      });

      if (existingProduct) {
        return NextResponse.json(
          { error: 'A product with this name already exists' },
          { status: 400 }
        );
      }
    }
    if (description !== null) updateData.description = description || null;
    if (sku !== null) updateData.sku = sku || null;
    if (unit !== null) updateData.unit = unit || null;
    if (price !== null) updateData.price = price ? parseFloat(price) : null;
    if (stock !== null) updateData.stock = stock ? parseInt(stock) : 0;
    if (status) updateData.status = status;
    
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

    // Handle images
    const imageFiles = formData.getAll('images') as File[];
    const existingImagesStr = formData.get('existingImages') as string;
    const existingImages = existingImagesStr ? JSON.parse(existingImagesStr) : existingProduct.images;

    const newUploadedImages: string[] = [];
    for (const file of imageFiles) {
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;
        
        const result = await uploadFile(base64, 'izo/products');
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
    let documents: any = existingDocumentsStr ? JSON.parse(existingDocumentsStr) : (existingProduct.documents || {});
    
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
    
    // Add currency and UPC to documents if provided
    if (currency) {
      documents.currency = currency;
    }
    if (upc) {
      documents.upc = upc;
    }
    
    updateData.documents = documents;

    const product = await prisma.product.update({
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
      { message: 'Product updated successfully', product },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating product:', error);
    
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
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get authenticated user
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the product with all files to delete from S3
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        createdBy: true,
        images: true,
        documents: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (authUser.role === 'admin') {
      // Admin can delete any product
    } else if (authUser.role === 'offer_manager') {
      // Offer manager can only delete products they created
      if (product.createdBy !== authUser.userId) {
        return NextResponse.json(
          { error: 'You can only delete products that you created' },
          { status: 403 }
        );
      }
    } else {
      // Other roles cannot delete products
      return NextResponse.json(
        { error: 'Insufficient permissions to delete products' },
        { status: 403 }
      );
    }

    // Delete files from S3
    const filesToDelete: string[] = [];

    console.log('Product data for deletion:', {
      id: product.id,
      title: product.title,
      imagesCount: product.images?.length || 0,
      documentsType: typeof product.documents,
      documents: product.documents,
    });

    // Add image URLs to delete list
    if (product.images && Array.isArray(product.images)) {
      console.log('Processing images:', product.images);
      product.images.forEach((imageUrl: string) => {
        // Extract the key from the S3 URL
        const key = extractS3Key(imageUrl);
        console.log('Extracted image key:', key);
        if (key) filesToDelete.push(key);
      });
    }

    // Add document URLs to delete list
    if (product.documents && typeof product.documents === 'object') {
      const docs = product.documents as any;
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
        // Continue with product deletion even if S3 deletion fails
      }
    } else {
      console.log('No files to delete from S3');
    }

    // Delete the product from database
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Product deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting product:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
