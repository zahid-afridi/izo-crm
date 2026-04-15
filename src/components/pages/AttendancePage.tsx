'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarClock, Clock3, Plus, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';

type AttendanceStatus = 'complete' | 'check_in_only' | 'check_out_only' | 'incomplete';
type ManualAction = 'check_in' | 'check_out' | 'check_in_out';

type AttendanceRecord = {
  id: string;
  userId: string;
  employeeName: string;
  attendanceDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: AttendanceStatus;
  notes?: string | null;
  totalWorkedMinutes?: number | null;
};

type AttendancePageProps = {
  userRole: string;
  currentUserId?: string;
};

type EmployeeOption = {
  id: string;
  fullName: string;
};

function getNowDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getNowTime(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function calculateWorkedHours(
  checkInTime: string | null,
  checkOutTime: string | null,
  totalWorkedMinutes?: number | null
): string {
  if (typeof totalWorkedMinutes === 'number' && totalWorkedMinutes >= 0) {
    const hours = Math.floor(totalWorkedMinutes / 60);
    const minutes = totalWorkedMinutes % 60;
    return `${hours}h ${minutes}m`;
  }
  if (!checkInTime || !checkOutTime) return '-';
  const [inH, inM] = checkInTime.split(':').map(Number);
  const [outH, outM] = checkOutTime.split(':').map(Number);
  if ([inH, inM, outH, outM].some(Number.isNaN)) return '-';
  const start = inH * 60 + inM;
  const end = outH * 60 + outM;
  if (end <= start) return '-';
  const diff = end - start;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return `${hours}h ${minutes}m`;
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  if (status === 'complete') {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Complete</Badge>;
  }
  if (status === 'check_in_only') {
    return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Check-in only</Badge>;
  }
  if (status === 'check_out_only') {
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Check-out only</Badge>;
  }
  return <Badge variant="outline">Incomplete</Badge>;
}

export function AttendancePage({ userRole, currentUserId }: AttendancePageProps) {
  const normalizedRole = userRole.toLowerCase();
  const canManageManually = normalizedRole === 'admin' || normalizedRole === 'hr';

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingRecords, setLoadingRecords] = useState<boolean>(false);
  const [savingManual, setSavingManual] = useState<boolean>(false);
  const [loadingSelfAction, setLoadingSelfAction] = useState<boolean>(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [attendanceDate, setAttendanceDate] = useState<string>(getNowDate());
  const [manualAction, setManualAction] = useState<ManualAction>('check_in');
  const [manualCheckInTime, setManualCheckInTime] = useState<string>(getNowTime());
  const [manualCheckOutTime, setManualCheckOutTime] = useState<string>(getNowTime());
  const [notes, setNotes] = useState<string>('');

  const loadRecords = async () => {
    try {
      setLoadingRecords(true);
      const response = await fetch('/api/employee-attendance', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load attendance records');
      }
      setRecords(Array.isArray(data?.records) ? data.records : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load attendance records';
      toast.error(message);
    } finally {
      setLoadingRecords(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const roleFilter =
        'admin,product_manager,site_manager,offer_manager,order_manager,website_manager,sales_agent,office_employee,worker,hr';
      const response = await fetch(`/api/users?roles=${encodeURIComponent(roleFilter)}&status=active`, {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load employees');
      }
      const mapped: EmployeeOption[] = Array.isArray(data?.users)
        ? data.users.map((user: { id: string; fullName: string }) => ({
            id: user.id,
            fullName: user.fullName,
          }))
        : [];
      setEmployees(mapped);
      if (!selectedEmployeeId && mapped.length > 0) {
        setSelectedEmployeeId(mapped[0].id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load employees';
      toast.error(message);
    }
  };

  useEffect(() => {
    void loadRecords();
  }, [canManageManually, currentUserId]);

  useEffect(() => {
    if (!canManageManually) return;
    void loadEmployees();
  }, [canManageManually]);

  const employeeRecords = useMemo(() => {
    if (canManageManually) return records;
    if (!currentUserId) return records;
    return records.filter((record) => record.userId === currentUserId);
  }, [canManageManually, currentUserId, records]);

  const todaySelfRecord = useMemo(() => {
    if (!currentUserId) return null;
    const today = getNowDate();
    const todayRecords = employeeRecords.filter(
      (record) => record.userId === currentUserId && record.attendanceDate === today
    );
    if (todayRecords.length === 0) return null;
    const openRecord = todayRecords.find((record) => !!record.checkInTime && !record.checkOutTime);
    return openRecord ?? todayRecords[0];
  }, [currentUserId, employeeRecords]);

  const openSelfRecord = useMemo(() => {
    if (!currentUserId) return null;
    return employeeRecords.find((record) => record.userId === currentUserId && !!record.checkInTime && !record.checkOutTime) ?? null;
  }, [currentUserId, employeeRecords]);

  const addManualEntry = async () => {
    if (!selectedEmployeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!attendanceDate) {
      toast.error('Date is required');
      return;
    }
    if (
      (manualAction === 'check_in' && !manualCheckInTime) ||
      (manualAction === 'check_out' && !manualCheckOutTime) ||
      (manualAction === 'check_in_out' && (!manualCheckInTime || !manualCheckOutTime))
    ) {
      toast.error('Required time fields are missing');
      return;
    }
    try {
      setSavingManual(true);
      const payload =
        manualAction === 'check_in'
          ? {
              userId: selectedEmployeeId,
              attendanceDate,
              action: manualAction,
              time: manualCheckInTime,
              notes,
            }
          : manualAction === 'check_out'
            ? {
                userId: selectedEmployeeId,
                attendanceDate,
                action: manualAction,
                time: manualCheckOutTime,
                notes,
              }
            : {
                userId: selectedEmployeeId,
                attendanceDate,
                action: manualAction,
                checkInTime: manualCheckInTime,
                checkOutTime: manualCheckOutTime,
                notes,
              };

      const response = await fetch('/api/employee-attendance/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save attendance entry');
      }
      toast.success(
        manualAction === 'check_in'
          ? 'Check-in entry saved'
          : manualAction === 'check_out'
            ? 'Check-out entry saved'
            : 'Check-in + check-out entry saved'
      );
      setNotes('');
      await loadRecords();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save attendance entry';
      toast.error(message);
    } finally {
      setSavingManual(false);
    }
  };

  const selfCheckIn = async () => {
    if (!currentUserId) return;
    try {
      setLoadingSelfAction(true);
      const response = await fetch('/api/employee-attendance/self/check-in', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to check in');
      }
      toast.success('Checked in successfully');
      await loadRecords();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check in';
      toast.error(message);
    } finally {
      setLoadingSelfAction(false);
    }
  };

  const selfCheckOut = async () => {
    if (!currentUserId) return;
    try {
      setLoadingSelfAction(true);
      const response = await fetch('/api/employee-attendance/self/check-out', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to check out');
      }
      toast.success('Checked out successfully');
      await loadRecords();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check out';
      toast.error(message);
    } finally {
      setLoadingSelfAction(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <Card className="p-6 bg-brand-gradient text-white border-0 shadow-lg">
        <div className="flex items-center gap-3">
          <CalendarClock className="w-6 h-6" />
          <div>
            <h1 className="text-xl">Attendance Management</h1>
            <p className="text-white/90 text-sm">
              {canManageManually
                ? 'Manual attendance entry and overview for all employees.'
                : 'Check-in/check-out and review your attendance history.'}
            </p>
          </div>
        </div>
      </Card>

      {canManageManually ? (
        <Tabs defaultValue="manual-entry" className="space-y-4">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="manual-entry">Manual Entry</TabsTrigger>
            <TabsTrigger value="history">Attendance History</TabsTrigger>
          </TabsList>

          <TabsContent value="manual-entry">
            <Card className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Employee</Label>
                  <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
                </div>
                <div>
                  <Label>Entry Type</Label>
                  <Select value={manualAction} onValueChange={(value) => setManualAction(value as ManualAction)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="check_in">Check In</SelectItem>
                      <SelectItem value="check_out">Check Out</SelectItem>
                      <SelectItem value="check_in_out">Check In + Check Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>
                    {manualAction === 'check_out'
                      ? 'Check-out Time'
                      : manualAction === 'check_in_out'
                        ? 'Check-in Time'
                        : 'Check-in Time'}
                  </Label>
                  <Input
                    type="time"
                    value={manualAction === 'check_out' ? manualCheckOutTime : manualCheckInTime}
                    onChange={(e) => {
                      if (manualAction === 'check_out') {
                        setManualCheckOutTime(e.target.value);
                      } else {
                        setManualCheckInTime(e.target.value);
                      }
                    }}
                  />
                </div>
                {manualAction === 'check_in_out' && (
                  <div>
                    <Label>Check-out Time</Label>
                    <Input
                      type="time"
                      value={manualCheckOutTime}
                      onChange={(e) => setManualCheckOutTime(e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <Label>Notes</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional note" />
                </div>
              </div>

              <p className="text-xs text-gray-500">
                You can save check-in only, check-out only (only if check-in exists), or check-in + check-out together.
              </p>

              <div className="flex justify-end">
                <Button
                  className="bg-brand-gradient text-white hover:opacity-95"
                  onClick={addManualEntry}
                  disabled={savingManual}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {savingManual ? 'Saving...' : 'Add Attendance Entry'}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Worked</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRecords ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Loading attendance...
                      </TableCell>
                    </TableRow>
                  ) : records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No attendance history yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.employeeName}</TableCell>
                        <TableCell>{r.attendanceDate}</TableCell>
                        <TableCell>{r.checkInTime ?? '-'}</TableCell>
                        <TableCell>{r.checkOutTime ?? '-'}</TableCell>
                        <TableCell>{calculateWorkedHours(r.checkInTime, r.checkOutTime, r.totalWorkedMinutes)}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-gray-600">{r.notes || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-lg">Today Attendance</h2>
                <p className="text-sm text-gray-500">
                  Date: {getNowDate()} • Worked:{' '}
                  {todaySelfRecord
                    ? calculateWorkedHours(
                        todaySelfRecord.checkInTime,
                        todaySelfRecord.checkOutTime,
                        todaySelfRecord.totalWorkedMinutes
                      )
                    : '-'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={selfCheckIn}
                  disabled={loadingSelfAction || !!todaySelfRecord?.checkInTime}
                  className="border-green-200 text-green-700 hover:bg-green-50"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Check In
                </Button>
                <Button
                  className="bg-brand-gradient text-white hover:opacity-95"
                  onClick={selfCheckOut}
                  disabled={loadingSelfAction || !openSelfRecord}
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Check Out
                </Button>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Clock3 className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Current status:</span>
              {todaySelfRecord ? (
                <StatusBadge status={todaySelfRecord.status} />
              ) : (
                <Badge variant="outline">Not checked in</Badge>
              )}
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Worked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRecords ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Loading attendance...
                    </TableCell>
                  </TableRow>
                ) : employeeRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No attendance history yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  employeeRecords.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.attendanceDate}</TableCell>
                      <TableCell>{r.checkInTime ?? '-'}</TableCell>
                      <TableCell>{r.checkOutTime ?? '-'}</TableCell>
                      <TableCell>{calculateWorkedHours(r.checkInTime, r.checkOutTime, r.totalWorkedMinutes)}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-gray-600">{r.notes || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
