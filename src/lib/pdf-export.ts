/**
 * PDF Export Utility
 *
 * Generates PDF documents for meeting minutes and other reports.
 * Uses jsPDF for PDF generation.
 */

import type { Meeting, MeetingMinutes } from '@/types/schema';
import { formatDate } from '@/lib/utils';

// Note: In production, you'd import jsPDF:
// import jsPDF from 'jspdf';
// import 'jspdf-autotable';

interface MinutesPDFOptions {
  meeting: Meeting;
  minutes: MeetingMinutes;
  includeSignatures?: boolean;
  language?: 'sv' | 'en';
}

/**
 * Generate meeting minutes as HTML (for print/PDF)
 */
export function generateMinutesHTML(options: MinutesPDFOptions): string {
  const { meeting, minutes, language = 'sv' } = options;

  const labels = language === 'sv' ? {
    title: 'Protokoll',
    meeting: 'Möte',
    date: 'Datum',
    time: 'Tid',
    location: 'Plats',
    present: 'Närvarande',
    absent: 'Frånvarande',
    excused: 'Anmält förhinder',
    guests: 'Gäster',
    agenda: 'Dagordning',
    decision: 'Beslut',
    discussion: 'Diskussion',
    actionItems: 'Åtgärdspunkter',
    signatures: 'Underskrifter',
    chair: 'Ordförande',
    adjuster: 'Justerare',
  } : {
    title: 'Meeting Minutes',
    meeting: 'Meeting',
    date: 'Date',
    time: 'Time',
    location: 'Location',
    present: 'Present',
    absent: 'Absent',
    excused: 'Excused',
    guests: 'Guests',
    agenda: 'Agenda',
    decision: 'Decision',
    discussion: 'Discussion',
    actionItems: 'Action Items',
    signatures: 'Signatures',
    chair: 'Chair',
    adjuster: 'Adjuster',
  };

  const html = `
    <!DOCTYPE html>
    <html lang="${language}">
    <head>
      <meta charset="UTF-8">
      <title>${labels.title} - ${meeting.title}</title>
      <style>
        @page { size: A4; margin: 2cm; }
        body {
          font-family: 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #333;
        }
        h1 {
          font-size: 18pt;
          margin-bottom: 0.5em;
          border-bottom: 2px solid #333;
          padding-bottom: 0.3em;
        }
        h2 {
          font-size: 14pt;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        h3 {
          font-size: 12pt;
          margin-top: 1em;
        }
        .header { margin-bottom: 2em; }
        .header-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5em;
        }
        .header-info dt { font-weight: bold; }
        .attendance { margin: 1em 0; }
        .attendance-list { margin-left: 1em; }
        .agenda-item {
          margin: 1.5em 0;
          padding: 1em;
          border-left: 3px solid #666;
          background: #f9f9f9;
        }
        .agenda-item.decision { border-left-color: #0066cc; }
        .agenda-item.information { border-left-color: #28a745; }
        .decision-outcome {
          display: inline-block;
          padding: 0.2em 0.5em;
          background: #0066cc;
          color: white;
          border-radius: 3px;
          font-size: 10pt;
        }
        .decision-outcome.approved { background: #28a745; }
        .decision-outcome.rejected { background: #dc3545; }
        .decision-outcome.tabled { background: #ffc107; color: #333; }
        .action-items {
          list-style: none;
          padding: 0;
          margin: 0.5em 0;
        }
        .action-items li {
          padding: 0.3em 0;
          border-bottom: 1px dotted #ccc;
        }
        .signatures {
          margin-top: 3em;
          page-break-inside: avoid;
        }
        .signature-line {
          display: flex;
          justify-content: space-between;
          margin: 2em 0;
        }
        .signature-box {
          width: 45%;
          text-align: center;
        }
        .signature-box .line {
          border-top: 1px solid #333;
          margin-top: 3em;
          padding-top: 0.5em;
        }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${meeting.title}</h1>
        <p>${labels.title} ${minutes.header?.meetingNumber || ''}</p>
        <dl class="header-info">
          <dt>${labels.date}:</dt>
          <dd>${formatDate(meeting.scheduledStart.toDate())}</dd>
          <dt>${labels.location}:</dt>
          <dd>${meeting.location.room || meeting.location.address || 'Virtual'}</dd>
        </dl>
      </div>

      <div class="attendance">
        <h2>${labels.present}</h2>
        <div class="attendance-list">
          ${minutes.attendance?.present.join(', ') || meeting.attendees
            .filter(a => a.attendanceStatus === 'present' || a.response === 'accepted')
            .map(a => a.displayName)
            .join(', ')}
        </div>

        ${(minutes.attendance?.absent?.length || 0) > 0 ? `
          <h2>${labels.absent}</h2>
          <div class="attendance-list">
            ${minutes.attendance?.absent.join(', ')}
          </div>
        ` : ''}

        ${(minutes.attendance?.guests?.length || 0) > 0 ? `
          <h2>${labels.guests}</h2>
          <div class="attendance-list">
            ${minutes.attendance?.guests.join(', ')}
          </div>
        ` : ''}
      </div>

      <h2>${labels.agenda}</h2>
      ${(minutes.itemMinutes || meeting.agendaItems).map((item, index) => {
        const agendaItem = 'agendaItemId' in item
          ? meeting.agendaItems.find(a => a.id === item.agendaItemId)
          : item;
        const minuteItem = 'discussion' in item ? item : null;

        return `
          <div class="agenda-item ${agendaItem?.type || ''}">
            <h3>${index + 1}. ${minuteItem?.title || agendaItem?.title || ''}</h3>

            ${minuteItem?.discussion ? `
              <p><strong>${labels.discussion}:</strong> ${minuteItem.discussion}</p>
            ` : agendaItem?.description ? `
              <p>${agendaItem.description}</p>
            ` : ''}

            ${minuteItem?.decision ? `
              <p>
                <strong>${labels.decision}:</strong>
                <span class="decision-outcome ${minuteItem.decision.outcome}">
                  ${minuteItem.decision.outcome.toUpperCase()}
                </span>
              </p>
              <p>${minuteItem.decision.motion}</p>
              ${minuteItem.decision.votesFor !== undefined ? `
                <p>Votes: ${minuteItem.decision.votesFor} for,
                   ${minuteItem.decision.votesAgainst || 0} against,
                   ${minuteItem.decision.abstentions || 0} abstentions</p>
              ` : ''}
            ` : ''}

            ${(minuteItem?.actionItems?.length || agendaItem?.actionItems?.length) ? `
              <p><strong>${labels.actionItems}:</strong></p>
              <ul class="action-items">
                ${(minuteItem?.actionItems || agendaItem?.actionItems || []).map(action => `
                  <li>${action.title}${action.assigneeName ? ` (${action.assigneeName})` : ''}</li>
                `).join('')}
              </ul>
            ` : ''}
          </div>
        `;
      }).join('')}

      ${minutes.aiSummary ? `
        <h2>AI Summary</h2>
        <p>${minutes.aiSummary}</p>
      ` : ''}

      <div class="signatures">
        <h2>${labels.signatures}</h2>
        <div class="signature-line">
          <div class="signature-box">
            <div class="line">${labels.chair}</div>
            <p>${meeting.attendees.find(a => a.role === 'chair')?.displayName || ''}</p>
          </div>
          <div class="signature-box">
            <div class="line">${labels.adjuster}</div>
            <p>${meeting.attendees.find(a => a.role === 'adjuster')?.displayName || ''}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Export meeting minutes to PDF
 */
export async function exportMinutesToPDF(options: MinutesPDFOptions): Promise<Blob> {
  const html = generateMinutesHTML(options);

  // Create a hidden iframe to render and print
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error('Could not create PDF');
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait for content to render
  await new Promise(resolve => setTimeout(resolve, 500));

  // Use browser print functionality
  // In production, you'd use jsPDF or a server-side PDF generator
  iframe.contentWindow?.print();

  document.body.removeChild(iframe);

  // Return a placeholder blob - in production, this would be actual PDF content
  return new Blob([html], { type: 'text/html' });
}

/**
 * Download minutes as HTML file (for browsers without PDF support)
 */
export function downloadMinutesHTML(options: MinutesPDFOptions): void {
  const html = generateMinutesHTML(options);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `minutes-${options.meeting.id}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Print meeting minutes
 */
export function printMinutes(options: MinutesPDFOptions): void {
  const html = generateMinutesHTML(options);

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
