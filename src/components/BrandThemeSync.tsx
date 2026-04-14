'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchBrandingSettings } from '@/store/slices/settingsSlice';
import { selectSettingsForShell } from '@/store/selectors/settingsSelectors';
import { applyBrandColorsToDocument } from '@/lib/brand-theme';

/**
 * Loads public branding into Redux and applies --brand-hex-* / --brand-* HSL on :root (globals.css).
 * Re-runs when settings slice updates (e.g. after admin saves on Settings page).
 */
export function BrandThemeSync() {
  const dispatch = useAppDispatch();
  const shell = useAppSelector(selectSettingsForShell);

  useEffect(() => {
    dispatch(fetchBrandingSettings());
  }, [dispatch]);

  useEffect(() => {
    applyBrandColorsToDocument({
      brandColorStart: shell.brandColorStart,
      brandColorMid: shell.brandColorMid,
      brandColorEnd: shell.brandColorEnd,
    });
  }, [shell.brandColorStart, shell.brandColorMid, shell.brandColorEnd]);

  return null;
}
