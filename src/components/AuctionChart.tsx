import { Card } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { month: 'Jan', live: 45, completed: 120, scheduled: 23 },
  { month: 'Feb', live: 52, completed: 145, scheduled: 28 },
  { month: 'Mar', live: 48, completed: 135, scheduled: 31 },
  { month: 'Apr', live: 61, completed: 168, scheduled: 26 },
  { month: 'May', live: 55, completed: 152, scheduled: 34 },
  { month: 'Jun', live: 67, completed: 189, scheduled: 29 },
];

export function AuctionChart() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-gray-900 mb-1">Auction Activity</h3>
        <p className="text-sm text-gray-500">Live, completed, and scheduled auctions over time</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Bar dataKey="live" fill="#8b5cf6" name="Live Auctions" radius={[4, 4, 0, 0]} />
          <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
          <Bar dataKey="scheduled" fill="#f59e0b" name="Scheduled" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
