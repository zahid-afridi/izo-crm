import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-middleware';
import { logActivity } from '@/lib/activity-logger';
import { uploadFile, deleteFile } from '@/lib/S3';

// Helper function to extract S3 key from URL
function extractS3Key(url: string): string | null {
  try {
    // S3 URL format: https://izogrup-ontop.fra1.digitaloceanspaces.com/izogrup-ontop/izo/partners/filename
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

/**
 * PUT /api/we-work-with/[id] - Update partner logo
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireRole(request, ['admin', 'website_manager']);
    if (!auth.authorized) return auth.response!;

    const { id } = await params;
    const formData = await request.formData();
    const websiteUrl = formData.get('websiteUrl') as string;
    const logoFile = formData.get('logo') as File;
    const keepExistingLogo = formData.get('keepExistingLogo') as string;

    // Check if partner exists
    const existingPartner = await prisma.weWorkWith.findUnique({
      where: { id },
    });

    if (!existingPartner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    let logoUrl = existingPartner.logoUrl;

    // Handle logo update
    if (logoFile && keepExistingLogo !== 'true') {
      // Validate file type
      if (!logoFile.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Only image files are allowed' },
          { status: 400 }
        );
      }

      // Upload new logo to Digital Ocean Spaces
      console.log('🔍 Uploading updated logo to Digital Ocean Spaces:', {
        fileName: logoFile.name,
        fileSize: logoFile.size,
        fileType: logoFile.type
      });

      const bytes = await logoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = `data:${logoFile.type};base64,${buffer.toString('base64')}`;

      const uploadResult = await uploadFile(base64, 'izo/partners');
      logoUrl = uploadResult.url;

      console.log('✅ Upload success:', logoUrl);

      // Delete old logo from S3 if it exists
      if (existingPartner.logoUrl) {
        try {
          const oldKey = extractS3Key(existingPartner.logoUrl);
          if (oldKey) {
            console.log('🗑️ Deleting old logo from S3:', oldKey);
            await deleteFile(oldKey);
            console.log('✅ Old logo deleted from S3');
          }
        } catch (deleteError) {
          console.error('⚠️ Error deleting old logo from S3:', deleteError);
          // Continue with update even if deletion fails
        }
      }
    }

    const partner = await prisma.weWorkWith.update({
      where: { id },
      data: {
        logoUrl,
        websiteUrl: websiteUrl || null,
      },
    });

    // Log the activity
    await logActivity({
      userId: auth.user!.userId,
      action: 'update',
      module: 'we-work-with',
      resourceId: partner.id,
      resourceName: 'Partner Logo',
      description: 'Updated partner logo',
    });

    return NextResponse.json({ partner }, { status: 200 });
  } catch (error) {
    console.error('Error updating partner:', error);
    return NextResponse.json(
      { error: 'Failed to update partner' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/we-work-with/[id] - Delete partner logo
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireRole(request, ['admin', 'website_manager']);
    if (!auth.authorized) return auth.response!;

    const { id } = await params;

    // Check if partner exists
    const existingPartner = await prisma.weWorkWith.findUnique({
      where: { id },
    });

    if (!existingPartner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Delete logo from S3 if it exists
    if (existingPartner.logoUrl) {
      try {
        const logoKey = extractS3Key(existingPartner.logoUrl);
        if (logoKey) {
          console.log('🗑️ Deleting logo from S3:', logoKey);
          await deleteFile(logoKey);
          console.log('✅ Logo deleted from S3');
        }
      } catch (deleteError) {
        console.error('⚠️ Error deleting logo from S3:', deleteError);
        // Continue with database deletion even if S3 deletion fails
      }
    }

    // Delete from database
    await prisma.weWorkWith.delete({
      where: { id },
    });

    // Log the activity
    await logActivity({
      userId: auth.user!.userId,
      action: 'delete',
      module: 'we-work-with',
      resourceId: id,
      resourceName: 'Partner Logo',
      description: 'Deleted partner logo',
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting partner:', error);
    return NextResponse.json(
      { error: 'Failed to delete partner' },
      { status: 500 }
    );
  }
}