'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Lock, Mail, LogIn, Loader2, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import Logo from '@/../public/logo.svg';
import { useAppSelector } from '@/store/hooks';
import { selectSettingsForShell } from '@/store/selectors/settingsSelectors';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resolveLoginError(code: string, t: (key: string) => string): string {
  const key = `auth.errors.${code}`;
  const msg = t(key);
  if (msg !== key) return msg;
  if (code.includes(' ')) return code;
  return t('auth.loginFailed');
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const { t } = useTranslation();
  const shell = useAppSelector(selectSettingsForShell);
  const companyTitle = shell.companyDisplayName?.trim() || t('header.izoCrm');
  const headline = shell.tagline?.trim() || t('header.constructionSystem');
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t('auth.invalidEmail'));
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError(t('auth.invalidEmail'));
      return;
    }
    if (!password) {
      setError(t('auth.passwordRequired'));
      return;
    }

    setIsLoading(true);
    try {
      await onLogin(trimmedEmail, password);
    } catch (err) {
      const code = err instanceof Error ? err.message : 'LOGIN_FAILED';
      setError(resolveLoginError(code, t));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-lg border border-gray-100">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-20 h-20 bg-brand-gradient rounded-2xl flex items-center justify-center shadow-lg p-2">
              {shell.logoUrl?.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic S3 / CDN URL from settings
                <img src={shell.logoUrl.trim()} alt="" className="h-16 w-16 object-contain" />
              ) : (
                <Image src={Logo} width={64} height={64} alt="" />
              )}
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">{companyTitle}</h1>
          <p className="text-gray-600 text-sm">{headline}</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <Label className="font-medium text-gray-900">{t('auth.email')}</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                type="email"
                name="email"
                autoComplete="email"
                placeholder={t('auth.enterEmail')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={isLoading}
                aria-invalid={!!error}
              />
            </div>
          </div>

          <div>
            <Label className="font-medium text-gray-900">{t('auth.password')}</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder={t('auth.enterPassword')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-11"
                disabled={isLoading}
                aria-invalid={!!error}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                onClick={() => setShowPassword((v) => !v)}
                disabled={isLoading}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              aria-live="polite"
              className="p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <p className="text-sm text-red-800">{error}</p>
            </div>
          ) : null}

          <Button
            type="submit"
            variant="default"
            size="lg"
            className="w-full h-11 text-base shadow-md disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" aria-hidden />
                <span>{t('auth.loggingIn')}</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2 shrink-0" aria-hidden />
                <span>{t('auth.login')}</span>
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
