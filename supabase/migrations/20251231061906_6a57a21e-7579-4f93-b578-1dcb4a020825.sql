-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sites (worksites) table
CREATE TABLE public.sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add company_id and site_id to devices table
ALTER TABLE public.devices 
ADD COLUMN company_id UUID REFERENCES public.companies(id),
ADD COLUMN site_id UUID REFERENCES public.sites(id);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to companies" ON public.companies
FOR SELECT USING (true);

CREATE POLICY "Allow public insert to companies" ON public.companies
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to companies" ON public.companies
FOR UPDATE USING (true);

CREATE POLICY "Allow public delete from companies" ON public.companies
FOR DELETE USING (true);

-- Enable RLS on sites
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to sites" ON public.sites
FOR SELECT USING (true);

CREATE POLICY "Allow public insert to sites" ON public.sites
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to sites" ON public.sites
FOR UPDATE USING (true);

CREATE POLICY "Allow public delete from sites" ON public.sites
FOR DELETE USING (true);

-- Create indexes for better query performance
CREATE INDEX idx_sites_company_id ON public.sites(company_id);
CREATE INDEX idx_devices_company_id ON public.devices(company_id);
CREATE INDEX idx_devices_site_id ON public.devices(site_id);

-- Create trigger for updated_at on companies
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on sites
CREATE TRIGGER update_sites_updated_at
BEFORE UPDATE ON public.sites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();