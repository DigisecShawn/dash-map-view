import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, UserCog, Users, Search, RefreshCw, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface Account {
  id: string;
  username: string;
  display_name: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: string;
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: '管理員',
  operator: '操作員',
  viewer: '檢視者',
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-destructive text-destructive-foreground',
  operator: 'bg-primary text-primary-foreground',
  viewer: 'bg-muted text-muted-foreground',
};

const UserManagementPage = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading, isAuthenticated } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formRole, setFormRole] = useState<AppRole>('viewer');
  const [formIsActive, setFormIsActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAccounts();
    }
  }, [isAuthenticated]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, username, display_name, role, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('無法載入帳號列表');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormUsername('');
    setFormPassword('');
    setFormDisplayName('');
    setFormRole('viewer');
    setFormIsActive(true);
    setShowPassword(false);
  };

  const handleAddAccount = async () => {
    if (!formUsername.trim() || !formPassword.trim()) {
      toast.error('請填寫帳號和密碼');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('accounts').insert({
        username: formUsername.trim(),
        password_hash: formPassword,
        display_name: formDisplayName.trim() || null,
        role: formRole,
        is_active: formIsActive,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('此帳號名稱已存在');
        } else {
          throw error;
        }
        return;
      }

      toast.success('帳號新增成功');
      setShowAddDialog(false);
      resetForm();
      fetchAccounts();
    } catch (error) {
      console.error('Error adding account:', error);
      toast.error('新增帳號失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleEditAccount = async () => {
    if (!selectedAccount) return;

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        display_name: formDisplayName.trim() || null,
        role: formRole,
        is_active: formIsActive,
      };

      // Only update password if provided
      if (formPassword.trim()) {
        updateData.password_hash = formPassword;
      }

      const { error } = await supabase
        .from('accounts')
        .update(updateData)
        .eq('id', selectedAccount.id);

      if (error) throw error;

      toast.success('帳號更新成功');
      setShowEditDialog(false);
      resetForm();
      setSelectedAccount(null);
      fetchAccounts();
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('更新帳號失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccount) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', selectedAccount.id);

      if (error) throw error;

      toast.success('帳號已刪除');
      setShowDeleteDialog(false);
      setSelectedAccount(null);
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('刪除帳號失敗');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (account: Account) => {
    setSelectedAccount(account);
    setFormDisplayName(account.display_name || '');
    setFormRole(account.role);
    setFormIsActive(account.is_active);
    setFormPassword('');
    setShowEditDialog(true);
  };

  const openDeleteDialog = (account: Account) => {
    setSelectedAccount(account);
    setShowDeleteDialog(true);
  };

  const filteredAccounts = accounts.filter(account => {
    const query = searchQuery.toLowerCase();
    return (
      account.username.toLowerCase().includes(query) ||
      account.display_name?.toLowerCase().includes(query)
    );
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            權限管理
          </h1>
          <p className="text-muted-foreground mt-1">
            管理使用者帳號與權限設定
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAccounts} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            重新整理
          </Button>
          {isAdmin && (
            <Button onClick={() => { resetForm(); setShowAddDialog(true); }} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              新增帳號
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">總帳號數</p>
                <p className="text-2xl font-bold">{accounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-destructive/10">
                <Shield className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">管理員</p>
                <p className="text-2xl font-bold">
                  {accounts.filter(a => a.role === 'admin').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <UserCog className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">啟用中</p>
                <p className="text-2xl font-bold">
                  {accounts.filter(a => a.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>帳號列表</CardTitle>
              <CardDescription>查看和管理所有使用者帳號</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜尋帳號..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? '找不到符合的帳號' : '目前沒有帳號'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>帳號</TableHead>
                    <TableHead>顯示名稱</TableHead>
                    <TableHead>權限</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>建立時間</TableHead>
                    {isAdmin && <TableHead className="text-right">操作</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium font-mono">
                        {account.username}
                      </TableCell>
                      <TableCell>
                        {account.display_name || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={ROLE_COLORS[account.role]}>
                          {ROLE_LABELS[account.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.is_active ? 'default' : 'secondary'}>
                          {account.is_active ? '啟用' : '停用'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(account.created_at).toLocaleDateString('zh-TW')}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(account)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(account)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle>權限說明</CardTitle>
          <CardDescription>各角色的權限範圍</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={ROLE_COLORS.admin}>管理員</Badge>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• 完整系統存取權限</li>
                <li>• 管理使用者帳號與權限</li>
                <li>• 設定系統組態</li>
                <li>• 檢視所有資料與報表</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={ROLE_COLORS.operator}>操作員</Badge>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• 設備監控與操作</li>
                <li>• 警報處理與確認</li>
                <li>• 檢視報表資料</li>
                <li>• 無法管理使用者</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-muted bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={ROLE_COLORS.viewer}>檢視者</Badge>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• 唯讀存取權限</li>
                <li>• 檢視儀表板</li>
                <li>• 檢視設備狀態</li>
                <li>• 無法進行任何修改</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增帳號</DialogTitle>
            <DialogDescription>建立新的使用者帳號</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-username">帳號 *</Label>
              <Input
                id="add-username"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="請輸入帳號"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">密碼 *</Label>
              <div className="relative">
                <Input
                  id="add-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="請輸入密碼"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-display-name">顯示名稱</Label>
              <Input
                id="add-display-name"
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                placeholder="請輸入顯示名稱（選填）"
              />
            </div>
            <div className="space-y-2">
              <Label>權限</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">管理員</SelectItem>
                  <SelectItem value="operator">操作員</SelectItem>
                  <SelectItem value="viewer">檢視者</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="add-active">啟用帳號</Label>
              <Switch
                id="add-active"
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button onClick={handleAddAccount} disabled={saving}>
              {saving ? '新增中...' : '新增'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯帳號</DialogTitle>
            <DialogDescription>
              編輯帳號 <span className="font-mono font-medium">{selectedAccount?.username}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-password">新密碼（留空保持不變）</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="輸入新密碼"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-display-name">顯示名稱</Label>
              <Input
                id="edit-display-name"
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                placeholder="請輸入顯示名稱"
              />
            </div>
            <div className="space-y-2">
              <Label>權限</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">管理員</SelectItem>
                  <SelectItem value="operator">操作員</SelectItem>
                  <SelectItem value="viewer">檢視者</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">啟用帳號</Label>
              <Switch
                id="edit-active"
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
            <Button onClick={handleEditAccount} disabled={saving}>
              {saving ? '儲存中...' : '儲存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>
              確定要刪除帳號 <span className="font-mono font-medium">{selectedAccount?.username}</span> 嗎？此操作無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={saving}>
              {saving ? '刪除中...' : '確認刪除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementPage;
