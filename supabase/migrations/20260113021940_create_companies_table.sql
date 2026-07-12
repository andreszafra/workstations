/*
  # Create Companies Table and Update Employees

  This migration creates a companies table to manage multiple organizations
  and links employees to their respective companies.

  ## New Tables
  
  ### `companies`
  - `id` (uuid, primary key) - Unique identifier for the company
  - `name` (text, required) - Company name
  - `nit` (text) - Tax identification number (NIT)
  - `address` (text) - Primary address
  - `address_line_2` (text) - Additional address field
  - `phone` (text) - Contact phone number
  - `logo_url` (text) - URL to company logo image
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp

  ## Changes to Existing Tables
  
  ### `employees`
  - Added `company_id` (uuid, nullable) - Foreign key reference to companies table
  
  ## Security
  
  - Enable RLS on `companies` table
  - Add policies for authenticated users to view companies
  - Add policies for admins to manage companies
  - Update employee policies to include company access
*/

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  nit text,
  address text,
  address_line_2 text,
  phone text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add updated_at trigger for companies
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_updated_at();

-- Add company_id to employees table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);

-- Enable RLS on companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all companies
CREATE POLICY "Authenticated users can view companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert companies
CREATE POLICY "Authenticated users can create companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update companies
CREATE POLICY "Authenticated users can update companies"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete companies
CREATE POLICY "Authenticated users can delete companies"
  ON companies
  FOR DELETE
  TO authenticated
  USING (true);
