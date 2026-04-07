import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompanyInfo {
  phone: string;
  email: string;
  address: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
  tiktokUrl: string;
  googlePlayUrl: string;
  appStoreUrl: string;
  companyCV?: string;
}

export interface WebsiteSettings {
  websiteTitle: string;
  metaDescription: string;
  metaKeywords: string;
}

export interface WebsiteManagerState {
  products: any[];
  services: any[];
  projects: any[];
  blogs: any[];
  blogCategories: any[];
  videos: any[];
  sliders: any[];
  partnerLogos: any[];
  websiteOrders: any[];
  homepageProducts: any[];
  homepageServices: any[];
  homepageProjects: any[];
  homepageBlogs: any[];
  homepageVideos: any[];
  companyInfo: CompanyInfo | null;
  settings: WebsiteSettings | null;

  loading: {
    products: boolean;
    services: boolean;
    projects: boolean;
    blogs: boolean;
    blogCategories: boolean;
    videos: boolean;
    sliders: boolean;
    partnerLogos: boolean;
    websiteOrders: boolean;
    homepageItems: boolean;
    companyInfo: boolean;
    settings: boolean;
  };

  initialized: {
    products: boolean;
    services: boolean;
    projects: boolean;
    blogs: boolean;
  };

  togglingProductIds: string[];
  togglingServiceIds: string[];
  error: string | null;
}

const initialState: WebsiteManagerState = {
  products: [],
  services: [],
  projects: [],
  blogs: [],
  blogCategories: [],
  videos: [],
  sliders: [],
  partnerLogos: [],
  websiteOrders: [],
  homepageProducts: [],
  homepageServices: [],
  homepageProjects: [],
  homepageBlogs: [],
  homepageVideos: [],
  companyInfo: null,
  settings: null,
  loading: {
    products: false,
    services: false,
    projects: false,
    blogs: false,
    blogCategories: false,
    videos: false,
    sliders: false,
    partnerLogos: false,
    websiteOrders: false,
    homepageItems: false,
    companyInfo: false,
    settings: false,
  },
  initialized: {
    products: false,
    services: false,
    projects: false,
    blogs: false,
  },
  togglingProductIds: [],
  togglingServiceIds: [],
  error: null,
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const loadProducts = createAsyncThunk('websiteManager/loadProducts', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/products', { credentials: 'include' });
    const data = await res.json();
    return data.products || [];
  } catch { return rejectWithValue('Failed to load products'); }
});

export const loadServices = createAsyncThunk('websiteManager/loadServices', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/services', { credentials: 'include' });
    const data = await res.json();
    return data.services || [];
  } catch { return rejectWithValue('Failed to load services'); }
});

export const loadProjects = createAsyncThunk('websiteManager/loadProjects', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/projects', { credentials: 'include' });
    const data = await res.json();
    return data.projects || [];
  } catch { return rejectWithValue('Failed to load projects'); }
});

export const loadBlogs = createAsyncThunk('websiteManager/loadBlogs', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/blogs', { credentials: 'include' });
    const data = await res.json();
    return data.blogs || [];
  } catch { return rejectWithValue('Failed to load blogs'); }
});

export const loadBlogCategories = createAsyncThunk('websiteManager/loadBlogCategories', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/blog-categories', { credentials: 'include' });
    const data = await res.json();
    return data.categories || [];
  } catch { return rejectWithValue('Failed to load blog categories'); }
});

export const loadVideos = createAsyncThunk('websiteManager/loadVideos', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/videos', { credentials: 'include' });
    const data = await res.json();
    return data.videos || [];
  } catch { return rejectWithValue('Failed to load videos'); }
});

export const loadSliders = createAsyncThunk('websiteManager/loadSliders', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/website-sliders', { credentials: 'include' });
    const data = await res.json();
    return data.sliders || [];
  } catch { return rejectWithValue('Failed to load sliders'); }
});

export const loadPartnerLogos = createAsyncThunk('websiteManager/loadPartnerLogos', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/we-work-with', { credentials: 'include' });
    const data = await res.json();
    return data.partners || [];
  } catch { return rejectWithValue('Failed to load partner logos'); }
});

export const loadWebsiteOrders = createAsyncThunk('websiteManager/loadWebsiteOrders', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/website-orders', { credentials: 'include' });
    const data = await res.json();
    return data.orders || [];
  } catch { return rejectWithValue('Failed to load website orders'); }
});

export const loadHomepageItems = createAsyncThunk('websiteManager/loadHomepageItems', async (_, { rejectWithValue }) => {
  try {
    const [pRes, sRes, prRes, bRes, vRes] = await Promise.all([
      fetch('/api/homepage-products', { credentials: 'include' }),
      fetch('/api/homepage-services', { credentials: 'include' }),
      fetch('/api/homepage-projects', { credentials: 'include' }),
      fetch('/api/homepage-blogs', { credentials: 'include' }),
      fetch('/api/homepage-videos', { credentials: 'include' }),
    ]);
    const [p, s, pr, b, v] = await Promise.all([pRes.json(), sRes.json(), prRes.json(), bRes.json(), vRes.json()]);
    return {
      homepageProducts: p.homepageProducts || [],
      homepageServices: s.homepageServices || [],
      homepageProjects: pr.homepageProjects || [],
      homepageBlogs: b.homepageBlogs || [],
      homepageVideos: v.homepageVideos || [],
    };
  } catch { return rejectWithValue('Failed to load homepage items'); }
});

export const loadCompanyInfo = createAsyncThunk('websiteManager/loadCompanyInfo', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/company-info', { credentials: 'include' });
    const data = await res.json();
    return data.companyInfo || null;
  } catch { return rejectWithValue('Failed to load company info'); }
});

export const saveCompanyInfo = createAsyncThunk(
  'websiteManager/saveCompanyInfo',
  async (payload: CompanyInfo, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/company-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save');
      return payload;
    } catch { return rejectWithValue('Failed to save company info'); }
  }
);

export const loadSettings = createAsyncThunk('websiteManager/loadSettings', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/website-manager', { credentials: 'include' });
    const data = await res.json();
    return data.settings || null;
  } catch { return rejectWithValue('Failed to load settings'); }
});

export const saveSettings = createAsyncThunk(
  'websiteManager/saveSettings',
  async (payload: WebsiteSettings, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/website-manager', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); return rejectWithValue(e.error || 'Failed'); }
      return payload;
    } catch { return rejectWithValue('Failed to save settings'); }
  }
);

export const toggleProductPublished = createAsyncThunk(
  'websiteManager/toggleProductPublished',
  async ({ id, currentValue }: { id: string; currentValue: boolean }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('publishOnWebsite', String(!currentValue));
      const res = await fetch(`/api/products/${id}`, { method: 'PUT', body: formData, credentials: 'include' });
      if (!res.ok) return rejectWithValue(id);
      return { id, value: !currentValue };
    } catch { return rejectWithValue(id); }
  }
);

export const toggleServicePublished = createAsyncThunk(
  'websiteManager/toggleServicePublished',
  async ({ id, currentValue }: { id: string; currentValue: boolean }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('publishOnWebsite', String(!currentValue));
      const res = await fetch(`/api/services/${id}`, { method: 'PUT', body: formData, credentials: 'include' });
      if (!res.ok) return rejectWithValue(id);
      return { id, value: !currentValue };
    } catch { return rejectWithValue(id); }
  }
);

export const updateProductStatus = createAsyncThunk(
  'websiteManager/updateProductStatus',
  async ({ id, status }: { id: string; status: string }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('status', status);
      if (status === 'inactive') formData.append('publishOnWebsite', 'false');
      const res = await fetch(`/api/products/${id}`, { method: 'PUT', body: formData, credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed');
      return { id, status };
    } catch { return rejectWithValue('Failed'); }
  }
);

export const updateServiceStatus = createAsyncThunk(
  'websiteManager/updateServiceStatus',
  async ({ id, status }: { id: string; status: string }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('status', status);
      if (status === 'inactive') formData.append('publishOnWebsite', 'false');
      const res = await fetch(`/api/services/${id}`, { method: 'PUT', body: formData, credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed');
      return { id, status };
    } catch { return rejectWithValue('Failed'); }
  }
);

export const deleteProduct = createAsyncThunk(
  'websiteManager/deleteProduct',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed');
      return id;
    } catch { return rejectWithValue('Failed'); }
  }
);

export const deleteService = createAsyncThunk(
  'websiteManager/deleteService',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed');
      return id;
    } catch { return rejectWithValue('Failed'); }
  }
);

export const deleteProject = createAsyncThunk(
  'websiteManager/deleteProject',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed');
      return id;
    } catch { return rejectWithValue('Failed'); }
  }
);

export const deleteBlog = createAsyncThunk(
  'websiteManager/deleteBlog',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/blogs/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed');
      return id;
    } catch { return rejectWithValue('Failed'); }
  }
);

export const createBlogCategory = createAsyncThunk(
  'websiteManager/createBlogCategory',
  async (name: string, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/blog-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return rejectWithValue('Failed');
      const data = await res.json();
      return data.category;
    } catch { return rejectWithValue('Failed'); }
  }
);

export const deleteBlogCategory = createAsyncThunk(
  'websiteManager/deleteBlogCategory',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/blog-categories/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed');
      return id;
    } catch { return rejectWithValue('Failed'); }
  }
);

export const deleteVideo = createAsyncThunk(
  'websiteManager/deleteVideo',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/videos/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed');
      return id;
    } catch { return rejectWithValue('Failed'); }
  }
);

export const deleteSlider = createAsyncThunk(
  'websiteManager/deleteSlider',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/website-sliders/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed');
      return id;
    } catch { return rejectWithValue('Failed'); }
  }
);

export const deletePartnerLogo = createAsyncThunk(
  'websiteManager/deletePartnerLogo',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/we-work-with/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed');
      return id;
    } catch { return rejectWithValue('Failed'); }
  }
);

export const removeFromHomepage = createAsyncThunk(
  'websiteManager/removeFromHomepage',
  async ({ id, type }: { id: string; type: 'product' | 'service' | 'project' | 'blog' | 'video' }, { rejectWithValue }) => {
    const endpoints: Record<string, string> = {
      product: `/api/homepage-products/${id}`,
      service: `/api/homepage-services/${id}`,
      project: `/api/homepage-projects/${id}`,
      blog: `/api/homepage-blogs/${id}`,
      video: `/api/homepage-videos/${id}`,
    };
    try {
      const res = await fetch(endpoints[type], { method: 'DELETE', credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed');
      return { id, type };
    } catch { return rejectWithValue('Failed'); }
  }
);

export const updateWebsiteOrderStatus = createAsyncThunk(
  'websiteManager/updateWebsiteOrderStatus',
  async ({ id, orderStatus }: { id: string; orderStatus: string }, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/website-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderStatus }),
      });
      if (!res.ok) return rejectWithValue('Failed');
      return { id, orderStatus };
    } catch { return rejectWithValue('Failed'); }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const websiteManagerSlice = createSlice({
  name: 'websiteManager',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
    // Optimistic toggle helpers
    optimisticToggleProduct(state, action: PayloadAction<{ id: string; value: boolean }>) {
      const p = state.products.find(p => p.id === action.payload.id);
      if (p) p.publishOnWebsite = action.payload.value;
    },
    optimisticToggleService(state, action: PayloadAction<{ id: string; value: boolean }>) {
      const s = state.services.find(s => s.id === action.payload.id);
      if (s) s.publishOnWebsite = action.payload.value;
    },
  },
  extraReducers: (builder) => {
    // ── products ──
    builder
      .addCase(loadProducts.pending, s => { s.loading.products = true; })
      .addCase(loadProducts.fulfilled, (s, a) => { s.loading.products = false; s.initialized.products = true; s.products = a.payload; })
      .addCase(loadProducts.rejected, s => { s.loading.products = false; })

    // ── services ──
      .addCase(loadServices.pending, s => { s.loading.services = true; })
      .addCase(loadServices.fulfilled, (s, a) => { s.loading.services = false; s.initialized.services = true; s.services = a.payload; })
      .addCase(loadServices.rejected, s => { s.loading.services = false; })

    // ── projects ──
      .addCase(loadProjects.pending, s => { s.loading.projects = true; })
      .addCase(loadProjects.fulfilled, (s, a) => { s.loading.projects = false; s.initialized.projects = true; s.projects = a.payload; })
      .addCase(loadProjects.rejected, s => { s.loading.projects = false; })

    // ── blogs ──
      .addCase(loadBlogs.pending, s => { s.loading.blogs = true; })
      .addCase(loadBlogs.fulfilled, (s, a) => { s.loading.blogs = false; s.initialized.blogs = true; s.blogs = a.payload; })
      .addCase(loadBlogs.rejected, s => { s.loading.blogs = false; })

    // ── blog categories ──
      .addCase(loadBlogCategories.pending, s => { s.loading.blogCategories = true; })
      .addCase(loadBlogCategories.fulfilled, (s, a) => { s.loading.blogCategories = false; s.blogCategories = a.payload; })
      .addCase(loadBlogCategories.rejected, s => { s.loading.blogCategories = false; })

    // ── videos ──
      .addCase(loadVideos.pending, s => { s.loading.videos = true; })
      .addCase(loadVideos.fulfilled, (s, a) => { s.loading.videos = false; s.videos = a.payload; })
      .addCase(loadVideos.rejected, s => { s.loading.videos = false; })

    // ── sliders ──
      .addCase(loadSliders.pending, s => { s.loading.sliders = true; })
      .addCase(loadSliders.fulfilled, (s, a) => { s.loading.sliders = false; s.sliders = a.payload; })
      .addCase(loadSliders.rejected, s => { s.loading.sliders = false; })

    // ── partner logos ──
      .addCase(loadPartnerLogos.pending, s => { s.loading.partnerLogos = true; })
      .addCase(loadPartnerLogos.fulfilled, (s, a) => { s.loading.partnerLogos = false; s.partnerLogos = a.payload; })
      .addCase(loadPartnerLogos.rejected, s => { s.loading.partnerLogos = false; })

    // ── website orders ──
      .addCase(loadWebsiteOrders.pending, s => { s.loading.websiteOrders = true; })
      .addCase(loadWebsiteOrders.fulfilled, (s, a) => { s.loading.websiteOrders = false; s.websiteOrders = a.payload; })
      .addCase(loadWebsiteOrders.rejected, s => { s.loading.websiteOrders = false; })

    // ── homepage items ──
      .addCase(loadHomepageItems.pending, s => { s.loading.homepageItems = true; })
      .addCase(loadHomepageItems.fulfilled, (s, a) => {
        s.loading.homepageItems = false;
        s.homepageProducts = a.payload.homepageProducts;
        s.homepageServices = a.payload.homepageServices;
        s.homepageProjects = a.payload.homepageProjects;
        s.homepageBlogs = a.payload.homepageBlogs;
        s.homepageVideos = a.payload.homepageVideos;
      })
      .addCase(loadHomepageItems.rejected, s => { s.loading.homepageItems = false; })

    // ── company info ──
      .addCase(loadCompanyInfo.pending, s => { s.loading.companyInfo = true; })
      .addCase(loadCompanyInfo.fulfilled, (s, a) => { s.loading.companyInfo = false; s.companyInfo = a.payload; })
      .addCase(loadCompanyInfo.rejected, s => { s.loading.companyInfo = false; })
      .addCase(saveCompanyInfo.pending, s => { s.loading.companyInfo = true; })
      .addCase(saveCompanyInfo.fulfilled, (s, a) => { s.loading.companyInfo = false; s.companyInfo = { ...s.companyInfo, ...a.payload } as CompanyInfo; })
      .addCase(saveCompanyInfo.rejected, s => { s.loading.companyInfo = false; })

    // ── settings ──
      .addCase(loadSettings.pending, s => { s.loading.settings = true; })
      .addCase(loadSettings.fulfilled, (s, a) => { s.loading.settings = false; s.settings = a.payload; })
      .addCase(loadSettings.rejected, s => { s.loading.settings = false; })
      .addCase(saveSettings.pending, s => { s.loading.settings = true; })
      .addCase(saveSettings.fulfilled, (s, a) => { s.loading.settings = false; s.settings = a.payload; })
      .addCase(saveSettings.rejected, s => { s.loading.settings = false; })

    // ── toggle product published (optimistic) ──
      .addCase(toggleProductPublished.pending, (s, a) => {
        s.togglingProductIds.push(a.meta.arg.id);
        const p = s.products.find(p => p.id === a.meta.arg.id);
        if (p) p.publishOnWebsite = !a.meta.arg.currentValue;
      })
      .addCase(toggleProductPublished.fulfilled, (s, a) => {
        s.togglingProductIds = s.togglingProductIds.filter(id => id !== a.payload.id);
      })
      .addCase(toggleProductPublished.rejected, (s, a) => {
        const id = a.meta.arg.id;
        s.togglingProductIds = s.togglingProductIds.filter(i => i !== id);
        // revert
        const p = s.products.find(p => p.id === id);
        if (p) p.publishOnWebsite = a.meta.arg.currentValue;
      })

    // ── toggle service published (optimistic) ──
      .addCase(toggleServicePublished.pending, (s, a) => {
        s.togglingServiceIds.push(a.meta.arg.id);
        const sv = s.services.find(sv => sv.id === a.meta.arg.id);
        if (sv) sv.publishOnWebsite = !a.meta.arg.currentValue;
      })
      .addCase(toggleServicePublished.fulfilled, (s, a) => {
        s.togglingServiceIds = s.togglingServiceIds.filter(id => id !== a.payload.id);
      })
      .addCase(toggleServicePublished.rejected, (s, a) => {
        const id = a.meta.arg.id;
        s.togglingServiceIds = s.togglingServiceIds.filter(i => i !== id);
        const sv = s.services.find(sv => sv.id === id);
        if (sv) sv.publishOnWebsite = a.meta.arg.currentValue;
      })

    // ── product/service status ──
      .addCase(updateProductStatus.fulfilled, (s, a) => {
        const p = s.products.find(p => p.id === a.payload.id);
        if (p) {
          p.status = a.payload.status;
          if (a.payload.status === 'inactive') p.publishOnWebsite = false;
        }
      })
      .addCase(updateServiceStatus.fulfilled, (s, a) => {
        const sv = s.services.find(sv => sv.id === a.payload.id);
        if (sv) {
          sv.status = a.payload.status;
          if (a.payload.status === 'inactive') sv.publishOnWebsite = false;
        }
      })

    // ── deletes ──
      .addCase(deleteProduct.fulfilled, (s, a) => { s.products = s.products.filter(p => p.id !== a.payload); })
      .addCase(deleteService.fulfilled, (s, a) => { s.services = s.services.filter(sv => sv.id !== a.payload); })
      .addCase(deleteProject.fulfilled, (s, a) => { s.projects = s.projects.filter(p => p.id !== a.payload); })
      .addCase(deleteBlog.fulfilled, (s, a) => { s.blogs = s.blogs.filter(b => b.id !== a.payload); })
      .addCase(deleteVideo.fulfilled, (s, a) => { s.videos = s.videos.filter(v => v.id !== a.payload); })
      .addCase(deleteSlider.fulfilled, (s, a) => { s.sliders = s.sliders.filter(sl => sl.id !== a.payload); })
      .addCase(deletePartnerLogo.fulfilled, (s, a) => { s.partnerLogos = s.partnerLogos.filter(pl => pl.id !== a.payload); })

    // ── blog categories ──
      .addCase(createBlogCategory.fulfilled, (s, a) => { if (a.payload) s.blogCategories.push(a.payload); })
      .addCase(deleteBlogCategory.fulfilled, (s, a) => { s.blogCategories = s.blogCategories.filter(c => c.id !== a.payload); })

    // ── homepage remove ──
      .addCase(removeFromHomepage.fulfilled, (s, a) => {
        const { id, type } = a.payload;
        if (type === 'product') s.homepageProducts = s.homepageProducts.filter(i => i.id !== id);
        else if (type === 'service') s.homepageServices = s.homepageServices.filter(i => i.id !== id);
        else if (type === 'project') s.homepageProjects = s.homepageProjects.filter(i => i.id !== id);
        else if (type === 'blog') s.homepageBlogs = s.homepageBlogs.filter(i => i.id !== id);
        else if (type === 'video') s.homepageVideos = s.homepageVideos.filter(i => i.id !== id);
      })

    // ── website order status ──
      .addCase(updateWebsiteOrderStatus.fulfilled, (s, a) => {
        const o = s.websiteOrders.find(o => o.id === a.payload.id);
        if (o) o.orderStatus = a.payload.orderStatus;
      });
  },
});

export const { clearError } = websiteManagerSlice.actions;
export default websiteManagerSlice.reducer;
