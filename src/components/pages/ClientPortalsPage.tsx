import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2, ExternalLink } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

const mockPortals = [
  {
    id: 1,
    name: 'Premium Automotive Portal',
    client: 'John Motors LLC',
    domain: 'autos.johnmotors.com',
    status: 'active',
    createdDate: '2024-01-15',
    auctions: 12,
    users: 234,
    theme: 'Dark',
  },
  {
    id: 2,
    name: 'Fine Arts Marketplace',
    client: 'Fine Arts Gallery',
    domain: 'marketplace.finearts.com',
    status: 'active',
    createdDate: '2024-02-20',
    auctions: 23,
    users: 456,
    theme: 'Light',
  },
  {
    id: 3,
    name: 'Heritage Auctions Portal',
    client: 'Heritage Auctions',
    domain: 'portal.heritage.com',
    status: 'active',
    createdDate: '2024-03-10',
    auctions: 34,
    users: 567,
    theme: 'Custom',
  },
  {
    id: 4,
    name: 'Luxury Watch Exchange',
    client: 'TimeCollectors Inc',
    domain: 'exchange.timecollectors.com',
    status: 'inactive',
    createdDate: '2023-11-05',
    auctions: 8,
    users: 123,
    theme: 'Dark',
  },
  {
    id: 5,
    name: 'Estate Sales Online',
    client: 'Heritage Estates',
    domain: 'online.heritageestates.com',
    status: 'active',
    createdDate: '2024-04-12',
    auctions: 19,
    users: 345,
    theme: 'Light',
  },
];

export function ClientPortalsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filteredPortals = mockPortals.filter(portal => {
    const matchesSearch = 
      portal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      portal.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      portal.domain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || portal.status === statusFilter;
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
              placeholder="Search portals..."
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
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Portal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Client Portal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Portal Name</Label>
                  <Input placeholder="Enter portal name" />
                </div>
                
                <div>
                  <Label>Client</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">John Motors LLC</SelectItem>
                      <SelectItem value="2">Fine Arts Gallery</SelectItem>
                      <SelectItem value="3">Heritage Auctions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Domain</Label>
                  <Input placeholder="portal.example.com" />
                </div>
                
                <div>
                  <Label>Theme</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
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
                  Create Portal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Total Portals</p>
          <p className="text-gray-900">{mockPortals.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Active Portals</p>
          <p className="text-gray-900">{mockPortals.filter(p => p.status === 'active').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Total Users</p>
          <p className="text-gray-900">{mockPortals.reduce((sum, p) => sum + p.users, 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Total Auctions</p>
          <p className="text-gray-900">{mockPortals.reduce((sum, p) => sum + p.auctions, 0)}</p>
        </Card>
      </div>

      {/* Portals Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Portal Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Auctions</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Theme</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPortals.map((portal) => (
                <TableRow key={portal.id}>
                  <TableCell className="text-gray-900">#{portal.id}</TableCell>
                  <TableCell className="text-gray-900">{portal.name}</TableCell>
                  <TableCell className="text-gray-600">{portal.client}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">{portal.domain}</span>
                      <Button variant="ghost" size="icon" className="w-6 h-6">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">{portal.auctions}</TableCell>
                  <TableCell className="text-gray-600">{portal.users}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{portal.theme}</Badge>
                  </TableCell>
                  <TableCell className="text-gray-600">{portal.createdDate}</TableCell>
                  <TableCell>
                    <Badge variant={portal.status === 'active' ? 'default' : 'secondary'}>
                      {portal.status}
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
