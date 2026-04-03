import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all homepage blogs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const blogId = searchParams.get('blogId');

    const where: any = {};
    if (blogId) {
      where.blogId = blogId;
    }

    const homepageBlogs = await prisma.homepageBlog.findMany({
      where,
      include: {
        blog: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });

    return NextResponse.json({ homepageBlogs }, { status: 200 });
  } catch (error) {
    console.error('Error fetching homepage blogs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage blogs' },
      { status: 500 }
    );
  }
}

// POST add blog to homepage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { blogId, displayOrder } = body;

    if (!blogId) {
      return NextResponse.json(
        { error: 'Blog ID is required' },
        { status: 400 }
      );
    }

    const homepageBlog = await prisma.homepageBlog.create({
      data: {
        blogId,
        displayOrder: displayOrder || 0,
      },
      include: {
        blog: {
          include: {
            category: true,
          },
        },
      },
    });

    return NextResponse.json(
      { message: 'Blog added to homepage successfully', homepageBlog },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error adding blog to homepage:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This blog is already on the homepage' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to add blog to homepage' },
      { status: 500 }
    );
  }
}
