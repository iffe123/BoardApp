/**
 * PDF Export Unit Tests
 *
 * Tests the PDF export utility functionality including:
 * - HTML generation for meeting minutes
 * - Swedish and English label support
 * - Attendance information rendering
 * - Agenda items and decision outcomes
 * - Signatures section
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('@/lib/utils', () => ({
  formatDate: jest.fn(() => '2024-01-15'),
}));

import { generateMinutesHTML } from '@/lib/pdf-export';
import { formatDate } from '@/lib/utils';

const mockMeeting = {
  id: 'meeting-1',
  title: 'Q1 Board Meeting',
  scheduledStart: { toDate: () => new Date('2024-01-15T10:00:00Z') },
  location: { room: 'Conference Room A', address: 'Stockholm' },
  attendees: [
    { role: 'chair', displayName: 'Anna Svensson', response: 'accepted', attendanceStatus: 'present' },
    { role: 'adjuster', displayName: 'Erik Larsson', response: 'accepted', attendanceStatus: 'present' },
  ],
  agendaItems: [
    { id: '1', type: 'formality', title: 'Opening', description: 'Opening of meeting' },
    { id: '2', type: 'decision', title: 'Budget Approval', description: 'Approve budget', decision: { outcome: 'approved', motion: 'Approve Q1 budget' } },
  ],
} as unknown as Parameters<typeof generateMinutesHTML>[0]['meeting'];

const mockMinutes = {
  header: { meetingNumber: '2024-001' },
  attendance: {
    present: ['Anna Svensson', 'Erik Larsson'],
    absent: ['Karin Johansson'],
    guests: [],
  },
  itemMinutes: [],
} as any;

/**
 * Minutes with undefined itemMinutes to trigger fallback to meeting.agendaItems.
 * Note: An empty array [] is truthy, so the code `minutes.itemMinutes || meeting.agendaItems`
 * only falls back when itemMinutes is falsy (undefined/null).
 */
const mockMinutesNoItemMinutes = {
  ...mockMinutes,
  itemMinutes: undefined,
} as any;

/**
 * Minutes with itemMinutes containing a discussion property (required for
 * the code to treat items as minuteItems via `'discussion' in item`).
 */
const mockMinutesWithDecision = {
  ...mockMinutes,
  itemMinutes: [
    {
      agendaItemId: '1',
      title: 'Opening of Meeting',
      discussion: 'The chair opened the meeting at 10:00.',
    },
    {
      agendaItemId: '2',
      title: 'Budget Approval',
      discussion: 'The CFO presented the Q1 budget proposal.',
      decision: { outcome: 'approved', motion: 'Approve Q1 budget' },
    },
  ],
} as any;

describe('PDF Export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateMinutesHTML', () => {
    it('should generate HTML with correct document structure', () => {
      const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</html>');
    });

    it('should include the meeting title', () => {
      const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes });

      expect(html).toContain('Q1 Board Meeting');
    });

    it('should include the meeting number from minutes header', () => {
      const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes });

      expect(html).toContain('2024-001');
    });

    it('should call formatDate with the meeting date', () => {
      generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes });

      expect(formatDate).toHaveBeenCalledWith(new Date('2024-01-15T10:00:00Z'));
    });

    it('should include the formatted date in the output', () => {
      const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes });

      expect(html).toContain('2024-01-15');
    });

    it('should include the meeting location room', () => {
      const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes });

      expect(html).toContain('Conference Room A');
    });

    it('should default to Swedish labels when no language is specified', () => {
      const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes });

      expect(html).toContain('lang="sv"');
      expect(html).toContain('Protokoll');
      expect(html).toContain('Närvarande');
      expect(html).toContain('Dagordning');
    });

    describe('Swedish labels', () => {
      it('should use Swedish title "Protokoll"', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'sv' });

        expect(html).toContain('Protokoll');
      });

      it('should use Swedish date label "Datum"', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'sv' });

        expect(html).toContain('Datum');
      });

      it('should use Swedish location label "Plats"', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'sv' });

        expect(html).toContain('Plats');
      });

      it('should use Swedish present label "Närvarande"', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'sv' });

        expect(html).toContain('Närvarande');
      });

      it('should use Swedish absent label "Frånvarande"', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'sv' });

        expect(html).toContain('Frånvarande');
      });

      it('should use Swedish agenda label "Dagordning"', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'sv' });

        expect(html).toContain('Dagordning');
      });

      it('should use Swedish decision label "Beslut" when itemMinutes contain decisions', () => {
        const html = generateMinutesHTML({
          meeting: mockMeeting,
          minutes: mockMinutesWithDecision,
          language: 'sv',
        });

        expect(html).toContain('Beslut');
      });

      it('should use Swedish signatures label "Underskrifter"', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'sv' });

        expect(html).toContain('Underskrifter');
      });

      it('should use Swedish chair label "Ordförande"', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'sv' });

        expect(html).toContain('Ordförande');
      });

      it('should use Swedish adjuster label "Justerare"', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'sv' });

        expect(html).toContain('Justerare');
      });
    });

    describe('English labels', () => {
      it('should use English title "Meeting Minutes"', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'en' });

        expect(html).toContain('Meeting Minutes');
      });

      it('should use English date label "Date"', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'en' });

        expect(html).toContain('Date');
      });

      it('should use English location label "Location"', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'en' });

        expect(html).toContain('Location');
      });

      it('should use English present label "Present"', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'en' });

        expect(html).toContain('Present');
      });

      it('should use English absent label "Absent"', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'en' });

        expect(html).toContain('Absent');
      });

      it('should use English agenda label "Agenda"', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'en' });

        expect(html).toContain('Agenda');
      });

      it('should use English decision label "Decision" when itemMinutes contain decisions', () => {
        const html = generateMinutesHTML({
          meeting: mockMeeting,
          minutes: mockMinutesWithDecision,
          language: 'en',
        });

        expect(html).toContain('Decision');
      });

      it('should use English signatures label "Signatures"', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'en' });

        expect(html).toContain('Signatures');
      });

      it('should use English chair label "Chair"', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'en' });

        expect(html).toContain('Chair');
      });

      it('should use English adjuster label "Adjuster"', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'en' });

        expect(html).toContain('Adjuster');
      });

      it('should set lang attribute to "en"', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'en' });

        expect(html).toContain('lang="en"');
      });
    });

    describe('attendance information', () => {
      it('should include present attendees from minutes', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes });

        expect(html).toContain('Anna Svensson');
        expect(html).toContain('Erik Larsson');
      });

      it('should include absent attendees from minutes', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes });

        expect(html).toContain('Karin Johansson');
      });

      it('should not render guests section when guests list is empty', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'sv' });

        expect(html).not.toContain('Gäster');
      });

      it('should render guests section when guests are present', () => {
        const minutesWithGuests = {
          ...mockMinutes,
          attendance: {
            ...mockMinutes.attendance,
            guests: ['Guest Person'],
          },
        };

        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: minutesWithGuests, language: 'sv' });

        expect(html).toContain('Gäster');
        expect(html).toContain('Guest Person');
      });

      it('should fall back to meeting attendees when minutes attendance present list is empty', () => {
        const minutesWithoutAttendance = {
          ...mockMinutes,
          attendance: {
            present: [],
            absent: [],
            guests: [],
          },
        };

        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: minutesWithoutAttendance });

        // Falls back to meeting attendees filtered by status/response
        expect(html).toContain('Anna Svensson');
        expect(html).toContain('Erik Larsson');
      });
    });

    describe('agenda items', () => {
      it('should render agenda items from meeting when itemMinutes is undefined', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutesNoItemMinutes });

        expect(html).toContain('Opening');
        expect(html).toContain('Budget Approval');
      });

      it('should include agenda item descriptions when falling back to agendaItems', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutesNoItemMinutes });

        expect(html).toContain('Opening of meeting');
      });

      it('should apply correct CSS class for item type when falling back to agendaItems', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutesNoItemMinutes });

        expect(html).toContain('class="agenda-item formality"');
        expect(html).toContain('class="agenda-item decision"');
      });

      it('should number agenda items sequentially when falling back to agendaItems', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutesNoItemMinutes });

        expect(html).toContain('1. Opening');
        expect(html).toContain('2. Budget Approval');
      });

      it('should render itemMinutes when they are provided with discussion content', () => {
        const minutesWithItems = {
          ...mockMinutes,
          itemMinutes: [
            {
              agendaItemId: '1',
              title: 'Opening of Meeting',
              discussion: 'The chair opened the meeting at 10:00.',
            },
            {
              agendaItemId: '2',
              title: 'Budget Discussion',
              discussion: 'The CFO presented the Q1 budget.',
              decision: { outcome: 'approved', motion: 'Approve Q1 budget allocation' },
            },
          ],
        };

        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: minutesWithItems, language: 'sv' });

        expect(html).toContain('Opening of Meeting');
        expect(html).toContain('The chair opened the meeting at 10:00.');
        expect(html).toContain('Budget Discussion');
        expect(html).toContain('The CFO presented the Q1 budget.');
      });

      it('should render no agenda items when itemMinutes is an empty array', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes });

        // Empty array is truthy, so map produces no output; agenda items from meeting are not used
        expect(html).not.toContain('class="agenda-item');
      });
    });

    describe('decision outcomes', () => {
      it('should render decision outcomes from itemMinutes with discussion', () => {
        const html = generateMinutesHTML({
          meeting: mockMeeting,
          minutes: mockMinutesWithDecision,
          language: 'sv',
        });

        expect(html).toContain('APPROVED');
        expect(html).toContain('Approve Q1 budget');
        expect(html).toContain('decision-outcome approved');
      });

      it('should render rejected decision outcomes', () => {
        const minutesWithRejection = {
          ...mockMinutes,
          itemMinutes: [
            {
              agendaItemId: '2',
              title: 'Budget Approval',
              discussion: 'The board discussed the budget proposal.',
              decision: { outcome: 'rejected', motion: 'Reject the proposal' },
            },
          ],
        };

        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: minutesWithRejection });

        expect(html).toContain('REJECTED');
        expect(html).toContain('decision-outcome rejected');
      });

      it('should render tabled decision outcomes', () => {
        const minutesWithTabled = {
          ...mockMinutes,
          itemMinutes: [
            {
              agendaItemId: '2',
              title: 'Deferred Item',
              discussion: 'The item was discussed and deferred.',
              decision: { outcome: 'tabled', motion: 'Table for next meeting' },
            },
          ],
        };

        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: minutesWithTabled });

        expect(html).toContain('TABLED');
        expect(html).toContain('decision-outcome tabled');
      });

      it('should render vote counts when provided', () => {
        const minutesWithVotes = {
          ...mockMinutes,
          itemMinutes: [
            {
              agendaItemId: '2',
              title: 'Budget Approval',
              discussion: 'The board voted on the budget.',
              decision: {
                outcome: 'approved',
                motion: 'Approve Q1 budget',
                votesFor: 5,
                votesAgainst: 1,
                abstentions: 2,
              },
            },
          ],
        };

        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: minutesWithVotes });

        expect(html).toContain('5 for');
        expect(html).toContain('1 against');
        expect(html).toContain('2 abstentions');
      });

      it('should not render vote counts when votesFor is undefined', () => {
        const html = generateMinutesHTML({
          meeting: mockMeeting,
          minutes: mockMinutesWithDecision,
        });

        expect(html).not.toContain('Votes:');
      });
    });

    describe('signatures section', () => {
      it('should include a signatures section', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'sv' });

        expect(html).toContain('class="signatures"');
        expect(html).toContain('Underskrifter');
      });

      it('should include chair name in signature section', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes });

        expect(html).toContain('Anna Svensson');
      });

      it('should include adjuster name in signature section', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes });

        expect(html).toContain('Erik Larsson');
      });

      it('should include signature boxes with lines', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes });

        expect(html).toContain('class="signature-box"');
        expect(html).toContain('class="line"');
      });

      it('should use Swedish role labels in signatures for Swedish language', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'sv' });

        expect(html).toContain('Ordförande');
        expect(html).toContain('Justerare');
      });

      it('should use English role labels in signatures for English language', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes, language: 'en' });

        expect(html).toContain('Chair');
        expect(html).toContain('Adjuster');
      });
    });

    describe('styling', () => {
      it('should include A4 page styling', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes });

        expect(html).toContain('@page');
        expect(html).toContain('A4');
      });

      it('should include print media styles', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes });

        expect(html).toContain('@media print');
      });

      it('should include CSS classes for decision outcome colors', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes });

        expect(html).toContain('.decision-outcome.approved');
        expect(html).toContain('.decision-outcome.rejected');
        expect(html).toContain('.decision-outcome.tabled');
      });
    });

    describe('AI summary', () => {
      it('should not include AI summary section when aiSummary is not provided', () => {
        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: mockMinutes });

        expect(html).not.toContain('AI Summary');
      });

      it('should include AI summary section when aiSummary is provided', () => {
        const minutesWithSummary = {
          ...mockMinutes,
          aiSummary: 'The board discussed and approved the Q1 budget.',
        };

        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: minutesWithSummary });

        expect(html).toContain('AI Summary');
        expect(html).toContain('The board discussed and approved the Q1 budget.');
      });
    });

    describe('edge cases', () => {
      it('should handle meeting with no attendees having chair role', () => {
        const meetingNoChair = {
          ...mockMeeting,
          attendees: [
            { role: 'director', displayName: 'Test Person', response: 'accepted', attendanceStatus: 'present' },
          ],
        };

        const html = generateMinutesHTML({ meeting: meetingNoChair, minutes: mockMinutes });

        // Should not throw and should still generate valid HTML
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('class="signatures"');
      });

      it('should handle missing meetingNumber in header', () => {
        const minutesNoNumber = {
          ...mockMinutes,
          header: {},
        };

        const html = generateMinutesHTML({ meeting: mockMeeting, minutes: minutesNoNumber });

        expect(html).toContain('<!DOCTYPE html>');
      });

      it('should handle meeting with virtual location (no room)', () => {
        const virtualMeeting = {
          ...mockMeeting,
          location: { type: 'virtual', videoConferenceUrl: 'https://meet.example.com' },
        };

        const html = generateMinutesHTML({ meeting: virtualMeeting, minutes: mockMinutes });

        expect(html).toContain('Virtual');
      });
    });
  });
});
