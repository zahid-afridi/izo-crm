/**
 * Utility function to log activities to the database
 * Can be used from both client and server side
 */

export async function logActivity(params: {
  userId: string;
  action: string;
  module: string;
  description: string;
  entityId?: string;
  entityType?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  resourceId?: string;
  resourceName?: string;
  changes?: any;
}) {
  try {
    const {
      userId,
      action,
      module,
      description,
      entityId,
      entityType,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
    } = params;

    // Determine if we're on server or client
    const isServer = typeof window === 'undefined';
    const baseUrl = isServer ? process.env.NEXTAUTH_URL || 'http://localhost:3000' : '';
    const url = isServer ? `${baseUrl}/api/activity-logs` : '/api/activity-logs';

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        action,
        module,
        description,
        entityId: entityId,
        entityType: entityType,
        oldValues: oldValues,
        newValues: newValues,
        ipAddress: ipAddress,
        userAgent: userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
      }),
    });

    if (!response.ok) {
      console.error('Failed to log activity');
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// Predefined action types
export const ACTIVITY_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  VIEW: 'view',
  LOGIN: 'login',
  LOGOUT: 'logout',
  DOWNLOAD: 'download',
  EXPORT: 'export',
  IMPORT: 'import',
  PUBLISH: 'publish',
  UNPUBLISH: 'unpublish',
  APPROVE: 'approve',
  REJECT: 'reject',
  LOCK: 'lock',
  UNLOCK: 'unlock',
};

// Predefined module types
export const ACTIVITY_MODULES = {
  PRODUCTS: 'Products',
  SERVICES: 'Services',
  ORDERS: 'Orders',
  OFFERS: 'Offers',
  CLIENTS: 'Clients',
  WORKERS: 'Workers',
  SITES: 'Sites',
  CARS: 'Cars',
  TEAMS: 'Teams',
  ASSIGNMENTS: 'Assignments',
  WEBSITE: 'Website',
  SETTINGS: 'Settings',
  USERS: 'Users',
  REPORTS: 'Reports',
  AUTHENTICATION: 'Authentication',
};
