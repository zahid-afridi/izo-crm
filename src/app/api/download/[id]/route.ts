import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find the shared offer record
    const sharedOffer = await prisma.sharedOffer.findUnique({
      where: { id },
      include: {
        offer: true
      }
    });

    if (!sharedOffer) {
      return NextResponse.json({ error: 'File not found or expired' }, { status: 404 });
    }

    // Check if the share has expired (optional - you can set expiration)
    const now = new Date();
    const createdAt = new Date(sharedOffer.createdAt);
    const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
    
    // Expire after 30 days (optional)
    if (daysDiff > 30) {
      return NextResponse.json({ error: 'Download link has expired' }, { status: 410 });
    }

    // Fetch the file from Cloudinary
    const cloudinaryResponse = await fetch(sharedOffer.cloudinaryUrl);
    
    if (!cloudinaryResponse.ok) {
      return NextResponse.json({ error: 'File not available' }, { status: 404 });
    }

    const fileBuffer = await cloudinaryResponse.arrayBuffer();
    
    // Update download count (optional)
    await prisma.sharedOffer.update({
      where: { id },
      data: {
        downloadCount: {
          increment: 1
        },
        lastDownloadedAt: new Date()
      }
    });

    // Return the file with proper headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${sharedOffer.filename}"`,
        'Content-Length': fileBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}