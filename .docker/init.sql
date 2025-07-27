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
  '$2b$10$O5yQQ2jVnlKKPFnNrEBbvOK1mm.n5bSpy/x4P4.OdzE8DnGM/r/hO', 
  'admin@intertwinet.de', 
  'System', 
  'Administrator', 
  'admin', 
  NOW(), 
  NOW()
) ON CONFLICT (username) DO NOTHING;

-- Insert current categories from existing database
INSERT INTO categories (id, name, description, color, created_at) VALUES 
  ('adb9dd46-dfb1-4f62-8001-72a4eae25d14', 'Equipment - Cleaning', 'Vacuum Cleaners, Air Blowers', '#9C27B0', '2025-07-26 09:06:46.015281'),
  ('4dd95fe7-d66a-4c43-9397-82212d56bb66', 'Equipment - Heavy', 'Welding Machines, CNC Machines', '#1976D2', '2025-07-26 09:05:26.583826'),
  ('2b27ddf4-5e1a-4985-a229-49de323a48c2', 'Equipment - Lifting', 'Hoists, Jacks, Cranes', '#FF9800', '2025-07-26 09:05:55.793764'),
  ('9185308f-64d7-4275-b575-437863e218a9', 'Equipment - Safety', 'Helmets, Gloves, Goggles', '#F44336', '2025-07-26 09:06:33.676011'),
  ('8c00649d-862d-46ea-9012-92b04349a5e5', 'Equipment - Storage', 'Tool Cabinets, Shelving, Racks', '#F44336', '2025-07-26 09:06:12.088617'),
  ('a0104d58-b4bb-401a-955b-34f4f3e4c09f', 'Equipment - Workshop Machinery', 'Lathes, Milling Machines, Sanders', '#4CAF50', '2025-07-26 09:05:42.222735'),
  ('7d162690-3f8c-43b7-8655-1289544cf571', 'Material & Supply - Chemicals & Fluids', 'Lubricants, Paints, Solvents', '#F44336', '2025-07-26 09:08:29.026778'),
  ('5bd6df9f-e376-4ce2-bae4-1b276c8572f0', 'Material & Supply - Consumables', 'Screws, Nails, Sandpaper, Glue', '#4CAF50', '2025-07-26 09:08:08.341318'),
  ('167ad98f-a7a4-4c69-9d5e-dab54f2396e0', 'Material & Supply - Electrical Components', 'Cables, Fuses, Connectors', '#FF9800', '2025-07-26 09:08:19.660618'),
  ('aa65ac2d-1e9b-4107-8d21-6510b60a83c0', 'Material & Supply - Raw Materials', 'Metal Sheets, Wood, Pipes', '#1976D2', '2025-07-26 09:07:58.826431'),
  ('e6ff03d3-7630-45e1-8a4c-ccb82f01fa09', 'Material & Supply - Replacement Parts', 'Tool Bits, Spare Motors, Belts', '#9C27B0', '2025-07-26 09:08:49.948137'),
  ('8f29e4a2-2073-46fb-97cd-d92ce91ae0bc', 'Tools - Cutting', 'Knives, Blades, Scissors', '#F44336', '2025-07-26 09:03:12.362309'),
  ('f1084a86-6584-4f8b-80c5-da593a125716', 'Tools - Electrical', 'Multimeters, Wire Strippers', '#3F51B5', '2025-07-26 09:04:02.625021'),
  ('c91086b0-59be-410d-a16a-141480453ec6', 'Tools - Fastening', 'Wrenches, Sockets, Torque Tools', '#9C27B0', '2025-07-26 09:03:26.658634'),
  ('56f6fc64-009e-4086-8dd0-9d5454583c1b', 'Tools - Hand', 'Screwdrivers, Hammers, Pliers', '#1976D2', '2025-07-26 09:02:27.4173'),
  ('e57a5c60-e46f-49cc-bfc0-92f266721944', 'Tools - Measuring', 'Calipers, Tape Measures, Levels', '#FF9800', '2025-07-26 09:02:58.030453'),
  ('8d3af892-ab18-425d-9a0e-9b1d6d6e958d', 'Tools - Pneumatic', 'Air Compressors, Air Guns', '#009688', '2025-07-26 09:03:46.13238'),
  ('24600202-a68a-47ea-a383-70af1a0cf35f', 'Tools - Power', 'Drills, Grinders, Saws', '#4CAF50', '2025-07-26 09:02:45.051109')
ON CONFLICT (id) DO NOTHING;