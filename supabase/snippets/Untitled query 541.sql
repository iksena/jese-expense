-- UPDATE public.expenses SET householdid='50ee486f-3401-4d67-8a53-f56a00106449' WHERE householdid <> '50ee486f-3401-4d67-8a53-f56a00106449'

-- ALTER TABLE recurring_bills 
-- ADD COLUMN startDate DATE NOT NULL DEFAULT CURRENT_DATE,
-- ADD COLUMN endDate DATE;

ALTER TABLE recurring_bills ADD COLUMN spender TEXT DEFAULT 'Together';