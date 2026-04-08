'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    module: string;
    type: string;
    data?: Record<string, unknown> | null;
    isRead: boolean;
    readAt?: string | null;
    createdAt: string;
}

interface NotificationsTabProps {
    workerId: string;
    onUnreadCountChange?: (count: number) => void;
}

export function NotificationsTab({ workerId: _workerId, onUnreadCountChange }: NotificationsTabProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchAndMarkRead = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await fetch('/api/notifications?limit=50');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            const fetched: Notification[] = data.notifications ?? [];
            setNotifications(fetched);

            const unreadCount = fetched.filter((n) => !n.isRead).length;
            onUnreadCountChange?.(unreadCount);

            // Mark all as read if there are unread ones
            if (unreadCount > 0) {
                await fetch('/api/notifications/mark-read', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ markAll: true }),
                });
                // Update local state to reflect read status
                setNotifications((prev) =>
                    prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
                );
                onUnreadCountChange?.(0);
            }
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [onUnreadCountChange]);

    useEffect(() => {
        fetchAndMarkRead();
    }, [fetchAndMarkRead]);

    if (loading) {
        return (
            <div className="py-8 text-center text-sm text-muted-foreground">
                Loading notifications...
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-8 text-center text-sm text-destructive">
                Failed to load notifications.
            </div>
        );
    }

    if (notifications.length === 0) {
        return (
            <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
                <BellOff className="h-10 w-10 opacity-30" />
                <p className="text-sm">No notifications yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2 p-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Bell className="h-4 w-4" />
                    <span>{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCheck className="h-3 w-3" />
                    <span>All read</span>
                </div>
            </div>

            {notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
            ))}
        </div>
    );
}

function NotificationItem({ notification }: { notification: Notification }) {
    const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

    return (
        <Card className={notification.isRead ? 'opacity-75' : 'border-blue-200 bg-blue-50/40'}>
            <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                    {/* Unread dot */}
                    <div className="mt-1.5 flex-shrink-0">
                        {!notification.isRead ? (
                            <span className="block h-2 w-2 rounded-full bg-blue-500" aria-label="Unread" />
                        ) : (
                            <span className="block h-2 w-2 rounded-full bg-transparent" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold leading-snug">{notification.title}</p>
                            <Badge variant="outline" className="text-xs shrink-0 capitalize">
                                {notification.module}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                            {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default NotificationsTab;
