/*
  # Add password change requirement tracking

  1. New Table
    - `user_password_requirements`
      - `user_id` (uuid, primary key, references auth.users)
      - `require_password_change` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_password_requirements` table
    - Add policy for users to read their own requirement status
    - Add policy for admins to manage requirements

  3. Notes
    - This table tracks which users need to change their password on next login
    - Used for security purposes when admin resets password or when using temporary passwords
*/

-- Create the password requirements table
CREATE TABLE IF NOT EXISTS user_password_requirements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  require_password_change boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE user_password_requirements ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own password requirement status
CREATE POLICY "Users can view own password requirements"
  ON user_password_requirements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to update their own password requirement (to clear it after changing password)
CREATE POLICY "Users can update own password requirements"
  ON user_password_requirements
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_password_requirements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS user_password_requirements_updated_at ON user_password_requirements;
CREATE TRIGGER user_password_requirements_updated_at
  BEFORE UPDATE ON user_password_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_user_password_requirements_updated_at();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_password_requirements_user_id ON user_password_requirements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_password_requirements_require_change ON user_password_requirements(require_password_change) WHERE require_password_change = true;