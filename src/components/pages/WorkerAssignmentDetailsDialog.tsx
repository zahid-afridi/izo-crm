import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader, User, Calendar, Clock, MapPin, History } from 'lucide-react';
import { toast } from 'sonner';

interface Worker {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    role: string;
}

interface Site {
    id: string;
    name: string;
    address: string;
}

interface Assignment {
    id: string;
    siteId: string;
    workerId: string;
    assignedDate: string;
    status: string;
    notes?: string;
    showAssignmentHistory?: boolean;
    site: Site;
    worker: Worker;
}

interface AttendanceRecord {
    id: string;
    checkInTime: string;
    checkOutTime: string | null;
    notes?: string;
    date: string;
    checkInLat?: number;
    checkInLng?: number;
    checkOutLat?: number;
    checkOutLng?: number;
}

interface SiteHistoryDay {
    date: string;
    dateLabel: string;
    workerCount: number;
}

interface WorkerAssignmentDetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    assignment: Assignment | null;
    onHistoryToggled?: (assignmentId: string, showAssignmentHistory: boolean) => void;
}

export function WorkerAssignmentDetailsDialog({
    isOpen,
    onClose,
    assignment,
    onHistoryToggled,
}: WorkerAssignmentDetailsDialogProps) {
    const { t } = useTranslation();
    const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showAssignmentHistory, setShowAssignmentHistory] = useState(false);
    const [isUpdatingHistoryPreference, setIsUpdatingHistoryPreference] = useState(false);
    const [siteHistory, setSiteHistory] = useState<SiteHistoryDay[]>([]);
    const [isLoadingSiteHistory, setIsLoadingSiteHistory] = useState(false);

    const fetchAttendanceHistory = useCallback(async () => {
        if (!assignment) return;
        try {
            setIsLoading(true);
            const response = await fetch(
                `/api/attendance?assignmentId=${assignment.id}&workerId=${assignment.workerId}`
            );
            if (!response.ok) throw new Error('Failed to fetch attendance history');
            const data = await response.json();
            setAttendanceHistory(data.attendance || []);
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setIsLoading(false);
        }
    }, [assignment]);

    const fetchSiteHistory = useCallback(async () => {
        if (!assignment?.siteId) return;
        try {
            setIsLoadingSiteHistory(true);
            const response = await fetch(
                `/api/assignments/site-history?siteId=${encodeURIComponent(assignment.siteId)}`
            );
            if (!response.ok) throw new Error('Failed to fetch site history');
            const data = await response.json();
            setSiteHistory(data.history || []);
        } catch (error) {
            console.error('Error fetching site history:', error);
            toast.error(t('assignments.detailsSevenDayHistory') || 'Failed to load 7-day history');
        } finally {
            setIsLoadingSiteHistory(false);
        }
    }, [assignment?.siteId, t]);

    useEffect(() => {
        if (isOpen && assignment) {
            fetchAttendanceHistory();
            setShowAssignmentHistory(assignment.showAssignmentHistory ?? false);
        }
    }, [isOpen, assignment, fetchAttendanceHistory]);

    useEffect(() => {
        if (isOpen && assignment && showAssignmentHistory) {
            fetchSiteHistory();
        } else {
            setSiteHistory([]);
        }
    }, [isOpen, assignment, showAssignmentHistory, fetchSiteHistory]);

    const handleHistoryToggle = async (checked: boolean) => {
        if (!assignment) return;
        setIsUpdatingHistoryPreference(true);
        try {
            const response = await fetch(`/api/assignments/${assignment.id}/history-preference`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ showAssignmentHistory: checked }),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to update');
            }
            setShowAssignmentHistory(checked);
            onHistoryToggled?.(assignment.id, checked);
            toast.success(checked ? 'This worker can see 7-day history and site workers for this site only.' : 'History visibility updated for this assignment.');
        } catch (error) {
            console.error('Error updating history preference:', error);
            toast.error('Failed to update history setting');
        } finally {
            setIsUpdatingHistoryPreference(false);
        }
    };

    if (!assignment) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                        <User className="w-5 h-5 text-brand-600" />
                        {t('assignments.detailsTitle')}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Worker & Assignment Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-gray-500">{t('assignments.detailsWorkerInfo')}</h3>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                    {assignment.worker.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">{assignment.worker.fullName}</p>
                                    <p className="text-xs text-gray-500">{assignment.worker.email}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-gray-500">{t('assignments.detailsAssignmentInfo')}</h3>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <span>{assignment.site.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span>{new Date(assignment.assignedDate).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${assignment.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {assignment.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Check history – show 7-day history to worker */}
                    <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-0.5">
                                <Label htmlFor="check-history" className="text-sm font-medium text-gray-900 cursor-pointer">
                                    {t('assignments.detailsCheckHistory')}
                                </Label>
                                <p className="text-xs text-gray-500">
                                    {t('assignments.detailsCheckHistoryHelp')}
                                </p>
                            </div>
                            <Switch
                                id="check-history"
                                checked={showAssignmentHistory}
                                onCheckedChange={handleHistoryToggle}
                                disabled={isUpdatingHistoryPreference}
                            />
                        </div>
                        {isUpdatingHistoryPreference && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Loader className="w-3 h-3 animate-spin" />
                                Updating…
                            </div>
                        )}
                    </div>

                    {/* Previous 7 days – workers on site (when history is on) */}
                    {showAssignmentHistory && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <History className="w-5 h-5 text-brand-600" />
                                {t('assignments.detailsSevenDayHistory')}
                            </h3>
                            {isLoadingSiteHistory ? (
                                <div className="flex justify-center py-6">
                                    <Loader className="w-8 h-8 animate-spin text-brand-600" />
                                </div>
                            ) : siteHistory.length > 0 ? (
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-50">
                                                <TableHead>Date</TableHead>
                                                <TableHead className="text-right">Workers on site</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {siteHistory.map((day) => (
                                                <TableRow key={day.date}>
                                                    <TableCell className="font-medium">{day.dateLabel}</TableCell>
                                                    <TableCell className="text-right">
                                                        {t('assignments.detailsWorkersCount', { count: day.workerCount })}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed text-gray-500 text-sm">
                                    No history for the last 7 days.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Attendance History */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-brand-600" />
                            {t('assignments.detailsAttendanceHistory')}
                        </h3>

                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader className="w-8 h-8 animate-spin text-brand-600" />
                            </div>
                        ) : attendanceHistory.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50">
                                            <TableHead>{t('assignments.detailsCheckIn')}</TableHead>
                                            <TableHead>{t('assignments.detailsCheckOut')}</TableHead>
                                            <TableHead>{t('assignments.detailsDuration')}</TableHead>
                                            <TableHead>{t('assignments.exportNotes')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {attendanceHistory.map((record) => {
                                            const checkIn = new Date(record.checkInTime);
                                            const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : null;

                                            let duration = '-';
                                            if (checkOut) {
                                                const diffInMinutes = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60));
                                                const hours = Math.floor(diffInMinutes / 60);
                                                const minutes = diffInMinutes % 60;
                                                duration = `${hours}h ${minutes}m`;
                                            }

                                            return (
                                                <TableRow key={record.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {checkIn.toLocaleTimeString()}
                                                            {record.checkInLat != null && record.checkInLng != null && (
                                                                <a
                                                                    href={`https://www.google.com/maps?q=${record.checkInLat},${record.checkInLng}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    title={t('assignments.detailsViewCheckInLocation')}
                                                                    className="hover:bg-gray-100 p-1 rounded-full text-blue-600"
                                                                >
                                                                    <MapPin className="w-3 h-3" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {checkOut ? (
                                                            <div className="flex items-center gap-2">
                                                                {checkOut.toLocaleTimeString()}
                                                                {record.checkOutLat != null && record.checkOutLng != null && (
                                                                    <a
                                                                        href={`https://www.google.com/maps?q=${record.checkOutLat},${record.checkOutLng}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        title={t('assignments.detailsViewCheckOutLocation')}
                                                                        className="hover:bg-gray-100 p-1 rounded-full text-blue-600"
                                                                    >
                                                                        <MapPin className="w-3 h-3" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ) : <span className="text-orange-500 italic">{t('assignments.detailsActive')}</span>}
                                                    </TableCell>
                                                    <TableCell>{duration}</TableCell>
                                                    <TableCell className="max-w-[200px] truncate" title={record.notes || ''}>
                                                        {record.notes || '-'}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed text-gray-500">
                                {t('assignments.detailsNoAttendance')}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
