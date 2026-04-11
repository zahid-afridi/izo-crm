"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import Image from 'next/image';
import { Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2, Download, Image as ImageIcon, FileText, Video, Loader, ChevronUp, ChevronDown } from 'lucide-react';
import { ProductServiceForm } from './ProductServiceForm';
import { ProductServiceView } from './ProductServiceView';
import { CategoryManagement } from './CategoryManagement';
import { ProductExportDialog } from './ProductExportDialog';
import { toast } from 'sonner';
import { hasPermission } from '@/config/rolePermissions';

interface ProductsPageProps {
  userRole: string;
}

interface Product {
  id: string;
  title: string;
  description?: string;
  sku?: string;
  upc?: string;
  unit?: string;
  price?: number;
  stock?: number;
  status: string;
  categoryId?: string;
  subcategoryId?: string;
  category?: {
    id: string;
    name: string;
  };
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
  createdBy?: string;
  creator?: {
    id: string;
    fullName: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
}

export function ProductsPage({ userRole }: ProductsPageProps) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [onlineSalesFilter, setOnlineSalesFilter] = useState('all');
  const [publishedFilter, setPublishedFilter] = useState('all');
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isProductViewOpen, setIsProductViewOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [openProductMenuId, setOpenProductMenuId] = useState<string | null>(null);
  const [productMenuPosition, setProductMenuPosition] = useState<{
    top: number;
    right: number;
    openUpward: boolean;
  } | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<keyof Product | 'category' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const canEdit = ['admin', 'product_manager', 'offer_manager', 'website_manager'].includes(userRole);
  const canExport = hasPermission(userRole, 'export', 'products');

  // Function to check if current user can delete a specific product
  const canDeleteProduct = (product: Product) => {
    if (userRole === 'admin') {
      return true; // Admin can delete any product
    }
    if (userRole === 'offer_manager') {
      return product.createdBy === currentUser?.id; // Offer manager can only delete their own products
    }
    return false; // Other roles cannot delete products
  };

  // Sorting function
  const handleSort = (field: keyof Product | 'category') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortChevron = ({ field }: { field: keyof Product | 'category' }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3 shrink-0 text-gray-500" aria-hidden />
    ) : (
      <ChevronDown className="h-3 w-3 shrink-0 text-gray-500" aria-hidden />
    );
  };

  // Load products on mount
  useEffect(() => {
    loadProducts();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error(t('products.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleProductSuccess = () => {
    // Clear all filters and sorting to show latest product at top
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setOnlineSalesFilter('all');
    setPublishedFilter('all');
    setSortField('createdAt');
    setSortDirection('desc');
    
    loadProducts();
    setIsProductFormOpen(false);
    setEditingProduct(null);
    toast.success(editingProduct ? t('products.updateSuccess') : t('products.createSuccess'));
  };

  const handlePublishToggle = async (productId: string, currentStatus: boolean) => {
    // Optimistic update
    const previousProducts = products;
    setProducts(products.map(p =>
      p.id === productId ? { ...p, publishOnWebsite: !currentStatus } : p
    ));

    try {
      const formData = new FormData();
      formData.append('publishOnWebsite', (!currentStatus).toString());

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        body: formData,
      });

      if (response.ok) {
        toast.success(!currentStatus ? t('products.publishedSuccess') : t('products.unpublishedSuccess'));
      } else {
        // Rollback on failure
        setProducts(previousProducts);
        const error = await response.json();
        toast.error(error.error || t('products.failedToUpdate'));
      }
    } catch (error) {
      // Rollback on error
      setProducts(previousProducts);
      console.error('Error updating product:', error);
      toast.error(t('products.failedToUpdate'));
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm(t('products.deleteConfirm'))) return;

    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (response.ok) {
        loadProducts();
        toast.success(t('products.deleteSuccess'));
      } else {
        toast.error(t('products.failedToDelete'));
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(t('products.failedToDelete'));
    }
  };

  const openProductForm = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
    } else {
      setEditingProduct(null);
    }
    setIsProductFormOpen(true);
  };

  const openProductView = async (product: Product) => {
    try {
      const response = await fetch(`/api/products/${product.id}`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || t('products.failedToLoad'));
        return;
      }
      const data = await response.json();
      setViewingProduct(data.product);
      setIsProductViewOpen(true);
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error(t('products.failedToLoad'));
    }
  };

  const closeProductMenu = () => {
    setOpenProductMenuId(null);
    setProductMenuPosition(null);
  };

  const handleProductMenuToggle = (productId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (openProductMenuId === productId) {
      closeProductMenu();
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const dropdownHeight = 140;
      const dropdownWidth = 160;
      const padding = 8;

      const spaceBelow = viewportHeight - rect.bottom - padding;
      const spaceAbove = rect.top - padding;
      const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove >= dropdownHeight;

      let top = shouldOpenUpward ? rect.top - dropdownHeight : rect.bottom;
      if (top < padding) {
        top = padding;
      } else if (top + dropdownHeight > viewportHeight - padding) {
        top = viewportHeight - dropdownHeight - padding;
      }

      let right = viewportWidth - rect.right;
      if (right < padding) {
        right = viewportWidth - rect.left - dropdownWidth;
        if (right < padding) {
          right = padding;
        }
      }

      setProductMenuPosition({
        top,
        right: Math.max(padding, right),
        openUpward: shouldOpenUpward,
      });
      setOpenProductMenuId(productId);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      if (openProductMenuId) closeProductMenu();
    };
    const handleScroll = () => {
      if (openProductMenuId) closeProductMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openProductMenuId) closeProductMenu();
    };
    const handleResize = () => {
      if (openProductMenuId) closeProductMenu();
    };

    if (openProductMenuId) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', handleResize);
      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('scroll', handleScroll, true);
        document.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [openProductMenuId]);

  const filteredProducts = products.filter(product => {
    const matchesSearch =
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.documents?.upc && product.documents.upc.toLowerCase().includes(searchQuery.toLowerCase()));

    const categoryName = product.category?.name ?? product.subcategory?.category?.name;
    const matchesCategory =
      categoryFilter === 'all' ||
      categoryName === categoryFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      product.status === statusFilter;

    const matchesOnlineSales =
      onlineSalesFilter === 'all' ||
      (onlineSalesFilter === 'enabled' && product.enableOnlineSales) ||
      (onlineSalesFilter === 'disabled' && !product.enableOnlineSales);

    const matchesPublished =
      publishedFilter === 'all' ||
      (publishedFilter === 'published' && product.publishOnWebsite) ||
      (publishedFilter === 'unpublished' && !product.publishOnWebsite);

    return matchesSearch && matchesCategory && matchesStatus && matchesOnlineSales && matchesPublished;
  }).sort((a, b) => {
    // If no sorting is applied, preserve the original order from API (already sorted by createdAt desc)
    if (!sortField) {
      return 0;
    }

    let aValue: any;
    let bValue: any;

    if (sortField === 'category') {
      aValue = (a.category?.name ?? a.subcategory?.category?.name) || '';
      bValue = (b.category?.name ?? b.subcategory?.category?.name) || '';
    } else if (sortField === 'upc') {
      aValue = a.documents?.upc || '';
      bValue = b.documents?.upc || '';
    } else {
      aValue = a[sortField];
      bValue = b[sortField];
    }

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
    if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

    // Handle date fields
    if (sortField === 'createdAt' || sortField === 'updatedAt') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }
    // Convert to string for comparison if needed
    else if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Truncate long text for badges / secondary fields
  const MAX_TITLE_LENGTH = 30;
  const truncateDisplay = (text: string | undefined, maxLen: number = MAX_TITLE_LENGTH): string => {
    if (!text || typeof text !== 'string') return '';
    return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
  };

  /** Keeps the product name column stable: only first N words, then an ellipsis. */
  const truncateTitleWords = (text: string | undefined, maxWords = 5): string => {
    if (!text || typeof text !== 'string') return '';
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    if (words.length <= maxWords) return words.join(' ');
    return `${words.slice(0, maxWords).join(' ')}…`;
  };

  // Get unique categories (from direct category or subcategory)
  const categories = Array.from(
    new Set(products.map(p => p.category?.name ?? p.subcategory?.category?.name).filter(Boolean))
  );

  // Get unique statuses
  const statuses = Array.from(
    new Set(products.map(p => p.status).filter(Boolean))
  );

  return (
    <div className="space-y-6 w-full min-w-0">
      <Tabs defaultValue="products" className="space-y-4 w-full min-h-0">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100">
          <TabsTrigger value="products" className="data-[state=active]:bg-brand-gradient data-[state=active]:text-white">{t('products.productsList')}</TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-brand-gradient data-[state=active]:text-white">{t('products.manageCategories')}</TabsTrigger>
        </TabsList>

        {/* PRODUCTS TAB */}
        <TabsContent value="products" className="space-y-6 w-full min-w-0">
          {/* Header Actions */}
          <div className="flex flex-col gap-4">
            {/* Search and Add Product Row */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t('products.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                {canExport && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (products.length === 0) {
                        toast.error(t('products.noProductsToExport'));
                        return;
                      }
                      setIsExportDialogOpen(true);
                    }}
                    disabled={products.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t('products.exportCatalog')}
                  </Button>
                )}

                {canEdit && (
                  <Button onClick={() => openProductForm()}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('products.addProduct')}
                  </Button>
                )}
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40 sm:w-48 min-w-[140px] overflow-hidden">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Filter className="w-4 h-4 flex-shrink-0" />
                    <SelectValue placeholder="All Categories" className="truncate min-w-0" />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-w-[300px] max-h-[280px]" sideOffset={4}>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat || 'uncategorized'}>
                      <span className="truncate block" title={cat || 'Uncategorized'}>
                        {cat || 'Uncategorized'}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] sm:w-40 min-w-[100px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>
                      <span className="capitalize">{status.replace('_', ' ')}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={onlineSalesFilter} onValueChange={setOnlineSalesFilter}>
                <SelectTrigger className="w-[140px] sm:w-44 min-w-[100px]">
                  <SelectValue placeholder="Online Sales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Online Sales</SelectItem>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={publishedFilter} onValueChange={setPublishedFilter}>
                <SelectTrigger className="w-[130px] sm:w-40 min-w-[100px]">
                  <SelectValue placeholder="Published" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Published</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="unpublished">Unpublished</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters Button */}
              {(categoryFilter !== 'all' || statusFilter !== 'all' || onlineSalesFilter !== 'all' || publishedFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCategoryFilter('all');
                    setStatusFilter('all');
                    setOnlineSalesFilter('all');
                    setPublishedFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}

            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Card className="p-3 sm:p-4 min-w-0">
              <p className="text-sm text-gray-500 mb-1 truncate">Total Products</p>
              <p className="text-gray-900 text-lg font-medium tabular-nums">{filteredProducts.length}</p>
              {filteredProducts.length !== products.length && (
                <p className="text-xs text-gray-400">of {products.length} total</p>
              )}
            </Card>
            <Card className="p-3 sm:p-4 min-w-0">
              <p className="text-sm text-gray-500 mb-1 truncate">Published on Website</p>
              <p className="text-gray-900 text-lg font-medium tabular-nums">{filteredProducts.filter(p => p.publishOnWebsite).length}</p>
            </Card>
            <Card className="p-3 sm:p-4 min-w-0">
              <p className="text-sm text-gray-500 mb-1 truncate">Sellable Online</p>
              <p className="text-gray-900 text-lg font-medium tabular-nums">{filteredProducts.filter(p => p.enableOnlineSales).length}</p>
            </Card>
          </div>

          {/* Products table — layout matches Workers page; row menu uses fixed positioning (not clipped by overflow) */}
          <div className="relative w-full overflow-hidden">
            <Card className="p-0 sm:p-0">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full px-4 sm:px-0">
                  <Table className="w-full text-xs sm:text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm w-12">
                          {t('products.thumbnail', { defaultValue: 'Thumbnail' })}
                        </TableHead>
                        <TableHead
                          className="text-xs sm:text-sm cursor-pointer select-none max-w-[14rem]"
                          onClick={() => handleSort('title')}
                        >
                          <span className="inline-flex items-center gap-1">
                            {t('orders.productName')}
                            <SortChevron field="title" />
                          </span>
                        </TableHead>
                        <TableHead
                          className="text-xs sm:text-sm cursor-pointer select-none"
                          onClick={() => handleSort('category')}
                        >
                          <span className="inline-flex items-center gap-1">
                            {t('products.category')}
                            <SortChevron field="category" />
                          </span>
                        </TableHead>
                        <TableHead
                          className="text-xs sm:text-sm cursor-pointer select-none whitespace-nowrap"
                          onClick={() => handleSort('price')}
                        >
                          <span className="inline-flex items-center gap-1">
                            {t('products.price')}
                            <SortChevron field="price" />
                          </span>
                        </TableHead>
                        <TableHead
                          className="text-xs sm:text-sm cursor-pointer select-none"
                          onClick={() => handleSort('status')}
                        >
                          <span className="inline-flex items-center gap-1">
                            {t('common.status')}
                            <SortChevron field="status" />
                          </span>
                        </TableHead>
                        {userRole !== 'offer_manager' && (
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">
                            {t('products.onlineSales')}
                          </TableHead>
                        )}
                        {userRole !== 'offer_manager' && (
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">
                            {t('products.published')}
                          </TableHead>
                        )}
                        <TableHead className="text-xs sm:text-sm">{t('workers.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={userRole === 'offer_manager' ? 6 : 8} className="text-center py-8 sm:py-12">
                            <div className="flex items-center justify-center gap-2">
                              <Loader className="w-4 h-4 animate-spin" />
                              <span className="text-gray-500">{t('common.loading')}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={userRole === 'offer_manager' ? 6 : 8} className="text-center py-6 sm:py-8 text-xs sm:text-sm text-gray-500">
                            {products.length === 0 ? t('products.noProductsFound') : t('products.noProductsMatch')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProducts.map((product) => {
                          const thumbUrl = product.images?.[0];
                          return (
                            <TableRow key={product.id} className="text-xs sm:text-sm">
                              <TableCell className="w-12 align-middle">
                                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-50">
                                  {thumbUrl ? (
                                    <Image
                                      src={thumbUrl}
                                      alt={truncateDisplay(product.title, 80)}
                                      width={36}
                                      height={36}
                                      className="h-9 w-9 object-cover"
                                      unoptimized
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-gray-300" aria-hidden="true">
                                      <ImageIcon className="h-4 w-4" />
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-900 font-medium max-w-[14rem]" title={product.title}>
                                <span className="block truncate">{truncateTitleWords(product.title, 5)}</span>
                              </TableCell>
                              <TableCell className="align-middle">
                                {(product.category ?? product.subcategory?.category) ? (
                                  <Badge variant="outline" className="text-xs" title={(product.category ?? product.subcategory?.category)?.name}>
                                    {truncateDisplay((product.category ?? product.subcategory?.category)?.name, 18)}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                                {product.price != null ? (
                                  <span className="text-gray-900 tabular-nums">
                                    {product.documents?.currency || 'EUR'} {product.price}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <Badge
                                  variant={product.status === 'active' ? 'default' : 'secondary'}
                                  className="text-xs capitalize"
                                  title={product.status}
                                >
                                  {product.status.replace(/_/g, ' ')}
                                </Badge>
                              </TableCell>
                              {userRole !== 'offer_manager' && (
                                <TableCell className="whitespace-nowrap">
                                  <Badge variant={product.enableOnlineSales ? 'default' : 'secondary'} className="text-xs">
                                    {product.enableOnlineSales ? 'Yes' : 'No'}
                                  </Badge>
                                </TableCell>
                              )}
                              {userRole !== 'offer_manager' && (
                                <TableCell className="align-middle">
                                  <Switch
                                    checked={product.publishOnWebsite}
                                    onCheckedChange={() => handlePublishToggle(product.id, product.publishOnWebsite)}
                                    disabled={!canEdit}
                                  />
                                </TableCell>
                              )}
                              <TableCell className="relative whitespace-nowrap">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => handleProductMenuToggle(product.id, e)}
                                  className="h-7 w-7 hover:bg-gray-100 transition-colors duration-150"
                                  aria-label={t('workers.actions')}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          </div>

          {openProductMenuId &&
            productMenuPosition &&
            (() => {
              const menuProduct = filteredProducts.find((p) => p.id === openProductMenuId);
              return (
                <>
                  <div className="fixed inset-0 z-[9998]" onClick={closeProductMenu} aria-hidden />
                  <div
                    className={`fixed z-[9999] min-w-[160px] bg-white border border-gray-200 rounded-md shadow-lg py-1 transition-all duration-150 ease-out ${
                      productMenuPosition.openUpward
                        ? 'animate-in slide-in-from-bottom-1 fade-in-0'
                        : 'animate-in slide-in-from-top-1 fade-in-0'
                    }`}
                    style={{
                      top: `${productMenuPosition.top}px`,
                      right: `${productMenuPosition.right}px`,
                    }}
                  >
                    <button
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center transition-colors duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (menuProduct) void openProductView(menuProduct);
                        closeProductMenu();
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {t('workers.viewDetails')}
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center transition-colors duration-150"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (menuProduct) openProductForm(menuProduct);
                          closeProductMenu();
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        {t('common.edit')}
                      </button>
                    )}
                    {canEdit && menuProduct && canDeleteProduct(menuProduct) && (
                      <button
                        type="button"
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center text-red-600 transition-colors duration-150"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(menuProduct.id);
                          closeProductMenu();
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('common.delete')}
                      </button>
                    )}
                  </div>
                </>
              );
            })()}

          {/* Product Form Dialog */}
          <Dialog open={isProductFormOpen} onOpenChange={setIsProductFormOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                <DialogDescription>
                  {editingProduct ? 'Update product details, media, and website settings.' : 'Create a new product entry with details, media, and website visibility settings.'}
                </DialogDescription>
              </DialogHeader>
              <ProductServiceForm
                type="product"
                isOpen={isProductFormOpen}
                editData={editingProduct}
                userRole={userRole}
                onSuccess={handleProductSuccess}
                onClose={() => {
                  setIsProductFormOpen(false);
                  setEditingProduct(null);
                }}
              />
            </DialogContent>
          </Dialog>

          {/* Product View Modal */}
          {viewingProduct && (
            <ProductServiceView
              type="product"
              data={viewingProduct}
              isOpen={isProductViewOpen}
              onClose={() => {
                setIsProductViewOpen(false);
                setViewingProduct(null);
              }}
            />
          )}

          {/* Export Dialog */}
          <ProductExportDialog
            isOpen={isExportDialogOpen}
            onClose={() => setIsExportDialogOpen(false)}
            products={products}
          />
        </TabsContent>

        {/* CATEGORIES TAB */}
        <TabsContent value="categories" className="space-y-6">
          <CategoryManagement type="product" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
