import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'operator' | 'viewer';

export function usePermissions() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setRole(null);
      setPermissions({});
      setLoading(false);
      return;
    }

    try {
      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleError) {
        console.error('Error fetching role:', roleError);
        setRole('viewer');
      } else {
        setRole(roleData?.role as AppRole || 'viewer');
      }

      // Fetch feature permissions for the user's role
      const userRole = roleData?.role || 'viewer';
      const { data: permData, error: permError } = await supabase
        .from('feature_permissions')
        .select('feature_key, enabled')
        .eq('role', userRole);

      if (permError) {
        console.error('Error fetching permissions:', permError);
      } else {
        const permMap: Record<string, boolean> = {};
        (permData || []).forEach((p) => {
          permMap[p.feature_key] = p.enabled;
        });
        setPermissions(permMap);
      }
    } catch (error) {
      console.error('Error in fetchPermissions:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const canAccess = useCallback((featureKey: string): boolean => {
    if (role === 'admin') return true;
    return permissions[featureKey] ?? false;
  }, [role, permissions]);

  const isAdmin = role === 'admin';
  const isOperator = role === 'operator';
  const isViewer = role === 'viewer';

  return {
    role,
    permissions,
    loading,
    canAccess,
    isAdmin,
    isOperator,
    isViewer,
    refetch: fetchPermissions,
  };
}
