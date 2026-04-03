import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all homepage videos
export async function GET(request: NextRequest) {
  try {
    const homepageVideos = await prisma.homepageVideo.findMany({
      include: {
        video: true,
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });

    return NextResponse.json({ homepageVideos }, { status: 200 });
  } catch (error) {
    console.error('Error fetching homepage videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage videos' },
      { status: 500 }
    );
  }
}

// POST add video to homepage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, displayOrder } = body;

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    const homepageVideo = await prisma.homepageVideo.create({
      data: {
        videoId,
        displayOrder: displayOrder || 0,
      },
      include: {
        video: true,
      },
    });

    return NextResponse.json(
      { message: 'Video added to homepage successfully', homepageVideo },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error adding video to homepage:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This video is already on the homepage' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to add video to homepage' },
      { status: 500 }
    );
  }
}
