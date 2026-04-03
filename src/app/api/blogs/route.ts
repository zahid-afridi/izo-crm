import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/S3';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// GET all blogs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    const where: any = {};
    
    if (categoryId) where.categoryId = categoryId;

    const blogs = await prisma.blog.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ blogs }, { status: 200 });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blogs' },
      { status: 500 }
    );
  }
}

// POST create new blog
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract fields
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const author = formData.get('author') as string;
    const categoryId = formData.get('categoryId') as string;
    const publishOnWebsite = formData.get('publishOnWebsite') === 'true';
    const showOnHomepage = formData.get('showOnHomepage') === 'true';
    const featured = formData.get('featured') === 'true';
    const publishedAt = formData.get('publishedAt') as string;
    const metaTitle = formData.get('metaTitle') as string;
    const metaDescription = formData.get('metaDescription') as string;

    const tags = formData.getAll('tags') as string[];

    if (!title || !content || !author) {
      return NextResponse.json(
        { error: 'Title, content, and author are required' },
        { status: 400 }
      );
    }

    // Upload additional images to S3
    const imageFiles = formData.getAll('images') as File[];
    const uploadedImages: string[] = [];

    for (const file of imageFiles) {
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;
        
        const result = await uploadFile(base64, 'izo/blogs');
        uploadedImages.push(result.url);
      }
    }

    const blog = await prisma.blog.create({
      data: {
        title,
        content,
        author,
        categoryId: categoryId || null,
        images: uploadedImages,
        tags: tags?.filter(t => t) || [],
        publishOnWebsite,
        showOnHomepage,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
      },
      include: {
        category: true,
      },
    });

    // If showOnHomepage is true, add to homepageBlog table
    if (showOnHomepage) {
      try {
        // Get the highest display order
        const maxOrder = await prisma.homepageBlog.findFirst({
          orderBy: { displayOrder: 'desc' },
          select: { displayOrder: true },
        });

        const nextOrder = (maxOrder?.displayOrder || 0) + 1;

        await prisma.homepageBlog.create({
          data: {
            blogId: blog.id,
            displayOrder: nextOrder,
          },
        });
      } catch (error: any) {
        console.error('Error adding blog to homepage:', error);
        // Don't fail the blog creation if homepage addition fails
      }
    }

    return NextResponse.json(
      { message: 'Blog created successfully', blog },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating blog:', error);
    return NextResponse.json(
      { error: 'Failed to create blog' },
      { status: 500 }
    );
  }
}
