import { Card } from './ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { month: 'Jan', buyers: 7245, sellers: 3821 },
  { month: 'Feb', buyers: 7456, sellers: 3923 },
  { month: 'Mar', buyers: 7689, sellers: 4012 },
  { month: 'Apr', buyers: 7854, sellers: 4145 },
  { month: 'May', buyers: 8123, sellers: 4289 },
  { month: 'Jun', buyers: 8421, sellers: 4426 },
];

export function UserGrowthChart() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-gray-900 mb-1">User Growth</h3>
        <p className="text-sm text-gray-500">Buyers and sellers registration trends</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
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
          <Line 
            type="monotone" 
            dataKey="buyers" 
            stroke="#3b82f6" 
            strokeWidth={3}
            name="Buyers"
            dot={{ r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="sellers" 
            stroke="#ec4899" 
            strokeWidth={3}
            name="Sellers"
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
