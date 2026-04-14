'use client';

import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { BrandColorRow } from '@/components/settings/BrandColorRow';
import { useSettingsPage } from '@/hooks/useSettingsPage';
import { safeHex } from '@/lib/settings/formUtils';
import { Palette, Mail, Building2, SlidersHorizontal, Shield, Loader2, Upload } from 'lucide-react';

export function SettingsPage() {
  const { t } = useTranslation();
  const u = useSettingsPage();
  const f = u.fields;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">{t('settings.title')}</h1>
            <Badge variant="secondary" className="gap-1 font-normal">
              <Shield className="h-3 w-3" />
              {t('settings.adminOnly')}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">{t('settings.subtitle')}</p>
        </div>
      </header>

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-2 h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="branding" className="flex items-center gap-2 data-[state=active]:bg-white">
            <Palette className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('settings.tabs.branding')}</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2 data-[state=active]:bg-white">
            <Mail className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('settings.tabs.email')}</span>
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2 data-[state=active]:bg-white">
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('settings.tabs.company')}</span>
          </TabsTrigger>
          {/* <TabsTrigger value="system" className="flex items-center gap-2 data-[state=active]:bg-white">
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('settings.tabs.system')}</span>
          </TabsTrigger> */}
        </TabsList>

        <TabsContent value="branding" className="mt-4">
          <Card className="p-6 border-gray-200 shadow-sm">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">{t('settings.branding.title')}</h2>
                <p className="text-sm text-gray-500">{t('settings.branding.description')}</p>
              </div>
              <Separator />
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>{t('settings.branding.companyDisplayName')}</Label>
                  <Input
                    value={f.companyDisplayName}
                    onChange={(e) => f.setCompanyDisplayName(e.target.value)}
                    placeholder={t('settings.placeholders.companyName')}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>{t('settings.branding.tagline')}</Label>
                  <Input
                    value={f.tagline}
                    onChange={(e) => f.setTagline(e.target.value)}
                    placeholder={t('settings.placeholders.tagline')}
                  />
                </div>

                <div className="sm:col-span-2 space-y-4 rounded-lg border border-gray-100 bg-gray-50/40 p-4">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">{t('settings.branding.colorsTitle')}</h3>
                    <p className="text-sm text-gray-500">{t('settings.branding.colorsDescription')}</p>
                  </div>
                  <Separator />
                  <div className="grid gap-6 sm:grid-cols-2">
                    <BrandColorRow
                      label={t('settings.branding.colorStart')}
                      value={f.brandColorStart}
                      onChange={f.setBrandColorStart}
                    />
                    <BrandColorRow
                      label={t('settings.branding.colorMid')}
                      value={f.brandColorMid}
                      onChange={f.setBrandColorMid}
                    />
                    <BrandColorRow
                      label={t('settings.branding.colorEnd')}
                      value={f.brandColorEnd}
                      onChange={f.setBrandColorEnd}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700">{t('settings.branding.gradientPreview')}</Label>
                    <div
                      className="mt-2 h-14 w-full max-w-2xl rounded-lg border border-gray-200 shadow-inner"
                      style={{
                        background: `linear-gradient(135deg, ${safeHex(f.brandColorStart)}, ${safeHex(f.brandColorMid)}, ${safeHex(f.brandColorEnd)})`,
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-2">{t('settings.branding.colorsPreviewHint')}</p>
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={u.handlers.resetColorsOnly}
                        disabled={!u.flags.hasColorChanges}
                      >
                        Reset colors
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <Label>{t('settings.branding.logo')}</Label>
                  <p className="text-xs text-gray-500 mb-2">{t('settings.branding.logoHint')}</p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex h-24 w-full max-w-[200px] items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/80 text-gray-400">
                      {f.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- S3 / CDN
                        <img src={f.logoUrl} alt="" className="h-full w-full rounded-lg object-contain p-2" />
                      ) : (
                        <span className="text-xs text-center px-2">{t('settings.branding.logoPreview')}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={u.logoInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={u.handlers.handleLogoUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => u.logoInputRef.current?.click()}
                        disabled={u.uploadingLogo}
                      >
                        {u.uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {t('settings.branding.chooseFile')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={u.handlers.handleRemoveLogo}
                        disabled={u.uploadingLogo || u.saving}
                      >
                        {t('settings.branding.removeLogo')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={u.handlers.restoreFromSaved}
                  disabled={!u.flags.hasUnsavedChanges || u.saving}
                >
                  {t('settings.actions.discard')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => u.dialogs.setResetBrandingOpen(true)}
                  disabled={u.saving || u.loading}
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  className="bg-brand-gradient text-white hover:opacity-95"
                  onClick={u.handlers.handleSave}
                  disabled={u.flags.saveDisabled}
                >
                  {u.saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {t('settings.actions.save')}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <Card className="p-6 border-gray-200 shadow-sm">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">{t('settings.email.title')}</h2>
                <p className="text-sm text-gray-500">{t('settings.email.description')}</p>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>{t('settings.email.email')}</Label>
                  <Input
                    type="email"
                    value={f.mailerEmail}
                    onChange={(e) => f.setMailerEmail(e.target.value)}
                    placeholder={t('settings.placeholders.mailerEmail')}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>{t('settings.email.emailAppPassword')}</Label>
                  <Input
                    type="password"
                    value={f.mailerAppPassword}
                    onChange={(e) => f.setMailerAppPassword(e.target.value)}
                    placeholder={t('settings.placeholders.mailerAppPassword')}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={u.handlers.notifyTestNotReady}>
                  {t('settings.email.testConnection')}
                </Button>
                <Button
                  type="button"
                  className="bg-brand-gradient text-white hover:opacity-95"
                  onClick={u.handlers.handleSave}
                  disabled={u.flags.saveDisabled}
                >
                  {u.saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {t('settings.actions.save')}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="mt-4">
          <Card className="p-6 border-gray-200 shadow-sm">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">{t('settings.company.title')}</h2>
                <p className="text-sm text-gray-500">{t('settings.company.description')}</p>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t('settings.company.legalName')}</Label>
                  <Input value={f.legalName} onChange={(e) => f.setLegalName(e.target.value)} placeholder={t('settings.placeholders.legalName')} />
                </div>
                <div>
                  <Label>{t('settings.company.taxId')}</Label>
                  <Input value={f.taxId} onChange={(e) => f.setTaxId(e.target.value)} placeholder={t('settings.placeholders.taxId')} />
                </div>
                <div className="sm:col-span-2">
                  <Label>{t('settings.company.address')}</Label>
                  <Textarea value={f.address} onChange={(e) => f.setAddress(e.target.value)} rows={3} placeholder={t('settings.placeholders.address')} />
                </div>
                <div>
                  <Label>{t('settings.company.phone')}</Label>
                  <Input value={f.phone} onChange={(e) => f.setPhone(e.target.value)} placeholder={t('settings.placeholders.phone')} />
                </div>
                <div>
                  <Label>{t('settings.company.email')}</Label>
                  <Input
                    type="email"
                    value={f.companyEmail}
                    onChange={(e) => f.setCompanyEmail(e.target.value)}
                    placeholder={t('settings.placeholders.companyEmail')}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>{t('settings.company.website')}</Label>
                  <Input value={f.website} onChange={(e) => f.setWebsite(e.target.value)} placeholder="https://" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={u.handlers.restoreFromSaved}
                  disabled={!u.flags.hasUnsavedChanges || u.saving}
                >
                  {t('settings.actions.discard')}
                </Button>
                <Button
                  type="button"
                  className="bg-brand-gradient text-white hover:opacity-95"
                  onClick={u.handlers.handleSave}
                  disabled={u.flags.saveDisabled}
                >
                  {u.saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {t('settings.actions.save')}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-4">
          <Card className="p-6 border-gray-200 shadow-sm">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">{t('settings.system.title')}</h2>
                <p className="text-sm text-gray-500">{t('settings.system.description')}</p>
              </div>
              <Separator />
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                  <div>
                    <p className="font-medium text-gray-900">{t('settings.system.maintenanceMode')}</p>
                    <p className="text-sm text-gray-500">{t('settings.system.maintenanceHint')}</p>
                  </div>
                  <Switch checked={f.maintenanceMode} onCheckedChange={f.setMaintenanceMode} />
                </div>
                <div>
                  <Label>{t('settings.system.sessionTimeout')}</Label>
                  <p className="text-xs text-gray-500 mb-2">{t('settings.system.sessionTimeoutHint')}</p>
                  <Select value={f.sessionTimeout} onValueChange={f.setSessionTimeout}>
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 {t('settings.system.minutes')}</SelectItem>
                      <SelectItem value="60">60 {t('settings.system.minutes')}</SelectItem>
                      <SelectItem value="120">120 {t('settings.system.minutes')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  className="bg-brand-gradient text-white hover:opacity-95"
                  onClick={u.handlers.handleSave}
                  disabled={u.flags.saveDisabled}
                >
                  {u.saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {t('settings.actions.save')}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {u.loading ? <p className="text-sm text-gray-500">Loading settings...</p> : null}

      <ConfirmationDialog
        open={u.dialogs.resetBrandingOpen}
        onOpenChange={u.dialogs.setResetBrandingOpen}
        title="Reset branding settings?"
        description="This will reset only Branding tab fields (display name, tagline, colors, and logo) to default values. Email, company profile, and system settings will stay unchanged."
        confirmText="Reset branding"
        cancelText="Cancel"
        onConfirm={() => {
          u.handlers.confirmResetBranding();
          u.dialogs.setResetBrandingOpen(false);
        }}
        variant="destructive"
      />
    </div>
  );
}
