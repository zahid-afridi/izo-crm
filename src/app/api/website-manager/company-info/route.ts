import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-middleware';
import { logActivity } from '@/lib/activity-logger';

export async function GET(request: NextRequest) {
  try {
    const companyInfo = await prisma.companyInfo.findFirst();

    if (!companyInfo) {
      // Return default empty structure
      return NextResponse.json({
        id: null,
        phone: null,
        email: null,
        address: null,
        facebookUrl: null,
        instagramUrl: null,
        youtubeUrl: null,
        linkedinUrl: null,
        tiktokUrl: null,
        googlePlayUrl: null,
        appStoreUrl: null,
        companyCV: null,
      });
    }

    return NextResponse.json(companyInfo, { status: 200 });
  } catch (error) {
    console.error('Error fetching company info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company info' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin', 'website_manager']);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const {
      phone,
      email,
      address,
      facebookUrl,
      instagramUrl,
      youtubeUrl,
      linkedinUrl,
      tiktokUrl,
      googlePlayUrl,
      appStoreUrl,
      companyCV,
    } = body;

    // Get or create company info
    let companyInfo = await prisma.companyInfo.findFirst();

    if (!companyInfo) {
      companyInfo = await prisma.companyInfo.create({
        data: {
          phone,
          email,
          address,
          facebookUrl,
          instagramUrl,
          youtubeUrl,
          linkedinUrl,
          tiktokUrl,
          googlePlayUrl,
          appStoreUrl,
          companyCV,
        },
      });
    } else {
      const oldData = { ...companyInfo };

      companyInfo = await prisma.companyInfo.update({
        where: { id: companyInfo.id },
        data: {
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(address !== undefined && { address }),
          ...(facebookUrl !== undefined && { facebookUrl }),
          ...(instagramUrl !== undefined && { instagramUrl }),
          ...(youtubeUrl !== undefined && { youtubeUrl }),
          ...(linkedinUrl !== undefined && { linkedinUrl }),
          ...(tiktokUrl !== undefined && { tiktokUrl }),
          ...(googlePlayUrl !== undefined && { googlePlayUrl }),
          ...(appStoreUrl !== undefined && { appStoreUrl }),
          ...(companyCV !== undefined && { companyCV }),
        },
      });

      // Log the action
      await logActivity({
        userId: auth.user!.userId,
        action: 'update',
        module: 'website-manager',
        resourceName: 'Company Information',
        description: 'Updated company information',
        changes: {
          phone: { from: oldData.phone, to: phone },
          email: { from: oldData.email, to: email },
          address: { from: oldData.address, to: address },
        },
      });
    }

    return NextResponse.json(companyInfo, { status: 200 });
  } catch (error) {
    console.error('Error updating company info:', error);
    return NextResponse.json(
      { error: 'Failed to update company info' },
      { status: 500 }
    );
  }
}
