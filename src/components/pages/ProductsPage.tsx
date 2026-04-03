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
import { Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2, Download, Image as ImageIcon, FileText, Video, Loader, ChevronUp, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
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

  // Sort icon component
  const SortIcon = ({ field }: { field: keyof Product | 'category' }) => {
    if (sortField !== field) {
      return <div className="w-4 h-4" />; // Empty space when not sorted
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
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

  const openProductView = (product: Product) => {
    setViewingProduct(product);
    setIsProductViewOpen(true);
  };

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

  // Truncate long text for display - prevents layout disruption from very long titles
  const MAX_TITLE_LENGTH = 30;
  const truncateDisplay = (text: string | undefined, maxLen: number = MAX_TITLE_LENGTH): string => {
    if (!text || typeof text !== 'string') return '';
    return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
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

              {/* Quick Filter for Out of Stock */}
              <Button
                variant={statusFilter === 'out_of_stock' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (statusFilter === 'out_of_stock') {
                    setStatusFilter('all');
                  } else {
                    setStatusFilter('out_of_stock');
                  }
                }}
                className={statusFilter === 'out_of_stock' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                {statusFilter === 'out_of_stock' ? 'Show All' : 'Out of Stock Only'}
              </Button>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-3 sm:p-4 min-w-0">
              <p className="text-sm text-gray-500 mb-1 truncate">Total Products</p>
              <p className="text-gray-900">{filteredProducts.length}</p>
              {filteredProducts.length !== products.length && (
                <p className="text-xs text-gray-400">of {products.length} total</p>
              )}
            </Card>
            <Card className="p-3 sm:p-4 min-w-0">
              <p className="text-sm text-gray-500 mb-1 truncate">Published on Website</p>
              <p className="text-gray-900">{filteredProducts.filter(p => p.publishOnWebsite).length}</p>
            </Card>
            <Card className="p-3 sm:p-4 min-w-0">
              <p className="text-sm text-gray-500 mb-1 truncate">Sellable Online</p>
              <p className="text-gray-900">{filteredProducts.filter(p => p.enableOnlineSales).length}</p>
            </Card>
            <Card className="p-3 sm:p-4 min-w-0">
              <p className="text-sm text-gray-500 mb-1 truncate">Out of Stock (0)</p>
              <p className="text-red-700 font-semibold">{filteredProducts.filter(p => (p.stock || 0) === 0).length}</p>
            </Card>
          </div>

          {/* Products Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="table-fixed w-full min-w-[800px]" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 200, minWidth: 200, maxWidth: 200 }} />
                  <col style={{ width: 140 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 70 }} />
                  <col style={{ width: 90 }} />
                  {userRole !== 'offer_manager' && <col style={{ width: 90 }} />}
                  {userRole !== 'offer_manager' && <col style={{ width: 90 }} />}
                  <col style={{ width: 100 }} />
                  <col style={{ width: 120 }} />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 select-none w-[200px] min-w-[140px] max-w-[200px]"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Product Name</span>
                        <SortIcon field="title" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 select-none w-[140px] min-w-[100px] max-w-[140px]"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Category</span>
                        <SortIcon field="category" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[100px] min-w-[80px] max-w-[100px]">Subcategory</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort('sku')}
                    >
                      <div className="flex items-center gap-2">
                        <span>SKU</span>
                        <SortIcon field="sku" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort('upc')}
                    >
                      <div className="flex items-center gap-2">
                        <span>UPC</span>
                        <SortIcon field="upc" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort('price')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Price</span>
                        <SortIcon field="price" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort('stock')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Stock</span>
                        <SortIcon field="stock" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Status</span>
                        <SortIcon field="status" />
                      </div>
                    </TableHead>
                    {userRole !== 'offer_manager' && <TableHead>Online Sales</TableHead>}
                    {userRole !== 'offer_manager' && <TableHead>Published</TableHead>}
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Created</span>
                        <SortIcon field="createdAt" />
                      </div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={userRole === 'offer_manager' ? 10 : 12} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <Loader className="w-4 h-4 animate-spin" />
                          <span className="text-gray-500">Loading products...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={userRole === 'offer_manager' ? 10 : 12} className="text-center py-8 text-gray-500">
                        {products.length === 0 ? t('products.noProductsFound') : t('products.noProductsMatch')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell
                          className="text-gray-900"
                          style={{ width: 200, maxWidth: 200, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                          title={product.title}
                        >
                          {truncateDisplay(product.title)}
                        </TableCell>
                        <TableCell className="max-w-[140px] min-w-[100px] w-[140px] overflow-hidden whitespace-nowrap">
                          {(product.category ?? product.subcategory?.category) ? (
                            <Badge variant="outline" className="max-w-full truncate block" title={(product.category ?? product.subcategory?.category)?.name}>
                              {truncateDisplay((product.category ?? product.subcategory?.category)?.name, 25)}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[100px] min-w-[80px] w-[100px] overflow-hidden whitespace-nowrap">
                          <span className="text-sm text-gray-600 truncate block" title={product.subcategory?.name || ''}>
                            {product.subcategory?.name && product.subcategory.name.toLowerCase() !== 'general'
                              ? truncateDisplay(product.subcategory.name, 20)
                              : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[100px]">
                          <span className="text-sm text-gray-600 truncate block" title={product.sku || ''}>
                            {product.sku || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[100px]">
                          <span className="text-sm text-gray-600 truncate block" title={product.documents?.upc || ''}>
                            {product.documents?.upc || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="min-w-[90px] overflow-hidden">
                          {product.price ? (
                            <span className="text-gray-900 whitespace-nowrap truncate block" title={`${product.documents?.currency || 'EUR'} ${product.price}`}>
                              {product.documents?.currency || 'EUR'} {product.price}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="min-w-[90px] max-w-[120px] overflow-hidden">
                          <span className={`text-sm font-medium whitespace-nowrap truncate block ${
                            (product.stock || 0) === 0 
                              ? 'text-red-700' 
                              : (product.stock || 0) <= 5 
                                ? 'text-red-600' 
                                : (product.stock || 0) <= 10 
                                  ? 'text-orange-600' 
                                  : 'text-gray-600'
                          }`} title={`${product.stock ?? 0}${(product.stock || 0) === 0 ? ' (Out of Stock)' : (product.stock || 0) <= 5 ? ' (Low)' : ''}`}>
                            {product.stock ?? 0}
                            {(product.stock || 0) === 0 && (
                              <span className="ml-1 text-xs font-semibold">(Out)</span>
                            )}
                            {(product.stock || 0) > 0 && (product.stock || 0) <= 5 && (
                              <span className="ml-1 text-xs">(Low)</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="min-w-[90px] overflow-hidden">
                          <Badge
                            variant={product.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs truncate max-w-full capitalize"
                            title={product.status}
                          >
                            {product.status.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        {userRole !== 'offer_manager' && (
                          <TableCell className="min-w-[70px]">
                            <Badge variant={product.enableOnlineSales ? 'default' : 'secondary'} className="text-xs">
                              {product.enableOnlineSales ? 'Yes' : 'No'}
                            </Badge>
                          </TableCell>
                        )}
                        {userRole !== 'offer_manager' && (
                          <TableCell className="min-w-[60px]">
                            <Switch
                              checked={product.publishOnWebsite}
                              onCheckedChange={() => handlePublishToggle(product.id, product.publishOnWebsite)}
                              disabled={!canEdit}
                            />
                          </TableCell>
                        )}
                        <TableCell className="min-w-[90px] overflow-hidden">
                          <span className="text-sm text-gray-500 whitespace-nowrap truncate block" title={new Date(product.createdAt).toLocaleDateString()}>
                            {new Date(product.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="min-w-[100px]">
                          <div className="flex gap-1 flex-wrap">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="shrink-0 h-8 w-8"
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
                                  className="shrink-0 h-8 w-8"
                                  onClick={() => openProductForm(product)}
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                {canDeleteProduct(product) && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="shrink-0 h-8 w-8"
                                    onClick={() => handleDeleteProduct(product.id)}
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                )}
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
              onClose={() => setIsProductViewOpen(false)}
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
