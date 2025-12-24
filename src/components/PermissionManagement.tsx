import { useState, useEffect } from 'react';
import { X, Shield, Users, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AppRole } from '@/hooks/usePermissions';

interface PermissionManagementProps {
  onClose: () => void;
}

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

const PermissionManagement = ({ onClose }: PermissionManagementProps) => {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<FeaturePermission[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const getPermissionsByRole = (role: AppRole) => {
    return permissions.filter((p) => p.role === role);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-card shadow-glow">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">權限管理</h2>
              <p className="text-sm text-muted-foreground">管理用戶角色與功能權限</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="permissions" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="permissions" className="gap-2">
                  <Shield className="w-4 h-4" />
                  功能權限
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-2">
                  <Users className="w-4 h-4" />
                  用戶管理
                </TabsTrigger>
              </TabsList>

              <TabsContent value="permissions" className="space-y-6">
                {(['admin', 'operator', 'viewer'] as AppRole[]).map((role) => (
                  <div key={role} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className={ROLE_COLORS[role]}>{ROLE_LABELS[role]}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  * 管理員擁有所有權限，無法修改
                </p>
              </TabsContent>

              <TabsContent value="users">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用戶</TableHead>
                      <TableHead>電子郵件</TableHead>
                      <TableHead>角色</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          尚無用戶資料
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.display_name}</TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(value) => handleRoleChange(user.id, value as AppRole)}
                              disabled={saving}
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
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PermissionManagement;
