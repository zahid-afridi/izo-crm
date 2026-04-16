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
  MapPin,
  Building2,
  Calendar,
  Users,
  PowerOff
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

interface SitesManagementProps {
  userRole: string;
}

const mockSites = [
  {
    id: 1,
    name: 'Villa Project - Tirana',
    location: 'Tirana, Albania',
    status: 'active',
    startDate: '2025-01-15',
    workers: 12,
    manager: 'John Doe',
    progress: 65,
  },
  {
    id: 2,
    name: 'Office Building - Durres',
    location: 'Durres, Albania',
    status: 'pending',
    startDate: '2025-02-01',
    workers: 8,
    manager: 'Jane Smith',
    progress: 45,
  },
  {
    id: 3,
    name: 'Residential Complex',
    location: 'Vlore, Albania',
    status: 'closed',
    startDate: '2024-11-10',
    workers: 0,
    manager: 'John Doe',
    progress: 100,
  },
  {
    id: 4,
    name: 'Shopping Mall Renovation',
    location: 'Tirana, Albania',
    status: 'active',
    startDate: '2025-03-01',
    workers: 10,
    manager: 'Mike Johnson',
    progress: 30,
  },
];

export function SitesManagement({ userRole }: SitesManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<any>(null);

  const canEdit = ['admin', 'site_manager'].includes(userRole);
  const canDelete = userRole === 'admin';

  const filteredSites = mockSites.filter(site => {
    const matchesSearch = site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         site.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || site.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search sites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {canEdit && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Site
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Construction Site</DialogTitle>
                <DialogDescription>
                  Create a new construction site with details and location
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Site Name</Label>
                    <Input placeholder="Enter site name" />
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Location / Address</Label>
                    <Textarea placeholder="Enter full address" rows={2} />
                  </div>
                  
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" defaultValue="2025-12-06" />
                  </div>
                  
                  <div>
                    <Label>Expected End Date</Label>
                    <Input type="date" />
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Project Manager</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="john">John Doe</SelectItem>
                        <SelectItem value="jane">Jane Smith</SelectItem>
                        <SelectItem value="mike">Mike Johnson</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Client Name</Label>
                    <Input placeholder="Enter client name" />
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Description / Notes</Label>
                    <Textarea placeholder="Site details, special requirements, etc." rows={3} />
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Status</Label>
                    <Select defaultValue="active">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    alert('Site created successfully!');
                    setIsCreateDialogOpen(false);
                  }}>
                    Create Site
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
          <p className="text-sm text-gray-500 mb-1">Total Sites</p>
          <p className="text-2xl text-gray-900">{mockSites.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Active Sites</p>
          <p className="text-2xl text-gray-900">{mockSites.filter(s => s.status === 'active').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Closed Sites</p>
          <p className="text-2xl text-gray-900">{mockSites.filter(s => s.status === 'closed').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Total Workers Assigned</p>
          <p className="text-2xl text-gray-900">{mockSites.reduce((sum, s) => sum + s.workers, 0)}</p>
        </Card>
      </div>

      {/* Sites Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Site Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Workers</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSites.map((site) => (
                <TableRow key={site.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{site.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{site.location}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{site.startDate}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-900">{site.manager}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{site.workers}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-brand-gradient h-2 rounded-full shadow-sm" 
                        style={{ width: `${site.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 mt-1">{site.progress}%</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={site.status === 'active' ? 'default' : 'secondary'}>
                      {site.status === 'active' ? 'Active' : site.status === 'pending' ? 'Pending' : 'Closed'}
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
                              setSelectedSite(site);
                              setIsEditDialogOpen(true);
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <PowerOff className="w-4 h-4 mr-2" />
                              {site.status === 'active' ? 'Mark as Closed' : 'Reactivate'}
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

      {/* Edit Site Dialog */}
      {selectedSite && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Site: {selectedSite.name}</DialogTitle>
              <DialogDescription>
                Update site information and settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Site Name</Label>
                  <Input defaultValue={selectedSite.name} />
                </div>
                
                <div className="col-span-2">
                  <Label>Location / Address</Label>
                  <Textarea defaultValue={selectedSite.location} rows={2} />
                </div>
                
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" defaultValue={selectedSite.startDate} />
                </div>
                
                <div>
                  <Label>Progress (%)</Label>
                  <Input type="number" min="0" max="100" defaultValue={selectedSite.progress} />
                </div>
                
                <div className="col-span-2">
                  <Label>Status</Label>
                  <Select defaultValue={selectedSite.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  alert('Site updated successfully!');
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
