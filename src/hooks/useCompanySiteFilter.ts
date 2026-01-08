import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Company {
  id: string;
  name: string;
  description: string | null;
}

export interface Site {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
  description: string | null;
}

export interface UseCompanySiteFilterResult {
  companies: Company[];
  sites: Site[];
  selectedCompanyId: string;
  selectedSiteId: string;
  setSelectedCompanyId: (id: string) => void;
  setSelectedSiteId: (id: string) => void;
  filteredSites: Site[];
  loading: boolean;
  getCompanyName: (companyId: string | null) => string;
  getSiteName: (siteId: string | null) => string;
}

// Shared query functions with caching
const fetchCompanies = async (): Promise<Company[]> => {
  const { data, error } = await supabase
    .from('companies')
    .select('id,name,description')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
};

const fetchSites = async (): Promise<Site[]> => {
  const { data, error } = await supabase
    .from('sites')
    .select('id,company_id,name,address,description')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const useCompanySiteFilter = (): UseCompanySiteFilterResult => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all');

  // Use React Query for caching - data shared across all components
  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: fetchSites,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });

  const loading = companiesLoading || sitesLoading;

  // Reset site selection when company changes
  useEffect(() => {
    if (selectedCompanyId !== 'all') {
      setSelectedSiteId('all');
    }
  }, [selectedCompanyId]);

  const filteredSites = useMemo(() => {
    if (selectedCompanyId === 'all') return sites;
    return sites.filter(s => s.company_id === selectedCompanyId);
  }, [sites, selectedCompanyId]);

  const getCompanyName = (companyId: string | null): string => {
    if (!companyId) return '未分配';
    return companies.find(c => c.id === companyId)?.name || '未知公司';
  };

  const getSiteName = (siteId: string | null): string => {
    if (!siteId) return '未分配';
    return sites.find(s => s.id === siteId)?.name || '未知工地';
  };

  return {
    companies,
    sites,
    selectedCompanyId,
    selectedSiteId,
    setSelectedCompanyId,
    setSelectedSiteId,
    filteredSites,
    loading,
    getCompanyName,
    getSiteName,
  };
};
