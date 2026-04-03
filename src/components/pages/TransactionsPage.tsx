import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Filter, Download, Eye } from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';

const mockTransactions = [
  {
    id: 'TXN-2341',
    buyer: 'Alice Johnson',
    seller: 'Bob Smith',
    item: 'Vintage Ferrari 250 GTO',
    amount: 125000,
    fee: 6250,
    netAmount: 118750,
    date: '2025-11-18',
    paymentMethod: 'Bank Transfer',
    status: 'completed',
  },
  {
    id: 'TXN-2340',
    buyer: 'Charlie Brown',
    seller: 'Diana Prince',
    item: 'Rolex Daytona 1963',
    amount: 45000,
    fee: 2250,
    netAmount: 42750,
    date: '2025-11-18',
    paymentMethod: 'Credit Card',
    status: 'completed',
  },
  {
    id: 'TXN-2339',
    buyer: 'Edward Norton',
    seller: 'Fiona Apple',
    item: 'Victorian Mahogany Desk',
    amount: 7800,
    fee: 390,
    netAmount: 7410,
    date: '2025-11-17',
    paymentMethod: 'Bank Transfer',
    status: 'completed',
  },
  {
    id: 'TXN-2338',
    buyer: 'George Martin',
    seller: 'Helen Mirren',
    item: 'Picasso Original Painting',
    amount: 445000,
    fee: 22250,
    netAmount: 422750,
    date: '2025-11-17',
    paymentMethod: 'Wire Transfer',
    status: 'pending',
  },
  {
    id: 'TXN-2337',
    buyer: 'Ian McKellen',
    seller: 'Jane Doe',
    item: 'First Edition Shakespeare',
    amount: 23000,
    fee: 1150,
    netAmount: 21850,
    date: '2025-11-16',
    paymentMethod: 'Bank Transfer',
    status: 'completed',
  },
  {
    id: 'TXN-2336',
    buyer: 'Kevin Hart',
    seller: 'Laura Palmer',
    item: 'Blue Diamond Necklace',
    amount: 567000,
    fee: 28350,
    netAmount: 538650,
    date: '2025-11-16',
    paymentMethod: 'Wire Transfer',
    status: 'completed',
  },
  {
    id: 'TXN-2335',
    buyer: 'Michael Scott',
    seller: 'Nancy Wheeler',
    item: 'Antique Clock',
    amount: 12500,
    fee: 625,
    netAmount: 11875,
    date: '2025-11-15',
    paymentMethod: 'Credit Card',
    status: 'failed',
  },
];

export function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredTransactions = mockTransactions.filter(txn => {
    const matchesSearch = 
      txn.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.buyer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.seller.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.item.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || txn.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = mockTransactions
    .filter(t => t.status === 'completed')
    .reduce((sum, txn) => sum + txn.amount, 0);
  
  const totalFees = mockTransactions
    .filter(t => t.status === 'completed')
    .reduce((sum, txn) => sum + txn.fee, 0);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search transactions..."
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
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Total Transactions</p>
          <p className="text-gray-900">{mockTransactions.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
          <p className="text-gray-900">${totalRevenue.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Total Fees</p>
          <p className="text-gray-900">${totalFees.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Pending</p>
          <p className="text-gray-900">
            {mockTransactions.filter(t => t.status === 'pending').length}
          </p>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Net Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="text-gray-900">{txn.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs">
                          {txn.buyer.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-gray-900">{txn.buyer}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs">
                          {txn.seller.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-gray-900">{txn.seller}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">{txn.item}</TableCell>
                  <TableCell className="text-gray-900">${txn.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-gray-600">${txn.fee.toLocaleString()}</TableCell>
                  <TableCell className="text-gray-900">${txn.netAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-gray-600">{txn.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{txn.paymentMethod}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      txn.status === 'completed' ? 'default' : 
                      txn.status === 'pending' ? 'secondary' : 
                      'outline'
                    }>
                      {txn.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      <Eye className="w-4 h-4" />
                    </Button>
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
