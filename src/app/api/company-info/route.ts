import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteFile } from '@/lib/S3';

// Helper function to extract S3 key from URL
function extractS3Key(url: string): string | null {
  try {
    // S3 URL format: https://izogrup-ontop.fra1.digitaloceanspaces.com/izogrup-ontop/izo/documents/filename
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

// GET company info
export async function GET(request: NextRequest) {
  try {
    // Get the first (and should be only) company info record
    const companyInfo = await prisma.companyInfo.findFirst();

    return NextResponse.json({ companyInfo }, { status: 200 });
  } catch (error) {
    console.error('Error fetching company info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company info' },
      { status: 500 }
    );
  }
}

// POST/PUT update company info (upsert - create if doesn't exist, update if exists)
export async function POST(request: NextRequest) {
  try {
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

    // Check if company info already exists
    const existing = await prisma.companyInfo.findFirst();

    // If updating and CV is being changed, delete old CV from S3
    if (existing && existing.companyCV && companyCV && existing.companyCV !== companyCV) {
      try {
        const oldCVKey = extractS3Key(existing.companyCV);
        if (oldCVKey) {
          console.log('🗑️ Deleting old CV from S3:', oldCVKey);
          await deleteFile(oldCVKey);
          console.log('✅ Old CV deleted from S3');
        }
      } catch (deleteError) {
        console.error('⚠️ Error deleting old CV from S3:', deleteError);
        // Continue with update even if deletion fails
      }
    }

    // If removing CV (setting to null/empty), delete from S3
    if (existing && existing.companyCV && !companyCV) {
      try {
        const cvKey = extractS3Key(existing.companyCV);
        if (cvKey) {
          console.log('🗑️ Deleting CV from S3:', cvKey);
          await deleteFile(cvKey);
          console.log('✅ CV deleted from S3');
        }
      } catch (deleteError) {
        console.error('⚠️ Error deleting CV from S3:', deleteError);
        // Continue with update even if deletion fails
      }
    }

    let companyInfo;
    if (existing) {
      // Update existing record
      companyInfo = await prisma.companyInfo.update({
        where: { id: existing.id },
        data: {
          phone: phone || null,
          email: email || null,
          address: address || null,
          facebookUrl: facebookUrl || null,
          instagramUrl: instagramUrl || null,
          youtubeUrl: youtubeUrl || null,
          linkedinUrl: linkedinUrl || null,
          tiktokUrl: tiktokUrl || null,
          googlePlayUrl: googlePlayUrl || null,
          appStoreUrl: appStoreUrl || null,
          companyCV: companyCV || null,
        },
      });
    } else {
      // Create new record
      companyInfo = await prisma.companyInfo.create({
        data: {
          phone: phone || null,
          email: email || null,
          address: address || null,
          facebookUrl: facebookUrl || null,
          instagramUrl: instagramUrl || null,
          youtubeUrl: youtubeUrl || null,
          linkedinUrl: linkedinUrl || null,
          tiktokUrl: tiktokUrl || null,
          googlePlayUrl: googlePlayUrl || null,
          appStoreUrl: appStoreUrl || null,
          companyCV: companyCV || null,
        },
      });
    }

    return NextResponse.json(
      { message: 'Company info saved successfully', companyInfo },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error saving company info:', error);
    return NextResponse.json(
      { error: 'Failed to save company info' },
      { status: 500 }
    );
  }
}
