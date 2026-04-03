"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Plus, Search, Package, Edit, Trash2, Eye, Trash, Loader, ToggleLeft, ToggleRight, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { toast } from 'sonner';

interface ServicePackagesPageProps {
  userRole: string;
}

interface ServicePackage {
  id: string;
  name: string;
  description?: string;
  unit: string;
  price: number;
  status: string;
  services: any[];
  products: any[];
  createdAt: string;
}

export function ServicePackagesPage({ userRole }: ServicePackagesPageProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number; openUpward: boolean } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'm2',
    price: '',
    description: '',
    status: 'active'
  });
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

  // Function to calculate total price based on services and products
  const calculateTotalPrice = (currentServices: any[], currentProducts: any[]) => {
    const servicesTotal = currentServices.reduce((sum, service) => {
      return sum + ((service.price || 0) * (service.quantity || 1));
    }, 0);
    
    const productsTotal = currentProducts.reduce((sum, product) => {
      return sum + ((product.price || 0) * (product.quantity || 1));
    }, 0);
    
    const totalPrice = servicesTotal + productsTotal;
    setFormData(prev => ({ ...prev, price: totalPrice.toFixed(2) }));
  };

  useEffect(() => {
    fetchPackages();
    fetchServices();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [statusFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId) {
        closeDropdown();
      }
    };

    const handleScroll = () => {
      if (openDropdownId) {
        closeDropdown();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openDropdownId) {
        closeDropdown();
      }
    };

    const handleResize = () => {
      if (openDropdownId) {
        closeDropdown();
      }
    };

    if (openDropdownId) {
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
  }, [openDropdownId]);

  const fetchPackages = async () => {
    try {
      setIsLoading(true);
      const url = statusFilter === 'all' ? '/api/service-packages' : `/api/service-packages?status=${statusFilter}`;
      const response = await fetch(url);
      const data = await response.json();
      setPackages(data.packages || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      const data = await response.json();
      setAvailableServices(data.services || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setAvailableProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const canEdit = ['admin', 'offer_manager'].includes(userRole);
  const canDelete = ['admin', 'offer_manager'].includes(userRole);

  const addService = () => {
    const newServices = [...services, { id: '', quantity: 1, price: 0 }];
    setServices(newServices);
    calculateTotalPrice(newServices, products);
  };

  const removeService = (index: number) => {
    const newServices = services.filter((_, i) => i !== index);
    setServices(newServices);
    calculateTotalPrice(newServices, products);
  };

  const updateService = (index: number, field: string, value: any) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    
    // If updating the service ID, fetch the service price automatically
    if (field === 'id' && value) {
      const selectedService = availableServices.find(s => s.id === value);
      if (selectedService && selectedService.price) {
        updated[index] = { ...updated[index], price: selectedService.price };
      }
    }
    
    setServices(updated);
    // Recalculate total price
    calculateTotalPrice(updated, products);
  };

  const addProduct = () => {
    const newProducts = [...products, { id: '', quantity: 1, unit: 'm2', price: 0 }];
    setProducts(newProducts);
    calculateTotalPrice(services, newProducts);
  };

  const removeProduct = (index: number) => {
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
    calculateTotalPrice(services, newProducts);
  };

  const updateProduct = (index: number, field: string, value: any) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    
    // If updating the product ID, fetch the product price automatically
    if (field === 'id' && value) {
      const selectedProduct = availableProducts.find(p => p.id === value);
      if (selectedProduct && selectedProduct.price) {
        updated[index] = { ...updated[index], price: selectedProduct.price };
      }
    }
    
    setProducts(updated);
    // Recalculate total price
    calculateTotalPrice(services, updated);
  };

  const handleCreatePackage = async () => {
    if (!formData.name || !formData.price) {
      toast.error(t('servicePackages.allFieldsRequired'));
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/service-packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          unit: formData.unit,
          price: parseFloat(formData.price),
          description: formData.description,
          status: formData.status,
          services,
          products,
        }),
      });

      if (response.ok) {
        await fetchPackages();
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success(t('servicePackages.createSuccess'));
      } else {
        console.error('Error creating package:', response.statusText);
        toast.error(t('servicePackages.createFailed'));
      }
    } catch (error) {
      console.error('Error creating package:', error);
      toast.error(t('servicePackages.createFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      unit: 'm2',
      price: '',
      description: '',
      status: 'active'
    });
    setServices([]);
    setProducts([]);
    setIsEditMode(false);
    setEditingPackageId(null);
  };

  const handleDropdownToggle = (packageId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (openDropdownId === packageId) {
      setOpenDropdownId(null);
      setDropdownPosition(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const dropdownHeight = 120; // Approximate height of dropdown
      const dropdownWidth = 160; // Width of dropdown
      const padding = 8; // Minimum padding from viewport edges
      
      // Check if dropdown should open upward
      const spaceBelow = viewportHeight - rect.bottom - padding;
      const spaceAbove = rect.top - padding;
      const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove >= dropdownHeight;
      
      // Calculate vertical position
      let top;
      if (shouldOpenUpward) {
        top = rect.top - dropdownHeight;
      } else {
        top = rect.bottom;
      }
      
      // Ensure dropdown doesn't go off-screen vertically
      if (top < padding) {
        top = padding;
      } else if (top + dropdownHeight > viewportHeight - padding) {
        top = viewportHeight - dropdownHeight - padding;
      }
      
      // Calculate horizontal position (prefer right-aligned)
      let right = viewportWidth - rect.right;
      
      // Ensure dropdown doesn't go off-screen horizontally
      if (right < padding) {
        // Not enough space on the right, try left-aligned
        right = viewportWidth - rect.left - dropdownWidth;
        if (right < padding) {
          // Still not enough space, center it with minimum padding
          right = padding;
        }
      }
      
      setDropdownPosition({
        top,
        right: Math.max(padding, right),
        openUpward: shouldOpenUpward
      });
      setOpenDropdownId(packageId);
    }
  };

  const closeDropdown = () => {
    setOpenDropdownId(null);
    setDropdownPosition(null);
  };

  const handleViewDetails = (pkg: ServicePackage) => {
    setSelectedPackage(pkg);
    setIsDetailsModalOpen(true);
  };

  const handleEditPackage = (pkg: ServicePackage) => {
    setIsEditMode(true);
    setEditingPackageId(pkg.id);
    setFormData({
      name: pkg.name,
      unit: pkg.unit,
      price: pkg.price.toString(),
      description: pkg.description || '',
      status: pkg.status
    });
    setServices(pkg.services || []);
    setProducts(pkg.products || []);
    setIsDetailsModalOpen(false);
    setIsCreateDialogOpen(true);
  };

  const handleDeletePackage = (pkg: ServicePackage) => {
    setSelectedPackage(pkg);
    setIsDetailsModalOpen(false);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedPackage) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/service-packages/${selectedPackage.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchPackages();
        setIsDeleteConfirmOpen(false);
        setSelectedPackage(null);
      } else {
        console.error('Error deleting package:', response.statusText);
      }
    } catch (error) {
      console.error('Error deleting package:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePackage = async () => {
    if (!editingPackageId) return;
    if (!formData.name || !formData.price) {
      toast.error(t('servicePackages.allFieldsRequired'));
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/service-packages/${editingPackageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          unit: formData.unit,
          price: parseFloat(formData.price),
          description: formData.description,
          status: formData.status,
          services,
          products,
        }),
      });

      if (response.ok) {
        await fetchPackages();
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success(t('servicePackages.updateSuccess'));
      } else {
        console.error('Error updating package:', response.statusText);
        toast.error(t('servicePackages.updateFailed'));
      }
    } catch (error) {
      console.error('Error updating package:', error);
      toast.error(t('servicePackages.updateFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Quick status update function
  const handleQuickStatusUpdate = async (packageId: string, newStatus: string) => {
    try {
      setStatusUpdatingId(packageId);
      const response = await fetch(`/api/service-packages/${packageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (response.ok) {
        await fetchPackages();
        toast.success(t('servicePackages.statusUpdateSuccess', { status: newStatus }));
      } else {
        console.error('Error updating package status:', response.statusText);
        toast.error(t('servicePackages.statusUpdateFailed'));
      }
    } catch (error) {
      console.error('Error updating package status:', error);
      toast.error('Failed to update package status');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const filteredPackages = packages.filter(pkg =>
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">{t('servicePackages.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('servicePackages.subtitle')}</p>
        </div>
        {canEdit && (
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                resetForm();
                setIsCreateDialogOpen(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                {t('servicePackages.createPackage')}
              </Button>
            </DialogTrigger>
            <DialogContent className="!max-w-[100vw] !w-[100vw] !h-[100vh] max-h-[100vh] overflow-y-auto p-4 sm:p-6 md:p-8 m-0 rounded-none sm:rounded-lg sm:!max-w-[95vw] sm:!w-[95vw] sm:!h-[95vh] sm:max-h-[95vh]">
              <DialogHeader className="pb-4 sm:pb-6">
                <DialogTitle className="text-xl sm:text-2xl">{isEditMode ? t('servicePackages.editPackage') : t('servicePackages.createPackageTitle')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 sm:space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <div className="col-span-full">
                    <Label className="text-sm sm:text-base font-medium">{t('servicePackages.packageName')} <span className="text-red-500">*</span></Label>
                    <Input 
                      placeholder={t('servicePackages.packageNamePlaceholder')}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="h-10 sm:h-12 mt-1"
                    />
                  </div>
                  
                  <div className="sm:col-span-1">
                    <Label className="text-sm sm:text-base font-medium">{t('servicePackages.unit')}</Label>
                    <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                      <SelectTrigger className="h-10 sm:h-12 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="m2">{t('servicePackages.unitM2')}</SelectItem>
                        <SelectItem value="l">{t('servicePackages.unitLiters')}</SelectItem>
                        <SelectItem value="kg">{t('servicePackages.unitKg')}</SelectItem>
                        <SelectItem value="pcs">{t('servicePackages.unitPcs')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="sm:col-span-1">
                    <Label className="text-sm sm:text-base font-medium">{t('servicePackages.totalPrice')} <span className="text-red-500">*</span></Label>
                    <Input 
                      type="text"
                      placeholder={t('servicePackages.pricePlaceholder')}
                      value={formData.price}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers and decimal point
                        if (/^\d*\.?\d*$/.test(value)) {
                          setFormData({ ...formData, price: value });
                        }
                      }}
                      className="h-10 sm:h-12 mt-1"
                      title="Total price is automatically calculated but can be manually adjusted"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('servicePackages.priceHint')}</p>
                  </div>

                  <div className="sm:col-span-1">
                    <Label className="text-sm sm:text-base font-medium">{t('common.status')}</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="h-10 sm:h-12 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="active">{t('servicePackages.active')}</SelectItem>
                        <SelectItem value="inactive">{t('servicePackages.inactive')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-full">
                    <Label className="text-sm sm:text-base font-medium">{t('common.description')}</Label>
                    <Textarea 
                      placeholder={t('servicePackages.descriptionPlaceholder')} 
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="resize-none mt-1"
                    />
                  </div>
                </div>

                {/* Services Section */}
                <div className="border-t pt-6 sm:pt-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                    <Label className="text-lg sm:text-xl font-semibold">{t('servicePackages.services')}</Label>
                    <Button variant="outline" onClick={addService} className="w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('servicePackages.addService')}
                    </Button>
                  </div>
                  
                  <div className="space-y-3 sm:space-y-4 bg-blue-50 p-3 sm:p-6 rounded-lg border border-blue-200 overflow-hidden">
                    {/* Mobile Header - Hidden on larger screens */}
                    <div className="block sm:hidden text-xs font-semibold text-gray-700 mb-3">
                      {t('servicePackages.serviceName')} <span className="text-red-500">*</span> | {t('servicePackages.quantity')} | {t('servicePackages.price')}
                    </div>
                    
                    {/* Desktop Header - Hidden on mobile */}
                    <div className="hidden sm:grid grid-cols-12 gap-3 sm:gap-4 text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-4">
                      <div className="col-span-6 min-w-0">{t('servicePackages.serviceName')} <span className="text-red-500">*</span></div>
                      <div className="col-span-3">{t('servicePackages.quantity')}</div>
                      <div className="col-span-2">{t('servicePackages.price')}</div>
                      <div className="col-span-1"></div>
                    </div>
                    
                    {services.length > 0 ? (
                      services.map((service, index) => (
                        <div key={index} className="grid grid-cols-12 gap-4 items-center p-4 bg-white rounded border border-blue-100">
                          <div className="col-span-6 min-w-0 overflow-hidden">
                            <Select value={service.id} onValueChange={(value) => updateService(index, 'id', value)}>
                              <SelectTrigger className="h-10 text-sm w-full">
                                <SelectValue 
                                  placeholder={t('servicePackages.selectService')} 
                                  className="block w-full text-left"
                                />
                              </SelectTrigger>
                              <SelectContent className="z-[9999] max-h-[200px] overflow-y-auto w-[400px] max-w-[90vw]">
                                {availableServices.map((svc) => (
                                  <SelectItem key={svc.id} value={svc.id} className="max-w-full">
                                    <div className="w-full text-left whitespace-normal break-words" title={svc.title}>
                                      {svc.title}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3">
                            <Input 
                              type="text"
                              placeholder="1"
                              value={service.quantity || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow only numbers and decimal point
                                if (/^\d*\.?\d*$/.test(value)) {
                                  const updated = [...services];
                                  updated[index] = { ...updated[index], quantity: value === '' ? 1 : parseFloat(value) || 1 };
                                  setServices(updated);
                                  calculateTotalPrice(updated, products);
                                }
                              }}
                              className="h-10 text-sm" 
                            />
                          </div>
                          <div className="col-span-2">
                            <Input 
                              type="text"
                              placeholder="0.00"
                              value={service.price || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow only numbers and decimal point
                                if (/^\d*\.?\d*$/.test(value)) {
                                  const updated = [...services];
                                  updated[index] = { ...updated[index], price: value === '' ? 0 : parseFloat(value) || 0 };
                                  setServices(updated);
                                  calculateTotalPrice(updated, products);
                                }
                              }}
                              className="h-10 text-sm" 
                              title="Price is automatically fetched from the selected service but can be edited"
                            />
                          </div>
                          <div className="col-span-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeService(index)}
                              className="h-10 w-10"
                            >
                              <Trash className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-8 text-sm text-gray-500">
                        {t('servicePackages.noServicesAdded')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Products Section */}
                <div className="border-t pt-6 sm:pt-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                    <Label className="text-lg sm:text-xl font-semibold">{t('servicePackages.products')}</Label>
                    <Button variant="outline" onClick={addProduct} className="w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('servicePackages.addProduct')}
                    </Button>
                  </div>
                  
                  <div className="space-y-3 sm:space-y-4 bg-green-50 p-3 sm:p-6 rounded-lg border border-green-200 overflow-hidden">
                    {/* Mobile Header - Hidden on larger screens */}
                    <div className="block sm:hidden text-xs font-semibold text-gray-700 mb-3">
                      {t('servicePackages.productName')} <span className="text-red-500">*</span> | {t('servicePackages.quantity')} | {t('servicePackages.unit')} | {t('servicePackages.price')}
                    </div>
                    
                    {/* Desktop Header - Hidden on mobile */}
                    <div className="hidden sm:grid grid-cols-12 gap-3 sm:gap-4 text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-4">
                      <div className="col-span-5 min-w-0">{t('servicePackages.productName')} <span className="text-red-500">*</span></div>
                      <div className="col-span-2">{t('servicePackages.quantity')}</div>
                      <div className="col-span-2">{t('servicePackages.unit')}</div>
                      <div className="col-span-2">{t('servicePackages.price')}</div>
                      <div className="col-span-1"></div>
                    </div>
                    
                    {products.length > 0 ? (
                      products.map((product, index) => (
                        <div key={index} className="bg-white rounded border border-green-100 overflow-hidden">
                          {/* Mobile Layout */}
                          <div className="block sm:hidden p-3 space-y-3">
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-gray-600">Product Name <span className="text-red-500">*</span></Label>
                              <Select value={product.id} onValueChange={(value) => updateProduct(index, 'id', value)}>
                                <SelectTrigger className="h-10 text-sm w-full">
                                  <SelectValue placeholder={t('servicePackages.selectProduct')} />
                                </SelectTrigger>
                                <SelectContent className="z-[9999] max-h-[200px] overflow-y-auto w-[400px] max-w-[90vw]">
                                  {availableProducts.map((prod) => (
                                    <SelectItem key={prod.id} value={prod.id} className="max-w-full">
                                      <div className="w-full text-left whitespace-normal break-words" title={prod.title}>
                                        {prod.title}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs font-medium text-gray-600">Quantity</Label>
                                <Input 
                                  type="text"
                                  placeholder="1"
                                  value={product.quantity || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (/^\d*\.?\d*$/.test(value)) {
                                      const updated = [...products];
                                      updated[index] = { ...updated[index], quantity: value === '' ? 1 : parseFloat(value) || 1 };
                                      setProducts(updated);
                                      calculateTotalPrice(services, updated);
                                    }
                                  }}
                                  className="h-9 text-sm" 
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-medium text-gray-600">Unit</Label>
                                <Select value={product.unit} onValueChange={(value) => updateProduct(index, 'unit', value)}>
                                  <SelectTrigger className="h-9 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="z-[9999]">
                                    <SelectItem value="m2">m²</SelectItem>
                                    <SelectItem value="l">L</SelectItem>
                                    <SelectItem value="kg">kg</SelectItem>
                                    <SelectItem value="pcs">pcs</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-medium text-gray-600">Price (€)</Label>
                                <Input 
                                  type="text"
                                  placeholder="0.00"
                                  value={product.price || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (/^\d*\.?\d*$/.test(value)) {
                                      const updated = [...products];
                                      updated[index] = { ...updated[index], price: value === '' ? 0 : parseFloat(value) || 0 };
                                      setProducts(updated);
                                      calculateTotalPrice(services, updated);
                                    }
                                  }}
                                  className="h-9 text-sm" 
                                  title="Price is automatically fetched from the selected product but can be edited"
                                />
                              </div>
                            </div>
                            
                            <div className="flex justify-end pt-2 border-t border-green-100">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => removeProduct(index)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash className="w-4 h-4 mr-1" />
                                {t('servicePackages.remove')}
                              </Button>
                            </div>
                          </div>
                          
                          {/* Desktop Layout */}
                          <div className="hidden sm:grid grid-cols-12 gap-3 sm:gap-4 items-center p-4">
                            <div className="col-span-5 min-w-0 overflow-hidden">
                              <Select value={product.id} onValueChange={(value) => updateProduct(index, 'id', value)}>
                                <SelectTrigger className="h-10 text-sm w-full">
                                  <SelectValue 
                                    placeholder={t('servicePackages.selectProduct')} 
                                    className="block w-full text-left"
                                  />
                                </SelectTrigger>
                                <SelectContent className="z-[9999] max-h-[200px] overflow-y-auto w-[400px] max-w-[90vw]">
                                  {availableProducts.map((prod) => (
                                    <SelectItem key={prod.id} value={prod.id} className="max-w-full">
                                      <div className="w-full text-left whitespace-normal break-words" title={prod.title}>
                                        {prod.title}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Input 
                                type="text"
                                placeholder="1"
                                value={product.quantity || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (/^\d*\.?\d*$/.test(value)) {
                                    const updated = [...products];
                                    updated[index] = { ...updated[index], quantity: value === '' ? 1 : parseFloat(value) || 1 };
                                    setProducts(updated);
                                    calculateTotalPrice(services, updated);
                                  }
                                }}
                                className="h-10 text-sm" 
                              />
                            </div>
                            <div className="col-span-2">
                              <Select value={product.unit} onValueChange={(value) => updateProduct(index, 'unit', value)}>
                                <SelectTrigger className="h-10 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[9999]">
                                  <SelectItem value="m2">{t('servicePackages.unitM2')}</SelectItem>
                                  <SelectItem value="l">{t('servicePackages.unitL')}</SelectItem>
                                  <SelectItem value="kg">{t('servicePackages.unitKgShort')}</SelectItem>
                                  <SelectItem value="pcs">{t('servicePackages.unitPcsShort')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Input 
                                type="text"
                                placeholder="0.00"
                                value={product.price || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (/^\d*\.?\d*$/.test(value)) {
                                    const updated = [...products];
                                    updated[index] = { ...updated[index], price: value === '' ? 0 : parseFloat(value) || 0 };
                                    setProducts(updated);
                                    calculateTotalPrice(services, updated);
                                  }
                                }}
                                className="h-10 text-sm" 
                                title="Price is automatically fetched from the selected product but can be edited" 
                              />
                            </div>
                            <div className="col-span-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeProduct(index)}
                                className="h-10 w-10"
                              >
                                <Trash className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-6 sm:p-8 text-sm text-gray-500">
                        {t('servicePackages.noProductsAdded')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Package Summary */}
                <div className="border-t pt-6 sm:pt-8">
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">{t('servicePackages.packageSummary')}</h3>
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between text-sm sm:text-base gap-1">
                        <span className="text-gray-600">Services ({services.length}):</span>
                        <span className="text-gray-900 font-medium">€{services.reduce((sum, s) => sum + ((s.price || 0) * (s.quantity || 1)), 0).toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between text-sm sm:text-base gap-1">
                        <span className="text-gray-600">Products ({products.length}):</span>
                        <span className="text-gray-900 font-medium">€{products.reduce((sum, p) => sum + ((p.price || 0) * (p.quantity || 1)), 0).toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between border-t pt-3 text-lg sm:text-xl gap-1">
                        <span className="text-gray-900 font-bold">{t('servicePackages.calculatedTotal')}:</span>
                        <span className="text-blue-600 font-bold">€{(services.reduce((sum, s) => sum + ((s.price || 0) * (s.quantity || 1)), 0) + products.reduce((sum, p) => sum + ((p.price || 0) * (p.quantity || 1)), 0)).toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between text-lg sm:text-xl gap-1">
                        <span className="text-gray-900 font-bold">{t('servicePackages.packagePriceLabel')}:</span>
                        <span className="text-green-600 font-bold">€{parseFloat(formData.price || '0').toFixed(2)}</span>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 mt-2">
                        {t('servicePackages.packagePriceHint')}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-6 sm:pt-8 border-t mt-6 sm:mt-8">
                  <Button variant="outline" onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                  }} disabled={isLoading} className="h-10 sm:h-12 px-4 sm:px-6 order-2 sm:order-1">
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={() => {
                    if (isEditMode) {
                      handleUpdatePackage();
                    } else {
                      handleCreatePackage();
                    }
                  }} disabled={isLoading} className="h-10 sm:h-12 px-6 sm:px-8 order-1 sm:order-2">
                    {isLoading ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        {isEditMode ? t('servicePackages.updating') : t('servicePackages.creating')}
                      </>
                    ) : (
                      isEditMode ? t('servicePackages.updatePackage') : t('servicePackages.createPackage')
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('servicePackages.totalPackages')}</p>
          <p className="text-gray-900">{packages.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('servicePackages.activePackages')}</p>
          <p className="text-gray-900">{packages.filter(p => p.status === 'active').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('servicePackages.averagePrice')}</p>
          <p className="text-gray-900">
            €{packages.length > 0 ? (packages.reduce((sum, p) => sum + p.price, 0) / packages.length).toFixed(2) : '0.00'}
          </p>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t('servicePackages.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('servicePackages.allStatus')}</SelectItem>
            <SelectItem value="active">{t('servicePackages.active')}</SelectItem>
            <SelectItem value="inactive">{t('servicePackages.inactive')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Packages Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('servicePackages.packageName')}</TableHead>
                <TableHead>{t('servicePackages.services')}</TableHead>
                <TableHead>{t('servicePackages.products')}</TableHead>
                <TableHead>{t('servicePackages.unit')}</TableHead>
                <TableHead>{t('servicePackages.price')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('servicePackages.createdDate')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isInitialLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2">
                      <Loader className="w-8 h-8 animate-spin text-gray-400" />
                      <span className="text-gray-500">{t('servicePackages.loadingPackages')}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPackages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="text-gray-500">
                      {searchQuery ? t('servicePackages.noPackagesMatchSearch') : t('servicePackages.noPackagesFound')}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPackages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell className="text-gray-900">{pkg.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{(pkg.services || []).length}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{(pkg.products || []).length}</Badge>
                  </TableCell>
                  <TableCell className="text-gray-600">{pkg.unit}</TableCell>
                  <TableCell className="text-gray-900">€{pkg.price.toFixed(2)}</TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select 
                        value={pkg.status} 
                        onValueChange={(newStatus) => handleQuickStatusUpdate(pkg.id, newStatus)}
                        disabled={statusUpdatingId === pkg.id}
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue>
                            {statusUpdatingId === pkg.id ? (
                              <div className="flex items-center gap-1">
                                <Loader className="w-3 h-3 animate-spin" />
                                <span className="text-xs">...</span>
                              </div>
                            ) : (
                              <Badge variant={pkg.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                {pkg.status}
                              </Badge>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="text-xs">{t('servicePackages.active')}</Badge>
                            </div>
                          </SelectItem>
                          <SelectItem value="inactive">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">{t('servicePackages.inactive')}</Badge>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={pkg.status === 'active' ? 'default' : 'secondary'}>
                        {pkg.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {new Date(pkg.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDropdownToggle(pkg.id, e)}
                      className="h-8 w-8 hover:bg-gray-100 transition-colors duration-150"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Custom Dropdown Menu */}
      {openDropdownId && dropdownPosition && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={closeDropdown}
          />
          <div
            className={`fixed z-[9999] min-w-[160px] bg-white border border-gray-200 rounded-md shadow-lg py-1 transition-all duration-150 ease-out ${
              dropdownPosition.openUpward 
                ? 'animate-in slide-in-from-bottom-1 fade-in-0' 
                : 'animate-in slide-in-from-top-1 fade-in-0'
            }`}
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
            }}
          >
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center transition-colors duration-150"
              onClick={(e) => {
                e.stopPropagation();
                const pkg = packages.find(p => p.id === openDropdownId);
                if (pkg) handleViewDetails(pkg);
                closeDropdown();
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              {t('servicePackages.viewDetails')}
            </button>
            {canEdit && (
              <>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center transition-colors duration-150"
                  onClick={(e) => {
                    e.stopPropagation();
                    const pkg = packages.find(p => p.id === openDropdownId);
                    if (pkg) handleEditPackage(pkg);
                    closeDropdown();
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {t('common.edit')}
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                  disabled={statusUpdatingId === openDropdownId}
                  onClick={(e) => {
                    e.stopPropagation();
                    const pkg = packages.find(p => p.id === openDropdownId);
                    if (pkg && statusUpdatingId !== pkg.id) {
                      const newStatus = pkg.status === 'active' ? 'inactive' : 'active';
                      handleQuickStatusUpdate(pkg.id, newStatus);
                    }
                    closeDropdown();
                  }}
                >
                  {(() => {
                    const pkg = packages.find(p => p.id === openDropdownId);
                    if (statusUpdatingId === pkg?.id) {
                      return (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          {t('servicePackages.updating')}
                        </>
                      );
                    }
                    return pkg?.status === 'active' ? (
                      <>
                        <ToggleLeft className="w-4 h-4 mr-2" />
                        {t('servicePackages.markInactive')}
                      </>
                    ) : (
                      <>
                        <ToggleRight className="w-4 h-4 mr-2" />
                        {t('servicePackages.markActive')}
                      </>
                    );
                  })()}
                </button>
              </>
            )}
            {canDelete && (
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center text-red-600 transition-colors duration-150"
                onClick={(e) => {
                  e.stopPropagation();
                  const pkg = packages.find(p => p.id === openDropdownId);
                  if (pkg) handleDeletePackage(pkg);
                  closeDropdown();
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('common.delete')}
              </button>
            )}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={(open) => {
        setIsDeleteConfirmOpen(open);
        if (!open) {
          setSelectedPackage(null);
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('servicePackages.deletePackage')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              {t('servicePackages.deleteConfirmMessage', { name: selectedPackage?.name || '' })}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} disabled={isLoading}>
                {t('common.cancel')}
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={isLoading}>
                {isLoading ? t('servicePackages.deleting') : t('common.delete')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={(open) => {
        setIsDetailsModalOpen(open);
        if (!open) {
          setSelectedPackage(null);
        }
      }}>
        <DialogContent className="!max-w-[100vw] !w-[100vw] !h-[100vh] max-h-[100vh] overflow-y-auto p-4 sm:p-6 md:p-8 m-0 rounded-none sm:rounded-lg sm:!max-w-[95vw] sm:!w-[95vw] sm:!h-[95vh] sm:max-h-[95vh]">
          <DialogHeader className="pb-4 sm:pb-6">
            <DialogTitle className="text-xl sm:text-2xl">{t('servicePackages.packageDetails')}</DialogTitle>
          </DialogHeader>
          {selectedPackage && (
            <div className="space-y-6 sm:space-y-8">
              {/* Basic Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="lg:col-span-2">
                  <Label className="text-sm text-gray-500 mb-2 block">{t('servicePackages.packageName')}</Label>
                  <p className="text-lg sm:text-xl font-semibold text-gray-900 break-words">{selectedPackage.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 mb-2 block">{t('servicePackages.price')}</Label>
                  <p className="text-lg sm:text-xl font-semibold text-gray-900">€{selectedPackage.price.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 mb-2 block">{t('servicePackages.unit')}</Label>
                  <p className="text-lg font-semibold text-gray-900">{selectedPackage.unit}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 mb-2 block">{t('common.status')}</Label>
                  <Badge variant={selectedPackage.status === 'active' ? 'default' : 'secondary'} className="text-sm">
                    {selectedPackage.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 mb-2 block">{t('servicePackages.createdDate')}</Label>
                  <p className="text-base font-medium text-gray-900">{new Date(selectedPackage.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Description */}
              {selectedPackage.description && (
                <div className="border-t pt-6 sm:pt-8">
                  <Label className="text-base sm:text-lg font-semibold mb-3 block">{t('common.description')}</Label>
                  <p className="text-gray-900 leading-relaxed text-sm sm:text-base">{selectedPackage.description}</p>
                </div>
              )}

              {/* Services */}
              {selectedPackage.services && selectedPackage.services.length > 0 && (
                <div className="border-t pt-6 sm:pt-8">
                  <Label className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 block">Services ({selectedPackage.services.length})</Label>
                  <div className="grid gap-4 sm:gap-6">
                    {selectedPackage.services.map((service, index) => (
                      <div key={index} className="p-4 sm:p-6 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-blue-900 text-base sm:text-lg break-words">
                              {service.details?.title || `Service ${index + 1}`}
                            </h4>
                            {service.details?.description && (
                              <p className="text-sm sm:text-base text-blue-700 mt-2 leading-relaxed">
                                {service.details.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 ml-4">
                            🔧 Service
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div className="bg-white p-3 sm:p-4 rounded border">
                            <p className="text-gray-500 text-xs font-medium mb-1">Quantity</p>
                            <p className="text-gray-900 font-semibold text-base">{service.quantity}</p>
                          </div>
                          <div className="bg-white p-3 sm:p-4 rounded border">
                            <p className="text-gray-500 text-xs font-medium mb-1">Unit Price</p>
                            <p className="text-gray-900 font-semibold text-base">€{service.details?.price?.toFixed(2) || service.price?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div className="bg-white p-3 sm:p-4 rounded border">
                            <p className="text-gray-500 text-xs font-medium mb-1">Total</p>
                            <p className="text-blue-600 font-bold text-base">€{((service.details?.price || service.price || 0) * service.quantity).toFixed(2)}</p>
                          </div>
                        </div>

                        {service.details && (
                          <div className="mt-4 pt-4 border-t border-blue-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                              <div>
                                <span className="text-gray-500">Publish on Website:</span>
                                <span className={`ml-2 font-medium ${service.details.publishOnWebsite ? 'text-green-600' : 'text-gray-600'}`}>
                                  {service.details.publishOnWebsite ? 'Yes' : 'No'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Online Sales:</span>
                                <span className={`ml-2 font-medium ${service.details.enableOnlineSales ? 'text-green-600' : 'text-gray-600'}`}>
                                  {service.details.enableOnlineSales ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              {selectedPackage.products && selectedPackage.products.length > 0 && (
                <div className="border-t pt-6 sm:pt-8">
                  <Label className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 block">Products ({selectedPackage.products.length})</Label>
                  <div className="grid gap-4 sm:gap-6">
                    {selectedPackage.products.map((product, index) => (
                      <div key={index} className="p-4 sm:p-6 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-green-900 text-base sm:text-lg break-words">
                              {product.details?.title || `Product ${index + 1}`}
                            </h4>
                            {product.details?.description && (
                              <p className="text-sm sm:text-base text-green-700 mt-2 leading-relaxed">
                                {product.details.description}
                              </p>
                            )}
                            {product.details?.sku && (
                              <p className="text-xs sm:text-sm text-green-600 mt-2 font-mono">
                                SKU: {product.details.sku}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 ml-4">
                            📦 Product
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
                          <div className="bg-white p-3 sm:p-4 rounded border">
                            <p className="text-gray-500 text-xs font-medium mb-1">Quantity</p>
                            <p className="text-gray-900 font-semibold text-base">{product.quantity}</p>
                          </div>
                          <div className="bg-white p-3 sm:p-4 rounded border">
                            <p className="text-gray-500 text-xs font-medium mb-1">Unit</p>
                            <p className="text-gray-900 font-semibold text-base">{product.details?.unit || product.unit || 'pcs'}</p>
                          </div>
                          <div className="bg-white p-3 sm:p-4 rounded border">
                            <p className="text-gray-500 text-xs font-medium mb-1">Unit Price</p>
                            <p className="text-gray-900 font-semibold text-base">€{product.details?.price?.toFixed(2) || product.price?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div className="bg-white p-3 sm:p-4 rounded border">
                            <p className="text-gray-500 text-xs font-medium mb-1">Total</p>
                            <p className="text-green-600 font-bold text-base">€{((product.details?.price || product.price || 0) * product.quantity).toFixed(2)}</p>
                          </div>
                        </div>

                        {product.details && (
                          <div className="mt-4 pt-4 border-t border-green-200">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                              <div>
                                <span className="text-gray-500">Status:</span>
                                <span className={`ml-2 font-medium ${product.details.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
                                  {product.details.status}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Stock:</span>
                                <span className="ml-2 font-medium text-gray-900">
                                  {product.details.stock || 0} units
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Online Sales:</span>
                                <span className={`ml-2 font-medium ${product.details.enableOnlineSales ? 'text-green-600' : 'text-gray-600'}`}>
                                  {product.details.enableOnlineSales ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Package Summary */}
              <div className="border-t pt-6 sm:pt-8">
                <Label className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 block">Package Summary</Label>
                <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-6">
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                        {selectedPackage.services?.length || 0}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 mt-1">Services</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-green-600">
                        {selectedPackage.products?.length || 0}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 mt-1">Products</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                        {((selectedPackage.services || []).reduce((sum, s) => sum + s.quantity, 0) + 
                          (selectedPackage.products || []).reduce((sum, p) => sum + p.quantity, 0))}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 mt-1">Total Items</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-orange-600">
                        €{((selectedPackage.services || []).reduce((sum, s) => sum + ((s.details?.price || s.price || 0) * s.quantity), 0) + 
                            (selectedPackage.products || []).reduce((sum, p) => sum + ((p.details?.price || p.price || 0) * p.quantity), 0)).toFixed(2)}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 mt-1">Calculated Total</div>
                    </div>
                  </div>
                  
                  {/* Package vs Calculated Price Comparison */}
                  <div className="pt-4 sm:pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">Package Price:</span>
                        <span className="font-semibold text-lg sm:text-xl">€{selectedPackage.price.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">Calculated Total:</span>
                        <span className="font-semibold text-lg sm:text-xl">
                          €{((selectedPackage.services || []).reduce((sum, s) => sum + ((s.details?.price || s.price || 0) * s.quantity), 0) + 
                              (selectedPackage.products || []).reduce((sum, p) => sum + ((p.details?.price || p.price || 0) * p.quantity), 0)).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700 block mb-1">Savings/Markup:</span>
                        <span className={`font-bold text-lg sm:text-xl ${
                          selectedPackage.price < ((selectedPackage.services || []).reduce((sum, s) => sum + ((s.details?.price || s.price || 0) * s.quantity), 0) + 
                                                    (selectedPackage.products || []).reduce((sum, p) => sum + ((p.details?.price || p.price || 0) * p.quantity), 0))
                          ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {selectedPackage.price < ((selectedPackage.services || []).reduce((sum, s) => sum + ((s.details?.price || s.price || 0) * s.quantity), 0) + 
                                                    (selectedPackage.products || []).reduce((sum, p) => sum + ((p.details?.price || p.price || 0) * p.quantity), 0))
                          ? '-' : '+'}€{Math.abs(selectedPackage.price - 
                              ((selectedPackage.services || []).reduce((sum, s) => sum + ((s.details?.price || s.price || 0) * s.quantity), 0) + 
                               (selectedPackage.products || []).reduce((sum, p) => sum + ((p.details?.price || p.price || 0) * p.quantity), 0))).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-6 sm:pt-8 border-t">
                <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)} className="order-2 sm:order-1">
                  Close
                </Button>
                {canEdit && (
                  <Button onClick={() => handleEditPackage(selectedPackage)} className="order-1 sm:order-2">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Package
                  </Button>
                )}
                {canDelete && (
                  <Button variant="destructive" onClick={() => handleDeletePackage(selectedPackage)} className="order-3">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Package
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
