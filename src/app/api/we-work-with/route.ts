import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-middleware';
import { logActivity } from '@/lib/activity-logger';
import { uploadFile } from '@/lib/S3';

/**
 * GET /api/we-work-with - Get all partner logos
 */
export async function GET(request: NextRequest) {
  try {
    const partners = await prisma.weWorkWith.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({ partners }, { status: 200 });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partners' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/we-work-with - Create new partner logo
 */
export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin', 'website_manager']);
    if (!auth.authorized) return auth.response!;

    const formData = await request.formData();
    const websiteUrl = formData.get('websiteUrl') as string;
    const logoFile = formData.get('logo') as File;

    if (!logoFile) {
      return NextResponse.json(
        { error: 'Logo file is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!logoFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Upload logo to Digital Ocean Spaces
    console.log('🔍 Uploading logo to Digital Ocean Spaces:', {
      fileName: logoFile.name,
      fileSize: logoFile.size,
      fileType: logoFile.type
    });

    const bytes = await logoFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${logoFile.type};base64,${buffer.toString('base64')}`;

    const uploadResult = await uploadFile(base64, 'izo/partners');
    const logoUrl = uploadResult.url;

    console.log('✅ Upload success:', logoUrl);

    // Get the next display order
    const lastPartner = await prisma.weWorkWith.findFirst({
      orderBy: { displayOrder: 'desc' },
    });
    const displayOrder = (lastPartner?.displayOrder || 0) + 1;

    const partner = await prisma.weWorkWith.create({
      data: {
        logoUrl,
        websiteUrl: websiteUrl || null,
        displayOrder,
      },
    });

    // Log the activity
    await logActivity({
      userId: auth.user!.userId,
      action: 'create',
      module: 'we-work-with',
      resourceId: partner.id,
      resourceName: 'Partner Logo',
      description: 'Added new partner logo',
    });

    return NextResponse.json({ partner }, { status: 201 });
  } catch (error) {
    console.error('Error creating partner:', error);
    return NextResponse.json(
      { error: 'Failed to create partner' },
      { status: 500 }
    );
  }
}