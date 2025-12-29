'use client'

import { useState } from 'react'
import { login, signup } from './actions'
import { Wallet, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleAction = async (formData: FormData, action: typeof login) => {
    setIsLoading(true)
    setMessage('')
    const result = await action(formData)
    if (result?.error) setMessage(result.error)
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <Wallet className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Expense Tracker</h1>
          <p className="text-gray-600">Sign in to sync your household data securely.</p>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Email</label>
            <input name="email" type="email" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Password</label>
            <input name="password" type="password" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>
          
          {message && <p className="text-red-500 text-sm text-center">{message}</p>}

          <div className="flex gap-4 pt-2">
            <button formAction={(fd) => handleAction(fd, login)} disabled={isLoading} className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex justify-center">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In'}
            </button>
            <button formAction={(fd) => handleAction(fd, signup)} disabled={isLoading} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50">
              Sign Up
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}