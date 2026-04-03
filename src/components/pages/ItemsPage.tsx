import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

const mockItems = [
  {
    id: 1,
    name: 'Vintage Ferrari 250 GTO',
    category: 'Automobiles',
    condition: 'Excellent',
    startingPrice: 100000,
    currentBid: 125000,
    auction: 'Vintage Car Collection',
    status: 'active',
    views: 5643,
    bids: 89,
  },
  {
    id: 2,
    name: 'Rolex Daytona 1963',
    category: 'Watches',
    condition: 'Very Good',
    startingPrice: 30000,
    currentBid: 45000,
    auction: 'Luxury Watch Set',
    status: 'active',
    views: 4521,
    bids: 67,
  },
  {
    id: 3,
    name: 'Victorian Mahogany Desk',
    category: 'Furniture',
    condition: 'Good',
    startingPrice: 5000,
    currentBid: 7800,
    auction: 'Antique Furniture',
    status: 'active',
    views: 2341,
    bids: 34,
  },
  {
    id: 4,
    name: 'Picasso Original Painting',
    category: 'Art',
    condition: 'Excellent',
    startingPrice: 200000,
    currentBid: 445000,
    auction: 'Art Collection',
    status: 'sold',
    views: 8921,
    bids: 156,
  },
  {
    id: 5,
    name: 'First Edition Shakespeare',
    category: 'Books',
    condition: 'Fair',
    startingPrice: 15000,
    currentBid: 0,
    auction: 'Rare Books',
    status: 'pending',
    views: 1234,
    bids: 0,
  },
];

export function ItemsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filteredItems = mockItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Automobiles">Automobiles</SelectItem>
              <SelectItem value="Watches">Watches</SelectItem>
              <SelectItem value="Furniture">Furniture</SelectItem>
              <SelectItem value="Art">Art</SelectItem>
              <SelectItem value="Books">Books</SelectItem>
              <SelectItem value="Jewelry">Jewelry</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Item Name</Label>
                  <Input placeholder="Enter item name" />
                </div>
                
                <div>
                  <Label>Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automobiles">Automobiles</SelectItem>
                      <SelectItem value="watches">Watches</SelectItem>
                      <SelectItem value="furniture">Furniture</SelectItem>
                      <SelectItem value="art">Art</SelectItem>
                      <SelectItem value="books">Books</SelectItem>
                      <SelectItem value="jewelry">Jewelry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Condition</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="very-good">Very Good</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Starting Price</Label>
                  <Input type="number" placeholder="0.00" />
                </div>
                
                <div>
                  <Label>Reserve Price</Label>
                  <Input type="number" placeholder="0.00" />
                </div>
                
                <div>
                  <Label>Auction</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select auction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Vintage Car Collection</SelectItem>
                      <SelectItem value="2">Luxury Watch Set</SelectItem>
                      <SelectItem value="3">Antique Furniture</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Status</Label>
                  <Select defaultValue="pending">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Enter item description" rows={4} />
                </div>
                
                <div className="col-span-2">
                  <Label>Images</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <ImageIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(false)}>
                  Add Item
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Total Items</p>
          <p className="text-gray-900">{mockItems.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Active Items</p>
          <p className="text-gray-900">{mockItems.filter(i => i.status === 'active').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Sold Items</p>
          <p className="text-gray-900">{mockItems.filter(i => i.status === 'sold').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Pending Items</p>
          <p className="text-gray-900">{mockItems.filter(i => i.status === 'pending').length}</p>
        </Card>
      </div>

      {/* Items Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Starting Price</TableHead>
                <TableHead>Current Bid</TableHead>
                <TableHead>Auction</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Bids</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-gray-900">#{item.id}</TableCell>
                  <TableCell className="text-gray-900">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category}</Badge>
                  </TableCell>
                  <TableCell className="text-gray-600">{item.condition}</TableCell>
                  <TableCell className="text-gray-900">${item.startingPrice.toLocaleString()}</TableCell>
                  <TableCell className="text-gray-900">
                    {item.currentBid > 0 ? `$${item.currentBid.toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell className="text-gray-600">{item.auction}</TableCell>
                  <TableCell className="text-gray-600">{item.views.toLocaleString()}</TableCell>
                  <TableCell className="text-gray-600">{item.bids}</TableCell>
                  <TableCell>
                    <Badge variant={
                      item.status === 'active' ? 'default' : 
                      item.status === 'sold' ? 'secondary' : 
                      'outline'
                    }>
                      {item.status}
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
