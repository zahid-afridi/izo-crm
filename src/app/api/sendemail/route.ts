import { NextRequest, NextResponse } from 'next/server';
import { sendSystemMail } from '@/lib/mailer';


export async function GET(request: NextRequest) {
  try {
    const result = await sendSystemMail({ to: 'zahidtime2@gmail.com', subject: 'Test Email', text: 'This is a test email', html: '<p>This is a test email</p>' });


    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}