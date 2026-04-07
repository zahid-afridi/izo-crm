'use client'

import { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Clock, CheckCircle, Users, Calendar, MapPin, Car, Phone,
  MessageCircle, Navigation, LogIn, LogOut, Loader2, History,
  ChevronDown, ChevronUp, UserCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { format } from 'date-fns';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchWorkerProfile,
  fetchAttendanceHistory,
  checkIn,
  checkOut,
} from '@/store/slices/workerProfileSlice';
import {
  selectWorkerProfile,
  selectWorkerProfileStats,
  selectWorkerProfileTeams,
  selectTodayAssignments,
  selectAttendanceMap,
  selectAttendanceHistoryMap,
  selectWorkerProfileIsLoading,
  selectWorkerProfileIsInitialized,
  selectCheckingIn,
  selectCheckingOut,
  selectFirstAttendance,
} from '@/store/selectors/workerProfileSelectors';

export function WorkerProfilePage() {
  const dispatch = useAppDispatch();

  // Redux state
  const profile = useAppSelector(selectWorkerProfile);
  const stats = useAppSelector(selectWorkerProfileStats);
  const teams = useAppSelector(selectWorkerProfileTeams);
  const todayAssignments = useAppSelector(selectTodayAssignments);
  const attendanceMap = useAppSelector(selectAttendanceMap);
  const attendanceHistoryMap = useAppSelector(selectAttendanceHistoryMap);
  const loading = useAppSelector(selectWorkerProfileIsLoading);
  const isInitialized = useAppSelector(selectWorkerProfileIsInitialized);
  const checkingIn = useAppSelector(selectCheckingIn);
  const checkingOut = useAppSelector(selectCheckingOut);
  const firstAttendance = useAppSelector(selectFirstAttendance);

  // Local UI state only
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assignments' | 'teams'>('assignments');
  const [siteWorkersDialog, setSiteWorkersDialog] = useState<{
    open: boolean; siteId: string; siteName: string; date: string;
  } | null>(null);
  const [siteWorkersList, setSiteWorkersList] = useState<Array<{ id: string; fullName: string; email: string; phone: string | null }>>([]);
  const [siteWorkersLoading, setSiteWorkersLoading] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      dispatch(fetchWorkerProfile());
    }
  }, [dispatch, isInitialized]);

  const getCurrentPosition = (): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) reject(new Error('Geolocation not supported'));
      else navigator.geolocation.getCurrentPosition(resolve, reject);
    });

  const handleCheckIn = async (assignmentId: string) => {
    let latitude: number | undefined;
    let longitude: number | undefined;
    try {
      const pos = await getCurrentPosition();
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
    } catch { /* continue without location */ }

    const result = await dispatch(checkIn({ assignmentId, latitude, longitude }));
    if (checkIn.rejected.match(result)) {
      alert((result.payload as string) || 'Failed to check in');
    }
  };

  const handleCheckOut = async (assignmentId: string) => {
    const attendance = attendanceMap[assignmentId];
    if (!attendance) { alert('Not checked in'); return; }

    let latitude: number | undefined;
    let longitude: number | undefined;
    try {
      const pos = await getCurrentPosition();
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
    } catch { /* continue without location */ }

    const result = await dispatch(checkOut({ assignmentId, attendanceId: attendance.id, latitude, longitude }));
    if (checkOut.rejected.match(result)) {
      alert((result.payload as string) || 'Failed to check out');
    }
  };

  const toggleHistory = (assignmentId: string) => {
    if (showHistory === assignmentId) {
      setShowHistory(null);
    } else {
      setShowHistory(assignmentId);
      if (!attendanceHistoryMap[assignmentId]) {
        dispatch(fetchAttendanceHistory(assignmentId));
      }
    }
  };

  const openSiteWorkersDialog = (siteId: string, siteName: string) => {
    setSiteWorkersDialog({ open: true, siteId, siteName, date: 'all' });
  };

  const setSiteWorkersDialogDate = (dateStr: string) => {
    setSiteWorkersDialog(prev => prev ? { ...prev, date: dateStr } : null);
  };

  const closeSiteWorkersDialog = () => {
    setSiteWorkersDialog(null);
    setSiteWorkersList([]);
  };

  useEffect(() => {
    if (!siteWorkersDialog?.open || !siteWorkersDialog.siteId) return;
    const fetchSiteWorkers = async () => {
      setSiteWorkersLoading(true);
      try {
        const isAll = siteWorkersDialog.date === 'all';
        const url = isAll
          ? `/api/assignments/site-workers?siteId=${encodeURIComponent(siteWorkersDialog.siteId)}`
          : `/api/assignments/site-workers?siteId=${encodeURIComponent(siteWorkersDialog.siteId)}&date=${siteWorkersDialog.date}`;
        const res = await fetch(url);
        setSiteWorkersList(res.ok ? (await res.json()).workers ?? [] : []);
      } catch { setSiteWorkersList([]); }
      finally { setSiteWorkersLoading(false); }
    };
    fetchSiteWorkers();
  }, [siteWorkersDialog?.open, siteWorkersDialog?.siteId, siteWorkersDialog?.date]);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getAvatarColor = (index: number) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
    return colors[index % colors.length];
  };

  if (loading && !isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Worker profile not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-brand-gradient text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm">Welcome back</p>
            <h1 className="text-2xl font-bold">{profile.fullName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm text-white/90">{format(new Date(), 'EEEE, MMM dd')}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <MessageCircle className="w-6 h-6" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <p className="text-white/80 text-xs mb-1">Start</p>
            <p className="text-white font-bold text-lg">
              {firstAttendance?.checkInTime ? format(new Date(firstAttendance.checkInTime), 'HH:mm') : '--:--'}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <p className="text-white/80 text-xs mb-1">This Month</p>
            <p className="text-white font-bold text-lg">{stats.thisMonthDays} days</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-white" />
            </div>
            <p className="text-white/80 text-xs mb-1">Teams</p>
            <p className="text-white font-bold text-lg">{stats.teamsCount}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'assignments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>Assignments</span>
              <Badge variant="secondary" className="ml-1">{todayAssignments.length}</Badge>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'teams' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              <span>My Teams</span>
              <Badge variant="secondary" className="ml-1">{teams.length}</Badge>
            </div>
          </button>
        </div>

        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <>
            <div className="mb-4 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                All Active Assignments ({todayAssignments.length})
              </h2>
              <p className="text-sm text-slate-600">Check in and out for each assignment below</p>
            </div>

            {todayAssignments.length > 0 ? (
              todayAssignments.map((assignment, index) => {
                const attendance = attendanceMap[assignment.id];
                const isCheckedIn = !!(attendance && !attendance.checkOutTime);
                const isCheckedOut = !!(attendance && attendance.checkOutTime);
                const isCheckingInThis = checkingIn === assignment.id;
                const isCheckingOutThis = checkingOut === assignment.id;

                return (
                  <Card key={assignment.id} className="p-6 shadow-sm border-0 bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-slate-900">Assignment #{index + 1}</h2>
                      <Badge className={isCheckedIn ? 'bg-green-100 text-green-700' : isCheckedOut ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}>
                        {isCheckedIn ? 'Checked In' : isCheckedOut ? 'Checked Out' : 'Not Checked In'}
                      </Badge>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-brand-gradient rounded-xl flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 mb-1">{assignment.site.name}</h3>
                          <p className="text-sm text-slate-600">{assignment.site.address}</p>
                          {assignment.site.city && <p className="text-sm text-slate-500">{assignment.site.city}</p>}
                          {assignment.notes && <p className="text-xs text-slate-500 mt-2 italic">{assignment.notes}</p>}
                        </div>
                      </div>

                      {assignment.car && (
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-200">
                          <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center">
                            <Car className="w-4 h-4 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{assignment.car.name}</p>
                            <p className="text-xs text-slate-600">{assignment.car.number} • {assignment.car.color}</p>
                          </div>
                        </div>
                      )}

                      {attendance && (
                        <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Check-in:</span>
                            <span className="font-medium text-slate-900">{format(new Date(attendance.checkInTime), 'HH:mm')}</span>
                          </div>
                          {attendance.checkOutTime && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-600">Check-out:</span>
                              <span className="font-medium text-slate-900">{format(new Date(attendance.checkOutTime), 'HH:mm')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <Button
                        onClick={() => handleCheckIn(assignment.id)}
                        disabled={isCheckedIn || !!isCheckingInThis}
                        className="h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                      >
                        {isCheckingInThis ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
                        Check In
                      </Button>
                      <Button
                        onClick={() => handleCheckOut(assignment.id)}
                        disabled={!isCheckedIn || !!isCheckingOutThis}
                        className="h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                      >
                        {isCheckingOutThis ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                        Check Out
                      </Button>
                    </div>

                    <Button className="w-full bg-brand-gradient hover:opacity-90 text-white rounded-xl h-12 mb-3">
                      <Navigation className="w-5 h-5 mr-2" />
                      Navigate to Site
                    </Button>

                    <Button
                      onClick={() => toggleHistory(assignment.id)}
                      variant="outline"
                      className="w-full rounded-xl h-10 border-slate-200"
                    >
                      <History className="w-4 h-4 mr-2" />
                      {showHistory === assignment.id ? 'Hide History' : 'View History'}
                      {showHistory === assignment.id ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                    </Button>

                    {assignment.showAssignmentHistory && (
                      <Button
                        onClick={() => openSiteWorkersDialog(assignment.site.id, assignment.site.name)}
                        variant="outline"
                        className="w-full rounded-xl h-10 border-slate-200 text-brand-600 hover:bg-brand-50 mt-2"
                      >
                        <UserCircle className="w-4 h-4 mr-2" />
                        View all workers on this site
                      </Button>
                    )}

                    {showHistory === assignment.id && attendanceHistoryMap[assignment.id] && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-slate-900">Today's History</h4>
                          <Badge variant="outline" className="text-xs">
                            {attendanceHistoryMap[assignment.id].summary.totalTimeFormatted}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {attendanceHistoryMap[assignment.id].history.map((record, i) => {
                            const duration = record.checkOutTime
                              ? Math.floor((new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime()) / (1000 * 60))
                              : null;
                            return (
                              <div key={record.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold text-xs">
                                      #{attendanceHistoryMap[assignment.id].history.length - i}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-slate-600">In:</span>
                                      <span className="font-medium text-slate-900">{format(new Date(record.checkInTime), 'HH:mm')}</span>
                                      {record.checkInLat && (
                                        <a href={`https://www.google.com/maps?q=${record.checkInLat},${record.checkInLng}`} target="_blank" rel="noopener noreferrer" title="View Check-in Location" className="hover:bg-slate-100 p-0.5 rounded">
                                          <MapPin className="w-3 h-3 text-blue-500" />
                                        </a>
                                      )}
                                      {record.checkOutTime && (
                                        <>
                                          <span className="text-slate-400">→</span>
                                          <span className="text-slate-600">Out:</span>
                                          <span className="font-medium text-slate-900">{format(new Date(record.checkOutTime), 'HH:mm')}</span>
                                          {record.checkOutLat && (
                                            <a href={`https://www.google.com/maps?q=${record.checkOutLat},${record.checkOutLng}`} target="_blank" rel="noopener noreferrer" title="View Check-out Location" className="hover:bg-slate-100 p-0.5 rounded">
                                              <MapPin className="w-3 h-3 text-blue-500" />
                                            </a>
                                          )}
                                        </>
                                      )}
                                    </div>
                                    {record.notes && <p className="text-xs text-slate-500 mt-1">{record.notes}</p>}
                                  </div>
                                </div>
                                {duration !== null ? (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                    {Math.floor(duration / 60)}h {duration % 60}m
                                  </Badge>
                                ) : (
                                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Active</Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {attendanceHistoryMap[assignment.id].history.length === 0 && (
                          <p className="text-center text-slate-500 text-sm py-4">No check-in history for today</p>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })
            ) : (
              <Card className="p-6 shadow-sm border-0 bg-white">
                <p className="text-center text-slate-600">No assignments for today</p>
              </Card>
            )}
          </>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <>
            <div className="mb-4 p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
              <h2 className="text-xl font-bold text-slate-900 mb-2">My Teams ({teams.length})</h2>
              <p className="text-sm text-slate-600">View your team members and team lead</p>
            </div>

            {teams.length > 0 ? (
              teams.map((team) => (
                <Card key={team.id} className="p-6 shadow-sm border-0 bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">{team.name}</h3>
                    <Badge variant="outline" className="text-sm">{team.members.length + 1} Members</Badge>
                  </div>

                  {team.description && (
                    <p className="text-sm text-slate-600 mb-4 p-3 bg-slate-50 rounded-lg">{team.description}</p>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 ${getAvatarColor(0)} rounded-full flex items-center justify-center`}>
                          <span className="text-white font-semibold">{getInitials(team.teamLead.fullName)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{team.teamLead.fullName}</p>
                          <p className="text-xs text-slate-600">Team Lead</p>
                          {team.teamLead.phone && <p className="text-xs text-slate-500 mt-1">{team.teamLead.phone}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Lead</Badge>
                        {team.teamLead.phone && (
                          <Button variant="ghost" size="icon" className="h-9 w-9"><Phone className="w-4 h-4" /></Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide px-2">Team Members</p>
                      {team.members.map((member, index) => (
                        <div key={member.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${getAvatarColor(index + 1)} rounded-full flex items-center justify-center`}>
                              <span className="text-white font-semibold text-sm">{getInitials(member.fullName)}</span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{member.fullName}</p>
                              <p className="text-xs text-slate-600 capitalize">{member.role}</p>
                              {member.phone && <p className="text-xs text-slate-500 mt-1">{member.phone}</p>}
                            </div>
                          </div>
                          {member.phone && (
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Phone className="w-4 h-4" /></Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-6 shadow-sm border-0 bg-white">
                <p className="text-center text-slate-600">You are not assigned to any team</p>
              </Card>
            )}
          </>
        )}

        {/* Site Workers Dialog */}
        <Dialog open={!!siteWorkersDialog?.open} onOpenChange={(open) => !open && closeSiteWorkersDialog()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-brand-600" />
                {siteWorkersDialog ? `Workers at ${siteWorkersDialog.siteName}` : 'Workers on site'}
              </DialogTitle>
            </DialogHeader>
            {siteWorkersDialog && (
              <>
                <p className="text-sm font-medium text-slate-700">Filter by day</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button size="sm" variant={siteWorkersDialog.date === 'all' ? 'default' : 'outline'} className={siteWorkersDialog.date === 'all' ? 'bg-brand-600 hover:bg-brand-700' : ''} onClick={() => setSiteWorkersDialogDate('all')}>All</Button>
                  {(['Today', 'Yesterday', '2 days ago', '3 days ago'] as const).map((label, i) => {
                    const d = new Date(); d.setDate(d.getDate() - i);
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const isActive = siteWorkersDialog.date === dateStr;
                    return (
                      <Button key={label} size="sm" variant={isActive ? 'default' : 'outline'} className={isActive ? 'bg-brand-600 hover:bg-brand-700' : ''} onClick={() => setSiteWorkersDialogDate(dateStr)}>{label}</Button>
                    );
                  })}
                  <input type="date" className="h-9 rounded-md border border-slate-200 px-2 text-sm"
                    value={siteWorkersDialog.date === 'all' ? format(new Date(), 'yyyy-MM-dd') : siteWorkersDialog.date}
                    onChange={(e) => setSiteWorkersDialogDate(e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {siteWorkersDialog.date === 'all' ? 'All workers assigned to this site' : format(new Date(siteWorkersDialog.date), 'EEEE, MMM d, yyyy')}
                </p>
              </>
            )}
            {siteWorkersLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>
            ) : siteWorkersList.length > 0 ? (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {siteWorkersList.map((w) => (
                  <li key={w.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm">
                      {w.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{w.fullName}</p>
                      <p className="text-xs text-slate-500 truncate">{w.email}</p>
                      {w.phone && <p className="text-xs text-slate-500">{w.phone}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center py-6 text-slate-500 text-sm">
                {siteWorkersDialog?.date === 'all' ? 'No workers assigned to this site.' : 'No workers found for this site on the selected date.'}
              </p>
            )}
          </DialogContent>
        </Dialog>

        {/* Bottom Actions */}
        <div className="grid grid-cols-2 gap-4 pb-6">
          <Button variant="outline" className="h-12 rounded-xl border-slate-200 hover:bg-slate-50">
            <MessageCircle className="w-5 h-5 mr-2" />Chat Admin
          </Button>
          <Button variant="outline" className="h-12 rounded-xl border-slate-200 hover:bg-slate-50">
            <Clock className="w-5 h-5 mr-2" />View History
          </Button>
        </div>
      </div>
    </div>
  );
}
