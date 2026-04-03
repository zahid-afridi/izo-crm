import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const auctions = [
  {
    id: 'AUC-001',
    title: 'Vintage Car Collection',
    seller: 'John Motors LLC',
    currentBid: 125000,
    bids: 34,
    status: 'live',
    timeLeft: '2h 34m',
  },
  {
    id: 'AUC-002',
    title: 'Luxury Watch Set',
    seller: 'TimeCollectors Inc',
    currentBid: 45000,
    bids: 28,
    status: 'live',
    timeLeft: '5h 12m',
  },
  {
    id: 'AUC-003',
    title: 'Antique Furniture',
    seller: 'Heritage Auctions',
    currentBid: 78000,
    bids: 52,
    status: 'live',
    timeLeft: '1h 45m',
  },
  {
    id: 'AUC-004',
    title: 'Art Collection',
    seller: 'Fine Arts Gallery',
    currentBid: 156000,
    bids: 67,
    status: 'scheduled',
    timeLeft: 'Starts in 3h',
  },
  {
    id: 'AUC-005',
    title: 'Rare Books',
    seller: 'BookWorld Auctions',
    currentBid: 23000,
    bids: 19,
    status: 'live',
    timeLeft: '45m',
  },
  {
    id: 'AUC-006',
    title: 'Diamond Jewelry',
    seller: 'Luxury Gems Co',
    currentBid: 234000,
    bids: 89,
    status: 'live',
    timeLeft: '6h 22m',
  },
];

export function RecentAuctions() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-gray-900 mb-1">Recent Auctions</h3>
        <p className="text-sm text-gray-500">Latest auction activities and status</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Auction ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead>Current Bid</TableHead>
              <TableHead>Bids</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Time Left</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auctions.map((auction) => (
              <TableRow key={auction.id}>
                <TableCell className="text-gray-900">{auction.id}</TableCell>
                <TableCell className="text-gray-900">{auction.title}</TableCell>
                <TableCell className="text-gray-600">{auction.seller}</TableCell>
                <TableCell className="text-gray-900">${auction.currentBid.toLocaleString()}</TableCell>
                <TableCell className="text-gray-600">{auction.bids}</TableCell>
                <TableCell>
                  <Badge variant={auction.status === 'live' ? 'default' : 'secondary'}>
                    {auction.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-600">{auction.timeLeft}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
