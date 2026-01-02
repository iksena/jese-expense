import { createClient } from '@/utils/supabase/server'
import GymTracker from '@/components/GymTracker'
import { redirect } from 'next/navigation'
import { GymExercise, GymSession, GymSessionRaw } from '@/types'

export default async function GymPage() {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // Fetch Settings
  const { data: settings } = await supabase
    .from('household_settings')
    .select('*')
    .eq('householdid', user.id)
    .single()

  // Fetch History (Deep Query)
  // Note: Supabase returns flat data joins, we might need to process it or use the deeply nested syntax
  const { data: rawSessions } = await supabase
    .from('gym_sessions')
    .select(`
      id,
      name,
      created_at,
      gym_exercises (
        id,
        name,
        order_index,
        gym_sets (
          id,
          weight,
          reps,
          completed,
          order_index
        )
      )
    `)
    .eq('household_id', user.id)
    .order('created_at', { ascending: false })

  // Transform data to match GymSession interface if needed, or rely on type assertion
  // Sorting arrays by order_index manually to be safe
  const sessions = rawSessions?.map((s: GymSessionRaw) => ({
    ...s,
    exercises: s.gym_exercises
      .sort((a, b) => a.order_index - b.order_index)
      .map((e) => ({
        ...e,
        sets: e.gym_sets.sort((a, b) => a.order_index - b.order_index)
      }))
  })) || []

  return (
    <GymTracker 
      initialHistory={sessions}
      householdSettings={settings || { householdid: user.id, default_rest_timer: 90 }}
      userId={user.id}
    />
  )
}