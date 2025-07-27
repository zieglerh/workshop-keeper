-- Create sessions table for express-session
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  PRIMARY KEY (sid)
);

-- Create index on expire column for session cleanup
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  role VARCHAR NOT NULL DEFAULT 'pending' CHECK (role IN ('admin', 'user', 'pending')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  color VARCHAR NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  category_id VARCHAR REFERENCES categories(id) ON DELETE SET NULL,
  location VARCHAR,
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  image_url VARCHAR,
  is_available BOOLEAN DEFAULT true,
  borrower_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  borrowed_at TIMESTAMP,
  is_purchasable BOOLEAN DEFAULT false,
  sale_price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create borrowing_history table
CREATE TABLE IF NOT EXISTS borrowing_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id VARCHAR NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  borrower_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  borrowed_at TIMESTAMP DEFAULT NOW(),
  returned_at TIMESTAMP,
  notes TEXT
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id VARCHAR NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  buyer_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  purchase_date TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Insert default admin user (password: admin123)
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (id, username, password_hash, email, first_name, last_name, role, created_at, updated_at) 
VALUES (
  'admin-default-user-id', 
  'admin', 
  '$2b$10$8K1p/a0dRR9JfLB2LYjlPetJQw.9Z8K7qSCUOKOGBi9oU5bVJ3F.e', 
  'admin@workshop.local', 
  'System', 
  'Administrator', 
  'admin', 
  NOW(), 
  NOW()
) ON CONFLICT (username) DO NOTHING;

-- Insert default categories
INSERT INTO categories (name, color) VALUES 
  ('Handwerkzeuge', '#ef4444'),
  ('Elektrowerkzeuge', '#f97316'),
  ('Maschinen', '#eab308'),
  ('Sicherheitsausrüstung', '#22c55e'),
  ('Verbrauchsmaterial', '#3b82f6'),
  ('Messgeräte', '#a855f7')
ON CONFLICT DO NOTHING;