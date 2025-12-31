import { Building2, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Company, Site } from '@/hooks/useCompanySiteFilter';

interface CompanySiteFilterProps {
  companies: Company[];
  filteredSites: Site[];
  selectedCompanyId: string;
  selectedSiteId: string;
  onCompanyChange: (companyId: string) => void;
  onSiteChange: (siteId: string) => void;
  loading?: boolean;
  compact?: boolean;
}

const CompanySiteFilter = ({
  companies,
  filteredSites,
  selectedCompanyId,
  selectedSiteId,
  onCompanyChange,
  onSiteChange,
  loading = false,
  compact = false,
}: CompanySiteFilterProps) => {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        載入中...
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? 'flex-wrap' : 'flex-wrap sm:flex-nowrap'}`}>
      {/* Company Filter */}
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={selectedCompanyId} onValueChange={onCompanyChange}>
          <SelectTrigger className={`bg-card ${compact ? 'w-[140px]' : 'w-[160px]'}`}>
            <SelectValue placeholder="選擇公司" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border z-50">
            <SelectItem value="all">全部公司</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Site Filter */}
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select 
          value={selectedSiteId} 
          onValueChange={onSiteChange}
          disabled={selectedCompanyId === 'all' && filteredSites.length === 0}
        >
          <SelectTrigger className={`bg-card ${compact ? 'w-[140px]' : 'w-[160px]'}`}>
            <SelectValue placeholder="選擇工地" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border z-50">
            <SelectItem value="all">全部工地</SelectItem>
            {filteredSites.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default CompanySiteFilter;
