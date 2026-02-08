'use client';

/**
 * Annual Wheel (Årshjul) - SVG Circular Planner
 *
 * Renders a Plandisc-style circular annual wheel with concentric rings,
 * month divisions, and color-coded event arcs.
 */

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { PlannerRing, PlannerEvent, PlannerActivityType } from '@/types/annual-planner';

// ============================================================================
// CONSTANTS
// ============================================================================

const VIEW_SIZE = 800;
const CX = VIEW_SIZE / 2;
const CY = VIEW_SIZE / 2;
const INNER_RADIUS = 100;
const OUTER_RADIUS = 340;
const LABEL_RADIUS = 360;
const RING_GAP = 3;
const MONTH_NAMES_SV = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
];

// ============================================================================
// SVG MATH HELPERS
// ============================================================================

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number
): string {
  // Clamp to avoid zero-length arcs
  if (Math.abs(endAngle - startAngle) < 0.1) return '';

  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    'M', outerStart.x, outerStart.y,
    'A', outerR, outerR, 0, largeArc, 1, outerEnd.x, outerEnd.y,
    'L', innerEnd.x, innerEnd.y,
    'A', innerR, innerR, 0, largeArc, 0, innerStart.x, innerStart.y,
    'Z',
  ].join(' ');
}

function dateToAngle(date: Date, startMonth: number): number {
  const month = date.getMonth();
  const day = date.getDate();
  const daysInMonth = new Date(date.getFullYear(), month + 1, 0).getDate();
  const monthOffset = ((month - startMonth + 12) % 12);
  const dayFraction = (day - 1) / daysInMonth;
  return (monthOffset + dayFraction) * 30;
}

function getTodayAngle(startMonth: number): number {
  const now = new Date();
  return dateToAngle(now, startMonth);
}

// ============================================================================
// RING BACKGROUND COMPONENT
// ============================================================================

interface RingBackgroundProps {
  cx: number;
  cy: number;
  innerR: number;
  outerR: number;
  color: string;
  ringName: string;
}

function RingBackground({ cx, cy, innerR, outerR, color, ringName }: RingBackgroundProps) {
  // Draw 12 month segments as ring background
  const segments = [];
  for (let i = 0; i < 12; i++) {
    const startAngle = i * 30;
    const endAngle = (i + 1) * 30;
    segments.push(
      <path
        key={i}
        d={describeArc(cx, cy, innerR, outerR, startAngle, endAngle)}
        fill={color}
        fillOpacity={i % 2 === 0 ? 0.08 : 0.04}
        stroke="hsl(var(--border))"
        strokeWidth={0.5}
        strokeOpacity={0.3}
      />
    );
  }

  // Ring name text along the first month segment
  const midR = (innerR + outerR) / 2;
  const textAngle = 15; // mid of first month
  const textPos = polarToCartesian(cx, cy, midR, textAngle);
  const rotation = textAngle;

  return (
    <g>
      {segments}
      <text
        x={textPos.x}
        y={textPos.y}
        fill="hsl(var(--muted-foreground))"
        fontSize={9}
        fontWeight={500}
        textAnchor="middle"
        dominantBaseline="central"
        transform={`rotate(${rotation}, ${textPos.x}, ${textPos.y})`}
        opacity={0.6}
      >
        {ringName}
      </text>
    </g>
  );
}

// ============================================================================
// EVENT ARC COMPONENT
// ============================================================================

interface EventArcProps {
  event: PlannerEvent;
  cx: number;
  cy: number;
  innerR: number;
  outerR: number;
  startMonth: number;
  color: string;
  onHover: (event: PlannerEvent | null) => void;
  onClick: (event: PlannerEvent) => void;
}

function EventArc({
  event,
  cx,
  cy,
  innerR,
  outerR,
  startMonth,
  color,
  onHover,
  onClick,
}: EventArcProps) {
  const startAngle = dateToAngle(event.startDate, startMonth);
  let endAngle = dateToAngle(event.endDate, startMonth);

  // Ensure at least a minimum arc size for visibility
  if (endAngle - startAngle < 3) {
    endAngle = startAngle + 3;
  }

  const path = describeArc(cx, cy, innerR + 2, outerR - 2, startAngle, endAngle);
  if (!path) return null;

  // Calculate text position
  const midAngle = (startAngle + endAngle) / 2;
  const midR = (innerR + outerR) / 2;
  const textPos = polarToCartesian(cx, cy, midR, midAngle);
  const arcSpan = endAngle - startAngle;

  // Abbreviate title for small arcs
  const maxChars = Math.floor(arcSpan / 2.5);
  const displayTitle =
    event.title.length > maxChars && maxChars > 3
      ? event.title.slice(0, maxChars - 1) + '\u2026'
      : maxChars <= 3
        ? event.title.slice(0, 4)
        : event.title;

  // Text rotation to follow the arc
  let textRotation = midAngle;
  if (midAngle > 90 && midAngle < 270) {
    textRotation += 180;
  }

  return (
    <g
      className="cursor-pointer transition-opacity hover:opacity-80"
      onMouseEnter={() => onHover(event)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(event)}
    >
      <path
        d={path}
        fill={color}
        stroke="white"
        strokeWidth={1}
        rx={4}
      />
      {arcSpan > 6 && (
        <text
          x={textPos.x}
          y={textPos.y}
          fill="white"
          fontSize={arcSpan > 15 ? 10 : 8}
          fontWeight={600}
          textAnchor="middle"
          dominantBaseline="central"
          transform={`rotate(${textRotation}, ${textPos.x}, ${textPos.y})`}
          className="pointer-events-none select-none"
        >
          {displayTitle}
        </text>
      )}
    </g>
  );
}

// ============================================================================
// MONTH LABELS
// ============================================================================

interface MonthLabelsProps {
  cx: number;
  cy: number;
  radius: number;
  startMonth: number;
}

function MonthLabels({ cx, cy, radius, startMonth }: MonthLabelsProps) {
  return (
    <g>
      {Array.from({ length: 12 }, (_, i) => {
        const monthIndex = (startMonth + i) % 12;
        const midAngle = i * 30 + 15;
        const pos = polarToCartesian(cx, cy, radius, midAngle);
        let rotation = midAngle;
        if (midAngle > 90 && midAngle < 270) {
          rotation += 180;
        }
        return (
          <text
            key={i}
            x={pos.x}
            y={pos.y}
            fill="hsl(var(--foreground))"
            fontSize={11}
            fontWeight={600}
            textAnchor="middle"
            dominantBaseline="central"
            transform={`rotate(${rotation}, ${pos.x}, ${pos.y})`}
            className="select-none"
          >
            {MONTH_NAMES_SV[monthIndex]}
          </text>
        );
      })}
    </g>
  );
}

// ============================================================================
// MONTH DIVIDER LINES
// ============================================================================

interface MonthDividersProps {
  cx: number;
  cy: number;
  innerR: number;
  outerR: number;
}

function MonthDividers({ cx, cy, innerR, outerR }: MonthDividersProps) {
  return (
    <g>
      {Array.from({ length: 12 }, (_, i) => {
        const angle = i * 30;
        const inner = polarToCartesian(cx, cy, innerR, angle);
        const outer = polarToCartesian(cx, cy, outerR + 8, angle);
        return (
          <line
            key={i}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke="hsl(var(--border))"
            strokeWidth={1}
            strokeOpacity={0.5}
          />
        );
      })}
    </g>
  );
}

// ============================================================================
// TODAY INDICATOR
// ============================================================================

interface TodayIndicatorProps {
  cx: number;
  cy: number;
  innerR: number;
  outerR: number;
  startMonth: number;
}

function TodayIndicator({ cx, cy, innerR, outerR, startMonth }: TodayIndicatorProps) {
  const angle = getTodayAngle(startMonth);
  const inner = polarToCartesian(cx, cy, innerR - 10, angle);
  const outer = polarToCartesian(cx, cy, outerR + 15, angle);
  const dotPos = polarToCartesian(cx, cy, outerR + 20, angle);

  return (
    <g>
      <line
        x1={inner.x}
        y1={inner.y}
        x2={outer.x}
        y2={outer.y}
        stroke="hsl(var(--destructive))"
        strokeWidth={2}
        strokeDasharray="4 2"
      />
      <circle
        cx={dotPos.x}
        cy={dotPos.y}
        r={4}
        fill="hsl(var(--destructive))"
      />
    </g>
  );
}

// ============================================================================
// WEEK NUMBER TICKS
// ============================================================================

interface WeekTicksProps {
  cx: number;
  cy: number;
  outerR: number;
  startMonth: number;
  year: number;
}

function WeekTicks({ cx, cy, outerR, startMonth, year }: WeekTicksProps) {
  // Place week number ticks every ~7 days around the outer ring
  const ticks = [];
  for (let week = 0; week < 52; week++) {
    // Calculate the date for this week
    const dayOfYear = week * 7;
    const date = new Date(year, 0, 1 + dayOfYear);
    if (date.getFullYear() !== year) break;

    const angle = dateToAngle(date, startMonth);
    const tickInner = polarToCartesian(cx, cy, outerR + 2, angle);
    const tickOuter = polarToCartesian(cx, cy, outerR + 6, angle);

    ticks.push(
      <line
        key={week}
        x1={tickInner.x}
        y1={tickInner.y}
        x2={tickOuter.x}
        y2={tickOuter.y}
        stroke="hsl(var(--muted-foreground))"
        strokeWidth={0.5}
        strokeOpacity={0.4}
      />
    );
  }
  return <g>{ticks}</g>;
}

// ============================================================================
// TOOLTIP
// ============================================================================

interface TooltipProps {
  event: PlannerEvent | null;
  activityTypes: PlannerActivityType[];
}

function WheelTooltip({ event, activityTypes }: TooltipProps) {
  if (!event) return null;

  const activity = activityTypes.find((a) => a.id === event.activityTypeId);
  const startStr = event.startDate.toLocaleDateString('sv-SE');
  const endStr = event.endDate.toLocaleDateString('sv-SE');

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-popover border border-border rounded-lg shadow-lg px-4 py-3 pointer-events-none">
      <p className="font-semibold text-sm text-foreground">{event.title}</p>
      {activity && (
        <div className="flex items-center gap-2 mt-1">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: activity.color }}
          />
          <span className="text-xs text-muted-foreground">{activity.name}</span>
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-1">
        {startStr} &ndash; {endStr}
      </p>
      {event.description && (
        <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
      )}
    </div>
  );
}

// ============================================================================
// MAIN WHEEL COMPONENT
// ============================================================================

interface AnnualWheelProps {
  rings: PlannerRing[];
  events: PlannerEvent[];
  activityTypes: PlannerActivityType[];
  startMonth: number;
  year: number;
  onEventClick: (event: PlannerEvent) => void;
  className?: string;
}

export function AnnualWheel({
  rings,
  events,
  activityTypes,
  startMonth,
  year,
  onEventClick,
  className,
}: AnnualWheelProps) {
  const [hoveredEvent, setHoveredEvent] = useState<PlannerEvent | null>(null);

  const visibleRings = useMemo(() => rings.filter((r) => r.visible), [rings]);

  const ringWidth = useMemo(() => {
    if (visibleRings.length === 0) return 0;
    return (OUTER_RADIUS - INNER_RADIUS - (visibleRings.length - 1) * RING_GAP) / visibleRings.length;
  }, [visibleRings]);

  const getRingBounds = (ringIndex: number) => {
    const innerR = INNER_RADIUS + ringIndex * (ringWidth + RING_GAP);
    const outerR = innerR + ringWidth;
    return { innerR, outerR };
  };

  const getActivityColor = (event: PlannerEvent) => {
    const activity = activityTypes.find((a) => a.id === event.activityTypeId);
    return activity?.color || '#94a3b8';
  };

  return (
    <div className={cn('relative w-full h-full flex items-center justify-center', className)}>
      <WheelTooltip event={hoveredEvent} activityTypes={activityTypes} />
      <svg
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        className="w-full h-full max-w-[700px] max-h-[700px]"
      >
        {/* Center circle */}
        <circle
          cx={CX}
          cy={CY}
          r={INNER_RADIUS - 5}
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
          strokeWidth={1}
        />

        {/* Ring backgrounds */}
        {visibleRings.map((ring, index) => {
          const { innerR, outerR } = getRingBounds(index);
          return (
            <RingBackground
              key={ring.id}
              cx={CX}
              cy={CY}
              innerR={innerR}
              outerR={outerR}
              color={ring.color}
              ringName={ring.name}
            />
          );
        })}

        {/* Month divider lines */}
        <MonthDividers cx={CX} cy={CY} innerR={INNER_RADIUS} outerR={OUTER_RADIUS} />

        {/* Week ticks */}
        <WeekTicks cx={CX} cy={CY} outerR={OUTER_RADIUS} startMonth={startMonth} year={year} />

        {/* Events */}
        {visibleRings.map((ring, ringIndex) => {
          const { innerR, outerR } = getRingBounds(ringIndex);
          const ringEvents = events.filter(
            (e) =>
              e.ringId === ring.id &&
              activityTypes.find((a) => a.id === e.activityTypeId)?.visible !== false
          );

          return ringEvents.map((event) => (
            <EventArc
              key={event.id}
              event={event}
              cx={CX}
              cy={CY}
              innerR={innerR}
              outerR={outerR}
              startMonth={startMonth}
              color={getActivityColor(event)}
              onHover={setHoveredEvent}
              onClick={onEventClick}
            />
          ));
        })}

        {/* Today indicator */}
        <TodayIndicator
          cx={CX}
          cy={CY}
          innerR={INNER_RADIUS}
          outerR={OUTER_RADIUS}
          startMonth={startMonth}
        />

        {/* Month labels */}
        <MonthLabels cx={CX} cy={CY} radius={LABEL_RADIUS} startMonth={startMonth} />

        {/* Center text */}
        <text
          x={CX}
          y={CY - 10}
          fill="hsl(var(--foreground))"
          fontSize={16}
          fontWeight={700}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {year}
        </text>
        <text
          x={CX}
          y={CY + 12}
          fill="hsl(var(--muted-foreground))"
          fontSize={10}
          textAnchor="middle"
          dominantBaseline="central"
        >
          Årshjul
        </text>
      </svg>
    </div>
  );
}
