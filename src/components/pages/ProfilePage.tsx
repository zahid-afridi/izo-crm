'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSessionUser, userFromApiResponse } from '@/store/slices/authSlice';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export function ProfilePage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const displayName = (user?.fullName || user?.username || '').trim() || 'User';

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const avatarSrc = useMemo(() => {
    if (previewUrl) return previewUrl;
    return user?.profile || null;
  }, [previewUrl, user?.profile]);

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.imageTypeError'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.imageSizeError'));
      return;
    }
    setPendingFile(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    e.target.value = '';
  };

  const handleSaveImage = async () => {
    if (!pendingFile) {
      toast.message(t('profile.pickImageFirst'));
      return;
    }
    setSavingImage(true);
    try {
      const formData = new FormData();
      formData.append('profileImage', pendingFile);
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : t('profile.updateFailed'));
        return;
      }
      toast.success(t('profile.imageUpdated'));
      setPendingFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      if (data.user) {
        dispatch(setSessionUser(userFromApiResponse(data.user)));
      }
    } finally {
      setSavingImage(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('profile.passwordFieldsRequired'));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t('profile.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('profile.passwordMismatch'));
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : t('profile.updateFailed'));
        return;
      }
      toast.success(t('profile.passwordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (data.user) {
        dispatch(setSessionUser(userFromApiResponse(data.user)));
      }
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{t('profile.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('profile.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card className="p-6 shadow-sm border border-gray-200 bg-white rounded-xl h-full">
        <div className="space-y-2 mb-4">
          <h2 className="text-base font-semibold text-gray-900">{t('profile.photoSection')}</h2>
          <p className="text-sm text-gray-500">{t('profile.photoHint')}</p>
        </div>
        <Separator className="mb-6" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="relative flex-shrink-0 mx-auto sm:mx-0">
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-md ring-2 ring-brand-100 bg-brand-gradient flex items-center justify-center">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element -- external S3 / blob URLs
                <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-semibold text-white">{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <label
              htmlFor="profile-avatar-input"
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center cursor-pointer hover:bg-gray-50"
            >
              <Camera className="w-4 h-4 text-gray-700" />
              <input
                id="profile-avatar-input"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onPickImage}
              />
            </label>
          </div>
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{displayName}</span>
              {user.username ? (
                <span className="text-gray-500">
                  {' '}
                  · @{user.username}
                </span>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('profile-avatar-input')?.click()}>
                {t('profile.choosePhoto')}
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-brand-gradient text-white hover:opacity-90"
                disabled={!pendingFile || savingImage}
                onClick={handleSaveImage}
              >
                {savingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {t('profile.savePhoto')}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 shadow-sm border border-gray-200 bg-white rounded-xl h-full">
        <div className="space-y-2 mb-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-600" />
            {t('profile.passwordSection')}
          </h2>
          <p className="text-sm text-gray-500">{t('profile.passwordHint')}</p>
        </div>
        <Separator className="mb-6" />
        <form onSubmit={handleChangePassword} className="space-y-4 w-full">
          <div className="space-y-2">
            <Label htmlFor="current-password">{t('profile.currentPassword')}</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">{t('profile.newPassword')}</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t('profile.confirmPassword')}</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="bg-brand-gradient text-white hover:opacity-90" disabled={savingPassword}>
            {savingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {t('profile.updatePassword')}
          </Button>
        </form>
      </Card>
      </div>
    </div>
  );
}
