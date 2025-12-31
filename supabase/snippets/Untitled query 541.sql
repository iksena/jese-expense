-- UPDATE public.expenses SET householdid='50ee486f-3401-4d67-8a53-f56a00106449' WHERE householdid <> '50ee486f-3401-4d67-8a53-f56a00106449'

-- ALTER TABLE recurring_bills 
-- ADD COLUMN startDate DATE NOT NULL DEFAULT CURRENT_DATE,
-- ADD COLUMN endDate DATE;

ALTER TABLE recurring_bills ADD COLUMN spender TEXT DEFAULT 'Together';

-- 1. Add the month column (defaulting to current month for existing rows)
ALTER TABLE budgets 
ADD COLUMN month TEXT NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM');

-- 2. Drop the old constraint that only allowed one budget per category
ALTER TABLE budgets 
DROP CONSTRAINT budgets_householdid_category_key; 
-- (Note: If your constraint has a different name, check it in the Table UI > Indexes)

-- 3. Add a new constraint that includes the month
CREATE UNIQUE INDEX budgets_householdid_category_month_key 
ON budgets (householdid, category, month);