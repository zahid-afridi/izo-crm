import { useState } from 'react';
import { 
  Home, 
  Package, 
  Building2, 
  Users, 
  FileText, 
  ShoppingCart, 
  MessageSquare,
  Menu,
  X,
  Bell,
  Search,
  ChevronRight,
  Plus,
  Calendar,
  MapPin,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Wrench,
  Globe,
  BarChart3,
  Settings,
  LogOut,
  Store,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { MobileProductsView } from './MobileProductsView';
import { MobileAssignmentsView } from './MobileAssignmentsView';
import Image from 'next/image';
import Logo from '@/../public/logo.svg';
import { useAppSelector } from '@/store/hooks';
import { selectSettingsForShell } from '@/store/selectors/settingsSelectors';

interface MobileAppProps {
  userRole: string;
  onLogout: () => void;
  userName: string;
}

type MobileMainView =
  | 'home'
  | 'products'
  | 'sites'
  | 'offers'
  | 'orders'
  | 'assignments'
  | 'chat'
  | 'menu'
  | 'workers';

export function MobileApp({ userRole, onLogout, userName }: MobileAppProps) {
  const shell = useAppSelector(selectSettingsForShell);
  const companyTitle = shell.companyDisplayName?.trim() || 'IzoGrup';
  const companyTagline = shell.tagline?.trim() || 'Construction mangement system';

  // Set initial view based on role
  const getInitialView = (): MobileMainView => {
    if (userRole === 'product_manager') return 'products';
    return 'home';
  };

  const [currentView, setCurrentView] = useState<MobileMainView>(getInitialView());
  const [showMenu, setShowMenu] = useState(false);

  // Role-based menu items
  const getMenuItems = () => {
    const baseItems = [
      { id: 'home', label: 'Dashboard', icon: Home, roles: ['admin', 'site_manager', 'offer_manager', 'order_manager', 'website_manager', 'sales_agent', 'hr'] },
      { id: 'products', label: 'Products', icon: Package, roles: ['admin', 'product_manager', 'sales_agent', 'order_manager'] },
      { id: 'sites', label: 'Sites', icon: Building2, roles: ['admin', 'site_manager'] },
      { id: 'assignments', label: 'Assignments', icon: Calendar, roles: ['admin', 'site_manager'] },
      { id: 'workers', label: 'Team Management', icon: Users, roles: ['admin', 'site_manager', 'hr'] },
      { id: 'clients', label: 'Clients', icon: Store, roles: ['admin', 'offer_manager', 'sales_agent', 'order_manager'] },
      { id: 'offers', label: 'Offers', icon: FileText, roles: ['admin', 'offer_manager', 'sales_agent'] },
      { id: 'orders', label: 'Orders', icon: ShoppingCart, roles: ['admin', 'order_manager', 'sales_agent'] },
      { id: 'chat', label: 'Messages', icon: MessageSquare, roles: ['admin', 'product_manager', 'site_manager', 'offer_manager', 'order_manager', 'website_manager', 'sales_agent', 'hr'] },
    ];

    return baseItems.filter(item => item.roles.includes(userRole));
  };

  const menuItems = getMenuItems();

  const renderHeader = () => (
    <div className="bg-brand-gradient text-white p-4 sticky top-0 z-50 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setShowMenu(true)} className="p-2 hover:bg-white/10 rounded-lg">
          <Menu className="w-6 h-6" />
        </button>
        <div className="text-center flex-1">
          <h1 className="text-lg font-semibold">{companyTitle}</h1>
          <p className="text-xs opacity-90">{companyTagline}</p>
        </div>
        <button className="p-2 hover:bg-white/10 rounded-lg relative">
          <Bell className="w-6 h-6" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>
      
      {/* Search Bar */}
      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
        <Search className="w-4 h-4" />
        <Input 
          placeholder="Search..." 
          className="bg-transparent border-0 text-white placeholder:text-white/70 p-0 h-auto focus-visible:ring-0"
        />
      </div>
    </div>
  );

  const getRoleLabel = () => {
    const labels: Record<string, string> = {
      admin: 'Administrator',
      product_manager: 'Product Manager',
      site_manager: 'Site Manager',
      offer_manager: 'Offer Manager',
      order_manager: 'Order Manager',
      website_manager: 'Website Manager',
      hr: 'HR',
    };
    return labels[userRole] || userRole;
  };

  const renderDashboard = () => {
    // Role-specific dashboard cards
    const getStatsCards = () => {
      if (userRole === 'admin') {
        return [
          { label: 'Active Sites', value: '12', icon: Building2, color: 'bg-brand-gradient', change: '+2' },
          { label: 'Total Products', value: '156', icon: Package, color: 'bg-green-500', change: '+8' },
          { label: 'Total Offers', value: '23', icon: FileText, color: 'bg-orange-500', change: '+5' },
          { label: 'Active Orders', value: '34', icon: ShoppingCart, color: 'bg-brand-gradient', change: '+12' },
        ];
      } else if (userRole === 'product_manager') {
        return [
          { label: 'Total Products', value: '156', icon: Package, color: 'bg-brand-gradient', change: '+8' },
          { label: 'Published', value: '142', icon: Globe, color: 'bg-green-500', change: '+3' },
          { label: 'Draft', value: '14', icon: AlertCircle, color: 'bg-orange-500', change: '-2' },
          { label: 'Categories', value: '12', icon: BarChart3, color: 'bg-brand-gradient', change: '0' },
        ];
      } else if (userRole === 'site_manager') {
        return [
          { label: 'Active Sites', value: '12', icon: Building2, color: 'bg-brand-gradient', change: '+2' },
          { label: 'Workers', value: '120', icon: Users, color: 'bg-green-500', change: '+5' },
          { label: 'Assignments', value: '45', icon: Calendar, color: 'bg-orange-500', change: '+8' },
          { label: 'Teams', value: '8', icon: Users, color: 'bg-brand-gradient', change: '+1' },
        ];
      } else if (userRole === 'offer_manager') {
        return [
          { label: 'Total Offers', value: '89', icon: FileText, color: 'bg-brand-gradient', change: '+12' },
          { label: 'Pending', value: '23', icon: Clock, color: 'bg-orange-500', change: '+5' },
          { label: 'Approved', value: '56', icon: CheckCircle, color: 'bg-green-500', change: '+7' },
          { label: 'Clients', value: '45', icon: Building2, color: 'bg-brand-gradient', change: '+3' },
        ];
      } else if (userRole === 'order_manager') {
        return [
          { label: 'Active Orders', value: '34', icon: ShoppingCart, color: 'bg-brand-gradient', change: '+12' },
          { label: 'Processing', value: '12', icon: Clock, color: 'bg-orange-500', change: '+4' },
          { label: 'Completed', value: '156', icon: CheckCircle, color: 'bg-green-500', change: '+8' },
          { label: 'Revenue', value: '€45k', icon: TrendingUp, color: 'bg-brand-gradient', change: '+15%' },
        ];
      } else if (userRole === 'website_manager') {
        return [
          { label: 'Published', value: '142', icon: Globe, color: 'bg-blue-500', change: '+3' },
          { label: 'Services', value: '24', icon: Wrench, color: 'bg-green-500', change: '+2' },
          { label: 'Packages', value: '18', icon: Package, color: 'bg-orange-500', change: '+1' },
          { label: 'Visitors', value: '2.4k', icon: TrendingUp, color: 'bg-brand-gradient', change: '+12%' },
        ];
      } else if (userRole === 'hr') {
        return [
          { label: 'Employees', value: '—', icon: Users, color: 'bg-brand-gradient', change: '' },
          { label: 'Active', value: '—', icon: CheckCircle, color: 'bg-green-500', change: '' },
          { label: 'On leave', value: '—', icon: Clock, color: 'bg-orange-500', change: '' },
          { label: 'New hires', value: '—', icon: Plus, color: 'bg-blue-500', change: '' },
        ];
      }
      return [];
    };

    const statsCards = getStatsCards();

    return (
      <div className="p-4 space-y-4 pb-24">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          {statsCards.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {stat.change}
                  </Badge>
                </div>
                <p className="text-2xl text-gray-900 mb-1">{stat.value}</p>
                <p className="text-xs text-gray-600">{stat.label}</p>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-gray-900 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {getQuickActions().map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={() => action.onClick()}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <Icon className="w-6 h-6 text-blue-600 mb-2" />
                  <p className="text-sm text-gray-900">{action.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-900">Recent Activity</h3>
            <button className="text-sm text-blue-600">View All</button>
          </div>
          <div className="space-y-2">
            {getRecentActivity().map((activity, idx) => {
              const Icon = activity.icon;
              return (
                <Card key={idx} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={`${activity.color} w-8 h-8 rounded-full flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const getQuickActions = () => {
    if (userRole === 'admin') {
      return [
        { label: 'Add Site', icon: Plus, onClick: () => setCurrentView('sites') },
        { label: 'Add Product', icon: Package, onClick: () => setCurrentView('products') },
        { label: 'View Reports', icon: BarChart3, onClick: () => {} },
        { label: 'Settings', icon: Settings, onClick: () => {} },
      ];
    } else if (userRole === 'product_manager') {
      return [
        { label: 'Add Product', icon: Plus, onClick: () => setCurrentView('products') },
        { label: 'Categories', icon: BarChart3, onClick: () => {} },
        { label: 'Upload Media', icon: Package, onClick: () => {} },
        { label: 'Export Catalog', icon: Settings, onClick: () => {} },
      ];
    } else if (userRole === 'site_manager') {
      return [
        { label: 'View Sites', icon: Building2, onClick: () => setCurrentView('sites') },
        { label: 'Assignments', icon: Calendar, onClick: () => setCurrentView('assignments') },
        { label: 'Workers', icon: Users, onClick: () => {} },
        { label: 'Reports', icon: BarChart3, onClick: () => {} },
      ];
    } else if (userRole === 'offer_manager') {
      return [
        { label: 'New Offer', icon: Plus, onClick: () => setCurrentView('offers') },
        { label: 'View Offers', icon: FileText, onClick: () => setCurrentView('offers') },
        { label: 'Clients', icon: Building2, onClick: () => {} },
        { label: 'Reports', icon: BarChart3, onClick: () => {} },
      ];
    } else if (userRole === 'order_manager') {
      return [
        { label: 'New Order', icon: Plus, onClick: () => setCurrentView('orders') },
        { label: 'View Orders', icon: ShoppingCart, onClick: () => setCurrentView('orders') },
        { label: 'Reports', icon: BarChart3, onClick: () => {} },
        { label: 'Settings', icon: Settings, onClick: () => {} },
      ];
    } else if (userRole === 'website_manager') {
      return [
        { label: 'Content', icon: Globe, onClick: () => {} },
        { label: 'Products', icon: Package, onClick: () => setCurrentView('products') },
        { label: 'Services', icon: Wrench, onClick: () => {} },
        { label: 'Analytics', icon: BarChart3, onClick: () => {} },
      ];
    } else if (userRole === 'hr') {
      return [
        { label: 'Employees', icon: Users, onClick: () => setCurrentView('workers') },
        { label: 'Messages', icon: MessageSquare, onClick: () => setCurrentView('chat') },
      ];
    }
    return [];
  };

  const getRecentActivity = () => {
    if (userRole === 'admin') {
      return [
        { title: 'New site created: Villa Project', time: '5 min ago', icon: Building2, color: 'bg-blue-500' },
        { title: 'Product updated: PVC Membrane', time: '23 min ago', icon: Package, color: 'bg-green-500' },
        { title: 'Offer approved: Client ABC', time: '1 hour ago', icon: CheckCircle, color: 'bg-green-500' },
      ];
    } else if (userRole === 'product_manager') {
      return [
        { title: 'Product updated: PVC Membrane', time: '23 min ago', icon: Package, color: 'bg-green-500' },
        { title: 'New product added: TPO System', time: '2 hours ago', icon: Plus, color: 'bg-blue-500' },
        { title: 'Category created: Waterproofing', time: '3 hours ago', icon: BarChart3, color: 'bg-brand-gradient' },
      ];
    } else if (userRole === 'site_manager') {
      return [
        { title: 'New assignment: Site A', time: '10 min ago', icon: Calendar, color: 'bg-orange-500' },
        { title: 'Worker checked in: John Doe', time: '25 min ago', icon: CheckCircle, color: 'bg-green-500' },
        { title: 'Site status updated: Villa Project', time: '1 hour ago', icon: Building2, color: 'bg-blue-500' },
      ];
    } else if (userRole === 'offer_manager') {
      return [
        { title: 'Offer approved: Client XYZ', time: '15 min ago', icon: CheckCircle, color: 'bg-green-500' },
        { title: 'New offer created: Office Building', time: '45 min ago', icon: Plus, color: 'bg-blue-500' },
        { title: 'Client added: Construction Co.', time: '2 hours ago', icon: Building2, color: 'bg-brand-gradient' },
      ];
    } else if (userRole === 'order_manager') {
      return [
        { title: 'Order completed: #12345', time: '20 min ago', icon: CheckCircle, color: 'bg-green-500' },
        { title: 'New order: #12346', time: '1 hour ago', icon: Plus, color: 'bg-blue-500' },
        { title: 'Payment received: Client ABC', time: '3 hours ago', icon: TrendingUp, color: 'bg-green-500' },
      ];
    } else if (userRole === 'website_manager') {
      return [
        { title: 'Product published: New System', time: '30 min ago', icon: Globe, color: 'bg-blue-500' },
        { title: 'Content updated: Homepage', time: '1 hour ago', icon: Wrench, color: 'bg-orange-500' },
        { title: 'Service added: Installation', time: '2 hours ago', icon: Plus, color: 'bg-green-500' },
      ];
    } else if (userRole === 'hr') {
      return [
        { title: 'Employee record updated', time: '30 min ago', icon: Users, color: 'bg-brand-gradient' },
        { title: 'New hire onboarding', time: '2 hours ago', icon: Plus, color: 'bg-green-500' },
      ];
    }
    return [];
  };

  const renderSideMenu = () => (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity ${
          showMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowMenu(false)}
      />
      
      {/* Menu */}
      <div 
        className={`fixed left-0 top-0 h-full w-80 bg-white z-50 shadow-2xl transition-transform ${
          showMenu ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Menu Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl">Menu</h2>
            <button onClick={() => setShowMenu(false)} className="p-1 hover:bg-white/10 rounded">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Image src={Logo} width={48} height={48} alt={`${companyTitle} Logo`} className="rounded-full"/>
            <div>
              <p className="font-medium">{userName}</p>
              <p className="text-sm opacity-90">{getRoleLabel()}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id as any);
                  setShowMenu(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  currentView === item.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );

  const renderBottomNav = () => {
    const navItems = menuItems.slice(0, 5);
    
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex items-center justify-around p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as any)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''}`} />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">
      {renderHeader()}
      {renderSideMenu()}
      
      {/* Main Content */}
      {currentView === 'home' && renderDashboard()}
      {currentView === 'products' && (
        <div className="p-4">
          <MobileProductsView />
        </div>
      )}
      {currentView === 'sites' && (
        <div className="p-4 pb-24">
          <h2 className="text-xl text-gray-900 mb-4">Construction Sites</h2>
          <p className="text-gray-600">Sites management view coming soon...</p>
        </div>
      )}
      {currentView === 'assignments' && (
        <MobileAssignmentsView userRole={userRole} />
      )}
      {currentView === 'workers' && (
        <div className="p-4 pb-24">
          <h2 className="text-xl text-gray-900 mb-4">Employees</h2>
          <p className="text-gray-600">Open the desktop app for full employee management.</p>
        </div>
      )}
      {currentView === 'offers' && (
        <div className="p-4 pb-24">
          <h2 className="text-xl text-gray-900 mb-4">Offers</h2>
          <p className="text-gray-600">Offers management view coming soon...</p>
        </div>
      )}
      {currentView === 'orders' && (
        <div className="p-4 pb-24">
          <h2 className="text-xl text-gray-900 mb-4">Orders</h2>
          <p className="text-gray-600">Orders management view coming soon...</p>
        </div>
      )}
      {currentView === 'chat' && (
        <div className="p-4 pb-24">
          <h2 className="text-xl text-gray-900 mb-4">Messages</h2>
          <p className="text-gray-600">Chat view coming soon...</p>
        </div>
      )}
      
      {renderBottomNav()}
    </div>
  );
}