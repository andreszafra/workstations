/*
  # Update RLS Policies for Public Access
  
  Changes all policies to allow anonymous (public) access instead of requiring authentication.
  This allows the application to work without a login system.
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to view sites" ON sites;
DROP POLICY IF EXISTS "Allow authenticated users to insert sites" ON sites;
DROP POLICY IF EXISTS "Allow authenticated users to update sites" ON sites;
DROP POLICY IF EXISTS "Allow authenticated users to delete sites" ON sites;

DROP POLICY IF EXISTS "Allow authenticated users to view employees" ON employees;
DROP POLICY IF EXISTS "Allow authenticated users to insert employees" ON employees;
DROP POLICY IF EXISTS "Allow authenticated users to update employees" ON employees;
DROP POLICY IF EXISTS "Allow authenticated users to delete employees" ON employees;

DROP POLICY IF EXISTS "Allow authenticated users to view workstations" ON workstations;
DROP POLICY IF EXISTS "Allow authenticated users to insert workstations" ON workstations;
DROP POLICY IF EXISTS "Allow authenticated users to update workstations" ON workstations;
DROP POLICY IF EXISTS "Allow authenticated users to delete workstations" ON workstations;

DROP POLICY IF EXISTS "Allow authenticated users to view maintenance logs" ON maintenance_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert maintenance logs" ON maintenance_logs;
DROP POLICY IF EXISTS "Allow authenticated users to update maintenance logs" ON maintenance_logs;
DROP POLICY IF EXISTS "Allow authenticated users to delete maintenance logs" ON maintenance_logs;

DROP POLICY IF EXISTS "Allow authenticated users to view assignment history" ON assignment_history;
DROP POLICY IF EXISTS "Allow authenticated users to insert assignment history" ON assignment_history;
DROP POLICY IF EXISTS "Allow authenticated users to update assignment history" ON assignment_history;
DROP POLICY IF EXISTS "Allow authenticated users to delete assignment history" ON assignment_history;

-- Create new public policies for sites
CREATE POLICY "Allow public to view sites"
  ON sites FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public to insert sites"
  ON sites FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public to update sites"
  ON sites FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public to delete sites"
  ON sites FOR DELETE TO anon, authenticated USING (true);

-- Create new public policies for employees
CREATE POLICY "Allow public to view employees"
  ON employees FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public to insert employees"
  ON employees FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public to update employees"
  ON employees FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public to delete employees"
  ON employees FOR DELETE TO anon, authenticated USING (true);

-- Create new public policies for workstations
CREATE POLICY "Allow public to view workstations"
  ON workstations FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public to insert workstations"
  ON workstations FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public to update workstations"
  ON workstations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public to delete workstations"
  ON workstations FOR DELETE TO anon, authenticated USING (true);

-- Create new public policies for maintenance_logs
CREATE POLICY "Allow public to view maintenance logs"
  ON maintenance_logs FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public to insert maintenance logs"
  ON maintenance_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public to update maintenance logs"
  ON maintenance_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public to delete maintenance logs"
  ON maintenance_logs FOR DELETE TO anon, authenticated USING (true);

-- Create new public policies for assignment_history
CREATE POLICY "Allow public to view assignment history"
  ON assignment_history FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public to insert assignment history"
  ON assignment_history FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public to update assignment history"
  ON assignment_history FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public to delete assignment history"
  ON assignment_history FOR DELETE TO anon, authenticated USING (true);
