'use client'

import { addExpense, addRecurringBill, deleteExpense, deleteRecurringBill, signOut, updateExpense, updateSettings, upsertBudget } from '@/app/actions';
import { Budget, Category, Currency, Expense, HouseholdSettings, RecurringBill, Spender } from '@/types';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Calendar, ChevronLeft, ChevronRight, CreditCard, Edit2, Filter, Loader2, LogOut, Plus, Settings, Trash2, TrendingUp, Users, Wallet, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
// --- Helper Functions ---
const formatCurrency = (amount: number, currency: Currency): string => {
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR', 
      maximumFractionDigits: 0 
    }).format(amount);
  }
  return new Intl.NumberFormat('en-AU', { 
    style: 'currency', 
    currency: 'AUD' 
  }).format(amount);
};

const getMonthName = (dateString: string): string => {
  const date = new Date(dateString + '-01');
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

const formatDateFriendly = (dateString: string): string => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
}

// --- Animation Variants ---
const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const modalVariants = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 } };
const listVariants = { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 20, height: 0, marginBottom: 0 } };
const categoryColors = {
  Food: 'bg-green-100 text-green-800',
  Entertainment: 'bg-blue-100 text-blue-800',
  Needs: 'bg-yellow-100 text-yellow-800',
  Transport: 'bg-indigo-100 text-indigo-800',
  Uncategorized: 'bg-gray-100 text-gray-800',
};

// --- Sub-Components ---

const AddExpenseModal = ({ 
  onClose, 
  onSubmit,
  householdSettings,
  initialData
}: { 
  onClose: () => void; 
  onSubmit: (expense: Omit<Expense, 'id' | 'householdid' | 'createdat'>) => Promise<void>;
  householdSettings: HouseholdSettings;
  initialData?: Expense;
}) => {
  const [amountInput, setAmountInput] = useState(initialData ? initialData.amount.toString() : '');
  const [currency, setCurrency] = useState<Currency>(initialData ? initialData.currency : 'IDR');
  const [category, setCategory] = useState<Category>(initialData ? initialData.category : 'Food');
  const [spender, setSpender] = useState<Spender>(initialData ? initialData.spender : 'User 1');
  const [description, setDescription] = useState(initialData ? initialData.description : '');
  const [date, setDate] = useState(initialData ? initialData.date : new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateTotal = useCallback((input: string): number => {
    try {
      return input.split('+').reduce((sum, val) => {
        const num = parseFloat(val.trim());
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
    } catch {
      return 0;
    }
  }, []);

  const currentTotal = useMemo(() => calculateTotal(amountInput), [amountInput, calculateTotal]);

  const handleSubmit = async () => {
    const finalAmount = calculateTotal(amountInput);
    if (!finalAmount || finalAmount <= 0 || isSubmitting) return;

    setIsSubmitting(true);
    await onSubmit({
      amount: finalAmount,
      currency,
      category,
      spender,
      description,
      date,
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black/50">
      <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{initialData ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose}><X className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount {amountInput.includes('+') && <span className="ml-2 text-purple-600 font-bold">= {formatCurrency(currentTotal, currency)}</span>}
            </label>
            <input type="text" inputMode="text" value={amountInput} onChange={(e) => /^[0-9.+\s]*$/.test(e.target.value) && setAmountInput(e.target.value)} placeholder="e.g. 50+20+10" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
            <div className="grid grid-cols-2 gap-2">
              {(['IDR', 'AUD'] as Currency[]).map((curr) => (
                <button key={curr} onClick={() => setCurrency(curr)} className={`py-2 rounded-lg font-medium transition-colors ${currency === curr ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{curr}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="w-full px-4 py-2 border rounded-lg bg-white">
              {['Food', 'Entertainment', 'Needs', 'Transport', 'Uncategorized'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Spender</label>
            <select value={spender} onChange={(e) => setSpender(e.target.value as Spender)} className="w-full px-4 py-2 border rounded-lg bg-white">
              <option value="User 1">{householdSettings.user1name}</option>
              <option value="User 2">{householdSettings.user2name}</option>
              <option value="Together">Together</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Dinner" className="w-full px-4 py-2 border rounded-lg" />
          </div>
        </div>
        <button onClick={handleSubmit} disabled={currentTotal <= 0 || isSubmitting} className="w-full mt-6 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex justify-center items-center gap-2 font-medium">
          {isSubmitting ? <Loader2 className="animate-spin" /> : (initialData ? "Save Changes" : "Add Expense")}
        </button>
      </motion.div>
    </motion.div>
  );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; }) => {
  if (!isOpen) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 flex items-center justify-center p-4 z-[60] bg-black/50">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <div className="flex items-center gap-3 text-red-600 mb-4"><AlertTriangle /><h3 className="text-lg font-bold">{title}</h3></div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium">Delete</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const SettingsModal = ({ onClose, householdSettings, budgets, recurringBills, initialUser }: { onClose: () => void; householdSettings: HouseholdSettings; budgets: Budget[]; recurringBills: RecurringBill[]; initialUser: User; }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'budgets' | 'bills'>('users');
  const [user1Name, setUser1Name] = useState(householdSettings.user1name);
  const [user2Name, setUser2Name] = useState(householdSettings.user2name);
  
  const [budgetCategory, setBudgetCategory] = useState<Category>('Food');
  const [budgetIDR, setBudgetIDR] = useState('');
  const [budgetAUD, setBudgetAUD] = useState('');
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billCurrency, setBillCurrency] = useState<Currency>('IDR');
  const [billCategory, setBillCategory] = useState<Category>('Needs');
  const [billDay, setBillDay] = useState('1');

  const handleSaveUsers = async () => {
    await updateSettings({ householdid: initialUser.id, user1name: user1Name, user2name: user2Name });
  };
  const handleSaveBudget = async () => {
    await upsertBudget({ householdid: initialUser.id, category: budgetCategory, limitidr: parseFloat(budgetIDR) || 0, limitaud: parseFloat(budgetAUD) || 0 });
    setBudgetIDR(''); setBudgetAUD('');
  };
  const handleAddBill = async () => {
    await addRecurringBill({ householdid: initialUser.id, name: billName, amount: parseFloat(billAmount), currency: billCurrency, category: billCategory, recurrenceday: parseInt(billDay) });
    setBillName(''); setBillAmount('');
  };

  const getBudget = (cat: Category) => budgets.find((b: Budget) => b.category === cat);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black/50">
      <motion.div variants={modalVariants} initial="hidden" animate="visible" className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Settings</h2><button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" /></button></div>
        <div className="flex border-b mb-6">
          {['users', 'budgets', 'bills'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as 'users' | 'budgets' | 'bills')} className={`px-4 py-2 font-medium capitalize ${activeTab === tab ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600'}`}>{tab}</button>
          ))}
        </div>
        
        <AnimatePresence mode="wait">
          {activeTab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User 1 Name</label>
                <input type="text" value={user1Name} onChange={(e) => setUser1Name(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User 2 Name</label>
                <input type="text" value={user2Name} onChange={(e) => setUser2Name(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <button onClick={handleSaveUsers} className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors">Save Names</button>
            </motion.div>
          )}

          {activeTab === 'budgets' && (
             <motion.div key="budgets" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
               <div className="space-y-4">
                 <h3 className="font-semibold text-gray-800">Set Budget</h3>
                 <select value={budgetCategory} onChange={(e) => setBudgetCategory(e.target.value as Category)} className="w-full px-4 py-2 border rounded-lg bg-white">
                   {['Food', 'Entertainment', 'Needs', 'Transport', 'Uncategorized'].map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">IDR Limit</label>
                      <input type="number" value={budgetIDR} onChange={(e) => setBudgetIDR(e.target.value)} placeholder="0" className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">AUD Limit</label>
                      <input type="number" value={budgetAUD} onChange={(e) => setBudgetAUD(e.target.value)} placeholder="0" className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                 </div>
                 <button onClick={handleSaveBudget} className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors">Save Budget</button>
               </div>
               <div>
                  <h3 className="font-semibold text-gray-800 mb-4">Current Budgets</h3>
                  <div className="space-y-2">
                    {['Food', 'Entertainment', 'Needs', 'Transport', 'Uncategorized'].map(cat => {
                        const b = getBudget(cat as Category);
                        return (
                          <div key={cat} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-700">{cat}</span>
                            <div className="text-right text-sm">
                                {b ? (
                                    <>
                                        <div>IDR: {formatCurrency(b.limitidr, 'IDR')}</div>
                                        <div>AUD: {formatCurrency(b.limitaud, 'AUD')}</div>
                                    </>
                                ) : <span className="text-gray-400">Not set</span>}
                            </div>
                          </div>
                        )
                    })}
                  </div>
               </div>
             </motion.div>
          )}

          {activeTab === 'bills' && (
            <motion.div key="bills" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">Add Recurring Bill</h3>
                <input type="text" value={billName} onChange={(e) => setBillName(e.target.value)} placeholder="Bill Name" className="w-full px-4 py-2 border rounded-lg" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} placeholder="Amount" className="w-full px-4 py-2 border rounded-lg" />
                  <select value={billCurrency} onChange={(e) => setBillCurrency(e.target.value as Currency)} className="w-full px-4 py-2 border rounded-lg bg-white"><option value="IDR">IDR</option><option value="AUD">AUD</option></select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <select value={billCategory} onChange={(e) => setBillCategory(e.target.value as Category)} className="w-full px-4 py-2 border rounded-lg bg-white">
                        {['Food', 'Entertainment', 'Needs', 'Transport', 'Uncategorized'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="number" min="1" max="31" value={billDay} onChange={(e) => setBillDay(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <button onClick={handleAddBill} className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors">Add Bill</button>
              </div>
              <div className="mt-4 space-y-2">
                {recurringBills.map((b: RecurringBill) => (
                  <div key={b.id} className="p-3 bg-gray-50 flex justify-between items-center rounded-lg">
                    <div>
                        <div className="font-medium text-gray-700">{b.name}</div>
                        <div className="text-sm text-gray-500">{b.category} • Day {b.recurrenceday}</div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-700">{formatCurrency(b.amount, b.currency)}</span>
                        <button onClick={() => deleteRecurringBill(b.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

// --- Main Component ---

export default function ExpenseDashboard({ 
  initialUser, 
  initialExpenses, 
  initialBudgets, 
  initialBills,
  initialSettings 
}: {
  initialUser: User;
  initialExpenses: Expense[];
  initialBudgets: Budget[];
  initialBills: RecurringBill[];
  initialSettings: HouseholdSettings;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [expenses, setExpenses] = useState(initialExpenses);
  const [budgets, setBudgets] = useState(initialBudgets);
  const [recurringBills, setRecurringBills] = useState(initialBills);
  const [settings, setSettings] = useState(initialSettings);

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterCategory, setFilterCategory] = useState<Category | 'All'>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => { setExpenses(initialExpenses); }, [initialExpenses]);
  useEffect(() => { setBudgets(initialBudgets); }, [initialBudgets]);
  useEffect(() => { setRecurringBills(initialBills); }, [initialBills]);
  useEffect(() => { setSettings(initialSettings); }, [initialSettings]);

  useEffect(() => {
    const channel = supabase.channel('realtime')
      .on('postgres_changes', { event: '*', schema: 'public', filter: `householdid=eq.${initialUser.id}` }, () => {
        router.refresh();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, router, initialUser.id]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const monthMatch = exp.date.startsWith(selectedMonth);
      const categoryMatch = filterCategory === 'All' || exp.category === filterCategory;
      return monthMatch && categoryMatch;
    });
  }, [expenses, selectedMonth, filterCategory]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    filteredExpenses.forEach(exp => {
      if (!groups[exp.date]) groups[exp.date] = [];
      groups[exp.date].push(exp);
    });
    return Object.entries(groups)
      .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
      .map(([date, items]) => {
        const totalIDR = items.filter(i => i.currency === 'IDR').reduce((sum, i) => sum + i.amount, 0);
        const totalAUD = items.filter(i => i.currency === 'AUD').reduce((sum, i) => sum + i.amount, 0);
        return { date, items, totalIDR, totalAUD };
      });
  }, [filteredExpenses]);

  const grandTotals = useMemo(() => ({
    IDR: filteredExpenses.filter(e => e.currency === 'IDR').reduce((s, e) => s + e.amount, 0) 
      + recurringBills.filter(b => b.currency === 'IDR').reduce((s, b) => s + b.amount, 0),
    AUD: filteredExpenses.filter(e => e.currency === 'AUD').reduce((s, e) => s + e.amount, 0) 
      + recurringBills.filter(b => b.currency === 'AUD').reduce((s, b) => s + b.amount, 0),
  }), [filteredExpenses, recurringBills]);

  const totalsBySpender = useMemo(() => {
    const totals: Record<Spender, { IDR: number; AUD: number }> = {
      'User 1': { IDR: 0, AUD: 0 },
      'User 2': { IDR: 0, AUD: 0 },
      'Together': { IDR: 0, AUD: 0 },
    };
    filteredExpenses.forEach(exp => totals[exp.spender][exp.currency] += exp.amount);
    recurringBills.forEach(bill => {
      totals['Together'][bill.currency] += bill.amount;
    });
    return totals;
  }, [filteredExpenses, recurringBills]);

  const totalsByCategory = useMemo(() => {
    const totals: Record<Category, { IDR: number; AUD: number }> = {
      Food: { IDR: 0, AUD: 0 },
      Entertainment: { IDR: 0, AUD: 0 },
      Needs: { IDR: 0, AUD: 0 },
      Transport: { IDR: 0, AUD: 0 },
      Uncategorized: { IDR: 0, AUD: 0 },
    };
    filteredExpenses.forEach(exp => totals[exp.category][exp.currency] += exp.amount);
    recurringBills.forEach(bill => {
      totals[bill.category][bill.currency] += bill.amount;
    });
    return totals;
  }, [filteredExpenses, recurringBills]);

  const handleAddExpense = async (data: Omit<Expense, 'id' | 'createdat' | 'householdid'>) => { await addExpense({ ...data, householdid: initialUser.id }); };
  const handleEditExpense = async (data: Partial<Expense>) => { if (editingExpense) await updateExpense(editingExpense.id, data); };
  const handleDelete = async () => { if (deletingId) { await deleteExpense(deletingId); setDeletingId(null); }};
  const handleLogout = async () => { setIsLoggingOut(true); await signOut(); };

  const handlePreviousMonth = () => {
    const date = new Date(selectedMonth + '-01');
    date.setMonth(date.getMonth() - 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };
  const handleNextMonth = () => {
    const date = new Date(selectedMonth + '-01');
    date.setMonth(date.getMonth() + 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3"><Wallet className="text-purple-600" /><h1 className="text-xl font-bold">Expense Tracker</h1></div>
          <div className="flex gap-2">
            <button onClick={() => setShowSettings(true)} className="p-2 text-gray-600 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"><Settings /></button>
            <button onClick={handleLogout} className="p-2 text-gray-600 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">{isLoggingOut ? <Loader2 className="animate-spin"/> : <LogOut />}</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.div variants={fadeIn} initial="hidden" animate="visible">
          {/* Month Selector */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex justify-between items-center">
            <button onClick={handlePreviousMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft /></button>
            <div className="flex items-center gap-2"><Calendar className="text-gray-600" /><h2 className="text-lg font-semibold">{getMonthName(selectedMonth)}</h2></div>
            <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight /></button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><TrendingUp className="text-blue-600 w-5 h-5" /></div>
                 <h3 className="font-semibold text-gray-800">Total Spent</h3>
               </div>
               <div className="space-y-1">
                 <p className="text-2xl font-bold text-gray-800">{formatCurrency(grandTotals.IDR, 'IDR')}</p>
                 <p className="text-lg font-semibold text-gray-600">{formatCurrency(grandTotals.AUD, 'AUD')}</p>
               </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center"><CreditCard className="text-green-600 w-5 h-5" /></div>
                 <h3 className="font-semibold text-gray-800">Transactions</h3>
               </div>
               <p className="text-3xl font-bold text-gray-800">{filteredExpenses.length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center"><Users className="text-purple-600 w-5 h-5" /></div>
                 <h3 className="font-semibold text-gray-800">By Spender</h3>
               </div>
               <div className="space-y-2 text-sm">
                 <div className="flex justify-between">
                   <span className="text-gray-600">{settings.user1name}:</span>
                   <span className="font-semibold">{formatCurrency(totalsBySpender['User 1'].IDR, 'IDR')} / {formatCurrency(totalsBySpender['User 1'].AUD, 'AUD')}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-600">{settings.user2name}:</span>
                   <span className="font-semibold">{formatCurrency(totalsBySpender['User 2'].IDR, 'IDR')} / {formatCurrency(totalsBySpender['User 2'].AUD, 'AUD')}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-600">Together:</span>
                   <span className="font-semibold">{formatCurrency(totalsBySpender['Together'].IDR, 'IDR')} / {formatCurrency(totalsBySpender['Together'].AUD, 'AUD')}</span>
                 </div>
               </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Category Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['Food', 'Entertainment', 'Needs', 'Transport'] as Category[]).map((cat) => {
                const budget = budgets.find(b => b.category === cat);
                const spent = totalsByCategory[cat];
                const percentIDR = budget && budget.limitidr > 0 ? (spent.IDR / budget.limitidr) * 100 : 0;
                const percentAUD = budget && budget.limitaud > 0 ? (spent.AUD / budget.limitaud) * 100 : 0;

                return (
                  <div key={cat} className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">{cat}</h4>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">IDR</span>
                          <span className="font-medium">{formatCurrency(spent.IDR, 'IDR')}</span>
                        </div>
                        {budget && budget.limitidr > 0 && (
                          <>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(percentIDR, 100)}%` }} transition={{ duration: 1 }} className={`h-2 rounded-full ${percentIDR > 90 ? 'bg-red-500' : percentIDR > 70 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Budget: {formatCurrency(budget.limitidr, 'IDR')}</p>
                          </>
                        )}
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">AUD</span>
                          <span className="font-medium">{formatCurrency(spent.AUD, 'AUD')}</span>
                        </div>
                        {budget && budget.limitaud > 0 && (
                          <>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(percentAUD, 100)}%` }} transition={{ duration: 1 }} className={`h-2 rounded-full ${percentAUD > 90 ? 'bg-red-500' : percentAUD > 70 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Budget: {formatCurrency(budget.limitaud, 'AUD')}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="text-gray-600" />
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as Category | 'All')} className="px-4 py-2 border rounded-lg bg-white">
                <option value="All">All Categories</option>
                {['Food', 'Entertainment', 'Needs', 'Transport', 'Uncategorized'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={() => setShowAddModal(true)} className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium shadow-sm hover:bg-purple-700 transition-colors">
              <Plus className="w-5 h-5" /> Add Expense
            </button>
          </div>

          {/* List */}
          <div className="space-y-4">
            {/* Mobile View: Cards */}
            <div className="block md:hidden space-y-4">
               <AnimatePresence>
                 {groupedExpenses.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8 text-gray-400 bg-white rounded-xl shadow-sm">
                      No expenses found
                    </motion.div>
                  ) : (
                    groupedExpenses.map((group) => (
                      <div key={group.date}>
                        <div className="flex justify-between items-center bg-gray-100 px-4 py-2 rounded-lg mb-2 text-sm font-semibold text-gray-600">
                          <span suppressHydrationWarning>{formatDateFriendly(group.date)}</span>
                          <span className="flex gap-2">
                             {group.totalIDR > 0 && <span>{formatCurrency(group.totalIDR, 'IDR')}</span>}
                             {group.totalAUD > 0 && <span>{formatCurrency(group.totalAUD, 'AUD')}</span>}
                          </span>
                        </div>
                        {group.items.map((expense) => (
                          <motion.div 
                            key={expense.id} 
                            variants={listVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            layout
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-semibold text-gray-800">{expense.description || 'No Description'}</div>
                                <span className={`px-2 py-0.5 ${categoryColors[expense.category]} rounded-full text-xs font-medium`}>
                                  {expense.category}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-gray-800">{formatCurrency(expense.amount, expense.currency)}</div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                              <div className="text-sm text-gray-600 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {expense.spender === 'User 1' ? settings.user1name : 
                                 expense.spender === 'User 2' ? settings.user2name : 
                                 'Together'}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingExpense(expense)}
                                  className="text-blue-500 hover:text-blue-700 p-1"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeletingId(expense.id)}
                                  className="text-red-500 hover:text-red-700 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ))
                  )}
                  {/* Recurring Bills (Mobile) */}
                  {recurringBills.length > 0 && (
                    <div key="recurring-bills-mobile">
                      <div className="flex justify-between items-center bg-purple-50 px-4 py-2 rounded-lg mb-2 text-sm font-bold text-purple-800 mt-6">
                        <span>Recurring Bills</span>
                        <span className="flex gap-2">
                           {recurringBills.some(b => b.currency === 'IDR') && <span>Total: {formatCurrency(recurringBills.filter(b => b.currency === 'IDR').reduce((a, b) => a + b.amount, 0), 'IDR')}</span>}
                           {recurringBills.some(b => b.currency === 'AUD') && <span>Total: {formatCurrency(recurringBills.filter(b => b.currency === 'AUD').reduce((a, b) => a + b.amount, 0), 'AUD')}</span>}
                        </span>
                      </div>
                      {recurringBills.map(bill => (
                        <motion.div 
                          key={bill.id}
                          layout
                          className="bg-white p-4 rounded-xl shadow-sm border border-purple-100 mb-2"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-gray-800">{bill.name}</div>
                              <span className={`px-2 py-0.5 ${categoryColors[bill.category]} rounded-full text-xs font-medium`}>{bill.category}</span>
                            </div>
                            <div className="font-bold text-gray-800">{formatCurrency(bill.amount, bill.currency)}</div>
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                             <span className="text-sm text-gray-600 flex items-center gap-1">
                               <Calendar className="w-3 h-3" /> Day {bill.recurrenceday}
                             </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
               </AnimatePresence>
            </div>

            {/* Desktop View: Table */}
            <motion.div variants={fadeIn} className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spender</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <AnimatePresence mode="popLayout">
                    {groupedExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                          No expenses found for this period
                        </td>
                      </tr>
                    ) : (
                      groupedExpenses.map((group) => (
                        <Fragment key={group.date}>
                           {/* Date Subheader Row */}
                           <tr className="bg-gray-100">
                             <td colSpan={6} className="px-6 py-2 text-sm font-bold text-gray-700">
                               <div className="flex justify-between">
                                  <span suppressHydrationWarning>{formatDateFriendly(group.date)}</span>
                                  <div className="flex gap-4">
                                     {group.totalIDR > 0 && <span className="text-gray-600">Total: {formatCurrency(group.totalIDR, 'IDR')}</span>}
                                     {group.totalAUD > 0 && <span className="text-gray-600">Total: {formatCurrency(group.totalAUD, 'AUD')}</span>}
                                  </div>
                               </div>
                             </td>
                           </tr>
                           {/* Expense Rows */}
                           {group.items.map((expense) => (
                              <motion.tr 
                                key={expense.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                className="hover:bg-gray-50 transition-colors"
                              >
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  <span suppressHydrationWarning>{new Date(expense.date).toLocaleDateString('en-US')}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-800">
                                  {expense.description || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <span className={`px-2 py-1 ${categoryColors[expense.category]} rounded-full text-xs font-medium`}>
                                    {expense.category}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {expense.spender === 'User 1' ? settings.user1name : 
                                   expense.spender === 'User 2' ? settings.user2name : 
                                   'Together'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right text-gray-800">
                                  {formatCurrency(expense.amount, expense.currency)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => setEditingExpense(expense)}
                                      className="text-blue-500 hover:text-blue-700 transition-colors"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setDeletingId(expense.id)}
                                      className="text-red-500 hover:text-red-700 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </motion.tr>
                           ))}
                        </Fragment>
                      ))
                    )}
                    
                    {/* Recurring Bills Section (Desktop) */}
                    {recurringBills.length > 0 && (
                      <Fragment key="recurring-bills-section">
                        <tr className="bg-purple-50">
                          <td colSpan={6} className="px-6 py-2 text-sm font-bold text-purple-800">
                            <div className="flex justify-between">
                              <span>Recurring Bills</span>
                              <div className="flex gap-4">
                                 {recurringBills.some(b => b.currency === 'IDR') && <span>Total: {formatCurrency(recurringBills.filter(b => b.currency === 'IDR').reduce((a, b) => a + b.amount, 0), 'IDR')}</span>}
                                 {recurringBills.some(b => b.currency === 'AUD') && <span>Total: {formatCurrency(recurringBills.filter(b => b.currency === 'AUD').reduce((a, b) => a + b.amount, 0), 'AUD')}</span>}
                              </div>
                            </div>
                          </td>
                        </tr>
                        {recurringBills.map((bill) => (
                          <motion.tr 
                            key={bill.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="hover:bg-purple-50/50 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              Day {bill.recurrenceday}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-800">
                              {bill.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 ${categoryColors[bill.category]} rounded-full text-xs font-medium`}>
                                {bill.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              -
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right text-gray-800">
                              {formatCurrency(bill.amount, bill.currency)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              {/* No actions for recurring bills in main list */}
                            </td>
                          </motion.tr>
                        ))}
                      </Fragment>
                    )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && <AddExpenseModal onClose={() => setShowAddModal(false)} onSubmit={handleAddExpense} householdSettings={settings} />}
        {editingExpense && <AddExpenseModal onClose={() => setEditingExpense(null)} onSubmit={handleEditExpense} householdSettings={settings} initialData={editingExpense} />}
        {deletingId && <ConfirmModal isOpen={!!deletingId} onClose={() => setDeletingId(null)} onConfirm={handleDelete} title="Delete Expense" message="Are you sure? This cannot be undone." />}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} householdSettings={settings} budgets={budgets} recurringBills={recurringBills} initialUser={initialUser} />}
      </AnimatePresence>
    </div>
  );
}