import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Filter, TrendingUp, TrendingDown, CheckCircle, XCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';

const mockBids = [
  {
    id: 1,
    bidder: 'Alice Johnson',
    item: 'Vintage Ferrari 250 GTO',
    auction: 'Vintage Car Collection',
    amount: 125000,
    timestamp: '2025-11-18 14:30:22',
    status: 'leading',
    isAutobid: false,
  },
  {
    id: 2,
    bidder: 'Charlie Brown',
    item: 'Rolex Daytona 1963',
    auction: 'Luxury Watch Set',
    amount: 45000,
    timestamp: '2025-11-18 14:25:15',
    status: 'leading',
    isAutobid: true,
  },
  {
    id: 3,
    bidder: 'Edward Norton',
    item: 'Victorian Mahogany Desk',
    auction: 'Antique Furniture',
    amount: 7800,
    timestamp: '2025-11-18 14:20:08',
    status: 'leading',
    isAutobid: false,
  },
  {
    id: 4,
    bidder: 'Alice Johnson',
    item: 'Vintage Ferrari 250 GTO',
    auction: 'Vintage Car Collection',
    amount: 120000,
    timestamp: '2025-11-18 14:15:45',
    status: 'outbid',
    isAutobid: false,
  },
  {
    id: 5,
    bidder: 'George Martin',
    item: 'Picasso Original Painting',
    auction: 'Art Collection',
    amount: 445000,
    timestamp: '2025-11-18 14:10:30',
    status: 'won',
    isAutobid: false,
  },
  {
    id: 6,
    bidder: 'Kevin Hart',
    item: 'Blue Diamond Necklace',
    auction: 'Fine Jewelry',
    amount: 567000,
    timestamp: '2025-11-18 14:05:18',
    status: 'leading',
    isAutobid: true,
  },
  {
    id: 7,
    bidder: 'Charlie Brown',
    item: 'Rolex Daytona 1963',
    auction: 'Luxury Watch Set',
    amount: 42000,
    timestamp: '2025-11-18 14:00:12',
    status: 'outbid',
    isAutobid: false,
  },
  {
    id: 8,
    bidder: 'Diana Prince',
    item: 'First Edition Shakespeare',
    auction: 'Rare Books',
    amount: 23000,
    timestamp: '2025-11-18 13:55:05',
    status: 'leading',
    isAutobid: false,
  },
];

export function BidsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredBids = mockBids.filter(bid => {
    const matchesSearch = 
      bid.bidder.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bid.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bid.auction.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bid.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalBidsValue = mockBids.reduce((sum, bid) => sum + bid.amount, 0);
  const leadingBids = mockBids.filter(b => b.status === 'leading').length;
  const wonBids = mockBids.filter(b => b.status === 'won').length;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1 flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search bids..."
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
              <SelectItem value="leading">Leading</SelectItem>
              <SelectItem value="outbid">Outbid</SelectItem>
              <SelectItem value="won">Won</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Total Bids</p>
          <p className="text-gray-900">{mockBids.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Leading Bids</p>
          <p className="text-gray-900">{leadingBids}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Won Bids</p>
          <p className="text-gray-900">{wonBids}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Total Value</p>
          <p className="text-gray-900">${totalBidsValue.toLocaleString()}</p>
        </Card>
      </div>

      {/* Bids Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bid ID</TableHead>
                <TableHead>Bidder</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Auction</TableHead>
                <TableHead>Bid Amount</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBids.map((bid) => (
                <TableRow key={bid.id}>
                  <TableCell className="text-gray-900">#{bid.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {bid.bidder.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-gray-900">{bid.bidder}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-900">{bid.item}</TableCell>
                  <TableCell className="text-gray-600">{bid.auction}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900">${bid.amount.toLocaleString()}</span>
                      {bid.status === 'leading' && (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      )}
                      {bid.status === 'outbid' && (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">{bid.timestamp}</TableCell>
                  <TableCell>
                    <Badge variant={bid.isAutobid ? 'secondary' : 'outline'}>
                      {bid.isAutobid ? 'Auto' : 'Manual'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {bid.status === 'leading' && (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <Badge variant="default">Leading</Badge>
                        </>
                      )}
                      {bid.status === 'outbid' && (
                        <>
                          <XCircle className="w-4 h-4 text-red-600" />
                          <Badge variant="secondary">Outbid</Badge>
                        </>
                      )}
                      {bid.status === 'won' && (
                        <>
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                          <Badge>Won</Badge>
                        </>
                      )}
                    </div>
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
