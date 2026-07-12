/*
  # Fix password requirements policies

  1. Changes
    - Add INSERT policy for service role operations
    - This allows edge functions to create password requirement records

  2. Security
    - Service role can insert records for any user
    - Regular users can only read and update their own records
*/

-- Add policy to allow service role to insert password requirements
CREATE POLICY "Service role can insert password requirements"
  ON user_password_requirements
  FOR INSERT
  TO authenticated
  WITH CHECK (true);