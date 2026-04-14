import nodemailer, { type SendMailOptions, type SentMessageInfo, type Transporter } from 'nodemailer';
import { prisma } from '@/lib/prisma';

type SettingsMailerRecord = {
  mailerEmail: string | null;
  mailerAppPassword: string | null;
  companyDisplayName: string | null;
  legalName: string | null;
};

export type SystemMailerOptions = {
  host?: string;
  port?: number;
  secure?: boolean;
};

export type SystemMailInput = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
};

function parseEnvBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return fallback;
}

function getDefaultSmtpConfig(): Required<SystemMailerOptions> {
  const envPort = Number(process.env.SMTP_PORT);
  return {
    host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
    port: Number.isFinite(envPort) && envPort > 0 ? Math.floor(envPort) : 587,
    secure: parseEnvBoolean(process.env.SMTP_SECURE, false),
  };
}

async function getSettingsMailerRecord(): Promise<SettingsMailerRecord> {
  const settings = await prisma.companySetting.findFirst({
    orderBy: { createdAt: 'asc' },
    select: {
      mailerEmail: true,
      mailerAppPassword: true,
      companyDisplayName: true,
      legalName: true,
    },
  });

  return {
    mailerEmail: settings?.mailerEmail ?? null,
    mailerAppPassword: settings?.mailerAppPassword ?? null,
    companyDisplayName: settings?.companyDisplayName ?? null,
    legalName: settings?.legalName ?? null,
  };
}

function buildTransporter(
  settings: SettingsMailerRecord & { mailerEmail: string; mailerAppPassword: string },
  options?: SystemMailerOptions
): Transporter {
  const smtp = { ...getDefaultSmtpConfig(), ...options };

  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: settings.mailerEmail,
      pass: settings.mailerAppPassword,
    },
  });
}

function getSenderName(settings: SettingsMailerRecord): string {
  return settings.companyDisplayName?.trim() || 'Izo';
}

function assertMailerSettings(settings: SettingsMailerRecord): asserts settings is SettingsMailerRecord & {
  mailerEmail: string;
  mailerAppPassword: string;
} {
  if (!settings.mailerEmail?.trim()) {
    throw new Error('Mailer is not configured: settings.mailerEmail is required.');
  }
  if (!settings.mailerAppPassword?.trim()) {
    throw new Error('Mailer is not configured: settings.mailerAppPassword is required.');
  }
}

export async function createSystemMailer(
  options?: SystemMailerOptions
): Promise<Transporter> {
  const settings = await getSettingsMailerRecord();
  assertMailerSettings(settings);
  return buildTransporter(settings, options);
}

export async function verifySystemMailerConnection(
  options?: SystemMailerOptions
): Promise<void> {
  const transporter = await createSystemMailer(options);
  await transporter.verify();
}

export async function sendSystemMail(
  payload: SystemMailInput,
  options?: SystemMailerOptions
): Promise<SentMessageInfo> {
  const settings = await getSettingsMailerRecord();
  assertMailerSettings(settings);

  const transporter = buildTransporter(settings, options);
  const from = {
    name: getSenderName(settings),
    address: settings.mailerEmail,
  };

  const mailOptions: SendMailOptions = {
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    cc: payload.cc,
    bcc: payload.bcc,
    replyTo: payload.replyTo ?? settings.mailerEmail,
  };

  return transporter.sendMail(mailOptions);
}
