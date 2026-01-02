'use server'

import { Budget, Expense, GymExercise, HouseholdSettings, RecurringBill } from '@/types'
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
  const { error } = await supabase.from('budgets').upsert(budget, { 
    onConflict: 'householdid, category, month' 
  })
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

export async function saveGymSession(session: { name: string, exercises: GymExercise[], householdid: string }) {
  const supabase = createClient()
  
  // 1. Create Session
  const { data: sessionData, error: sessionError } = await supabase
    .from('gym_sessions')
    .insert({ household_id: session.householdid, name: session.name })
    .select()
    .single()

  if (sessionError) throw new Error(sessionError.message)

  // 2. Insert Exercises and Sets sequentially to ensure ID availability
  for (let i = 0; i < session.exercises.length; i++) {
    const ex = session.exercises[i]
    const { data: exData, error: exError } = await supabase
      .from('gym_exercises')
      .insert({ session_id: sessionData.id, name: ex.name, order_index: i })
      .select()
      .single()
    
    if (exError) throw new Error(exError.message)

    const setsToInsert = ex.sets.map((s, idx) => ({
      exercise_id: exData.id,
      weight: parseFloat(s.weight.toString()) || 0,
      reps: parseInt(s.reps.toString()) || 0,
      completed: true, // Saving history implies completion usually, or save specific state
      order_index: idx
    }))

    if (setsToInsert.length > 0) {
      const { error: setsError } = await supabase.from('gym_sets').insert(setsToInsert)
      if (setsError) throw new Error(setsError.message)
    }
  }

  revalidatePath('/gym')
}

export async function deleteGymSession(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('gym_sessions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/gym')
}

export async function updateRestTimer(householdid: string, seconds: number) {
  const supabase = createClient()
  const { error } = await supabase
    .from('household_settings')
    .update({ default_rest_timer: seconds })
    .eq('householdid', householdid)
  
  if (error) throw new Error(error.message)
  revalidatePath('/gym')
}

export async function setTimer(householdid: string, expiresAt: string | null) {
  const supabase = createClient()
  const { error } = await supabase
    .from('household_settings')
    .update({ timer_expires_at: expiresAt })
    .eq('householdid', householdid)
  
  if (error) throw new Error(error.message)
  revalidatePath('/gym')
}