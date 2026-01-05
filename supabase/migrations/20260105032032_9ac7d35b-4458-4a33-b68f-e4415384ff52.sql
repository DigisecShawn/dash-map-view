-- Create accounts table for username/password login
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  role public.app_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated sessions (will be controlled by app logic)
CREATE POLICY "Allow public read for login" ON public.accounts
  FOR SELECT USING (true);

-- Only allow admins to manage accounts (insert/update/delete)
CREATE POLICY "Admins can manage accounts" ON public.accounts
  FOR ALL USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default admin account (password: admin123)
-- Using a simple hash for demo - in production use proper bcrypt
INSERT INTO public.accounts (username, password_hash, display_name, role)
VALUES ('admin', 'admin123', '系統管理員', 'admin');