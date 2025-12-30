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
  spender: Spender | null;
}

export interface Budget {
  id: string;
  category: Category;
  limitidr: number;
  limitaud: number;
  householdid: string;
}

export interface HouseholdSettings {
  householdid: string;
  user1name: string;
  user2name: string;
}