import { Users, ShoppingCart, DollarSign, Package, TrendingUp, Building2 } from 'lucide-react';
import { Card } from './ui/card';

const stats = [
  {
    title: 'Total Users',
    value: '12,847',
    change: '+12.5%',
    trend: 'up',
    icon: Users,
    color: 'bg-brand-gradient',
    details: '8,421 Buyers • 4,426 Sellers'
  },
  {
    title: 'Active Auctions',
    value: '234',
    change: '+8.2%',
    trend: 'up',
    icon: ShoppingCart,
    color: 'bg-brand-gradient',
    details: '156 Live • 78 Scheduled'
  },
  {
    title: 'Total Revenue',
    value: '$1.2M',
    change: '+23.1%',
    trend: 'up',
    icon: DollarSign,
    color: 'bg-green-500',
    details: 'This month'
  },
  {
    title: 'Items Listed',
    value: '5,432',
    change: '+5.4%',
    trend: 'up',
    icon: Package,
    color: 'bg-orange-500',
    details: '3,214 Available'
  },
  {
    title: 'Client Portals',
    value: '89',
    change: '+15.3%',
    trend: 'up',
    icon: Building2,
    color: 'bg-pink-500',
    details: '67 Active'
  },
  {
    title: 'Avg. Bid Value',
    value: '$5,234',
    change: '+18.7%',
    trend: 'up',
    icon: TrendingUp,
    color: 'bg-cyan-500',
    details: 'Per auction'
  },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className={`text-xs px-2 py-1 rounded ${
                stat.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {stat.change}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
              <p className="text-gray-900 mb-1">{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.details}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
