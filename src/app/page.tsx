import { createClient } from '@/utils/supabase/server'
import ExpenseDashboard from '@/components/ExpenseDashboard'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // Fetch all data in parallel using user.id as householdid
  const [expenses, budgets, recurringBills, settings] = await Promise.all([
    supabase.from('expenses').select('*').eq('householdid', user.id).order('date', { ascending: false }).order('createdat', { ascending: false }),
    supabase.from('budgets').select('*').eq('householdid', user.id),
    supabase.from('recurring_bills').select('*').eq('householdid', user.id),
    supabase.from('household_settings').select('*').eq('householdid', user.id).single()
  ])

  return (
    <ExpenseDashboard 
      initialUser={user}
      initialExpenses={expenses.data || []}
      initialBudgets={budgets.data || []}
      initialBills={recurringBills.data || []}
      initialSettings={settings.data || { householdid: user.id, user1name: 'User 1', user2name: 'User 2' }}
    />
  )
}