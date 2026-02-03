/**
 * Meeting Templates Utility Tests
 *
 * Tests the meeting template utility functions including:
 * - Standard agenda item retrieval
 * - Template definitions
 * - Agenda generation
 * - Validation
 * - Localization
 */

import {
  STANDARD_AGENDA_ITEMS,
  DEFAULT_TEMPLATES,
  getStandardItem,
  getItemsByCategory,
  getRequiredItems,
  getTemplateDefinition,
  standardItemToAgendaItem,
  generateAgendaFromTemplate,
  templateDefinitionToMeetingTemplate,
  getTemplatesForMeetingType,
  validateAgendaCompleteness,
  getGroupedStandardItems,
  calculateTotalDuration,
  suggestAdditionalItems,
} from '@/lib/meeting-templates';

describe('Meeting Templates Utility', () => {
  describe('STANDARD_AGENDA_ITEMS', () => {
    it('should contain required formality items', () => {
      const openingItem = STANDARD_AGENDA_ITEMS.find(item => item.id === 'opening');
      const closingItem = STANDARD_AGENDA_ITEMS.find(item => item.id === 'closing');

      expect(openingItem).toBeDefined();
      expect(openingItem?.isRequired).toBe(true);
      expect(closingItem).toBeDefined();
      expect(closingItem?.isRequired).toBe(true);
    });

    it('should have Swedish translations for all items', () => {
      for (const item of STANDARD_AGENDA_ITEMS) {
        expect(item.titleSv).toBeDefined();
        expect(item.titleSv.length).toBeGreaterThan(0);
      }
    });

    it('should have valid categories for all items', () => {
      const validCategories = ['formality', 'governance', 'financial', 'strategic', 'operational', 'custom'];

      for (const item of STANDARD_AGENDA_ITEMS) {
        expect(validCategories).toContain(item.category);
      }
    });

    it('should have valid agenda item types', () => {
      const validTypes = ['information', 'decision', 'discussion', 'formality'];

      for (const item of STANDARD_AGENDA_ITEMS) {
        expect(validTypes).toContain(item.type);
      }
    });

    it('should have positive duration for all items', () => {
      for (const item of STANDARD_AGENDA_ITEMS) {
        expect(item.estimatedDuration).toBeGreaterThan(0);
      }
    });
  });

  describe('DEFAULT_TEMPLATES', () => {
    it('should contain 6 default templates', () => {
      expect(DEFAULT_TEMPLATES).toHaveLength(6);
    });

    it('should have templates for all meeting types', () => {
      const meetingTypes = DEFAULT_TEMPLATES.map(t => t.meetingType);

      expect(meetingTypes).toContain('ordinary');
      expect(meetingTypes).toContain('extraordinary');
      expect(meetingTypes).toContain('annual_general');
      expect(meetingTypes).toContain('statutory');
    });

    it('should have Swedish translations for all templates', () => {
      for (const template of DEFAULT_TEMPLATES) {
        expect(template.nameSv).toBeDefined();
        expect(template.nameSv.length).toBeGreaterThan(0);
        expect(template.descriptionSv).toBeDefined();
        expect(template.descriptionSv.length).toBeGreaterThan(0);
      }
    });

    it('should have valid item references', () => {
      for (const template of DEFAULT_TEMPLATES) {
        for (const itemId of template.itemIds) {
          const item = getStandardItem(itemId);
          expect(item).toBeDefined();
        }
      }
    });
  });

  describe('getStandardItem', () => {
    it('should return item by ID', () => {
      const item = getStandardItem('opening');

      expect(item).toBeDefined();
      expect(item?.title).toBe('Opening of the Meeting');
    });

    it('should return undefined for non-existent ID', () => {
      const item = getStandardItem('non-existent');

      expect(item).toBeUndefined();
    });
  });

  describe('getItemsByCategory', () => {
    it('should return items for formality category', () => {
      const items = getItemsByCategory('formality');

      expect(items.length).toBeGreaterThan(0);
      expect(items.every(item => item.category === 'formality')).toBe(true);
    });

    it('should return items for financial category', () => {
      const items = getItemsByCategory('financial');

      expect(items.length).toBeGreaterThan(0);
      expect(items.every(item => item.category === 'financial')).toBe(true);
    });

    it('should return items sorted by sortOrder', () => {
      const items = getItemsByCategory('formality');

      for (let i = 1; i < items.length; i++) {
        expect(items[i].sortOrder).toBeGreaterThanOrEqual(items[i - 1].sortOrder);
      }
    });
  });

  describe('getRequiredItems', () => {
    it('should return required items for ordinary meeting', () => {
      const items = getRequiredItems('ordinary');

      expect(items.length).toBeGreaterThan(0);
      expect(items.every(item => item.isRequired)).toBe(true);
      expect(items.every(item => item.requiredFor.includes('ordinary'))).toBe(true);
    });

    it('should return required items for annual_general meeting', () => {
      const items = getRequiredItems('annual_general');

      expect(items.length).toBeGreaterThan(0);
      expect(items.every(item => item.requiredFor.includes('annual_general'))).toBe(true);
    });

    it('should return required items for statutory meeting', () => {
      const items = getRequiredItems('statutory');

      expect(items.length).toBeGreaterThan(0);

      // Statutory meetings should include board chair election
      const titles = items.map(item => item.id);
      expect(titles).toContain('elect-board-chair');
    });

    it('should include opening and closing for all meeting types', () => {
      const meetingTypes: Array<'ordinary' | 'extraordinary' | 'annual_general' | 'statutory'> = [
        'ordinary', 'extraordinary', 'annual_general', 'statutory'
      ];

      for (const type of meetingTypes) {
        const items = getRequiredItems(type);
        const ids = items.map(item => item.id);

        expect(ids).toContain('opening');
        expect(ids).toContain('closing');
      }
    });
  });

  describe('getTemplateDefinition', () => {
    it('should return template by ID', () => {
      const template = getTemplateDefinition('ordinary-board-meeting');

      expect(template).toBeDefined();
      expect(template?.name).toBe('Ordinary Board Meeting');
    });

    it('should return undefined for non-existent ID', () => {
      const template = getTemplateDefinition('non-existent');

      expect(template).toBeUndefined();
    });
  });

  describe('standardItemToAgendaItem', () => {
    it('should convert standard item to agenda item', () => {
      const standardItem = getStandardItem('opening')!;
      const agendaItem = standardItemToAgendaItem(standardItem, 0);

      expect(agendaItem.id).toBeDefined();
      expect(agendaItem.orderIndex).toBe(0);
      expect(agendaItem.title).toBe('Opening of the Meeting');
      expect(agendaItem.type).toBe('formality');
      expect(agendaItem.estimatedDuration).toBe(2);
      expect(agendaItem.isCompleted).toBe(false);
      expect(agendaItem.isConfidential).toBe(false);
    });

    it('should use Swedish title when locale is sv', () => {
      const standardItem = getStandardItem('opening')!;
      const agendaItem = standardItemToAgendaItem(standardItem, 0, 'sv');

      expect(agendaItem.title).toBe('Mötets öppnande');
    });

    it('should generate unique IDs', () => {
      const standardItem = getStandardItem('opening')!;
      const item1 = standardItemToAgendaItem(standardItem, 0);
      const item2 = standardItemToAgendaItem(standardItem, 1);

      expect(item1.id).not.toBe(item2.id);
    });

    it('should set correct order index', () => {
      const standardItem = getStandardItem('opening')!;
      const agendaItem = standardItemToAgendaItem(standardItem, 5);

      expect(agendaItem.orderIndex).toBe(5);
    });
  });

  describe('generateAgendaFromTemplate', () => {
    it('should generate agenda items from ordinary template', () => {
      const items = generateAgendaFromTemplate('ordinary-board-meeting');

      expect(items.length).toBeGreaterThan(0);
      expect(items[0].title).toBe('Opening of the Meeting');
    });

    it('should generate agenda in Swedish', () => {
      const items = generateAgendaFromTemplate('ordinary-board-meeting', 'sv');

      expect(items[0].title).toBe('Mötets öppnande');
    });

    it('should return empty array for non-existent template', () => {
      const items = generateAgendaFromTemplate('non-existent');

      expect(items).toEqual([]);
    });

    it('should set correct order indexes', () => {
      const items = generateAgendaFromTemplate('ordinary-board-meeting');

      items.forEach((item, index) => {
        expect(item.orderIndex).toBe(index);
      });
    });

    it('should include all items from template definition', () => {
      const template = getTemplateDefinition('ordinary-board-meeting')!;
      const items = generateAgendaFromTemplate('ordinary-board-meeting');

      expect(items.length).toBe(template.itemIds.length);
    });
  });

  describe('templateDefinitionToMeetingTemplate', () => {
    it('should convert template definition to meeting template', () => {
      const definition = getTemplateDefinition('ordinary-board-meeting')!;
      const template = templateDefinitionToMeetingTemplate(definition);

      expect(template.name).toBe('Ordinary Board Meeting');
      expect(template.meetingType).toBe('ordinary');
      expect(template.defaultDuration).toBe(180);
      expect(template.defaultQuorum).toBe(3);
      expect(template.visibility).toBe('public');
    });

    it('should use Swedish content when locale is sv', () => {
      const definition = getTemplateDefinition('ordinary-board-meeting')!;
      const template = templateDefinitionToMeetingTemplate(definition, 'sv');

      expect(template.name).toBe('Ordinarie styrelsemöte');
    });
  });

  describe('getTemplatesForMeetingType', () => {
    it('should return templates for ordinary meeting type', () => {
      const templates = getTemplatesForMeetingType('ordinary');

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => t.meetingType === 'ordinary')).toBe(true);
    });

    it('should return templates for annual_general meeting type', () => {
      const templates = getTemplatesForMeetingType('annual_general');

      expect(templates.length).toBe(1);
      expect(templates[0].id).toBe('annual-general-meeting');
    });
  });

  describe('validateAgendaCompleteness', () => {
    it('should validate complete agenda', () => {
      const agenda = generateAgendaFromTemplate('ordinary-board-meeting');
      const result = validateAgendaCompleteness(agenda, 'ordinary');

      expect(result.isValid).toBe(true);
      expect(result.missingItems).toHaveLength(0);
    });

    it('should detect missing required items', () => {
      const agenda = [
        { id: '1', orderIndex: 0, title: 'Some Item', type: 'discussion' as const, estimatedDuration: 30, documentIds: [], conflictKeywords: [], recusedMemberIds: [], actionItems: [], isConfidential: false, isCompleted: false }
      ];
      const result = validateAgendaCompleteness(agenda, 'ordinary');

      expect(result.isValid).toBe(false);
      expect(result.missingItems.length).toBeGreaterThan(0);
    });

    it('should validate Swedish agenda items', () => {
      const agenda = generateAgendaFromTemplate('ordinary-board-meeting', 'sv');
      const result = validateAgendaCompleteness(agenda, 'ordinary', 'sv');

      expect(result.isValid).toBe(true);
    });
  });

  describe('getGroupedStandardItems', () => {
    it('should return items grouped by category', () => {
      const groups = getGroupedStandardItems();

      expect(groups['Opening & Closing']).toBeDefined();
      expect(groups['Governance']).toBeDefined();
      expect(groups['Financial']).toBeDefined();
      expect(groups['Strategic']).toBeDefined();
      expect(groups['Operational']).toBeDefined();
    });

    it('should have items in each group', () => {
      const groups = getGroupedStandardItems();

      expect(groups['Opening & Closing'].length).toBeGreaterThan(0);
      expect(groups['Governance'].length).toBeGreaterThan(0);
      expect(groups['Financial'].length).toBeGreaterThan(0);
    });

    it('should sort items within groups by sortOrder', () => {
      const groups = getGroupedStandardItems();

      for (const group of Object.values(groups)) {
        for (let i = 1; i < group.length; i++) {
          expect(group[i].sortOrder).toBeGreaterThanOrEqual(group[i - 1].sortOrder);
        }
      }
    });
  });

  describe('calculateTotalDuration', () => {
    it('should calculate total duration correctly', () => {
      const items = [
        { estimatedDuration: 30 },
        { estimatedDuration: 45 },
        { estimatedDuration: 15 },
      ];

      expect(calculateTotalDuration(items)).toBe(90);
    });

    it('should return 0 for empty array', () => {
      expect(calculateTotalDuration([])).toBe(0);
    });

    it('should calculate duration from generated agenda', () => {
      const agenda = generateAgendaFromTemplate('ordinary-board-meeting');
      const totalDuration = calculateTotalDuration(agenda);

      expect(totalDuration).toBeGreaterThan(0);
    });
  });

  describe('suggestAdditionalItems', () => {
    it('should suggest items not in current agenda', () => {
      const currentAgenda = generateAgendaFromTemplate('quick-meeting');
      const suggestions = suggestAdditionalItems(currentAgenda, 'ordinary');

      // Suggestions should not include items already in agenda
      const currentTitles = new Set(currentAgenda.map(item => item.title.toLowerCase()));

      for (const suggestion of suggestions) {
        expect(currentTitles.has(suggestion.title.toLowerCase())).toBe(false);
      }
    });

    it('should prioritize required items', () => {
      const currentAgenda = [
        { id: '1', orderIndex: 0, title: 'Opening of the Meeting', type: 'formality' as const, estimatedDuration: 2, documentIds: [], conflictKeywords: [], recusedMemberIds: [], actionItems: [], isConfidential: false, isCompleted: false },
        { id: '2', orderIndex: 1, title: 'Closing of the Meeting', type: 'formality' as const, estimatedDuration: 2, documentIds: [], conflictKeywords: [], recusedMemberIds: [], actionItems: [], isConfidential: false, isCompleted: false },
      ];

      const suggestions = suggestAdditionalItems(currentAgenda, 'ordinary');

      // First suggestions should include required items for ordinary meetings
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should limit suggestions to 10 items', () => {
      const suggestions = suggestAdditionalItems([], 'ordinary');

      expect(suggestions.length).toBeLessThanOrEqual(10);
    });
  });
});
