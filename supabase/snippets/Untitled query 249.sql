-- Expenses table
CREATE TABLE expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  amount DECIMAL NOT NULL,
  currency TEXT NOT NULL,
  category TEXT NOT NULL,
  spender TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  householdId TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- Budgets table
CREATE TABLE budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category TEXT NOT NULL,
  limitIDR DECIMAL DEFAULT 0,
  limitAUD DECIMAL DEFAULT 0,
  householdId TEXT NOT NULL,
  UNIQUE(householdId, category)
);

-- Recurring bills table
CREATE TABLE recurring_bills (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  currency TEXT NOT NULL,
  category TEXT NOT NULL,
  recurrenceDay INTEGER NOT NULL,
  householdId TEXT NOT NULL
);

-- Household settings table
CREATE TABLE household_settings (
  householdId TEXT PRIMARY KEY,
  user1Name TEXT DEFAULT 'User 1',
  user2Name TEXT DEFAULT 'User 2'
);

-- -- Enable Row Level Security (optional but recommended)
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE recurring_bills ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE household_settings ENABLE ROW LEVEL SECURITY;
