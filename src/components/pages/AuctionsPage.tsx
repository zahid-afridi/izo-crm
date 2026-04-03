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
import { Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

const mockAuctions = [
  {
    id: 1,
    title: 'Vintage Car Collection',
    seller: 'John Motors LLC',
    startDate: '2025-11-20',
    endDate: '2025-11-25',
    startingBid: 100000,
    currentBid: 125000,
    totalBids: 34,
    status: 'live',
    items: 5,
  },
  {
    id: 2,
    title: 'Luxury Watch Set',
    seller: 'TimeCollectors Inc',
    startDate: '2025-11-19',
    endDate: '2025-11-24',
    startingBid: 30000,
    currentBid: 45000,
    totalBids: 28,
    status: 'live',
    items: 12,
  },
  {
    id: 3,
    title: 'Antique Furniture',
    seller: 'Heritage Auctions',
    startDate: '2025-11-18',
    endDate: '2025-11-23',
    startingBid: 50000,
    currentBid: 78000,
    totalBids: 52,
    status: 'live',
    items: 8,
  },
  {
    id: 4,
    title: 'Art Collection',
    seller: 'Fine Arts Gallery',
    startDate: '2025-11-21',
    endDate: '2025-11-26',
    startingBid: 120000,
    currentBid: 156000,
    totalBids: 67,
    status: 'scheduled',
    items: 15,
  },
  {
    id: 5,
    title: 'Estate Sale Items',
    seller: 'Heritage Estates',
    startDate: '2025-11-10',
    endDate: '2025-11-15',
    startingBid: 25000,
    currentBid: 42000,
    totalBids: 45,
    status: 'completed',
    items: 20,
  },
];

export function AuctionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filteredAuctions = mockAuctions.filter(auction => {
    const matchesSearch = auction.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         auction.seller.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || auction.status === statusFilter;
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
              placeholder="Search auctions..."
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
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Auction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Auction</DialogTitle>
              <DialogDescription>
                Set up a new auction with details and timeline
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Auction Title</Label>
                  <Input placeholder="Enter auction title" />
                </div>
                
                <div>
                  <Label>Seller</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select seller" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">John Motors LLC</SelectItem>
                      <SelectItem value="2">TimeCollectors Inc</SelectItem>
                      <SelectItem value="3">Heritage Auctions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" />
                </div>
                
                <div>
                  <Label>End Date</Label>
                  <Input type="date" />
                </div>
                
                <div>
                  <Label>Starting Bid</Label>
                  <Input type="number" placeholder="0.00" />
                </div>
                
                <div>
                  <Label>Reserve Price</Label>
                  <Input type="number" placeholder="0.00" />
                </div>
                
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Enter auction description" rows={4} />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(false)}>
                  Create Auction
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Total Auctions</p>
          <p className="text-gray-900">{mockAuctions.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Live Auctions</p>
          <p className="text-gray-900">{mockAuctions.filter(a => a.status === 'live').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Scheduled</p>
          <p className="text-gray-900">{mockAuctions.filter(a => a.status === 'scheduled').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Completed</p>
          <p className="text-gray-900">{mockAuctions.filter(a => a.status === 'completed').length}</p>
        </Card>
      </div>

      {/* Auctions Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Starting Bid</TableHead>
                <TableHead>Current Bid</TableHead>
                <TableHead>Bids</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAuctions.map((auction) => (
                <TableRow key={auction.id}>
                  <TableCell className="text-gray-900">#{auction.id}</TableCell>
                  <TableCell className="text-gray-900">{auction.title}</TableCell>
                  <TableCell className="text-gray-600">{auction.seller}</TableCell>
                  <TableCell className="text-gray-600">{auction.startDate}</TableCell>
                  <TableCell className="text-gray-600">{auction.endDate}</TableCell>
                  <TableCell className="text-gray-900">${auction.startingBid.toLocaleString()}</TableCell>
                  <TableCell className="text-gray-900">${auction.currentBid.toLocaleString()}</TableCell>
                  <TableCell className="text-gray-600">{auction.totalBids}</TableCell>
                  <TableCell className="text-gray-600">{auction.items}</TableCell>
                  <TableCell>
                    <Badge variant={
                      auction.status === 'live' ? 'default' : 
                      auction.status === 'scheduled' ? 'secondary' : 
                      'outline'
                    }>
                      {auction.status}
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