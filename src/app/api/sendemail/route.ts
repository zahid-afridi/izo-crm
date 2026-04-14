import { NextRequest, NextResponse } from 'next/server';
import { sendSystemMail, verifySystemMailerConnection } from '@/lib/mailer';


export async function GET(request: NextRequest) {
  try {
    await verifySystemMailerConnection();

    const result = await sendSystemMail({ to: 'zahidtime2@gmail.com', subject: 'Test Email', text: 'This is a test email', html: '<p>This is a test email</p>' });


    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown mail error';
    console.error('sendemail route failed:', error);
    return NextResponse.json({ error: 'Failed to send email', details: message }, { status: 500 });
  }
}