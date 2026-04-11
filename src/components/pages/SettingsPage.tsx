'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
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
import {
  Palette,
  Mail,
  Building2,
  SlidersHorizontal,
  Shield,
  Upload,
} from 'lucide-react';

function safeHex(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim()) ? value.trim() : '#000000';
}

function BrandColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-gray-700">{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          value={safeHex(value)}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-md border border-gray-200 bg-white p-1"
          aria-label={label}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#RRGGBB"
          className="max-w-[140px] font-mono text-sm"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();

  const [companyDisplayName, setCompanyDisplayName] = useState('');
  const [tagline, setTagline] = useState('');
  /** Default hex values match app CSS brand gradient (--brand-start / --brand-mid / --brand-end). */
  const [brandColorStart, setBrandColorStart] = useState('#9F001B');
  const [brandColorMid, setBrandColorMid] = useState('#58143B');
  const [brandColorEnd, setBrandColorEnd] = useState('#1B2556');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpEncryption, setSmtpEncryption] = useState('tls');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('60');

  const notifyUiOnly = () => {
    toast.info(t('settings.messages.uiOnly'));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
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
      </div>

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
          <TabsTrigger value="system" className="flex items-center gap-2 data-[state=active]:bg-white">
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('settings.tabs.system')}</span>
          </TabsTrigger>
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
                    value={companyDisplayName}
                    onChange={(e) => setCompanyDisplayName(e.target.value)}
                    placeholder={t('settings.placeholders.companyName')}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>{t('settings.branding.tagline')}</Label>
                  <Input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
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
                      value={brandColorStart}
                      onChange={setBrandColorStart}
                    />
                    <BrandColorRow
                      label={t('settings.branding.colorMid')}
                      value={brandColorMid}
                      onChange={setBrandColorMid}
                    />
                    <BrandColorRow
                      label={t('settings.branding.colorEnd')}
                      value={brandColorEnd}
                      onChange={setBrandColorEnd}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700">{t('settings.branding.gradientPreview')}</Label>
                    <div
                      className="mt-2 h-14 w-full max-w-2xl rounded-lg border border-gray-200 shadow-inner"
                      style={{
                        background: `linear-gradient(135deg, ${safeHex(brandColorStart)}, ${safeHex(brandColorMid)}, ${safeHex(brandColorEnd)})`,
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-2">{t('settings.branding.colorsPreviewHint')}</p>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <Label>{t('settings.branding.logo')}</Label>
                  <p className="text-xs text-gray-500 mb-2">{t('settings.branding.logoHint')}</p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex h-24 w-full max-w-[200px] items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/80 text-gray-400">
                      <span className="text-xs text-center px-2">{t('settings.branding.logoPreview')}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={notifyUiOnly}>
                        <Upload className="h-4 w-4" />
                        {t('settings.branding.chooseFile')}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={notifyUiOnly}>
                        {t('settings.branding.removeLogo')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={notifyUiOnly}>
                  {t('settings.actions.discard')}
                </Button>
                <Button type="button" className="bg-brand-gradient text-white hover:opacity-95" onClick={notifyUiOnly}>
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
                  <Label>{t('settings.email.smtpHost')}</Label>
                  <Input
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder={t('settings.placeholders.smtpHost')}
                  />
                </div>
                <div>
                  <Label>{t('settings.email.smtpPort')}</Label>
                  <Input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" />
                </div>
                <div>
                  <Label>{t('settings.email.encryption')}</Label>
                  <Select value={smtpEncryption} onValueChange={setSmtpEncryption}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tls">TLS</SelectItem>
                      <SelectItem value="ssl">SSL</SelectItem>
                      <SelectItem value="none">{t('settings.email.encryptionNone')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>{t('settings.email.smtpUser')}</Label>
                  <Input
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder={t('settings.placeholders.smtpUser')}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>{t('settings.email.smtpPassword')}</Label>
                  <Input
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <Label>{t('settings.email.fromName')}</Label>
                  <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder={t('settings.placeholders.fromName')} />
                </div>
                <div>
                  <Label>{t('settings.email.fromEmail')}</Label>
                  <Input
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder={t('settings.placeholders.fromEmail')}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={notifyUiOnly}>
                  {t('settings.email.testConnection')}
                </Button>
                <Button type="button" className="bg-brand-gradient text-white hover:opacity-95" onClick={notifyUiOnly}>
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
                  <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder={t('settings.placeholders.legalName')} />
                </div>
                <div>
                  <Label>{t('settings.company.taxId')}</Label>
                  <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder={t('settings.placeholders.taxId')} />
                </div>
                <div className="sm:col-span-2">
                  <Label>{t('settings.company.address')}</Label>
                  <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder={t('settings.placeholders.address')} />
                </div>
                <div>
                  <Label>{t('settings.company.phone')}</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('settings.placeholders.phone')} />
                </div>
                <div>
                  <Label>{t('settings.company.email')}</Label>
                  <Input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder={t('settings.placeholders.companyEmail')} />
                </div>
                <div className="sm:col-span-2">
                  <Label>{t('settings.company.website')}</Label>
                  <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={notifyUiOnly}>
                  {t('settings.actions.discard')}
                </Button>
                <Button type="button" className="bg-brand-gradient text-white hover:opacity-95" onClick={notifyUiOnly}>
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
                  <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
                </div>
                <div>
                  <Label>{t('settings.system.sessionTimeout')}</Label>
                  <p className="text-xs text-gray-500 mb-2">{t('settings.system.sessionTimeoutHint')}</p>
                  <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
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
                <Button type="button" className="bg-brand-gradient text-white hover:opacity-95" onClick={notifyUiOnly}>
                  {t('settings.actions.save')}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
