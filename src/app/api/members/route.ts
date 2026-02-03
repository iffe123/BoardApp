import { NextRequest, NextResponse } from 'next/server';
import { collections, Timestamp } from '@/lib/firebase';
import { getDocs, addDoc, getDoc, query, orderBy } from 'firebase/firestore';
import type { Member } from '@/types/schema';
import { sendMemberInvitationEmail } from '@/lib/email-service';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// GET /api/members - List members for a tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    const role = searchParams.get('role');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // Build query
    const membersQuery = query(
      collections.members(tenantId),
      orderBy('joinedAt', 'desc')
    );

    const snapshot = await getDocs(membersQuery);
    let members: Member[] = [];

    snapshot.forEach((doc) => {
      members.push({
        id: doc.id,
        ...doc.data(),
      } as Member);
    });

    // Client-side filtering
    if (activeOnly) {
      members = members.filter((m) => m.isActive);
    }

    if (role && role !== 'all') {
      members = members.filter((m) => m.role === role);
    }

    return NextResponse.json({
      members,
      total: members.length,
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST /api/members - Invite a new member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      userId,
      email,
      role,
      title,
      department,
      invitedBy,
    } = body;

    // Validate required fields
    if (!tenantId || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Set default permissions based on role
    const getPermissions = (role: string) => {
      const permissionsByRole: Record<string, Member['permissions']> = {
        owner: {
          canCreateMeetings: true,
          canManageMembers: true,
          canAccessFinancials: true,
          canSignDocuments: true,
          canManageDocuments: true,
        },
        admin: {
          canCreateMeetings: true,
          canManageMembers: true,
          canAccessFinancials: true,
          canSignDocuments: true,
          canManageDocuments: true,
        },
        secretary: {
          canCreateMeetings: true,
          canManageMembers: false,
          canAccessFinancials: true,
          canSignDocuments: true,
          canManageDocuments: true,
        },
        chair: {
          canCreateMeetings: true,
          canManageMembers: false,
          canAccessFinancials: true,
          canSignDocuments: true,
          canManageDocuments: false,
        },
        director: {
          canCreateMeetings: false,
          canManageMembers: false,
          canAccessFinancials: true,
          canSignDocuments: true,
          canManageDocuments: false,
        },
        observer: {
          canCreateMeetings: false,
          canManageMembers: false,
          canAccessFinancials: false,
          canSignDocuments: false,
          canManageDocuments: false,
        },
        auditor: {
          canCreateMeetings: false,
          canManageMembers: false,
          canAccessFinancials: true,
          canSignDocuments: false,
          canManageDocuments: false,
        },
      };

      return permissionsByRole[role] || permissionsByRole.observer;
    };

    const member: Omit<Member, 'id'> = {
      tenantId,
      userId: userId || '', // Will be set when user accepts invitation
      role,
      title: title || '',
      department: department || '',
      permissions: getPermissions(role),
      conflicts: [],
      isActive: false, // Will be activated when user accepts
      invitedBy,
      invitedAt: Timestamp.now(),
      joinedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collections.members(tenantId), member);

    // Get tenant name for the email
    let organizationName = 'Your Organization';
    try {
      const tenantDoc = await getDoc(collections.tenant(tenantId));
      if (tenantDoc.exists()) {
        organizationName = tenantDoc.data().name || organizationName;
      }
    } catch {
      // Use default organization name
    }

    // Send invitation email
    const inviteUrl = `${APP_URL}/auth/signup?invite=${docRef.id}&tenant=${tenantId}&email=${encodeURIComponent(email)}`;

    const emailResult = await sendMemberInvitationEmail({
      recipientEmail: email,
      recipientName: title || '',
      organizationName,
      inviterName: invitedBy || 'A team member',
      role: role.charAt(0).toUpperCase() + role.slice(1), // Capitalize role
      inviteUrl,
    });

    return NextResponse.json({
      id: docRef.id,
      ...member,
      email, // Include email in response for reference
      emailSent: emailResult.success,
      emailError: emailResult.error,
    });
  } catch (error) {
    console.error('Error inviting member:', error);
    return NextResponse.json(
      { error: 'Failed to invite member' },
      { status: 500 }
    );
  }
}
