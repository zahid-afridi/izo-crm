'use client';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  loadProducts, loadServices, loadProjects, loadBlogs, loadBlogCategories,
  loadVideos, loadSliders, loadPartnerLogos, loadWebsiteOrders, loadHomepageItems,
  loadCompanyInfo, saveCompanyInfo, loadSettings, saveSettings,
  toggleProductPublished, toggleServicePublished,
  updateProductStatus, updateServiceStatus,
  deleteProduct, deleteService, deleteProject, deleteBlog,
  createBlogCategory, deleteBlogCategory,
  deleteVideo, deleteSlider, deletePartnerLogo,
  removeFromHomepage, updateWebsiteOrderStatus,
  clearError,
  type CompanyInfo, type WebsiteSettings,
} from '@/store/slices/websiteManagerSlice';
import {
  selectWMProducts, selectWMServices, selectWMProjects, selectWMBlogs,
  selectWMBlogCategories, selectWMVideos, selectWMSliders, selectWMPartnerLogos,
  selectWMWebsiteOrders, selectWMHomepageProducts, selectWMHomepageServices,
  selectWMHomepageProjects, selectWMHomepageBlogs, selectWMHomepageVideos,
  selectWMCompanyInfo, selectWMSettings, selectWMLoading, selectWMInitialized,
  selectWMTogglingProductIds, selectWMTogglingServiceIds,
} from '@/store/selectors/websiteManagerSelectors';

export function useWebsiteManager() {
  const dispatch = useAppDispatch();

  return {
    // ── State ──
    products: useAppSelector(selectWMProducts),
    services: useAppSelector(selectWMServices),
    projects: useAppSelector(selectWMProjects),
    blogs: useAppSelector(selectWMBlogs),
    blogCategories: useAppSelector(selectWMBlogCategories),
    videos: useAppSelector(selectWMVideos),
    sliders: useAppSelector(selectWMSliders),
    partnerLogos: useAppSelector(selectWMPartnerLogos),
    websiteOrders: useAppSelector(selectWMWebsiteOrders),
    homepageProducts: useAppSelector(selectWMHomepageProducts),
    homepageServices: useAppSelector(selectWMHomepageServices),
    homepageProjects: useAppSelector(selectWMHomepageProjects),
    homepageBlogs: useAppSelector(selectWMHomepageBlogs),
    homepageVideos: useAppSelector(selectWMHomepageVideos),
    companyInfo: useAppSelector(selectWMCompanyInfo),
    settings: useAppSelector(selectWMSettings),
    loading: useAppSelector(selectWMLoading),
    initialized: useAppSelector(selectWMInitialized),
    togglingProductIds: useAppSelector(selectWMTogglingProductIds),
    togglingServiceIds: useAppSelector(selectWMTogglingServiceIds),

    // ── Loaders ──
    loadProducts: () => dispatch(loadProducts()),
    loadServices: () => dispatch(loadServices()),
    loadProjects: () => dispatch(loadProjects()),
    loadBlogs: () => dispatch(loadBlogs()),
    loadBlogCategories: () => dispatch(loadBlogCategories()),
    loadVideos: () => dispatch(loadVideos()),
    loadSliders: () => dispatch(loadSliders()),
    loadPartnerLogos: () => dispatch(loadPartnerLogos()),
    loadWebsiteOrders: () => dispatch(loadWebsiteOrders()),
    loadHomepageItems: () => dispatch(loadHomepageItems()),
    loadCompanyInfo: () => dispatch(loadCompanyInfo()),
    loadSettings: () => dispatch(loadSettings()),

    // ── Mutations ──
    saveCompanyInfo: (payload: CompanyInfo) => dispatch(saveCompanyInfo(payload)),
    saveSettings: (payload: WebsiteSettings) => dispatch(saveSettings(payload)),
    toggleProductPublished: (id: string, currentValue: boolean) => dispatch(toggleProductPublished({ id, currentValue })),
    toggleServicePublished: (id: string, currentValue: boolean) => dispatch(toggleServicePublished({ id, currentValue })),
    updateProductStatus: (id: string, status: string) => dispatch(updateProductStatus({ id, status })),
    updateServiceStatus: (id: string, status: string) => dispatch(updateServiceStatus({ id, status })),
    deleteProduct: (id: string) => dispatch(deleteProduct(id)),
    deleteService: (id: string) => dispatch(deleteService(id)),
    deleteProject: (id: string) => dispatch(deleteProject(id)),
    deleteBlog: (id: string) => dispatch(deleteBlog(id)),
    createBlogCategory: (name: string) => dispatch(createBlogCategory(name)),
    deleteBlogCategory: (id: string) => dispatch(deleteBlogCategory(id)),
    deleteVideo: (id: string) => dispatch(deleteVideo(id)),
    deleteSlider: (id: string) => dispatch(deleteSlider(id)),
    deletePartnerLogo: (id: string) => dispatch(deletePartnerLogo(id)),
    removeFromHomepage: (id: string, type: 'product' | 'service' | 'project' | 'blog' | 'video') =>
      dispatch(removeFromHomepage({ id, type })),
    updateWebsiteOrderStatus: (id: string, orderStatus: string) =>
      dispatch(updateWebsiteOrderStatus({ id, orderStatus })),
    clearError: () => dispatch(clearError()),
  };
}
