// Role-based permissions system
export const PERMISSIONS = {
  admin: {
    users: ['create', 'read', 'update', 'delete', 'disable', 'assign_role'],
    products: ['create', 'read', 'update', 'delete', 'publish', 'bulk_update'],
    services: ['create', 'read', 'update', 'delete', 'publish', 'bulk_update'],
    sites: ['create', 'read', 'update', 'delete'],
    workers: ['create', 'read', 'update', 'delete', 'disable', 'track_location'],
    offers: ['create', 'read', 'update', 'delete'],
    orders: ['create', 'read', 'update', 'delete'],
    clients: ['create', 'read', 'update', 'delete'],
    shops: ['create', 'read', 'update', 'delete'],
    projects: ['create', 'read', 'update', 'delete', 'publish'],
    teams: ['create', 'read', 'update', 'delete'],
    cars: ['create', 'read', 'update', 'delete', 'disable'],
    assignments: ['create', 'read', 'update', 'delete'],
    reports: ['generate', 'export'],
    website: ['manage_all'],
    chat: ['create', 'read', 'approve', 'delete'],
    notifications: ['send', 'manage'],
    settings: ['manage'],
    activity_logs: ['read'],
  },
  
  website_manager: {
    products: ['create', 'read', 'update', 'delete', 'publish', 'bulk_update'],
    services: ['create', 'read', 'update', 'delete', 'publish', 'bulk_update'],
    projects: ['create', 'read', 'update', 'delete', 'publish'],
    website: ['manage_all'],
    chat: ['create', 'read'],
  },
  
  product_manager: {
    products: ['create', 'read', 'update', 'disable'],
    chat: ['create', 'read'],
  },
  
  hr: {
    workers: ['create', 'read', 'update', 'disable'],
    chat: ['create', 'read'],
  },

  site_manager: {
    sites: ['create', 'read', 'update', 'disable'],
    workers: ['create', 'read', 'update', 'disable'],
    cars: ['create', 'read', 'update', 'disable'],
    assignments: ['create', 'read', 'update', 'delete', 'finalize', 'export'],
    teams: ['read'],
    offers: ['read', 'export'],
    reports: ['generate', 'export'],
    chat: ['create', 'read'],
  },
  
  offer_manager: {
    offers: ['create', 'read', 'update', 'delete', 'export', 'generate_pdf', 'email', 'track'],
    offer_items: ['create', 'read', 'update', 'delete'],
    service_packages: ['create', 'read', 'update', 'delete'],
    clients: ['create', 'read', 'update'],
    products: ['create', 'read', 'update', 'delete_own'],
    reports: ['generate', 'export'],
    chat: ['create', 'read'],
  },
  
  order_manager: {
    orders: ['create', 'read', 'update', 'delete', 'approve', 'reject', 'modify', 'track'],
    users: ['read', 'assign_tasks', 'monitor'],
    clients: ['read'],
    products: ['read'],
    reports: ['generate', 'export'],
    chat: ['create', 'read'],
  },
  
  sales_agent: {
    orders: ['create', 'read', 'update_own', 'export', 'track'],
    clients: ['create', 'read'],
    products: ['read'],
    reports: ['generate', 'export'],
    chat: ['create', 'read'],
  },
  
  office_employee: {
    orders: ['read', 'update', 'process', 'track'],
    clients: ['read'],
    products: ['read'],
    chat: ['create', 'read'],
  },
  
  worker: {
    assignments: ['read'],
    attendance: ['update'],
    chat: ['create', 'read'],
  },
  
  website_user: {
    products: ['read', 'search', 'view_details'],
    services: ['read', 'search', 'view_details'],
    projects: ['read', 'view_details'],
    cart: ['add', 'checkout'],
    contact: ['submit'],
  },
};

export function hasPermission(role: string, module: string, action: string): boolean {
  const rolePermissions = PERMISSIONS[role as keyof typeof PERMISSIONS];
  if (!rolePermissions) return false;
  
  const modulePermissions = rolePermissions[module as keyof typeof rolePermissions] as string[] | undefined;
  if (!modulePermissions) return false;
  
  return modulePermissions.includes(action);
}

export function checkPermission(role: string, module: string, action: string) {
  if (!hasPermission(role, module, action)) {
    throw new Error(`Permission denied: ${role} cannot ${action} ${module}`);
  }
}

// Default chat permissions
export const CHAT_PERMISSIONS = {
  // Workers can always chat with team members and site manager
  worker: {
    canChatWith: ['worker', 'site_manager', 'admin', 'hr'],
    requiresApproval: true,
    defaultApproved: ['site_manager', 'admin', 'hr'],
  },

  hr: {
    canChatWith: ['admin', 'site_manager', 'worker', 'office_employee', 'order_manager', 'sales_agent'],
    requiresApproval: false,
  },
  
  sales_agent: {
    canChatWith: ['order_manager', 'office_employee', 'admin'],
    requiresApproval: true,
    defaultApproved: ['admin'],
  },
  
  office_employee: {
    canChatWith: ['order_manager', 'sales_agent', 'admin'],
    requiresApproval: false,
  },
  
  site_manager: {
    canChatWith: ['worker', 'admin', 'hr'],
    requiresApproval: false,
  },
  
  offer_manager: {
    canChatWith: ['admin'],
    requiresApproval: false,
  },
  
  product_manager: {
    canChatWith: ['admin'],
    requiresApproval: false,
  },
  
  order_manager: {
    canChatWith: ['sales_agent', 'office_employee', 'admin'],
    requiresApproval: false,
  },
  
  website_manager: {
    canChatWith: ['admin'],
    requiresApproval: false,
  },
  
  admin: {
    canChatWith: ['*'],
    requiresApproval: false,
  },
};

export function canInitiateChat(fromRole: string, toRole: string): { allowed: boolean; requiresApproval: boolean } {
  const permissions = CHAT_PERMISSIONS[fromRole as keyof typeof CHAT_PERMISSIONS] as any;
  
  if (!permissions) {
    return { allowed: false, requiresApproval: false };
  }
  
  if (permissions.canChatWith.includes('*') || permissions.canChatWith.includes(toRole)) {
    const requiresApproval = permissions.requiresApproval && 
      !(permissions.defaultApproved && permissions.defaultApproved.includes(toRole));
    
    return { allowed: true, requiresApproval };
  }
  
  return { allowed: false, requiresApproval: false };
}
