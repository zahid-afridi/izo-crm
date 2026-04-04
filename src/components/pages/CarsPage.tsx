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
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { CarExportDialog } from './CarExportDialog';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchCars, createCar, updateCar, patchCarStatus, deleteCar,
  optimisticStatusUpdate, setSearchFilter, setStatusFilter,
  type Car,
} from '@/store/slices/carsSlice';
import {
  selectFilteredCars, selectCarStats, selectCarsIsLoading,
  selectCarsIsInitialized, selectCarsFilters,
} from '@/store/selectors/carsSelectors';

interface CarsPageProps {
  userRole: string;
}

const EMPTY_FORM = { name: '', number: '', color: '', model: '', status: 'active' };

export function CarsPage({ userRole }: CarsPageProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const filteredCars = useAppSelector(selectFilteredCars);
  const stats = useAppSelector(selectCarStats);
  const loading = useAppSelector(selectCarsIsLoading);
  const isInitialized = useAppSelector(selectCarsIsInitialized);
  const filters = useAppSelector(selectCarsFilters);

  const [searchQuery, setSearchQuery] = useState(filters.search);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const canEdit = ['admin', 'site_manager'].includes(userRole);
  const canDelete = userRole === 'admin';

  useEffect(() => {
    if (!isInitialized) dispatch(fetchCars());
  }, [dispatch, isInitialized]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(setSearchFilter(searchQuery));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, dispatch]);

  const resetForm = () => { setFormData(EMPTY_FORM); setFormError(''); };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleUpdateCarStatus = async (carId: string, newStatus: string) => {
    setIsUpdatingStatus(carId);
    dispatch(optimisticStatusUpdate({ id: carId, status: newStatus }));
    const result = await dispatch(patchCarStatus({ id: carId, status: newStatus }));
    if (patchCarStatus.rejected.match(result)) {
      toast.error(t('cars.failedToUpdateStatus'));
      dispatch(fetchCars()); // revert
    } else {
      toast.success(t('cars.statusUpdateSuccess'));
    }
    setIsUpdatingStatus(null);
  };

  const handleDropdownToggle = (carId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (openDropdownId === carId) {
      setOpenDropdownId(null);
      setDropdownPosition(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const dropdownHeight = 80;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldPositionAbove = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
      setDropdownPosition({
        top: shouldPositionAbove ? rect.top + window.scrollY - dropdownHeight - 5 : rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX - 100,
      });
      setOpenDropdownId(carId);
    }
  };

  const closeDropdown = () => { setOpenDropdownId(null); setDropdownPosition(null); };

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdownId) return;
    const handler = () => closeDropdown();
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openDropdownId]);

  const handleCreateCar = async () => {
    if (!formData.name || !formData.number || !formData.color || !formData.model) {
      setFormError(t('cars.allFieldsRequired'));
      return;
    }
    setSubmitting(true);
    const result = await dispatch(createCar(formData));
    setSubmitting(false);
    if (createCar.fulfilled.match(result)) {
      toast.success(t('cars.createSuccess'));
      setIsCreateDialogOpen(false);
      resetForm();
    } else {
      const msg = (result.payload as string) || t('cars.failedToCreate');
      setFormError(msg);
      toast.error(msg);
    }
  };

  const handleUpdateCar = async () => {
    if (!selectedCar) return;
    if (!formData.name || !formData.number || !formData.color || !formData.model) {
      setFormError(t('cars.allFieldsRequired'));
      return;
    }
    setSubmitting(true);
    const result = await dispatch(updateCar({ id: selectedCar.id, data: formData }));
    setSubmitting(false);
    if (updateCar.fulfilled.match(result)) {
      toast.success(t('cars.updateSuccess'));
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedCar(null);
    } else {
      const msg = (result.payload as string) || t('cars.failedToUpdate');
      setFormError(msg);
      toast.error(msg);
    }
  };

  const handleDeleteCar = async (id: string) => {
    if (!confirm(t('cars.deleteConfirm'))) return;
    const result = await dispatch(deleteCar(id));
    if (deleteCar.fulfilled.match(result)) {
      toast.success(t('cars.deleteSuccess'));
    } else {
      toast.error(t('cars.failedToDelete'));
    }
  };

  const handleEditClick = (car: Car) => {
    setSelectedCar(car);
    setFormData({ name: car.name, number: car.number, color: car.color, model: car.model, status: car.status });
    setIsEditDialogOpen(true);
  };

  const allCars = useAppSelector((s) => s.cars.allIds.map((id) => s.cars.byId[id]));

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
          <Select value={filters.status} onValueChange={(v) => dispatch(setStatusFilter(v))}>
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
              setIsCreateDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />{t('cars.addCar')}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{t('cars.addNewCar')}</DialogTitle></DialogHeader>
                {formError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                <CarForm formData={formData} onChange={handleInputChange} onSelectChange={(n, v) => setFormData((p) => ({ ...p, [n]: v }))} t={t} />
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }} disabled={submitting}>{t('common.cancel')}</Button>
                  <Button onClick={handleCreateCar} disabled={submitting}>{submitting ? t('common.loading') : t('cars.addCar')}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4"><p className="text-sm text-gray-500 mb-1">{t('cars.totalCars')}</p><p className="text-2xl font-semibold text-gray-900">{stats.total}</p></Card>
        <Card className="p-4"><p className="text-sm text-gray-500 mb-1">{t('cars.activeCars')}</p><p className="text-2xl font-semibold text-gray-900">{stats.active}</p></Card>
        <Card className="p-4"><p className="text-sm text-gray-500 mb-1">{t('cars.inactive')}</p><p className="text-2xl font-semibold text-gray-900">{stats.inactive}</p></Card>
        <Card className="p-4"><p className="text-sm text-gray-500 mb-1">{t('cars.maintenance')}</p><p className="text-2xl font-semibold text-gray-900">{stats.maintenance}</p></Card>
      </div>

      {/* Table */}
      <div className="relative">
        <Card>
          {loading && filteredCars.length === 0 ? (
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
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">{t('cars.noCarsFound')}</TableCell>
                    </TableRow>
                  ) : (
                    filteredCars.map((car) => (
                      <TableRow key={car.id}>
                        <TableCell className="text-gray-900 font-medium">{car.name}</TableCell>
                        <TableCell className="text-gray-600 font-mono">{car.number}</TableCell>
                        <TableCell className="text-gray-600">{car.model}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: car.color.toLowerCase() }} />
                            <span className="text-gray-600">{car.color}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {canEdit ? (
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <Select value={car.status} onValueChange={(v) => handleUpdateCarStatus(car.id, v)} disabled={isUpdatingStatus === car.id}>
                                <SelectTrigger className="w-auto min-w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
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
                            <Badge variant={car.status === 'active' ? 'default' : car.status === 'maintenance' ? 'secondary' : 'outline'}>
                              {car.status === 'active' ? t('cars.active') : car.status === 'maintenance' ? t('cars.maintenance') : t('cars.inactive')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">{new Date(car.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="relative">
                          <Button variant="ghost" size="icon" onClick={(e) => handleDropdownToggle(car.id, e)}>
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

      {/* Custom Dropdown */}
      {openDropdownId && dropdownPosition && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={closeDropdown} />
          <div className="fixed z-[99999] min-w-[160px] bg-white border border-gray-200 rounded-md shadow-lg py-1" style={{ top: dropdownPosition.top, left: dropdownPosition.left }}>
            {canEdit && (
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center" onClick={() => { const car = filteredCars.find((c) => c.id === openDropdownId) || allCars.find((c) => c.id === openDropdownId); if (car) handleEditClick(car); closeDropdown(); }}>
                <Edit className="w-4 h-4 mr-2" />{t('common.edit')}
              </button>
            )}
            {canDelete && (
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center text-red-600" onClick={() => { if (openDropdownId) handleDeleteCar(openDropdownId); closeDropdown(); }}>
                <Trash2 className="w-4 h-4 mr-2" />{t('common.delete')}
              </button>
            )}
          </div>
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) { resetForm(); setSelectedCar(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('cars.editCar')}</DialogTitle></DialogHeader>
          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <CarForm formData={formData} onChange={handleInputChange} onSelectChange={(n, v) => setFormData((p) => ({ ...p, [n]: v }))} t={t} />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); setSelectedCar(null); }} disabled={submitting}>{t('common.cancel')}</Button>
            <Button onClick={handleUpdateCar} disabled={submitting}>{submitting ? t('cars.updating') : t('cars.updateCar')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <CarExportDialog isOpen={isExportDialogOpen} onClose={() => setIsExportDialogOpen(false)} cars={allCars} />
    </div>
  );
}

function CarForm({ formData, onChange, onSelectChange, t }: {
  formData: { name: string; number: string; color: string; model: string; status: string };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-4 mt-4">
      <div>
        <Label>{t('cars.carName')} *</Label>
        <Input name="name" placeholder={t('cars.placeholderCarName')} value={formData.name} onChange={onChange} />
      </div>
      <div>
        <Label>{t('cars.licensePlateNumber')} *</Label>
        <Input name="number" placeholder={t('cars.placeholderLicensePlate')} value={formData.number} onChange={onChange} />
      </div>
      <div>
        <Label>{t('cars.model')} *</Label>
        <Input name="model" placeholder={t('cars.placeholderModel')} value={formData.model} onChange={onChange} />
      </div>
      <div>
        <Label>{t('cars.color')} *</Label>
        <Input name="color" placeholder={t('cars.placeholderColor')} value={formData.color} onChange={onChange} />
      </div>
      <div>
        <Label>{t('cars.status')}</Label>
        <Select value={formData.status} onValueChange={(v) => onSelectChange('status', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">{t('cars.active')}</SelectItem>
            <SelectItem value="inactive">{t('cars.inactive')}</SelectItem>
            <SelectItem value="maintenance">{t('cars.maintenance')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
