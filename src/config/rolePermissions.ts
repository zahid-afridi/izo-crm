// Role-based permissions configuration for IzoGrup CRM

export interface RolePermissions {
  role: string;
  label: string;
  allowedPages: string[];
  permissions: {
    canCreate: string[];
    canEdit: string[];
    canDelete: string[];
    canExport: string[];
    canApprove: string[];
    canView?: string[]; // Read-only access
  };
}

export const rolePermissions: Record<string, RolePermissions> = {
  admin: {
    role: 'admin',
    label: 'Administrator',
    allowedPages: [
      'dashboard',
      'products',
      'services',
      'sites',
      'workers',
      'assignments',
      'teams',
      'offers',
      'service-packages',
      'clients',
      'orders',
      'website-manager',
      'chat',
      'roles',
      'settings',
      'reports',
      'activity-log',
    ],
    permissions: {
      canCreate: ['all'],
      canEdit: ['all'],
      canDelete: ['all'],
      canExport: ['all'],
      canApprove: ['all'],
    },
  },

  product_manager: {
    role: 'product_manager',
    label: 'Product Manager',
    allowedPages: [
      'products',
      'chat',
    ],
    permissions: {
      canCreate: ['products', 'product-categories'],
      canEdit: ['products', 'product-categories'],
      canDelete: [], // Only admin can delete products
      canExport: ['products'], // Can generate product catalogs (PDF, Excel)
      canApprove: [],
    },
  },

  site_manager: {
    role: 'site_manager',
    label: 'Site Manager',
    allowedPages: [
      'dashboard',
      'sites',
      'workers',
      'assignments',
      'teams',
      'offers',
      'reports',
      'chat',
    ],
    permissions: {
      canCreate: ['assignments', 'teams'],
      canEdit: ['sites', 'assignments', 'teams', 'workers'],
      canDelete: ['assignments'],
      canExport: ['sites', 'workers', 'assignments', 'reports', 'offers'],
      canApprove: ['assignments'],
    },
  },

  offer_manager: {
    role: 'offer_manager',
    label: 'Offer Manager',
    allowedPages: [
      'dashboard',
      'offers',
      'service-packages',
      'clients',
      'products',
      'services',
      'reports',
      'chat',
    ],
    permissions: {
      canCreate: ['offers', 'service-packages', 'clients', 'offer-items', 'products'],
      canEdit: ['offers', 'service-packages', 'clients', 'offer-items', 'products'],
      canDelete: ['offers', 'service-packages', 'offer-items', 'products'],
      canExport: ['offers', 'clients', 'reports', 'products', 'services', 'service-packages'],
      canApprove: ['offers'],
    },
  },

  order_manager: {
    role: 'order_manager',
    label: 'Order Manager',
    allowedPages: [
      'dashboard',
      'orders',
      'offers',
      'clients',
      'products',
      'reports',
      'chat',
      'team-management',
      'order-management',
    ],
    permissions: {
      canCreate: ['orders', 'order-assignments'],
      canEdit: ['orders', 'order-status', 'order-processing', 'users', 'sales-agents', 'office-employees'],
      canDelete: [],
      canExport: ['orders', 'reports', 'users'],
      canApprove: ['orders', 'order-processing', 'order-modifications'],
      canView: ['clients', 'products'], // Read-only access to clients and products
    },
  },

  website_manager: {
    role: 'website_manager',
    label: 'Website Manager',
    allowedPages: [
      'dashboard',
      'website-manager',
      'products',
      'services',
      'service-packages',
      'chat',
      'reports',
    ],
    permissions: {
      canCreate: [],
      canEdit: ['website-manager'],
      canDelete: [],
      canExport: ['reports', 'products', 'services'],
      canApprove: ['website-content'],
    },
  },

  sales_agent: {
    role: 'sales_agent',
    label: 'Sales Agent',
    allowedPages: [
      'dashboard',
      'clients',
      'offers',
      'orders',
      'products',
      'services',
      'chat',
      'reports',
    ],
    permissions: {
      canCreate: ['clients', 'offers', 'orders'],
      canEdit: ['clients', 'offers', 'orders'],
      canDelete: [],
      canExport: ['clients', 'offers', 'orders'],
      canApprove: [],
    },
  },

  hr: {
    role: 'hr',
    label: 'HR',
    allowedPages: ['dashboard', 'workers', 'chat'],
    permissions: {
      canCreate: ['workers'],
      canEdit: ['workers'],
      canDelete: [],
      canExport: ['workers'],
      canApprove: [],
    },
  },

  office_employee: {
    role: 'office_employee',
    label: 'Office Employee',
    allowedPages: [
      'dashboard',
      'orders',
      'chat',
      'reports',
    ],
    permissions: {
      canCreate: [],
      canEdit: ['orders', 'order-status', 'order-processing', 'payment-status'],
      canDelete: [],
      canExport: ['orders', 'reports'],
      canApprove: ['order-processing', 'order-ready'],
    },
  },

  worker: {
    role: 'worker',
    label: 'Worker',
    allowedPages: [
      'workers',
      'chat',
    ],
    permissions: {
      canCreate: [],
      canEdit: [],
      canDelete: [],
      canExport: [],
      canApprove: [],
    },
  },
};

// Helper function to check if a user has permission
export const hasPermission = (
  userRole: string,
  action: 'create' | 'edit' | 'delete' | 'export' | 'approve' | 'view',
  resource: string
): boolean => {
  const role = rolePermissions[userRole];
  if (!role) return false;

  const actionKey = `can${action.charAt(0).toUpperCase()}${action.slice(1)}` as keyof typeof role.permissions;
  const permissions = role.permissions[actionKey];

  if (!permissions) return false;

  return permissions.includes('all') || permissions.includes(resource);
};

// Helper function to check if a user can access a page
export const canAccessPage = (userRole: string, page: string): boolean => {
  const role = rolePermissions[userRole];
  if (!role) return false;

  return role.allowedPages.includes(page);
};

// Get all allowed pages for a role
export const getAllowedPages = (userRole: string): string[] => {
  const role = rolePermissions[userRole];
  if (!role) return [];

  return role.allowedPages;
};

// Get role display information
export const getRoleInfo = (userRole: string) => {
  return rolePermissions[userRole] || null;
};

// Role descriptions for UI
export const roleDescriptions: Record<string, string> = {
  admin: 'Full system access with complete control over all modules and settings',
  product_manager: 'Manage product catalog, categories, and media. Generate product catalogs (PDF/Excel). No delete access - only disable products.',
  site_manager: 'Manage construction sites, workers, assignments, and teams',
  offer_manager: 'Create and manage offers, service packages, and offer items. Full control over offer workflow including PDF generation, email automation, and technical datasheet integration. Manage client relationships and service package components.',
  order_manager: 'Oversee Sales Agents and Office Employees in order creation and processing. Manage order workflow from creation to delivery. Approve, reject, or modify orders. Monitor order accuracy and ensure company standards. Read-only access to clients and products for verification purposes only.',
  website_manager: 'Control website content, product visibility, and SEO settings',
  sales_agent: 'Manage client relationships, create offers and orders. View-only access to products for order creation. Full control over sales pipeline and order management.',
  office_employee: 'Process orders received from Order Manager. Review invoices and order details. Update order status and payment status. Coordinate delivery and handle internal communication with Admin and Order Manager.',
  hr: 'Manage employee records, roles, and HR-related user data. Access chat for internal coordination.',
  worker: 'View assigned tasks, daily schedule, and site information',
};

// Get navigation menu items for a role
export const getMenuItems = (userRole: string) => {
  const role = rolePermissions[userRole];
  if (!role) return [];

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: 'dashboard' },
    { id: 'products', label: 'Products', icon: 'Package', path: 'products' },
    { id: 'services', label: 'Services', icon: 'Wrench', path: 'services' },
    { id: 'service-packages', label: 'Service Packages', icon: 'Package', path: 'service-packages' },
    { id: 'sites', label: 'Construction Sites', icon: 'Building2', path: 'sites' },
    { id: 'workers', label: 'Employees', icon: 'Users', path: 'workers' },
    { id: 'assignments', label: 'Assignments', icon: 'Calendar', path: 'assignments' },
    { id: 'teams', label: 'Teams', icon: 'Users', path: 'teams' },
    { id: 'offers', label: 'Offers', icon: 'FileText', path: 'offers' },
    { id: 'clients', label: 'Clients', icon: 'Building', path: 'clients' },
    { id: 'orders', label: 'Orders', icon: 'ShoppingCart', path: 'orders' },
    { id: 'order-management', label: 'Order Management', icon: 'CheckCircle', path: 'order-management' },
    { id: 'team-management', label: 'Team Management', icon: 'Users', path: 'team-management' },
    { id: 'website-manager', label: 'Website Manager', icon: 'Globe', path: 'website-manager' },
    { id: 'chat', label: 'Chat', icon: 'MessageSquare', path: 'chat' },
    { id: 'reports', label: 'Reports', icon: 'BarChart3', path: 'reports' },
    { id: 'activity-log', label: 'Activity Log', icon: 'Activity', path: 'activity-log' },
    { id: 'roles', label: 'Roles & Permissions', icon: 'Shield', path: 'roles' },
    { id: 'settings', label: 'Settings', icon: 'Settings', path: 'settings' },
  ];

  return allMenuItems.filter(item => role.allowedPages.includes(item.id));
};