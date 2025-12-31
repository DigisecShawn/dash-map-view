import { useState, useEffect, useMemo } from 'react';
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

export const useCompanySiteFilter = (): UseCompanySiteFilterResult => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    const companiesChannel = supabase
      .channel('filter-companies-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => {
        fetchCompanies();
      })
      .subscribe();

    const sitesChannel = supabase
      .channel('filter-sites-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sites' }, () => {
        fetchSites();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(companiesChannel);
      supabase.removeChannel(sitesChannel);
    };
  }, []);

  // Reset site selection when company changes
  useEffect(() => {
    if (selectedCompanyId !== 'all') {
      setSelectedSiteId('all');
    }
  }, [selectedCompanyId]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchCompanies(), fetchSites()]);
    setLoading(false);
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchSites = async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setSites(data || []);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

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
