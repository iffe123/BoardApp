/**
 * Email Service for GovernanceOS
 *
 * Handles sending email notifications for:
 * - Member invitations
 * - Meeting invites (with calendar attachments)
 * - Notifications (reminders, updates, etc.)
 *
 * Uses a provider-agnostic approach with support for:
 * - Resend (recommended for production)
 * - SMTP (for self-hosted)
 * - Mock provider (for development)
 */

// Email configuration from environment
const EMAIL_CONFIG = {
  provider: process.env.EMAIL_PROVIDER || 'mock', // 'resend', 'smtp', 'mock'
  fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@governanceos.app',
  fromName: process.env.EMAIL_FROM_NAME || 'GovernanceOS',
  resendApiKey: process.env.RESEND_API_KEY,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: parseInt(process.env.SMTP_PORT || '587'),
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};

// ============================================================================
// TYPES
// ============================================================================

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string;
  contentType: string;
}

export interface SendEmailOptions {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export interface MemberInviteEmailData {
  recipientName: string;
  recipientEmail: string;
  organizationName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
  customMessage?: string;
}

export interface MeetingInviteEmailData {
  recipientName: string;
  recipientEmail: string;
  meetingTitle: string;
  meetingType: string;
  organizationName: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  timezone: string;
  location: {
    type: 'physical' | 'virtual' | 'hybrid';
    address?: string;
    videoConferenceUrl?: string;
  };
  meetingUrl: string;
  calendarAttachment?: string; // iCal content
}

export interface ReminderEmailData {
  recipientName: string;
  recipientEmail: string;
  meetingTitle: string;
  scheduledStart: Date;
  timezone: string;
  meetingUrl: string;
  hoursUntilMeeting: number;
}

// ============================================================================
// EMAIL TEMPLATES HTML
// ============================================================================

function getBaseEmailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GovernanceOS</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo h1 {
      color: #0f172a;
      font-size: 24px;
      margin: 0;
    }
    .button {
      display: inline-block;
      background: #0f172a;
      color: #ffffff !important;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background: #1e293b;
    }
    .details-box {
      background: #f8fafc;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      margin: 8px 0;
    }
    .detail-label {
      font-weight: 600;
      color: #64748b;
      width: 100px;
    }
    .detail-value {
      color: #1a1a1a;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #64748b;
      font-size: 12px;
    }
    .footer a {
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>GovernanceOS</h1>
      </div>
      ${content}
    </div>
    <div class="footer">
      <p>
        This email was sent by GovernanceOS.<br>
        <a href="${EMAIL_CONFIG.appUrl}">Visit GovernanceOS</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateMemberInviteEmail(data: MemberInviteEmailData): { html: string; text: string } {
  const content = `
    <h2 style="margin-top: 0;">You're Invited to Join ${data.organizationName}</h2>
    <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
    <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong> on GovernanceOS as a <strong>${data.role}</strong>.</p>
    ${data.customMessage ? `<p style="font-style: italic; border-left: 3px solid #e2e8f0; padding-left: 16px;">"${data.customMessage}"</p>` : ''}
    <p>GovernanceOS is an AI-native board governance platform that helps organizations run efficient board meetings, manage documents, and make better decisions.</p>
    <div style="text-align: center;">
      <a href="${data.inviteUrl}" class="button">Accept Invitation</a>
    </div>
    <p style="color: #64748b; font-size: 14px;">This invitation will expire in 7 days. If you have any questions, please contact the person who invited you.</p>
  `;

  const text = `
You're Invited to Join ${data.organizationName}

Hello${data.recipientName ? ` ${data.recipientName}` : ''},

${data.inviterName} has invited you to join ${data.organizationName} on GovernanceOS as a ${data.role}.

${data.customMessage ? `"${data.customMessage}"` : ''}

Accept your invitation: ${data.inviteUrl}

This invitation will expire in 7 days.

---
GovernanceOS - AI-Native Board Governance Platform
  `.trim();

  return {
    html: getBaseEmailTemplate(content),
    text,
  };
}

export function generateMeetingInviteEmail(data: MeetingInviteEmailData): { html: string; text: string } {
  const formattedDate = data.scheduledStart.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = `${data.scheduledStart.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${data.scheduledEnd.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })} (${data.timezone})`;

  const locationText = data.location.type === 'virtual'
    ? `Virtual Meeting${data.location.videoConferenceUrl ? ` - <a href="${data.location.videoConferenceUrl}">Join Video Call</a>` : ''}`
    : data.location.type === 'hybrid'
    ? `Hybrid: ${data.location.address || 'Address TBD'}${data.location.videoConferenceUrl ? ` + <a href="${data.location.videoConferenceUrl}">Video Link</a>` : ''}`
    : data.location.address || 'Location TBD';

  const content = `
    <h2 style="margin-top: 0;">Meeting Invitation: ${data.meetingTitle}</h2>
    <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
    <p>You are invited to a <strong>${data.meetingType.replace('_', ' ')}</strong> meeting for <strong>${data.organizationName}</strong>.</p>

    <div class="details-box">
      <div style="margin-bottom: 12px;">
        <div style="color: #64748b; font-size: 12px; text-transform: uppercase;">Date</div>
        <div style="font-weight: 600;">${formattedDate}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="color: #64748b; font-size: 12px; text-transform: uppercase;">Time</div>
        <div style="font-weight: 600;">${formattedTime}</div>
      </div>
      <div>
        <div style="color: #64748b; font-size: 12px; text-transform: uppercase;">Location</div>
        <div style="font-weight: 600;">${locationText}</div>
      </div>
    </div>

    <div style="text-align: center;">
      <a href="${data.meetingUrl}" class="button">View Meeting Details</a>
    </div>

    <p style="color: #64748b; font-size: 14px;">
      A calendar invitation has been attached to this email. Add it to your calendar to receive reminders.
    </p>
  `;

  const text = `
Meeting Invitation: ${data.meetingTitle}

Hello${data.recipientName ? ` ${data.recipientName}` : ''},

You are invited to a ${data.meetingType.replace('_', ' ')} meeting for ${data.organizationName}.

Date: ${formattedDate}
Time: ${formattedTime}
Location: ${data.location.type === 'virtual' ? 'Virtual Meeting' : data.location.address || 'TBD'}
${data.location.videoConferenceUrl ? `Video Link: ${data.location.videoConferenceUrl}` : ''}

View meeting details: ${data.meetingUrl}

A calendar invitation is attached to this email.

---
GovernanceOS - AI-Native Board Governance Platform
  `.trim();

  return {
    html: getBaseEmailTemplate(content),
    text,
  };
}

export function generateReminderEmail(data: ReminderEmailData): { html: string; text: string } {
  const formattedDate = data.scheduledStart.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = data.scheduledStart.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const timeUntil = data.hoursUntilMeeting < 24
    ? `${data.hoursUntilMeeting} hour${data.hoursUntilMeeting !== 1 ? 's' : ''}`
    : `${Math.round(data.hoursUntilMeeting / 24)} day${Math.round(data.hoursUntilMeeting / 24) !== 1 ? 's' : ''}`;

  const content = `
    <h2 style="margin-top: 0;">Reminder: ${data.meetingTitle}</h2>
    <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
    <p>This is a reminder that your meeting starts in <strong>${timeUntil}</strong>.</p>

    <div class="details-box">
      <div style="margin-bottom: 12px;">
        <div style="color: #64748b; font-size: 12px; text-transform: uppercase;">Meeting</div>
        <div style="font-weight: 600;">${data.meetingTitle}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="color: #64748b; font-size: 12px; text-transform: uppercase;">Date</div>
        <div style="font-weight: 600;">${formattedDate}</div>
      </div>
      <div>
        <div style="color: #64748b; font-size: 12px; text-transform: uppercase;">Time</div>
        <div style="font-weight: 600;">${formattedTime} (${data.timezone})</div>
      </div>
    </div>

    <div style="text-align: center;">
      <a href="${data.meetingUrl}" class="button">View Meeting</a>
    </div>
  `;

  const text = `
Reminder: ${data.meetingTitle}

Hello${data.recipientName ? ` ${data.recipientName}` : ''},

This is a reminder that your meeting starts in ${timeUntil}.

Meeting: ${data.meetingTitle}
Date: ${formattedDate}
Time: ${formattedTime} (${data.timezone})

View meeting: ${data.meetingUrl}

---
GovernanceOS - AI-Native Board Governance Platform
  `.trim();

  return {
    html: getBaseEmailTemplate(content),
    text,
  };
}

// ============================================================================
// EMAIL SENDING
// ============================================================================

async function sendWithResend(options: SendEmailOptions): Promise<EmailResult> {
  if (!EMAIL_CONFIG.resendApiKey) {
    return { success: false, error: 'Resend API key not configured' };
  }

  try {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EMAIL_CONFIG.resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${EMAIL_CONFIG.fromName} <${EMAIL_CONFIG.fromAddress}>`,
        to: recipients.map(r => r.name ? `${r.name} <${r.email}>` : r.email),
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
        cc: options.cc?.map(r => r.email),
        bcc: options.bcc?.map(r => r.email),
        attachments: options.attachments?.map(a => ({
          filename: a.filename,
          content: Buffer.from(a.content).toString('base64'),
          type: a.contentType,
        })),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to send email' };
    }

    return { success: true, messageId: data.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email'
    };
  }
}

async function sendWithMock(options: SendEmailOptions): Promise<EmailResult> {
  // Mock provider for development - logs email details
  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  console.log('📧 [MOCK EMAIL SERVICE]');
  console.log('To:', recipients.map(r => r.email).join(', '));
  console.log('Subject:', options.subject);
  console.log('Attachments:', options.attachments?.length || 0);
  console.log('---');

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    success: true,
    messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`
  };
}

export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  switch (EMAIL_CONFIG.provider) {
    case 'resend':
      return sendWithResend(options);
    case 'mock':
    default:
      return sendWithMock(options);
  }
}

// ============================================================================
// HIGH-LEVEL EMAIL FUNCTIONS
// ============================================================================

export async function sendMemberInvitationEmail(
  data: MemberInviteEmailData
): Promise<EmailResult> {
  const { html, text } = generateMemberInviteEmail(data);

  return sendEmail({
    to: { email: data.recipientEmail, name: data.recipientName },
    subject: `You're invited to join ${data.organizationName} on GovernanceOS`,
    html,
    text,
  });
}

export async function sendMeetingInvitationEmail(
  data: MeetingInviteEmailData
): Promise<EmailResult> {
  const { html, text } = generateMeetingInviteEmail(data);

  const attachments: EmailAttachment[] = [];

  // Add calendar attachment if provided
  if (data.calendarAttachment) {
    attachments.push({
      filename: 'invite.ics',
      content: data.calendarAttachment,
      contentType: 'text/calendar; method=REQUEST',
    });
  }

  return sendEmail({
    to: { email: data.recipientEmail, name: data.recipientName },
    subject: `Meeting Invitation: ${data.meetingTitle}`,
    html,
    text,
    attachments,
  });
}

export async function sendMeetingReminderEmail(
  data: ReminderEmailData
): Promise<EmailResult> {
  const { html, text } = generateReminderEmail(data);

  return sendEmail({
    to: { email: data.recipientEmail, name: data.recipientName },
    subject: `Reminder: ${data.meetingTitle} starts in ${data.hoursUntilMeeting} hours`,
    html,
    text,
  });
}

// Batch send meeting invitations to multiple attendees
export async function sendBulkMeetingInvitations(
  attendees: Array<{ email: string; name?: string }>,
  meetingData: Omit<MeetingInviteEmailData, 'recipientEmail' | 'recipientName'>
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = await Promise.allSettled(
    attendees.map(attendee =>
      sendMeetingInvitationEmail({
        ...meetingData,
        recipientEmail: attendee.email,
        recipientName: attendee.name || '',
      })
    )
  );

  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      sent++;
    } else {
      failed++;
      const error = result.status === 'rejected'
        ? result.reason
        : result.value.error;
      errors.push(`${attendees[index]?.email}: ${error}`);
    }
  });

  return { sent, failed, errors };
}

// ============================================================================
// ADDITIONAL EMAIL TYPES
// ============================================================================

export interface DocumentShareEmailData {
  recipientName: string;
  recipientEmail: string;
  documentName: string;
  sharedByName: string;
  organizationName: string;
  documentUrl: string;
  description?: string;
}

export interface SignatureRequestEmailData {
  recipientName: string;
  recipientEmail: string;
  documentTitle: string;
  requestedByName: string;
  signUrl: string;
}

export interface TaskReminderEmailData {
  recipientName: string;
  recipientEmail: string;
  taskTitle: string;
  dueDate: Date;
  meetingTitle: string;
  dashboardUrl: string;
}

export interface MinutesReadyEmailData {
  recipientName: string;
  recipientEmail: string;
  meetingTitle: string;
  meetingDate: Date;
  minutesUrl: string;
  organizationName: string;
}

// ============================================================================
// ADDITIONAL EMAIL TEMPLATES
// ============================================================================

export function generateDocumentShareEmail(data: DocumentShareEmailData): { html: string; text: string } {
  const content = `
    <h2 style="margin-top: 0;">Document Shared with You</h2>
    <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
    <p><strong>${data.sharedByName}</strong> has shared a document with you from <strong>${data.organizationName}</strong>.</p>

    <div class="details-box">
      <div style="margin-bottom: 12px;">
        <div style="color: #64748b; font-size: 12px; text-transform: uppercase;">Document</div>
        <div style="font-weight: 600;">${data.documentName}</div>
      </div>
      ${data.description ? `
      <div>
        <div style="color: #64748b; font-size: 12px; text-transform: uppercase;">Description</div>
        <div>${data.description}</div>
      </div>
      ` : ''}
    </div>

    <div style="text-align: center;">
      <a href="${data.documentUrl}" class="button">View Document</a>
    </div>
  `;

  const text = `
Document Shared with You

Hello${data.recipientName ? ` ${data.recipientName}` : ''},

${data.sharedByName} has shared a document with you from ${data.organizationName}.

Document: ${data.documentName}
${data.description ? `Description: ${data.description}` : ''}

View document: ${data.documentUrl}

---
GovernanceOS - AI-Native Board Governance Platform
  `.trim();

  return {
    html: getBaseEmailTemplate(content),
    text,
  };
}

export function generateSignatureRequestEmail(data: SignatureRequestEmailData): { html: string; text: string } {
  const content = `
    <h2 style="margin-top: 0;">Signature Required</h2>
    <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
    <p><strong>${data.requestedByName}</strong> has requested your digital signature on:</p>

    <div class="details-box">
      <div>
        <div style="color: #64748b; font-size: 12px; text-transform: uppercase;">Document</div>
        <div style="font-weight: 600;">${data.documentTitle}</div>
      </div>
    </div>

    <p>Please sign the document using BankID.</p>

    <div style="text-align: center;">
      <a href="${data.signUrl}" class="button">Sign with BankID</a>
    </div>

    <p style="color: #64748b; font-size: 14px;">
      This signature request uses BankID for secure digital signatures that are legally binding under Swedish law.
    </p>
  `;

  const text = `
Signature Required

Hello${data.recipientName ? ` ${data.recipientName}` : ''},

${data.requestedByName} has requested your digital signature on:

Document: ${data.documentTitle}

Please sign the document using BankID: ${data.signUrl}

---
GovernanceOS - AI-Native Board Governance Platform
  `.trim();

  return {
    html: getBaseEmailTemplate(content),
    text,
  };
}

export function generateTaskReminderEmail(data: TaskReminderEmailData): { html: string; text: string } {
  const formattedDate = data.dueDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const content = `
    <h2 style="margin-top: 0; color: #f59e0b;">Task Due Soon</h2>
    <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
    <p>This is a reminder that you have a task due soon:</p>

    <div class="details-box">
      <div style="margin-bottom: 12px;">
        <div style="color: #64748b; font-size: 12px; text-transform: uppercase;">Task</div>
        <div style="font-weight: 600;">${data.taskTitle}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="color: #64748b; font-size: 12px; text-transform: uppercase;">Due Date</div>
        <div style="font-weight: 600; color: #f59e0b;">${formattedDate}</div>
      </div>
      <div>
        <div style="color: #64748b; font-size: 12px; text-transform: uppercase;">From Meeting</div>
        <div>${data.meetingTitle}</div>
      </div>
    </div>

    <div style="text-align: center;">
      <a href="${data.dashboardUrl}" class="button">View Task</a>
    </div>
  `;

  const text = `
Task Due Soon

Hello${data.recipientName ? ` ${data.recipientName}` : ''},

This is a reminder that you have a task due soon:

Task: ${data.taskTitle}
Due Date: ${formattedDate}
From Meeting: ${data.meetingTitle}

View task: ${data.dashboardUrl}

---
GovernanceOS - AI-Native Board Governance Platform
  `.trim();

  return {
    html: getBaseEmailTemplate(content),
    text,
  };
}

export function generateMinutesReadyEmail(data: MinutesReadyEmailData): { html: string; text: string } {
  const formattedDate = data.meetingDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const content = `
    <h2 style="margin-top: 0;">Meeting Minutes Ready</h2>
    <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
    <p>The minutes from your recent board meeting are now available:</p>

    <div class="details-box">
      <div style="margin-bottom: 12px;">
        <div style="color: #64748b; font-size: 12px; text-transform: uppercase;">Meeting</div>
        <div style="font-weight: 600;">${data.meetingTitle}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="color: #64748b; font-size: 12px; text-transform: uppercase;">Date</div>
        <div>${formattedDate}</div>
      </div>
      <div>
        <div style="color: #64748b; font-size: 12px; text-transform: uppercase;">Organization</div>
        <div>${data.organizationName}</div>
      </div>
    </div>

    <div style="text-align: center;">
      <a href="${data.minutesUrl}" class="button">View Minutes</a>
    </div>

    <p style="color: #64748b; font-size: 14px;">
      Please review the minutes. If you are an adjuster (justerare), you will need to sign the minutes using BankID.
    </p>
  `;

  const text = `
Meeting Minutes Ready

Hello${data.recipientName ? ` ${data.recipientName}` : ''},

The minutes from your recent board meeting are now available:

Meeting: ${data.meetingTitle}
Date: ${formattedDate}
Organization: ${data.organizationName}

View minutes: ${data.minutesUrl}

---
GovernanceOS - AI-Native Board Governance Platform
  `.trim();

  return {
    html: getBaseEmailTemplate(content),
    text,
  };
}

// ============================================================================
// ADDITIONAL HIGH-LEVEL EMAIL FUNCTIONS
// ============================================================================

export async function sendDocumentShareEmail(data: DocumentShareEmailData): Promise<EmailResult> {
  const { html, text } = generateDocumentShareEmail(data);

  return sendEmail({
    to: { email: data.recipientEmail, name: data.recipientName },
    subject: `Document Shared: ${data.documentName}`,
    html,
    text,
  });
}

export async function sendSignatureRequestEmail(data: SignatureRequestEmailData): Promise<EmailResult> {
  const { html, text } = generateSignatureRequestEmail(data);

  return sendEmail({
    to: { email: data.recipientEmail, name: data.recipientName },
    subject: `Signature Required: ${data.documentTitle}`,
    html,
    text,
  });
}

export async function sendTaskReminderEmail(data: TaskReminderEmailData): Promise<EmailResult> {
  const { html, text } = generateTaskReminderEmail(data);

  return sendEmail({
    to: { email: data.recipientEmail, name: data.recipientName },
    subject: `Task Due Soon: ${data.taskTitle}`,
    html,
    text,
  });
}

export async function sendMinutesReadyEmail(data: MinutesReadyEmailData): Promise<EmailResult> {
  const { html, text } = generateMinutesReadyEmail(data);

  return sendEmail({
    to: { email: data.recipientEmail, name: data.recipientName },
    subject: `Meeting Minutes Ready: ${data.meetingTitle}`,
    html,
    text,
  });
}
