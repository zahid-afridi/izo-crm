import type { CompanySetting } from '@/store/slices/settingsSlice';
import { BRAND_HEX, DEFAULT_SESSION_MINUTES } from './defaults';

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

/** Valid 6-digit hex for inputs; invalid input falls back to black so the color picker stays valid. */
export function safeHex(value: string): string {
  return HEX_RE.test(value.trim()) ? value.trim() : '#000000';
}

export function hexForCompare(value: string, fallback: string): string {
  return safeHex(value || fallback).toUpperCase();
}

/** Snapshot of all fields used for “unsaved changes” detection */
export type SettingsFormSnapshot = {
  companyDisplayName: string;
  tagline: string;
  brandColorStart: string;
  brandColorMid: string;
  brandColorEnd: string;
  logoUrl: string;
  mailerEmail: string;
  mailerAppPassword: string;
  legalName: string;
  taxId: string;
  address: string;
  phone: string;
  companyEmail: string;
  website: string;
  maintenanceMode: boolean;
  sessionTimeout: number;
};

export function snapshotFromDraft(fields: {
  companyDisplayName: string;
  tagline: string;
  brandColorStart: string;
  brandColorMid: string;
  brandColorEnd: string;
  logoUrl: string;
  mailerEmail: string;
  mailerAppPassword: string;
  legalName: string;
  taxId: string;
  address: string;
  phone: string;
  companyEmail: string;
  website: string;
  maintenanceMode: boolean;
  sessionTimeout: string;
}): SettingsFormSnapshot {
  return {
    companyDisplayName: fields.companyDisplayName,
    tagline: fields.tagline,
    brandColorStart: hexForCompare(fields.brandColorStart, BRAND_HEX.start),
    brandColorMid: hexForCompare(fields.brandColorMid, BRAND_HEX.mid),
    brandColorEnd: hexForCompare(fields.brandColorEnd, BRAND_HEX.end),
    logoUrl: fields.logoUrl,
    mailerEmail: fields.mailerEmail,
    mailerAppPassword: fields.mailerAppPassword,
    legalName: fields.legalName,
    taxId: fields.taxId,
    address: fields.address,
    phone: fields.phone,
    companyEmail: fields.companyEmail,
    website: fields.website,
    maintenanceMode: fields.maintenanceMode,
    sessionTimeout: Number(fields.sessionTimeout) || DEFAULT_SESSION_MINUTES,
  };
}

export function snapshotFromSaved(source: CompanySetting): SettingsFormSnapshot {
  return {
    companyDisplayName: source.companyDisplayName || '',
    tagline: source.tagline || '',
    brandColorStart: hexForCompare(source.brandColorStart, BRAND_HEX.start),
    brandColorMid: hexForCompare(source.brandColorMid, BRAND_HEX.mid),
    brandColorEnd: hexForCompare(source.brandColorEnd, BRAND_HEX.end),
    logoUrl: source.logoUrl || '',
    mailerEmail: source.mailerEmail || '',
    mailerAppPassword: source.mailerAppPassword || '',
    legalName: source.legalName || '',
    taxId: source.taxId || '',
    address: source.address || '',
    phone: source.phone || '',
    companyEmail: source.companyEmail || '',
    website: source.website || '',
    maintenanceMode: Boolean(source.maintenanceMode),
    sessionTimeout: Number(source.sessionTimeout || DEFAULT_SESSION_MINUTES),
  };
}

export function snapshotsEqual(a: SettingsFormSnapshot, b: SettingsFormSnapshot): boolean {
  return (
    a.companyDisplayName === b.companyDisplayName &&
    a.tagline === b.tagline &&
    a.brandColorStart === b.brandColorStart &&
    a.brandColorMid === b.brandColorMid &&
    a.brandColorEnd === b.brandColorEnd &&
    a.logoUrl === b.logoUrl &&
    a.mailerEmail === b.mailerEmail &&
    a.mailerAppPassword === b.mailerAppPassword &&
    a.legalName === b.legalName &&
    a.taxId === b.taxId &&
    a.address === b.address &&
    a.phone === b.phone &&
    a.companyEmail === b.companyEmail &&
    a.website === b.website &&
    a.maintenanceMode === b.maintenanceMode &&
    a.sessionTimeout === b.sessionTimeout
  );
}
