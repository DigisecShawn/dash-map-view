import { useState, useEffect } from 'react';
import { Building2, Factory, Plus, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Site {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
  description: string | null;
  created_at: string;
}

const OrganizationManagementPage = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  // Company dialog state
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: '', description: '' });

  // Site dialog state
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [siteForm, setSiteForm] = useState({ name: '', company_id: '', address: '', description: '' });

  // Delete confirmation state
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'company' | 'site'; id: string; name: string }>({
    open: false,
    type: 'company',
    id: '',
    name: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [companiesRes, sitesRes] = await Promise.all([
      supabase.from('companies').select('*').order('name'),
      supabase.from('sites').select('*').order('name'),
    ]);

    if (companiesRes.data) setCompanies(companiesRes.data);
    if (sitesRes.data) setSites(sitesRes.data);
    setLoading(false);
  };

  // Company CRUD
  const handleOpenCompanyDialog = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setCompanyForm({ name: company.name, description: company.description || '' });
    } else {
      setEditingCompany(null);
      setCompanyForm({ name: '', description: '' });
    }
    setCompanyDialogOpen(true);
  };

  const handleSaveCompany = async () => {
    if (!companyForm.name.trim()) {
      toast({ title: '錯誤', description: '請輸入公司名稱', variant: 'destructive' });
      return;
    }

    if (editingCompany) {
      const { error } = await supabase
        .from('companies')
        .update({ name: companyForm.name, description: companyForm.description || null })
        .eq('id', editingCompany.id);

      if (error) {
        toast({ title: '更新失敗', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: '成功', description: '公司資料已更新' });
        setCompanyDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('companies')
        .insert({ name: companyForm.name, description: companyForm.description || null });

      if (error) {
        toast({ title: '新增失敗', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: '成功', description: '公司已新增' });
        setCompanyDialogOpen(false);
        fetchData();
      }
    }
  };

  const handleDeleteCompany = async () => {
    const { error } = await supabase.from('companies').delete().eq('id', deleteDialog.id);
    if (error) {
      toast({ title: '刪除失敗', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '成功', description: '公司已刪除' });
      fetchData();
    }
    setDeleteDialog({ ...deleteDialog, open: false });
  };

  // Site CRUD
  const handleOpenSiteDialog = (site?: Site) => {
    if (site) {
      setEditingSite(site);
      setSiteForm({
        name: site.name,
        company_id: site.company_id,
        address: site.address || '',
        description: site.description || '',
      });
    } else {
      setEditingSite(null);
      setSiteForm({ name: '', company_id: '', address: '', description: '' });
    }
    setSiteDialogOpen(true);
  };

  const handleSaveSite = async () => {
    if (!siteForm.name.trim()) {
      toast({ title: '錯誤', description: '請輸入工地名稱', variant: 'destructive' });
      return;
    }
    if (!siteForm.company_id) {
      toast({ title: '錯誤', description: '請選擇所屬公司', variant: 'destructive' });
      return;
    }

    if (editingSite) {
      const { error } = await supabase
        .from('sites')
        .update({
          name: siteForm.name,
          company_id: siteForm.company_id,
          address: siteForm.address || null,
          description: siteForm.description || null,
        })
        .eq('id', editingSite.id);

      if (error) {
        toast({ title: '更新失敗', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: '成功', description: '工地資料已更新' });
        setSiteDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('sites')
        .insert({
          name: siteForm.name,
          company_id: siteForm.company_id,
          address: siteForm.address || null,
          description: siteForm.description || null,
        });

      if (error) {
        toast({ title: '新增失敗', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: '成功', description: '工地已新增' });
        setSiteDialogOpen(false);
        fetchData();
      }
    }
  };

  const handleDeleteSite = async () => {
    const { error } = await supabase.from('sites').delete().eq('id', deleteDialog.id);
    if (error) {
      toast({ title: '刪除失敗', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '成功', description: '工地已刪除' });
      fetchData();
    }
    setDeleteDialog({ ...deleteDialog, open: false });
  };

  const getCompanyName = (companyId: string) => {
    return companies.find((c) => c.id === companyId)?.name || '未知公司';
  };

  const getSiteCount = (companyId: string) => {
    return sites.filter((s) => s.company_id === companyId).length;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">組織管理</h1>
          <p className="text-sm text-muted-foreground">管理公司與工地資料</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="companies" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            公司管理
          </TabsTrigger>
          <TabsTrigger value="sites" className="flex items-center gap-2">
            <Factory className="w-4 h-4" />
            工地管理
          </TabsTrigger>
        </TabsList>

        {/* Companies Tab */}
        <TabsContent value="companies">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">公司列表</CardTitle>
              <Button onClick={() => handleOpenCompanyDialog()} className="gap-2">
                <Plus className="w-4 h-4" />
                新增公司
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>公司名稱</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead className="text-center">工地數量</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        載入中...
                      </TableCell>
                    </TableRow>
                  ) : companies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        尚無公司資料
                      </TableCell>
                    </TableRow>
                  ) : (
                    companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary" />
                            {company.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {company.description || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-sm">
                            <Factory className="w-3 h-3" />
                            {getSiteCount(company.id)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenCompanyDialog(company)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() =>
                                setDeleteDialog({
                                  open: true,
                                  type: 'company',
                                  id: company.id,
                                  name: company.name,
                                })
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sites Tab */}
        <TabsContent value="sites">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">工地列表</CardTitle>
              <Button onClick={() => handleOpenSiteDialog()} className="gap-2">
                <Plus className="w-4 h-4" />
                新增工地
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>工地名稱</TableHead>
                    <TableHead>所屬公司</TableHead>
                    <TableHead>地址</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        載入中...
                      </TableCell>
                    </TableRow>
                  ) : sites.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        尚無工地資料
                      </TableCell>
                    </TableRow>
                  ) : (
                    sites.map((site) => (
                      <TableRow key={site.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Factory className="w-4 h-4 text-primary" />
                            {site.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Building2 className="w-3 h-3" />
                            <ChevronRight className="w-3 h-3" />
                            {getCompanyName(site.company_id)}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {site.address || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenSiteDialog(site)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() =>
                                setDeleteDialog({
                                  open: true,
                                  type: 'site',
                                  id: site.id,
                                  name: site.name,
                                })
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Company Dialog */}
      <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCompany ? '編輯公司' : '新增公司'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">公司名稱 *</Label>
              <Input
                id="company-name"
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                placeholder="請輸入公司名稱"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-description">描述</Label>
              <Textarea
                id="company-description"
                value={companyForm.description}
                onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                placeholder="請輸入公司描述（選填）"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompanyDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveCompany}>
              {editingCompany ? '更新' : '新增'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Site Dialog */}
      <Dialog open={siteDialogOpen} onOpenChange={setSiteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSite ? '編輯工地' : '新增工地'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>所屬公司 *</Label>
              <Select
                value={siteForm.company_id}
                onValueChange={(value) => setSiteForm({ ...siteForm, company_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="請選擇所屬公司" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {company.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-name">工地名稱 *</Label>
              <Input
                id="site-name"
                value={siteForm.name}
                onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                placeholder="請輸入工地名稱"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-address">地址</Label>
              <Input
                id="site-address"
                value={siteForm.address}
                onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })}
                placeholder="請輸入工地地址（選填）"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-description">描述</Label>
              <Textarea
                id="site-description"
                value={siteForm.description}
                onChange={(e) => setSiteForm({ ...siteForm, description: e.target.value })}
                placeholder="請輸入工地描述（選填）"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSiteDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveSite}>
              {editingSite ? '更新' : '新增'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除{deleteDialog.type === 'company' ? '公司' : '工地'}「{deleteDialog.name}」嗎？
              {deleteDialog.type === 'company' && getSiteCount(deleteDialog.id) > 0 && (
                <span className="block mt-2 text-destructive">
                  ⚠️ 該公司下有 {getSiteCount(deleteDialog.id)} 個工地，請先刪除相關工地。
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={deleteDialog.type === 'company' ? handleDeleteCompany : handleDeleteSite}
            >
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrganizationManagementPage;
