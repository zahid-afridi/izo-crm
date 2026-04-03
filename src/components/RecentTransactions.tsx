import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const transactions = [
  {
    id: 'TXN-2341',
    buyer: 'Alice Johnson',
    seller: 'Bob Smith',
    item: 'Vintage Car',
    amount: 125000,
    date: '2025-11-18',
    status: 'completed',
  },
  {
    id: 'TXN-2340',
    buyer: 'Charlie Brown',
    seller: 'Diana Prince',
    item: 'Luxury Watch',
    amount: 45000,
    date: '2025-11-18',
    status: 'completed',
  },
  {
    id: 'TXN-2339',
    buyer: 'Edward Norton',
    seller: 'Fiona Apple',
    item: 'Antique Chair',
    amount: 12500,
    date: '2025-11-17',
    status: 'completed',
  },
  {
    id: 'TXN-2338',
    buyer: 'George Martin',
    seller: 'Helen Mirren',
    item: 'Art Painting',
    amount: 89000,
    date: '2025-11-17',
    status: 'pending',
  },
  {
    id: 'TXN-2337',
    buyer: 'Ian McKellen',
    seller: 'Jane Doe',
    item: 'Rare Book',
    amount: 5600,
    date: '2025-11-16',
    status: 'completed',
  },
  {
    id: 'TXN-2336',
    buyer: 'Kevin Hart',
    seller: 'Laura Palmer',
    item: 'Diamond Ring',
    amount: 156000,
    date: '2025-11-16',
    status: 'completed',
  },
];

export function RecentTransactions() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-gray-900 mb-1">Recent Transactions</h3>
        <p className="text-sm text-gray-500">Latest completed and pending transactions</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((txn) => (
              <TableRow key={txn.id}>
                <TableCell className="text-gray-900">{txn.id}</TableCell>
                <TableCell className="text-gray-600">{txn.buyer}</TableCell>
                <TableCell className="text-gray-600">{txn.seller}</TableCell>
                <TableCell className="text-gray-900">{txn.item}</TableCell>
                <TableCell className="text-gray-900">${txn.amount.toLocaleString()}</TableCell>
                <TableCell className="text-gray-600">{txn.date}</TableCell>
                <TableCell>
                  <Badge variant={txn.status === 'completed' ? 'default' : 'secondary'}>
                    {txn.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
