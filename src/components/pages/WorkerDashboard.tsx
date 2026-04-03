import { useState } from 'react';
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
  History
} from 'lucide-react';

// Mock data for current user (worker)
const currentWorker = {
  id: 3,
  name: 'Mike Johnson',
  role: 'Worker',
};

// Mock assignments
const todayAssignment = {
  id: 1,
  date: '2025-12-05',
  siteName: 'Villa Project - Tirana',
  siteLocation: 'Rruga Kavajes, Tirana',
  carName: 'Van 01',
  carPlate: 'AA-123-BB',
  carColor: '#FFFFFF',
  teamMembers: [
    { id: 1, name: 'John Doe', role: 'Foreman' },
    { id: 3, name: 'Mike Johnson', role: 'Worker' }, // Current user
    { id: 2, name: 'Jane Smith', role: 'Worker' },
  ],
  startTime: '07:00',
  status: 'assigned', // assigned, in-progress, completed
  attendance: null, // null, present, absent
  allowFullView: true, // Set by site manager
};

// Other teams if allowFullView is true
const otherTeamsToday = [
  {
    id: 2,
    siteName: 'Office Building - Durres',
    siteLocation: 'Durres Port Area',
    carName: 'Truck 02',
    carPlate: 'CC-456-DD',
    teamMembers: [
      { id: 7, name: 'Chris Wilson', role: 'Foreman' },
      { id: 4, name: 'Sarah Williams', role: 'Specialist' },
      { id: 8, name: 'Anna Martinez', role: 'Worker' },
    ],
  },
  {
    id: 3,
    siteName: 'Residential Complex - Vlore',
    siteLocation: 'Vlore Beach Front',
    carName: 'Van 03',
    carPlate: 'EE-789-FF',
    teamMembers: [
      { id: 5, name: 'Tom Brown', role: 'Worker' },
      { id: 6, name: 'Lisa Davis', role: 'Worker' },
    ],
  },
];

const pastAssignments = [
  {
    id: 10,
    date: '2025-12-04',
    siteName: 'Villa Project - Tirana',
    attendance: 'present',
    teamMembers: ['John Doe', 'Jane Smith', 'Mike Johnson'],
  },
  {
    id: 9,
    date: '2025-12-03',
    siteName: 'Office Building - Durres',
    attendance: 'present',
    teamMembers: ['Chris Wilson', 'Mike Johnson', 'Tom Brown'],
  },
  {
    id: 8,
    date: '2025-12-02',
    siteName: 'Villa Project - Tirana',
    attendance: 'present',
    teamMembers: ['John Doe', 'Jane Smith', 'Mike Johnson'],
  },
];

interface WorkerDashboardProps {
  userRole: string;
}

export function WorkerDashboard({ userRole }: WorkerDashboardProps) {
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [taskStatus, setTaskStatus] = useState<'not-started' | 'in-progress' | 'completed'>('not-started');

  const handleMarkAttendance = (status: 'present' | 'absent') => {
    setAttendanceMarked(true);
    alert(`Attendance marked as: ${status.toUpperCase()}\n\nTime: ${new Date().toLocaleTimeString()}\nDate: ${new Date().toLocaleDateString()}`);
  };

  const handleUpdateStatus = (status: 'in-progress' | 'completed') => {
    setTaskStatus(status);
    alert(`Work status updated to: ${status.toUpperCase().replace('-', ' ')}\n\nTime: ${new Date().toLocaleTimeString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-brand-gradient rounded-lg p-6 text-white shadow-lg">
        <h2 className="text-2xl mb-1">Welcome, {currentWorker.name}</h2>
        <p className="text-white/90">Here's your schedule for today</p>
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
              <p className="text-gray-900">{new Date().toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })}</p>
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
              <p className="text-gray-900">22 Work Days</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Start Time</p>
              <p className="text-gray-900">{todayAssignment.startTime} AM</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="today">Today's Assignment</TabsTrigger>
          <TabsTrigger value="history">Past Assignments</TabsTrigger>
        </TabsList>

        {/* Today's Assignment */}
        <TabsContent value="today" className="space-y-4">
          {/* Main Assignment Card */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-brand-600" />
                  <h3 className="text-xl text-gray-900">{todayAssignment.siteName}</h3>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <p>{todayAssignment.siteLocation}</p>
                </div>
              </div>
              <Badge variant={
                attendanceMarked ? 'default' : 'secondary'
              }>
                {attendanceMarked ? 'Checked In' : 'Not Checked In'}
              </Badge>
            </div>

            {/* Attendance Section */}
            {!attendanceMarked && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm text-yellow-900 mb-2">Mark Your Attendance</h4>
                    <p className="text-xs text-yellow-700 mb-3">
                      Please mark your attendance when you arrive at the site
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleMarkAttendance('present')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Mark Present
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleMarkAttendance('absent')}
                      >
                        Mark Absent
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Car Assignment */}
            <div className="bg-gray-50 border rounded-lg p-4 mb-6">
              <h4 className="text-sm text-gray-700 mb-3 flex items-center gap-2">
                <Car className="w-4 h-4" />
                Assigned Vehicle
              </h4>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-lg border-2 flex items-center justify-center"
                  style={{ 
                    backgroundColor: todayAssignment.carColor,
                    borderColor: todayAssignment.carColor === '#FFFFFF' ? '#e5e7eb' : todayAssignment.carColor 
                  }}
                >
                  <Car className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-gray-900">{todayAssignment.carName}</p>
                  <p className="text-sm text-gray-500">{todayAssignment.carPlate}</p>
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div className="mb-6">
              <h4 className="text-sm text-gray-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Your Team ({todayAssignment.teamMembers.length} members)
              </h4>
              <div className="space-y-2">
                {todayAssignment.teamMembers.map(member => (
                  <div 
                    key={member.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      member.id === currentWorker.id 
                        ? 'bg-brand-50 border-brand-200' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="w-10 h-10 bg-brand-gradient rounded-full flex items-center justify-center text-white shadow-md">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900">
                        {member.name}
                        {member.id === currentWorker.id && (
                          <span className="text-brand-600 text-sm ml-2">(You)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">{member.role}</p>
                    </div>
                    {member.role === 'Foreman' && (
                      <Badge variant="outline" className="text-xs">Team Lead</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Task Status Update */}
            {attendanceMarked && (
              <div className="border-t pt-4">
                <h4 className="text-sm text-gray-700 mb-3">Update Work Status</h4>
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    variant={taskStatus === 'in-progress' ? 'default' : 'outline'}
                    onClick={() => handleUpdateStatus('in-progress')}
                    disabled={taskStatus === 'completed'}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    In Progress
                  </Button>
                  <Button 
                    size="sm"
                    variant={taskStatus === 'completed' ? 'default' : 'outline'}
                    onClick={() => handleUpdateStatus('completed')}
                    className={taskStatus === 'completed' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Completed
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Full Program View (if allowed) */}
          {todayAssignment.allowFullView && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg text-gray-900">Today's Full Program</h3>
                <Badge variant="secondary" className="ml-2">All Sites</Badge>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Site manager has enabled full program visibility. Here are all teams working today:
              </p>
              
              <div className="space-y-4">
                {otherTeamsToday.map(team => (
                  <div key={team.id} className="bg-gray-50 border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-gray-900 mb-1">{team.siteName}</h4>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {team.siteLocation}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Car className="w-4 h-4" />
                        {team.carName}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {team.teamMembers.map((member, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border text-sm">
                          <Users className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-700">{member.name}</span>
                          {member.role === 'Foreman' && (
                            <Badge variant="outline" className="text-xs ml-1">Lead</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button variant="outline" className="justify-start">
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat with Admin
              </Button>
              <Button variant="outline" className="justify-start">
                <MapPin className="w-4 h-4 mr-2" />
                View Site Location
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Past Assignments */}
        <TabsContent value="history" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg text-gray-900">Past Assignments</h3>
            </div>
            
            <div className="space-y-3">
              {pastAssignments.map(assignment => (
                <div key={assignment.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-gray-900">{assignment.siteName}</h4>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(assignment.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <Badge variant={assignment.attendance === 'present' ? 'default' : 'secondary'}>
                      {assignment.attendance === 'present' ? 'Present' : 'Absent'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {assignment.teamMembers.map((member, idx) => (
                      <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {member}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
