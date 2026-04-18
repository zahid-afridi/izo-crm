'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Mail, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type OfferDetail = {
  id: string;
  offerNumber: string;
  client: string;
  title: string;
  offerDate: string;
  validUntil?: string | null;
  offerStatus: string;
  effectiveStatus?: string;
  totalAmount: number;
  currency: string;
  items?: unknown[];
};

export default function OfferDetailRoute() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { t } = useTranslation();
  const user = useAppSelector(selectAuthUser);
  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const canEmail = ['admin', 'offer_manager'].includes(user?.role || '');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/offers/${id}`, { credentials: 'include' });
      if (!res.ok) {
        setError(t('offers.noOffersFound'));
        setOffer(null);
        return;
      }
      const data = await res.json();
      setOffer(data.offer);
    } catch {
      setError(t('offers.loadingOffers'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const displayStatus = offer?.effectiveStatus ?? offer?.offerStatus ?? '';

  const statusBadge = () => {
    switch (displayStatus) {
      case 'draft':
        return <Badge className="bg-slate-100 text-slate-800">{t('offers.draft')}</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800">{t('offers.sent')}</Badge>;
      case 'expired':
        return <Badge className="bg-amber-100 text-amber-900">{t('offers.expired')}</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800">{t('offers.accepted')}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">{t('offers.rejected')}</Badge>;
      default:
        return <Badge variant="outline">{displayStatus}</Badge>;
    }
  };

  const handleDownload = async () => {
    if (!offer) return;
    const res = await fetch(`/api/offers/${offer.id}/download`, { method: 'GET' });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${offer.offerNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleSendEmail = async () => {
    if (!offer) return;
    setSending(true);
    try {
      const res = await fetch(`/api/offers/${offer.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      alert(t('offers.emailSentSuccess'));
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error');
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/offers" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t('offers.backToList')}
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-gray-500">
            <Loader className="w-6 h-6 animate-spin" />
            <span>{t('offers.loadingOffers')}</span>
          </div>
        ) : error || !offer ? (
          <Card className="p-8 text-center text-gray-600">{error || t('offers.noOffersFound')}</Card>
        ) : (
          <Card className="p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">{offer.offerNumber}</p>
                <h1 className="text-xl font-semibold text-gray-900 mt-1">{offer.title}</h1>
                <p className="text-sm text-gray-600 mt-2">{offer.client}</p>
              </div>
              {statusBadge()}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
              <div>
                <p className="text-gray-500">{t('offers.date')}</p>
                <p>{new Date(offer.offerDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-500">{t('offers.totalAmount')}</p>
                <p className="font-medium">
                  {offer.currency === 'eur' ? '€' : offer.currency === 'usd' ? '$' : ''}
                  {offer.totalAmount?.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t('offers.items')}</p>
                <p>{Array.isArray(offer.items) ? offer.items.length : 0}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                {t('offers.downloadPdf')}
              </Button>
              {canEmail && (
                <Button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={sending}
                  className="bg-gradient-to-r from-red-500 to-purple-600 text-white"
                >
                  {sending ? (
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  {t('offers.sendToClient')}
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
