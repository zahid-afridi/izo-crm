import { NextRequest, NextResponse } from 'next/server';
import s3 from '@/lib/S3';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get original filename WITH extension
    const originalFilename = file.name;
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Digital Ocean Spaces
    const uniqueKey = `izo/documents/${uuidv4()}-${originalFilename}`;
    
    const params = {
      Bucket: 'izogrup-ontop',
      Key: uniqueKey,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
      ACL: 'public-read',
    };

    const result = await s3.upload(params).promise();

    return NextResponse.json({
      url: result.Location,
      key: uniqueKey,
      filename: originalFilename,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
