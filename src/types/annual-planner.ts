/**
 * Annual Planner (Årshjul) Type Definitions
 *
 * Types for the circular annual wheel planner, inspired by Plandisc.
 * Used for planning board activities across the year.
 */

export interface PlannerRing {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  order: number;
}

export interface PlannerActivityType {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

export interface PlannerLabel {
  id: string;
  name: string;
  color: string;
}

export interface PlannerEvent {
  id: string;
  title: string;
  description?: string;
  ringId: string;
  activityTypeId: string;
  startDate: Date;
  endDate: Date;
  labelIds: string[];
}

export interface AnnualPlannerState {
  rings: PlannerRing[];
  activityTypes: PlannerActivityType[];
  labels: PlannerLabel[];
  events: PlannerEvent[];
  startMonth: number; // 0-11
  year: number;
}
