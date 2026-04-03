"use client";

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Plus, Search, MapPin, Calendar, Users, Download, MoreVertical, Eye, Edit, Trash2, Loader, TrendingUp, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { toast } from 'sonner';
import { SiteExportDialog } from './SiteExportDialog';

interface SitesPageProps {
  userRole: string;
}

interface SiteManager {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
}

interface Client {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  status: string;
}

interface Site {
  id: string;
  name: string;
  address: string;
  city?: string;
  postalCode?: string;
  client?: string;
  clientId?: string;
  startDate: string;
  estimatedEndDate?: string;
  actualEndDate?: string;
  status: string;
  progress: number;
  progressNotes?: string;
  progressUpdatedAt?: string;
  assignedWorkers: number;
  siteManagerId?: string;
  siteManager?: SiteManager;
  workers?: any[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export function SitesPage({ userRole }: SitesPageProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    postalCode: '',
    clientId: '',
    startDate: '',
    estimatedEndDate: '',
    status: 'scheduled',
    siteManagerId: '',
    description: '',
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  const [sites, setSites] = useState<Site[]>([]);
  const [siteManagers, setSiteManagers] = useState<SiteManager[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [viewingSite, setViewingSite] = useState<Site | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [progressSite, setProgressSite] = useState<Site | null>(null);
  const [progressForm, setProgressForm] = useState({ progress: 0, progressNotes: '' });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const canEdit = ['admin', 'site_manager'].includes(userRole);
  const canDelete = userRole === 'admin';

  // Load sites on mount
  useEffect(() => {
    loadSites();
    loadSiteManagers();
    loadClients();
  }, []);

  const loadSites = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);

      const response = await fetch(`/api/sites?${params.toString()}`);
      const data = await response.json();
      setSites(data.sites || []);
    } catch (error) {
      console.error('Error loading sites:', error);
      toast.error(t('sites.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const loadSiteManagers = async () => {
    setLoadingManagers(true);
    try {
      const response = await fetch('/api/sites/managers');
      const data = await response.json();
      setSiteManagers(data.managers || []);
    } catch (error) {
      console.error('Error loading site managers:', error);
    } finally {
      setLoadingManagers(false);
    }
  };

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  // Debounce search query
  useEffect(() => {
    if (searchQuery !== debouncedSearchQuery) {
      setIsSearching(true);
    }
    
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setIsSearching(false);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearchQuery]);

  // Reload when filters change
  useEffect(() => {
    loadSites();
  }, [statusFilter, debouncedSearchQuery]);

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      postalCode: '',
      clientId: '',
      startDate: '',
      estimatedEndDate: '',
      status: 'scheduled',
      siteManagerId: '',
      description: '',
    });
    setValidationErrors({});
    setEditingSite(null);
  };

  const handleInputChange = (field: string, value: string) => {
    const updates: Record<string, string> = { [field]: value };
    // When start date changes, clear estimated end date if it would be before the new start date
    if (field === 'startDate' && formData.estimatedEndDate && value && formData.estimatedEndDate < value) {
      updates.estimatedEndDate = '';
    }
    setFormData({ ...formData, ...updates });
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors({ ...validationErrors, [field]: false });
    }
  };

  const openEditDialog = (site: Site) => {
    setEditingSite(site);
    setValidationErrors({}); // Clear any existing validation errors
    setFormData({
      name: site.name,
      address: site.address,
      city: site.city || '',
      postalCode: site.postalCode || '',
      clientId: site.clientId || '',
      startDate: site.startDate.split('T')[0],
      estimatedEndDate: site.estimatedEndDate ? site.estimatedEndDate.split('T')[0] : '',
      status: site.status,
      siteManagerId: site.siteManagerId || '',
      description: site.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (site: Site) => {
    setViewingSite(site);
    setIsViewDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, boolean> = {};
    
    if (!formData.name.trim()) errors.name = true;
    if (!formData.address.trim()) errors.address = true;
    if (!formData.startDate) errors.startDate = true;
    if (formData.startDate && formData.estimatedEndDate && formData.estimatedEndDate < formData.startDate) {
      errors.estimatedEndDate = true;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSite = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(t('sites.createSuccess'));
        resetForm();
        setIsCreateDialogOpen(false);
        loadSites();
      } else {
        const error = await response.json();
        toast.error(error.error || t('sites.failedToCreate'));
      }
    } catch (error) {
      console.error('Error creating site:', error);
      toast.error(t('sites.failedToCreate'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSite = async () => {
    if (!editingSite || !validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/sites/${editingSite.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        if (formData.status === 'completed') {
          toast.success(t('sites.siteUpdatedCompleted'));
        } else {
          toast.success(t('sites.updateSuccess'));
        }
        resetForm();
        setIsEditDialogOpen(false);
        loadSites();
      } else {
        const error = await response.json();
        toast.error(error.error || t('sites.failedToUpdate'));
      }
    } catch (error) {
      console.error('Error updating site:', error);
      toast.error(t('sites.failedToUpdate'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSite = async (id: string) => {
    if (!confirm(t('sites.deleteConfirm'))) return;

    try {
      const response = await fetch(`/api/sites/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('sites.deleteSuccess'));
        loadSites();
      } else {
        const error = await response.json();
        toast.error(error.error || t('sites.failedToDelete'));
      }
    } catch (error) {
      console.error('Error deleting site:', error);
      toast.error(t('sites.failedToDelete'));
    }
  };

  const handleUpdateSiteStatus = async (siteId: string, newStatus: string) => {
    try {
      // Find the site to check current progress
      const site = sites.find(s => s.id === siteId);
      if (!site) return;

      // Validation: Cannot set status to "on-hold" if progress is 100%
      if (newStatus === 'on-hold' && site.progress === 100) {
        toast.error(t('sites.onHoldProgress100Error'));
        return;
      }

      setIsUpdatingStatus(siteId);
      const response = await fetch(`/api/sites/${siteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('sites.statusUpdateFailed'));
      }

      // Update the site in the local state
      setSites(prev => prev.map(s => 
        s.id === siteId ? { 
          ...s, 
          status: newStatus,
          // If status is completed, also update progress to 100%
          ...(newStatus === 'completed' ? { progress: 100 } : {})
        } : s
      ));

      if (newStatus === 'completed') {
        toast.success(t('sites.statusUpdatedCompleted'));
      } else {
        toast.success(t('sites.statusUpdatedSuccess'));
      }
    } catch (err: any) {
      toast.error(err.message || t('sites.statusUpdateFailed'));
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const openProgressDialog = (site: Site) => {
    // Check if site status is "on-hold" - prevent progress updates
    if (site.status === 'on-hold') {
      toast.error(t('sites.cannotUpdateProgressOnHold'));
      return;
    }
    
    // Check if site status is "completed" - prevent progress updates
    if (site.status === 'completed') {
      toast.error(t('sites.cannotUpdateProgressCompleted'));
      return;
    }
    
    setProgressSite(site);
    setProgressForm({
      progress: site.progress,
      progressNotes: site.progressNotes || '',
    });
    setIsProgressDialogOpen(true);
  };

  const handleUpdateProgress = async () => {
    if (!progressSite) return;

    // Additional validation: prevent progress updates for on-hold and completed sites
    if (progressSite.status === 'on-hold') {
      toast.error(t('sites.cannotUpdateProgressOnHoldShort'));
      return;
    }
    
    if (progressSite.status === 'completed') {
      toast.error(t('sites.cannotUpdateProgressCompletedShort'));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/sites/${progressSite.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress: progressForm.progress,
          progressNotes: progressForm.progressNotes,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (progressForm.progress === 100) {
          toast.success(t('sites.progressUpdated100'));
        } else {
          toast.success(t('sites.progressUpdatedSuccess'));
        }
        setIsProgressDialogOpen(false);
        loadSites();
      } else {
        const error = await response.json();
        toast.error(error.error || t('sites.progressUpdateFailed'));
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error(t('sites.progressUpdateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSites = sites;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            {isSearching ? (
              <Loader className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            )}
            <Input
              placeholder={t('sites.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('sites.allStatus')}</SelectItem>
              <SelectItem value="active">{t('sites.statusActive')}</SelectItem>
              <SelectItem value="scheduled">{t('sites.statusScheduled')}</SelectItem>
              <SelectItem value="completed">{t('sites.statusCompleted')}</SelectItem>
              <SelectItem value="on-hold">{t('sites.statusOnHold')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsExportDialogOpen(true)}>
            <Download className="w-4 h-4 mr-2" />
            {t('sites.exportReport')}
          </Button>

          {canEdit && (
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              if (open) {
                // Reset form when opening to ensure clean state
                resetForm();
              }
              setIsCreateDialogOpen(open);
              if (!open) {
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('sites.addSite')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t('sites.addModalTitle')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>{t('sites.siteName')} *</Label>
                      <Input
                        placeholder={t('sites.placeholderSiteName')}
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={validationErrors.name ? 'border-red-500 focus:border-red-500' : ''}
                      />
                      {validationErrors.name && (
                        <p className="text-red-500 text-sm mt-1">{t('sites.siteNameRequired')}</p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <Label>{t('sites.address')} *</Label>
                      <Input
                        placeholder={t('sites.placeholderAddress')}
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className={validationErrors.address ? 'border-red-500 focus:border-red-500' : ''}
                      />
                      {validationErrors.address && (
                        <p className="text-red-500 text-sm mt-1">{t('sites.addressRequired')}</p>
                      )}
                    </div>

                    <div>
                      <Label>{t('sites.city')}</Label>
                      <Input
                        placeholder={t('sites.placeholderCity')}
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>{t('sites.postalCode')}</Label>
                      <Input
                        placeholder={t('sites.placeholderPostalCode')}
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>{t('sites.client')}</Label>
                      <Select value={formData.clientId || 'none'} onValueChange={(value) => setFormData({ ...formData, clientId: value === 'none' ? '' : value })}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('sites.placeholderSelectClient')}>
                            {formData.clientId && formData.clientId !== 'none' ? (
                              clients.find(c => c.id === formData.clientId)?.fullName || t('sites.placeholderSelectClient')
                            ) : (
                              t('sites.placeholderSelectClient')
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('sites.noClient')}</SelectItem>
                          {loadingClients ? (
                            <div className="p-2 text-sm text-gray-500">{t('sites.loadingClients')}</div>
                          ) : clients.length > 0 ? (
                            clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{client.fullName}</span>
                                  <span className="text-xs text-gray-500 truncate">{client.email}</span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-2 text-sm text-gray-500">{t('sites.noClientsAvailable')}</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>{t('sites.startDate')} *</Label>
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                        className={validationErrors.startDate ? 'border-red-500 focus:border-red-500' : ''}
                      />
                      {validationErrors.startDate && (
                        <p className="text-red-500 text-sm mt-1">{t('sites.startDateRequired')}</p>
                      )}
                    </div>

                    <div>
                      <Label>{t('sites.estimatedEndDate')}</Label>
                      <Input
                        type="date"
                        value={formData.estimatedEndDate}
                        min={formData.startDate || undefined}
                        onChange={(e) => setFormData({ ...formData, estimatedEndDate: e.target.value })}
                      />
                      {(validationErrors.estimatedEndDate || (formData.startDate && formData.estimatedEndDate && formData.estimatedEndDate < formData.startDate)) && (
                        <p className="text-red-500 text-sm mt-1">Estimated end date cannot be earlier than start date</p>
                      )}
                    </div>

                    <div>
                      <Label>{t('common.status')}</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">{t('sites.statusScheduled')}</SelectItem>
                          <SelectItem value="active">{t('sites.statusActive')}</SelectItem>
                          <SelectItem value="on-hold">{t('sites.statusOnHold')}</SelectItem>
                          <SelectItem value="completed">{t('sites.statusCompleted')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {formData.status === 'completed' && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-xs text-green-700">
                            ℹ️ {t('sites.completedAutoProgress')}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>{t('sites.siteManager')}</Label>
                      <Select value={formData.siteManagerId || 'none'} onValueChange={(value) => setFormData({ ...formData, siteManagerId: value === 'none' ? '' : value })}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('sites.placeholderSelectManager')}>
                            {formData.siteManagerId && formData.siteManagerId !== 'none' ? (
                              siteManagers.find(m => m.id === formData.siteManagerId)?.fullName || t('sites.placeholderSelectManager')
                            ) : (
                              t('sites.placeholderSelectManager')
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('sites.noManager')}</SelectItem>
                          {loadingManagers ? (
                            <div className="p-2 text-sm text-gray-500">{t('sites.loadingManagers')}</div>
                          ) : siteManagers.length > 0 ? (
                            siteManagers.map((manager) => (
                              <SelectItem key={manager.id} value={manager.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{manager.fullName}</span>
                                  <span className="text-xs text-gray-500 truncate">{manager.email}</span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-2 text-sm text-gray-500">{t('sites.noManagersAvailable')}</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <Label>{t('common.description')}</Label>
                      <Textarea
                        placeholder={t('sites.placeholderDescription')}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        resetForm();
                      }}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button onClick={handleCreateSite} disabled={submitting}>
                      {submitting ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {t('sites.addSite')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('sites.totalSites')}</p>
          <p className="text-gray-900">{sites.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('sites.activeSites')}</p>
          <p className="text-gray-900">{sites.filter(s => s.status === 'active').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('sites.scheduled')}</p>
          <p className="text-gray-900">{sites.filter(s => s.status === 'scheduled').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('sites.completed')}</p>
          <p className="text-gray-900">{sites.filter(s => s.status === 'completed').length}</p>
        </Card>
      </div>

      {/* Sites Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredSites.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">{t('sites.noSitesFound')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSites.map((site) => (
            <Card key={site.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-gray-900 mb-2">{site.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <MapPin className="w-4 h-4" />
                    <span>{site.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(site.startDate).toLocaleDateString()} - {site.estimatedEndDate ? new Date(site.estimatedEndDate).toLocaleDateString() : t('sites.tbd')}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openViewDialog(site)}>
                      <Eye className="w-4 h-4 mr-2" />
                      {t('sites.viewDetails')}
                    </DropdownMenuItem>
                    {canEdit && (
                      <DropdownMenuItem onClick={() => openEditDialog(site)}>
                        <Edit className="w-4 h-4 mr-2" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDeleteSite(site.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('common.delete')}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">{t('sites.progress')}</span>
                  <span className="text-gray-900">{site.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-brand-gradient h-2 rounded-full transition-all shadow-sm"
                    style={{ width: `${site.progress}%` }}
                  ></div>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`mt-2 w-full ${(site.status === 'on-hold' || site.status === 'completed') ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => openProgressDialog(site)}
                    disabled={site.status === 'on-hold' || site.status === 'completed'}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    {site.status === 'on-hold' ? t('sites.progressLockedOnHold') : 
                     site.status === 'completed' ? t('sites.progressLockedCompleted') : 
                     t('sites.updateProgress')}
                  </Button>
                )}
                {(site.status === 'on-hold' || site.status === 'completed') && (
                  <p className="text-xs text-orange-600 mt-1 text-center">
                    {site.status === 'on-hold' ? t('sites.progressDisabledOnHold') :
                     t('sites.progressDisabledCompleted')}
                  </p>
                )}
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="text-xs text-gray-500 mb-1">{t('sites.siteManager')}</p>
                <p className="text-sm font-medium text-gray-900">
                  {site.siteManager ? site.siteManager.fullName : t('sites.notAssigned')}
                </p>
                {site.siteManager && (
                  <p className="text-xs text-gray-600">{site.siteManager.email}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {t('sites.workersAssigned', { count: site.assignedWorkers })}
                    </span>
                  </div>
                </div>
                {canEdit ? (
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <Select 
                      value={site.status} 
                      onValueChange={(value) => handleUpdateSiteStatus(site.id, value)}
                      disabled={isUpdatingStatus === site.id}
                    >
                      <SelectTrigger className="w-auto min-w-[120px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            {t('sites.statusScheduled')}
                          </span>
                        </SelectItem>
                        <SelectItem value="active">
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            {t('sites.statusActive')}
                          </span>
                        </SelectItem>
                        <SelectItem 
                          value="on-hold" 
                          disabled={site.progress === 100}
                        >
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            {t('sites.statusOnHold')} {site.progress === 100 ? t('sites.progress100Suffix') : ''}
                          </span>
                        </SelectItem>
                        <SelectItem value="completed">
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                            {t('sites.statusCompleted')}
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {isUpdatingStatus === site.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                        <Loader className="w-3 h-3 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                ) : (
                  <Badge
                    variant={
                      site.status === 'active'
                        ? 'default'
                        : site.status === 'scheduled'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {site.status}
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {canEdit && (
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('sites.editModalTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>{t('sites.siteName')} *</Label>
                  <Input
                    placeholder={t('sites.placeholderSiteName')}
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={validationErrors.name ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {validationErrors.name && (
                    <p className="text-red-500 text-sm mt-1">{t('sites.siteNameRequired')}</p>
                  )}
                </div>

                <div className="col-span-2">
                  <Label>{t('sites.address')} *</Label>
                  <Input
                    placeholder={t('sites.placeholderAddress')}
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className={validationErrors.address ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {validationErrors.address && (
                    <p className="text-red-500 text-sm mt-1">{t('sites.addressRequired')}</p>
                  )}
                </div>

                <div>
                  <Label>{t('sites.city')}</Label>
                  <Input
                    placeholder={t('sites.placeholderCity')}
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div>
                  <Label>{t('sites.postalCode')}</Label>
                  <Input
                    placeholder={t('sites.placeholderPostalCode')}
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <Label>{t('sites.client')}</Label>
                  <Select value={formData.clientId || 'none'} onValueChange={(value) => setFormData({ ...formData, clientId: value === 'none' ? '' : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('sites.placeholderSelectClient')}>
                        {formData.clientId && formData.clientId !== 'none' ? (
                          clients.find(c => c.id === formData.clientId)?.fullName || t('sites.placeholderSelectClient')
                        ) : (
                          t('sites.placeholderSelectClient')
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('sites.noClient')}</SelectItem>
                      {loadingClients ? (
                        <div className="p-2 text-sm text-gray-500">{t('sites.loadingClients')}</div>
                      ) : clients.length > 0 ? (
                        clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{client.fullName}</span>
                              <span className="text-xs text-gray-500 truncate">{client.email}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-gray-500">{t('sites.noClientsAvailable')}</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t('sites.startDate')} *</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className={validationErrors.startDate ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {validationErrors.startDate && (
                    <p className="text-red-500 text-sm mt-1">{t('sites.startDateRequired')}</p>
                  )}
                </div>

                <div>
                  <Label>{t('sites.estimatedEndDate')}</Label>
                  <Input
                    type="date"
                    value={formData.estimatedEndDate}
                    min={formData.startDate || undefined}
                    onChange={(e) => setFormData({ ...formData, estimatedEndDate: e.target.value })}
                  />
                  {(validationErrors.estimatedEndDate || (formData.startDate && formData.estimatedEndDate && formData.estimatedEndDate < formData.startDate)) && (
                    <p className="text-red-500 text-sm mt-1">Estimated end date cannot be earlier than start date</p>
                  )}
                </div>

                    <div>
                      <Label>{t('common.status')}</Label>
                      <Select value={formData.status} onValueChange={(value) => {
                        // Prevent selecting "on-hold" if progress is 100%
                        if (value === 'on-hold' && editingSite && editingSite.progress === 100) {
                          toast.error(t('sites.onHoldProgress100Error'));
                          return;
                        }
                        setFormData({ ...formData, status: value });
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">{t('sites.statusScheduled')}</SelectItem>
                          <SelectItem value="active">{t('sites.statusActive')}</SelectItem>
                          <SelectItem 
                            value="on-hold" 
                            disabled={!!(editingSite && editingSite.progress === 100)}
                          >
                            {t('sites.statusOnHold')} {editingSite && editingSite.progress === 100 ? t('sites.onHoldCannotSelect') : ''}
                          </SelectItem>
                          <SelectItem value="completed">{t('sites.statusCompleted')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {formData.status === 'completed' && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-xs text-green-700">
                            ℹ️ {t('sites.completedAutoProgress')}
                          </p>
                        </div>
                      )}
                      {editingSite && editingSite.progress === 100 && formData.status !== 'completed' && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                          <p className="text-xs text-yellow-700">
                            ⚠️ {t('sites.progress100ConsiderCompleted')}
                          </p>
                        </div>
                      )}
                    </div>

                <div>
                  <Label>{t('sites.siteManager')}</Label>
                  <Select value={formData.siteManagerId || 'none'} onValueChange={(value) => setFormData({ ...formData, siteManagerId: value === 'none' ? '' : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('sites.placeholderSelectManager')}>
                        {formData.siteManagerId && formData.siteManagerId !== 'none' ? (
                          siteManagers.find(m => m.id === formData.siteManagerId)?.fullName || t('sites.placeholderSelectManager')
                        ) : (
                          t('sites.placeholderSelectManager')
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('sites.noManager')}</SelectItem>
                      {loadingManagers ? (
                        <div className="p-2 text-sm text-gray-500">{t('sites.loadingManagers')}</div>
                      ) : siteManagers.length > 0 ? (
                        siteManagers.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{manager.fullName}</span>
                              <span className="text-xs text-gray-500 truncate">{manager.email}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-gray-500">{t('sites.noManagersAvailable')}</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label>{t('common.description')}</Label>
                  <Textarea
                    placeholder={t('sites.placeholderDescription')}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    resetForm();
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleUpdateSite} disabled={submitting}>
                  {submitting ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {t('sites.updateSite')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('sites.viewModalTitle')}</DialogTitle>
          </DialogHeader>
          {viewingSite && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">{t('sites.siteName')}</p>
                  <p className="text-gray-900 font-medium">{viewingSite.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('common.status')}</p>
                  <Badge className="mt-1">{viewingSite.status}</Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">{t('sites.address')}</p>
                  <p className="text-gray-900">{viewingSite.address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('sites.city')}</p>
                  <p className="text-gray-900">{viewingSite.city || t('sites.na')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('sites.postalCode')}</p>
                  <p className="text-gray-900">{viewingSite.postalCode || t('sites.na')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('sites.client')}</p>
                  <p className="text-gray-900">{viewingSite.client || t('sites.na')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('sites.siteManager')}</p>
                  <p className="text-gray-900">
                    {viewingSite.siteManager ? viewingSite.siteManager.fullName : t('sites.notAssigned')}
                  </p>
                  {viewingSite.siteManager && (
                    <p className="text-xs text-gray-600">{viewingSite.siteManager.email}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('sites.startDate')}</p>
                  <p className="text-gray-900">{new Date(viewingSite.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('sites.estimatedEndDate')}</p>
                  <p className="text-gray-900">
                    {viewingSite.estimatedEndDate ? new Date(viewingSite.estimatedEndDate).toLocaleDateString() : t('sites.tbd')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('sites.progress')}</p>
                  <p className="text-gray-900">{viewingSite.progress}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('sites.assignedWorkers')}</p>
                  <p className="text-gray-900">{t('sites.workersAssigned', { count: viewingSite.assignedWorkers })}</p>
                </div>
                {viewingSite.description && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">{t('common.description')}</p>
                    <p className="text-gray-900">{viewingSite.description}</p>
                  </div>
                )}
                {viewingSite.workers && viewingSite.workers.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 mb-2">{t('sites.assignedWorkers')}</p>
                    <div className="space-y-2">
                      {viewingSite.workers.map((worker: any) => (
                        <div key={worker.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                            {worker.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{worker.fullName}</p>
                            <p className="text-xs text-gray-500">{worker.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  {t('sites.close')}
                </Button>
                {canEdit && (
                  <Button onClick={() => {
                    setIsViewDialogOpen(false);
                    openEditDialog(viewingSite);
                  }}>
                    <Edit className="w-4 h-4 mr-2" />
                    {t('common.edit')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Progress Update Dialog */}
      <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('sites.updateProgressDialogTitle')}</DialogTitle>
          </DialogHeader>
          {progressSite && (
            <div className="space-y-4 mt-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">{t('sites.siteName')}: {progressSite.name}</p>
                <p className="text-xs text-gray-500">{t('common.status')}: {progressSite.status}</p>
              </div>

              {progressSite.status === 'on-hold' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700 font-medium">⚠️ {t('sites.siteOnHoldWarning')}</p>
                  <p className="text-xs text-red-600 mt-1">
                    {t('sites.progressNotAllowedOnHold')}
                  </p>
                </div>
              )}

              <div>
                <Label>{t('sites.progress')}: {progressForm.progress}%</Label>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progressForm.progress}
                    onChange={(e) => setProgressForm({ ...progressForm, progress: parseInt(e.target.value) })}
                    disabled={progressSite.status === 'on-hold'}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer progress-slider ${
                      progressSite.status === 'on-hold' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{
                      background: `linear-gradient(to right, #9F001B 0%, #9F001B ${progressForm.progress}%, #e5e7eb ${progressForm.progress}%, #e5e7eb 100%)`
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
                {progressForm.progress === 100 && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-xs text-green-700">
                      ℹ️ {t('sites.progress100WillComplete')}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label>{t('sites.progressNotes')}</Label>
                <Textarea
                  placeholder={t('sites.placeholderProgressNotes')}
                  value={progressForm.progressNotes}
                  onChange={(e) => setProgressForm({ ...progressForm, progressNotes: e.target.value })}
                  disabled={progressSite.status === 'on-hold'}
                  className={progressSite.status === 'on-hold' ? 'opacity-50 cursor-not-allowed' : ''}
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsProgressDialogOpen(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  onClick={handleUpdateProgress} 
                  disabled={submitting || progressSite.status === 'on-hold'}
                >
                  {submitting ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {t('sites.updateProgress')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Site Export Dialog */}
      <SiteExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        sites={sites}
      />
    </div>
  );
}
