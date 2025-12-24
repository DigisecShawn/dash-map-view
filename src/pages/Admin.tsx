import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Plus, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppRole } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

interface FeaturePermission {
  id: string;
  role: AppRole;
  feature_key: string;
  enabled: boolean;
}

interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: AppRole;
}

const FEATURE_LABELS: Record<string, string> = {
  device_management: '設備管理',
  alarm_settings: '警報設定',
  data_view: '資料檢視',
  notification_settings: '通知設定',
  trend_charts: '趨勢圖表',
  alarm_history: '警報歷史',
  permission_management: '權限管理',
};

const ROLE_LABELS: Record<AppRole, string> = {
  admin: '管理員',
  operator: '操作員',
  viewer: '訪客',
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-destructive text-destructive-foreground',
  operator: 'bg-warning text-warning-foreground',
  viewer: 'bg-muted text-muted-foreground',
};

const usernameSchema = z.string()
  .min(3, '帳號至少需要 3 個字元')
  .max(20, '帳號最多 20 個字元')
  .regex(/^[a-zA-Z0-9_]+$/, '帳號只能包含英文字母、數字和底線');
const passwordSchema = z.string().min(6, '密碼至少需要 6 個字元');

const usernameToEmail = (username: string) => `${username.toLowerCase()}@iot-monitor.local`;

const AdminPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [permissions, setPermissions] = useState<FeaturePermission[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create user dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('viewer');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // AdminRoute already handles admin check, just fetch data

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch permissions
      const { data: permData, error: permError } = await supabase
        .from('feature_permissions')
        .select('*')
        .order('role', { ascending: true })
        .order('feature_key', { ascending: true });

      if (permError) throw permError;
      setPermissions(permData as FeaturePermission[]);

      // Fetch users with roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role');

      if (rolesError) throw rolesError;

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, display_name');

      if (profilesError) throw profilesError;

      // Merge data
      const usersWithRoles: UserWithRole[] = (rolesData || []).map((r) => {
        const profile = profilesData?.find((p) => p.user_id === r.user_id);
        return {
          id: r.id,
          user_id: r.user_id,
          email: profile?.email || '未知',
          display_name: profile?.display_name || '未知用戶',
          role: r.role as AppRole,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: '載入失敗',
        description: '無法載入權限資料',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePermissionToggle = async (permissionId: string, enabled: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('feature_permissions')
        .update({ enabled })
        .eq('id', permissionId);

      if (error) throw error;

      setPermissions((prev) =>
        prev.map((p) => (p.id === permissionId ? { ...p, enabled } : p))
      );

      toast({
        title: '已更新',
        description: '權限設定已儲存',
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: '更新失敗',
        description: '無法更新權限設定',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (userRoleId: string, newRole: AppRole) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', userRoleId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userRoleId ? { ...u, role: newRole } : u))
      );

      toast({
        title: '已更新',
        description: '用戶角色已變更',
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: '更新失敗',
        description: '無法更新用戶角色',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    setCreateError(null);

    // Validate
    try {
      usernameSchema.parse(newUsername);
      passwordSchema.parse(newPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setCreateError(err.errors[0].message);
      }
      return;
    }

    setCreating(true);
    try {
      const email = usernameToEmail(newUsername);
      
      // Create user via Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password: newPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            display_name: newDisplayName || newUsername,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Update the role if not viewer (default)
        if (newRole !== 'viewer') {
          // Wait a bit for the trigger to create the user_roles entry
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { error: roleError } = await supabase
            .from('user_roles')
            .update({ role: newRole })
            .eq('user_id', data.user.id);

          if (roleError) {
            console.error('Error setting role:', roleError);
          }
        }

        toast({
          title: '帳號已建立',
          description: `用戶 ${newUsername} 已成功建立`,
        });

        // Reset form
        setNewUsername('');
        setNewPassword('');
        setNewDisplayName('');
        setNewRole('viewer');
        setShowCreateDialog(false);

        // Refresh data
        fetchData();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.message?.includes('User already registered')) {
        setCreateError('此帳號已存在');
      } else {
        setCreateError(error.message || '建立帳號失敗');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userRoleId: string, userId: string) => {
    if (userId === user?.id) {
      toast({
        title: '無法刪除',
        description: '無法刪除自己的帳號',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Note: We can only delete from user_roles and profiles
      // The auth.users deletion requires admin API which we don't have access to from client
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', userRoleId);

      if (error) throw error;

      await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      setUsers((prev) => prev.filter((u) => u.id !== userRoleId));

      toast({
        title: '已刪除',
        description: '用戶已移除',
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: '刪除失敗',
        description: '無法刪除用戶',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getPermissionsByRole = (role: AppRole) => {
    return permissions.filter((p) => p.role === role);
  };

  const getUsername = (email: string) => {
    return email.replace('@iot-monitor.local', '');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">系統管理</h1>
                <p className="text-sm text-muted-foreground">用戶與權限管理</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              用戶管理
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2">
              <Shield className="w-4 h-4" />
              權限設定
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">用戶列表</h2>
                <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  新增帳號
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>帳號</TableHead>
                    <TableHead>顯示名稱</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead className="w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        尚無用戶資料
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono">{getUsername(u.email)}</TableCell>
                        <TableCell>{u.display_name}</TableCell>
                        <TableCell>
                          <Select
                            value={u.role}
                            onValueChange={(value) => handleRoleChange(u.id, value as AppRole)}
                            disabled={saving || u.user_id === user?.id}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">管理員</SelectItem>
                              <SelectItem value="operator">操作員</SelectItem>
                              <SelectItem value="viewer">訪客</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(u.id, u.user_id)}
                            disabled={saving || u.user_id === user?.id}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6">
            {(['admin', 'operator', 'viewer'] as AppRole[]).map((role) => (
              <Card key={role} className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge className={ROLE_COLORS[role]}>{ROLE_LABELS[role]}</Badge>
                  {role === 'admin' && (
                    <span className="text-xs text-muted-foreground">(擁有所有權限)</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {getPermissionsByRole(role).map((perm) => (
                    <div
                      key={perm.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary"
                    >
                      <Label htmlFor={perm.id} className="cursor-pointer">
                        {FEATURE_LABELS[perm.feature_key] || perm.feature_key}
                      </Label>
                      <Switch
                        id={perm.id}
                        checked={perm.enabled}
                        onCheckedChange={(checked) => handlePermissionToggle(perm.id, checked)}
                        disabled={saving || role === 'admin'}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增帳號</DialogTitle>
          </DialogHeader>

          {createError && (
            <Alert variant="destructive">
              <AlertDescription>{createError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-username">帳號</Label>
              <Input
                id="new-username"
                placeholder="英文字母、數字、底線 (3-20字元)"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">密碼</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="至少 6 個字元"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-display-name">顯示名稱 (選填)</Label>
              <Input
                id="new-display-name"
                placeholder="用戶的顯示名稱"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-role">角色</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">管理員</SelectItem>
                  <SelectItem value="operator">操作員</SelectItem>
                  <SelectItem value="viewer">訪客</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreateUser} disabled={creating}>
              {creating ? '建立中...' : '建立帳號'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
