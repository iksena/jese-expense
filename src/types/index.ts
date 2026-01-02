export type Currency = 'IDR' | 'AUD';
export type Category = 'Food' | 'Entertainment' | 'Needs' | 'Transport' | 'Uncategorized';
export type Spender = 'User 1' | 'User 2' | 'Together';

export interface Expense {
  id: string;
  amount: number;
  currency: Currency;
  category: Category;
  spender: Spender;
  description: string;
  date: string;
  householdid: string;
  createdat: string;
}

export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  currency: Currency;
  category: Category;
  recurrenceday: number;
  householdid: string;
  startdate: string;
  enddate: string | null;
  spender?: Spender | null;
}

export interface Budget {
  id: string;
  category: Category;
  limitidr: number;
  limitaud: number;
  householdid: string;
  month: string;
}

export interface HouseholdSettings {
  householdid: string;
  user1name: string;
  user2name: string;
  default_rest_timer?: number;
  timer_expires_at?: string | null;
}

export interface GymSet {
  id?: string;
  weight: string | number;
  reps: string | number;
  completed: boolean;
}

export interface GymExercise {
  id?: string;
  name: string;
  sets: GymSet[];
}

export interface GymSession {
  id: string;
  name: string;
  created_at: string;
  exercises: GymExercise[];
}

export interface GymSessionRaw {
  id: string;
  name: string;
  created_at: string;
  gym_exercises: {
    id: string;
    name: string;
    order_index: number;
    gym_sets: {
      id: string;
      weight: string | number;
      reps: string | number;
      completed: boolean;
      order_index: number;
    }[];
  }[];
}