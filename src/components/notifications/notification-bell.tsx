'use client';

/**
 * Notification Bell Component
 *
 * Displays a bell icon with unread count badge and a dropdown
 * panel showing recent notifications.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  FileText,
  Calendar,
  PenTool,
  ListTodo,
  MessageSquare,
  CalendarClock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { Notification } from '@/types/schema';

// ============================================================================
// TYPES
// ============================================================================

interface NotificationBellProps {
  tenantId: string;
  userId: string;
  onNavigate?: (url: string) => void;
}

type NotificationWithId = Notification & { id: string };

// ============================================================================
// HELPERS
// ============================================================================

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'meeting_reminder':
      return <CalendarClock className="h-4 w-4 text-blue-600" />;
    case 'document_shared':
      return <FileText className="h-4 w-4 text-purple-600" />;
    case 'signature_required':
      return <PenTool className="h-4 w-4 text-amber-600" />;
    case 'task_assigned':
      return <ListTodo className="h-4 w-4 text-green-600" />;
    case 'comment_added':
      return <MessageSquare className="h-4 w-4 text-cyan-600" />;
    case 'meeting_updated':
      return <Calendar className="h-4 w-4 text-orange-600" />;
    default:
      return <Bell className="h-4 w-4 text-gray-600" />;
  }
}

// ============================================================================
// NOTIFICATION ITEM
// ============================================================================

interface NotificationItemProps {
  notification: NotificationWithId;
  onRead: (id: string) => void;
  onNavigate?: (url: string) => void;
}

function NotificationItem({ notification, onRead, onNavigate }: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }
    if (onNavigate && notification.resourceUrl) {
      onNavigate(notification.resourceUrl);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors rounded-md',
        !notification.read && 'bg-primary/5'
      )}
    >
      <div className="shrink-0 mt-0.5">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', !notification.read && 'font-medium')}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.body}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {notification.createdAt?.toDate
            ? formatRelativeTime(notification.createdAt.toDate())
            : ''}
        </p>
      </div>
      {!notification.read && (
        <div className="shrink-0 mt-1">
          <div className="h-2 w-2 rounded-full bg-primary" />
        </div>
      )}
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NotificationBell({ tenantId, userId, onNavigate }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<NotificationWithId[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!tenantId || !userId) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/notifications?tenantId=${tenantId}&userId=${userId}&limit=20`
      );

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Silently fail - notification fetch is non-critical
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, userId]);

  const fetchUnreadCount = useCallback(async () => {
    if (!tenantId || !userId) return;

    try {
      const response = await fetch(
        `/api/notifications?tenantId=${tenantId}&userId=${userId}&countOnly=true`
      );

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Silently fail
    }
  }, [tenantId, userId]);

  // Poll for unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch full notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, notificationId }),
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, userId, markAll: true }),
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] flex items-center justify-center p-0 text-[10px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="max-h-[400px]">
          {isLoading && notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="p-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleMarkAsRead}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs w-full"
                onClick={() => {
                  setIsOpen(false);
                  onNavigate?.(`/dashboard/${tenantId}/notifications`);
                }}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationBell;
