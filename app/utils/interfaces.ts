import { Timestamp } from 'firebase/firestore';
import { OptionalField as OptionalFieldType } from '../types/optionalFields';
import { ActionPlanning } from '../types/actions';

export interface Person {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  birthday?: string;
  note?: string;
  favorite?: boolean;
  relationships?: string[];
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
}

export interface Task {
  id: string;
  content: string;
  status: 0 | 1 | 2; // 0 = not_started, 1 = doing, 2 = done
  groupId?: string;
  subtasks: Task[] | undefined
  parentTaskId?: string | null
  createdAt?: Date | Timestamp;
  actionPlanning?: ActionPlanning;
}

export interface EventSuggestion {
  reason: 'birthday' | 'belatedBirthday' | 'favoriteMissingBirthday' | 'contactFrequency' | 'inactiveFavorite'
  person: Person
  suggestedDate: string // YYYY-MM-DD civil date
  message?: string;
}
