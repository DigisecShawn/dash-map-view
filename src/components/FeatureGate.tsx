import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

const FeatureGate = ({ feature, children, fallback = null }: FeatureGateProps) => {
  const { canAccess, loading } = usePermissions();

  if (loading) {
    return null;
  }

  if (!canAccess(feature)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default FeatureGate;
