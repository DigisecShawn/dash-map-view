import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, CheckCircle2, XCircle, Timer, Gauge, Activity, Zap, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

interface ComplianceData {
  total: number;
  exceeded: number;
  rate: number;
  avgExcess: number;
}

interface AlertEfficiencyKPI {
  totalAlerts: number;
  acknowledgedCount: number;
  acknowledgeRate: number;
  avgResponseTime: number;
  pendingCritical: number;
  pendingWarning: number;
  resolvedToday: number;
}

interface AnomalyData {
  anomalies: Array<{ type: string; time: string; value: number; threshold: number; device: string }>;
  riskScore: number;
  trend: string;
}

interface CurrentValues {
  pm25: number | null;
  pm10: number | null;
  noise: number | null;
  temperature: number | null;
}

interface ComplianceHistoryPoint {
  time: string;
  rate: number;
}

interface ComplianceHistory {
  pm25: ComplianceHistoryPoint[];
  pm10: ComplianceHistoryPoint[];
  noise: ComplianceHistoryPoint[];
  temperature: ComplianceHistoryPoint[];
}

interface DecisionAnalyticsDashboardProps {
  complianceAnalysis: {
    pm25: ComplianceData;
    pm10: ComplianceData;
    noise: ComplianceData;
    temperature: ComplianceData;
  };
  alertEfficiencyKPI: AlertEfficiencyKPI;
  anomalyData: AnomalyData;
  currentValues: CurrentValues;
  complianceHistory: ComplianceHistory;
  isUsingMockData: boolean;
  isUsingMockAlerts: boolean;
}

const COMPLIANCE_THRESHOLDS = {
  pm25: { warning: 25, critical: 35, emergency: 55, unit: 'µg/m³', name: 'PM2.5' },
  pm10: { warning: 100, critical: 125, emergency: 200, unit: 'µg/m³', name: 'PM10' },
  noise: { warning: 60, critical: 65, emergency: 70, unit: 'dB', name: '噪音（日間住宅）' },
  temperature: { min: 15, max: 35, unit: '°C', name: '溫度' },
};

// Get level label for current value
const getCurrentLevel = (key: string, value: number | null): { level: string; color: string } => {
  if (value === null) return { level: '無數據', color: 'text-muted-foreground' };
  
  const threshold = COMPLIANCE_THRESHOLDS[key as keyof typeof COMPLIANCE_THRESHOLDS];
  
  if ('min' in threshold) {
    // Temperature range check
    if (value < threshold.min) return { level: '過低', color: 'text-sky-500' };
    if (value > threshold.max) return { level: '過高', color: 'text-destructive' };
    return { level: '正常', color: 'text-emerald-500' };
  }
  
  // For PM2.5, PM10, noise with warning/critical/emergency levels
  if (value <= threshold.warning) return { level: '正常', color: 'text-emerald-500' };
  if (value <= threshold.critical) return { level: '警告', color: 'text-amber-500' };
  if (value <= threshold.emergency) return { level: '嚴重', color: 'text-orange-500' };
  return { level: '緊急', color: 'text-destructive' };
};

// Get trend direction from history data
const getTrendDirection = (history: ComplianceHistoryPoint[]) => {
  if (history.length < 2) return 'stable';
  const recent = history.slice(-3);
  if (recent.length < 2) return 'stable';
  const first = recent[0].rate;
  const last = recent[recent.length - 1].rate;
  const diff = last - first;
  if (diff > 3) return 'up';
  if (diff < -3) return 'down';
  return 'stable';
};

const DecisionAnalyticsDashboard = ({
  complianceAnalysis,
  alertEfficiencyKPI,
  anomalyData,
  currentValues,
  complianceHistory,
  isUsingMockData,
  isUsingMockAlerts,
}: DecisionAnalyticsDashboardProps) => {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Target className="w-5 h-5 text-primary" />
        決策分析儀表板
        {(isUsingMockData || isUsingMockAlerts) && (
          <Badge variant="outline" className="text-xs text-muted-foreground border-dashed ml-2">
            模擬數據
          </Badge>
        )}
      </h2>

      {/* Risk Score & KPIs Row */}
      <div className="grid lg:grid-cols-4 gap-4">
        {/* Risk Score Card */}
        <Card className="lg:col-span-1 border-2" style={{
          borderColor: anomalyData.riskScore > 70 ? 'hsl(var(--destructive) / 0.5)' : 
                       anomalyData.riskScore > 50 ? 'hsl(45, 93%, 47%, 0.5)' : 
                       'hsl(var(--success) / 0.5)',
        }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">風險指數</span>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48" cy="48" r="40"
                    stroke="hsl(var(--muted))"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48" cy="48" r="40"
                    stroke={anomalyData.riskScore > 70 ? 'hsl(var(--destructive))' : 
                            anomalyData.riskScore > 50 ? 'hsl(45, 93%, 47%)' : 
                            'hsl(142, 71%, 45%)'}
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${anomalyData.riskScore * 2.51} 251`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{anomalyData.riskScore}</span>
                </div>
              </div>
            </div>
            <div className="text-center mt-2">
              <Badge variant={anomalyData.trend === 'increasing' ? 'destructive' : 
                             anomalyData.trend === 'stable' ? 'secondary' : 'outline'}>
                {anomalyData.trend === 'increasing' ? '↑ 上升中' : 
                 anomalyData.trend === 'stable' ? '→ 穩定' : '↓ 下降中'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Alert Efficiency KPIs */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              警報處理效率 KPI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  確認率
                </div>
                <div className="text-2xl font-bold">{alertEfficiencyKPI.acknowledgeRate}%</div>
                <Progress value={alertEfficiencyKPI.acknowledgeRate} className="h-1.5" />
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="w-4 h-4 text-sky-500" />
                  平均回應時間
                </div>
                <div className="text-2xl font-bold">{alertEfficiencyKPI.avgResponseTime}<span className="text-sm text-muted-foreground ml-1">分鐘</span></div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <XCircle className="w-4 h-4 text-destructive" />
                  待處理緊急
                </div>
                <div className="text-2xl font-bold text-destructive">{alertEfficiencyKPI.pendingCritical}</div>
                <div className="text-xs text-muted-foreground">+ {alertEfficiencyKPI.pendingWarning} 警告</div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="w-4 h-4 text-amber-500" />
                  今日已處理
                </div>
                <div className="text-2xl font-bold text-emerald-600">{alertEfficiencyKPI.resolvedToday}</div>
                <div className="text-xs text-muted-foreground">共 {alertEfficiencyKPI.totalAlerts} 筆警報</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Analysis Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        {Object.entries(complianceAnalysis).map(([key, data]) => {
          const threshold = COMPLIANCE_THRESHOLDS[key as keyof typeof COMPLIANCE_THRESHOLDS];
          const isGood = data.rate >= 90;
          const isWarning = data.rate >= 70 && data.rate < 90;
          const isCritical = data.rate >= 50 && data.rate < 70;
          
          // Get current value for this metric
          const currentValue = currentValues[key as keyof typeof currentValues];
          const currentLevel = getCurrentLevel(key, currentValue);
          
          // Get history for sparkline
          const history = complianceHistory[key as keyof typeof complianceHistory] || [];
          const trend = getTrendDirection(history);
          
          // Determine progress bar variant based on compliance rate
          const getProgressVariant = () => {
            if (data.rate >= 90) return 'success';
            if (data.rate >= 70) return 'warning';
            if (data.rate >= 50) return 'critical';
            return 'emergency';
          };
          
          // Get sparkline color based on current rate
          const sparklineColor = isGood ? 'hsl(142, 71%, 45%)' : 
                                isWarning ? 'hsl(45, 93%, 47%)' : 
                                isCritical ? 'hsl(24, 95%, 53%)' :
                                'hsl(var(--destructive))';
          
          return (
            <Card key={key} className="border-l-4" style={{
              borderLeftColor: sparklineColor,
            }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{threshold.name}</span>
                  <Badge variant={isGood ? 'outline' : isWarning ? 'secondary' : 'destructive'} className="text-xs">
                    {isGood ? '合規' : isWarning ? '警告' : isCritical ? '嚴重' : '緊急'}
                  </Badge>
                </div>
                
                {/* Current Value Display */}
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-bold">
                    {currentValue !== null ? currentValue : '--'}
                  </span>
                  <span className="text-sm text-muted-foreground">{threshold.unit}</span>
                  <Badge variant="outline" className={`text-xs ml-auto ${currentLevel.color}`}>
                    {currentLevel.level}
                  </Badge>
                </div>
                
                {/* Mini Sparkline Chart */}
                {history.length > 1 && (
                  <div className="h-10 mb-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={sparklineColor} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={sparklineColor} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area 
                          type="monotone" 
                          dataKey="rate" 
                          stroke={sparklineColor} 
                          strokeWidth={1.5}
                          fill={`url(#gradient-${key})`}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                {/* Compliance Rate with Trend */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">合規率</span>
                  <span className="text-lg font-semibold">{data.rate}%</span>
                  {trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                  {trend === 'down' && <TrendingDown className="w-4 h-4 text-destructive" />}
                  {trend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground" />}
                </div>
                <Progress 
                  value={data.rate} 
                  variant={getProgressVariant()}
                  className="h-2 mb-2"
                />
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>
                    {'warning' in threshold 
                      ? `警告: ${threshold.warning}, 嚴重: ${threshold.critical}, 緊急: >${threshold.emergency}` 
                      : `${threshold.min}-${threshold.max}`} {threshold.unit}
                  </div>
                  <div>超標: {data.exceeded}/{data.total} 次</div>
                  {data.avgExcess > 0 && <div className="text-destructive">平均超標: +{data.avgExcess} {threshold.unit}</div>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Anomaly Detection - Full Width */}
      <div className="grid gap-6">

        {/* Anomaly Detection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              異常偵測
              <Badge variant="outline" className="text-xs ml-auto">
                {anomalyData.anomalies.length} 項異常
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {anomalyData.anomalies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  目前無異常偵測
                </div>
              ) : (
                anomalyData.anomalies.map((anomaly, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {anomaly.type === 'pm25_spike' && 'PM2.5 飆升'}
                        {anomaly.type === 'noise_spike' && '噪音超標'}
                        {anomaly.type === 'temp_high' && '高溫警告'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {anomaly.device} · {anomaly.time}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-destructive">{anomaly.value}</div>
                      <div className="text-xs text-muted-foreground">閾值: {anomaly.threshold}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DecisionAnalyticsDashboard;
