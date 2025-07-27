-- Create sessions table for express-session
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  PRIMARY KEY (sid)
);

-- Create index on expire column for session cleanup
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);

-- Create users table (matching shared/schema.ts)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  role VARCHAR NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'pending')),
  name VARCHAR,
  phone VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create categories table (matching shared/schema.ts)
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR NOT NULL DEFAULT '#1976D2',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create inventory_items table (matching shared/schema.ts)
CREATE TABLE IF NOT EXISTS inventory_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  category_id VARCHAR NOT NULL REFERENCES categories(id),
  location VARCHAR NOT NULL,
  purchase_date TIMESTAMP NOT NULL,
  image_url TEXT,
  is_purchasable BOOLEAN NOT NULL DEFAULT false,
  price_per_unit DECIMAL(10,2),
  stock_quantity INTEGER DEFAULT 1,
  is_available BOOLEAN NOT NULL DEFAULT true,
  current_borrower_id VARCHAR REFERENCES users(id),
  borrowed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create borrowing_history table (matching shared/schema.ts)
CREATE TABLE IF NOT EXISTS borrowing_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id VARCHAR NOT NULL REFERENCES inventory_items(id),
  borrower_id VARCHAR NOT NULL REFERENCES users(id),
  borrowed_at TIMESTAMP NOT NULL,
  returned_at TIMESTAMP,
  is_returned BOOLEAN NOT NULL DEFAULT false
);

-- Create purchases table (matching shared/schema.ts)
CREATE TABLE IF NOT EXISTS purchases (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id VARCHAR NOT NULL REFERENCES inventory_items(id),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  price_per_unit DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  purchased_at TIMESTAMP DEFAULT NOW()
);

-- Insert default admin user (password: admin123)
-- Password hash for 'admin123' using bcrypt with rounds=10
INSERT INTO users (id, username, password_hash, email, first_name, last_name, role, created_at, updated_at) 
VALUES (
  'admin-default-user-id', 
  'admin', 
  '$2b$10$0SOGIqC4bSvsnWntKH6rW.tg.MMDjV.Gh6.4Vl3wTiuRsrTlxpSUa', 
  'admin@workshop.local', 
  'System', 
  'Administrator', 
  'admin', 
  NOW(), 
  NOW()
) ON CONFLICT (username) DO NOTHING;

-- Insert default categories (matching German interface)
INSERT INTO categories (name, description, color) VALUES 
  ('Handwerkzeuge', 'Manuelle Werkzeuge für handwerkliche Arbeiten', '#ef4444'),
  ('Elektrowerkzeuge', 'Elektrisch betriebene Werkzeuge', '#f97316'),
  ('Maschinen', 'Große Maschinen und Ausrüstung', '#eab308'),
  ('Sicherheitsausrüstung', 'Persönliche Schutzausrüstung', '#22c55e'),
  ('Verbrauchsmaterial', 'Kleinteile und Verbrauchsmaterialien', '#3b82f6'),
  ('Messgeräte', 'Mess- und Prüfgeräte', '#a855f7')
ON CONFLICT (name) DO NOTHING;