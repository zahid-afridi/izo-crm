import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Shield, Users, Edit, Eye, Plus } from 'lucide-react';

interface RolesPageProps {
  userRole: string;
}

const mockRoles = [
  {
    id: 1,
    name: 'Admin',
    description: 'Full system access',
    userCount: 2,
    permissions: ['all'],
    color: 'red',
  },
  {
    id: 2,
    name: 'Product Manager',
    description: 'Manage products and catalog',
    userCount: 3,
    permissions: ['products.view', 'products.edit', 'products.create'],
    color: 'blue',
  },
  {
    id: 3,
    name: 'Site Manager',
    description: 'Manage construction sites and workers',
    userCount: 4,
    permissions: ['sites.view', 'sites.edit', 'workers.view', 'workers.manage'],
    color: 'green',
  },
  {
    id: 4,
    name: 'Offer Manager',
    description: 'Create and manage offers',
    userCount: 2,
    permissions: ['offers.view', 'offers.create', 'offers.edit', 'clients.view'],
    color: 'purple',
  },
  {
    id: 5,
    name: 'Sales Agent',
    description: 'Handle sales and client orders',
    userCount: 5,
    permissions: ['products.view', 'clients.view', 'orders.view', 'orders.create'],
    color: 'yellow',
  },
  {
    id: 6,
    name: 'Order Manager',
    description: 'Process and manage orders',
    userCount: 3,
    permissions: ['orders.view', 'orders.edit', 'orders.process', 'products.view'],
    color: 'cyan',
  },
  {
    id: 7,
    name: 'Office Employee',
    description: 'General office operations',
    userCount: 4,
    permissions: ['dashboard.view', 'orders.view', 'clients.view'],
    color: 'gray',
  },
  {
    id: 8,
    name: 'Worker',
    description: 'Field workers with mobile access',
    userCount: 18,
    permissions: ['mobile.access', 'sites.view', 'tasks.view'],
    color: 'orange',
  },
];

const allPermissions = {
  'Dashboard': ['dashboard.view', 'dashboard.edit'],
  'Products': ['products.view', 'products.create', 'products.edit', 'products.delete', 'products.publish'],
  'Sites': ['sites.view', 'sites.create', 'sites.edit', 'sites.delete'],
  'Workers': ['workers.view', 'workers.create', 'workers.manage', 'workers.delete'],
  'Offers': ['offers.view', 'offers.create', 'offers.edit', 'offers.delete', 'offers.send'],
  'Clients': ['clients.view', 'clients.create', 'clients.edit', 'clients.delete'],
  'Orders': ['orders.view', 'orders.create', 'orders.edit', 'orders.process', 'orders.delete'],
  'Website': ['website.manage', 'website.publish', 'website.settings'],
  'Reports': ['reports.view', 'reports.export'],
  'System': ['users.manage', 'roles.manage', 'settings.edit', 'logs.view'],
};

export function RolesPage({ userRole }: RolesPageProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);

  const canEdit = userRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Roles & Permissions</h1>
          <p className="text-sm text-gray-500 mt-1">Manage user roles and access permissions</p>
        </div>
        {canEdit && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Role Name</Label>
                    <Input placeholder="Enter role name" />
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Description</Label>
                    <Input placeholder="Brief description of this role" />
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <Label className="mb-3 block">Permissions</Label>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {Object.entries(allPermissions).map(([category, permissions]) => (
                      <div key={category} className="border rounded-lg p-4">
                        <h4 className="text-gray-900 mb-3">{category}</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {permissions.map((permission) => (
                            <div key={permission} className="flex items-center space-x-2">
                              <Checkbox id={permission} />
                              <label htmlFor={permission} className="text-sm text-gray-600 cursor-pointer">
                                {permission.split('.')[1]}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(false)}>
                    Create Role
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Total Roles</p>
          <p className="text-gray-900">{mockRoles.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Total Users</p>
          <p className="text-gray-900">{mockRoles.reduce((sum, r) => sum + r.userCount, 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Admin Users</p>
          <p className="text-gray-900">{mockRoles.find(r => r.name === 'Admin')?.userCount || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Field Workers</p>
          <p className="text-gray-900">{mockRoles.find(r => r.name === 'Worker')?.userCount || 0}</p>
        </Card>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockRoles.map((role) => (
          <Card key={role.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 bg-${role.color}-100 rounded-lg flex items-center justify-center`}>
                  <Shield className={`w-6 h-6 text-${role.color}-600`} />
                </div>
                <div>
                  <h3 className="text-gray-900">{role.name}</h3>
                  <p className="text-sm text-gray-500">{role.description}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{role.userCount} users</span>
            </div>
            
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Permissions:</p>
              <div className="flex flex-wrap gap-1">
                {role.permissions.slice(0, 3).map((perm) => (
                  <Badge key={perm} variant="secondary" className="text-xs">
                    {perm.split('.')[0]}
                  </Badge>
                ))}
                {role.permissions.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{role.permissions.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" size="sm" className="flex-1">
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
              {canEdit && (
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Detailed Permissions Table */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-gray-900">Permission Matrix</h3>
          <p className="text-sm text-gray-500 mt-1">Overview of permissions across all roles</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission</TableHead>
                {mockRoles.slice(0, 5).map((role) => (
                  <TableHead key={role.id}>{role.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(allPermissions).slice(0, 6).map(([category, permissions]) => (
                permissions.slice(0, 2).map((permission) => (
                  <TableRow key={permission}>
                    <TableCell className="text-gray-900">
                      {category}: {permission.split('.')[1]}
                    </TableCell>
                    {mockRoles.slice(0, 5).map((role) => (
                      <TableCell key={role.id}>
                        {role.permissions.includes('all') || role.permissions.includes(permission) ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">✓</Badge>
                        ) : (
                          <Badge variant="secondary">-</Badge>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
