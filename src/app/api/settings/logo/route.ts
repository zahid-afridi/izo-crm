import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { uploadFile } from '@/lib/S3';

export async function POST(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (!auth.authorized) return auth.response!;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be 2MB or less' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;
    const result = await uploadFile(base64, 'izo/settings/logo');

    return NextResponse.json(
      {
        url: result.url,
        key: result.key,
        filename: file.name,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Settings logo upload error:', error);
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
  }
}
