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

interface ClientsPageProps {
  userRole: string;
}

interface Client {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  idNumber: string | null;
  address: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function ClientsPage({ userRole }: ClientsPageProps) {
  const { t } = useTranslation();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number; openUpward: boolean } | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    idNumber: '',
    address: '',
    status: 'active',
  });

  const canEdit = ['admin', 'sales_agent', 'offer_manager'].includes(userRole);
  const canDelete = userRole === 'admin';
  const canView = ['admin', 'sales_agent', 'offer_manager', 'order_manager'].includes(userRole);

  // Fetch clients
  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    fetchClients();
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

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const url = statusFilter === 'all' ? '/api/clients' : `/api/clients?status=${statusFilter}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch clients');
      const data = await response.json();
      setClients(data.clients || []);
    } catch (err) {
      setError(t('clients.failedToFetch'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      idNumber: '',
      address: '',
      status: 'active',
    });
    setError('');
  };

  const handleDropdownToggle = (clientId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (openDropdownId === clientId) {
      setOpenDropdownId(null);
      setDropdownPosition(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const dropdownHeight = 80; // Approximate height of dropdown (fewer items)
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
      setOpenDropdownId(clientId);
    }
  };

  const closeDropdown = () => {
    setOpenDropdownId(null);
    setDropdownPosition(null);
  };

  const handleCreateClient = async () => {
    try {
      setError('');
      if (!formData.fullName || !formData.email || !formData.phone || !formData.address) {
        setError('Full name, email, phone, and address are required');
        return;
      }

      setIsLoading(true);
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create client');
      }

      await fetchClients();
      setIsCreateDialogOpen(false);
      resetForm();
      setSelectedClient(null);
    } catch (err: any) {
      setError(err.message || 'Failed to create client');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateClient = async () => {
    if (!selectedClient) return;

    try {
      setError('');
      if (!formData.fullName || !formData.email || !formData.phone || !formData.address) {
        setError('Full name, email, phone, and address are required');
        return;
      }
      setIsLoading(true);
      const response = await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update client');
      }

      await fetchClients();
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedClient(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update client');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      setError('');
      setIsLoading(true);
      const response = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete client');

      await fetchClients();
    } catch (err: any) {
      setError(err.message || 'Failed to delete client');
    } finally {
      setIsLoading(false);
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
    setError(''); // Clear any previous errors
    setIsEditDialogOpen(true);
  };

  const handleViewClick = (client: Client) => {
    setSelectedClient(client);
    setIsViewDialogOpen(true);
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.phone?.includes(searchQuery) || false);

    return matchesSearch;
  });

  return (
    <div className="space-y-6 relative">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t('clients.searchClients')}
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
              <SelectItem value="all">{t('clients.allStatus')}</SelectItem>
              <SelectItem value="active">{t('clients.active')}</SelectItem>
              <SelectItem value="inactive">{t('clients.inactive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsExportDialogOpen(true)}>
            <Download className="w-4 h-4 mr-2" />
            {t('clients.exportReport')}
          </Button>

          {canEdit && (
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                resetForm();
                setSelectedClient(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('clients.addClient')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('clients.addNewClient')}</DialogTitle>
                </DialogHeader>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>{t('clients.fullName')} *</Label>
                      <Input
                        name="fullName"
                        placeholder={t('formPlaceholders.enterFullName')}
                        value={formData.fullName}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div>
                      <Label>{t('clients.email')} *</Label>
                      <Input
                        name="email"
                        type="email"
                        placeholder={t('formPlaceholders.enterEmail')}
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div>
                      <Label>{t('clients.phone')} *</Label>
                      <Input
                        name="phone"
                        placeholder={t('formPlaceholders.enterPhone')}
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div>
                      <Label>{t('clients.dateOfBirth')}</Label>
                      <Input
                        name="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div>
                      <Label>{t('clients.idNumber')}</Label>
                      <Input
                        name="idNumber"
                        placeholder={t('formPlaceholders.enterIdNumber')}
                        value={formData.idNumber}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>{t('clients.address')} *</Label>
                      <Input
                        name="address"
                        placeholder={t('formPlaceholders.fullAddress')}
                        value={formData.address}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div>
                      <Label>{t('clients.status')}</Label>
                      <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">{t('clients.active')}</SelectItem>
                          <SelectItem value="inactive">{t('clients.inactive')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => {
                      setIsCreateDialogOpen(false);
                      resetForm();
                      setSelectedClient(null);
                    }} disabled={isLoading}>
                      {t('common.cancel')}
                    </Button>
                    <Button onClick={handleCreateClient} disabled={isLoading}>
                      {isLoading ? t('common.loading') : t('clients.addClient')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('clients.totalClients')}</p>
          <p className="text-2xl font-semibold text-gray-900">{clients.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('clients.activeClients')}</p>
          <p className="text-2xl font-semibold text-gray-900">{clients.filter(c => c.status === 'active').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('clients.inactiveClients')}</p>
          <p className="text-2xl font-semibold text-gray-900">{clients.filter(c => c.status === 'inactive').length}</p>
        </Card>
      </div>

      {/* Clients Table */}
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
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {t('clients.noClientsFound')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="text-gray-900 font-medium">{client.fullName}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {client.phone && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Phone className="w-3 h-3" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Mail className="w-3 h-3" />
                            <span>{client.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {client.idNumber || '-'}
                      </TableCell>
                      <TableCell className="text-gray-600 max-w-xs truncate">
                        {client.address || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                          {client.status === 'active' ? t('clients.active') : t('clients.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {new Date(client.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDropdownToggle(client.id, e)}
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
      </div>

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
            {canView && (
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center transition-colors duration-150"
                onClick={(e) => {
                  e.stopPropagation();
                  const client = clients.find(c => c.id === openDropdownId);
                  if (client) handleViewClick(client);
                  closeDropdown();
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                {t('clients.viewDetails')}
              </button>
            )}
            {canEdit && (
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center transition-colors duration-150"
                onClick={(e) => {
                  e.stopPropagation();
                  const client = clients.find(c => c.id === openDropdownId);
                  if (client) handleEditClick(client);
                  closeDropdown();
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                {t('common.edit')}
              </button>
            )}
            {canDelete && (
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center text-red-600 transition-colors duration-150"
                onClick={(e) => {
                  e.stopPropagation();
                  if (openDropdownId) handleDeleteClient(openDropdownId);
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          resetForm();
          setSelectedClient(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('clients.editClient')}</DialogTitle>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>{t('clients.fullName')} *</Label>
                <Input
                  name="fullName"
                  placeholder={t('formPlaceholders.enterFullName')}
                  value={formData.fullName}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label>{t('clients.email')} *</Label>
                <Input
                  name="email"
                  type="email"
                  placeholder={t('formPlaceholders.enterEmail')}
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label>{t('clients.phone')} *</Label>
                <Input
                  name="phone"
                  placeholder={t('formPlaceholders.enterPhone')}
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label>{t('clients.dateOfBirth')}</Label>
                <Input
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label>{t('clients.idNumber')}</Label>
                <Input
                  name="idNumber"
                  placeholder={t('formPlaceholders.enterIdNumber')}
                  value={formData.idNumber}
                  onChange={handleInputChange}
                />
              </div>

              <div className="col-span-2">
                <Label>{t('clients.address')} *</Label>
                <Input
                  name="address"
                  placeholder={t('formPlaceholders.fullAddress')}
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label>{t('clients.status')}</Label>
                <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('clients.active')}</SelectItem>
                    <SelectItem value="inactive">{t('clients.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
                setSelectedClient(null);
              }} disabled={isLoading}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleUpdateClient} disabled={isLoading}>
                {isLoading ? t('clients.updating') : t('clients.updateClient')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
        setIsViewDialogOpen(open);
        if (!open) {
          setSelectedClient(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('clients.clientDetails')}</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-gray-500">{t('clients.fullName')}</Label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{selectedClient.fullName}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">{t('clients.email')}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{selectedClient.email}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">{t('clients.phone')}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{selectedClient.phone || 'Not provided'}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">{t('clients.dateOfBirth')}</Label>
                  <p className="text-gray-900 mt-1">
                    {selectedClient.dateOfBirth 
                      ? new Date(selectedClient.dateOfBirth).toLocaleDateString() 
                      : 'Not provided'
                    }
                  </p>
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
                  <div className="mt-1">
                    <Badge variant={selectedClient.status === 'active' ? 'default' : 'secondary'}>
                      {selectedClient.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Member Since</Label>
                  <p className="text-gray-900 mt-1">
                    {new Date(selectedClient.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {selectedClient.updatedAt !== selectedClient.createdAt && (
                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                    <p className="text-gray-900 mt-1">
                      {new Date(selectedClient.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => {
                  setIsViewDialogOpen(false);
                  setSelectedClient(null);
                }}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Client Export Dialog */}
      <ClientExportDialog 
        isOpen={isExportDialogOpen} 
        onClose={() => setIsExportDialogOpen(false)} 
        clients={clients} 
      />
    </div>
  );
}
