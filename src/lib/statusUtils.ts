// Unified device status utilities for consistent styling across the app

export type DeviceStatus = 'online' | 'offline';

export const STATUS_CONFIG = {
  online: {
    label: '上線',
    labelAlt: '在線',
    dotClass: 'bg-status-online animate-pulse',
    badgeClass: 'bg-status-online hover:bg-status-online/90 text-status-online-foreground',
    iconClass: 'text-status-online',
    bgClass: 'bg-status-online/10',
    borderClass: 'border-status-online/30',
  },
  offline: {
    label: '離線',
    labelAlt: '離線',
    dotClass: 'bg-status-offline',
    badgeClass: 'bg-status-offline hover:bg-status-offline/90 text-status-offline-foreground',
    iconClass: 'text-status-offline',
    bgClass: 'bg-status-offline/10',
    borderClass: 'border-status-offline/30',
  },
} as const;

export const getStatusConfig = (status: DeviceStatus) => {
  return STATUS_CONFIG[status] || STATUS_CONFIG.offline;
};

export const getStatusLabel = (status: DeviceStatus, useAlt = false): string => {
  const config = getStatusConfig(status);
  return useAlt ? config.labelAlt : config.label;
};

export const getStatusDotClass = (status: DeviceStatus): string => {
  return getStatusConfig(status).dotClass;
};

export const getStatusBadgeClass = (status: DeviceStatus): string => {
  return getStatusConfig(status).badgeClass;
};

export const getStatusIconClass = (status: DeviceStatus): string => {
  return getStatusConfig(status).iconClass;
};
