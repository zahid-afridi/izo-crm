import { RootState } from '../store';
import { defaultSettings, normalizeSettings, type CompanySetting } from '../slices/settingsSlice';

const s = (state: RootState) => state.settings;

export const selectSettingsData = (state: RootState) => s(state).data;

/** Merged defaults + slice data for sidebar/login (logo, name, tagline, colors). */
export const selectSettingsForShell = (state: RootState): CompanySetting => {
  const data = s(state).data;
  return data ? normalizeSettings(data) : normalizeSettings(null);
};
export const selectSettingsLoading = (state: RootState) => s(state).isLoading;
export const selectSettingsSaving = (state: RootState) => s(state).isSaving;
export const selectSettingsUploadingLogo = (state: RootState) => s(state).isUploadingLogo;
export const selectSettingsDeleting = (state: RootState) => s(state).isDeleting;
export const selectSettingsInitialized = (state: RootState) => s(state).isInitialized;
export const selectSettingsError = (state: RootState) => s(state).error;
