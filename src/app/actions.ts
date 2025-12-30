'use server'

import { Budget, Expense, HouseholdSettings, RecurringBill } from '@/types'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addExpense(expense: Omit<Expense, 'id' | 'createdat'>) {
  const supabase = createClient()
  const { error } = await supabase.from('expenses').insert({
    ...expense,
    createdat: new Date().toISOString()
  })
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function updateExpense(id: string, expense: Partial<Expense>) {
  const supabase = createClient()
  const { error } = await supabase.from('expenses').update(expense).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function deleteExpense(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function updateSettings(settings: HouseholdSettings) {
  const supabase = createClient()
  const { error } = await supabase.from('household_settings').upsert(settings, { onConflict: 'householdid' })
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function upsertBudget(budget: Omit<Budget, 'id'>) {
  const supabase = createClient()
  const { error } = await supabase.from('budgets').upsert(budget, { onConflict: 'householdid, category' })
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function addRecurringBill(bill: Omit<RecurringBill, 'id'>) {
  const supabase = createClient()
  const { error } = await supabase.from('recurring_bills').insert(bill)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function updateRecurringBill(id: string, bill: Partial<RecurringBill>) {
  const supabase = createClient()
  const { error } = await supabase.from('recurring_bills').update(bill).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function deleteRecurringBill(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('recurring_bills').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
  redirect('/login')
}