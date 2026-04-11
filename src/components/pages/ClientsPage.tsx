"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus, Search, Phone, Mail, MoreVertical, Edit, Trash2, Download, AlertCircle, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { ClientExportDialog } from './ClientExportDialog';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchClients, createClient, updateClient, deleteClient,
  setSearchFilter, setStatusFilter, type Client,
} from '@/store/slices/clientsSlice';
import {
  selectFilteredClients, selectClientStats,
  selectClientsIsLoading, selectClientsIsInitialized, selectClientsFilters,
  selectAllClients,
} from '@/store/selectors/clientsSelectors';

interface ClientsPageProps { userRole: string; }

const EMPTY_FORM = { fullName: '', email: '', phone: '', dateOfBirth: '', idNumber: '', address: '', status: 'active' };

type ClientFormState = typeof EMPTY_FORM;

/** Must be declared outside ClientsPage — inner components remount every keystroke and inputs lose focus. */
function ClientFormFields({
  formData,
  onInputChange,
  onStatusChange,
  t,
}: {
  formData: ClientFormState;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStatusChange: (value: string) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>{t('clients.fullName')} *</Label>
          <Input name="fullName" placeholder={t('formPlaceholders.enterFullName')} value={formData.fullName} onChange={onInputChange} />
        </div>
        <div>
          <Label>{t('clients.email')} *</Label>
          <Input name="email" type="email" placeholder={t('formPlaceholders.enterEmail')} value={formData.email} onChange={onInputChange} />
        </div>
        <div>
          <Label>{t('clients.phone')} *</Label>
          <Input name="phone" placeholder={t('formPlaceholders.enterPhone')} value={formData.phone} onChange={onInputChange} />
        </div>
        <div>
          <Label>{t('clients.dateOfBirth')}</Label>
          <Input name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={onInputChange} />
        </div>
        <div>
          <Label>{t('clients.idNumber')}</Label>
          <Input name="idNumber" placeholder={t('formPlaceholders.enterIdNumber')} value={formData.idNumber} onChange={onInputChange} />
        </div>
        <div className="col-span-2">
          <Label>{t('clients.address')} *</Label>
          <Input name="address" placeholder={t('formPlaceholders.fullAddress')} value={formData.address} onChange={onInputChange} />
        </div>
        <div>
          <Label>{t('clients.status')}</Label>
          <Select value={formData.status} onValueChange={onStatusChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t('clients.active')}</SelectItem>
              <SelectItem value="inactive">{t('clients.inactive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export function ClientsPage({ userRole }: ClientsPageProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const filteredClients = useAppSelector(selectFilteredClients);
  const allClients = useAppSelector(selectAllClients);
  const stats = useAppSelector(selectClientStats);
  const isLoading = useAppSelector(selectClientsIsLoading);
  const isInitialized = useAppSelector(selectClientsIsInitialized);
  const filters = useAppSelector(selectClientsFilters);

  const [searchQuery, setSearchQuery] = useState(filters.search);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number; openUpward: boolean } | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const canEdit = ['admin', 'sales_agent', 'offer_manager'].includes(userRole);
  const canDelete = userRole === 'admin';
  const canView = ['admin', 'sales_agent', 'offer_manager', 'order_manager'].includes(userRole);

  useEffect(() => {
    if (!isInitialized) dispatch(fetchClients());
  }, [dispatch, isInitialized]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => dispatch(setSearchFilter(searchQuery)), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, dispatch]);

  // Close dropdown on outside click / scroll / resize / escape
  useEffect(() => {
    if (!openDropdownId) return;
    const close = () => closeDropdown();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDropdown(); };
    document.addEventListener('click', close);
    document.addEventListener('scroll', close, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('scroll', close, true);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
    };
  }, [openDropdownId]);

  const resetForm = () => { setFormData(EMPTY_FORM); setFormError(''); };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleStatusChange = (value: string) => {
    setFormData((p) => ({ ...p, status: value }));
  };

  const handleDropdownToggle = (clientId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (openDropdownId === clientId) { closeDropdown(); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const dh = 120;
    const dw = 160;
    const pad = 8;
    const openUpward = vh - rect.bottom - pad < dh && rect.top - pad >= dh;
    const top = openUpward ? rect.top - dh : rect.bottom;
    let right = vw - rect.right;
    if (right < pad) right = Math.max(pad, vw - rect.left - dw);
    setDropdownPosition({ top: Math.max(pad, Math.min(top, vh - dh - pad)), right: Math.max(pad, right), openUpward });
    setOpenDropdownId(clientId);
  };

  const closeDropdown = () => { setOpenDropdownId(null); setDropdownPosition(null); };

  const handleCreateClient = async () => {
    if (!formData.fullName || !formData.email || !formData.phone || !formData.address) {
      setFormError('Full name, email, phone, and address are required');
      return;
    }
    setSubmitting(true);
    const result = await dispatch(createClient(formData));
    setSubmitting(false);
    if (createClient.fulfilled.match(result)) {
      setIsCreateDialogOpen(false);
      resetForm();
    } else {
      setFormError((result.payload as string) || 'Failed to create client');
    }
  };

  const handleUpdateClient = async () => {
    if (!selectedClient) return;
    if (!formData.fullName || !formData.email || !formData.phone || !formData.address) {
      setFormError('Full name, email, phone, and address are required');
      return;
    }
    setSubmitting(true);
    const result = await dispatch(updateClient({ id: selectedClient.id, data: formData }));
    setSubmitting(false);
    if (updateClient.fulfilled.match(result)) {
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedClient(null);
    } else {
      setFormError((result.payload as string) || 'Failed to update client');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    const result = await dispatch(deleteClient(id));
    if (deleteClient.rejected.match(result)) {
      alert((result.payload as string) || 'Failed to delete client');
    }
  };

  const handleEditClick = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      fullName: client.fullName,
      email: client.email,
      phone: client.phone || '',
      dateOfBirth: client.dateOfBirth ? client.dateOfBirth.split('T')[0] : '',
      idNumber: client.idNumber || '',
      address: client.address || '',
      status: client.status,
    });
    setFormError('');
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6 relative">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder={t('clients.searchClients')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={filters.status} onValueChange={(v) => dispatch(setStatusFilter(v))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('clients.allStatus')}</SelectItem>
              <SelectItem value="active">{t('clients.active')}</SelectItem>
              <SelectItem value="inactive">{t('clients.inactive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsExportDialogOpen(true)}>
            <Download className="w-4 h-4 mr-2" />{t('clients.exportReport')}
          </Button>
          {canEdit && (
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { setIsCreateDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />{t('clients.addClient')}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{t('clients.addNewClient')}</DialogTitle></DialogHeader>
                {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert>}
                <ClientFormFields formData={formData} onInputChange={handleInputChange} onStatusChange={handleStatusChange} t={t} />
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }} disabled={submitting}>{t('common.cancel')}</Button>
                  <Button onClick={handleCreateClient} disabled={submitting}>{submitting ? t('common.loading') : t('clients.addClient')}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4"><p className="text-sm text-gray-500 mb-1">{t('clients.totalClients')}</p><p className="text-2xl font-semibold text-gray-900">{stats.total}</p></Card>
        <Card className="p-4"><p className="text-sm text-gray-500 mb-1">{t('clients.activeClients')}</p><p className="text-2xl font-semibold text-gray-900">{stats.active}</p></Card>
        <Card className="p-4"><p className="text-sm text-gray-500 mb-1">{t('clients.inactiveClients')}</p><p className="text-2xl font-semibold text-gray-900">{stats.inactive}</p></Card>
      </div>

      {/* Table */}
      <div className="relative">
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('clients.name')}</TableHead>
                  <TableHead>{t('clients.contact')}</TableHead>
                  <TableHead>{t('clients.idNumber')}</TableHead>
                  <TableHead>{t('clients.address')}</TableHead>
                  <TableHead>{t('clients.status')}</TableHead>
                  <TableHead>{t('clients.joinedDate')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">{t('clients.noClientsFound')}</TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="text-gray-900 font-medium">{client.fullName}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {client.phone && <div className="flex items-center gap-1 text-xs text-gray-600"><Phone className="w-3 h-3" /><span>{client.phone}</span></div>}
                          <div className="flex items-center gap-1 text-xs text-gray-600"><Mail className="w-3 h-3" /><span>{client.email}</span></div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">{client.idNumber || '-'}</TableCell>
                      <TableCell className="text-gray-600 max-w-xs truncate">{client.address || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                          {client.status === 'active' ? t('clients.active') : t('clients.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">{new Date(client.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="relative">
                        <Button variant="ghost" size="icon" onClick={(e) => handleDropdownToggle(client.id, e)} className="h-8 w-8 hover:bg-gray-100">
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
      </div>

      {/* Dropdown */}
      {openDropdownId && dropdownPosition && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={closeDropdown} />
          <div
            className={`fixed z-[9999] min-w-[160px] bg-white border border-gray-200 rounded-md shadow-lg py-1 ${dropdownPosition.openUpward ? 'animate-in slide-in-from-bottom-1 fade-in-0' : 'animate-in slide-in-from-top-1 fade-in-0'}`}
            style={{ top: `${dropdownPosition.top}px`, right: `${dropdownPosition.right}px` }}
          >
            {canView && (
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center" onClick={(e) => { e.stopPropagation(); const c = allClients.find(c => c.id === openDropdownId); if (c) { setSelectedClient(c); setIsViewDialogOpen(true); } closeDropdown(); }}>
                <Eye className="w-4 h-4 mr-2" />{t('clients.viewDetails')}
              </button>
            )}
            {canEdit && (
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center" onClick={(e) => { e.stopPropagation(); const c = allClients.find(c => c.id === openDropdownId); if (c) handleEditClick(c); closeDropdown(); }}>
                <Edit className="w-4 h-4 mr-2" />{t('common.edit')}
              </button>
            )}
            {canDelete && (
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center text-red-600" onClick={(e) => { e.stopPropagation(); if (openDropdownId) handleDeleteClient(openDropdownId); closeDropdown(); }}>
                <Trash2 className="w-4 h-4 mr-2" />{t('common.delete')}
              </button>
            )}
          </div>
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) { resetForm(); setSelectedClient(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('clients.editClient')}</DialogTitle></DialogHeader>
          {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert>}
          <ClientFormFields formData={formData} onInputChange={handleInputChange} onStatusChange={handleStatusChange} t={t} />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); setSelectedClient(null); }} disabled={submitting}>{t('common.cancel')}</Button>
            <Button onClick={handleUpdateClient} disabled={submitting}>{submitting ? t('clients.updating') : t('clients.updateClient')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={(open) => { setIsViewDialogOpen(open); if (!open) setSelectedClient(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('clients.clientDetails')}</DialogTitle></DialogHeader>
          {selectedClient && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-gray-500">{t('clients.fullName')}</Label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{selectedClient.fullName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">{t('clients.email')}</Label>
                  <div className="flex items-center gap-2 mt-1"><Mail className="w-4 h-4 text-gray-400" /><p className="text-gray-900">{selectedClient.email}</p></div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">{t('clients.phone')}</Label>
                  <div className="flex items-center gap-2 mt-1"><Phone className="w-4 h-4 text-gray-400" /><p className="text-gray-900">{selectedClient.phone || 'Not provided'}</p></div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">{t('clients.dateOfBirth')}</Label>
                  <p className="text-gray-900 mt-1">{selectedClient.dateOfBirth ? new Date(selectedClient.dateOfBirth).toLocaleDateString() : 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">{t('clients.idNumber')}</Label>
                  <p className="text-gray-900 mt-1">{selectedClient.idNumber || 'Not provided'}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-gray-500">{t('clients.address')}</Label>
                  <p className="text-gray-900 mt-1">{selectedClient.address || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">{t('clients.status')}</Label>
                  <div className="mt-1"><Badge variant={selectedClient.status === 'active' ? 'default' : 'secondary'}>{selectedClient.status === 'active' ? 'Active' : 'Inactive'}</Badge></div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Member Since</Label>
                  <p className="text-gray-900 mt-1">{new Date(selectedClient.createdAt).toLocaleDateString()}</p>
                </div>
                {selectedClient.updatedAt !== selectedClient.createdAt && (
                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                    <p className="text-gray-900 mt-1">{new Date(selectedClient.updatedAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => { setIsViewDialogOpen(false); setSelectedClient(null); }}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ClientExportDialog isOpen={isExportDialogOpen} onClose={() => setIsExportDialogOpen(false)} clients={allClients} />
    </div>
  );
}
