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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Plus, Search, Phone, Mail, MoreVertical, Edit, Trash2, Download, AlertCircle, Eye, EyeOff, Loader } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { useAuthRedux } from '@/hooks/useAuthRedux';
import { useWorkers, type Worker } from '@/hooks/useWorkers';
import { WorkerExportDialog } from './WorkerExportDialog';

interface WorkersPageProps {
  userRole: string;
}

interface Role {
  value: string;
  label: string;
}

export function WorkersPage({ userRole }: WorkersPageProps) {
  const { t } = useTranslation();
  const { user } = useAuthRedux();
  const {
    filteredWorkers,
    isLoading,
    isInitialized,
    error: reduxError,
    filters,
    fetchWorkers,
    createWorker,
    updateWorker,
    updateWorkerField,
    deleteWorker,
    setSearchFilter,
    setStatusFilter: setReduxStatusFilter,
    clearError,
  } = useWorkers();

  const [roles, setRoles] = useState<Role[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [showPasswordInDetails, setShowPasswordInDetails] = useState(false);
  const [error, setError] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [currentStep, setCurrentStep] = useState('basic');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordEdit, setShowPasswordEdit] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number; openUpward: boolean } | null>(null);
  const [isUpdatingField, setIsUpdatingField] = useState<string | null>(null);
  const [selectedWorkerPassword, setSelectedWorkerPassword] = useState<string>('123456');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    idNumber: '',
    address: '',
    role: 'worker',
    employeeType: 'full-time',
    removeStatus: 'active',
    hourlyRate: '',
    monthlyRate: '',
    password: '',
  });

  const canEdit = ['admin', 'site_manager', 'hr'].includes(userRole);
  const canDelete = userRole === 'admin';

  // Filter roles based on user permissions
  const getAvailableRoles = () => {
    return roles;
  };

  const availableRoles = getAvailableRoles();

  // Get translated role label (fallback to original label if no translation)
  const getRoleLabel = (roleValue: string, fallbackLabel?: string) => {
    const key = `roles.${roleValue}`;
    const translated = t(key);
    return translated !== key ? translated : (fallbackLabel || roleValue);
  };

  // Fetch workers on mount
  useEffect(() => {
    fetchWorkers({ search: filters.search, status: filters.status });
    fetchRoles();
  }, []);

  // Fetch roles
  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/workers/roles');
      if (!response.ok) throw new Error('Failed to fetch roles');
      const data = await response.json();
      setRoles(data.roles || []);
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

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

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
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
      role: 'worker',
      employeeType: 'full-time',
      removeStatus: 'active',
      hourlyRate: '',
      monthlyRate: '',
      password: '',
    });
    setError('');
    setValidationErrors({});
    setCurrentStep('basic');
  };

  const validateStep = (step: string): boolean => {
    const errors: Record<string, string> = {};

    if (step === 'basic') {
      if (!formData.fullName.trim()) {
        errors.fullName = t('workers.validationFullNameRequired');
      }
      if (!formData.email.trim()) {
        errors.email = t('workers.validationEmailRequired');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = t('workers.validationEmailInvalid');
      }
      // Optional phone validation
      if (formData.phone && formData.phone.trim() && !/^[\+]?[0-9\s\-\(\)]{7,}$/.test(formData.phone)) {
        errors.phone = t('workers.validationPhoneInvalid');
      }
    }

    if (step === 'employment') {
      if (!formData.role) {
        errors.role = t('workers.validationRoleRequired');
      }
      // Validate rates if provided
      if (formData.hourlyRate && (isNaN(Number(formData.hourlyRate)) || Number(formData.hourlyRate) < 0)) {
        errors.hourlyRate = t('workers.validationHourlyRateInvalid');
      }
      if (formData.monthlyRate && (isNaN(Number(formData.monthlyRate)) || Number(formData.monthlyRate) < 0)) {
        errors.monthlyRate = t('workers.validationMonthlyRateInvalid');
      }
    }

    if (step === 'security') {
      if (!formData.password.trim()) {
        errors.password = t('workers.validationPasswordRequired');
      } else if (formData.password.length < 6) {
        errors.password = t('workers.validationPasswordMin');
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Real-time validation on input change
  const handleInputChangeWithValidation = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Real-time validation for specific fields
    const newErrors: Record<string, string> = {};

    if (name === 'email' && value.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors.email = t('workers.validationEmailInvalid');
      }
    }

    if (name === 'phone' && value.trim()) {
      if (!/^[\+]?[0-9\s\-\(\)]{7,}$/.test(value)) {
        newErrors.phone = t('workers.validationPhoneInvalid');
      }
    }

    if (name === 'password' && value.trim()) {
      if (value.length < 6) {
        newErrors.password = t('workers.validationPasswordMin');
      }
    }

    if (name === 'hourlyRate' && value.trim()) {
      if (isNaN(Number(value)) || Number(value) < 0) {
        newErrors.hourlyRate = t('workers.validationHourlyRateInvalid');
      }
    }

    if (name === 'monthlyRate' && value.trim()) {
      if (isNaN(Number(value)) || Number(value) < 0) {
        newErrors.monthlyRate = t('workers.validationMonthlyRateInvalid');
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setValidationErrors(prev => ({ ...prev, ...newErrors }));
    }
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStep === 'basic') {
      setCurrentStep('employment');
    } else if (currentStep === 'employment') {
      setCurrentStep('security');
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 'employment') {
      setCurrentStep('basic');
    } else if (currentStep === 'security') {
      setCurrentStep('employment');
    }
  };

  const handleCreateWorker = async () => {
    try {
      setError('');

      // Final validation for all steps
      const isBasicValid = validateStep('basic');
      const isEmploymentValid = validateStep('employment');
      const isSecurityValid = validateStep('security');

      if (!isBasicValid || !isEmploymentValid || !isSecurityValid) {
        if (!isBasicValid) {
          setCurrentStep('basic');
        } else if (!isEmploymentValid) {
          setCurrentStep('employment');
        } else if (!isSecurityValid) {
          setCurrentStep('security');
        }
        return;
      }

      await createWorker({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        idNumber: formData.idNumber || undefined,
        address: formData.address || undefined,
        role: formData.role,
        createdByUserId: user?.id,
        password: formData.password,
        employeeType: formData.employeeType,
        hourlyRate: formData.hourlyRate ? Number(formData.hourlyRate) : undefined,
        monthlyRate: formData.monthlyRate ? Number(formData.monthlyRate) : undefined,
        removeStatus: formData.removeStatus,
      } as any);

      setIsCreateDialogOpen(false);
      resetForm();
      toast.success(t('workers.workerCreateSuccess'));
    } catch (err: any) {
      toast.error(err.message || t('workers.failedToCreate'));
    }
  };

  const handleUpdateWorkerFieldLocal = async (workerId: string, field: 'role' | 'removeStatus', value: string) => {
    try {
      setIsUpdatingField(`${workerId}-${field}`);
      await updateWorkerField(workerId, field, value, user?.id);
      toast.success(field === 'role' ? t('workers.roleUpdatedSuccess') : t('workers.statusUpdatedSuccess'));
    } catch (err: any) {
      toast.error(err.message || t('workers.failedToUpdateField', { field: field === 'role' ? t('workers.role') : t('workers.status') }));
    } finally {
      setIsUpdatingField(null);
    }
  };

  const handleUpdateWorker = async () => {
    if (!selectedWorker) return;

    try {
      setError('');
      await updateWorker(selectedWorker.id, {
        ...formData,
        updatedByUserId: user?.id,
      });

      setIsEditDialogOpen(false);
      resetForm();
      setSelectedWorker(null);
      toast.success(t('workers.workerUpdateSuccess'));
    } catch (err: any) {
      setError(err.message || t('workers.failedToUpdate'));
    }
  };

  const handleDeleteWorker = async (id: string) => {
    const worker = filteredWorkers.find(w => w.id === id);
    if (worker) {
      setWorkerToDelete(worker);
      setIsDeleteConfirmOpen(true);
    }
  };

  const confirmDeleteWorker = async () => {
    if (!workerToDelete) return;

    try {
      setError('');
      await deleteWorker(workerToDelete.id, user?.id);
      setIsDeleteConfirmOpen(false);
      setWorkerToDelete(null);
      toast.success(t('workers.workerDeleteSuccess'));
    } catch (err: any) {
      toast.error(err.message || t('workers.failedToDelete'));
    }
  };

  const handleEditClick = async (worker: Worker) => {
    setSelectedWorker(worker);

    // Fetch worker details to get the actual password
    try {
      const response = await fetch(`/api/workers/${worker.id}`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          fullName: worker.fullName,
          email: worker.email,
          phone: worker.phone || '',
          dateOfBirth: worker.dateOfBirth ? worker.dateOfBirth.split('T')[0] : '',
          idNumber: worker.idNumber || '',
          address: worker.address || '',
          role: worker.role,
          employeeType: worker.worker?.employeeType || 'full-time',
          removeStatus: worker.worker?.removeStatus || 'active',
          hourlyRate: worker.worker?.hourlyRate?.toString() || '',
          monthlyRate: worker.worker?.monthlyRate?.toString() || '',
          password: data.worker.plainPassword || '123456', // Use actual password or fallback
        });
      } else {
        // Fallback to default password
        setFormData({
          fullName: worker.fullName,
          email: worker.email,
          phone: worker.phone || '',
          dateOfBirth: worker.dateOfBirth ? worker.dateOfBirth.split('T')[0] : '',
          idNumber: worker.idNumber || '',
          address: worker.address || '',
          role: worker.role,
          employeeType: worker.worker?.employeeType || 'full-time',
          removeStatus: worker.worker?.removeStatus || 'active',
          hourlyRate: worker.worker?.hourlyRate?.toString() || '',
          monthlyRate: worker.worker?.monthlyRate?.toString() || '',
          password: '123456',
        });
      }
    } catch (error) {
      console.error('Error fetching worker details:', error);
      // Fallback to default password
      setFormData({
        fullName: worker.fullName,
        email: worker.email,
        phone: worker.phone || '',
        dateOfBirth: worker.dateOfBirth ? worker.dateOfBirth.split('T')[0] : '',
        idNumber: worker.idNumber || '',
        address: worker.address || '',
        role: worker.role,
        employeeType: worker.worker?.employeeType || 'full-time',
        removeStatus: worker.worker?.removeStatus || 'active',
        hourlyRate: worker.worker?.hourlyRate?.toString() || '',
        monthlyRate: worker.worker?.monthlyRate?.toString() || '',
        password: '123456',
      });
    }

    setIsEditDialogOpen(true);
  };

  const handleDetailsClick = async (worker: Worker) => {
    setSelectedWorker(worker);
    setShowPasswordInDetails(false);

    try {
      const response = await fetch(`/api/workers/${worker.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedWorkerPassword(data.worker.plainPassword || '123456');
      } else {
        setSelectedWorkerPassword('123456');
      }
    } catch (error) {
      console.error('Error fetching worker details:', error);
      setSelectedWorkerPassword('123456');
    }

    setIsDetailsDialogOpen(true);
  };

  const handleDropdownToggle = (workerId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (openDropdownId === workerId) {
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
      setOpenDropdownId(workerId);
    }
  };

  const closeDropdown = () => {
    setOpenDropdownId(null);
    setDropdownPosition(null);
  };

  // Debounced dropdown close to prevent accidental closes
  const debouncedCloseDropdown = () => {
    setTimeout(() => {
      closeDropdown();
    }, 100);
  };

  const filteredWorkers_local = filteredWorkers;

  return (
    <div className="space-y-4 sm:space-y-6 relative w-full">
      {/* Header Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 flex-shrink-0" />
            <Input
              placeholder={t('workers.searchWorkers')}
              value={filters.search}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <Select value={filters.status} onValueChange={setReduxStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('workers.allStatus')}</SelectItem>
              <SelectItem value="active">{t('workers.statusActive')}</SelectItem>
              <SelectItem value="on_leave">{t('workers.statusOnLeave')}</SelectItem>
              <SelectItem value="disabled">{t('workers.statusRemoved')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <Button variant="outline" onClick={() => setIsExportDialogOpen(true)} className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{t('workers.exportReport')}</span>
          </Button>

          {canEdit && (
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                resetForm();
              } else {
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{t('workers.addWorker')}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle>{t('workers.addWorker')}</DialogTitle>
                </DialogHeader>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-4 mt-4">
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setCurrentStep('basic')}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${currentStep === 'basic'
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {t('workers.basicInfo')}
                    </button>
                    <button
                      onClick={() => setCurrentStep('employment')}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${currentStep === 'employment'
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {t('workers.employment')}
                    </button>
                    <button
                      onClick={() => setCurrentStep('security')}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${currentStep === 'security'
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {t('workers.security')}
                    </button>
                  </div>

                  {currentStep === 'basic' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label>{t('workers.fullName')} *</Label>
                          <Input
                            name="fullName"
                            placeholder={t('formPlaceholders.enterFullName')}
                            value={formData.fullName}
                            onChange={handleInputChangeWithValidation}
                            className={validationErrors.fullName ? 'border-red-500' : ''}
                          />
                          {validationErrors.fullName && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.fullName}</p>
                          )}
                        </div>

                        <div>
                          <Label>{t('workers.phone')}</Label>
                          <Input
                            name="phone"
                            placeholder={t('formPlaceholders.enterPhone')}
                            value={formData.phone}
                            onChange={handleInputChangeWithValidation}
                            className={validationErrors.phone ? 'border-red-500' : ''}
                          />
                          {validationErrors.phone && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.phone}</p>
                          )}
                        </div>

                        <div>
                          <Label>{t('common.email')} *</Label>
                          <Input
                            name="email"
                            type="email"
                            placeholder={t('formPlaceholders.enterEmailWork')}
                            value={formData.email}
                            onChange={handleInputChangeWithValidation}
                            className={validationErrors.email ? 'border-red-500' : ''}
                          />
                          {validationErrors.email && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                          )}
                        </div>

                        <div>
                          <Label>{t('workers.dateOfBirth')}</Label>
                          <Input
                            name="dateOfBirth"
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={handleInputChange}
                          />
                        </div>

                        <div>
                          <Label>{t('workers.idNumber')}</Label>
                          <Input
                            name="idNumber"
                            placeholder={t('formPlaceholders.enterIdNumber')}
                            value={formData.idNumber}
                            onChange={handleInputChange}
                          />
                        </div>

                        <div className="col-span-2">
                          <Label>{t('workers.address')}</Label>
                          <Input
                            name="address"
                            placeholder={t('formPlaceholders.fullAddress')}
                            value={formData.address}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 'employment' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t('workers.role')} *</Label>
                          <Select value={formData.role} onValueChange={(value) => handleSelectChange('role', value)}>
                            <SelectTrigger className={validationErrors.role ? 'border-red-500' : ''}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRoles.map(role => (
                                <SelectItem key={role.value} value={role.value}>
                                  {getRoleLabel(role.value, role.label)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {validationErrors.role && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.role}</p>
                          )}
                        </div>

                        <div>
                          <Label>{t('workers.employeeType')}</Label>
                          <Select value={formData.employeeType} onValueChange={(value) => handleSelectChange('employeeType', value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full-time">{t('workers.employeeTypeFullTime')}</SelectItem>
                              <SelectItem value="part-time">{t('workers.employeeTypePartTime')}</SelectItem>
                              <SelectItem value="contract">{t('workers.employeeTypeContract')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>{t('workers.status')}</Label>
                          <Select value={formData.removeStatus} onValueChange={(value) => handleSelectChange('removeStatus', value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">{t('workers.statusActive')}</SelectItem>
                              <SelectItem value="on_leave">{t('workers.statusOnLeave')}</SelectItem>
                              <SelectItem value="disabled">{t('workers.statusRemoved')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div></div>

                        <div>
                          <Label>{t('workers.hourlyRate')}</Label>
                          <Input
                            name="hourlyRate"
                            type="number"
                            step="0.50"
                            placeholder="0.00"
                            value={formData.hourlyRate}
                            onChange={handleInputChangeWithValidation}
                            className={validationErrors.hourlyRate ? 'border-red-500' : ''}
                          />
                          {validationErrors.hourlyRate && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.hourlyRate}</p>
                          )}
                        </div>

                        <div>
                          <Label>{t('workers.monthlyRate')}</Label>
                          <Input
                            name="monthlyRate"
                            type="number"
                            placeholder="0"
                            value={formData.monthlyRate}
                            onChange={handleInputChangeWithValidation}
                            className={validationErrors.monthlyRate ? 'border-red-500' : ''}
                          />
                          {validationErrors.monthlyRate && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.monthlyRate}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 'security' && (
                    <div className="space-y-4">
                      <div>
                        <Label>{t('common.password')} *</Label>
                        <div className="relative">
                          <Input
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder={t('formPlaceholders.enterPassword')}
                            value={formData.password}
                            onChange={handleInputChangeWithValidation}
                            className={validationErrors.password ? 'border-red-500 pr-10' : 'pr-10'}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {validationErrors.password && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.password}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between gap-2 pt-4 border-t">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsCreateDialogOpen(false);
                          resetForm();
                        }}
                        disabled={isLoading}
                      >
                        {t('common.cancel')}
                      </Button>
                      {currentStep !== 'basic' && (
                        <Button
                          variant="outline"
                          onClick={handlePreviousStep}
                          disabled={isLoading}
                        >
                          {t('common.back')}
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {currentStep !== 'security' && (
                        <Button
                          onClick={handleNextStep}
                          disabled={isLoading}
                        >
                          {t('common.next')}
                        </Button>
                      )}
                      {currentStep === 'security' && (
                        <Button
                          onClick={handleCreateWorker}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader className="w-4 h-4 mr-2 animate-spin" />
                              {t('workers.creating')}
                            </>
                          ) : (
                            t('workers.addWorker')
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-500 mb-1 truncate">{t('workers.totalWorkers')}</p>
          <p className="text-xl sm:text-2xl font-semibold text-gray-900">{filteredWorkers_local.length}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-500 mb-1 truncate">{t('workers.active')}</p>
          <p className="text-xl sm:text-2xl font-semibold text-gray-900">
            {filteredWorkers_local.filter(w => w.worker?.removeStatus === 'active').length}
          </p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-500 mb-1 truncate">{t('workers.onLeave')}</p>
          <p className="text-xl sm:text-2xl font-semibold text-gray-900">
            {filteredWorkers_local.filter(w => w.worker?.removeStatus === 'on_leave').length}
          </p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-500 mb-1 truncate">{t('workers.removed')}</p>
          <p className="text-xl sm:text-2xl font-semibold text-gray-900">
            {filteredWorkers_local.filter(w => w.worker?.removeStatus === 'disabled').length}
          </p>
        </Card>
      </div>

      {/* Workers Table — hourly/monthly rate columns removed; layout sized to reduce horizontal scroll */}
      <div className="relative w-full min-w-0 overflow-hidden">
        <Card className="p-0 sm:p-0 min-w-0">
          <div className="overflow-x-auto -mx-4 sm:mx-0 overscroll-x-contain">
            <div className="w-full min-w-0 px-4 sm:px-0">
              <Table className="w-full min-w-0 table-fixed text-xs sm:text-sm md:table-auto">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm w-[18%] min-w-[7rem]">{t('workers.name')}</TableHead>
                    <TableHead className="text-xs sm:text-sm w-[14%] min-w-[5.5rem]">{t('workers.role')}</TableHead>
                    <TableHead className="text-xs sm:text-sm min-w-0 max-w-[10rem] sm:max-w-none">{t('workers.contact')}</TableHead>
                    <TableHead className="text-xs sm:text-sm w-[11%] min-w-[5.5rem]">{t('workers.status')}</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell w-[14%] min-w-[6rem]">{t('workers.employeeType')}</TableHead>
                    <TableHead className="text-xs sm:text-sm w-12 text-right sm:text-left">{t('workers.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && !isInitialized ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 sm:py-12">
                        <div className="flex items-center justify-center gap-2">
                          <Loader className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-gray-400" />
                          <span className="text-xs sm:text-sm text-gray-500">{t('workers.loadingWorkers')}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredWorkers_local.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 sm:py-8 text-xs sm:text-sm text-gray-500">
                        {t('workers.noWorkersFound')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredWorkers_local.map((worker) => (
                      <TableRow key={worker.id} className="text-xs sm:text-sm">
                        <TableCell className="text-gray-900 font-medium whitespace-nowrap">{worker.fullName}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className="text-xs">{getRoleLabel(worker.role)}</Badge>
                        </TableCell>
                        <TableCell className="text-xs min-w-0 max-w-[10rem] sm:max-w-none">
                          <div className="space-y-0.5 min-w-0">
                            {worker.phone && (
                              <div className="flex items-center gap-1 text-gray-600 min-w-0">
                                <Phone className="w-3 h-3 flex-shrink-0" />
                                <span className="hidden sm:inline truncate">{worker.phone}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-gray-600 min-w-0">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate min-w-0" title={worker.email}>{worker.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {canEdit ? (
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <Select
                                value={worker.worker?.removeStatus || 'active'}
                                onValueChange={(value) => handleUpdateWorkerFieldLocal(worker.id, 'removeStatus', value)}
                                disabled={isUpdatingField === `${worker.id}-removeStatus`}
                              >
                                <SelectTrigger className="w-auto min-w-[80px] h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">{t('workers.statusActive')}</SelectItem>
                                  <SelectItem value="on_leave">{t('workers.statusOnLeave')}</SelectItem>
                                  <SelectItem value="disabled">{t('workers.statusRemoved')}</SelectItem>
                                </SelectContent>
                              </Select>
                              {isUpdatingField === `${worker.id}-removeStatus` && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                                  <Loader className="w-3 h-3 animate-spin text-gray-400" />
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge variant={worker.worker?.removeStatus === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {worker.worker?.removeStatus === 'active' ? t('workers.statusActive') : worker.worker?.removeStatus === 'on_leave' ? t('workers.statusOnLeave') : t('workers.statusRemoved')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600 hidden sm:table-cell whitespace-nowrap text-xs max-w-[8rem] truncate">
                          {worker.worker?.employeeType ? (
                            worker.worker.employeeType === 'full-time' ? t('workers.employeeTypeFullTime') :
                              worker.worker.employeeType === 'part-time' ? t('workers.employeeTypePartTime') :
                                worker.worker.employeeType === 'contract' ? t('workers.employeeTypeContract') :
                                  worker.worker.employeeType
                          ) : '-'}
                        </TableCell>
                        <TableCell className="relative whitespace-nowrap w-12 text-right sm:text-left">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDropdownToggle(worker.id, e)}
                            className="h-7 w-7 hover:bg-gray-100 transition-colors duration-150"
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
            className={`fixed z-[9999] min-w-[160px] bg-white border border-gray-200 rounded-md shadow-lg py-1 transition-all duration-150 ease-out ${dropdownPosition.openUpward
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
                const worker = filteredWorkers.find((w: Worker) => w.id === openDropdownId);
                if (worker) handleDetailsClick(worker);
                closeDropdown();
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              {t('workers.viewDetails')}
            </button>
            {canEdit && (
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center transition-colors duration-150"
                onClick={(e) => {
                  e.stopPropagation();
                  const worker = filteredWorkers.find((w: Worker) => w.id === openDropdownId);
                  if (worker) handleEditClick(worker);
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
                  if (openDropdownId) handleDeleteWorker(openDropdownId);
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
          setSelectedWorker(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t('workers.editWorker')}</DialogTitle>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-4 mt-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">{t('workers.basicInfo')}</TabsTrigger>
                <TabsTrigger value="employment">{t('workers.employment')}</TabsTrigger>
                <TabsTrigger value="security">{t('workers.security')}</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>{t('workers.fullName')}</Label>
                    <Input
                      name="fullName"
                      placeholder={t('formPlaceholders.enterFullName')}
                      value={formData.fullName}
                      onChange={handleInputChangeWithValidation}
                      className={validationErrors.fullName ? 'border-red-500' : ''}
                    />
                    {validationErrors.fullName && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <Label>{t('workers.phone')}</Label>
                    <Input
                      name="phone"
                      placeholder={t('formPlaceholders.enterPhone')}
                      value={formData.phone}
                      onChange={handleInputChangeWithValidation}
                      className={validationErrors.phone ? 'border-red-500' : ''}
                    />
                    {validationErrors.phone && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <Label>{t('common.email')}</Label>
                    <Input
                      name="email"
                      type="email"
                      placeholder={t('formPlaceholders.enterEmailWork')}
                      value={formData.email}
                      onChange={handleInputChangeWithValidation}
                      className={validationErrors.email ? 'border-red-500' : ''}
                    />
                    {validationErrors.email && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <Label>{t('workers.dateOfBirth')}</Label>
                    <Input
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <Label>{t('workers.idNumber')}</Label>
                    <Input
                      name="idNumber"
                      placeholder={t('formPlaceholders.enterIdNumber')}
                      value={formData.idNumber}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>{t('workers.address')}</Label>
                    <Input
                      name="address"
                      placeholder={t('formPlaceholders.fullAddress')}
                      value={formData.address}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="employment" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('workers.role')}</Label>
                    <Select value={formData.role} onValueChange={(value) => handleSelectChange('role', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map(role => (
                          <SelectItem key={role.value} value={role.value}>
                            {getRoleLabel(role.value, role.label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('workers.employeeType')}</Label>
                    <Select value={formData.employeeType} onValueChange={(value) => handleSelectChange('employeeType', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">{t('workers.employeeTypeFullTime')}</SelectItem>
                        <SelectItem value="part-time">{t('workers.employeeTypePartTime')}</SelectItem>
                        <SelectItem value="contract">{t('workers.employeeTypeContract')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('workers.status')}</Label>
                    <Select value={formData.removeStatus} onValueChange={(value) => handleSelectChange('removeStatus', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t('workers.statusActive')}</SelectItem>
                        <SelectItem value="on_leave">{t('workers.statusOnLeave')}</SelectItem>
                        <SelectItem value="disabled">{t('workers.statusRemoved')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div></div>

                  <div>
                    <Label>{t('workers.hourlyRate')}</Label>
                    <Input
                      name="hourlyRate"
                      type="number"
                      step="0.50"
                      placeholder="0.00"
                      value={formData.hourlyRate}
                      onChange={handleInputChangeWithValidation}
                      className={validationErrors.hourlyRate ? 'border-red-500' : ''}
                    />
                    {validationErrors.hourlyRate && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.hourlyRate}</p>
                    )}
                  </div>

                  <div>
                    <Label>{t('workers.monthlyRate')}</Label>
                    <Input
                      name="monthlyRate"
                      type="number"
                      placeholder="0"
                      value={formData.monthlyRate}
                      onChange={handleInputChangeWithValidation}
                      className={validationErrors.monthlyRate ? 'border-red-500' : ''}
                    />
                    {validationErrors.monthlyRate && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.monthlyRate}</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="security" className="space-y-4 mt-4">
                <div>
                  <Label>{t('workers.passwordLeaveEmpty')}</Label>
                  <div className="relative">
                    <Input
                      name="password"
                      type={showPasswordEdit ? 'text' : 'password'}
                      placeholder={t('workers.enterNewPassword')}
                      value={formData.password}
                      onChange={handleInputChangeWithValidation}
                      className={validationErrors.password ? 'border-red-500 pr-10' : 'pr-10'}
                    />
                    {validationErrors.password && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.password}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPasswordEdit(!showPasswordEdit)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPasswordEdit ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
                setSelectedWorker(null);
              }} disabled={isLoading}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleUpdateWorker} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {t('workers.updating')}
                  </>
                ) : (
                  t('workers.updateWorker')
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('workers.deleteWorker')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              {t('workers.deleteConfirm', { name: workerToDelete?.fullName || '' })}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsDeleteConfirmOpen(false);
                setWorkerToDelete(null);
              }} disabled={isLoading}>
                {t('common.cancel')}
              </Button>
              <Button variant="destructive" onClick={confirmDeleteWorker} disabled={isLoading}>
                {isLoading ? t('workers.deleting') : t('common.delete')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Worker Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('workers.workerDetails')}</DialogTitle>
          </DialogHeader>
          {selectedWorker && (
            <div className="space-y-6 mt-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">{t('workers.basicInformation')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">{t('workers.fullName')}</Label>
                    <p className="text-gray-900 mt-1">{selectedWorker.fullName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">{t('common.email')}</Label>
                    <p className="text-gray-900 mt-1">{selectedWorker.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">{t('workers.phone')}</Label>
                    <p className="text-gray-900 mt-1">{selectedWorker.phone || t('workers.notProvided')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">{t('workers.dateOfBirth')}</Label>
                    <p className="text-gray-900 mt-1">
                      {selectedWorker.dateOfBirth
                        ? new Date(selectedWorker.dateOfBirth).toLocaleDateString()
                        : t('workers.notProvided')
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">{t('workers.idNumber')}</Label>
                    <p className="text-gray-900 mt-1">{selectedWorker.idNumber || t('workers.notProvided')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">{t('workers.role')}</Label>
                    <p className="text-gray-900 mt-1">{getRoleLabel(selectedWorker.role)}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">{t('workers.address')}</Label>
                  <p className="text-gray-900 mt-1">{selectedWorker.address || t('workers.notProvided')}</p>
                </div>
              </div>

              {/* Employment Information */}
              {selectedWorker.worker && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">{t('workers.employmentInformation')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">{t('workers.employeeType')}</Label>
                      <p className="text-gray-900 mt-1">
                        {selectedWorker.worker.employeeType === 'full-time' ? t('workers.employeeTypeFullTime') :
                          selectedWorker.worker.employeeType === 'part-time' ? t('workers.employeeTypePartTime') :
                            selectedWorker.worker.employeeType === 'contract' ? t('workers.employeeTypeContract') :
                              selectedWorker.worker.employeeType}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">{t('workers.status')}</Label>
                      <Badge className={selectedWorker.worker.removeStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {selectedWorker.worker.removeStatus === 'active' ? t('workers.statusActive') :
                          selectedWorker.worker.removeStatus === 'on_leave' ? t('workers.statusOnLeave') :
                            t('workers.statusRemoved')}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">{t('workers.hourlyRate')}</Label>
                      <p className="text-gray-900 mt-1">
                        {selectedWorker.worker.hourlyRate ? `€${selectedWorker.worker.hourlyRate}` : t('workers.notSet')}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">{t('workers.monthlyRate')}</Label>
                      <p className="text-gray-900 mt-1">
                        {selectedWorker.worker.monthlyRate ? `€${selectedWorker.worker.monthlyRate}` : t('workers.notSet')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">{t('workers.securityInformation')}</h3>
                <div>
                  <Label className="text-sm font-medium text-gray-500">{t('common.password')}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="relative flex-1">
                      <Input
                        type={showPasswordInDetails ? 'text' : 'password'}
                        value={showPasswordInDetails
                          ? (selectedWorkerPassword || 'password123')
                          : '••••••••'
                        }
                        readOnly
                        className="bg-gray-50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordInDetails(!showPasswordInDetails)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswordInDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">{t('workers.accountInformation')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">{t('workers.createdAt')}</Label>
                    <p className="text-gray-900 mt-1">
                      {selectedWorker.createdAt ? new Date(selectedWorker.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">{t('workers.lastUpdated')}</Label>
                    <p className="text-gray-900 mt-1">
                      {selectedWorker.updatedAt ? new Date(selectedWorker.updatedAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                  {t('common.close')}
                </Button>
                {canEdit && (
                  <Button onClick={() => {
                    setIsDetailsDialogOpen(false);
                    handleEditClick(selectedWorker);
                  }}>
                    <Edit className="w-4 h-4 mr-2" />
                    {t('workers.editWorker')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Report Dialog */}
      <WorkerExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        workers={filteredWorkers as any}
      />
    </div>
  );
}
