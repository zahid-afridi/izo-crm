import { Card } from './ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'Jan', revenue: 125000, expenses: 45000 },
  { month: 'Feb', revenue: 145000, expenses: 52000 },
  { month: 'Mar', revenue: 168000, expenses: 48000 },
  { month: 'Apr', revenue: 189000, expenses: 55000 },
  { month: 'May', revenue: 215000, expenses: 61000 },
  { month: 'Jun', revenue: 245000, expenses: 58000 },
  { month: 'Jul', revenue: 268000, expenses: 64000 },
  { month: 'Aug', revenue: 289000, expenses: 67000 },
  { month: 'Sep', revenue: 312000, expenses: 71000 },
  { month: 'Oct', revenue: 345000, expenses: 74000 },
  { month: 'Nov', revenue: 378000, expenses: 78000 },
  { month: 'Dec', revenue: 412000, expenses: 82000 },
];

export function RevenueChart() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-gray-900 mb-1">Revenue & Expenses</h3>
        <p className="text-sm text-gray-500">Financial overview for the past year</p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
            formatter={(value: number) => `$${value.toLocaleString()}`}
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="#10b981" 
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
            strokeWidth={2}
          />
          <Area 
            type="monotone" 
            dataKey="expenses" 
            stroke="#ef4444" 
            fillOpacity={1} 
            fill="url(#colorExpenses)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
