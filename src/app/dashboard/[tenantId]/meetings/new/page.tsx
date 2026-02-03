'use client';

import React, { useState } from 'react';
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
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Member } from '@/types/schema';
import { Timestamp } from 'firebase/firestore';

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
}

export default function NewMeetingPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    meetingType: 'ordinary',
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
  });

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
      : (form.address.trim().length > 0 || form.room.trim().length > 0) || form.videoUrl.trim().length > 0;
  const isStep3Valid = form.selectedMemberIds.length >= form.quorumRequired;

  return (
    <div className="p-8 max-w-3xl mx-auto text-white">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/${tenantId}/meetings`}
          className="inline-flex items-center text-sm text-white/50 hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Meetings
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Schedule New Meeting</h1>
        <p className="text-white/50 mt-1">Create a new board or committee meeting</p>
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
              num < step && 'text-emerald-400',
              num === step && 'text-white',
              num > step && 'text-white/40'
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                num < step && 'bg-emerald-500/20 text-emerald-400',
                num === step && 'bg-white text-black',
                num > step && 'bg-white/10 text-white/40'
              )}
            >
              {num < step ? <Check className="h-4 w-4" /> : num}
            </div>
            <span className="hidden sm:inline text-sm font-medium">{label}</span>
            {num < 3 && <div className="w-12 h-px bg-white/10 mx-2" />}
          </div>
        ))}
      </div>

      {/* Step 1: Meeting Details */}
      {step === 1 && (
        <div className="rounded-xl bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold mb-1">Meeting Details</h2>
          <p className="text-sm text-white/50 mb-6">Basic information about the meeting</p>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/70">Meeting Title</label>
              <input
                type="text"
                placeholder="Q4 Board Meeting"
                value={form.title}
                onChange={(e) => updateForm({ title: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/70">Description (optional)</label>
              <textarea
                placeholder="Quarterly board meeting to review financial results..."
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/70">Meeting Type</label>
              <select
                value={form.meetingType}
                onChange={(e) => updateForm({ meetingType: e.target.value as MeetingType })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <option value="ordinary">Ordinary Board Meeting</option>
                <option value="extraordinary">Extraordinary Meeting</option>
                <option value="annual_general">Annual General Meeting</option>
                <option value="statutory">Statutory Meeting</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => updateForm({ date: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">Start Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => updateForm({ startTime: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">End Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => updateForm({ endTime: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(2)}
                disabled={!isStep1Valid}
                className="px-6 py-2 bg-white text-black font-medium rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Location */}
      {step === 2 && (
        <div className="rounded-xl bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold mb-1">Meeting Location</h2>
          <p className="text-sm text-white/50 mb-6">Where will the meeting take place?</p>

          <div className="space-y-6">
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
                    'flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors',
                    form.locationType === value
                      ? 'border-white/30 bg-white/10'
                      : 'border-white/10 bg-white/[0.02] hover:bg-white/5'
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="font-medium text-sm">{label}</span>
                </button>
              ))}
            </div>

            {(form.locationType === 'physical' || form.locationType === 'hybrid') && (
              <div className="space-y-4 p-4 rounded-lg bg-white/5">
                <h4 className="font-medium">Physical Location</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/70">Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <input
                        type="text"
                        placeholder="Stureplan 4, Stockholm"
                        value={form.address}
                        onChange={(e) => updateForm({ address: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/70">Room</label>
                    <input
                      type="text"
                      placeholder="Board Room"
                      value={form.room}
                      onChange={(e) => updateForm({ room: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {(form.locationType === 'virtual' || form.locationType === 'hybrid') && (
              <div className="space-y-4 p-4 rounded-lg bg-white/5">
                <h4 className="font-medium">Video Conference</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/70">Platform</label>
                    <select
                      value={form.videoPlatform}
                      onChange={(e) => updateForm({ videoPlatform: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                      <option value="teams">Microsoft Teams</option>
                      <option value="zoom">Zoom</option>
                      <option value="google_meet">Google Meet</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/70">Meeting Link</label>
                    <div className="relative">
                      <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <input
                        type="text"
                        placeholder="https://teams.microsoft.com/..."
                        value={form.videoUrl}
                        onChange={(e) => updateForm({ videoUrl: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 bg-white/5 border border-white/10 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!isStep2Valid}
                className="px-6 py-2 bg-white text-black font-medium rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Attendees */}
      {step === 3 && (
        <div className="rounded-xl bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold mb-1">Invite Attendees</h2>
          <p className="text-sm text-white/50 mb-6">Select board members to invite to this meeting</p>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/70">Quorum Required</label>
              <select
                value={String(form.quorumRequired)}
                onChange={(e) => updateForm({ quorumRequired: parseInt(e.target.value) })}
                className="w-32 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                {[1, 2, 3, 4, 5].map((num) => (
                  <option key={num} value={String(num)}>
                    {num} {num === 1 ? 'member' : 'members'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-white/40">
                Minimum number of attendees required for a valid meeting
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/70">Board Members</label>
                <span className="text-sm text-white/40">
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
                          ? 'border-white/30 bg-white/10'
                          : 'border-white/10 bg-white/[0.02] hover:bg-white/5'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-medium">
                          {member.displayName.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-sm">{member.displayName}</p>
                          <p className="text-xs text-white/40">{member.title}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-xs rounded-md bg-white/10 text-white/60 capitalize">
                        {member.role}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {!isStep3Valid && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                Please select at least {form.quorumRequired} members to meet quorum requirements.
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 bg-white/5 border border-white/10 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!isStep3Valid || isSubmitting}
                className="px-6 py-2 bg-white text-black font-medium rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : (
                  'Create Meeting'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
