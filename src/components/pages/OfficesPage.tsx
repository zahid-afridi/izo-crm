import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus, Search, MapPin, MoreVertical, Eye, Edit, Trash2, Phone, Mail } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

const mockOffices = [
  {
    id: 1,
    name: 'New York Headquarters',
    address: '123 Main Street, New York, NY 10001',
    phone: '+1 212 555 0100',
    email: 'ny@auctioncrm.com',
    manager: 'John Smith',
    employees: 45,
    status: 'active',
    type: 'headquarters',
  },
  {
    id: 2,
    name: 'Los Angeles Branch',
    address: '456 Sunset Blvd, Los Angeles, CA 90028',
    phone: '+1 323 555 0200',
    email: 'la@auctioncrm.com',
    manager: 'Sarah Johnson',
    employees: 32,
    status: 'active',
    type: 'branch',
  },
  {
    id: 3,
    name: 'Chicago Office',
    address: '789 Michigan Ave, Chicago, IL 60611',
    phone: '+1 312 555 0300',
    email: 'chicago@auctioncrm.com',
    manager: 'Michael Brown',
    employees: 28,
    status: 'active',
    type: 'branch',
  },
  {
    id: 4,
    name: 'Miami Regional',
    address: '321 Ocean Drive, Miami, FL 33139',
    phone: '+1 305 555 0400',
    email: 'miami@auctioncrm.com',
    manager: 'Emily Davis',
    employees: 19,
    status: 'active',
    type: 'regional',
  },
  {
    id: 5,
    name: 'Boston Warehouse',
    address: '654 Harbor St, Boston, MA 02110',
    phone: '+1 617 555 0500',
    email: 'boston@auctioncrm.com',
    manager: 'David Wilson',
    employees: 12,
    status: 'inactive',
    type: 'warehouse',
  },
];

export function OfficesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filteredOffices = mockOffices.filter(office => {
    const matchesSearch = 
      office.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      office.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      office.manager.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || office.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search offices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="headquarters">Headquarters</SelectItem>
              <SelectItem value="branch">Branch</SelectItem>
              <SelectItem value="regional">Regional</SelectItem>
              <SelectItem value="warehouse">Warehouse</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Office
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Office</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Office Name</Label>
                  <Input placeholder="Enter office name" />
                </div>
                
                <div>
                  <Label>Office Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="headquarters">Headquarters</SelectItem>
                      <SelectItem value="branch">Branch</SelectItem>
                      <SelectItem value="regional">Regional</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Manager</Label>
                  <Input placeholder="Manager name" />
                </div>
                
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input placeholder="Street address" />
                </div>
                
                <div>
                  <Label>City</Label>
                  <Input placeholder="City" />
                </div>
                
                <div>
                  <Label>State</Label>
                  <Input placeholder="State" />
                </div>
                
                <div>
                  <Label>Postal Code</Label>
                  <Input placeholder="12345" />
                </div>
                
                <div>
                  <Label>Country</Label>
                  <Input placeholder="Country" />
                </div>
                
                <div>
                  <Label>Phone</Label>
                  <Input placeholder="+1 234 567 8900" />
                </div>
                
                <div>
                  <Label>Email</Label>
                  <Input type="email" placeholder="office@example.com" />
                </div>
                
                <div>
                  <Label>Status</Label>
                  <Select defaultValue="active">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(false)}>
                  Add Office
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Total Offices</p>
          <p className="text-gray-900">{mockOffices.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Active Offices</p>
          <p className="text-gray-900">{mockOffices.filter(o => o.status === 'active').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Total Employees</p>
          <p className="text-gray-900">{mockOffices.reduce((sum, o) => sum + o.employees, 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Locations</p>
          <p className="text-gray-900">{new Set(mockOffices.map(o => o.address.split(',').pop())).size} States</p>
        </Card>
      </div>

      {/* Offices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOffices.map((office) => (
          <Card key={office.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-gray-900">{office.name}</h3>
                  <Badge variant="outline" className="mt-1">{office.type}</Badge>
                </div>
              </div>
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
                  <DropdownMenuItem>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{office.address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>{office.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span>{office.email}</span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Manager</p>
                <p className="text-sm text-gray-900">{office.manager}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Employees</p>
                <p className="text-sm text-gray-900">{office.employees}</p>
              </div>
              <Badge variant={office.status === 'active' ? 'default' : 'secondary'}>
                {office.status}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
