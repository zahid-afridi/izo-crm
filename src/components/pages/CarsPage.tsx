'use client';

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
import { Plus, Search, MoreVertical, Edit, Trash2, Download, AlertCircle, Loader } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { CarExportDialog } from './CarExportDialog';

interface CarsPageProps {
  userRole: string;
}

interface Car {
  id: string;
  name: string;
  number: string;
  color: string;
  model: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function CarsPage({ userRole }: CarsPageProps) {
  const { t } = useTranslation();
  const [cars, setCars] = useState<Car[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    number: '',
    color: '',
    model: '',
    status: 'active',
  });

  const canEdit = ['admin', 'site_manager'].includes(userRole);
  const canDelete = userRole === 'admin';

  // Fetch cars
  useEffect(() => {
    fetchCars();
  }, []);

  useEffect(() => {
    fetchCars();
  }, [statusFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openDropdownId) {
        closeDropdown();
      }
    };

    if (openDropdownId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdownId]);

  const fetchCars = async () => {
    try {
      setIsLoading(true);
      const url = statusFilter === 'all' ? '/api/cars' : `/api/cars?status=${statusFilter}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch cars');
      const data = await response.json();
      setCars(data.cars || []);
    } catch (err) {
      setError(t('cars.failedToLoad'));
      console.error(err);
      toast.error(t('cars.failedToLoad'));
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

  const handleUpdateCarStatus = async (carId: string, newStatus: string) => {
    try {
      setIsUpdatingStatus(carId);
      const response = await fetch(`/api/cars/${carId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update car status');
      }

      // Update the car in the local state
      setCars(prev => prev.map(car => 
        car.id === carId ? { ...car, status: newStatus } : car
      ));

      toast.success(t('cars.statusUpdateSuccess'));
    } catch (err: any) {
      toast.error(err.message || t('cars.failedToUpdateStatus'));
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      number: '',
      color: '',
      model: '',
      status: 'active',
    });
    setError('');
  };

  const handleDropdownToggle = (carId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (openDropdownId === carId) {
      setOpenDropdownId(null);
      setDropdownPosition(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const dropdownHeight = 80; // Approximate height of dropdown (fewer items)
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Position above if not enough space below
      const shouldPositionAbove = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
      
      setDropdownPosition({
        top: shouldPositionAbove 
          ? rect.top + window.scrollY - dropdownHeight - 5
          : rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX - 100
      });
      setOpenDropdownId(carId);
    }
  };

  const closeDropdown = () => {
    setOpenDropdownId(null);
    setDropdownPosition(null);
  };

  const handleCreateCar = async () => {
    try {
      setError('');
      if (!formData.name || !formData.number || !formData.color || !formData.model) {
        setError(t('cars.allFieldsRequired'));
        return;
      }

      setIsLoading(true);
      const response = await fetch('/api/cars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create car');
      }

      await fetchCars();
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success(t('cars.createSuccess'));
    } catch (err: any) {
      setError(err.message || t('cars.failedToCreate'));
      toast.error(err.message || t('cars.failedToCreate'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCar = async () => {
    if (!selectedCar) return;

    try {
      setError('');
      if (!formData.name || !formData.number || !formData.color || !formData.model) {
        setError(t('cars.allFieldsRequired'));
        return;
      }

      setIsLoading(true);
      const response = await fetch(`/api/cars/${selectedCar.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update car');
      }

      await fetchCars();
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedCar(null);
      toast.success(t('cars.updateSuccess'));
    } catch (err: any) {
      setError(err.message || t('cars.failedToUpdate'));
      toast.error(err.message || t('cars.failedToUpdate'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCar = async (id: string) => {
    if (!confirm(t('cars.deleteConfirm'))) return;

    try {
      setError('');
      setIsLoading(true);
      const response = await fetch(`/api/cars/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete car');

      await fetchCars();
      toast.success(t('cars.deleteSuccess'));
    } catch (err: any) {
      setError(err.message || 'Failed to delete car');
      toast.error(err.message || t('cars.failedToDelete'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (car: Car) => {
    setSelectedCar(car);
    setFormData({
      name: car.name,
      number: car.number,
      color: car.color,
      model: car.model,
      status: car.status,
    });
    setIsEditDialogOpen(true);
  };

  const filteredCars = cars.filter(car => {
    const matchesSearch =
      car.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      car.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      car.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      car.color.toLowerCase().includes(searchQuery.toLowerCase());

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
              placeholder={t('cars.searchCars')}
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
              <SelectItem value="all">{t('cars.allStatus')}</SelectItem>
              <SelectItem value="active">{t('cars.active')}</SelectItem>
              <SelectItem value="inactive">{t('cars.inactive')}</SelectItem>
              <SelectItem value="maintenance">{t('cars.maintenance')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsExportDialogOpen(true)}>
            <Download className="w-4 h-4 mr-2" />
            {t('cars.exportReport')}
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
                  {t('cars.addCar')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('cars.addNewCar')}</DialogTitle>
                </DialogHeader>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>{t('cars.carName')} *</Label>
                    <Input
                      name="name"
                      placeholder={t('cars.placeholderCarName')}
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <Label>{t('cars.licensePlateNumber')} *</Label>
                    <Input
                      name="number"
                      placeholder={t('cars.placeholderLicensePlate')}
                      value={formData.number}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <Label>{t('cars.model')} *</Label>
                    <Input
                      name="model"
                      placeholder={t('cars.placeholderModel')}
                      value={formData.model}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <Label>{t('cars.color')} *</Label>
                    <Input
                      name="color"
                      placeholder={t('cars.placeholderColor')}
                      value={formData.color}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <Label>{t('cars.status')}</Label>
                    <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t('cars.active')}</SelectItem>
                        <SelectItem value="inactive">{t('cars.inactive')}</SelectItem>
                        <SelectItem value="maintenance">{t('cars.maintenance')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => {
                      setIsCreateDialogOpen(false);
                      resetForm();
                    }} disabled={isLoading}>
                      {t('common.cancel')}
                    </Button>
                    <Button onClick={handleCreateCar} disabled={isLoading}>
                      {isLoading ? t('common.loading') : t('cars.addCar')}
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
          <p className="text-sm text-gray-500 mb-1">{t('cars.totalCars')}</p>
          <p className="text-2xl font-semibold text-gray-900">{cars.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('cars.activeCars')}</p>
          <p className="text-2xl font-semibold text-gray-900">{cars.filter(c => c.status === 'active').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('cars.inactive')}</p>
          <p className="text-2xl font-semibold text-gray-900">{cars.filter(c => c.status === 'inactive').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('cars.maintenance')}</p>
          <p className="text-2xl font-semibold text-gray-900">{cars.filter(c => c.status === 'maintenance').length}</p>
        </Card>
      </div>

      {/* Cars Table */}
      <div className="relative">
        <Card>
          {isLoading && cars.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('cars.carName')}</TableHead>
                    <TableHead>{t('cars.licensePlate')}</TableHead>
                    <TableHead>{t('cars.model')}</TableHead>
                    <TableHead>{t('cars.color')}</TableHead>
                    <TableHead>{t('cars.status')}</TableHead>
                    <TableHead>{t('cars.createdDate')}</TableHead>
                    <TableHead>{t('cars.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCars.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {t('cars.noCarsFound')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCars.map((car) => (
                      <TableRow key={car.id}>
                        <TableCell className="text-gray-900 font-medium">{car.name}</TableCell>
                        <TableCell className="text-gray-600 font-mono">{car.number}</TableCell>
                        <TableCell className="text-gray-600">{car.model}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: car.color.toLowerCase() }}
                            />
                            <span className="text-gray-600">{car.color}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {canEdit ? (
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <Select 
                                value={car.status} 
                                onValueChange={(value) => handleUpdateCarStatus(car.id, value)}
                                disabled={isUpdatingStatus === car.id}
                              >
                                <SelectTrigger className="w-auto min-w-[120px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">{t('cars.active')}</SelectItem>
                                  <SelectItem value="inactive">{t('cars.inactive')}</SelectItem>
                                  <SelectItem value="maintenance">{t('cars.maintenance')}</SelectItem>
                                </SelectContent>
                              </Select>
                              {isUpdatingStatus === car.id && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                                  <Loader className="w-3 h-3 animate-spin text-gray-400" />
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge variant={
                              car.status === 'active' ? 'default' :
                              car.status === 'maintenance' ? 'secondary' : 'outline'
                            }>
                              {car.status === 'active' ? t('cars.active') :
                               car.status === 'maintenance' ? t('cars.maintenance') : t('cars.inactive')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">
                          {new Date(car.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDropdownToggle(car.id, e)}
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
          )}
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
            className="fixed z-[99999] min-w-[160px] bg-white border border-gray-200 rounded-md shadow-lg py-1"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
          >
            {canEdit && (
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                onClick={() => {
                  const car = cars.find(c => c.id === openDropdownId);
                  if (car) handleEditClick(car);
                  closeDropdown();
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                {t('common.edit')}
              </button>
            )}
            {canDelete && (
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center text-red-600"
                onClick={() => {
                  if (openDropdownId) handleDeleteCar(openDropdownId);
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
          setSelectedCar(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('cars.editCar')}</DialogTitle>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-4 mt-4">
            <div>
              <Label>{t('cars.carName')}</Label>
              <Input
                name="name"
                placeholder={t('cars.placeholderCarName')}
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <Label>{t('cars.licensePlateNumber')}</Label>
              <Input
                name="number"
                placeholder={t('cars.placeholderLicensePlate')}
                value={formData.number}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <Label>{t('cars.model')}</Label>
              <Input
                name="model"
                placeholder={t('cars.placeholderModel')}
                value={formData.model}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <Label>{t('cars.color')}</Label>
              <Input
                name="color"
                placeholder={t('cars.placeholderColor')}
                value={formData.color}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <Label>{t('cars.status')}</Label>
              <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('cars.active')}</SelectItem>
                  <SelectItem value="inactive">{t('cars.inactive')}</SelectItem>
                  <SelectItem value="maintenance">{t('cars.maintenance')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
                setSelectedCar(null);
              }} disabled={isLoading}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleUpdateCar} disabled={isLoading}>
                {isLoading ? t('cars.updating') : t('cars.updateCar')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Car Export Dialog */}
      <CarExportDialog 
        isOpen={isExportDialogOpen} 
        onClose={() => setIsExportDialogOpen(false)} 
        cars={cars} 
      />
    </div>
  );
}
