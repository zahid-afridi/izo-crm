import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2,
  Car,
  PowerOff
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

interface CarsManagementProps {
  userRole: string;
}

const mockCars = [
  {
    id: 1,
    carName: 'Van 01',
    carNumber: '001',
    plateNumber: 'AA-123-BB',
    color: 'White',
    colorHex: '#FFFFFF',
    status: 'active',
    assignedToday: true,
  },
  {
    id: 2,
    carName: 'Truck 02',
    carNumber: '002',
    plateNumber: 'CC-456-DD',
    color: 'Blue',
    colorHex: '#3B82F6',
    status: 'active',
    assignedToday: true,
  },
  {
    id: 3,
    carName: 'Van 03',
    carNumber: '003',
    plateNumber: 'EE-789-FF',
    color: 'Red',
    colorHex: '#EF4444',
    status: 'active',
    assignedToday: false,
  },
  {
    id: 4,
    carName: 'Truck 01',
    carNumber: '004',
    plateNumber: 'GG-234-HH',
    color: 'Gray',
    colorHex: '#6B7280',
    status: 'disabled',
    assignedToday: false,
  },
];

export function CarsManagement({ userRole }: CarsManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<any>(null);

  const canEdit = ['admin', 'site_manager'].includes(userRole);
  const canDelete = userRole === 'admin';

  const filteredCars = mockCars.filter(car => {
    const matchesSearch = car.carName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         car.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         car.carNumber.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || car.status === statusFilter;
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
              placeholder="Search cars..."
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
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {canEdit && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Car
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Car</DialogTitle>
                <DialogDescription>
                  Register a new vehicle for site assignments
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Car Name</Label>
                    <Input placeholder="e.g., Van 01, Truck 02" />
                  </div>
                  
                  <div>
                    <Label>Car Number</Label>
                    <Input placeholder="e.g., 001" />
                  </div>
                  
                  <div>
                    <Label>Plate Number</Label>
                    <Input placeholder="e.g., AA-123-BB" />
                  </div>
                  
                  <div>
                    <Label>Car Color</Label>
                    <Input placeholder="e.g., White, Blue" />
                  </div>
                  
                  <div>
                    <Label>Color (Visual)</Label>
                    <div className="flex gap-2">
                      <Input type="color" className="w-20" defaultValue="#FFFFFF" />
                      <Input placeholder="Hex code" defaultValue="#FFFFFF" />
                    </div>
                  </div>
                  
                  <div className="col-span-2">
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
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    alert('Car added successfully!');
                    setIsCreateDialogOpen(false);
                  }}>
                    Add Car
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
          <p className="text-sm text-gray-500 mb-1">Total Cars</p>
          <p className="text-2xl text-gray-900">{mockCars.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Active Cars</p>
          <p className="text-2xl text-gray-900">{mockCars.filter(c => c.status === 'active').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Assigned Today</p>
          <p className="text-2xl text-gray-900">{mockCars.filter(c => c.assignedToday).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Available</p>
          <p className="text-2xl text-gray-900">{mockCars.filter(c => c.status === 'active' && !c.assignedToday).length}</p>
        </Card>
      </div>

      {/* Cars Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Car Name</TableHead>
                <TableHead>Car Number</TableHead>
                <TableHead>Plate Number</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Assigned Today</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCars.map((car) => (
                <TableRow key={car.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{car.carName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-900">{car.carNumber}</TableCell>
                  <TableCell className="text-gray-900">{car.plateNumber}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: car.colorHex }}
                      />
                      <span className="text-gray-900">{car.color}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {car.assignedToday ? (
                      <Badge variant="default">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={car.status === 'active' ? 'default' : 'secondary'}>
                      {car.status === 'active' ? 'Active' : 'Disabled'}
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
                              setSelectedCar(car);
                              setIsEditDialogOpen(true);
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <PowerOff className="w-4 h-4 mr-2" />
                              {car.status === 'active' ? 'Disable' : 'Activate'}
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

      {/* Edit Car Dialog */}
      {selectedCar && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Car: {selectedCar.carName}</DialogTitle>
              <DialogDescription>
                Update vehicle information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Car Name</Label>
                  <Input defaultValue={selectedCar.carName} />
                </div>
                
                <div>
                  <Label>Car Number</Label>
                  <Input defaultValue={selectedCar.carNumber} />
                </div>
                
                <div>
                  <Label>Plate Number</Label>
                  <Input defaultValue={selectedCar.plateNumber} />
                </div>
                
                <div>
                  <Label>Car Color</Label>
                  <Input defaultValue={selectedCar.color} />
                </div>
                
                <div>
                  <Label>Color (Visual)</Label>
                  <div className="flex gap-2">
                    <Input type="color" className="w-20" defaultValue={selectedCar.colorHex} />
                    <Input placeholder="Hex code" defaultValue={selectedCar.colorHex} />
                  </div>
                </div>
                
                <div className="col-span-2">
                  <Label>Status</Label>
                  <Select defaultValue={selectedCar.status}>
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
                  alert('Car updated successfully!');
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
