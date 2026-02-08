
-- Update bookings table with separate columns for better data management
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS address_details TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS problem_description TEXT;
