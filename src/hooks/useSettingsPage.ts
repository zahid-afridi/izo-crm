'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createSettings,
  type CompanySetting,
  defaultSettings,
  fetchSettings,
  updateSettings,
  uploadSettingsLogo,
} from '@/store/slices/settingsSlice';
import {
  selectSettingsData,
  selectSettingsLoading,
  selectSettingsSaving,
  selectSettingsUploadingLogo,
} from '@/store/selectors/settingsSelectors';
import { BRAND_HEX, DEFAULT_SESSION_MINUTES } from '@/lib/settings/defaults';
import {
  safeHex,
  snapshotFromDraft,
  snapshotFromSaved,
  snapshotsEqual,
} from '@/lib/settings/formUtils';

const EMPTY_BRANDING = {
  companyDisplayName: '',
  tagline: '',
  brandColorStart: BRAND_HEX.start,
  brandColorMid: BRAND_HEX.mid,
  brandColorEnd: BRAND_HEX.end,
  logoUrl: '',
} as const;

function rejectMessage(payload: unknown, fallback: string): string {
  return typeof payload === 'string' ? payload : fallback;
}

export function useSettingsPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const saved = useAppSelector(selectSettingsData);
  const loading = useAppSelector(selectSettingsLoading);
  const saving = useAppSelector(selectSettingsSaving);
  const uploadingLogo = useAppSelector(selectSettingsUploadingLogo);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [companyDisplayName, setCompanyDisplayName] = useState('');
  const [tagline, setTagline] = useState('');
  const [brandColorStart, setBrandColorStart] = useState<string>(BRAND_HEX.start);
  const [brandColorMid, setBrandColorMid] = useState<string>(BRAND_HEX.mid);
  const [brandColorEnd, setBrandColorEnd] = useState<string>(BRAND_HEX.end);
  const [mailerEmail, setMailerEmail] = useState('');
  const [mailerAppPassword, setMailerAppPassword] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(String(DEFAULT_SESSION_MINUTES));
  const [logoUrl, setLogoUrl] = useState('');
  const [hydratedId, setHydratedId] = useState<string | null>(null);
  const [resetBrandingOpen, setResetBrandingOpen] = useState(false);

  const applySourceToForm = useCallback((source: CompanySetting) => {
    setCompanyDisplayName(source.companyDisplayName || '');
    setTagline(source.tagline || '');
    setBrandColorStart(source.brandColorStart || BRAND_HEX.start);
    setBrandColorMid(source.brandColorMid || BRAND_HEX.mid);
    setBrandColorEnd(source.brandColorEnd || BRAND_HEX.end);
    setLogoUrl(source.logoUrl || '');
    setMailerEmail(source.mailerEmail || '');
    setMailerAppPassword(source.mailerAppPassword || '');
    setLegalName(source.legalName || '');
    setTaxId(source.taxId || '');
    setAddress(source.address || '');
    setPhone(source.phone || '');
    setCompanyEmail(source.companyEmail || '');
    setWebsite(source.website || '');
    setMaintenanceMode(Boolean(source.maintenanceMode));
    setSessionTimeout(String(source.sessionTimeout || DEFAULT_SESSION_MINUTES));
  }, []);

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    if (loading) return;
    const id = saved?.id ?? '__none__';
    if (hydratedId === id) return;
    applySourceToForm(saved || defaultSettings);
    setHydratedId(id);
  }, [loading, saved, hydratedId, applySourceToForm]);

  const buildPayload = useCallback(
    (overrides: Partial<CompanySetting> = {}): CompanySetting => ({
      id: saved?.id,
      companyDisplayName,
      tagline,
      brandColorStart: safeHex(brandColorStart),
      brandColorMid: safeHex(brandColorMid),
      brandColorEnd: safeHex(brandColorEnd),
      logoUrl,
      mailerEmail,
      mailerAppPassword,
      legalName,
      taxId,
      address,
      phone,
      companyEmail,
      website,
      maintenanceMode,
      sessionTimeout: Number(sessionTimeout) || DEFAULT_SESSION_MINUTES,
      ...overrides,
    }),
    [
      saved?.id,
      companyDisplayName,
      tagline,
      brandColorStart,
      brandColorMid,
      brandColorEnd,
      logoUrl,
      mailerEmail,
      mailerAppPassword,
      legalName,
      taxId,
      address,
      phone,
      companyEmail,
      website,
      maintenanceMode,
      sessionTimeout,
    ]
  );

  const draftSnapshot = useMemo(
    () =>
      snapshotFromDraft({
        companyDisplayName,
        tagline,
        brandColorStart,
        brandColorMid,
        brandColorEnd,
        logoUrl,
        mailerEmail,
        mailerAppPassword,
        legalName,
        taxId,
        address,
        phone,
        companyEmail,
        website,
        maintenanceMode,
        sessionTimeout,
      }),
    [
      companyDisplayName,
      tagline,
      brandColorStart,
      brandColorMid,
      brandColorEnd,
      logoUrl,
      mailerEmail,
      mailerAppPassword,
      legalName,
      taxId,
      address,
      phone,
      companyEmail,
      website,
      maintenanceMode,
      sessionTimeout,
    ]
  );

  const savedSnapshot = useMemo(
    () => snapshotFromSaved(saved || defaultSettings),
    [saved]
  );

  const hasUnsavedChanges = !snapshotsEqual(draftSnapshot, savedSnapshot);
  const saveDisabled = loading || saving || !hasUnsavedChanges;

  const restoreFromSaved = useCallback(() => {
    applySourceToForm(saved || defaultSettings);
  }, [saved, applySourceToForm]);

  const handleSave = async () => {
    const payload = buildPayload();
    const result = saved?.id ? await dispatch(updateSettings(payload)) : await dispatch(createSettings(payload));
    if (updateSettings.fulfilled.match(result) || createSettings.fulfilled.match(result)) {
      toast.success('Settings saved successfully');
      return;
    }
    toast.error(rejectMessage(result.payload, 'Failed to save settings'));
  };

  const handleRemoveLogo = async () => {
    if (!logoUrl) return;
    if (!saved?.id) {
      setLogoUrl('');
      return;
    }
    const result = await dispatch(updateSettings(buildPayload({ logoUrl: '' })));
    if (updateSettings.fulfilled.match(result)) {
      setLogoUrl('');
      toast.success('Logo removed');
      return;
    }
    toast.error(rejectMessage(result.payload, 'Failed to remove logo'));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be 2MB or less');
      e.target.value = '';
      return;
    }
    const result = await dispatch(uploadSettingsLogo(file));
    if (!uploadSettingsLogo.fulfilled.match(result)) {
      toast.error(rejectMessage(result.payload, 'Failed to upload logo'));
      e.target.value = '';
      return;
    }
    const nextUrl = result.payload.url;
    setLogoUrl(nextUrl);
    if (saved?.id) {
      const saveResult = await dispatch(updateSettings(buildPayload({ logoUrl: nextUrl })));
      if (updateSettings.fulfilled.match(saveResult)) {
        toast.success('Logo updated');
      } else {
        toast.error(rejectMessage(saveResult.payload, 'Failed to update logo'));
      }
    } else {
      toast.success('Logo uploaded');
    }
    e.target.value = '';
  };

  const hasColorChanges =
    safeHex(brandColorStart).toUpperCase() !== BRAND_HEX.start.toUpperCase() ||
    safeHex(brandColorMid).toUpperCase() !== BRAND_HEX.mid.toUpperCase() ||
    safeHex(brandColorEnd).toUpperCase() !== BRAND_HEX.end.toUpperCase();

  const resetColorsOnly = () => {
    setBrandColorStart(BRAND_HEX.start);
    setBrandColorMid(BRAND_HEX.mid);
    setBrandColorEnd(BRAND_HEX.end);
  };

  const confirmResetBranding = async () => {
    setCompanyDisplayName(EMPTY_BRANDING.companyDisplayName);
    setTagline(EMPTY_BRANDING.tagline);
    setBrandColorStart(EMPTY_BRANDING.brandColorStart);
    setBrandColorMid(EMPTY_BRANDING.brandColorMid);
    setBrandColorEnd(EMPTY_BRANDING.brandColorEnd);
    setLogoUrl(EMPTY_BRANDING.logoUrl);

    if (!saved?.id) return;

    const result = await dispatch(
      updateSettings(
        buildPayload({
          companyDisplayName: EMPTY_BRANDING.companyDisplayName,
          tagline: EMPTY_BRANDING.tagline,
          brandColorStart: EMPTY_BRANDING.brandColorStart,
          brandColorMid: EMPTY_BRANDING.brandColorMid,
          brandColorEnd: EMPTY_BRANDING.brandColorEnd,
          logoUrl: EMPTY_BRANDING.logoUrl,
        })
      )
    );
    if (updateSettings.fulfilled.match(result)) {
      toast.success('Branding reset to default');
      return;
    }
    toast.error(rejectMessage(result.payload, 'Failed to reset branding'));
  };

  const notifyTestNotReady = () => toast.info(t('settings.messages.uiOnly'));

  return {
    t,
    saved,
    loading,
    saving,
    uploadingLogo,
    logoInputRef,
    fields: {
      companyDisplayName,
      setCompanyDisplayName,
      tagline,
      setTagline,
      brandColorStart,
      setBrandColorStart,
      brandColorMid,
      setBrandColorMid,
      brandColorEnd,
      setBrandColorEnd,
      mailerEmail,
      setMailerEmail,
      mailerAppPassword,
      setMailerAppPassword,
      legalName,
      setLegalName,
      taxId,
      setTaxId,
      address,
      setAddress,
      phone,
      setPhone,
      companyEmail,
      setCompanyEmail,
      website,
      setWebsite,
      maintenanceMode,
      setMaintenanceMode,
      sessionTimeout,
      setSessionTimeout,
      logoUrl,
    },
    flags: {
      hasUnsavedChanges,
      saveDisabled,
      hasColorChanges,
    },
    dialogs: { resetBrandingOpen, setResetBrandingOpen },
    handlers: {
      handleSave,
      restoreFromSaved,
      handleRemoveLogo,
      handleLogoUpload,
      resetColorsOnly,
      confirmResetBranding,
      notifyTestNotReady,
    },
  };
}
