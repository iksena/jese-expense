'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = createClient()
  const data = Object.fromEntries(formData)
  
  const { error } = await supabase.auth.signInWithPassword({
    email: data.email as string,
    password: data.password as string,
  })

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = createClient()
  const data = Object.fromEntries(formData)

  const { error } = await supabase.auth.signUp({
    email: data.email as string,
    password: data.password as string,
  })

  if (error) return { error: error.message }
  
  revalidatePath('/', 'layout')
  redirect('/')
}