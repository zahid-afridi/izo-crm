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
  History,
  Navigation,
  Phone,
  ChevronRight,
  Info
} from 'lucide-react';

const currentWorker = {
  id: 3,
  name: 'Mike Johnson',
  role: 'Worker',
};

const todayAssignment = {
  id: 1,
  date: '2025-12-05',
  siteName: 'Villa Project - Tirana',
  siteLocation: 'Rruga Kavajes, Tirana',
  siteCoordinates: { lat: 41.3275, lng: 19.8187 },
  carName: 'Van 01',
  carPlate: 'AA-123-BB',
  carColor: '#FFFFFF',
  teamMembers: [
    { id: 1, name: 'John Doe', role: 'Foreman', phone: '+355 69 123 4567' },
    { id: 3, name: 'Mike Johnson', role: 'Worker', phone: '+355 69 345 6789' },
    { id: 2, name: 'Jane Smith', role: 'Worker', phone: '+355 69 234 5678' },
  ],
  startTime: '07:00',
  endTime: '16:00',
  status: 'assigned',
  attendance: null,
  allowFullView: true,
};

const otherTeamsToday = [
  {
    id: 2,
    siteName: 'Office Building - Durres',
    siteLocation: 'Durres Port Area',
    carName: 'Truck 02',
    teamSize: 3,
  },
  {
    id: 3,
    siteName: 'Residential Complex - Vlore',
    siteLocation: 'Vlore Beach Front',
    carName: 'Van 03',
    teamSize: 2,
  },
];

const pastAssignments = [
  { id: 10, date: '2025-12-04', siteName: 'Villa Project - Tirana', attendance: 'present' },
  { id: 9, date: '2025-12-03', siteName: 'Office Building - Durres', attendance: 'present' },
  { id: 8, date: '2025-12-02', siteName: 'Villa Project - Tirana', attendance: 'present' },
  { id: 7, date: '2025-12-01', siteName: 'Villa Project - Tirana', attendance: 'absent' },
];

export function MobileWorkerView() {
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [taskStatus, setTaskStatus] = useState<'not-started' | 'in-progress' | 'completed'>('not-started');
  const [showFullProgram, setShowFullProgram] = useState(false);

  const handleMarkAttendance = (status: 'present' | 'absent') => {
    setAttendanceMarked(true);
    const now = new Date();
    alert(`✓ Attendance Marked\n\nStatus: ${status.toUpperCase()}\nTime: ${now.toLocaleTimeString()}\nDate: ${now.toLocaleDateString()}`);
  };

  const handleUpdateStatus = (status: 'in-progress' | 'completed') => {
    setTaskStatus(status);
    alert(`✓ Status Updated\n\n${status.toUpperCase().replace('-', ' ')}\nTime: ${new Date().toLocaleTimeString()}`);
  };

  const handleNavigate = () => {
    const { lat, lng } = todayAssignment.siteCoordinates;
    // Open in Google Maps (works on both iOS and Android)
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-brand-gradient text-white px-4 py-6 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/90 text-sm">Welcome back,</p>
            <h1 className="text-xl">{currentWorker.name}</h1>
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            className="text-white hover:bg-white/20"
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4" />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center">
            <Clock className="w-5 h-5 text-brand-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Start</p>
            <p className="text-sm text-gray-900">{todayAssignment.startTime}</p>
          </Card>
          <Card className="p-3 text-center">
            <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500">This Month</p>
            <p className="text-sm text-gray-900">22 days</p>
          </Card>
          <Card className="p-3 text-center">
            <Users className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Team</p>
            <p className="text-sm text-gray-900">{todayAssignment.teamMembers.length}</p>
          </Card>
        </div>

        {/* Attendance Alert */}
        {!attendanceMarked && (
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm text-yellow-900 mb-1">Mark Attendance</h3>
                <p className="text-xs text-yellow-700">
                  Please check in when you arrive at the site
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                size="sm" 
                onClick={() => handleMarkAttendance('present')}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Present
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleMarkAttendance('absent')}
                className="w-full"
              >
                Absent
              </Button>
            </div>
          </Card>
        )}

        {/* Today's Assignment */}
        <Card className="overflow-hidden">
          <div className="bg-brand-50 border-b border-brand-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-gray-900">Today's Assignment</h2>
              {attendanceMarked && (
                <Badge className="bg-green-600">Checked In</Badge>
              )}
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Site Info */}
            <div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-gray-900 mb-1">{todayAssignment.siteName}</h3>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {todayAssignment.siteLocation}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3"
                onClick={handleNavigate}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Navigate to Site
              </Button>
            </div>

            {/* Car Assignment */}
            <div className="border-t pt-4">
              <h4 className="text-xs text-gray-500 uppercase mb-2 flex items-center gap-1">
                <Car className="w-3 h-3" />
                Assigned Vehicle
              </h4>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-lg border-2 flex items-center justify-center flex-shrink-0"
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
            <div className="border-t pt-4">
              <h4 className="text-xs text-gray-500 uppercase mb-3 flex items-center gap-1">
                <Users className="w-3 h-3" />
                Your Team ({todayAssignment.teamMembers.length})
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
                    <div className="w-10 h-10 bg-brand-gradient rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 shadow-md">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {member.name}
                        {member.id === currentWorker.id && (
                          <span className="text-brand-600 text-xs ml-1">(You)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                    {member.role === 'Foreman' ? (
                      <Badge variant="outline" className="text-xs">Lead</Badge>
                    ) : (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="flex-shrink-0"
                        onClick={() => window.open(`tel:${member.phone}`)}
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Work Status */}
            {attendanceMarked && (
              <div className="border-t pt-4">
                <h4 className="text-xs text-gray-500 uppercase mb-3">Work Status</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    size="sm"
                    variant={taskStatus === 'in-progress' ? 'default' : 'outline'}
                    onClick={() => handleUpdateStatus('in-progress')}
                    disabled={taskStatus === 'completed'}
                    className="text-xs"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    In Progress
                  </Button>
                  <Button 
                    size="sm"
                    variant={taskStatus === 'completed' ? 'default' : 'outline'}
                    onClick={() => handleUpdateStatus('completed')}
                    className={taskStatus === 'completed' ? 'bg-green-600 hover:bg-green-700 text-xs' : 'text-xs'}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Completed
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Full Program Toggle */}
        {todayAssignment.allowFullView && (
          <Card className="overflow-hidden">
            <button
              onClick={() => setShowFullProgram(!showFullProgram)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-600" />
                <span className="text-sm text-gray-900">Today's Full Program</span>
                <Badge variant="secondary" className="text-xs">All Sites</Badge>
              </div>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showFullProgram ? 'rotate-90' : ''}`} />
            </button>
            
            {showFullProgram && (
              <div className="px-4 pb-4 space-y-2 border-t">
                <p className="text-xs text-gray-500 py-2">
                  Other teams working today:
                </p>
                {otherTeamsToday.map(team => (
                  <div key={team.id} className="bg-gray-50 rounded-lg p-3">
                    <h4 className="text-sm text-gray-900 mb-1">{team.siteName}</h4>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {team.siteLocation}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {team.teamSize} workers
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Past Assignments */}
        <Card className="overflow-hidden">
          <div className="bg-gray-50 border-b px-4 py-3">
            <h2 className="text-sm text-gray-900 flex items-center gap-2">
              <History className="w-4 h-4" />
              Past Assignments
            </h2>
          </div>
          <div className="divide-y">
            {pastAssignments.slice(0, 5).map(assignment => (
              <div key={assignment.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{assignment.siteName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(assignment.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <Badge 
                    variant={assignment.attendance === 'present' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {assignment.attendance === 'present' ? 'Present' : 'Absent'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 pb-6">
          <Button variant="outline" className="h-auto py-4 flex-col gap-2">
            <MessageSquare className="w-5 h-5" />
            <span className="text-xs">Chat Admin</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2">
            <History className="w-5 h-5" />
            <span className="text-xs">View History</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
