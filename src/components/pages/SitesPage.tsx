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
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchSites, fetchSiteManagers, fetchClients,
  createSite, updateSite, patchSiteStatus, deleteSite,
  optimisticStatusUpdate, setSearchFilter, setStatusFilter,
  type Site,
} from '@/store/slices/sitesSlice';
import {
  selectFilteredSites, selectSiteStats, selectSiteManagers, selectSiteClients,
  selectSitesIsLoading, selectSitesIsInitialized, selectSitesLoadingManagers,
  selectSitesLoadingClients, selectSitesFilters,
} from '@/store/selectors/sitesSelectors';

interface SitesPageProps { userRole: string; }

const EMPTY_FORM = {
  name: '', address: '', city: '', postalCode: '', clientId: '',
  startDate: '', estimatedEndDate: '', status: 'scheduled', siteManagerId: '', description: '',
};

export function SitesPage({ userRole }: SitesPageProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const filteredSites = useAppSelector(selectFilteredSites);
  const stats = useAppSelector(selectSiteStats);
  const siteManagers = useAppSelector(selectSiteManagers);
  const clients = useAppSelector(selectSiteClients);
  const loading = useAppSelector(selectSitesIsLoading);
  const isInitialized = useAppSelector(selectSitesIsInitialized);
  const loadingManagers = useAppSelector(selectSitesLoadingManagers);
  const loadingClients = useAppSelector(selectSitesLoadingClients);
  const filters = useAppSelector(selectSitesFilters);

  const [searchQuery, setSearchQuery] = useState(filters.search);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [viewingSite, setViewingSite] = useState<Site | null>(null);
  const [progressSite, setProgressSite] = useState<Site | null>(null);
  const [progressForm, setProgressForm] = useState({ progress: 0, progressNotes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  const canEdit = ['admin', 'site_manager'].includes(userRole);
  const canDelete = userRole === 'admin';

  // Initial load
  useEffect(() => {
    if (!isInitialized) dispatch(fetchSites());
    dispatch(fetchSiteManagers());
    dispatch(fetchClients());
  }, [dispatch, isInitialized]);

  // Debounce search
  useEffect(() => {
    if (searchQuery !== filters.search) setIsSearching(true);
    const timer = setTimeout(() => {
      dispatch(setSearchFilter(searchQuery));
      setIsSearching(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, dispatch]);

  // Re-fetch on filter change
  useEffect(() => {
    if (isInitialized) {
      dispatch(fetchSites({ search: filters.search, status: filters.status }));
    }
  }, [filters.search, filters.status, dispatch]);

  const resetForm = useCallback(() => {
    setFormData(EMPTY_FORM);
    setValidationErrors({});
    setEditingSite(null);
  }, []);

  const handleInputChange = (field: string, value: string) => {
    const updates: Record<string, string> = { [field]: value };
    if (field === 'startDate' && formData.estimatedEndDate && value && formData.estimatedEndDate < value) {
      updates.estimatedEndDate = '';
    }
    setFormData((p) => ({ ...p, ...updates }));
    if (validationErrors[field]) setValidationErrors((p) => ({ ...p, [field]: false }));
  };

  const validateForm = () => {
    const errors: Record<string, boolean> = {};
    if (!formData.name.trim()) errors.name = true;
    if (!formData.address.trim()) errors.address = true;
    if (!formData.startDate) errors.startDate = true;
    if (formData.startDate && formData.estimatedEndDate && formData.estimatedEndDate < formData.startDate) errors.estimatedEndDate = true;
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openEditDialog = (site: Site) => {
    setEditingSite(site);
    setValidationErrors({});
    setFormData({
      name: site.name, address: site.address, city: site.city || '',
      postalCode: site.postalCode || '', clientId: site.clientId || '',
      startDate: site.startDate.split('T')[0],
      estimatedEndDate: site.estimatedEndDate ? site.estimatedEndDate.split('T')[0] : '',
      status: site.status, siteManagerId: site.siteManagerId || '', description: site.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (site: Site) => { setViewingSite(site); setIsViewDialogOpen(true); };

  const handleCreateSite = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const result = await dispatch(createSite(formData));
      if (createSite.fulfilled.match(result)) {
        toast.success(t('sites.createSuccess'));
        resetForm();
        setIsCreateDialogOpen(false);
      } else {
        toast.error((result.payload as string) || t('sites.failedToCreate'));
      }
    } finally { setSubmitting(false); }
  };

  const handleUpdateSite = async () => {
    if (!editingSite || !validateForm()) return;
    setSubmitting(true);
    try {
      const result = await dispatch(updateSite({ id: editingSite.id, data: formData }));
      if (updateSite.fulfilled.match(result)) {
        toast.success(formData.status === 'completed' ? t('sites.siteUpdatedCompleted') : t('sites.updateSuccess'));
        resetForm();
        setIsEditDialogOpen(false);
      } else {
        toast.error((result.payload as string) || t('sites.failedToUpdate'));
      }
    } finally { setSubmitting(false); }
  };

  const handleDeleteSite = async (id: string) => {
    if (!confirm(t('sites.deleteConfirm'))) return;
    const result = await dispatch(deleteSite(id));
    if (deleteSite.fulfilled.match(result)) toast.success(t('sites.deleteSuccess'));
    else toast.error((result.payload as string) || t('sites.failedToDelete'));
  };

  const handleUpdateSiteStatus = async (siteId: string, newStatus: string) => {
    const site = filteredSites.find((s) => s.id === siteId);
    if (!site) return;
    if (newStatus === 'on-hold' && site.progress === 100) { toast.error(t('sites.onHoldProgress100Error')); return; }
    setIsUpdatingStatus(siteId);
    dispatch(optimisticStatusUpdate({ id: siteId, status: newStatus }));
    const result = await dispatch(patchSiteStatus({ id: siteId, status: newStatus }));
    setIsUpdatingStatus(null);
    if (patchSiteStatus.fulfilled.match(result)) {
      toast.success(newStatus === 'completed' ? t('sites.statusUpdatedCompleted') : t('sites.statusUpdatedSuccess'));
    } else {
      dispatch(fetchSites({ search: filters.search, status: filters.status }));
      toast.error((result.payload as string) || t('sites.statusUpdateFailed'));
    }
  };

  const openProgressDialog = (site: Site) => {
    if (site.status === 'on-hold') { toast.error(t('sites.cannotUpdateProgressOnHold')); return; }
    if (site.status === 'completed') { toast.error(t('sites.cannotUpdateProgressCompleted')); return; }
    setProgressSite(site);
    setProgressForm({ progress: site.progress, progressNotes: site.progressNotes || '' });
    setIsProgressDialogOpen(true);
  };

  const handleUpdateProgress = async () => {
    if (!progressSite) return;
    if (progressSite.status === 'on-hold') { toast.error(t('sites.cannotUpdateProgressOnHoldShort')); return; }
    if (progressSite.status === 'completed') { toast.error(t('sites.cannotUpdateProgressCompletedShort')); return; }
    setSubmitting(true);
    try {
      const result = await dispatch(updateSite({ id: progressSite.id, data: { progress: progressForm.progress, progressNotes: progressForm.progressNotes } }));
      if (updateSite.fulfilled.match(result)) {
        toast.success(progressForm.progress === 100 ? t('sites.progressUpdated100') : t('sites.progressUpdatedSuccess'));
        setIsProgressDialogOpen(false);
      } else {
        toast.error((result.payload as string) || t('sites.progressUpdateFailed'));
      }
    } finally { setSubmitting(false); }
  };

  const renderFormFields = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label>{t('sites.siteName')} *</Label>
        <Input placeholder={t('sites.placeholderSiteName')} value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} className={validationErrors.name ? 'border-red-500 focus:border-red-500' : ''} />
        {validationErrors.name && <p className="text-red-500 text-sm mt-1">{t('sites.siteNameRequired')}</p>}
      </div>
      <div className="col-span-2">
        <Label>{t('sites.address')} *</Label>
        <Input placeholder={t('sites.placeholderAddress')} value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} className={validationErrors.address ? 'border-red-500 focus:border-red-500' : ''} />
        {validationErrors.address && <p className="text-red-500 text-sm mt-1">{t('sites.addressRequired')}</p>}
      </div>
      <div>
        <Label>{t('sites.city')}</Label>
        <Input placeholder={t('sites.placeholderCity')} value={formData.city} onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))} />
      </div>
      <div>
        <Label>{t('sites.postalCode')}</Label>
        <Input placeholder={t('sites.placeholderPostalCode')} value={formData.postalCode} onChange={(e) => setFormData((p) => ({ ...p, postalCode: e.target.value }))} />
      </div>
      <div className="col-span-2">
        <Label>{t('sites.client')}</Label>
        <Select value={formData.clientId || 'none'} onValueChange={(v) => setFormData((p) => ({ ...p, clientId: v === 'none' ? '' : v }))}>
          <SelectTrigger><SelectValue placeholder={t('sites.placeholderSelectClient')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('sites.noClient')}</SelectItem>
            {loadingClients ? <div className="p-2 text-sm text-gray-500">{t('sites.loadingClients')}</div>
              : clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex flex-col"><span className="font-medium">{c.fullName}</span><span className="text-xs text-gray-500">{c.email}</span></div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>{t('sites.startDate')} *</Label>
        <Input type="date" value={formData.startDate} onChange={(e) => handleInputChange('startDate', e.target.value)} className={validationErrors.startDate ? 'border-red-500 focus:border-red-500' : ''} />
        {validationErrors.startDate && <p className="text-red-500 text-sm mt-1">{t('sites.startDateRequired')}</p>}
      </div>
      <div>
        <Label>{t('sites.estimatedEndDate')}</Label>
        <Input type="date" value={formData.estimatedEndDate} min={formData.startDate || undefined} onChange={(e) => setFormData((p) => ({ ...p, estimatedEndDate: e.target.value }))} />
        {(validationErrors.estimatedEndDate || (formData.startDate && formData.estimatedEndDate && formData.estimatedEndDate < formData.startDate)) && (
          <p className="text-red-500 text-sm mt-1">Estimated end date cannot be earlier than start date</p>
        )}
      </div>
      <div>
        <Label>{t('common.status')}</Label>
        <Select value={formData.status} onValueChange={(v) => {
          if (v === 'on-hold' && editingSite && editingSite.progress === 100) { toast.error(t('sites.onHoldProgress100Error')); return; }
          setFormData((p) => ({ ...p, status: v }));
        }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduled">{t('sites.statusScheduled')}</SelectItem>
            <SelectItem value="active">{t('sites.statusActive')}</SelectItem>
            <SelectItem value="on-hold" disabled={!!(editingSite && editingSite.progress === 100)}>
              {t('sites.statusOnHold')}{editingSite && editingSite.progress === 100 ? ` ${t('sites.onHoldCannotSelect')}` : ''}
            </SelectItem>
            <SelectItem value="completed">{t('sites.statusCompleted')}</SelectItem>
          </SelectContent>
        </Select>
        {formData.status === 'completed' && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
            <p className="text-xs text-green-700">ℹ️ {t('sites.completedAutoProgress')}</p>
          </div>
        )}
        {editingSite && editingSite.progress === 100 && formData.status !== 'completed' && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-xs text-yellow-700">⚠️ {t('sites.progress100ConsiderCompleted')}</p>
          </div>
        )}
      </div>
      <div>
        <Label>{t('sites.siteManager')}</Label>
        <Select value={formData.siteManagerId || 'none'} onValueChange={(v) => setFormData((p) => ({ ...p, siteManagerId: v === 'none' ? '' : v }))}>
          <SelectTrigger><SelectValue placeholder={t('sites.placeholderSelectManager')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('sites.noManager')}</SelectItem>
            {loadingManagers ? <div className="p-2 text-sm text-gray-500">{t('sites.loadingManagers')}</div>
              : siteManagers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <div className="flex flex-col"><span className="font-medium">{m.fullName}</span><span className="text-xs text-gray-500">{m.email}</span></div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Label>{t('common.description')}</Label>
        <Textarea placeholder={t('sites.placeholderDescription')} value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} rows={4} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            {isSearching ? <Loader className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              : <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />}
            <Input placeholder={t('sites.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-10" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Select value={filters.status} onValueChange={(v) => dispatch(setStatusFilter(v))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
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
            <Download className="w-4 h-4 mr-2" />{t('sites.exportReport')}
          </Button>
          {canEdit && (
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { if (open) resetForm(); setIsCreateDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />{t('sites.addSite')}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>{t('sites.addModalTitle')}</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  {renderFormFields()}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>{t('common.cancel')}</Button>
                    <Button onClick={handleCreateSite} disabled={submitting}>
                      {submitting && <Loader className="w-4 h-4 mr-2 animate-spin" />}{t('sites.addSite')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4"><p className="text-sm text-gray-500 mb-1">{t('sites.totalSites')}</p><p className="text-gray-900">{stats.total}</p></Card>
        <Card className="p-4"><p className="text-sm text-gray-500 mb-1">{t('sites.activeSites')}</p><p className="text-gray-900">{stats.active}</p></Card>
        <Card className="p-4"><p className="text-sm text-gray-500 mb-1">{t('sites.scheduled')}</p><p className="text-gray-900">{stats.scheduled}</p></Card>
        <Card className="p-4"><p className="text-sm text-gray-500 mb-1">{t('sites.completed')}</p><p className="text-gray-900">{stats.completed}</p></Card>
      </div>

      {/* Sites Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : filteredSites.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-gray-500">{t('sites.noSitesFound')}</p></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSites.map((site) => (
            <Card key={site.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-gray-900 mb-2">{site.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1"><MapPin className="w-4 h-4" /><span>{site.address}</span></div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(site.startDate).toLocaleDateString()} - {site.estimatedEndDate ? new Date(site.estimatedEndDate).toLocaleDateString() : t('sites.tbd')}</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openViewDialog(site)}><Eye className="w-4 h-4 mr-2" />{t('sites.viewDetails')}</DropdownMenuItem>
                    {canEdit && <DropdownMenuItem onClick={() => openEditDialog(site)}><Edit className="w-4 h-4 mr-2" />{t('common.edit')}</DropdownMenuItem>}
                    {canDelete && <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteSite(site.id)}><Trash2 className="w-4 h-4 mr-2" />{t('common.delete')}</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">{t('sites.progress')}</span>
                  <span className="text-gray-900">{site.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-brand-gradient h-2 rounded-full transition-all shadow-sm" style={{ width: `${site.progress}%` }} />
                </div>
                {canEdit && (
                  <Button variant="ghost" size="sm"
                    className={`mt-2 w-full ${(site.status === 'on-hold' || site.status === 'completed') ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => openProgressDialog(site)}
                    disabled={site.status === 'on-hold' || site.status === 'completed'}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    {site.status === 'on-hold' ? t('sites.progressLockedOnHold') : site.status === 'completed' ? t('sites.progressLockedCompleted') : t('sites.updateProgress')}
                  </Button>
                )}
                {(site.status === 'on-hold' || site.status === 'completed') && (
                  <p className="text-xs text-orange-600 mt-1 text-center">
                    {site.status === 'on-hold' ? t('sites.progressDisabledOnHold') : t('sites.progressDisabledCompleted')}
                  </p>
                )}
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="text-xs text-gray-500 mb-1">{t('sites.siteManager')}</p>
                <p className="text-sm font-medium text-gray-900">{site.siteManager ? site.siteManager.fullName : t('sites.notAssigned')}</p>
                {site.siteManager && <p className="text-xs text-gray-600">{site.siteManager.email}</p>}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{t('sites.workersAssigned', { count: site.assignedWorkers })}</span>
                </div>
                {canEdit ? (
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <Select value={site.status} onValueChange={(v) => handleUpdateSiteStatus(site.id, v)} disabled={isUpdatingStatus === site.id}>
                      <SelectTrigger className="w-auto min-w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" />{t('sites.statusScheduled')}</span></SelectItem>
                        <SelectItem value="active"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" />{t('sites.statusActive')}</span></SelectItem>
                        <SelectItem value="on-hold" disabled={site.progress === 100}>
                          <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500" />{t('sites.statusOnHold')}{site.progress === 100 ? ` ${t('sites.progress100Suffix')}` : ''}</span>
                        </SelectItem>
                        <SelectItem value="completed"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-500" />{t('sites.statusCompleted')}</span></SelectItem>
                      </SelectContent>
                    </Select>
                    {isUpdatingStatus === site.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                        <Loader className="w-3 h-3 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                ) : (
                  <Badge variant={site.status === 'active' ? 'default' : site.status === 'scheduled' ? 'secondary' : 'outline'}>{site.status}</Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {canEdit && (
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{t('sites.editModalTitle')}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              {renderFormFields()}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); }}>{t('common.cancel')}</Button>
                <Button onClick={handleUpdateSite} disabled={submitting}>
                  {submitting && <Loader className="w-4 h-4 mr-2 animate-spin" />}{t('sites.updateSite')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{t('sites.viewModalTitle')}</DialogTitle></DialogHeader>
          {viewingSite && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">{t('sites.siteName')}</p><p className="text-gray-900 font-medium">{viewingSite.name}</p></div>
                <div><p className="text-sm text-gray-500">{t('common.status')}</p><Badge className="mt-1">{viewingSite.status}</Badge></div>
                <div className="col-span-2"><p className="text-sm text-gray-500">{t('sites.address')}</p><p className="text-gray-900">{viewingSite.address}</p></div>
                <div><p className="text-sm text-gray-500">{t('sites.city')}</p><p className="text-gray-900">{viewingSite.city || t('sites.na')}</p></div>
                <div><p className="text-sm text-gray-500">{t('sites.postalCode')}</p><p className="text-gray-900">{viewingSite.postalCode || t('sites.na')}</p></div>
                <div><p className="text-sm text-gray-500">{t('sites.client')}</p><p className="text-gray-900">{viewingSite.client || t('sites.na')}</p></div>
                <div>
                  <p className="text-sm text-gray-500">{t('sites.siteManager')}</p>
                  <p className="text-gray-900">{viewingSite.siteManager ? viewingSite.siteManager.fullName : t('sites.notAssigned')}</p>
                  {viewingSite.siteManager && <p className="text-xs text-gray-600">{viewingSite.siteManager.email}</p>}
                </div>
                <div><p className="text-sm text-gray-500">{t('sites.startDate')}</p><p className="text-gray-900">{new Date(viewingSite.startDate).toLocaleDateString()}</p></div>
                <div><p className="text-sm text-gray-500">{t('sites.estimatedEndDate')}</p><p className="text-gray-900">{viewingSite.estimatedEndDate ? new Date(viewingSite.estimatedEndDate).toLocaleDateString() : t('sites.tbd')}</p></div>
                <div><p className="text-sm text-gray-500">{t('sites.progress')}</p><p className="text-gray-900">{viewingSite.progress}%</p></div>
                <div><p className="text-sm text-gray-500">{t('sites.assignedWorkers')}</p><p className="text-gray-900">{t('sites.workersAssigned', { count: viewingSite.assignedWorkers })}</p></div>
                {viewingSite.description && (
                  <div className="col-span-2"><p className="text-sm text-gray-500">{t('common.description')}</p><p className="text-gray-900">{viewingSite.description}</p></div>
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
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>{t('sites.close')}</Button>
                {canEdit && (
                  <Button onClick={() => { setIsViewDialogOpen(false); openEditDialog(viewingSite); }}>
                    <Edit className="w-4 h-4 mr-2" />{t('common.edit')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Progress Dialog */}
      <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('sites.updateProgressDialogTitle')}</DialogTitle></DialogHeader>
          {progressSite && (
            <div className="space-y-4 mt-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">{t('sites.siteName')}: {progressSite.name}</p>
                <p className="text-xs text-gray-500">{t('common.status')}: {progressSite.status}</p>
              </div>
              {progressSite.status === 'on-hold' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700 font-medium">⚠️ {t('sites.siteOnHoldWarning')}</p>
                  <p className="text-xs text-red-600 mt-1">{t('sites.progressNotAllowedOnHold')}</p>
                </div>
              )}
              <div>
                <Label>{t('sites.progress')}: {progressForm.progress}%</Label>
                <input type="range" min="0" max="100" value={progressForm.progress}
                  onChange={(e) => setProgressForm((p) => ({ ...p, progress: parseInt(e.target.value) }))}
                  disabled={progressSite.status === 'on-hold'}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer progress-slider ${progressSite.status === 'on-hold' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ background: `linear-gradient(to right, #9F001B 0%, #9F001B ${progressForm.progress}%, #e5e7eb ${progressForm.progress}%, #e5e7eb 100%)` }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1"><span>0%</span><span>50%</span><span>100%</span></div>
                {progressForm.progress === 100 && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-xs text-green-700">ℹ️ {t('sites.progress100WillComplete')}</p>
                  </div>
                )}
              </div>
              <div>
                <Label>{t('sites.progressNotes')}</Label>
                <Textarea placeholder={t('sites.placeholderProgressNotes')} value={progressForm.progressNotes}
                  onChange={(e) => setProgressForm((p) => ({ ...p, progressNotes: e.target.value }))}
                  disabled={progressSite.status === 'on-hold'}
                  className={progressSite.status === 'on-hold' ? 'opacity-50 cursor-not-allowed' : ''} rows={4} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsProgressDialogOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleUpdateProgress} disabled={submitting || progressSite.status === 'on-hold'}>
                  {submitting && <Loader className="w-4 h-4 mr-2 animate-spin" />}{t('sites.updateProgress')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SiteExportDialog isOpen={isExportDialogOpen} onClose={() => setIsExportDialogOpen(false)} sites={filteredSites} />
    </div>
  );
}
