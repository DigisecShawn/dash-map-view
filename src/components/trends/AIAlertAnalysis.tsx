import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

interface AlertStat {
  type: string;
  label: string;
  count: number;
}

interface SeverityStat {
  severity: string;
  label: string;
  count: number;
}

interface SiteDistribution {
  id: string;
  name: string;
  total: number;
  warning: number;
  error: number;
  critical: number;
}

interface SitePieData {
  name: string;
  fullName: string;
  value: number;
}

interface AlertTrendData {
  time: string;
  count: number;
}

interface AIAlertAnalysisProps {
  wsAlertStats: AlertStat[];
  wsSeverityStats: SeverityStat[];
  wsAlertTrendData: AlertTrendData[];
  siteAlertDistribution: SiteDistribution[];
  sitePieData: SitePieData[];
  isUsingMockAlerts: boolean;
}

const SEVERITY_LABELS: Record<string, string> = {
  'warning': '警告',
  'error': '嚴重',
  'critical': '緊急',
};

const SEVERITY_COLORS: Record<string, string> = {
  'warning': '#facc15',
  'error': '#f97316',
  'critical': '#ef4444',
};

const SITE_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

const AIAlertAnalysis = ({
  wsAlertStats,
  wsSeverityStats,
  wsAlertTrendData,
  siteAlertDistribution,
  sitePieData,
  isUsingMockAlerts,
}: AIAlertAnalysisProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-destructive" />
        AI 偵測警報分析
        {isUsingMockAlerts && (
          <Badge variant="outline" className="text-xs text-muted-foreground border-dashed ml-2">
            模擬數據
          </Badge>
        )}
      </h2>
      
      {/* Severity Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {wsSeverityStats.map(stat => (
          <Card 
            key={stat.severity} 
            className="border-2" 
            style={{
              borderColor: `${SEVERITY_COLORS[stat.severity]}40`,
              background: `linear-gradient(135deg, ${SEVERITY_COLORS[stat.severity]}15, ${SEVERITY_COLORS[stat.severity]}05)`,
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: SEVERITY_COLORS[stat.severity] }} 
                />
                <span className="text-sm font-medium">{stat.label}</span>
              </div>
              <div className="text-3xl font-bold" style={{ color: SEVERITY_COLORS[stat.severity] }}>
                {stat.count}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stat.severity === 'warning' && '需要注意的潛在問題'}
                {stat.severity === 'error' && '需要立即處理'}
                {stat.severity === 'critical' && '緊急危險狀況'}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alert Type Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {wsAlertStats.map(stat => (
          <Card key={stat.type} className="p-4">
            <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
            <div className="mt-2 text-2xl font-bold">{stat.count}</div>
          </Card>
        ))}
      </div>

      {/* Alert Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Alert Trend Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-500" />
              警報趨勢
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wsAlertTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                  />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }} 
                    formatter={(value: number) => [`${value} 次`, '警報次數']} 
                  />
                  <Bar dataKey="count" fill="hsl(185, 85%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Alert Type Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-violet-500" />
              警報類型分佈
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wsAlertStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    type="category" 
                    dataKey="label" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                    width={80} 
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }} 
                    formatter={(value: number) => [`${value} 次`, '次數']} 
                  />
                  <Bar dataKey="count" fill="hsl(270, 70%, 55%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Site Alert Bar Chart - Full Width */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            各工地警報統計
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={siteAlertDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                  width={120} 
                  tickFormatter={value => value.length > 12 ? value.substring(0, 12) + '...' : value} 
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }} 
                  formatter={(value: number, name: string) => {
                    return [`${value} 次`, SEVERITY_LABELS[name] || name];
                  }} 
                />
                <Legend formatter={value => SEVERITY_LABELS[value] || value} />
                <Bar dataKey="critical" stackId="a" fill={SEVERITY_COLORS.critical} name="critical" />
                <Bar dataKey="error" stackId="a" fill={SEVERITY_COLORS.error} name="error" />
                <Bar dataKey="warning" stackId="a" fill={SEVERITY_COLORS.warning} name="warning" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Site Alert Pie Chart - Standalone */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-500" />
            工地警報佔比
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row items-center gap-6">
            {/* Pie Chart */}
            <div className="h-72 w-full lg:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={sitePieData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60} 
                    outerRadius={100} 
                    paddingAngle={3} 
                    dataKey="value" 
                    stroke="hsl(var(--background))" 
                    strokeWidth={2} 
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`} 
                    labelLine={false}
                  >
                    {sitePieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={SITE_COLORS[index % SITE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }} 
                    formatter={(value: number, _: string, props: any) => [`${value} 次警報`, props.payload.fullName]} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Custom Legend */}
            <div className="w-full lg:w-1/2 space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">工地圖例</p>
              <div className="grid grid-cols-1 gap-2">
                {sitePieData.map((site, index) => (
                  <div 
                    key={site.name} 
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div 
                      className="w-4 h-4 rounded-full shrink-0" 
                      style={{ backgroundColor: SITE_COLORS[index % SITE_COLORS.length] }} 
                    />
                    <span className="text-sm truncate flex-1" title={site.fullName}>
                      {site.fullName}
                    </span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {site.value} 次
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIAlertAnalysis;
