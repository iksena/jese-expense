-- 1. Create Gym Tables
CREATE TABLE gym_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id UUID NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE gym_exercises (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES gym_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL
);

CREATE TABLE gym_sets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exercise_id UUID REFERENCES gym_exercises(id) ON DELETE CASCADE,
  weight NUMERIC,
  reps INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL
);

-- 2. Add rest timer setting to existing household_settings
ALTER TABLE household_settings 
ADD COLUMN default_rest_timer INTEGER DEFAULT 60;

ALTER TABLE household_settings 
ADD COLUMN timer_expires_at TIMESTAMP WITH TIME ZONE;