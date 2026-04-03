import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { TrendingUp, TrendingDown } from 'lucide-react';

const items = [
  {
    id: 'ITM-567',
    name: 'Vintage Ferrari 250 GTO',
    category: 'Automobiles',
    views: 5643,
    bids: 89,
    avgBid: 234000,
    trend: 'up',
    change: '+34%',
  },
  {
    id: 'ITM-568',
    name: 'Rolex Daytona 1963',
    category: 'Watches',
    views: 4521,
    bids: 67,
    avgBid: 156000,
    trend: 'up',
    change: '+28%',
  },
  {
    id: 'ITM-569',
    name: 'Picasso Original Painting',
    category: 'Art',
    views: 3892,
    bids: 52,
    avgBid: 445000,
    trend: 'up',
    change: '+42%',
  },
  {
    id: 'ITM-570',
    name: 'Antique Victorian Desk',
    category: 'Furniture',
    views: 2341,
    bids: 34,
    avgBid: 45000,
    trend: 'down',
    change: '-8%',
  },
  {
    id: 'ITM-571',
    name: 'First Edition Shakespeare',
    category: 'Books',
    views: 1987,
    bids: 28,
    avgBid: 78000,
    trend: 'up',
    change: '+15%',
  },
  {
    id: 'ITM-572',
    name: 'Blue Diamond Necklace',
    category: 'Jewelry',
    views: 6234,
    bids: 94,
    avgBid: 567000,
    trend: 'up',
    change: '+51%',
  },
];

export function TopItems() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-gray-900 mb-1">Top Performing Items</h3>
        <p className="text-sm text-gray-500">Most viewed and bid items</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Total Bids</TableHead>
              <TableHead>Avg. Bid</TableHead>
              <TableHead>Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-gray-900">{item.id}</TableCell>
                <TableCell className="text-gray-900">{item.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{item.category}</Badge>
                </TableCell>
                <TableCell className="text-gray-600">{item.views.toLocaleString()}</TableCell>
                <TableCell className="text-gray-600">{item.bids}</TableCell>
                <TableCell className="text-gray-900">${item.avgBid.toLocaleString()}</TableCell>
                <TableCell>
                  <div className={`flex items-center gap-1 ${
                    item.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="text-sm">{item.change}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
