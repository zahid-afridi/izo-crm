import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all videos
export async function GET(request: NextRequest) {
  try {
    const videos = await prisma.video.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ videos }, { status: 200 });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}

// POST create new video
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, youtubeUrl, publishOnWebsite } = body;

    if (!title || !youtubeUrl) {
      return NextResponse.json(
        { error: 'Title and YouTube URL are required' },
        { status: 400 }
      );
    }

    const video = await prisma.video.create({
      data: {
        title,
        description: description || null,
        youtubeUrl,
        publishOnWebsite: publishOnWebsite !== undefined ? publishOnWebsite : true,
      },
    });

    return NextResponse.json(
      { message: 'Video created successfully', video },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating video:', error);
    return NextResponse.json(
      { error: 'Failed to create video' },
      { status: 500 }
    );
  }
}
