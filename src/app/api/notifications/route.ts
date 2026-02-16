import { NextRequest, NextResponse } from 'next/server';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/lib/notification-service';

// GET /api/notifications - Get notifications for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const userId = searchParams.get('userId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const countOnly = searchParams.get('countOnly') === 'true';
    const limitParam = searchParams.get('limit');

    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'tenantId and userId are required' },
        { status: 400 }
      );
    }

    if (countOnly) {
      const count = await getUnreadCount(tenantId, userId);
      return NextResponse.json({ unreadCount: count });
    }

    const notifications = await getUserNotifications(tenantId, userId, {
      unreadOnly,
      limit: limitParam ? parseInt(limitParam, 10) : 50,
    });

    const unreadCount = await getUnreadCount(tenantId, userId);

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Notification fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark notification(s) as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, userId, notificationId, markAll } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    if (markAll && userId) {
      const count = await markAllAsRead(tenantId, userId);
      return NextResponse.json({ success: true, markedAsRead: count });
    }

    if (notificationId) {
      await markAsRead(tenantId, notificationId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Either notificationId or markAll with userId is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update notification' },
      { status: 500 }
    );
  }
}
