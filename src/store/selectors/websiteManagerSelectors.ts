import { RootState } from '../store';

const s = (state: RootState) => state.websiteManager;

export const selectWMProducts = (state: RootState) => s(state).products;
export const selectWMServices = (state: RootState) => s(state).services;
export const selectWMProjects = (state: RootState) => s(state).projects;
export const selectWMBlogs = (state: RootState) => s(state).blogs;
export const selectWMBlogCategories = (state: RootState) => s(state).blogCategories;
export const selectWMVideos = (state: RootState) => s(state).videos;
export const selectWMSliders = (state: RootState) => s(state).sliders;
export const selectWMPartnerLogos = (state: RootState) => s(state).partnerLogos;
export const selectWMWebsiteOrders = (state: RootState) => s(state).websiteOrders;
export const selectWMHomepageProducts = (state: RootState) => s(state).homepageProducts;
export const selectWMHomepageServices = (state: RootState) => s(state).homepageServices;
export const selectWMHomepageProjects = (state: RootState) => s(state).homepageProjects;
export const selectWMHomepageBlogs = (state: RootState) => s(state).homepageBlogs;
export const selectWMHomepageVideos = (state: RootState) => s(state).homepageVideos;
export const selectWMCompanyInfo = (state: RootState) => s(state).companyInfo;
export const selectWMSettings = (state: RootState) => s(state).settings;
export const selectWMLoading = (state: RootState) => s(state).loading;
export const selectWMInitialized = (state: RootState) => s(state).initialized;
export const selectWMTogglingProductIds = (state: RootState) => s(state).togglingProductIds;
export const selectWMTogglingServiceIds = (state: RootState) => s(state).togglingServiceIds;
