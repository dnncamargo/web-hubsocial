import { Timestamp } from 'firebase/firestore';
import { OptionalField as OptionalFieldType } from '../types/optionalFields';
import { ActionPlanning } from '../types/actions';
import { AutomationRuleSet } from '../types/automation';
import {
  TaskEventAssociation,
  TaskHierarchyIssue,
  TaskNature,
  TaskSchedule,
  TaskStatus,
} from '../types/tasks';

export interface Person {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  birthday?: string;
  note?: string;
  favorite?: boolean;
  relationships?: string[] | null;
  contactFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | null;
  optionalFields?: OptionalFieldType[];
  createdAt?: Date | Timestamp;
}

export interface Event {
  id: string;
  title: string;
  location?: string;
  allDay: boolean;
  startDate: string;
  endDate: string; 
  startTime?: string; 
  endTime?: string;
  personIds?: string[];
  rating?: number;
  categories?: string[];
  status: 0 | 1;
  timeZone?: string;
  optionalFields?: OptionalFieldType[];
  createdAt?: Date | Timestamp;
  actionPlanning?: ActionPlanning;
  automation?: AutomationRuleSet;
}

export interface Task {
  id: string;
  content: string;
  status: TaskStatus; // 0 = not_started, 1 = in_focus, 2 = done
  nature: TaskNature;
  groupId?: string;
  order?: number;
  subtasks: Task[] | undefined;
  parentTaskId?: string | null
  createdAt?: Date | Timestamp;
  lastActionCompletedDate?: string;
  focusedOnDate?: string;
  actionPlanning?: ActionPlanning;
  automation?: AutomationRuleSet;
  schedule?: TaskSchedule;
  eventAssociation?: TaskEventAssociation;
  hierarchyIssues?: TaskHierarchyIssue[];
}

export interface EventSuggestion {
  reason: 'birthday' | 'belatedBirthday' | 'favoriteMissingBirthday' | 'contactFrequency' | 'inactiveFavorite'
  person: Person
  suggestedDate: string // YYYY-MM-DD civil date
  message?: string;
}
