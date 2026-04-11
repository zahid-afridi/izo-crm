'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Car,
  Building2,
  MessageSquare,
  History,
  TrendingUp,
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

interface TeamMember {
  id: string;
  fullName: string;
  phone?: string | null;
}

interface AssignmentData {
  id: string;
  siteId: string;
  site: { id: string; name: string; address: string; city?: string | null };
  car: { id: string; name: string; number: string; color: string; model: string } | null;
  assignedDate: string;
  status: string;
  notes: string | null;
  teamMembers: TeamMember[];
  allowFullProgram?: boolean;
  fullProgram?: Array<{
    site: { id: string; name: string; address: string };
    car: { id: string; name: string; number: string; color: string } | null;
    workers: Array<{ id: string; fullName: string }>;
  }>;
  isFinalized?: boolean;
}

interface WorkerAssignmentsResponse {
  today: AssignmentData[];
  upcoming: AssignmentData[];
  past: AssignmentData[];
  summary: {
    monthWorkDays: number;
    totalWorkDays: number;
    summaryMonth: string;
    monthlyBreakdown: Record<string, number>;
  };
}

interface WorkerDashboardProps {
  userRole: string;
}

export function WorkerDashboard({ userRole }: WorkerDashboardProps) {
  const user = useAppSelector(selectAuthUser);
  const [data, setData] = useState<WorkerAssignmentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/worker/assignments', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch assignments');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your assignments...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-center text-gray-900 mb-2">Failed to load assignments</p>
          <p className="text-center text-sm text-gray-500 mb-4">{error}</p>
          <Button onClick={fetchAssignments} className="w-full">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const todayAssignment = data.today[0] ?? null;
  const hasMultipleTodayAssignments = data.today.length > 1;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-brand-gradient rounded-lg p-6 text-white shadow-lg">
        <h2 className="text-2xl mb-1">Welcome, {user?.fullName || 'Worker'}</h2>
        <p className="text-white/90">
          {todayAssignment
            ? `You have ${data.today.length} assignment${data.today.length > 1 ? 's' : ''} today`
            : 'No assignments for today'}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Today's Date</p>
              <p className="text-gray-900">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">This Month</p>
              <p className="text-gray-900">{data.summary.monthWorkDays} Work Days</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Work Days</p>
              <p className="text-gray-900">{data.summary.totalWorkDays}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today">
            Today {data.today.length > 0 && `(${data.today.length})`}
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming {data.upcoming.length > 0 && `(${data.upcoming.length})`}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Today's Assignments */}
        <TabsContent value="today" className="space-y-4">
          {data.today.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No assignments for today</p>
              <p className="text-sm text-gray-500 mt-1">Enjoy your day off!</p>
            </Card>
          ) : (
            <>
              {data.today.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} currentUserId={user?.id || ''} />
              ))}
            </>
          )}
        </TabsContent>

        {/* Upcoming Assignments */}
        <TabsContent value="upcoming" className="space-y-4">
          {data.upcoming.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No upcoming assignments</p>
            </Card>
          ) : (
            <>
              {data.upcoming.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} currentUserId={user?.id || ''} />
              ))}
            </>
          )}
        </TabsContent>

        {/* Past Assignments & Work Summary */}
        <TabsContent value="history" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg text-gray-900">Work Summary</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-500">This Month</p>
                <p className="text-2xl text-gray-900">{data.summary.monthWorkDays}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-500">Total Days</p>
                <p className="text-2xl text-gray-900">{data.summary.totalWorkDays}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-500">Past 90 Days</p>
                <p className="text-2xl text-gray-900">{data.past.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-500">Upcoming</p>
                <p className="text-2xl text-gray-900">{data.upcoming.length}</p>
              </div>
            </div>

            {Object.keys(data.summary.monthlyBreakdown).length > 0 && (
              <div>
                <h4 className="text-sm text-gray-700 mb-3">Monthly Breakdown</h4>
                <div className="space-y-2">
                  {Object.entries(data.summary.monthlyBreakdown)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([month, count]) => (
                      <div key={month} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {new Date(month + '-01').toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        <Badge variant="secondary">{count} days</Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg text-gray-900">Past Assignments</h3>
            </div>

            {data.past.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No past assignments found</p>
            ) : (
              <div className="space-y-3">
                {data.past.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-gray-900">{assignment.site.name}</h4>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {assignment.site.address}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(assignment.assignedDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <Badge variant="secondary">{assignment.status}</Badge>
                    </div>
                    {assignment.teamMembers.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {assignment.teamMembers.map((member) => (
                          <span key={member.id} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {member.fullName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AssignmentCard({
  assignment,
  currentUserId,
}: {
  assignment: AssignmentData;
  currentUserId: string;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-brand-600" />
            <h3 className="text-xl text-gray-900">{assignment.site.name}</h3>
          </div>
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <MapPin className="w-4 h-4" />
            <p>{assignment.site.address}</p>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <p>
              {new Date(assignment.assignedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
        <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'}>
          {assignment.status}
        </Badge>
      </div>

      {/* Car Assignment */}
      {assignment.car && (
        <div className="bg-gray-50 border rounded-lg p-4 mb-6">
          <h4 className="text-sm text-gray-700 mb-3 flex items-center gap-2">
            <Car className="w-4 h-4" />
            Assigned Vehicle
          </h4>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg border-2 flex items-center justify-center"
              style={{
                backgroundColor: assignment.car.color,
                borderColor: assignment.car.color === '#FFFFFF' ? '#e5e7eb' : assignment.car.color,
              }}
            >
              <Car className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-gray-900">{assignment.car.name}</p>
              <p className="text-sm text-gray-500">{assignment.car.number}</p>
            </div>
          </div>
        </div>
      )}

      {/* Team Members */}
      {assignment.teamMembers.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm text-gray-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Your Team ({assignment.teamMembers.length + 1} members)
          </h4>
          <div className="space-y-2">
            {/* Current user */}
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-brand-50 border-brand-200">
              <div className="w-10 h-10 bg-brand-gradient rounded-full flex items-center justify-center text-white shadow-md">
                {(currentUserId || 'U').substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-gray-900">
                  You
                  <span className="text-brand-600 text-sm ml-2">(Me)</span>
                </p>
              </div>
            </div>

            {/* Team members */}
            {assignment.teamMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white border-gray-200">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
                  {member.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-gray-900">{member.fullName}</p>
                  {member.phone && <p className="text-sm text-gray-500">{member.phone}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {assignment.notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-yellow-900">
            <strong>Note:</strong> {assignment.notes}
          </p>
        </div>
      )}

      {/* Full Program View (if allowed) */}
      {assignment.allowFullProgram && assignment.fullProgram && assignment.fullProgram.length > 0 && (
        <div className="border-t pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg text-gray-900">Today's Full Program</h3>
            <Badge variant="secondary" className="ml-2">
              All Sites
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Site manager has enabled full program visibility. Here are all teams working today:
          </p>

          <div className="space-y-4">
            {assignment.fullProgram.map((team, idx) => (
              <div key={idx} className="bg-gray-50 border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-gray-900 mb-1">{team.site.name}</h4>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {team.site.address}
                    </p>
                  </div>
                  {team.car && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Car className="w-4 h-4" />
                      {team.car.name}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {team.workers.map((worker) => (
                    <div
                      key={worker.id}
                      className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border text-sm"
                    >
                      <Users className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-700">{worker.fullName}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
