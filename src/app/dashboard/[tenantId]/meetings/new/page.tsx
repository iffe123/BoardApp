'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Building2,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Member, AgendaItem } from '@/types/schema';
import { Timestamp } from 'firebase/firestore';
import {
  DEFAULT_TEMPLATES,
  generateAgendaFromTemplate,
  calculateTotalDuration,
} from '@/lib/meeting-templates';

// Mock members - would come from Firestore
const mockMembers: (Member & { displayName: string; email: string })[] = [
  { id: '1', tenantId: 'tenant1', userId: '1', role: 'chair', displayName: 'Anna Lindqvist', email: 'anna@example.com', title: 'Chair', isActive: true, conflicts: [], permissions: { canCreateMeetings: true, canManageMembers: true, canAccessFinancials: true, canSignDocuments: true, canManageDocuments: true }, joinedAt: Timestamp.now() },
  { id: '2', tenantId: 'tenant1', userId: '2', role: 'secretary', displayName: 'Erik Johansson', email: 'erik@example.com', title: 'Secretary', isActive: true, conflicts: [], permissions: { canCreateMeetings: true, canManageMembers: false, canAccessFinancials: true, canSignDocuments: true, canManageDocuments: true }, joinedAt: Timestamp.now() },
  { id: '3', tenantId: 'tenant1', userId: '3', role: 'director', displayName: 'Maria Svensson', email: 'maria@example.com', title: 'Board Member', isActive: true, conflicts: [], permissions: { canCreateMeetings: false, canManageMembers: false, canAccessFinancials: true, canSignDocuments: true, canManageDocuments: false }, joinedAt: Timestamp.now() },
  { id: '4', tenantId: 'tenant1', userId: '4', role: 'director', displayName: 'Karl Nilsson', email: 'karl@example.com', title: 'Board Member', isActive: true, conflicts: [], permissions: { canCreateMeetings: false, canManageMembers: false, canAccessFinancials: true, canSignDocuments: true, canManageDocuments: false }, joinedAt: Timestamp.now() },
  { id: '5', tenantId: 'tenant1', userId: '5', role: 'director', displayName: 'Lisa Andersson', email: 'lisa@example.com', title: 'External Director', isActive: true, conflicts: [], permissions: { canCreateMeetings: false, canManageMembers: false, canAccessFinancials: true, canSignDocuments: true, canManageDocuments: false }, joinedAt: Timestamp.now() },
];

type LocationType = 'physical' | 'virtual' | 'hybrid';
type MeetingType = 'ordinary' | 'extraordinary' | 'annual_general' | 'statutory';

interface FormState {
  title: string;
  description: string;
  meetingType: MeetingType;
  templateId: string;
  date: string;
  startTime: string;
  endTime: string;
  locationType: LocationType;
  address: string;
  room: string;
  videoUrl: string;
  videoPlatform: string;
  quorumRequired: number;
  selectedMemberIds: string[];
  agendaItems: AgendaItem[];
}

export default function NewMeetingPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    meetingType: 'ordinary',
    templateId: '',
    date: '',
    startTime: '09:00',
    endTime: '11:00',
    locationType: 'hybrid',
    address: '',
    room: '',
    videoUrl: '',
    videoPlatform: 'teams',
    quorumRequired: 3,
    selectedMemberIds: mockMembers.map((m) => m.id),
    agendaItems: [],
  });

  // Get templates filtered by meeting type
  const availableTemplates = DEFAULT_TEMPLATES.filter(
    (t) => t.meetingType === form.meetingType
  );

  // Auto-select template when meeting type changes
  useEffect(() => {
    const templates = DEFAULT_TEMPLATES.filter((t) => t.meetingType === form.meetingType);
    const defaultTemplate = templates[0];
    if (defaultTemplate && form.templateId === '') {
      const template = DEFAULT_TEMPLATES.find((t) => t.id === defaultTemplate.id);
      if (template) {
        const agendaItems = generateAgendaFromTemplate(defaultTemplate.id, 'en');
        const duration = calculateTotalDuration(agendaItems);
        const startDate = form.date ? new Date(`${form.date}T${form.startTime}`) : new Date();
        const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
        const endTimeStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

        setForm((prev) => ({
          ...prev,
          templateId: defaultTemplate.id,
          agendaItems,
          quorumRequired: template.defaultQuorum,
          endTime: form.date ? endTimeStr : prev.endTime,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.meetingType]);

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = DEFAULT_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      const agendaItems = generateAgendaFromTemplate(templateId, 'en');
      const duration = calculateTotalDuration(agendaItems);
      const startDate = form.date ? new Date(`${form.date}T${form.startTime}`) : new Date();
      const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
      const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

      setForm((prev) => ({
        ...prev,
        templateId,
        agendaItems,
        quorumRequired: template.defaultQuorum,
        endTime: form.date ? endTime : prev.endTime,
      }));
    }
  };

  // AI-generate agenda from description
  const handleAIGenerate = async () => {
    if (!form.description.trim()) return;

    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/ai/meeting-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_agenda',
          meetingType: form.meetingType,
          description: form.description,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.agendaItems && Array.isArray(data.agendaItems)) {
          setForm((prev) => ({
            ...prev,
            agendaItems: data.agendaItems,
            templateId: 'ai-generated',
          }));
        }
      }
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const updateForm = (updates: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const toggleMember = (memberId: string) => {
    setForm((prev) => ({
      ...prev,
      selectedMemberIds: prev.selectedMemberIds.includes(memberId)
        ? prev.selectedMemberIds.filter((id) => id !== memberId)
        : [...prev.selectedMemberIds, memberId],
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // In real app, save to Firestore
      // const meetingId = await createMeeting(form);
      const meetingId = 'new-meeting-' + Date.now();

      router.push(`/dashboard/${tenantId}/meetings/${meetingId}`);
    } catch (error) {
      console.error('Error creating meeting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStep1Valid = form.title.trim().length > 0 && form.date && form.startTime && form.endTime;
  const isStep2Valid =
    form.locationType === 'virtual'
      ? form.videoUrl.trim().length > 0
      : form.locationType === 'physical'
      ? form.address.trim().length > 0 || form.room.trim().length > 0
      : (form.address.trim().length > 0 || form.room.trim().length > 0) && form.videoUrl.trim().length > 0;
  const isStep3Valid = form.selectedMemberIds.length >= form.quorumRequired;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/${tenantId}/meetings`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Meetings
        </Link>
        <h1 className="text-3xl font-bold">Schedule New Meeting</h1>
        <p className="text-muted-foreground mt-1">Create a new board or committee meeting</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[
          { num: 1, label: 'Details' },
          { num: 2, label: 'Location' },
          { num: 3, label: 'Attendees' },
        ].map(({ num, label }) => (
          <div
            key={num}
            className={cn(
              'flex items-center gap-2',
              num < step && 'text-primary',
              num === step && 'text-foreground',
              num > step && 'text-muted-foreground'
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                num <= step ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}
            >
              {num}
            </div>
            <span className="hidden sm:inline text-sm font-medium">{label}</span>
            {num < 3 && <div className="w-12 h-px bg-muted mx-2" />}
          </div>
        ))}
      </div>

      {/* Step 1: Meeting Details */}
      {step === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Meeting Details</CardTitle>
              <CardDescription>Basic information about the meeting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title</Label>
                <Input
                  id="title"
                  placeholder="Q4 Board Meeting"
                  value={form.title}
                  onChange={(e) => updateForm({ title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <div className="relative">
                  <Textarea
                    id="description"
                    placeholder="Quarterly board meeting to review financial results, approve budget, and discuss strategy..."
                    value={form.description}
                    onChange={(e) => updateForm({ description: e.target.value })}
                    rows={3}
                  />
                  {form.description.trim().length > 20 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="absolute bottom-2 right-2"
                      onClick={handleAIGenerate}
                      disabled={isGeneratingAI}
                    >
                      {isGeneratingAI ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-1" />
                      )}
                      Generate Agenda with AI
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Meeting Type</Label>
                <Select
                  value={form.meetingType}
                  onValueChange={(value: MeetingType) => {
                    updateForm({ meetingType: value, templateId: '' });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ordinary">Ordinary Board Meeting</SelectItem>
                    <SelectItem value="extraordinary">Extraordinary Meeting</SelectItem>
                    <SelectItem value="annual_general">Annual General Meeting</SelectItem>
                    <SelectItem value="statutory">Statutory Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => updateForm({ date: e.target.value })}
                    leftIcon={<Calendar className="h-4 w-4" />}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => updateForm({ startTime: e.target.value })}
                    leftIcon={<Clock className="h-4 w-4" />}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={form.endTime}
                    onChange={(e) => updateForm({ endTime: e.target.value })}
                    leftIcon={<Clock className="h-4 w-4" />}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Meeting Template
              </CardTitle>
              <CardDescription>
                Choose a template to pre-populate your agenda, or use AI to generate one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {availableTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateSelect(template.id)}
                    className={cn(
                      'flex flex-col items-start p-4 rounded-lg border-2 transition-colors text-left',
                      form.templateId === template.id
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/50'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{template.name}</span>
                      {form.templateId === template.id && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{template.itemIds.length} items</span>
                      <span>{template.defaultDuration} min</span>
                    </div>
                  </button>
                ))}
                {form.templateId === 'ai-generated' && (
                  <div className="flex flex-col items-start p-4 rounded-lg border-2 border-primary bg-primary/5 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="font-medium">AI Generated</span>
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Custom agenda generated based on your description
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{form.agendaItems.length} items</span>
                      <span>{calculateTotalDuration(form.agendaItems)} min</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Agenda Preview */}
              {form.agendaItems.length > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    Agenda Preview
                    <Badge variant="outline">
                      {form.agendaItems.length} items
                    </Badge>
                    <Badge variant="outline">
                      {calculateTotalDuration(form.agendaItems)} min total
                    </Badge>
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {form.agendaItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded bg-background"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground w-6">
                            {index + 1}.
                          </span>
                          <span className="text-sm">{item.title}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs capitalize',
                              item.type === 'decision' && 'border-blue-500 text-blue-600',
                              item.type === 'discussion' && 'border-amber-500 text-amber-600',
                              item.type === 'formality' && 'border-gray-400 text-gray-600',
                              item.type === 'information' && 'border-green-500 text-green-600'
                            )}
                          >
                            {item.type}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {item.estimatedDuration} min
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {form.agendaItems.length === 0 && (
                <div className="p-4 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Select a template or describe your meeting to generate an agenda
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!isStep1Valid || form.agendaItems.length === 0}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Location */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Meeting Location</CardTitle>
            <CardDescription>Where will the meeting take place?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { value: 'physical', label: 'In Person', icon: Building2 },
                { value: 'virtual', label: 'Virtual', icon: Video },
                { value: 'hybrid', label: 'Hybrid', icon: Users },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateForm({ locationType: value as LocationType })}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                    form.locationType === value
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/50'
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </div>

            {(form.locationType === 'physical' || form.locationType === 'hybrid') && (
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium">Physical Location</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="Stureplan 4, Stockholm"
                      value={form.address}
                      onChange={(e) => updateForm({ address: e.target.value })}
                      leftIcon={<MapPin className="h-4 w-4" />}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room">Room</Label>
                    <Input
                      id="room"
                      placeholder="Board Room"
                      value={form.room}
                      onChange={(e) => updateForm({ room: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {(form.locationType === 'virtual' || form.locationType === 'hybrid') && (
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium">Video Conference</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select
                      value={form.videoPlatform}
                      onValueChange={(value) => updateForm({ videoPlatform: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teams">Microsoft Teams</SelectItem>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="google_meet">Google Meet</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="videoUrl">Meeting Link</Label>
                    <Input
                      id="videoUrl"
                      placeholder="https://teams.microsoft.com/..."
                      value={form.videoUrl}
                      onChange={(e) => updateForm({ videoUrl: e.target.value })}
                      leftIcon={<Video className="h-4 w-4" />}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!isStep2Valid}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Attendees */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Attendees</CardTitle>
            <CardDescription>Select board members to invite to this meeting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Quorum Required</Label>
              <Select
                value={String(form.quorumRequired)}
                onValueChange={(value) => updateForm({ quorumRequired: parseInt(value) })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      {num} {num === 1 ? 'member' : 'members'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Minimum number of attendees required for a valid meeting
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Board Members</Label>
                <span className="text-sm text-muted-foreground">
                  {form.selectedMemberIds.length} selected
                </span>
              </div>
              <div className="space-y-2">
                {mockMembers.map((member) => {
                  const isSelected = form.selectedMemberIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleMember(member.id)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg border transition-colors',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar name={member.displayName} size="sm" />
                        <div className="text-left">
                          <p className="font-medium text-sm">{member.displayName}</p>
                          <p className="text-xs text-muted-foreground">{member.title}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {member.role}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            {!isStep3Valid && (
              <div className="p-3 rounded-md bg-amber-50 text-amber-800 text-sm">
                Please select at least {form.quorumRequired} members to meet quorum requirements.
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={!isStep3Valid} isLoading={isSubmitting}>
                Create Meeting
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
