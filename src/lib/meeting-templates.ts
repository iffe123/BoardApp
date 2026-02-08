/**
 * Meeting Templates Service for GovernanceOS
 *
 * Provides pre-built meeting templates and standard agenda items
 * for various board meeting types following Swedish governance standards.
 *
 * Template Types:
 * - Ordinary Board Meeting
 * - Extraordinary Board Meeting
 * - Annual General Meeting (AGM)
 * - Statutory Meeting (Konstituerande styrelsemöte)
 */

import type { AgendaItem, AgendaItemType, MeetingTemplate } from '@/types/schema';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// STANDARD AGENDA ITEM LIBRARY
// ============================================================================

export interface StandardAgendaItem {
  id: string;
  title: string;
  titleSv: string; // Swedish translation
  description?: string;
  descriptionSv?: string;
  type: AgendaItemType;
  estimatedDuration: number;
  category: 'formality' | 'governance' | 'financial' | 'strategic' | 'operational' | 'custom';
  isRequired: boolean; // Required for valid meeting
  requiredFor: ('ordinary' | 'extraordinary' | 'annual_general' | 'statutory')[];
  sortOrder: number; // Default order within category
}

// Standard agenda items for Swedish board meetings
export const STANDARD_AGENDA_ITEMS: StandardAgendaItem[] = [
  // Formalities - Opening
  {
    id: 'opening',
    title: 'Opening of the Meeting',
    titleSv: 'Mötets öppnande',
    description: 'The Chair declares the meeting open.',
    descriptionSv: 'Ordföranden förklarar mötet öppnat.',
    type: 'formality',
    estimatedDuration: 2,
    category: 'formality',
    isRequired: true,
    requiredFor: ['ordinary', 'extraordinary', 'annual_general', 'statutory'],
    sortOrder: 1,
  },
  {
    id: 'attendance-quorum',
    title: 'Attendance and Quorum',
    titleSv: 'Närvaro och beslutförhet',
    description: 'Verification of attendees and confirmation that the meeting has quorum.',
    descriptionSv: 'Genomgång av närvarande och fastställande av beslutförhet.',
    type: 'formality',
    estimatedDuration: 5,
    category: 'formality',
    isRequired: true,
    requiredFor: ['ordinary', 'extraordinary', 'annual_general', 'statutory'],
    sortOrder: 2,
  },
  {
    id: 'elect-chair',
    title: 'Election of Meeting Chair',
    titleSv: 'Val av mötesordförande',
    description: 'Election of chair for the meeting.',
    descriptionSv: 'Val av ordförande för mötet.',
    type: 'decision',
    estimatedDuration: 3,
    category: 'formality',
    isRequired: false,
    requiredFor: ['annual_general'],
    sortOrder: 3,
  },
  {
    id: 'elect-secretary',
    title: 'Election of Meeting Secretary',
    titleSv: 'Val av mötessekreterare',
    description: 'Election of secretary to record the minutes.',
    descriptionSv: 'Val av sekreterare att föra protokoll.',
    type: 'decision',
    estimatedDuration: 2,
    category: 'formality',
    isRequired: false,
    requiredFor: ['annual_general'],
    sortOrder: 4,
  },
  {
    id: 'elect-adjusters',
    title: 'Election of Minute Adjusters',
    titleSv: 'Val av justerare',
    description: 'Election of persons to verify and sign the minutes.',
    descriptionSv: 'Val av justerare att justera protokollet.',
    type: 'decision',
    estimatedDuration: 2,
    category: 'formality',
    isRequired: true,
    requiredFor: ['ordinary', 'extraordinary', 'annual_general', 'statutory'],
    sortOrder: 5,
  },
  {
    id: 'approve-agenda',
    title: 'Approval of Agenda',
    titleSv: 'Godkännande av dagordning',
    description: 'Review and approval of the meeting agenda.',
    descriptionSv: 'Genomgång och godkännande av dagordningen.',
    type: 'decision',
    estimatedDuration: 3,
    category: 'formality',
    isRequired: true,
    requiredFor: ['ordinary', 'extraordinary', 'annual_general', 'statutory'],
    sortOrder: 6,
  },
  {
    id: 'approve-previous-minutes',
    title: 'Approval of Previous Minutes',
    titleSv: 'Godkännande av föregående protokoll',
    description: 'Review and approval of minutes from the previous meeting.',
    descriptionSv: 'Genomgång och godkännande av protokoll från föregående möte.',
    type: 'decision',
    estimatedDuration: 5,
    category: 'formality',
    isRequired: false,
    requiredFor: ['ordinary'],
    sortOrder: 7,
  },
  {
    id: 'conflicts-declaration',
    title: 'Declaration of Conflicts of Interest',
    titleSv: 'Anmälan av jäv',
    description: 'Board members declare any conflicts of interest.',
    descriptionSv: 'Styrelseledamöter anmäler eventuella jävsituationer.',
    type: 'formality',
    estimatedDuration: 3,
    category: 'formality',
    isRequired: true,
    requiredFor: ['ordinary', 'extraordinary', 'statutory'],
    sortOrder: 8,
  },

  // Governance Items
  {
    id: 'ceo-report',
    title: 'CEO Report',
    titleSv: 'VD-rapport',
    description: 'Presentation of the CEO report on business operations.',
    descriptionSv: 'Presentation av VD:s rapport om verksamheten.',
    type: 'information',
    estimatedDuration: 20,
    category: 'governance',
    isRequired: false,
    requiredFor: ['ordinary'],
    sortOrder: 1,
  },
  {
    id: 'board-report',
    title: "Board Report on Company's Affairs",
    titleSv: 'Styrelsens förvaltningsberättelse',
    description: "Review of the board's report on the company's affairs.",
    descriptionSv: 'Genomgång av styrelsens förvaltningsberättelse.',
    type: 'information',
    estimatedDuration: 15,
    category: 'governance',
    isRequired: false,
    requiredFor: ['annual_general'],
    sortOrder: 2,
  },
  {
    id: 'matters-arising',
    title: 'Matters Arising',
    titleSv: 'Rapportering pågående ärenden',
    description: 'Update on action items and ongoing matters from previous meetings.',
    descriptionSv: 'Uppdatering av beslutade aktiviteter och pågående ärenden.',
    type: 'information',
    estimatedDuration: 10,
    category: 'governance',
    isRequired: false,
    requiredFor: ['ordinary'],
    sortOrder: 3,
  },
  {
    id: 'discharge-liability',
    title: 'Discharge from Liability',
    titleSv: 'Ansvarsfrihet',
    description: 'Decision on discharge from liability for the board and CEO.',
    descriptionSv: 'Beslut om ansvarsfrihet för styrelsen och VD.',
    type: 'decision',
    estimatedDuration: 5,
    category: 'governance',
    isRequired: false,
    requiredFor: ['annual_general'],
    sortOrder: 4,
  },

  // Financial Items
  {
    id: 'financial-report',
    title: 'Financial Report',
    titleSv: 'Ekonomisk rapport',
    description: 'Review of current financial status and performance.',
    descriptionSv: 'Genomgång av aktuell ekonomisk ställning och resultat.',
    type: 'information',
    estimatedDuration: 20,
    category: 'financial',
    isRequired: false,
    requiredFor: ['ordinary'],
    sortOrder: 1,
  },
  {
    id: 'annual-accounts',
    title: 'Annual Accounts',
    titleSv: 'Årsredovisning',
    description: 'Presentation and approval of annual accounts.',
    descriptionSv: 'Presentation och fastställande av årsredovisningen.',
    type: 'decision',
    estimatedDuration: 20,
    category: 'financial',
    isRequired: false,
    requiredFor: ['annual_general'],
    sortOrder: 2,
  },
  {
    id: 'audit-report',
    title: 'Audit Report',
    titleSv: 'Revisionsberättelse',
    description: "Presentation of the auditor's report.",
    descriptionSv: 'Presentation av revisionsberättelsen.',
    type: 'information',
    estimatedDuration: 10,
    category: 'financial',
    isRequired: false,
    requiredFor: ['annual_general'],
    sortOrder: 3,
  },
  {
    id: 'dividend-decision',
    title: 'Dividend Decision',
    titleSv: 'Beslut om vinstdisposition',
    description: 'Decision on dividend distribution or profit allocation.',
    descriptionSv: 'Beslut om utdelning eller disposition av vinst.',
    type: 'decision',
    estimatedDuration: 10,
    category: 'financial',
    isRequired: false,
    requiredFor: ['annual_general'],
    sortOrder: 4,
  },
  {
    id: 'budget-approval',
    title: 'Budget Approval',
    titleSv: 'Budgetgodkännande',
    description: 'Review and approval of annual budget.',
    descriptionSv: 'Genomgång och godkännande av årsbudget.',
    type: 'decision',
    estimatedDuration: 30,
    category: 'financial',
    isRequired: false,
    requiredFor: ['ordinary'],
    sortOrder: 5,
  },
  {
    id: 'investment-decision',
    title: 'Investment Decision',
    titleSv: 'Investeringsbeslut',
    description: 'Decision on major investments.',
    descriptionSv: 'Beslut om större investeringar.',
    type: 'decision',
    estimatedDuration: 20,
    category: 'financial',
    isRequired: false,
    requiredFor: [],
    sortOrder: 6,
  },

  // Strategic Items
  {
    id: 'strategy-discussion',
    title: 'Strategy Discussion',
    titleSv: 'Strategidiskussion',
    description: 'Discussion on company strategy and direction.',
    descriptionSv: 'Diskussion om företagets strategi och inriktning.',
    type: 'discussion',
    estimatedDuration: 45,
    category: 'strategic',
    isRequired: false,
    requiredFor: [],
    sortOrder: 1,
  },
  {
    id: 'market-overview',
    title: 'Market Overview',
    titleSv: 'Marknadsöversikt',
    description: 'Review of market conditions and competitive landscape.',
    descriptionSv: 'Genomgång av marknadsförhållanden och konkurrensläge.',
    type: 'information',
    estimatedDuration: 15,
    category: 'strategic',
    isRequired: false,
    requiredFor: [],
    sortOrder: 2,
  },
  {
    id: 'risk-assessment',
    title: 'Risk Assessment',
    titleSv: 'Riskbedömning',
    description: 'Review of key risks and mitigation strategies.',
    descriptionSv: 'Genomgång av huvudsakliga risker och åtgärder.',
    type: 'discussion',
    estimatedDuration: 20,
    category: 'strategic',
    isRequired: false,
    requiredFor: ['ordinary'],
    sortOrder: 3,
  },

  // Operational Items
  {
    id: 'hr-matters',
    title: 'HR Matters',
    titleSv: 'Personalärenden',
    description: 'Discussion of human resources matters.',
    descriptionSv: 'Diskussion av personalfrågor.',
    type: 'discussion',
    estimatedDuration: 15,
    category: 'operational',
    isRequired: false,
    requiredFor: [],
    sortOrder: 1,
  },
  {
    id: 'legal-matters',
    title: 'Legal Matters',
    titleSv: 'Juridiska ärenden',
    description: 'Discussion of legal matters and compliance.',
    descriptionSv: 'Diskussion av juridiska frågor och efterlevnad.',
    type: 'discussion',
    estimatedDuration: 15,
    category: 'operational',
    isRequired: false,
    requiredFor: [],
    sortOrder: 2,
  },
  {
    id: 'compliance-report',
    title: 'Compliance Report',
    titleSv: 'Efterlevnadsrapport',
    description: 'Review of regulatory compliance status.',
    descriptionSv: 'Genomgång av regelefterlevnad.',
    type: 'information',
    estimatedDuration: 10,
    category: 'operational',
    isRequired: false,
    requiredFor: [],
    sortOrder: 3,
  },

  // Statutory Meeting Items
  {
    id: 'elect-board-chair',
    title: 'Election of Board Chair',
    titleSv: 'Val av styrelseordförande',
    description: 'Election of the board chairperson.',
    descriptionSv: 'Val av styrelseordförande.',
    type: 'decision',
    estimatedDuration: 10,
    category: 'governance',
    isRequired: true,
    requiredFor: ['statutory'],
    sortOrder: 10,
  },
  {
    id: 'adopt-signatory-rights',
    title: 'Adoption of Signatory Rights',
    titleSv: 'Fastställande av firmateckning',
    description: 'Decision on who may sign on behalf of the company.',
    descriptionSv: 'Beslut om vem som får teckna firman.',
    type: 'decision',
    estimatedDuration: 10,
    category: 'governance',
    isRequired: true,
    requiredFor: ['statutory'],
    sortOrder: 11,
  },
  {
    id: 'adopt-rules-procedure',
    title: 'Adoption of Rules of Procedure',
    titleSv: 'Fastställande av arbetsordning',
    description: "Adoption of the board's rules of procedure.",
    descriptionSv: 'Fastställande av styrelsens arbetsordning.',
    type: 'decision',
    estimatedDuration: 15,
    category: 'governance',
    isRequired: true,
    requiredFor: ['statutory'],
    sortOrder: 12,
  },
  {
    id: 'ceo-instructions',
    title: 'CEO Instructions',
    titleSv: 'VD-instruktion',
    description: 'Adoption of instructions for the CEO.',
    descriptionSv: 'Fastställande av instruktion för VD.',
    type: 'decision',
    estimatedDuration: 10,
    category: 'governance',
    isRequired: true,
    requiredFor: ['statutory'],
    sortOrder: 13,
  },
  {
    id: 'reporting-instructions',
    title: 'Reporting Instructions',
    titleSv: 'Rapporteringsinstruktion',
    description: 'Adoption of financial reporting instructions.',
    descriptionSv: 'Fastställande av instruktion för ekonomisk rapportering.',
    type: 'decision',
    estimatedDuration: 10,
    category: 'governance',
    isRequired: true,
    requiredFor: ['statutory'],
    sortOrder: 14,
  },

  // Closing Items
  {
    id: 'other-business',
    title: 'Other Business',
    titleSv: 'Övriga frågor',
    description: 'Discussion of any other business.',
    descriptionSv: 'Diskussion av övriga frågor.',
    type: 'discussion',
    estimatedDuration: 10,
    category: 'formality',
    isRequired: false,
    requiredFor: ['ordinary', 'extraordinary'],
    sortOrder: 90,
  },
  {
    id: 'next-meeting',
    title: 'Next Meeting',
    titleSv: 'Nästa möte',
    description: 'Confirmation of date and time for next meeting.',
    descriptionSv: 'Fastställande av datum och tid för nästa möte.',
    type: 'information',
    estimatedDuration: 5,
    category: 'formality',
    isRequired: false,
    requiredFor: ['ordinary'],
    sortOrder: 91,
  },
  {
    id: 'closing',
    title: 'Closing of the Meeting',
    titleSv: 'Mötets avslutande',
    description: 'The Chair declares the meeting closed.',
    descriptionSv: 'Ordföranden förklarar mötet avslutat.',
    type: 'formality',
    estimatedDuration: 2,
    category: 'formality',
    isRequired: true,
    requiredFor: ['ordinary', 'extraordinary', 'annual_general', 'statutory'],
    sortOrder: 99,
  },
];

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

export interface TemplateDefinition {
  id: string;
  name: string;
  nameSv: string;
  description: string;
  descriptionSv: string;
  meetingType: 'ordinary' | 'extraordinary' | 'annual_general' | 'statutory';
  defaultDuration: number; // minutes
  defaultQuorum: number;
  itemIds: string[]; // References to STANDARD_AGENDA_ITEMS
}

export const DEFAULT_TEMPLATES: TemplateDefinition[] = [
  {
    id: 'ordinary-board-meeting',
    name: 'Ordinary Board Meeting',
    nameSv: 'Ordinarie styrelsemöte',
    description: 'Standard template for regular board meetings with CEO report, financial review, and strategic discussions.',
    descriptionSv: 'Standardmall för ordinarie styrelsemöten med VD-rapport, ekonomisk genomgång och strategidiskussion.',
    meetingType: 'ordinary',
    defaultDuration: 180,
    defaultQuorum: 3,
    itemIds: [
      'opening',
      'attendance-quorum',
      'elect-adjusters',
      'approve-agenda',
      'approve-previous-minutes',
      'conflicts-declaration',
      'ceo-report',
      'financial-report',
      'matters-arising',
      'risk-assessment',
      'other-business',
      'next-meeting',
      'closing',
    ],
  },
  {
    id: 'extraordinary-board-meeting',
    name: 'Extraordinary Board Meeting',
    nameSv: 'Extra styrelsemöte',
    description: 'Template for urgent or special board meetings focused on specific decisions.',
    descriptionSv: 'Mall för extra styrelsemöten med fokus på specifika beslut.',
    meetingType: 'extraordinary',
    defaultDuration: 90,
    defaultQuorum: 3,
    itemIds: [
      'opening',
      'attendance-quorum',
      'elect-adjusters',
      'approve-agenda',
      'conflicts-declaration',
      'other-business',
      'closing',
    ],
  },
  {
    id: 'annual-general-meeting',
    name: 'Annual General Meeting (AGM)',
    nameSv: 'Årsstämma',
    description: 'Complete template for annual shareholder meetings with all statutory requirements.',
    descriptionSv: 'Komplett mall för årsstämma med alla lagstadgade punkter.',
    meetingType: 'annual_general',
    defaultDuration: 120,
    defaultQuorum: 1,
    itemIds: [
      'opening',
      'elect-chair',
      'elect-secretary',
      'attendance-quorum',
      'elect-adjusters',
      'approve-agenda',
      'board-report',
      'annual-accounts',
      'audit-report',
      'discharge-liability',
      'dividend-decision',
      'closing',
    ],
  },
  {
    id: 'statutory-board-meeting',
    name: 'Statutory Board Meeting',
    nameSv: 'Konstituerande styrelsemöte',
    description: 'Template for the first board meeting after an AGM with elections and adoptions.',
    descriptionSv: 'Mall för konstituerande styrelsemöte efter årsstämma med val och beslut.',
    meetingType: 'statutory',
    defaultDuration: 90,
    defaultQuorum: 3,
    itemIds: [
      'opening',
      'attendance-quorum',
      'elect-adjusters',
      'approve-agenda',
      'conflicts-declaration',
      'elect-board-chair',
      'adopt-signatory-rights',
      'adopt-rules-procedure',
      'ceo-instructions',
      'reporting-instructions',
      'closing',
    ],
  },
  {
    id: 'quick-meeting',
    name: 'Quick Board Meeting',
    nameSv: 'Kort styrelsemöte',
    description: 'Minimal template for brief update meetings.',
    descriptionSv: 'Minimal mall för korta uppdateringsmöten.',
    meetingType: 'ordinary',
    defaultDuration: 60,
    defaultQuorum: 3,
    itemIds: [
      'opening',
      'attendance-quorum',
      'approve-agenda',
      'ceo-report',
      'other-business',
      'closing',
    ],
  },
  {
    id: 'strategy-workshop',
    name: 'Strategy Workshop',
    nameSv: 'Strategiworkshop',
    description: 'Template for strategic planning sessions.',
    descriptionSv: 'Mall för strategiska planeringssessioner.',
    meetingType: 'ordinary',
    defaultDuration: 240,
    defaultQuorum: 3,
    itemIds: [
      'opening',
      'attendance-quorum',
      'approve-agenda',
      'market-overview',
      'strategy-discussion',
      'risk-assessment',
      'other-business',
      'closing',
    ],
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a standard agenda item by ID
 */
export function getStandardItem(itemId: string): StandardAgendaItem | undefined {
  return STANDARD_AGENDA_ITEMS.find(item => item.id === itemId);
}

/**
 * Get all items for a specific category
 */
export function getItemsByCategory(category: StandardAgendaItem['category']): StandardAgendaItem[] {
  return STANDARD_AGENDA_ITEMS
    .filter(item => item.category === category)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Get all required items for a meeting type
 */
export function getRequiredItems(
  meetingType: 'ordinary' | 'extraordinary' | 'annual_general' | 'statutory'
): StandardAgendaItem[] {
  return STANDARD_AGENDA_ITEMS
    .filter(item => item.isRequired && item.requiredFor.includes(meetingType))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Get a template definition by ID
 */
export function getTemplateDefinition(templateId: string): TemplateDefinition | undefined {
  return DEFAULT_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Convert a StandardAgendaItem to an AgendaItem for use in meetings
 */
export function standardItemToAgendaItem(
  standardItem: StandardAgendaItem,
  orderIndex: number,
  locale: 'en' | 'sv' = 'en'
): AgendaItem {
  return {
    id: uuidv4(),
    orderIndex,
    title: locale === 'sv' ? standardItem.titleSv : standardItem.title,
    description: locale === 'sv' ? standardItem.descriptionSv : standardItem.description,
    type: standardItem.type,
    estimatedDuration: standardItem.estimatedDuration,
    documentIds: [],
    conflictKeywords: [],
    recusedMemberIds: [],
    actionItems: [],
    isConfidential: false,
    isCompleted: false,
  };
}

/**
 * Generate agenda items from a template
 */
export function generateAgendaFromTemplate(
  templateId: string,
  locale: 'en' | 'sv' = 'en'
): AgendaItem[] {
  const template = getTemplateDefinition(templateId);
  if (!template) {
    return [];
  }

  return template.itemIds
    .map((itemId, index) => {
      const standardItem = getStandardItem(itemId);
      if (!standardItem) return null;
      return standardItemToAgendaItem(standardItem, index, locale);
    })
    .filter((item): item is AgendaItem => item !== null);
}

/**
 * Convert a template definition to a MeetingTemplate object
 */
export function templateDefinitionToMeetingTemplate(
  definition: TemplateDefinition,
  locale: 'en' | 'sv' = 'en'
): Omit<MeetingTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'usageCount'> {
  const agendaItems = generateAgendaFromTemplate(definition.id, locale);

  return {
    tenantId: undefined, // System template
    name: locale === 'sv' ? definition.nameSv : definition.name,
    description: locale === 'sv' ? definition.descriptionSv : definition.description,
    meetingType: definition.meetingType,
    agendaItems: agendaItems.map((item, index) => ({
      title: item.title,
      description: item.description,
      type: item.type,
      estimatedDuration: item.estimatedDuration,
      orderIndex: index,
      documentIds: [],
      conflictKeywords: [],
      recusedMemberIds: [],
      isConfidential: false,
    })),
    defaultDuration: definition.defaultDuration,
    defaultQuorum: definition.defaultQuorum,
    visibility: 'public',
  };
}

/**
 * Get all templates for a specific meeting type
 */
export function getTemplatesForMeetingType(
  meetingType: 'ordinary' | 'extraordinary' | 'annual_general' | 'statutory'
): TemplateDefinition[] {
  return DEFAULT_TEMPLATES.filter(t => t.meetingType === meetingType);
}

/**
 * Validate that an agenda has all required items for a meeting type
 */
export function validateAgendaCompleteness(
  agenda: AgendaItem[],
  meetingType: 'ordinary' | 'extraordinary' | 'annual_general' | 'statutory',
  locale: 'en' | 'sv' = 'en'
): { isValid: boolean; missingItems: string[] } {
  const requiredItems = getRequiredItems(meetingType);
  const agendaTitles = agenda.map(item => item.title.toLowerCase());

  const missingItems = requiredItems.filter(required => {
    const titleToCheck = locale === 'sv' ? required.titleSv : required.title;
    return !agendaTitles.some(
      title => title.includes(titleToCheck.toLowerCase()) ||
               titleToCheck.toLowerCase().includes(title)
    );
  });

  return {
    isValid: missingItems.length === 0,
    missingItems: missingItems.map(item => locale === 'sv' ? item.titleSv : item.title),
  };
}

/**
 * Get grouped standard items for the template builder UI
 */
export function getGroupedStandardItems(): Record<string, StandardAgendaItem[]> {
  const groups: Record<string, StandardAgendaItem[]> = {
    'Opening & Closing': [],
    'Governance': [],
    'Financial': [],
    'Strategic': [],
    'Operational': [],
  };

  for (const item of STANDARD_AGENDA_ITEMS) {
    switch (item.category) {
      case 'formality':
        groups['Opening & Closing']!.push(item);
        break;
      case 'governance':
        groups['Governance']!.push(item);
        break;
      case 'financial':
        groups['Financial']!.push(item);
        break;
      case 'strategic':
        groups['Strategic']!.push(item);
        break;
      case 'operational':
        groups['Operational']!.push(item);
        break;
    }
  }

  // Sort items within each group
  for (const key of Object.keys(groups)) {
    groups[key]!.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return groups;
}

/**
 * Calculate total duration of an agenda
 */
export function calculateTotalDuration(items: Array<{ estimatedDuration: number }>): number {
  return items.reduce((total, item) => total + item.estimatedDuration, 0);
}

/**
 * Suggest items that could be added to an agenda based on meeting type
 */
export function suggestAdditionalItems(
  currentAgenda: AgendaItem[],
  meetingType: 'ordinary' | 'extraordinary' | 'annual_general' | 'statutory'
): StandardAgendaItem[] {
  const currentTitles = new Set(currentAgenda.map(item => item.title.toLowerCase()));

  return STANDARD_AGENDA_ITEMS
    .filter(item => {
      // Don't suggest if already in agenda
      if (currentTitles.has(item.title.toLowerCase()) || currentTitles.has(item.titleSv.toLowerCase())) {
        return false;
      }
      // Prefer items relevant to this meeting type
      if (item.requiredFor.includes(meetingType) || item.requiredFor.length === 0) {
        return true;
      }
      return false;
    })
    .sort((a, b) => {
      // Prioritize required items
      const aRequired = a.requiredFor.includes(meetingType);
      const bRequired = b.requiredFor.includes(meetingType);
      if (aRequired && !bRequired) return -1;
      if (!aRequired && bRequired) return 1;
      return a.sortOrder - b.sortOrder;
    })
    .slice(0, 10); // Return top 10 suggestions
}
