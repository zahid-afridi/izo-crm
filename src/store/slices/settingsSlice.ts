import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { BRAND_HEX, DEFAULT_SESSION_MINUTES } from '@/lib/settings/defaults';

export interface CompanySetting {
  id?: string;
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
}

export interface SettingsState {
  data: CompanySetting | null;
  isLoading: boolean;
  isSaving: boolean;
  isUploadingLogo: boolean;
  isDeleting: boolean;
  isInitialized: boolean;
  error: string | null;
}

const defaultSettings: CompanySetting = {
  companyDisplayName: '',
  tagline: '',
  brandColorStart: BRAND_HEX.start,
  brandColorMid: BRAND_HEX.mid,
  brandColorEnd: BRAND_HEX.end,
  logoUrl: '',
  mailerEmail: '',
  mailerAppPassword: '',
  legalName: '',
  taxId: '',
  address: '',
  phone: '',
  companyEmail: '',
  website: '',
  maintenanceMode: false,
  sessionTimeout: DEFAULT_SESSION_MINUTES,
};

const initialState: SettingsState = {
  data: null,
  isLoading: false,
  isSaving: false,
  isUploadingLogo: false,
  isDeleting: false,
  isInitialized: false,
  error: null,
};

async function readApiError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return typeof (data as { error?: string }).error === 'string' ? (data as { error: string }).error : fallback;
}

export function normalizeSettings(settings?: Partial<CompanySetting> | null): CompanySetting {
  if (!settings) return { ...defaultSettings };
  return {
    id: settings.id,
    companyDisplayName: settings.companyDisplayName ?? '',
    tagline: settings.tagline ?? '',
    brandColorStart: settings.brandColorStart ?? defaultSettings.brandColorStart,
    brandColorMid: settings.brandColorMid ?? defaultSettings.brandColorMid,
    brandColorEnd: settings.brandColorEnd ?? defaultSettings.brandColorEnd,
    logoUrl: settings.logoUrl ?? '',
    mailerEmail: settings.mailerEmail ?? '',
    mailerAppPassword: settings.mailerAppPassword ?? '',
    legalName: settings.legalName ?? '',
    taxId: settings.taxId ?? '',
    address: settings.address ?? '',
    phone: settings.phone ?? '',
    companyEmail: settings.companyEmail ?? '',
    website: settings.website ?? '',
    maintenanceMode: Boolean(settings.maintenanceMode),
    sessionTimeout: Number(settings.sessionTimeout || DEFAULT_SESSION_MINUTES),
  };
}

/** Public branding (login + shell); no auth. Merges into `data` for logo/name/colors. */
export const fetchBrandingSettings = createAsyncThunk(
  'settings/fetchBrandingSettings',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/settings/branding');
      if (!res.ok) {
        return rejectWithValue(await readApiError(res, 'Failed to fetch branding'));
      }
      const data = await res.json();
      const b = data.branding as {
        logoUrl: string | null;
        companyDisplayName: string | null;
        tagline: string | null;
        brandColorStart: string;
        brandColorMid: string;
        brandColorEnd: string;
      };
      return normalizeSettings({
        logoUrl: b.logoUrl ?? '',
        companyDisplayName: b.companyDisplayName ?? '',
        tagline: b.tagline ?? '',
        brandColorStart: b.brandColorStart,
        brandColorMid: b.brandColorMid,
        brandColorEnd: b.brandColorEnd,
      });
    } catch {
      return rejectWithValue('Failed to fetch branding');
    }
  }
);

export const fetchSettings = createAsyncThunk('settings/fetchSettings', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/settings', { credentials: 'include' });
    if (!res.ok) {
      return rejectWithValue(await readApiError(res, 'Failed to fetch settings'));
    }
    const data = await res.json();
    return normalizeSettings(data.settings || null);
  } catch {
    return rejectWithValue('Failed to fetch settings');
  }
});

export const createSettings = createAsyncThunk(
  'settings/createSettings',
  async (payload: CompanySetting, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        return rejectWithValue(await readApiError(res, 'Failed to create settings'));
      }
      const data = await res.json();
      return normalizeSettings(data.settings || null);
    } catch {
      return rejectWithValue('Failed to create settings');
    }
  }
);

export const updateSettings = createAsyncThunk(
  'settings/updateSettings',
  async (payload: CompanySetting, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        return rejectWithValue(await readApiError(res, 'Failed to save settings'));
      }
      const data = await res.json();
      return normalizeSettings(data.settings || null);
    } catch {
      return rejectWithValue('Failed to save settings');
    }
  }
);

export const deleteSettings = createAsyncThunk('settings/deleteSettings', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/settings', {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      return rejectWithValue(await readApiError(res, 'Failed to delete settings'));
    }
    return { ...defaultSettings };
  } catch {
    return rejectWithValue('Failed to delete settings');
  }
});

export const uploadSettingsLogo = createAsyncThunk(
  'settings/uploadSettingsLogo',
  async (file: File, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/settings/logo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        return rejectWithValue(await readApiError(res, 'Failed to upload logo'));
      }

      const data = await res.json();
      return {
        url: data.url as string,
      };
    } catch {
      return rejectWithValue('Failed to upload logo');
    }
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearSettingsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Public branding (login + shell)
      .addCase(fetchBrandingSettings.fulfilled, (state, action) => {
        const merged = normalizeSettings({
          ...defaultSettings,
          ...state.data,
          ...action.payload,
        });
        state.data = merged;
        state.isInitialized = true;
      })
      .addCase(fetchBrandingSettings.rejected, (state) => {
        if (!state.data) {
          state.data = normalizeSettings(null);
        }
        state.isInitialized = true;
      })
      // Admin: full document
      .addCase(fetchSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.data = action.payload;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createSettings.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(createSettings.fulfilled, (state, action) => {
        state.isSaving = false;
        state.data = action.payload;
      })
      .addCase(createSettings.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })
      .addCase(updateSettings.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.isSaving = false;
        state.data = action.payload;
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })
      .addCase(deleteSettings.pending, (state) => {
        state.isDeleting = true;
        state.error = null;
      })
      .addCase(deleteSettings.fulfilled, (state, action) => {
        state.isDeleting = false;
        state.data = action.payload;
      })
      .addCase(deleteSettings.rejected, (state, action) => {
        state.isDeleting = false;
        state.error = action.payload as string;
      })
      // Logo file upload (URL then merged on save in UI when no row yet)
      .addCase(uploadSettingsLogo.pending, (state) => {
        state.isUploadingLogo = true;
        state.error = null;
      })
      .addCase(uploadSettingsLogo.fulfilled, (state, action) => {
        state.isUploadingLogo = false;
        if (!state.data) {
          state.data = { ...defaultSettings, logoUrl: action.payload.url };
        } else {
          state.data.logoUrl = action.payload.url;
        }
      })
      .addCase(uploadSettingsLogo.rejected, (state, action) => {
        state.isUploadingLogo = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearSettingsError } = settingsSlice.actions;
export { defaultSettings };
export default settingsSlice.reducer;
