import { prisma } from '@/lib/prisma';

/**
 * Activity Logger - Logs user actions for audit trail
 * Note: Requires activityLog table in database schema
 */

export interface ActivityLogEntry {
  userId: string;
  action: string;
  module: string;
  resourceId?: string;
  resourceName?: string;
  description?: string;
  changes?: Record<string, any>;
  status?: 'success' | 'failed';
  errorMessage?: string;
}

/**
 * Log an activity (currently disabled - table not in schema)
 */
export async function logActivity(entry: ActivityLogEntry): Promise<void> {
  try {
    console.log('Activity logged:', {
      userId: entry.userId,
      action: entry.action,
      module: entry.module,
      description: entry.description,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
