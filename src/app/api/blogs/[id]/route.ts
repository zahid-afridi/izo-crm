import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadFile, deleteFile } from '@/lib/S3';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

// GET single blog
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blog = await prisma.blog.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!blog) {
      return NextResponse.json(
        { error: 'Blog not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ blog }, { status: 200 });
  } catch (error) {
    console.error('Error fetching blog:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog' },
      { status: 500 }
    );
  }
}

// PUT update blog
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    
    const existingBlog = await prisma.blog.findUnique({
      where: { id },
    });

    if (!existingBlog) {
      return NextResponse.json(
        { error: 'Blog not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    
    // Extract fields
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const author = formData.get('author') as string;
    const categoryId = formData.get('categoryId') as string;
    const publishOnWebsite = formData.get('publishOnWebsite');
    const showOnHomepage = formData.get('showOnHomepage');
    const publishedAt = formData.get('publishedAt') as string;
    const metaTitle = formData.get('metaTitle') as string;
    const metaDescription = formData.get('metaDescription') as string;

    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (author) updateData.author = author;
    if (categoryId !== null) updateData.categoryId = categoryId || null;
    if (publishOnWebsite !== null) updateData.publishOnWebsite = publishOnWebsite === 'true';
    if (showOnHomepage !== null) updateData.showOnHomepage = showOnHomepage === 'true';
    if (publishedAt !== null) updateData.publishedAt = publishedAt ? new Date(publishedAt) : null;
    if (metaTitle !== null) updateData.metaTitle = metaTitle || null;
    if (metaDescription !== null) updateData.metaDescription = metaDescription || null;

    // Handle featured image
    const featuredImageFile = formData.get('featuredImage') as File;
    const keepExistingFeaturedImage = formData.get('keepExistingFeaturedImage') === 'true';
    
    if (featuredImageFile && featuredImageFile.size > 0) {
      const bytes = await featuredImageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = `data:${featuredImageFile.type};base64,${buffer.toString('base64')}`;
      
      const result = await uploadFile(base64, 'izo/blogs');
      updateData.featuredImage = result.url;
    } else if (!keepExistingFeaturedImage) {
      updateData.featuredImage = null;
    }

    // Handle additional images
    const imageFiles = formData.getAll('images') as File[];
    const existingImagesStr = formData.get('existingImages') as string;
    const existingImages = existingImagesStr ? JSON.parse(existingImagesStr) : existingBlog.images;

    const newUploadedImages: string[] = [];
    for (const file of imageFiles) {
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;
        
        const result = await uploadFile(base64, 'izo/blogs');
        newUploadedImages.push(result.url);
      }
    }

    if (imageFiles.length > 0 || existingImagesStr) {
      updateData.images = [...existingImages, ...newUploadedImages];
    }

    // Handle tags
    const tags = formData.getAll('tags') as string[];
    if (tags.length > 0) {
      updateData.tags = tags.filter(t => t);
    }

    const blog = await prisma.blog.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    // Handle showOnHomepage toggle
    if (showOnHomepage !== null) {
      const isShowingOnHomepage = showOnHomepage === 'true';
      const existingHomepageBlog = await prisma.homepageBlog.findUnique({
        where: { blogId: id },
      });

      if (isShowingOnHomepage && !existingHomepageBlog) {
        // Add to homepage if not already there
        try {
          const maxOrder = await prisma.homepageBlog.findFirst({
            orderBy: { displayOrder: 'desc' },
            select: { displayOrder: true },
          });

          const nextOrder = (maxOrder?.displayOrder || 0) + 1;

          await prisma.homepageBlog.create({
            data: {
              blogId: id,
              displayOrder: nextOrder,
            },
          });
        } catch (error: any) {
          console.error('Error adding blog to homepage:', error);
          // Don't fail the update if homepage addition fails
        }
      } else if (!isShowingOnHomepage && existingHomepageBlog) {
        // Remove from homepage if it was there
        try {
          await prisma.homepageBlog.delete({
            where: { blogId: id },
          });
        } catch (error: any) {
          console.error('Error removing blog from homepage:', error);
          // Don't fail the update if homepage removal fails
        }
      }
    }

    return NextResponse.json(
      { message: 'Blog updated successfully', blog },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating blog:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Blog not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update blog' },
      { status: 500 }
    );
  }
}

// DELETE blog
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get the blog with all images to delete from S3
    const blog = await prisma.blog.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        featuredImage: true,
        images: true,
      },
    });

    if (!blog) {
      return NextResponse.json(
        { error: 'Blog not found' },
        { status: 404 }
      );
    }

    // Delete files from S3
    const filesToDelete: string[] = [];

    // Add featured image to delete list
    if (blog.featuredImage) {
      const key = extractS3Key(blog.featuredImage);
      if (key) filesToDelete.push(key);
    }

    // Add images to delete list
    if (blog.images && Array.isArray(blog.images)) {
      blog.images.forEach((imageUrl: string) => {
        const key = extractS3Key(imageUrl);
        if (key) filesToDelete.push(key);
      });
    }

    // Delete files from S3
    if (filesToDelete.length > 0) {
      try {
        console.log('🗑️ Deleting blog images from S3:', filesToDelete);
        for (const key of filesToDelete) {
          await deleteFile(key);
        }
        console.log('✅ Blog images deleted from S3');
      } catch (s3Error) {
        console.error('⚠️ Error deleting blog images from S3:', s3Error);
        // Continue with blog deletion even if S3 deletion fails
      }
    }

    // Delete from database
    await prisma.blog.delete({
      where: { id },
    });

    // Also delete from homepageBlog if it exists
    try {
      await prisma.homepageBlog.delete({
        where: { blogId: id },
      });
    } catch (error: any) {
      // It's okay if it doesn't exist in homepageBlog
      if (error.code !== 'P2025') {
        console.error('Error deleting blog from homepage:', error);
      }
    }

    return NextResponse.json(
      { message: 'Blog deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting blog:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Blog not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete blog' },
      { status: 500 }
    );
  }
}
