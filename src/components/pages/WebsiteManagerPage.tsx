"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebsiteManager } from '@/hooks/useWebsiteManager';
import { saveSettings, saveCompanyInfo } from '@/store/slices/websiteManagerSlice';
import { useAppSelector } from '@/store/hooks';
import { selectSettingsForShell } from '@/store/selectors/settingsSelectors';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { CategoryManagement } from './CategoryManagement';
import { ProductServiceForm } from './ProductServiceForm';
import { ProductServiceView } from './ProductServiceView';
import { SliderForm } from './SliderForm';
import { AddToHomepageDialog } from './AddToHomepageDialog';
import { ProjectForm } from './ProjectForm';
import { ProjectView } from './ProjectView';
import { BlogForm } from './BlogForm';
import { BlogView } from './BlogView';
import { VideoForm } from './VideoForm';
import { ClientForm } from './ClientForm';
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Globe,
  Image as ImageIcon,
  FileText,
  ExternalLink,
  Upload,
  Settings,
  Users,
  Briefcase,
  Video,
  Newspaper,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Share2,
  GripVertical,
  ShoppingCart,
  Package,
  Wrench,
  Building,
  Download,
  File,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  Search
} from 'lucide-react';

interface WebsiteManagerPageProps {
  userRole: string;
}

// Data types
interface Service {
  id: string;
  title: string;
  description?: string;
  price?: number;
  status?: string;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
  };
  subcategoryId?: string;
  subcategory?: {
    id: string;
    name: string;
    category: {
      id: string;
      name: string;
    };
  };
  images: string[];
  videos: string[];
  documents?: any;
  publishOnWebsite: boolean;
  enableOnlineSales: boolean;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
}

interface Product {
  id: string;
  title: string;
  description?: string;
  sku?: string;
  unit?: string;
  price?: number;
  stock?: number;
  status: string;
  subcategoryId?: string;
  subcategory?: {
    id: string;
    name: string;
    category: {
      id: string;
      name: string;
    };
  };
  images: string[];
  videos: string[];
  documents?: any;
  publishOnWebsite: boolean;
  enableOnlineSales: boolean;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  title: string;
  description?: string;
  client?: string;
  location?: string;
  completionDate?: string;
  duration?: string;
  images: string[];
  videos: string[];
  documents?: any;
  publishOnWebsite: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BlogPost {
  id: number;
  title: string;
  content: string;
  category: string;
  year: number;
  publishDate: string;
  author: string;
  images: string[];
  metaTitle: string;
  metaDescription: string;
  showOnHomepage: boolean;
  displayOrder: number;
  type: 'blog' | 'news';
}

interface Client {
  id: number;
  name: string;
  logo: string;
  displayOrder: number;
}

// Mock data
// Mock data will be replaced by real API data
const mockServices: Service[] = [];
const mockProducts: Product[] = [];

const mockBlogs: BlogPost[] = [
  {
    id: 1,
    title: 'Best Practices for Waterproofing',
    content: 'Learn about the latest waterproofing techniques...',
    category: 'Technical',
    year: 2025,
    publishDate: '2025-01-15',
    author: 'John Doe',
    images: ['blog1.jpg'],
    metaTitle: 'Best Practices for Waterproofing | Izo',
    metaDescription: 'Comprehensive guide to waterproofing best practices',
    showOnHomepage: true,
    displayOrder: 1,
    type: 'blog',
  },
];

const mockClients: Client[] = [
  { id: 1, name: 'Client A', logo: 'client1.png', displayOrder: 1 },
  { id: 2, name: 'Client B', logo: 'client2.png', displayOrder: 2 },
];

export function WebsiteManagerPage({ userRole }: WebsiteManagerPageProps) {
  const { t } = useTranslation();
  const wm = useWebsiteManager();
  const shell = useAppSelector(selectSettingsForShell);
  const companyTitle = shell.companyDisplayName?.trim() || 'IzoGrup';
  const companyTagline = shell.tagline?.trim() || 'Construction mangement system';

  // Destructure for convenience
  const {
    products, services, projects, blogs, blogCategories, videos, sliders,
    partnerLogos, websiteOrders, homepageProducts, homepageServices,
    homepageProjects, homepageBlogs, homepageVideos, companyInfo, settings,
    loading, initialized, togglingProductIds, togglingServiceIds,
  } = wm;

  const loadingProducts = loading.products;
  const loadingServices = loading.services;
  const loadingProjects = loading.projects;
  const loadingBlogs = loading.blogs;
  const loadingBlogCategories = loading.blogCategories;
  const loadingVideos = loading.videos;
  const loadingSliders = loading.sliders;
  const loadingPartnerLogos = loading.partnerLogos;
  const loadingWebsiteOrders = loading.websiteOrders;
  const loadingHomepageItems = loading.homepageItems;
  const loadingCompanyInfo = loading.companyInfo;
  const loadingSettings = loading.settings;

  const [activeTab, setActiveTab] = useState('homepage');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'service' | 'product' | 'project' | 'blog' | 'client' | 'video'>('service');
  const [searchQuery, setSearchQuery] = useState('');

  // Product/Service form states
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // View modal states
  const [isProductViewOpen, setIsProductViewOpen] = useState(false);
  const [isServiceViewOpen, setIsServiceViewOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<any>(null);

  // Data states — now from Redux (products, services, projects, etc.)

  // Toggle loading states for individual items — now from Redux (togglingProductIds, togglingServiceIds)

  // Services filtering states
  const [servicesSearchQuery, setServicesSearchQuery] = useState('');
  const [selectedServiceCategory, setSelectedServiceCategory] = useState('all');

  // Filtered services based on search and category
  const filteredServices = services.filter(service => {
    const matchesSearch = !servicesSearchQuery ||
      service.title.toLowerCase().includes(servicesSearchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(servicesSearchQuery.toLowerCase()) ||
      service.subcategory?.name?.toLowerCase().includes(servicesSearchQuery.toLowerCase()) ||
      (service.category?.name ?? service.subcategory?.category?.name)?.toLowerCase().includes(servicesSearchQuery.toLowerCase());

    const categoryName = service.category?.name ?? service.subcategory?.category?.name;
    const matchesCategory = selectedServiceCategory === 'all' ||
      categoryName === selectedServiceCategory;

    return matchesSearch && matchesCategory;
  });

  // Slider states — data from Redux (sliders, loadingSliders)
  const [isSliderFormOpen, setIsSliderFormOpen] = useState(false);
  const [editingSlider, setEditingSlider] = useState<any>(null);

  // Homepage items states — data from Redux
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isAddServiceDialogOpen, setIsAddServiceDialogOpen] = useState(false);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [isAddBlogDialogOpen, setIsAddBlogDialogOpen] = useState(false);
  const [isAddVideoDialogOpen, setIsAddVideoDialogOpen] = useState(false);

  // Project form states
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [isProjectViewOpen, setIsProjectViewOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [viewingProject, setViewingProject] = useState<any>(null);

  // Blog states — data from Redux (blogs, blogCategories, loadingBlogs, loadingBlogCategories)
  const [isBlogFormOpen, setIsBlogFormOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [blogSubTab, setBlogSubTab] = useState('posts');
  const [isBlogCategoryDialogOpen, setIsBlogCategoryDialogOpen] = useState(false);
  const [newBlogCategoryName, setNewBlogCategoryName] = useState('');
  const [isBlogViewOpen, setIsBlogViewOpen] = useState(false);
  const [viewingBlog, setViewingBlog] = useState<any>(null);

  // Video states — data from Redux (videos, loadingVideos)
  const [isVideoFormOpen, setIsVideoFormOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);

  // Website Orders states — data from Redux (websiteOrders, loadingWebsiteOrders)
  const [websiteOrdersSearchQuery, setWebsiteOrdersSearchQuery] = useState('');
  const [websiteOrdersStatusFilter, setWebsiteOrdersStatusFilter] = useState('all');
  const [websiteOrdersTypeFilter, setWebsiteOrdersTypeFilter] = useState('all');
  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Partner Logo states — data from Redux (partnerLogos, loadingPartnerLogos)
  const [isPartnerLogoFormOpen, setIsPartnerLogoFormOpen] = useState(false);
  const [editingPartnerLogo, setEditingPartnerLogo] = useState<any>(null);

  // Company Info — data from Redux (companyInfo, loadingCompanyInfo)
  // Local form state mirrors Redux companyInfo for editing
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [googlePlayUrl, setGooglePlayUrl] = useState('');
  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [companyCV, setCompanyCV] = useState('');
  const [uploadingCV, setUploadingCV] = useState(false);

  // Settings — data from Redux (settings, loadingSettings)
  // Local form state mirrors Redux settings for editing
  const [websiteTitle, setWebsiteTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [originalSettings, setOriginalSettings] = useState({ websiteTitle: '', metaDescription: '', metaKeywords: '' });

  // Company Info validation states
  const [originalCompanyInfo, setOriginalCompanyInfo] = useState({
    phone: '', email: '', address: '', facebookUrl: '', instagramUrl: '',
    youtubeUrl: '', linkedinUrl: '', tiktokUrl: '', googlePlayUrl: '', appStoreUrl: '',
  });
  const [companyInfoErrors, setCompanyInfoErrors] = useState({ phone: '', email: '', address: '' });

  // Check if contact information has changes
  const hasContactInfoChanges = useMemo(() => {
    return (
      phone !== originalCompanyInfo.phone ||
      email !== originalCompanyInfo.email ||
      address !== originalCompanyInfo.address
    );
  }, [phone, email, address, originalCompanyInfo]);

  // Check if social media links have changes
  const hasSocialMediaChanges = useMemo(() => {
    return (
      facebookUrl !== originalCompanyInfo.facebookUrl ||
      instagramUrl !== originalCompanyInfo.instagramUrl ||
      youtubeUrl !== originalCompanyInfo.youtubeUrl ||
      linkedinUrl !== originalCompanyInfo.linkedinUrl ||
      tiktokUrl !== originalCompanyInfo.tiktokUrl
    );
  }, [
    facebookUrl, instagramUrl, youtubeUrl, linkedinUrl, tiktokUrl, originalCompanyInfo
  ]);

  // Check if app store links have changes
  const hasAppStoreChanges = useMemo(() => {
    return (
      googlePlayUrl !== originalCompanyInfo.googlePlayUrl ||
      appStoreUrl !== originalCompanyInfo.appStoreUrl
    );
  }, [googlePlayUrl, appStoreUrl, originalCompanyInfo]);

  // Check if company info has changes (for backward compatibility)
  const hasCompanyInfoChanges = useMemo(() => {
    return hasContactInfoChanges || hasSocialMediaChanges || hasAppStoreChanges;
  }, [hasContactInfoChanges, hasSocialMediaChanges, hasAppStoreChanges]);

  // Validate required fields
  const validateCompanyInfo = useCallback(() => {
    const errors = {
      phone: '',
      email: '',
      address: '',
    };

    if (!phone.trim()) {
      errors.phone = t('websiteManager.phoneRequired');
    }

    if (!email.trim()) {
      errors.email = t('websiteManager.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t('websiteManager.validEmail');
    }

    if (!address.trim()) {
      errors.address = t('websiteManager.addressRequired');
    }

    setCompanyInfoErrors(errors);
    return !errors.phone && !errors.email && !errors.address;
  }, [phone, email, address, t]);

  // Check if form is valid
  const isCompanyInfoValid = useMemo(() => {
    return phone.trim() &&
      email.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
      address.trim();
  }, [phone, email, address]);

  // Check if save button should be disabled for contact info
  const isContactInfoSaveDisabled = useMemo(() => {
    return !hasContactInfoChanges || !isCompanyInfoValid || loadingCompanyInfo;
  }, [hasContactInfoChanges, isCompanyInfoValid, loadingCompanyInfo]);

  // Settings computed properties
  const hasSettingsChanges = useMemo(() => {
    return (
      websiteTitle !== originalSettings.websiteTitle ||
      metaDescription !== originalSettings.metaDescription ||
      metaKeywords !== originalSettings.metaKeywords
    );
  }, [websiteTitle, metaDescription, metaKeywords, originalSettings]);

  const isSettingsSaveDisabled = useMemo(() => {
    return !hasSettingsChanges || loadingSettings;
  }, [hasSettingsChanges, loadingSettings]);

  // Company info input change handler
  const handleCompanyInfoInputChange = useCallback((field: string, value: string) => {
    switch (field) {
      case 'phone':
        setPhone(value);
        if (companyInfoErrors.phone) {
          setCompanyInfoErrors(prev => ({ ...prev, phone: '' }));
        }
        break;
      case 'email':
        setEmail(value);
        if (companyInfoErrors.email) {
          setCompanyInfoErrors(prev => ({ ...prev, email: '' }));
        }
        break;
      case 'address':
        setAddress(value);
        if (companyInfoErrors.address) {
          setCompanyInfoErrors(prev => ({ ...prev, address: '' }));
        }
        break;
      case 'facebookUrl':
        setFacebookUrl(value);
        break;
      case 'instagramUrl':
        setInstagramUrl(value);
        break;
      case 'youtubeUrl':
        setYoutubeUrl(value);
        break;
      case 'linkedinUrl':
        setLinkedinUrl(value);
        break;
      case 'tiktokUrl':
        setTiktokUrl(value);
        break;
      case 'googlePlayUrl':
        setGooglePlayUrl(value);
        break;
      case 'appStoreUrl':
        setAppStoreUrl(value);
        break;
    }
  }, [companyInfoErrors]);

  const canEdit = userRole === 'admin' || userRole === 'website_manager';

  // Sync local form state from Redux when companyInfo loads
  useEffect(() => {
    if (companyInfo) {
      setPhone(companyInfo.phone || '');
      setEmail(companyInfo.email || '');
      setAddress(companyInfo.address || '');
      setFacebookUrl(companyInfo.facebookUrl || '');
      setInstagramUrl(companyInfo.instagramUrl || '');
      setYoutubeUrl(companyInfo.youtubeUrl || '');
      setLinkedinUrl(companyInfo.linkedinUrl || '');
      setTiktokUrl(companyInfo.tiktokUrl || '');
      setGooglePlayUrl(companyInfo.googlePlayUrl || '');
      setAppStoreUrl(companyInfo.appStoreUrl || '');
      setCompanyCV(companyInfo.companyCV || '');
      setOriginalCompanyInfo({
        phone: companyInfo.phone || '', email: companyInfo.email || '',
        address: companyInfo.address || '', facebookUrl: companyInfo.facebookUrl || '',
        instagramUrl: companyInfo.instagramUrl || '', youtubeUrl: companyInfo.youtubeUrl || '',
        linkedinUrl: companyInfo.linkedinUrl || '', tiktokUrl: companyInfo.tiktokUrl || '',
        googlePlayUrl: companyInfo.googlePlayUrl || '', appStoreUrl: companyInfo.appStoreUrl || '',
      });
      setCompanyInfoErrors({ phone: '', email: '', address: '' });
    }
  }, [companyInfo]);

  // Sync local form state from Redux when settings load
  useEffect(() => {
    if (settings) {
      setWebsiteTitle(settings.websiteTitle || '');
      setMetaDescription(settings.metaDescription || '');
      setMetaKeywords(settings.metaKeywords || '');
      setOriginalSettings({
        websiteTitle: settings.websiteTitle || '',
        metaDescription: settings.metaDescription || '',
        metaKeywords: settings.metaKeywords || '',
      });
    }
  }, [settings]);

  // Load all data on mount for stats
  useEffect(() => {
    if (!initialized.products) wm.loadProducts();
    if (!initialized.services) wm.loadServices();
    if (!initialized.projects) wm.loadProjects();
    if (!initialized.blogs) wm.loadBlogs();
  }, []);

  // Load tab-specific data when tab changes
  useEffect(() => {
    if (activeTab === 'homepage') {
      wm.loadSliders();
      wm.loadHomepageItems();
      wm.loadPartnerLogos();
    } else if (activeTab === 'blog') {
      wm.loadBlogCategories();
    } else if (activeTab === 'videos') {
      wm.loadVideos();
    } else if (activeTab === 'orders') {
      wm.loadWebsiteOrders();
    } else if (activeTab === 'company') {
      wm.loadCompanyInfo();
    } else if (activeTab === 'settings') {
      wm.loadSettings();
    }
  }, [activeTab]);

  // Derive service categories from Redux services
  const serviceCategories = useMemo(() =>
    Array.from(new Set(services.map((s: any) => s.subcategory?.category?.name).filter(Boolean)))
      .map(name => ({ id: name, name })),
    [services]
  );

  const openDialog = (type: typeof dialogType) => { setDialogType(type); setIsDialogOpen(true); };
  const openProductForm = (product?: any) => { setEditingItem(product || null); setIsProductFormOpen(true); };
  const openServiceForm = (service?: any) => { setEditingItem(service || null); setIsServiceFormOpen(true); };
  const openProductView = (product: any) => { setViewingItem(product); setIsProductViewOpen(true); };
  const openServiceView = (service: any) => { setViewingItem(service); setIsServiceViewOpen(true); };

  const handleProductSuccess = () => { wm.loadProducts(); setIsProductFormOpen(false); setEditingItem(null); };
  const handleServiceSuccess = () => { wm.loadServices(); setIsServiceFormOpen(false); setEditingItem(null); };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm(t('websiteManager.confirmDeleteProduct'))) return;
    wm.deleteProduct(id);
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm(t('websiteManager.confirmDeleteService'))) return;
    wm.deleteService(id);
  };

  const handleToggleProductPublished = (id: string, currentValue: boolean) =>
    wm.toggleProductPublished(id, currentValue);

  const handleToggleServicePublished = (id: string, currentValue: boolean) =>
    wm.toggleServicePublished(id, currentValue);

  const handleProductStatusChange = (id: string, newStatus: string) =>
    wm.updateProductStatus(id, newStatus);

  const handleServiceStatusChange = (id: string, newStatus: string) =>
    wm.updateServiceStatus(id, newStatus);

  // Slider handlers
  const openSliderForm = (slider?: any) => { setEditingSlider(slider || null); setIsSliderFormOpen(true); };
  const handleSliderSuccess = () => { wm.loadSliders(); setIsSliderFormOpen(false); setEditingSlider(null); };
  const handleDeleteSlider = async (id: string) => {
    if (!confirm(t('websiteManager.confirmDeleteSlider'))) return;
    wm.deleteSlider(id);
  };

  // Homepage items handlers
  const handleRemoveFromHomepage = async (id: string, type: 'product' | 'service' | 'project' | 'blog' | 'video') => {
    if (!confirm(t('websiteManager.removeFromHomepage', { type: t(`websiteManager.type${type.charAt(0).toUpperCase() + type.slice(1)}`) }))) return;
    wm.removeFromHomepage(id, type);
  };

  // Project handlers
  const openProjectForm = (project?: any) => { setEditingProject(project || null); setIsProjectFormOpen(true); };
  const openProjectView = (project: any) => { setViewingProject(project); setIsProjectViewOpen(true); };
  const handleProjectSuccess = () => { wm.loadProjects(); setIsProjectFormOpen(false); setEditingProject(null); };
  const handleDeleteProject = async (id: string) => {
    if (!confirm(t('websiteManager.confirmDeleteProject'))) return;
    wm.deleteProject(id);
  };

  // Blog handlers
  const openBlogForm = (blog?: any) => { setEditingBlog(blog || null); setIsBlogFormOpen(true); };
  const openBlogView = (blog: any) => { setViewingBlog(blog); setIsBlogViewOpen(true); };
  const handleBlogSuccess = () => { wm.loadBlogs(); setIsBlogFormOpen(false); setEditingBlog(null); };
  const handleDeleteBlog = async (id: string) => {
    if (!confirm(t('websiteManager.confirmDeleteBlog'))) return;
    wm.deleteBlog(id);
  };
  const handleCreateBlogCategory = async () => {
    if (!newBlogCategoryName.trim()) return;
    await wm.createBlogCategory(newBlogCategoryName);
    setIsBlogCategoryDialogOpen(false);
    setNewBlogCategoryName('');
  };
  const handleDeleteBlogCategory = async (id: string) => {
    if (!confirm(t('websiteManager.confirmDeleteCategory'))) return;
    wm.deleteBlogCategory(id);
  };

  // Video handlers
  const openVideoForm = (video?: any) => { setEditingVideo(video || null); setIsVideoFormOpen(true); };
  const handleVideoSuccess = () => { wm.loadVideos(); setIsVideoFormOpen(false); setEditingVideo(null); };
  const handleDeleteVideo = async (id: string) => {
    if (!confirm(t('websiteManager.confirmDeleteVideo'))) return;
    wm.deleteVideo(id);
  };

  // Website Orders handlers
  const handleUpdateOrderStatus = (id: string, newStatus: string) =>
    wm.updateWebsiteOrderStatus(id, newStatus);

  // Partner Logo handlers
  const openPartnerLogoForm = (partnerLogo?: any) => { setEditingPartnerLogo(partnerLogo || null); setIsPartnerLogoFormOpen(true); };
  const handlePartnerLogoSuccess = () => { wm.loadPartnerLogos(); setIsPartnerLogoFormOpen(false); setEditingPartnerLogo(null); };
  const handleDeletePartnerLogo = async (id: string) => {
    if (!confirm(t('websiteManager.confirmDeletePartnerLogo'))) return;
    wm.deletePartnerLogo(id);
  };

  const handleSaveSettings = async () => {
    const result = await wm.saveSettings({ websiteTitle, metaDescription, metaKeywords });
    if (saveSettings.fulfilled.match(result as any)) {
      setOriginalSettings({ websiteTitle, metaDescription, metaKeywords });
      alert(t('websiteManager.settingsSaved'));
    } else {
      alert(t('websiteManager.settingsFailed'));
    }
  };

  const handleResetSettings = () => {
    if (confirm(t('websiteManager.resetSettings'))) {
      setWebsiteTitle(`${companyTitle} - Leading Construction Materials Provider`);
      setMetaDescription(`${companyTitle} ${companyTagline}`);
      setMetaKeywords('waterproofing, construction materials, Albania, roofing, insulation');
    }
  };

  const handleSaveCompanyInfo = async () => {
    if (!validateCompanyInfo()) return;
    const result = await wm.saveCompanyInfo({
      phone, email, address, facebookUrl, instagramUrl, youtubeUrl,
      linkedinUrl, tiktokUrl, googlePlayUrl, appStoreUrl, companyCV,
    });
    if (saveCompanyInfo.fulfilled.match(result as any)) {
      setOriginalCompanyInfo({ phone, email, address, facebookUrl, instagramUrl, youtubeUrl, linkedinUrl, tiktokUrl, googlePlayUrl, appStoreUrl });
      alert(t('websiteManager.companyInfoSaved'));
    } else {
      alert(t('websiteManager.companyInfoFailed'));
    }
  };

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert(t('websiteManager.uploadPDF'));
      e.target.value = '';
      return;
    }
    setUploadingCV(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      if (response.ok) {
        const data = await response.json();
        const cvUrl = data.url || data.secure_url;
        setCompanyCV(cvUrl);
        const result = await wm.saveCompanyInfo({
          phone, email, address, facebookUrl, instagramUrl, youtubeUrl,
          linkedinUrl, tiktokUrl, googlePlayUrl, appStoreUrl, companyCV: cvUrl,
        });
        alert(saveCompanyInfo.fulfilled.match(result as any)
          ? t('websiteManager.cvUploadedSaved')
          : t('websiteManager.cvUploadFailedDb'));
        e.target.value = '';
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
    } catch (error) {
      alert(t('websiteManager.cvUploadFailedWithMessage', { message: error instanceof Error ? error.message : t('websiteManager.pleaseTryAgain') }));
      e.target.value = '';
    } finally {
      setUploadingCV(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header with gradient */}
      <div className="bg-brand-gradient text-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white mb-2">{t('websiteManager.title')}</h1>
            <p className="text-white/90">{t('websiteManager.subtitle')}</p>
          </div>
          <Button
            variant="secondary"
            className="bg-white text-brand-500 hover:bg-white/90"
            onClick={() => window.open('https://izo-group.vercel.app/', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {t('websiteManager.viewWebsite')}
          </Button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            {loadingServices ? (
              <div className="flex items-center justify-center h-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            ) : (
              <p className="text-2xl mb-1">{services.filter(s => s.publishOnWebsite).length}</p>
            )}
            <p className="text-sm text-white/90">{t('websiteManager.publishedServices')}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            {loadingProducts ? (
              <div className="flex items-center justify-center h-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            ) : (
              <p className="text-2xl mb-1">{products.filter(p => p.publishOnWebsite).length}</p>
            )}
            <p className="text-sm text-white/90">{t('websiteManager.publishedProducts')}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            {loadingProjects ? (
              <div className="flex items-center justify-center h-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            ) : (
              <p className="text-2xl mb-1">{projects.filter(p => p.featured).length}</p>
            )}
            <p className="text-sm text-white/90">{t('websiteManager.featuredProjects')}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            {loadingBlogs ? (
              <div className="flex items-center justify-center h-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            ) : (
              <p className="text-2xl mb-1">{mockBlogs.filter(b => b.showOnHomepage).length}</p>
            )}
            <p className="text-sm text-white/90">{t('websiteManager.recentBlogs')}</p>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 md:grid-cols-9 w-full h-auto gap-1">
          <TabsTrigger value="homepage" className="text-xs md:text-sm">
            <Globe className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
            <span className="hidden md:inline">{t('websiteManager.homepage')}</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="text-xs md:text-sm">
            <Wrench className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
            <span className="hidden md:inline">{t('websiteManager.services')}</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="text-xs md:text-sm">
            <Package className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
            <span className="hidden md:inline">{t('websiteManager.products')}</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="text-xs md:text-sm">
            <Building className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
            <span className="hidden md:inline">{t('websiteManager.projects')}</span>
          </TabsTrigger>
          <TabsTrigger value="blog" className="text-xs md:text-sm">
            <Newspaper className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
            <span className="hidden md:inline">{t('websiteManager.blog')}</span>
          </TabsTrigger>
          <TabsTrigger value="videos" className="text-xs md:text-sm">
            <Video className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
            <span className="hidden md:inline">{t('websiteManager.videos')}</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="text-xs md:text-sm">
            <ShoppingCart className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
            <span className="hidden md:inline">{t('websiteManager.orders')}</span>
          </TabsTrigger>
          <TabsTrigger value="company" className="text-xs md:text-sm">
            <Briefcase className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
            <span className="hidden md:inline">{t('websiteManager.companyContact')}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs md:text-sm">
            <Settings className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
            <span className="hidden md:inline">{t('websiteManager.settings')}</span>
          </TabsTrigger>
        </TabsList>

        {/* HOMEPAGE MANAGEMENT TAB ****/}
        <TabsContent value="homepage" className="space-y-6">
          {/* Header Images */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-gray-900">{t('websiteManager.homepageSliders')}</h3>
                <p className="text-sm text-gray-500 mt-1">{t('websiteManager.slidersDescription')}</p>
              </div>
              {canEdit && (
                <Button onClick={() => openSliderForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('websiteManager.addSlider')}
                </Button>
              )}
            </div>

            {loadingSliders ? (
              <div className="text-center py-8 text-gray-500">{t('websiteManager.loadingSliders')}</div>
            ) : sliders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t('websiteManager.noSlidersFound')}
              </div>
            ) : (
              <div className="space-y-4">
                {sliders.map((slider) => (
                  <div key={slider.id} className="border rounded-lg overflow-hidden">
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Image Preview */}
                      <div className="md:w-1/3">
                        <img
                          src={slider.imageUrl}
                          alt={slider.title}
                          className="w-full h-48 object-cover"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="text-gray-900 mb-1">{slider.title}</h4>
                            {slider.description && (
                              <p className="text-sm text-gray-600 mb-2">{slider.description}</p>
                            )}
                            <div className="flex items-center gap-3 text-sm">
                              <Badge variant={slider.isActive ? 'default' : 'secondary'}>
                                {slider.isActive ? t('websiteManager.active') : t('websiteManager.inactive')}
                              </Badge>
                              <span className="text-gray-500">{t('websiteManager.order')}: {slider.displayOrder}</span>
                              {slider.buttonText && (
                                <Badge variant="outline">
                                  {t('websiteManager.button')}: {slider.buttonText}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {canEdit && (
                            <div className="flex gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openSliderForm(slider)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteSlider(slider.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Homepage Services Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-gray-900">{t('websiteManager.servicesSection')}</h3>
                <p className="text-sm text-gray-500 mt-1">{t('websiteManager.selectServicesHomepage')}</p>
              </div>
              <Badge variant="outline">{homepageServices.filter(s => s.isActive).length} {t('websiteManager.active')}</Badge>
            </div>

            {loadingHomepageItems ? (
              <div className="text-center py-8 text-gray-500">{t('websiteManager.loading')}</div>
            ) : homepageServices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t('websiteManager.noServicesHomepage')}
              </div>
            ) : (
              <div className="space-y-3">
                {homepageServices.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                      <div>
                        <p className="text-sm text-gray-900">{item.service.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{t('websiteManager.order')}: {item.displayOrder}</Badge>
                          {(item.service.category ?? item.service.subcategory?.category) && (
                            <Badge variant="outline" className="text-xs">{(item.service.category ?? item.service.subcategory?.category).name}</Badge>
                          )}
                          {item.service.price && <span className="text-xs text-gray-500">${item.service.price}</span>}
                          {item.isActive ? (
                            <Badge className="text-xs bg-green-100 text-green-700">{t('websiteManager.active')}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">{t('websiteManager.inactive')}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleRemoveFromHomepage(item.id, 'service')}>
                          <X className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canEdit && (
              <Button variant="outline" className="w-full mt-4" onClick={() => setIsAddServiceDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('websiteManager.addServicesToHomepage')}
              </Button>
            )}
          </Card>

          {/* Homepage Products Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-gray-900">{t('websiteManager.productsSection')}</h3>
                <p className="text-sm text-gray-500 mt-1">{t('websiteManager.selectProductsHomepage')}</p>
              </div>
              <Badge variant="outline">{homepageProducts.filter(p => p.isActive).length} {t('websiteManager.active')}</Badge>
            </div>

            {loadingHomepageItems ? (
              <div className="text-center py-8 text-gray-500">{t('websiteManager.loading')}</div>
            ) : homepageProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t('websiteManager.noProductsHomepage')}
              </div>
            ) : (
              <div className="space-y-3">
                {homepageProducts.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                      <div>
                        <p className="text-sm text-gray-900">{item.product.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{t('websiteManager.order')}: {item.displayOrder}</Badge>
                          {item.product.subcategory && (
                            <Badge variant="outline" className="text-xs">{item.product.subcategory.category.name}</Badge>
                          )}
                          {item.product.price && <span className="text-xs text-gray-500">${item.product.price}</span>}
                          {item.isActive ? (
                            <Badge className="text-xs bg-green-100 text-green-700">{t('websiteManager.active')}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">{t('websiteManager.inactive')}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleRemoveFromHomepage(item.id, 'product')}>
                          <X className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canEdit && (
              <Button variant="outline" className="w-full mt-4" onClick={() => setIsAddProductDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('websiteManager.addProductsToHomepage')}
              </Button>
            )}
          </Card>

          {/* Homepage Projects Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-gray-900">{t('websiteManager.projectsSection')}</h3>
                <p className="text-sm text-gray-500 mt-1">{t('websiteManager.selectProjectsHomepage')}</p>
              </div>
              <Badge variant="outline">{homepageProjects.filter(p => p.isActive).length} {t('websiteManager.active')}</Badge>
            </div>

            {loadingHomepageItems ? (
              <div className="text-center py-8 text-gray-500">{t('websiteManager.loading')}</div>
            ) : homepageProjects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t('websiteManager.noProjectsHomepage')}
              </div>
            ) : (
              <div className="space-y-3">
                {homepageProjects.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                      <div>
                        <p className="text-sm text-gray-900">{item.project.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{t('websiteManager.order')}: {item.displayOrder}</Badge>
                          {item.project.location && <span className="text-xs text-gray-500">{item.project.location}</span>}
                          {item.isActive ? (
                            <Badge className="text-xs bg-green-100 text-green-700">{t('websiteManager.active')}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">{t('websiteManager.inactive')}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleRemoveFromHomepage(item.id, 'project')}>
                          <X className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canEdit && (
              <Button variant="outline" className="w-full mt-4" onClick={() => setIsAddProjectDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('websiteManager.addProjectsToHomepage')}
              </Button>
            )}
          </Card>

          {/* Homepage Blogs Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-gray-900">{t('websiteManager.blogsSection')}</h3>
                <p className="text-sm text-gray-500 mt-1">{t('websiteManager.selectBlogsHomepage')}</p>
              </div>
              <Badge variant="outline">{homepageBlogs.filter(b => b.isActive).length} {t('websiteManager.active')}</Badge>
            </div>

            {loadingHomepageItems ? (
              <div className="text-center py-8 text-gray-500">{t('websiteManager.loading')}</div>
            ) : homepageBlogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t('websiteManager.noBlogsHomepage')}
              </div>
            ) : (
              <div className="space-y-3">
                {homepageBlogs.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                      <div>
                        <p className="text-sm text-gray-900">{item.blog.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{t('websiteManager.order')}: {item.displayOrder}</Badge>
                          {item.blog.category && (
                            <Badge variant="outline" className="text-xs">{item.blog.category.name}</Badge>
                          )}
                          <span className="text-xs text-gray-500">{t('websiteManager.byAuthor', { author: item.blog.author })}</span>
                          {item.isActive ? (
                            <Badge className="text-xs bg-green-100 text-green-700">{t('websiteManager.active')}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">{t('websiteManager.inactive')}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleRemoveFromHomepage(item.id, 'blog')}>
                          <X className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canEdit && (
              <Button variant="outline" className="w-full mt-4" onClick={() => setIsAddBlogDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('websiteManager.addBlogsToHomepage')}
              </Button>
            )}
          </Card>

          {/* Homepage Videos Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-gray-900">{t('websiteManager.videosSection')}</h3>
                <p className="text-sm text-gray-500 mt-1">{t('websiteManager.selectVideosHomepage')}</p>
              </div>
              <Badge variant="outline">{homepageVideos.filter(v => v.isActive).length} {t('websiteManager.active')}</Badge>
            </div>

            {loadingHomepageItems ? (
              <div className="text-center py-8 text-gray-500">{t('websiteManager.loading')}</div>
            ) : homepageVideos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t('websiteManager.noVideosHomepage')}
              </div>
            ) : (
              <div className="space-y-3">
                {homepageVideos.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                      <div>
                        <p className="text-sm text-gray-900">{item.video.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{t('websiteManager.order')}: {item.displayOrder}</Badge>
                          <a
                            href={item.video.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-brand-500 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            YouTube
                          </a>
                          {item.isActive ? (
                            <Badge className="text-xs bg-green-100 text-green-700">{t('websiteManager.active')}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">{t('websiteManager.inactive')}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleRemoveFromHomepage(item.id, 'video')}>
                          <X className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canEdit && (
              <Button variant="outline" className="w-full mt-4" onClick={() => setIsAddVideoDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('websiteManager.addVideosToHomepage')}
              </Button>
            )}
          </Card>

          {/* Video Tutorial Section */}




          {/* We Work With (Partner Logos) Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-gray-900">{t('websiteManager.weWorkWith')}</h3>
                <p className="text-sm text-gray-500 mt-1">{t('websiteManager.partnerLogosDescription')}</p>
              </div>
              {canEdit && (
                <Button onClick={() => openPartnerLogoForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('websiteManager.addPartnerLogo')}
                </Button>
              )}
            </div>

            {loadingPartnerLogos ? (
              <div className="text-center py-8 text-gray-500">{t('websiteManager.loadingPartnerLogos')}</div>
            ) : partnerLogos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>{t('websiteManager.noPartnerLogos')}</p>
                <p className="text-sm mt-1">{t('websiteManager.addFirstPartnerLogo')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {partnerLogos.map((partnerLogo) => (
                  <div key={partnerLogo.id} className="relative group">
                    <div className="aspect-square bg-white rounded-lg flex items-center justify-center p-4 border hover:shadow-md transition-shadow">
                      <img
                        src={partnerLogo.logoUrl}
                        alt="Partner logo"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    {canEdit && (
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-6 w-6"
                          onClick={() => openPartnerLogoForm(partnerLogo)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-6 w-6"
                          onClick={() => handleDeletePartnerLogo(partnerLogo.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    {partnerLogo.websiteUrl && (

                      <a
                        href={partnerLogo.websiteUrl.startsWith('http://') || partnerLogo.websiteUrl.startsWith('https://') ? partnerLogo.websiteUrl : `https://${partnerLogo.websiteUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-center mt-2 text-brand-500 hover:underline flex items-center justify-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {t('websiteManager.website')}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* SERVICES MANAGEMENT TAB */}
        <TabsContent value="services" className="space-y-6">
          <Tabs defaultValue="services-list" className="space-y-4">
            <div className="flex gap-2 border-b">
              <TabsList className="bg-transparent">
                <TabsTrigger value="services-list" className="data-[state=active]:bg-brand-50 data-[state=active]:text-brand-600">
                  {t('websiteManager.servicesList')}
                </TabsTrigger>
                <TabsTrigger value="categories" className="data-[state=active]:bg-brand-50 data-[state=active]:text-brand-600">
                  {t('websiteManager.manageCategories')}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="services-list">
              <Card className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-gray-900">{t('websiteManager.servicesManagement')}</h3>
                    <p className="text-sm text-gray-500 mt-1">{t('websiteManager.servicesManagementDesc')}</p>
                  </div>
                  {canEdit && (
                    <Button onClick={() => openServiceForm()}>
                      <Plus className="w-4 h-4 mr-2" />
                      {t('websiteManager.addService')}
                    </Button>
                  )}
                </div>

                {/* Search and Filter */}
                <div className="flex gap-4 mb-6 flex-wrap items-center">
                  <div className="flex-1 min-w-64 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={t('websiteManager.searchServices')}
                      className="pl-10"
                      value={servicesSearchQuery}
                      onChange={(e) => setServicesSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={selectedServiceCategory} onValueChange={setSelectedServiceCategory}>
                    <SelectTrigger className="min-w-48 max-w-xs overflow-hidden">
                      <SelectValue className="truncate" />
                    </SelectTrigger>
                    <SelectContent className="max-w-sm">
                      <SelectItem value="all">{t('websiteManager.allCategories')}</SelectItem>
                      {serviceCategories.map(category => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(servicesSearchQuery || selectedServiceCategory !== 'all') && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setServicesSearchQuery('');
                        setSelectedServiceCategory('all');
                      }}
                      className="whitespace-nowrap"
                    >
                      {t('websiteManager.clearFilters')}
                    </Button>
                  )}
                </div>

                {/* Filter Status */}
                {(servicesSearchQuery || selectedServiceCategory !== 'all') && (
                  <div className="mb-4 text-sm text-gray-600">
                    {t('websiteManager.showingServices', { count: filteredServices.length, total: services.length })}
                    {servicesSearchQuery && ` ${t('websiteManager.matchingSearch', { query: servicesSearchQuery })}`}
                    {selectedServiceCategory !== 'all' && ` ${t('websiteManager.inCategory', { category: selectedServiceCategory })}`}
                  </div>
                )}

                {/* Services Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('websiteManager.title')}</TableHead>
                        <TableHead>{t('websiteManager.category')}</TableHead>
                        <TableHead>{t('websiteManager.subcategory')}</TableHead>
                        <TableHead>{t('websiteManager.price')}</TableHead>
                        <TableHead>{t('websiteManager.status')}</TableHead>
                        <TableHead>{t('websiteManager.onlineSales')}</TableHead>
                        <TableHead>{t('websiteManager.published')}</TableHead>
                        <TableHead>{t('websiteManager.media')}</TableHead>
                        <TableHead>{t('websiteManager.created')}</TableHead>
                        <TableHead>{t('websiteManager.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingServices ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                            {t('websiteManager.loadingServices')}
                          </TableCell>
                        </TableRow>
                      ) : filteredServices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                            {services.length === 0
                              ? t('websiteManager.noServicesFound')
                              : t('websiteManager.noServicesMatch')
                            }
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredServices.map((service) => (
                          <TableRow key={service.id}>
                            <TableCell className="text-gray-900">{service.title}</TableCell>
                            <TableCell>
                              {(service.category ?? service.subcategory?.category) ? (
                                <Badge variant="outline">{(service.category ?? service.subcategory?.category)?.name}</Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600">
                                {service.subcategory?.name || '-'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {service.price ? (
                                <span className="text-gray-900">${service.price}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={service.status || 'active'}
                                onValueChange={(value) => handleServiceStatusChange(service.id, value)}
                                disabled={!canEdit}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">{t('websiteManager.active')}</SelectItem>
                                  <SelectItem value="inactive">{t('websiteManager.inactive')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Badge variant={service.enableOnlineSales ? 'default' : 'secondary'}>
                                {service.enableOnlineSales ? t('websiteManager.yes') : t('websiteManager.no')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={service.publishOnWebsite}
                                  onCheckedChange={() => handleToggleServicePublished(service.id, service.publishOnWebsite)}
                                  disabled={!canEdit || service.status === 'inactive' || togglingServiceIds.includes(service.id)}
                                />
                                {togglingServiceIds.includes(service.id) && (
                                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {t('websiteManager.imagesCount', { count: service.images?.length || 0 })}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-gray-500">
                                {new Date(service.createdAt).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openServiceView(service)}
                                  title="View details"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {canEdit && (
                                  <>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => openServiceForm(service)}
                                      title="Edit"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleDeleteService(service.id)}
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="categories">
              <CategoryManagement type="service" />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* PRODUCTS MANAGEMENT TAB */}
        <TabsContent value="products" className="space-y-6">
          <Tabs defaultValue="products-list" className="space-y-4">
            <div className="flex gap-2 border-b">
              <TabsList className="bg-transparent">
                <TabsTrigger value="products-list" className="data-[state=active]:bg-brand-50 data-[state=active]:text-brand-600">
                  {t('websiteManager.productsList')}
                </TabsTrigger>
                <TabsTrigger value="categories" className="data-[state=active]:bg-brand-50 data-[state=active]:text-brand-600">
                  {t('websiteManager.manageCategories')}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="products-list">
              <Card className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-gray-900">{t('websiteManager.productsManagement')}</h3>
                    <p className="text-sm text-gray-500 mt-1">{t('websiteManager.productsManagementDesc')}</p>
                  </div>
                  {canEdit && (
                    <Button onClick={() => openProductForm()}>
                      <Plus className="w-4 h-4 mr-2" />
                      {t('websiteManager.addProduct')}
                    </Button>
                  )}
                </div>

                {/* Search and Filter */}
                <div className="flex gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={t('websiteManager.searchProducts')}
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('websiteManager.allCategories')}</SelectItem>
                      <SelectItem value="waterproofing">Waterproofing</SelectItem>
                      <SelectItem value="primers">Primers</SelectItem>
                      <SelectItem value="protection">Protection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Products Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('websiteManager.productTitle')}</TableHead>
                        <TableHead>{t('websiteManager.category')}</TableHead>
                        <TableHead>{t('websiteManager.subcategory')}</TableHead>
                        <TableHead>{t('websiteManager.sku')}</TableHead>
                        <TableHead>{t('websiteManager.price')}</TableHead>
                        <TableHead>{t('websiteManager.stock')}</TableHead>
                        <TableHead>{t('websiteManager.status')}</TableHead>
                        <TableHead>{t('websiteManager.onlineSales')}</TableHead>
                        <TableHead>{t('websiteManager.published')}</TableHead>
                        <TableHead>{t('websiteManager.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingProducts ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                            {t('websiteManager.loadingProducts')}
                          </TableCell>
                        </TableRow>
                      ) : products.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                            {t('websiteManager.noProductsFound')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        products.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="text-gray-900">{product.title}</TableCell>
                            <TableCell>
                              {product.subcategory?.category ? (
                                <Badge variant="outline">{product.subcategory.category.name}</Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {product.subcategory ? (
                                <Badge variant="outline" className="text-xs">{product.subcategory.name}</Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600">{product.sku || '-'}</span>
                            </TableCell>
                            <TableCell>
                              {product.price ? (
                                <span className="text-gray-900">${product.price}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600">{product.stock || 0}</span>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={product.status}
                                onValueChange={(value) => handleProductStatusChange(product.id, value)}
                                disabled={!canEdit}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">{t('websiteManager.active')}</SelectItem>
                                  <SelectItem value="inactive">{t('websiteManager.inactive')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Badge variant={product.enableOnlineSales ? 'default' : 'secondary'}>
                                {product.enableOnlineSales ? t('websiteManager.yes') : t('websiteManager.no')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={product.publishOnWebsite}
                                  onCheckedChange={() => handleToggleProductPublished(product.id, product.publishOnWebsite)}
                                  disabled={!canEdit || product.status === 'inactive' || togglingProductIds.includes(product.id)}
                                />
                                {togglingProductIds.includes(product.id) && (
                                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openProductView(product)}
                                  title="View details"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {canEdit && (
                                  <>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => openProductForm(product)}
                                      title="Edit"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleDeleteProduct(product.id)}
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="categories">
              <CategoryManagement type="product" />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* PROJECTS MANAGEMENT TAB */}
        <TabsContent value="projects" className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-gray-900">{t('websiteManager.projectsManagement')}</h3>
                <p className="text-sm text-gray-500 mt-1">{t('websiteManager.projectsManagementDesc')}</p>
              </div>
              {canEdit && (
                <Button onClick={() => openProjectForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('websiteManager.addProject')}
                </Button>
              )}
            </div>

            {/* Search */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t('websiteManager.searchProjects')}
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {loadingProjects ? (
              <div className="text-center py-12 text-gray-500">{t('websiteManager.loadingProjects')}</div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Building className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>{t('websiteManager.noProjectsFound')}</p>
                <p className="text-sm mt-1">{t('websiteManager.createFirstProject')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {projects.map((project) => (
                  <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-shadow relative h-[450px]">
                    {/* Image Section - Fixed Height */}
                    <div className="h-48 bg-gray-100 flex items-center justify-center relative">
                      {project.images && project.images.length > 0 ? (
                        <img
                          src={project.images[0]}
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building className="w-12 h-12 text-gray-400" />
                      )}
                      {project.images && project.images.length > 1 && (
                        <Badge className="absolute bottom-2 right-2 bg-black/70 text-white text-xs">
                          {t('websiteManager.moreImages', { count: project.images.length - 1 })}
                        </Badge>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="p-4 pb-16">
                      {/* Title and Badges */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h4 className="text-gray-900 font-medium text-sm leading-tight line-clamp-2 flex-grow">
                          {project.title}
                        </h4>
                        <div className="flex gap-1 flex-shrink-0">
                          {project.featured && (
                            <Badge className="bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5">
                              {t('websiteManager.featured')}
                            </Badge>
                          )}
                          {project.publishOnWebsite && (
                            <Badge className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5">
                              {t('websiteManager.published')}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed mb-3">
                        {project.description || t('websiteManager.noDescription')}
                      </p>

                      {/* Location */}
                      {project.location && (
                        <div className="mb-3">
                          <Badge variant="outline" className="text-xs px-2 py-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            <span className="truncate max-w-[120px]">{project.location}</span>
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons - Absolutely Positioned at Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t">
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs font-normal"
                          onClick={() => openProjectView(project)}
                        >
                          <Eye className="w-3 h-3 mr-1.5" />
                          {t('websiteManager.view')}
                        </Button>
                        {canEdit && (
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-8 h-8 p-0 flex items-center justify-center"
                              onClick={() => openProjectForm(project)}
                              title="Edit Project"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-8 h-8 p-0 flex items-center justify-center hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                              onClick={() => handleDeleteProject(project.id)}
                              title="Delete Project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* BLOG TAB */}
        <TabsContent value="blog" className="space-y-6">
          <Tabs value={blogSubTab} onValueChange={setBlogSubTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="posts">{t('websiteManager.blogPosts')}</TabsTrigger>
              <TabsTrigger value="categories">{t('websiteManager.blogCategories')}</TabsTrigger>
            </TabsList>

            <TabsContent value="posts">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-gray-900">{t('websiteManager.blogPosts')}</h3>
                    <p className="text-sm text-gray-500 mt-1">{t('websiteManager.blogPostsDesc')}</p>
                  </div>
                  {canEdit && (
                    <Button onClick={() => openBlogForm()}>
                      <Plus className="w-4 h-4 mr-2" />
                      {t('websiteManager.addBlogPost')}
                    </Button>
                  )}
                </div>

                {loadingBlogs ? (
                  <div className="text-center py-8 text-gray-500">{t('websiteManager.loadingBlogs')}</div>
                ) : blogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Newspaper className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>{t('websiteManager.noBlogPosts')}</p>
                    <p className="text-sm mt-1">{t('websiteManager.createFirstBlog')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('websiteManager.title')}</TableHead>
                          <TableHead>{t('websiteManager.author')}</TableHead>
                          <TableHead>{t('websiteManager.category')}</TableHead>
                          <TableHead>{t('websiteManager.published')}</TableHead>
                          <TableHead>{t('websiteManager.status')}</TableHead>
                          <TableHead>{t('websiteManager.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {blogs.map((blog) => (
                          <TableRow key={blog.id}>
                            <TableCell className="text-gray-900">{blog.title}</TableCell>
                            <TableCell className="text-gray-600">{blog.author}</TableCell>
                            <TableCell>
                              {blog.category ? (
                                <Badge variant="outline">{blog.category.name}</Badge>
                              ) : (
                                <span className="text-gray-400 text-sm">{t('websiteManager.noCategory')}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {blog.publishOnWebsite && (
                                  <Badge variant="default" className="text-xs">{t('websiteManager.published')}</Badge>
                                )}
                                {blog.featured && (
                                  <Badge variant="secondary" className="text-xs">{t('websiteManager.featured')}</Badge>
                                )}
                                {blog.showOnHomepage && (
                                  <Badge variant="outline" className="text-xs">{t('websiteManager.homepage')}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openBlogView(blog)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {canEdit && (
                                  <>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => openBlogForm(blog)}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleDeleteBlog(blog.id)}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="categories">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-gray-900">{t('websiteManager.blogCategories')}</h3>
                    <p className="text-sm text-gray-500 mt-1">{t('websiteManager.blogCategoriesDesc')}</p>
                  </div>
                  {canEdit && (
                    <Button onClick={() => setIsBlogCategoryDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      {t('websiteManager.addCategory')}
                    </Button>
                  )}
                </div>

                {loadingBlogCategories ? (
                  <div className="text-center py-8 text-gray-500">{t('websiteManager.loadingCategories')}</div>
                ) : blogCategories.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>{t('websiteManager.noCategories')}</p>
                    <p className="text-sm mt-1">{t('websiteManager.createFirstCategory')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('websiteManager.name')}</TableHead>
                          <TableHead>{t('websiteManager.blogCount')}</TableHead>
                          <TableHead>{t('websiteManager.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {blogCategories.map((category) => (
                          <TableRow key={category.id}>
                            <TableCell className="text-gray-900">{category.name}</TableCell>
                            <TableCell className="text-gray-600">{t('websiteManager.blogsCount', { count: category._count?.blogs || 0 })}</TableCell>
                            <TableCell>
                              {canEdit && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDeleteBlogCategory(category.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* VIDEOS TAB */}
        <TabsContent value="videos" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-gray-900">{t('websiteManager.videoLibrary')}</h3>
                <p className="text-sm text-gray-500 mt-1">{t('websiteManager.videoLibraryDesc')}</p>
              </div>
              {canEdit && (
                <Button onClick={() => openVideoForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('websiteManager.addVideo')}
                </Button>
              )}
            </div>

            {loadingVideos ? (
              <div className="text-center py-8 text-gray-500">{t('websiteManager.loadingVideos')}</div>
            ) : videos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Video className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>{t('websiteManager.noVideos')}</p>
                <p className="text-sm mt-1">{t('websiteManager.addFirstVideo')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('websiteManager.title')}</TableHead>
                      <TableHead>{t('websiteManager.youtubeUrl')}</TableHead>
                      <TableHead>{t('websiteManager.status')}</TableHead>
                      <TableHead>{t('websiteManager.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {videos.map((video) => (
                      <TableRow key={video.id}>
                        <TableCell className="text-gray-900">{video.title}</TableCell>
                        <TableCell>
                          <a
                            href={video.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-500 hover:underline text-sm flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {t('websiteManager.viewOnYouTube')}
                          </a>
                        </TableCell>
                        <TableCell>
                          {video.publishOnWebsite ? (
                            <Badge variant="default" className="text-xs">{t('websiteManager.published')}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">{t('websiteManager.draft')}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {canEdit && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openVideoForm(video)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDeleteVideo(video.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* WEBSITE ORDERS TAB */}
        <TabsContent value="orders" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{t('websiteManager.websiteOrders')}</h2>
            </div>

            {/* Search and Filter */}
            <div className="flex gap-4 mb-6">
              <Input
                placeholder={t('websiteManager.searchOrdersPlaceholder')}
                value={websiteOrdersSearchQuery}
                onChange={(e) => setWebsiteOrdersSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Select value={websiteOrdersTypeFilter} onValueChange={setWebsiteOrdersTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('websiteManager.allTypes')}</SelectItem>
                  <SelectItem value="product">{t('websiteManager.products')}</SelectItem>
                  <SelectItem value="service">{t('websiteManager.services')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={websiteOrdersStatusFilter} onValueChange={setWebsiteOrdersStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('websiteManager.allStatus')}</SelectItem>
                  <SelectItem value="pending">{t('orders.pending')}</SelectItem>
                  <SelectItem value="confirmed">{t('websiteManager.confirmed')}</SelectItem>
                  <SelectItem value="processing">{t('orders.processing')}</SelectItem>
                  <SelectItem value="shipped">{t('orders.shipped')}</SelectItem>
                  <SelectItem value="delivered">{t('orders.delivered')}</SelectItem>
                  <SelectItem value="cancelled">{t('orders.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('websiteManager.orderNumber')}</TableHead>
                    <TableHead>{t('websiteManager.customer')}</TableHead>
                    <TableHead>{t('websiteManager.email')}</TableHead>
                    <TableHead>{t('websiteManager.type')}</TableHead>
                    <TableHead>{t('websiteManager.itemsCount')}</TableHead>
                    <TableHead>{t('websiteManager.total')}</TableHead>
                    <TableHead>{t('websiteManager.orderStatus')}</TableHead>
                    <TableHead>{t('websiteManager.payment')}</TableHead>
                    <TableHead>{t('websiteManager.date')}</TableHead>
                    <TableHead>{t('websiteManager.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingWebsiteOrders ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        {t('websiteManager.loadingOrders')}
                      </TableCell>
                    </TableRow>
                  ) : websiteOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        {t('websiteManager.noOrdersFound')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    websiteOrders
                      .filter(order => {
                        const matchesSearch = !websiteOrdersSearchQuery ||
                          order.orderNumber.toLowerCase().includes(websiteOrdersSearchQuery.toLowerCase()) ||
                          order.email.toLowerCase().includes(websiteOrdersSearchQuery.toLowerCase()) ||
                          order.fullName.toLowerCase().includes(websiteOrdersSearchQuery.toLowerCase());

                        const matchesStatus = websiteOrdersStatusFilter === 'all' ||
                          order.orderStatus === websiteOrdersStatusFilter;

                        const matchesType = websiteOrdersTypeFilter === 'all' ||
                          order.orderType === websiteOrdersTypeFilter;

                        return matchesSearch && matchesStatus && matchesType;
                      })
                      .map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-semibold text-xs">{order.orderNumber}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{order.fullName}</p>
                              <p className="text-xs text-gray-500">{order.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{order.email}</TableCell>
                          <TableCell>
                            <Badge variant={order.orderType === 'product' ? 'default' : 'secondary'} className="text-xs">
                              {order.orderType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm font-medium">
                              {Array.isArray(order.items) ? order.items.length : 0}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold text-sm">
                            {order.currency.toUpperCase()} {order.totalAmount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={order.orderStatus}
                              onValueChange={(value) => handleUpdateOrderStatus(order.id, value)}
                              disabled={!canEdit}
                            >
                              <SelectTrigger className="w-28 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="shipped">Shipped</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={order.paymentStatus === 'completed' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {order.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-gray-600">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setIsOrderDetailModalOpen(true);
                                }}
                                title="View details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {canEdit && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={async () => {
                                    if (!confirm('Are you sure you want to delete this order?')) return;
                                    try {
                                      const response = await fetch(`/api/website-orders/${order.id}`, { method: 'DELETE' });
                                      if (response.ok) {
                                        wm.loadWebsiteOrders();
                                      }
                                    } catch (error) {
                                      console.error('Error deleting order:', error);
                                    }
                                  }}
                                  title="Delete order"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ORDER DETAIL MODAL */}
        <Dialog open={isOrderDetailModalOpen} onOpenChange={setIsOrderDetailModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Header */}
                <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                  <div>
                    <p className="text-sm text-gray-600">Order Number</p>
                    <p className="font-semibold">{selectedOrder.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Order Type</p>
                    <Badge variant={selectedOrder.orderType === 'product' ? 'default' : 'secondary'}>
                      {selectedOrder.orderType}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Order Date</p>
                    <p className="font-semibold">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Order Status</p>
                    <Badge className="mt-1">{selectedOrder.orderStatus}</Badge>
                  </div>
                </div>

                {/* Customer Information */}
                <div>
                  <h3 className="font-semibold mb-3">Customer Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Full Name</p>
                      <p className="font-medium">{selectedOrder.fullName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{selectedOrder.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{selectedOrder.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">User ID</p>
                      <p className="font-medium text-xs">{selectedOrder.userId || 'Guest'}</p>
                    </div>
                  </div>
                </div>

                {/* Delivery Information */}
                <div>
                  <h3 className="font-semibold mb-3">Delivery Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="font-medium">{selectedOrder.deliveryAddress}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">City</p>
                      <p className="font-medium">{selectedOrder.deliveryCity || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Postal Code</p>
                      <p className="font-medium">{selectedOrder.deliveryPostalCode || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Delivery Method</p>
                      <p className="font-medium">{selectedOrder.deliveryMethod}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Expected Delivery</p>
                      <p className="font-medium">
                        {selectedOrder.expectedDeliveryDate
                          ? new Date(selectedOrder.expectedDeliveryDate).toLocaleDateString()
                          : '-'}
                      </p>
                    </div>
                  </div>
                  {selectedOrder.deliveryInstructions && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600">Instructions</p>
                      <p className="font-medium">{selectedOrder.deliveryInstructions}</p>
                    </div>
                  )}
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="font-semibold mb-3">Order Items</h3>
                  <div className="space-y-2 border rounded-lg p-3">
                    {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b last:border-b-0">
                          <div>
                            <p className="font-medium">{item.itemName}</p>
                            <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{selectedOrder.currency.toUpperCase()} {item.unitPrice?.toFixed(2) || '0.00'}</p>
                            <p className="text-xs text-gray-600">Total: {selectedOrder.currency.toUpperCase()} {item.total?.toFixed(2) || '0.00'}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No items</p>
                    )}
                  </div>
                </div>

                {/* Pricing Summary */}
                <div>
                  <h3 className="font-semibold mb-3">Pricing Summary</h3>
                  <div className="space-y-2 border rounded-lg p-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">{selectedOrder.currency.toUpperCase()} {selectedOrder.subtotal?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-medium">{selectedOrder.currency.toUpperCase()} {selectedOrder.tax?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery Cost</span>
                      <span className="font-medium">{selectedOrder.currency.toUpperCase()} {selectedOrder.deliveryCost?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-semibold text-lg">
                      <span>Total Amount</span>
                      <span>{selectedOrder.currency.toUpperCase()} {selectedOrder.totalAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div>
                  <h3 className="font-semibold mb-3">Payment Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Payment Method</p>
                      <p className="font-medium">{selectedOrder.paymentMethod || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Payment Status</p>
                      <Badge variant={selectedOrder.paymentStatus === 'completed' ? 'default' : 'secondary'} className="mt-1">
                        {selectedOrder.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div>
                    <h3 className="font-semibold mb-3">Notes</h3>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOrderDetailModalOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* COMPANY & CONTACT INFO TAB */}
        <TabsContent value="company" className="space-y-6">
          {/* Contact Information */}
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-gray-900">{t('websiteManager.contactInfo')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('websiteManager.contactInfoDesc')}</p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <Phone className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1">
                  <Label>{t('websiteManager.phoneNumber')}</Label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => handleCompanyInfoInputChange('phone', e.target.value)}
                    disabled={!canEdit}
                    className={`mt-2 ${companyInfoErrors.phone ? 'border-red-500' : ''}`}
                    placeholder="+355 4 123 4567"
                  />
                  {companyInfoErrors.phone && (
                    <p className="text-xs text-red-600 mt-1">{companyInfoErrors.phone}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{t('websiteManager.phonePrimaryDesc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <Mail className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1">
                  <Label>{t('websiteManager.emailAddress')}</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => handleCompanyInfoInputChange('email', e.target.value)}
                    disabled={!canEdit}
                    className={`mt-2 ${companyInfoErrors.email ? 'border-red-500' : ''}`}
                    placeholder="info@izogrup.al"
                  />
                  {companyInfoErrors.email && (
                    <p className="text-xs text-red-600 mt-1">{companyInfoErrors.email}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{t('websiteManager.emailMainDesc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <Label>{t('websiteManager.address')} *</Label>
                  <Textarea
                    value={address}
                    onChange={(e) => handleCompanyInfoInputChange('address', e.target.value)}
                    disabled={!canEdit}
                    rows={3}
                    className={`mt-2 ${companyInfoErrors.address ? 'border-red-500' : ''}`}
                    placeholder="Rruga Myslym Shyri, Nr. 42&#10;Tirana 1001, Albania"
                  />
                  {companyInfoErrors.address && (
                    <p className="text-xs text-red-600 mt-1">{companyInfoErrors.address}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{t('websiteManager.addressPhysicalDesc')}</p>
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
                {/* <Button variant="outline" onClick={loadCompanyInfo}>Cancel</Button> */}
                <Button
                  onClick={handleSaveCompanyInfo}
                  disabled={isContactInfoSaveDisabled}
                  className={!hasContactInfoChanges ? 'opacity-50' : ''}
                >
                  {loadingCompanyInfo ? t('websiteManager.saving') : t('websiteManager.saveChanges')}
                </Button>
              </div>
            )}
          </Card>

          {/* Company Documents */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-gray-900">{t('websiteManager.companyDocuments')}</h3>
                <p className="text-sm text-gray-500 mt-1">{t('websiteManager.companyDocumentsDesc')}</p>
              </div>
            </div>

            <div className="space-y-4">
              {companyCV ? (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                        <File className="w-6 h-6 text-brand-600" />
                      </div>
                      <div>
                        <p className="text-gray-900">{t('websiteManager.companyCVProfile')}</p>
                        <p className="text-sm text-gray-500">{t('websiteManager.companyCVDesc')}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {canEdit && (
                        <>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handleCVUpload}
                            className="hidden"
                            id="cv-upload"
                            disabled={uploadingCV}
                          />
                          <label htmlFor="cv-upload">
                            <Button variant="outline" size="sm" asChild disabled={uploadingCV}>
                              <span>
                                <Upload className="w-4 h-4 mr-2" />
                                {uploadingCV ? t('websiteManager.saving') : t('websiteManager.update')}
                              </span>
                            </Button>
                          </label>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Open in new tab for viewing/downloading
                          window.open(companyCV, '_blank');
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {t('websiteManager.viewDownload')}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Badge variant="outline">PDF</Badge>
                    <span>{t('websiteManager.uploaded')}</span>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <File className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-900 mb-2">{t('websiteManager.noCompanyCV')}</p>
                  <p className="text-sm text-gray-500 mb-4">{t('websiteManager.uploadPDFMax')}</p>
                  {canEdit && (
                    <>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleCVUpload}
                        className="hidden"
                        id="cv-upload"
                        disabled={uploadingCV}
                      />
                      <label htmlFor="cv-upload">
                        <Button variant="outline" asChild disabled={uploadingCV}>
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            {uploadingCV ? t('websiteManager.saving') : t('websiteManager.uploadCV')}
                          </span>
                        </Button>
                      </label>
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-gray-900">{t('websiteManager.socialMediaLinks')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('websiteManager.socialMediaDesc')}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                  <Facebook className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1">
                  <Label className="text-sm">Facebook</Label>
                  <Input
                    value={facebookUrl}
                    onChange={(e) => handleCompanyInfoInputChange('facebookUrl', e.target.value)}
                    placeholder="https://facebook.com/izogrup"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Instagram className="w-5 h-5 text-pink-600" />
                </div>
                <div className="flex-1">
                  <Label className="text-sm">Instagram</Label>
                  <Input
                    value={instagramUrl}
                    onChange={(e) => handleCompanyInfoInputChange('instagramUrl', e.target.value)}
                    placeholder="https://instagram.com/izogrup"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Youtube className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <Label className="text-sm">YouTube</Label>
                  <Input
                    value={youtubeUrl}
                    onChange={(e) => handleCompanyInfoInputChange('youtubeUrl', e.target.value)}
                    placeholder="https://youtube.com/@izogrup"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                  <Linkedin className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1">
                  <Label className="text-sm">LinkedIn</Label>
                  <Input
                    value={linkedinUrl}
                    onChange={(e) => handleCompanyInfoInputChange('linkedinUrl', e.target.value)}
                    placeholder="https://linkedin.com/company/izogrup"
                    disabled={!canEdit}
                  />
                </div>
              </div>
              {/* 
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <Label className="text-sm">TikTok</Label>
                  <Input 
                    value={tiktokUrl}
                    onChange={(e) => handleCompanyInfoInputChange('tiktokUrl', e.target.value)}
                    placeholder="https://tiktok.com/@izogrup"
                    disabled={!canEdit}
                  />
                </div>
              </div> */}
            </div>

            {canEdit && (
              <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
                {/* <Button variant="outline" onClick={loadCompanyInfo}>Cancel</Button> */}
                <Button
                  onClick={handleSaveCompanyInfo}
                  disabled={!hasSocialMediaChanges || loadingCompanyInfo}
                  className={!hasSocialMediaChanges ? 'opacity-50' : ''}
                >
                  {loadingCompanyInfo ? t('websiteManager.saving') : t('websiteManager.saveChanges')}
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-gray-900">{t('websiteManager.appStoreLinks')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('websiteManager.appStoreLinksDesc')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Google Play Store</Label>
                <Input
                  value={googlePlayUrl}
                  onChange={(e) => handleCompanyInfoInputChange('googlePlayUrl', e.target.value)}
                  placeholder="https://play.google.com/store/apps/details?id=..."
                  disabled={!canEdit}
                />
              </div>

              <div>
                <Label>Apple App Store</Label>
                <Input
                  value={appStoreUrl}
                  onChange={(e) => handleCompanyInfoInputChange('appStoreUrl', e.target.value)}
                  placeholder="https://apps.apple.com/app/..."
                  disabled={!canEdit}
                />
              </div>
            </div>

            {canEdit && (
              <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
                {/* <Button variant="outline" onClick={loadCompanyInfo}>Cancel</Button> */}
                <Button
                  onClick={handleSaveCompanyInfo}
                  disabled={!hasAppStoreChanges || loadingCompanyInfo}
                  className={!hasAppStoreChanges ? 'opacity-50' : ''}
                >
                  {loadingCompanyInfo ? t('websiteManager.saving') : t('websiteManager.saveChanges')}
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-gray-900 mb-6">{t('websiteManager.generalWebsiteSettings')}</h3>
            <div className="space-y-6">
              <div>
                <Label>{t('websiteManager.websiteTitle')}</Label>
                <Input
                  value={websiteTitle}
                  onChange={(e) => setWebsiteTitle(e.target.value)}
                  disabled={!canEdit || loadingSettings}
                  placeholder={t('websiteManager.websiteTitlePlaceholder')}
                />
              </div>

              <div>
                <Label>{t('websiteManager.metaDescriptionSEO')}</Label>
                <Textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={3}
                  disabled={!canEdit || loadingSettings}
                  placeholder={t('websiteManager.metaDescriptionPlaceholder')}
                />
              </div>

              <div>
                <Label>{t('websiteManager.metaKeywords')} (SEO)</Label>
                <Input
                  value={metaKeywords}
                  onChange={(e) => setMetaKeywords(e.target.value)}
                  disabled={!canEdit || loadingSettings}
                  placeholder={t('websiteManager.metaKeywordsPlaceholder')}
                />
              </div>


              {canEdit && (
                <div className="flex justify-end gap-2 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handleResetSettings}
                    disabled={loadingSettings}
                  >
                    {t('websiteManager.resetToDefaults')}
                  </Button>
                  <Button
                    onClick={handleSaveSettings}
                    disabled={loadingSettings || (
                      websiteTitle === originalSettings.websiteTitle &&
                      metaDescription === originalSettings.metaDescription &&
                      metaKeywords === originalSettings.metaKeywords
                    )}
                  >
                    {loadingSettings ? t('websiteManager.saving') : t('websiteManager.saveSettings')}
                  </Button>
                </div>
              )}
            </div>
          </Card>


        </TabsContent>
      </Tabs>



      {/* Product Form */}
      <ProductServiceForm
        type="product"
        isOpen={isProductFormOpen}
        onClose={() => {
          setIsProductFormOpen(false);
          setEditingItem(null);
        }}
        onSuccess={handleProductSuccess}
        editData={editingItem}
      />

      {/* Service Form */}
      <ProductServiceForm
        type="service"
        isOpen={isServiceFormOpen}
        onClose={() => {
          setIsServiceFormOpen(false);
          setEditingItem(null);
        }}
        onSuccess={handleServiceSuccess}
        editData={editingItem}
      />

      {/* Product View Modal */}
      <ProductServiceView
        type="product"
        data={viewingItem}
        isOpen={isProductViewOpen}
        onClose={() => {
          setIsProductViewOpen(false);
          setViewingItem(null);
        }}
      />

      {/* Service View Modal */}
      <ProductServiceView
        type="service"
        data={viewingItem}
        isOpen={isServiceViewOpen}
        onClose={() => {
          setIsServiceViewOpen(false);
          setViewingItem(null);
        }}
      />

      {/* Generic Dialog for Other Types (Project, Blog, etc.) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'project' && 'Add/Edit Project'}
              {dialogType === 'blog' && 'Add/Edit Blog Post'}
              {dialogType === 'client' && 'Add Client Logo'}
              {dialogType === 'video' && 'Add Video Tutorial'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Title/Name</Label>
              <Input placeholder="Enter title" />
            </div>

            {(dialogType === 'project' || dialogType === 'blog') && (
              <div>
                <Label>Description</Label>
                <Textarea placeholder="Enter description" rows={4} />
              </div>
            )}

            {dialogType === 'blog' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="news">News</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Publish Date</Label>
                    <Input type="date" />
                  </div>
                </div>

                <div>
                  <Label>Meta Title (SEO)</Label>
                  <Input placeholder="SEO title for search engines" />
                </div>

                <div>
                  <Label>Meta Description (SEO)</Label>
                  <Textarea placeholder="SEO description" rows={2} />
                </div>
              </>
            )}

            {dialogType === 'video' && (
              <div>
                <Label>YouTube URL or Upload Video</Label>
                <Input placeholder="https://youtube.com/watch?v=..." />
              </div>
            )}

            <div>
              <Label>Images</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsDialogOpen(false)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Slider Form Dialog */}
      <SliderForm
        isOpen={isSliderFormOpen}
        onClose={() => {
          setIsSliderFormOpen(false);
          setEditingSlider(null);
        }}
        onSuccess={handleSliderSuccess}
        editData={editingSlider}
      />

      {/* Add Products to Homepage Dialog */}
      <AddToHomepageDialog
        type="product"
        isOpen={isAddProductDialogOpen}
        onClose={() => setIsAddProductDialogOpen(false)}
        onSuccess={() => wm.loadHomepageItems()}
      />

      {/* Add Services to Homepage Dialog */}
      <AddToHomepageDialog
        type="service"
        isOpen={isAddServiceDialogOpen}
        onClose={() => setIsAddServiceDialogOpen(false)}
        onSuccess={() => wm.loadHomepageItems()}
      />

      {/* Add Projects to Homepage Dialog */}
      <AddToHomepageDialog
        type="project"
        isOpen={isAddProjectDialogOpen}
        onClose={() => setIsAddProjectDialogOpen(false)}
        onSuccess={() => wm.loadHomepageItems()}
      />

      {/* Add Blogs to Homepage Dialog */}
      <AddToHomepageDialog
        type="blog"
        isOpen={isAddBlogDialogOpen}
        onClose={() => setIsAddBlogDialogOpen(false)}
        onSuccess={() => wm.loadHomepageItems()}
      />

      {/* Add Videos to Homepage Dialog */}
      <AddToHomepageDialog
        type="video"
        isOpen={isAddVideoDialogOpen}
        onClose={() => setIsAddVideoDialogOpen(false)}
        onSuccess={() => wm.loadHomepageItems()}
      />

      {/* Video Form Dialog */}
      <VideoForm
        isOpen={isVideoFormOpen}
        onClose={() => {
          setIsVideoFormOpen(false);
          setEditingVideo(null);
        }}
        onSuccess={handleVideoSuccess}
        editData={editingVideo}
      />

      {/* Partner Logo Form Dialog */}
      <ClientForm
        isOpen={isPartnerLogoFormOpen}
        onClose={() => {
          setIsPartnerLogoFormOpen(false);
          setEditingPartnerLogo(null);
        }}
        onSuccess={handlePartnerLogoSuccess}
        editData={editingPartnerLogo}
      />

      {/* Project Form Dialog */}
      <ProjectForm
        isOpen={isProjectFormOpen}
        onClose={() => {
          setIsProjectFormOpen(false);
          setEditingProject(null);
        }}
        onSuccess={handleProjectSuccess}
        editData={editingProject}
      />

      {/* Project View Dialog */}
      <ProjectView
        isOpen={isProjectViewOpen}
        onClose={() => {
          setIsProjectViewOpen(false);
          setViewingProject(null);
        }}
        project={viewingProject}
      />

      {/* Blog Form Dialog */}
      <BlogForm
        isOpen={isBlogFormOpen}
        onClose={() => {
          setIsBlogFormOpen(false);
          setEditingBlog(null);
        }}
        onSuccess={handleBlogSuccess}
        editData={editingBlog}
        categories={blogCategories}
      />

      {/* Blog View Dialog */}
      <BlogView
        isOpen={isBlogViewOpen}
        onClose={() => {
          setIsBlogViewOpen(false);
          setViewingBlog(null);
        }}
        blog={viewingBlog}
      />

      {/* Blog Category Dialog */}
      <Dialog open={isBlogCategoryDialogOpen} onOpenChange={setIsBlogCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Blog Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Category Name *</Label>
              <Input
                value={newBlogCategoryName}
                onChange={(e) => setNewBlogCategoryName(e.target.value)}
                placeholder="Enter category name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateBlogCategory();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsBlogCategoryDialogOpen(false);
                setNewBlogCategoryName('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateBlogCategory}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Form Dialog */}
      <ProductServiceForm
        type="product"
        isOpen={isProductFormOpen}
        onClose={() => {
          setIsProductFormOpen(false);
          setEditingItem(null);
        }}
        onSuccess={handleProductSuccess}
        editData={editingItem}
      />

      {/* Service Form Dialog */}
      <ProductServiceForm
        type="service"
        isOpen={isServiceFormOpen}
        onClose={() => {
          setIsServiceFormOpen(false);
          setEditingItem(null);
        }}
        onSuccess={handleServiceSuccess}
        editData={editingItem}
      />

      {/* Product View Dialog */}
      <ProductServiceView
        type="product"
        isOpen={isProductViewOpen}
        onClose={() => {
          setIsProductViewOpen(false);
          setViewingItem(null);
        }}
        data={viewingItem}
      />

      {/* Service View Dialog */}
      <ProductServiceView
        type="service"
        isOpen={isServiceViewOpen}
        onClose={() => {
          setIsServiceViewOpen(false);
          setViewingItem(null);
        }}
        data={viewingItem}
      />
    </div>
  );
}
