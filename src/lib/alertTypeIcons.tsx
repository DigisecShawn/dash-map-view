import {
  User,
  Users,
  UserX,
  PersonStanding,
  Car,
  Bike,
  AlertTriangle,
  Flame,
  CloudFog,
  DoorOpen,
  ArrowLeftRight,
  Package,
  Bug,
  Dog,
  Construction,
  Trash2,
  ShoppingBag,
  Cylinder,
  FireExtinguisher,
  Truck,
  Droplet,
  Droplets,
  Wind,
  TestTube,
  HardHat,
  Shirt,
  Glasses,
  Shield,
  Scissors,
  Moon,
  XCircle,
  Cigarette,
  Phone,
  Smartphone,
  TrendingDown,
  MoveUp,
  Timer,
  Swords,
  UsersRound,
  Zap,
  UserMinus,
  Sword,
  ParkingCircle,
  GraduationCap,
  Gauge,
  Fuel,
  ChevronRightSquare,
  Radio,
  MapPin,
  Eye,
  Footprints,
  HandMetal,
  BadgeAlert,
  CircleOff,
  Layers,
  CircleAlert,
  HeartCrack,
  Activity,
  Ban,
} from 'lucide-react';
import React from 'react';

// Severity levels
export type AlertSeverity = 'warning' | 'critical' | 'emergency';

export const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; color: string; bgColor: string }> = {
  'warning': { label: '警告', color: 'text-yellow-600', bgColor: 'bg-yellow-500/20' },
  'critical': { label: '嚴重', color: 'text-orange-600', bgColor: 'bg-orange-500/20' },
  'emergency': { label: '緊急', color: 'text-red-600', bgColor: 'bg-red-500/20' },
};

// Define alert type configuration with icons, labels, and severity
export const ALERT_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; category: string; severity: AlertSeverity }> = {
  // 人員偵測類
  'face_detection': { icon: User, label: '人臉偵測', category: 'person', severity: 'warning' },
  'intrusion_person': { icon: PersonStanding, label: '行人入侵', category: 'intrusion', severity: 'warning' },
  'intrusion_motorcycle': { icon: Bike, label: '機車入侵', category: 'intrusion', severity: 'warning' },
  'intrusion_car': { icon: Car, label: '汽車入侵', category: 'intrusion', severity: 'warning' },
  'intrusion': { icon: AlertTriangle, label: '入侵偵測', category: 'intrusion', severity: 'warning' },
  'crowd_detection': { icon: UsersRound, label: '擁擠偵測', category: 'person', severity: 'warning' },
  'crowd_detection_high': { icon: UsersRound, label: '擁擠偵測（高密度）', category: 'person', severity: 'critical' },
  'people_counting': { icon: Users, label: '人數統計', category: 'person', severity: 'warning' },
  'marker_detection': { icon: MapPin, label: '標記點偵測', category: 'area', severity: 'warning' },
  'zone_enter': { icon: DoorOpen, label: '進入區域偵測', category: 'area', severity: 'warning' },
  'zone_exit': { icon: DoorOpen, label: '離開區域偵測', category: 'area', severity: 'warning' },
  'zone_detection': { icon: DoorOpen, label: '進入/離開區域偵測', category: 'area', severity: 'warning' },
  'line_crossing': { icon: ArrowLeftRight, label: '越線偵測', category: 'area', severity: 'warning' },
  'line_crossing_high_risk': { icon: ArrowLeftRight, label: '越線偵測（高風險區）', category: 'area', severity: 'critical' },
  
  // 安全事件類 - 緊急
  'fire_detection': { icon: Flame, label: '火焰偵測', category: 'safety', severity: 'emergency' },
  'smoke_detection': { icon: CloudFog, label: '煙霧偵測', category: 'safety', severity: 'emergency' },
  'fire_smoke': { icon: CloudFog, label: '煙霧偵測', category: 'safety', severity: 'emergency' },
  'escape_blocked': { icon: Ban, label: '逃生通道阻塞', category: 'safety', severity: 'emergency' },
  'abandoned_object': { icon: Package, label: '物品遺留', category: 'safety', severity: 'warning' },
  
  // 環境偵測類 - 警告
  'rodent_detection': { icon: Bug, label: '鼠患', category: 'environment', severity: 'warning' },
  'dog_detection': { icon: Dog, label: '狗隻偵測', category: 'environment', severity: 'warning' },
  'soil_uncovered': { icon: Layers, label: '土壤未覆蓋', category: 'environment', severity: 'warning' },
  'improper_stacking': { icon: Package, label: '堆放不當', category: 'environment', severity: 'warning' },
  'trash_overflow': { icon: Trash2, label: '垃圾桶未蓋滿溢', category: 'environment', severity: 'warning' },
  'bagged_trash': { icon: ShoppingBag, label: '袋裝垃圾', category: 'environment', severity: 'warning' },
  
  // 設備偵測類
  'gas_gun_missing': { icon: Cylinder, label: '瓦斯槍未放置', category: 'equipment', severity: 'emergency' },
  'cylinder_detection': { icon: Cylinder, label: '氣瓶偵測', category: 'equipment', severity: 'emergency' },
  'extinguisher_missing': { icon: FireExtinguisher, label: '滅火器遺失', category: 'equipment', severity: 'emergency' },
  'uncovered_dumper': { icon: Truck, label: '無蓋傾倒車', category: 'equipment', severity: 'critical' },
  
  // 洩漏偵測類 - 緊急
  'oil_leak': { icon: Droplet, label: '漏油', category: 'leak', severity: 'emergency' },
  'water_leak': { icon: Droplets, label: '漏水', category: 'leak', severity: 'emergency' },
  'gas_leak': { icon: Wind, label: '瓦斯漏氣', category: 'leak', severity: 'emergency' },
  'test_paper_change': { icon: TestTube, label: '試紙變色', category: 'leak', severity: 'emergency' },
  
  // 個人防護裝備類
  'no_helmet': { icon: HardHat, label: '未戴安全帽', category: 'ppe', severity: 'critical' },
  'helmet_detection': { icon: HardHat, label: '安全帽偵測', category: 'ppe', severity: 'critical' },
  'no_uniform': { icon: Shirt, label: '未穿工作服', category: 'ppe', severity: 'warning' },
  'no_vest': { icon: Shield, label: '未穿反光背心', category: 'ppe', severity: 'warning' },
  'no_mask': { icon: CircleOff, label: '未戴口罩', category: 'ppe', severity: 'warning' },
  'no_chef_uniform': { icon: Shirt, label: '未穿廚師制服', category: 'ppe', severity: 'warning' },
  'no_seatbelt': { icon: Shield, label: '未戴安全帶', category: 'ppe', severity: 'critical' },
  'no_goggles': { icon: Glasses, label: '未戴護目鏡', category: 'ppe', severity: 'critical' },
  'no_gloves': { icon: HandMetal, label: '防塵/防氣手套', category: 'ppe', severity: 'critical' },
  'long_hair': { icon: Scissors, label: '頭髮過長', category: 'ppe', severity: 'warning' },
  
  // 行為偵測類
  'drowsiness': { icon: Moon, label: '打瞌睡', category: 'behavior', severity: 'critical' },
  'absence': { icon: XCircle, label: '缺席', category: 'behavior', severity: 'warning' },
  'smoking': { icon: Cigarette, label: '抽菸', category: 'behavior', severity: 'warning' },
  'smoking_danger_zone': { icon: Cigarette, label: '抽菸（危險區）', category: 'behavior', severity: 'emergency' },
  'phone_call': { icon: Phone, label: '講電話', category: 'behavior', severity: 'warning' },
  'phone_use': { icon: Smartphone, label: '使用手機', category: 'behavior', severity: 'warning' },
  'fall_detection': { icon: TrendingDown, label: '跌倒', category: 'behavior', severity: 'emergency' },
  'climbing': { icon: MoveUp, label: '攀爬', category: 'behavior', severity: 'critical' },
  'loitering': { icon: Timer, label: '逗留過久', category: 'behavior', severity: 'warning' },
  'fighting': { icon: Swords, label: '打架', category: 'behavior', severity: 'critical' },
  'fighting_severe': { icon: Swords, label: '嚴重打架', category: 'behavior', severity: 'emergency' },
  'gathering': { icon: UsersRound, label: '群聚', category: 'behavior', severity: 'critical' },
  'gathering_conflict': { icon: UsersRound, label: '群聚衝突', category: 'behavior', severity: 'emergency' },
  'fast_moving': { icon: Zap, label: '快速移動', category: 'behavior', severity: 'critical' },
  'unfit_worker': { icon: UserMinus, label: '不適任工作者', category: 'behavior', severity: 'critical' },
  'weapon_detection': { icon: Sword, label: '持刀/棍偵測', category: 'behavior', severity: 'emergency' },
  
  // 車輛偵測類
  'motorcycle_parking': { icon: Bike, label: '機車違停', category: 'vehicle', severity: 'warning' },
  'illegal_parking': { icon: ParkingCircle, label: '非機車違停', category: 'vehicle', severity: 'warning' },
  'campus_congestion': { icon: GraduationCap, label: '校園車輛擁擠', category: 'vehicle', severity: 'warning' },
  'speeding': { icon: Gauge, label: '超速', category: 'vehicle', severity: 'critical' },
  'station_detection': { icon: ChevronRightSquare, label: '進出站/充電站偵測', category: 'vehicle', severity: 'warning' },
  'campus_access': { icon: GraduationCap, label: '校園進出管制', category: 'vehicle', severity: 'warning' },
  'illegal_refueling': { icon: Fuel, label: '違法加油', category: 'vehicle', severity: 'emergency' },
  'construction_vehicle': { icon: Construction, label: '工程車輛偵測', category: 'vehicle', severity: 'warning' },
  'construction_vehicle_abnormal': { icon: Construction, label: '工程車輛異常進入', category: 'vehicle', severity: 'critical' },
  
  // 其他
  'unauthorized_access': { icon: BadgeAlert, label: '未授權存取', category: 'security', severity: 'critical' },
};

// Get icon component for an alert type
export const getAlertTypeIcon = (alertType: string, className: string = "w-4 h-4") => {
  const config = ALERT_TYPE_CONFIG[alertType];
  if (config) {
    const IconComponent = config.icon;
    return <IconComponent className={className} />;
  }
  // Default icon for unknown types
  return <Radio className={className} />;
};

// Get label for an alert type
export const getAlertTypeLabel = (alertType: string): string => {
  const config = ALERT_TYPE_CONFIG[alertType];
  return config?.label || alertType;
};

// Get severity for an alert type
export const getAlertTypeSeverity = (alertType: string): AlertSeverity => {
  const config = ALERT_TYPE_CONFIG[alertType];
  return config?.severity || 'warning';
};

// Get severity config (label, colors) for an alert type
export const getSeverityConfig = (alertType: string) => {
  const severity = getAlertTypeSeverity(alertType);
  return SEVERITY_CONFIG[severity];
};

// Get all alert types as options for select/filter
export const getAlertTypeOptions = () => {
  return Object.entries(ALERT_TYPE_CONFIG).map(([key, config]) => ({
    value: key,
    label: config.label,
    category: config.category,
    severity: config.severity,
  }));
};

// Get alert types grouped by category
export const getAlertTypesByCategory = () => {
  const categories: Record<string, { value: string; label: string; severity: AlertSeverity }[]> = {};
  
  Object.entries(ALERT_TYPE_CONFIG).forEach(([key, config]) => {
    if (!categories[config.category]) {
      categories[config.category] = [];
    }
    categories[config.category].push({ value: key, label: config.label, severity: config.severity });
  });
  
  return categories;
};

// Get alert types grouped by severity
export const getAlertTypesBySeverity = () => {
  const severities: Record<AlertSeverity, { value: string; label: string }[]> = {
    'warning': [],
    'critical': [],
    'emergency': [],
  };
  
  Object.entries(ALERT_TYPE_CONFIG).forEach(([key, config]) => {
    severities[config.severity].push({ value: key, label: config.label });
  });
  
  return severities;
};

// Category labels
export const CATEGORY_LABELS: Record<string, string> = {
  'person': '人員偵測',
  'intrusion': '入侵偵測',
  'area': '區域偵測',
  'safety': '安全事件',
  'environment': '環境偵測',
  'equipment': '設備偵測',
  'leak': '洩漏偵測',
  'ppe': '個人防護裝備',
  'behavior': '行為偵測',
  'vehicle': '車輛偵測',
  'security': '安全存取',
};
