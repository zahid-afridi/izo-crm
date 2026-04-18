/**
 * Stored offer statuses (DB). "expired" may be persisted; "sent" past validUntil
 * is treated as expired for display and filtering via getEffectiveOfferStatus.
 */
export const STORED_OFFER_STATUSES = [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired',
] as const;

export type StoredOfferStatus = (typeof STORED_OFFER_STATUSES)[number];

/**
 * Effective status for UI and filters:
 * - draft: always stays draft (even past validUntil)
 * - sent + validUntil < now → expired (unless already accepted/rejected/expired)
 * - accepted, rejected, expired: unchanged
 */
export function getEffectiveOfferStatus(offer: {
  offerStatus: string;
  validUntil: Date | string | null | undefined;
}): string {
  const stored = offer.offerStatus;
  const raw = offer.validUntil;
  const validUntil =
    raw == null
      ? null
      : typeof raw === 'string'
        ? new Date(raw)
        : raw;

  if (stored === 'accepted' || stored === 'rejected' || stored === 'expired') {
    return stored;
  }
  if (stored === 'draft') {
    return 'draft';
  }
  if (stored === 'sent' && validUntil != null && validUntil < new Date()) {
    return 'expired';
  }
  return stored;
}
