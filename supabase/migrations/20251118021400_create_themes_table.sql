-- Create themes table
CREATE TABLE IF NOT EXISTS themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_themes_code ON themes(code);

-- Create index on active for filtering
CREATE INDEX IF NOT EXISTS idx_themes_active ON themes(active);

-- Enable Row Level Security
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to all authenticated users
CREATE POLICY "Allow read access to themes for authenticated users" ON themes
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow read access to anonymous users (for mobile app)
CREATE POLICY "Allow read access to themes for anonymous users" ON themes
  FOR SELECT
  TO anon
  USING (true);

-- Insert initial theme data
INSERT INTO themes (code, name, description, active, version) VALUES
  ('h2g2', 'Hitchhiker''s Guide to the Galaxy', 'Marvin the Paranoid Android', true, 1),
  ('QT-GR', 'Quentin Tarantino/Guy Ritchie Films', 'Quentin Tarantino/Guy Ritchie Films', true, 1),
  ('TP', 'Terry Pratchett Guards! Guards!', 'Terry Pratchett Guards! Guards!', true, 1),
  ('PlainJane', 'Plain Joe', 'no-nonsense responses - male', true, 1)
ON CONFLICT (code) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_themes_updated_at
  BEFORE UPDATE ON themes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();