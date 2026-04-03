import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2,
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar as CalendarIcon,
  DollarSign,
  PowerOff
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

interface WorkersManagementProps {
  userRole: string;
}

const mockWorkers = [
  {
    id: 1,
    fullName: 'John Doe',
    role: 'Foreman',
    phone: '+355 69 123 4567',
    email: 'john.doe@example.com',
    address: 'Tirana, Albania',
    hireDate: '2023-01-15',
    dailySalary: 50,
    status: 'active',
  },
  {
    id: 2,
    fullName: 'Jane Smith',
    role: 'Worker',
    phone: '+355 69 234 5678',
    email: 'jane.smith@example.com',
    address: 'Durres, Albania',
    hireDate: '2023-03-20',
    dailySalary: 45,
    status: 'active',
  },
  {
    id: 3,
    fullName: 'Mike Johnson',
    role: 'Worker',
    phone: '+355 69 345 6789',
    email: 'mike.j@example.com',
    address: 'Tirana, Albania',
    hireDate: '2023-06-10',
    dailySalary: 50,
    status: 'active',
  },
  {
    id: 4,
    fullName: 'Sarah Williams',
    role: 'Specialist',
    phone: '+355 69 456 7890',
    email: 'sarah.w@example.com',
    address: 'Vlore, Albania',
    hireDate: '2022-11-05',
    dailySalary: 55,
    status: 'active',
  },
  {
    id: 5,
    fullName: 'Tom Brown',
    role: 'Worker',
    phone: '+355 69 567 8901',
    email: 'tom.b@example.com',
    address: 'Tirana, Albania',
    hireDate: '2024-01-10',
    dailySalary: 45,
    status: 'disabled',
  },
];

export function WorkersManagement({ userRole }: WorkersManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);

  const canEdit = ['admin', 'site_manager'].includes(userRole);
  const canDelete = userRole === 'admin';

  const filteredWorkers = mockWorkers.filter(worker => {
    const matchesSearch = worker.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         worker.phone.includes(searchQuery) ||
                         worker.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || worker.status === statusFilter;
    const matchesRole = roleFilter === 'all' || worker.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search workers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="Foreman">Foreman</SelectItem>
              <SelectItem value="Worker">Worker</SelectItem>
              <SelectItem value="Specialist">Specialist</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {canEdit && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Worker
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Worker</DialogTitle>
                <DialogDescription>
                  Register a new worker with details and daily salary
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Full Name</Label>
                    <Input placeholder="Enter full name" />
                  </div>
                  
                  <div>
                    <Label>Role</Label>
                    <Select defaultValue="Worker">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Worker">Worker</SelectItem>
                        <SelectItem value="Foreman">Foreman</SelectItem>
                        <SelectItem value="Specialist">Specialist</SelectItem>
                        <SelectItem value="Driver">Driver</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Daily Salary (€)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" />
                  </div>
                  
                  <div>
                    <Label>Phone Number</Label>
                    <Input placeholder="+355 69 123 4567" />
                  </div>
                  
                  <div>
                    <Label>Email</Label>
                    <Input type="email" placeholder="worker@example.com" />
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Address</Label>
                    <Input placeholder="City, Albania" />
                  </div>
                  
                  <div>
                    <Label>Hire Date</Label>
                    <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                  
                  <div>
                    <Label>Status</Label>
                    <Select defaultValue="active">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active (Available in Pool)</SelectItem>
                        <SelectItem value="disabled">Disabled (Hidden from Pool)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea placeholder="Any additional information..." rows={3} />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    alert('Worker added successfully!');
                    setIsCreateDialogOpen(false);
                  }}>
                    Add Worker
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Total Workers</p>
          <p className="text-2xl text-gray-900">{mockWorkers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Active Workers</p>
          <p className="text-2xl text-gray-900">{mockWorkers.filter(w => w.status === 'active').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Foremen</p>
          <p className="text-2xl text-gray-900">{mockWorkers.filter(w => w.role === 'Foreman').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Avg. Daily Salary</p>
          <p className="text-2xl text-gray-900">
            €{(mockWorkers.reduce((sum, w) => sum + w.dailySalary, 0) / mockWorkers.length).toFixed(0)}
          </p>
        </Card>
      </div>

      {/* Workers Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Daily Salary</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkers.map((worker) => (
                <TableRow key={worker.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-gray-900">{worker.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{worker.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {worker.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {worker.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">€{worker.dailySalary}/day</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-gray-600">
                      <CalendarIcon className="w-4 h-4 text-gray-400" />
                      {worker.hireDate}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={worker.status === 'active' ? 'default' : 'secondary'}>
                      {worker.status === 'active' ? 'Active' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem onClick={() => {
                              setSelectedWorker(worker);
                              setIsEditDialogOpen(true);
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <PowerOff className="w-4 h-4 mr-2" />
                              {worker.status === 'active' ? 'Disable' : 'Activate'}
                            </DropdownMenuItem>
                          </>
                        )}
                        {canDelete && (
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit Worker Dialog */}
      {selectedWorker && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Worker: {selectedWorker.fullName}</DialogTitle>
              <DialogDescription>
                Update worker information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Full Name</Label>
                  <Input defaultValue={selectedWorker.fullName} />
                </div>
                
                <div>
                  <Label>Role</Label>
                  <Select defaultValue={selectedWorker.role}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Worker">Worker</SelectItem>
                      <SelectItem value="Foreman">Foreman</SelectItem>
                      <SelectItem value="Specialist">Specialist</SelectItem>
                      <SelectItem value="Driver">Driver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Daily Salary (€)</Label>
                  <Input type="number" step="0.01" defaultValue={selectedWorker.dailySalary} />
                </div>
                
                <div>
                  <Label>Phone Number</Label>
                  <Input defaultValue={selectedWorker.phone} />
                </div>
                
                <div>
                  <Label>Email</Label>
                  <Input type="email" defaultValue={selectedWorker.email} />
                </div>
                
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input defaultValue={selectedWorker.address} />
                </div>
                
                <div>
                  <Label>Hire Date</Label>
                  <Input type="date" defaultValue={selectedWorker.hireDate} />
                </div>
                
                <div>
                  <Label>Status</Label>
                  <Select defaultValue={selectedWorker.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (Available in Pool)</SelectItem>
                      <SelectItem value="disabled">Disabled (Hidden from Pool)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  alert('Worker updated successfully!');
                  setIsEditDialogOpen(false);
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
