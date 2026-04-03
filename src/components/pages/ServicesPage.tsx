"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { Plus, Eye, Edit, Trash2, Search, Download, Filter } from 'lucide-react';
import { ProductServiceForm } from './ProductServiceForm';
import { ProductServiceView } from './ProductServiceView';
import { CategoryManagement } from './CategoryManagement';
import { ServiceExportDialog } from './ServiceExportDialog';
import { toast } from 'sonner';
import { hasPermission } from '@/config/rolePermissions';

interface ServicesPageProps {
  userRole: string;
}

interface Service {
  id: string;
  title: string;
  description?: string;
  price?: number;
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
  createdAt: string;
  updatedAt: string;
}

export function ServicesPage({ userRole }: ServicesPageProps) {
  const { t } = useTranslation();
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [onlineSalesFilter, setOnlineSalesFilter] = useState('all');
  const [publishedFilter, setPublishedFilter] = useState('all');
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [isServiceViewOpen, setIsServiceViewOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [viewingService, setViewingService] = useState<Service | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const canEdit = userRole === 'admin' || userRole === 'website_manager';
  const canExport = hasPermission(userRole, 'export', 'services');

  // Load services on mount
  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setLoadingServices(true);
    try {
      const response = await fetch('/api/services');
      const data = await response.json();
      setServices(data.services || []);
    } catch (error) {
      console.error('Error loading services:', error);
      toast.error(t('services.failedToLoad'));
    } finally {
      setLoadingServices(false);
    }
  };

  const handleServiceSuccess = () => {
    loadServices();
    setIsServiceFormOpen(false);
    setEditingService(null);
    toast.success(editingService ? t('services.updateSuccess') : t('services.createSuccess'));
  };

  const handlePublishToggle = async (serviceId: string, currentStatus: boolean) => {
    // Optimistic update
    const previousServices = services;
    setServices(services.map(s => 
      s.id === serviceId ? { ...s, publishOnWebsite: !currentStatus } : s
    ));

    try {
      const formData = new FormData();
      formData.append('publishOnWebsite', (!currentStatus).toString());

      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'PUT',
        body: formData,
      });

      if (response.ok) {
        toast.success(!currentStatus ? t('services.publishedSuccess') : t('services.unpublishedSuccess'));
      } else {
        // Rollback on failure
        setServices(previousServices);
        const error = await response.json();
        toast.error(error.error || t('services.failedToUpdate'));
      }
    } catch (error) {
      // Rollback on error
      setServices(previousServices);
      console.error('Error updating service:', error);
      toast.error(t('services.failedToUpdate'));
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm(t('services.deleteConfirm'))) return;

    try {
      const response = await fetch(`/api/services/${id}`, { method: 'DELETE' });
      if (response.ok) {
        loadServices();
        toast.success(t('services.deleteSuccess'));
      } else {
        toast.error(t('services.failedToDelete'));
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error(t('services.failedToDelete'));
    }
  };

  const openServiceForm = (service?: Service) => {
    if (service) {
      setEditingService(service);
    } else {
      setEditingService(null);
    }
    setIsServiceFormOpen(true);
  };

  const openServiceView = (service: Service) => {
    setViewingService(service);
    setIsServiceViewOpen(true);
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = 
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const categoryName = service.category?.name ?? service.subcategory?.category?.name;
    const matchesCategory = 
      categoryFilter === 'all' || 
      categoryName === categoryFilter;

    const matchesOnlineSales =
      onlineSalesFilter === 'all' ||
      (onlineSalesFilter === 'enabled' && service.enableOnlineSales) ||
      (onlineSalesFilter === 'disabled' && !service.enableOnlineSales);

    const matchesPublished =
      publishedFilter === 'all' ||
      (publishedFilter === 'published' && service.publishOnWebsite) ||
      (publishedFilter === 'unpublished' && !service.publishOnWebsite);
    
    return matchesSearch && matchesCategory && matchesOnlineSales && matchesPublished;
  });

  // Get unique categories (from direct category or subcategory)
  const categories = Array.from(
    new Set(services.map(s => s.category?.name ?? s.subcategory?.category?.name).filter(Boolean))
  );

  // Truncate long text for display - prevents layout disruption
  const MAX_TITLE_LENGTH = 30;
  const truncateDisplay = (text: string | undefined, maxLen: number = MAX_TITLE_LENGTH): string => {
    if (!text || typeof text !== 'string') return '';
    return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      <Tabs defaultValue="services-list" className="space-y-4 w-full">
        <div className="flex gap-2 border-b">
          <TabsList className="bg-gray-100 w-full">
            <TabsTrigger value="services-list" className="data-[state=active]:bg-brand-gradient data-[state=active]:text-white">
              {t('services.servicesList')}
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-brand-gradient data-[state=active]:text-white">
              {t('products.manageCategories')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="services-list" className="w-full min-w-0">
          <Card className="p-6 w-full min-w-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 w-full min-w-0">
              <div className="min-w-0">
                <h3 className="text-gray-900">Services Management</h3>
                <p className="text-sm text-gray-500 mt-1">Manage all services and pricing</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                {canExport && (
                  <Button variant="outline" onClick={() => setIsExportDialogOpen(true)}>
                    <Download className="w-4 h-4 mr-2" />
                    {t('products.exportCatalog')}
                  </Button>
                )}
                {canEdit && (
                  <Button onClick={() => openServiceForm()}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('services.addService')}
                  </Button>
                )}
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col gap-4 mb-6 w-full min-w-0">
              {/* Search Row */}
              <div className="flex-1 relative min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  placeholder={t('services.searchPlaceholder')} 
                  className="pl-10 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger hideIcon className="w-48 min-w-0 h-auto min-h-9 py-2 [&_[data-slot=select-value]]:line-clamp-2 [&_[data-slot=select-value]]:whitespace-normal [&_[data-slot=select-value]]:text-left">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Filter className="w-4 h-4 flex-shrink-0" />
                      <SelectValue placeholder="All Categories" className="min-w-0 break-words" />
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

                <Select value={onlineSalesFilter} onValueChange={setOnlineSalesFilter}>
                  <SelectTrigger hideIcon className="w-44 min-w-0 h-auto min-h-9 py-2 [&_[data-slot=select-value]]:line-clamp-2 [&_[data-slot=select-value]]:whitespace-normal [&_[data-slot=select-value]]:text-left">
                    <SelectValue placeholder="Online Sales" className="break-words" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Online Sales</SelectItem>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={publishedFilter} onValueChange={setPublishedFilter}>
                  <SelectTrigger hideIcon className="w-40 min-w-0 h-auto min-h-9 py-2 [&_[data-slot=select-value]]:line-clamp-2 [&_[data-slot=select-value]]:whitespace-normal [&_[data-slot=select-value]]:text-left">
                    <SelectValue placeholder="Published" className="break-words" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Published</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="unpublished">Unpublished</SelectItem>
                  </SelectContent>
                </Select>

                {/* Clear Filters Button */}
                {(categoryFilter !== 'all' || onlineSalesFilter !== 'all' || publishedFilter !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCategoryFilter('all');
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 w-full min-w-0">
              <Card className="p-3 sm:p-4 min-w-0">
                <p className="text-sm text-gray-500 mb-1 truncate">Total Services</p>
                <p className="text-gray-900">{filteredServices.length}</p>
                {filteredServices.length !== services.length && (
                  <p className="text-xs text-gray-400">of {services.length} total</p>
                )}
              </Card>
              <Card className="p-3 sm:p-4 min-w-0">
                <p className="text-sm text-gray-500 mb-1 truncate">Published on Website</p>
                <p className="text-gray-900">{filteredServices.filter(s => s.publishOnWebsite).length}</p>
              </Card>
              <Card className="p-3 sm:p-4 min-w-0">
                <p className="text-sm text-gray-500 mb-1 truncate">Sellable Online</p>
                <p className="text-gray-900">{filteredServices.filter(s => s.enableOnlineSales).length}</p>
              </Card>
              <Card className="p-3 sm:p-4 min-w-0">
                <p className="text-sm text-gray-500 mb-1 truncate">Categories</p>
                <p className="text-gray-900">{categories.length}</p>
              </Card>
            </div>

            {/* Services Table */}
            <Card className="overflow-hidden w-full min-w-0">
              <div className="overflow-x-auto w-full">
                <Table className="table-fixed w-full min-w-[700px]" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: 200, minWidth: 200, maxWidth: 200 }} />
                    <col style={{ width: 140 }} />
                    <col style={{ width: 100 }} />
                    <col style={{ width: 90 }} />
                    {userRole !== 'offer_manager' && <col style={{ width: 90 }} />}
                    {userRole !== 'offer_manager' && <col style={{ width: 90 }} />}
                    <col style={{ width: 80 }} />
                    <col style={{ width: 100 }} />
                    <col style={{ width: 120 }} />
                  </colgroup>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px] min-w-[140px] max-w-[200px]">Name</TableHead>
                      <TableHead className="w-[140px] min-w-[100px] max-w-[140px]">Category</TableHead>
                      <TableHead className="w-[100px] min-w-[80px] max-w-[100px]">Subcategory</TableHead>
                      <TableHead className="min-w-[90px]">Price</TableHead>
                      {userRole !== 'offer_manager' && <TableHead>Online Sales</TableHead>}
                      {userRole !== 'offer_manager' && <TableHead>Published</TableHead>}
                      <TableHead>Media</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingServices ? (
                      <TableRow>
                        <TableCell colSpan={userRole === 'offer_manager' ? 7 : 9} className="text-center py-8 text-gray-500">
                          Loading services...
                        </TableCell>
                      </TableRow>
                    ) : services.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={userRole === 'offer_manager' ? 7 : 9} className="text-center py-8 text-gray-500">
                          {t('services.noServicesFound')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredServices.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell
                            className="text-gray-900"
                            style={{ width: 200, maxWidth: 200, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                            title={service.title}
                          >
                            {truncateDisplay(service.title)}
                          </TableCell>
                          <TableCell className="max-w-[140px] min-w-[100px] w-[140px] overflow-hidden whitespace-nowrap">
                            {(service.category ?? service.subcategory?.category) ? (
                              <Badge variant="outline" className="max-w-full truncate block" title={(service.category ?? service.subcategory?.category)?.name}>
                                {truncateDisplay((service.category ?? service.subcategory?.category)?.name, 25)}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[100px] min-w-[80px] w-[100px] overflow-hidden whitespace-nowrap">
                            <span className="text-sm text-gray-600 truncate block" title={service.subcategory?.name || ''}>
                              {service.subcategory?.name && service.subcategory.name.toLowerCase() !== 'general'
                                ? truncateDisplay(service.subcategory.name, 20)
                                : '-'}
                            </span>
                          </TableCell>
                          <TableCell className="min-w-[90px] overflow-hidden">
                            {service.price ? (
                              <span className="text-gray-900 whitespace-nowrap truncate block" title={`${service.documents?.currency || 'EUR'} ${service.price}`}>
                                {service.documents?.currency || 'EUR'} {service.price}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          {userRole !== 'offer_manager' && (
                            <TableCell className="min-w-[70px]">
                              <Badge variant={service.enableOnlineSales ? 'default' : 'secondary'} className="text-xs">
                                {service.enableOnlineSales ? 'Yes' : 'No'}
                              </Badge>
                            </TableCell>
                          )}
                          {userRole !== 'offer_manager' && (
                            <TableCell className="min-w-[60px]">
                              <Switch 
                                checked={service.publishOnWebsite} 
                                onCheckedChange={() => handlePublishToggle(service.id, service.publishOnWebsite)}
                                disabled={!canEdit}
                              />
                            </TableCell>
                          )}
                          <TableCell className="min-w-[80px] overflow-hidden">
                            <Badge variant="outline" className="text-xs">
                              {service.images?.length || 0} images
                            </Badge>
                          </TableCell>
                          <TableCell className="min-w-[90px] overflow-hidden">
                            <span className="text-xs text-gray-500 whitespace-nowrap truncate block" title={new Date(service.createdAt).toLocaleDateString()}>
                              {new Date(service.createdAt).toLocaleDateString()}
                            </span>
                          </TableCell>
                          <TableCell className="min-w-[100px]">
                            <div className="flex gap-1 flex-wrap">
                              <Button 
                                size="icon" 
                                variant="ghost"
                                className="shrink-0 h-8 w-8"
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
                                    className="shrink-0 h-8 w-8"
                                    onClick={() => openServiceForm(service)}
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="ghost"
                                    className="shrink-0 h-8 w-8"
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
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManagement type="service" />
        </TabsContent>
      </Tabs>

      {/* Service Form Dialog */}
      <Dialog open={isServiceFormOpen} onOpenChange={setIsServiceFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
          </DialogHeader>
          <ProductServiceForm
            type="service"
            isOpen={isServiceFormOpen}
            editData={editingService}
            userRole={userRole}
            onSuccess={handleServiceSuccess}
            onClose={() => {
              setIsServiceFormOpen(false);
              setEditingService(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Service View Modal */}
      {viewingService && (
        <ProductServiceView
          type="service"
          data={viewingService}
          isOpen={isServiceViewOpen}
          onClose={() => setIsServiceViewOpen(false)}
        />
      )}

      {/* Export Report Dialog */}
      <ServiceExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        services={services}
      />
    </div>
  );
}
