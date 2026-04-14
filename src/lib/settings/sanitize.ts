import { BRAND_HEX, DEFAULT_SESSION_MINUTES } from './defaults';

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export function sanitizeHex(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const hex = value.trim();
  return HEX_RE.test(hex) ? hex.toUpperCase() : fallback;
}

/** Optional DB string: empty → null */
export function sanitizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const next = value.trim();
  return next.length ? next : null;
}

export function sanitizeUrl(value: unknown): string | null {
  return sanitizeOptionalString(value);
}

/** Logo file URL → S3 object key (DigitalOcean Spaces path after bucket). */
export function extractS3KeyFromUrl(fileUrl: string): string | null {
  try {
    const parsed = new URL(fileUrl);
    let key = parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname;
    const bucketPrefix = `${process.env.DITGITALOCEAN_BUCKET || 'izogrup-ontop'}/`;
    if (key.startsWith(bucketPrefix)) {
      key = key.slice(bucketPrefix.length);
    }
    return key || null;
  } catch {
    return null;
  }
}

/** Request body → Prisma `CompanySetting` write shape */
export function normalizeCompanySettingPayload(body: Record<string, unknown>) {
  const timeoutRaw = Number(body.sessionTimeout);
  const sessionTimeout =
    Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? Math.floor(timeoutRaw) : DEFAULT_SESSION_MINUTES;

  return {
    companyDisplayName: sanitizeOptionalString(body.companyDisplayName),
    tagline: sanitizeOptionalString(body.tagline),
    brandColorStart: sanitizeHex(body.brandColorStart, BRAND_HEX.start),
    brandColorMid: sanitizeHex(body.brandColorMid, BRAND_HEX.mid),
    brandColorEnd: sanitizeHex(body.brandColorEnd, BRAND_HEX.end),
    logoUrl: sanitizeUrl(body.logoUrl),
    mailerEmail: sanitizeOptionalString(body.mailerEmail),
    mailerAppPassword: sanitizeOptionalString(body.mailerAppPassword),
    legalName: sanitizeOptionalString(body.legalName),
    taxId: sanitizeOptionalString(body.taxId),
    address: sanitizeOptionalString(body.address),
    phone: sanitizeOptionalString(body.phone),
    companyEmail: sanitizeOptionalString(body.companyEmail),
    website: sanitizeOptionalString(body.website),
    maintenanceMode: Boolean(body.maintenanceMode),
    sessionTimeout,
  };
}
