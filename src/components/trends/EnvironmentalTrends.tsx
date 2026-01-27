import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Thermometer, Droplets, Wind, Volume2, Sun, TrendingUp, Flame } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, ReferenceLine } from 'recharts';

interface TrendDataPoint {
  time: string;
  temperature: number | null;
  humidity: number | null;
  pm25: number | null;
  pm10: number | null;
  noise: number | null;
  solar: number | null;
}

interface EnvStats {
  temperature: { avg: number; min: number; max: number } | null;
  humidity: { avg: number; min: number; max: number } | null;
  pm25: { avg: number; min: number; max: number } | null;
  pm10: { avg: number; min: number; max: number } | null;
  noise: { avg: number; min: number; max: number } | null;
  dataCount: number;
}

interface EnvironmentalTrendsProps {
  trendData: TrendDataPoint[];
  envStats: EnvStats | null;
  isUsingMockData: boolean;
}

// Heat Index calculation based on temperature (°C) and relative humidity (%)
// Using simplified Rothfusz regression equation
const calculateHeatIndex = (tempC: number, humidity: number): number => {
  // Convert to Fahrenheit for calculation
  const tempF = (tempC * 9/5) + 32;
  
  // Simple formula for lower temperatures
  if (tempF < 80) {
    const hiF = 0.5 * (tempF + 61.0 + ((tempF - 68.0) * 1.2) + (humidity * 0.094));
    return Math.round(((hiF - 32) * 5/9) * 10) / 10;
  }
  
  // Rothfusz regression equation
  let hiF = -42.379 + 2.04901523 * tempF + 10.14333127 * humidity
    - 0.22475541 * tempF * humidity - 0.00683783 * tempF * tempF
    - 0.05481717 * humidity * humidity + 0.00122874 * tempF * tempF * humidity
    + 0.00085282 * tempF * humidity * humidity - 0.00000199 * tempF * tempF * humidity * humidity;
  
  // Adjustments
  if (humidity < 13 && tempF >= 80 && tempF <= 112) {
    hiF -= ((13 - humidity) / 4) * Math.sqrt((17 - Math.abs(tempF - 95)) / 17);
  } else if (humidity > 85 && tempF >= 80 && tempF <= 87) {
    hiF += ((humidity - 85) / 10) * ((87 - tempF) / 5);
  }
  
  // Convert back to Celsius
  return Math.round(((hiF - 32) * 5/9) * 10) / 10;
};

// Get heat hazard level based on heat index (in Celsius)
const getHeatHazardLevel = (heatIndex: number): { level: number; label: string; color: string; bgColor: string; description: string } => {
  if (heatIndex >= 41) {
    return { level: 4, label: '第四級', color: '#7f1d1d', bgColor: '#dc2626', description: '極度危險：極可能發生熱中暑' };
  } else if (heatIndex >= 36) {
    return { level: 3, label: '第三級', color: '#9a3412', bgColor: '#ea580c', description: '危險：可能發生熱痙攣或熱衰竭' };
  } else if (heatIndex >= 32) {
    return { level: 2, label: '第二級', color: '#b45309', bgColor: '#f59e0b', description: '警戒：長時間曝曬需小心' };
  } else {
    return { level: 1, label: '第一級', color: '#a16207', bgColor: '#fbbf24', description: '注意：需適當補充水分' };
  }
};

const EnvironmentalTrends = ({
  trendData,
  envStats,
  isUsingMockData,
}: EnvironmentalTrendsProps) => {
  // Calculate heat index data for each time point
  const heatIndexData = useMemo(() => {
    return trendData.map(point => {
      if (point.temperature !== null && point.humidity !== null) {
        const heatIndex = calculateHeatIndex(point.temperature, point.humidity);
        const hazard = getHeatHazardLevel(heatIndex);
        return {
          time: point.time,
          temperature: point.temperature,
          humidity: point.humidity,
          heatIndex,
          hazardLevel: hazard.level,
          hazardLabel: hazard.label,
        };
      }
      return {
        time: point.time,
        temperature: point.temperature,
        humidity: point.humidity,
        heatIndex: null,
        hazardLevel: null,
        hazardLabel: null,
      };
    });
  }, [trendData]);

  // Current heat index (latest reading)
  const currentHeatIndex = useMemo(() => {
    const validData = heatIndexData.filter(d => d.heatIndex !== null);
    if (validData.length === 0) return null;
    const latest = validData[validData.length - 1];
    return {
      value: latest.heatIndex!,
      hazard: getHeatHazardLevel(latest.heatIndex!),
      temperature: latest.temperature!,
      humidity: latest.humidity!,
    };
  }, [heatIndexData]);

  // Heat index statistics
  const heatIndexStats = useMemo(() => {
    const validValues = heatIndexData.map(d => d.heatIndex).filter(v => v !== null) as number[];
    if (validValues.length === 0) return null;
    return {
      avg: Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length * 10) / 10,
      min: Math.round(Math.min(...validValues) * 10) / 10,
      max: Math.round(Math.max(...validValues) * 10) / 10,
    };
  }, [heatIndexData]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        環境趨勢分析
        {isUsingMockData && (
          <Badge variant="outline" className="text-xs text-muted-foreground border-dashed ml-2">
            模擬數據
          </Badge>
        )}
      </h2>

      {/* Environment Statistics Summary */}
      {envStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {envStats.temperature && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Thermometer className="w-4 h-4 text-red-500" />
                溫度
              </div>
              <div className="text-2xl font-bold">{envStats.temperature.avg}°C</div>
              <div className="text-xs text-muted-foreground">
                {envStats.temperature.min}°C ~ {envStats.temperature.max}°C
              </div>
            </Card>
          )}
          {envStats.humidity && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Droplets className="w-4 h-4 text-sky-500" />
                濕度
              </div>
              <div className="text-2xl font-bold">{envStats.humidity.avg}%</div>
              <div className="text-xs text-muted-foreground">
                {envStats.humidity.min}% ~ {envStats.humidity.max}%
              </div>
            </Card>
          )}
          {envStats.pm25 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Wind className="w-4 h-4 text-violet-500" />
                PM2.5
              </div>
              <div className="text-2xl font-bold">{envStats.pm25.avg}</div>
              <div className="text-xs text-muted-foreground">
                {envStats.pm25.min} ~ {envStats.pm25.max} µg/m³
              </div>
            </Card>
          )}
          {envStats.pm10 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Wind className="w-4 h-4 text-amber-600" />
                PM10
              </div>
              <div className="text-2xl font-bold">{envStats.pm10.avg}</div>
              <div className="text-xs text-muted-foreground">
                {envStats.pm10.min} ~ {envStats.pm10.max} µg/m³
              </div>
            </Card>
          )}
          {envStats.noise && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Volume2 className="w-4 h-4 text-slate-500" />
                噪音
              </div>
              <div className="text-2xl font-bold">{envStats.noise.avg} dB</div>
              <div className="text-xs text-muted-foreground">
                {envStats.noise.min} ~ {envStats.noise.max} dB
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Heat Hazard Index Chart - Full Width */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            熱危害風險指數
            <div className="ml-auto flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#fbbf24' }} />
                <span className="text-muted-foreground">第一級</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
                <span className="text-muted-foreground">第二級</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ea580c' }} />
                <span className="text-muted-foreground">第三級</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#dc2626' }} />
                <span className="text-muted-foreground">第四級</span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-4 gap-4 mb-4">
            {/* Current Heat Index Display */}
            {currentHeatIndex && (
              <div 
                className="lg:col-span-1 p-4 rounded-lg border-2 flex flex-col items-center justify-center"
                style={{ 
                  borderColor: currentHeatIndex.hazard.bgColor,
                  background: `linear-gradient(135deg, ${currentHeatIndex.hazard.bgColor}20, ${currentHeatIndex.hazard.bgColor}05)`,
                }}
              >
                <div className="text-sm text-muted-foreground mb-1">目前熱指數</div>
                <div className="text-4xl font-bold" style={{ color: currentHeatIndex.hazard.bgColor }}>
                  {currentHeatIndex.value}°C
                </div>
                <Badge 
                  className="mt-2 text-white"
                  style={{ backgroundColor: currentHeatIndex.hazard.bgColor }}
                >
                  {currentHeatIndex.hazard.label}
                </Badge>
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  {currentHeatIndex.hazard.description}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  溫度 {currentHeatIndex.temperature}°C · 濕度 {currentHeatIndex.humidity}%
                </div>
              </div>
            )}
            
            {/* Heat Index Stats */}
            {heatIndexStats && (
              <div className="lg:col-span-3 grid grid-cols-3 gap-4">
                <Card className="p-4 bg-muted/30">
                  <div className="text-sm text-muted-foreground mb-1">最低熱指數</div>
                  <div className="text-2xl font-bold" style={{ color: getHeatHazardLevel(heatIndexStats.min).bgColor }}>
                    {heatIndexStats.min}°C
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {getHeatHazardLevel(heatIndexStats.min).label}
                  </Badge>
                </Card>
                <Card className="p-4 bg-muted/30">
                  <div className="text-sm text-muted-foreground mb-1">平均熱指數</div>
                  <div className="text-2xl font-bold" style={{ color: getHeatHazardLevel(heatIndexStats.avg).bgColor }}>
                    {heatIndexStats.avg}°C
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {getHeatHazardLevel(heatIndexStats.avg).label}
                  </Badge>
                </Card>
                <Card className="p-4 bg-muted/30">
                  <div className="text-sm text-muted-foreground mb-1">最高熱指數</div>
                  <div className="text-2xl font-bold" style={{ color: getHeatHazardLevel(heatIndexStats.max).bgColor }}>
                    {heatIndexStats.max}°C
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {getHeatHazardLevel(heatIndexStats.max).label}
                  </Badge>
                </Card>
              </div>
            )}
          </div>
          
          {/* Heat Index Trend Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={heatIndexData}>
                <defs>
                  <linearGradient id="heatIndexGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                  unit="°C"
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }} 
                  formatter={(value: number, name: string) => {
                    if (name === 'heatIndex') {
                      const hazard = getHeatHazardLevel(value);
                      return [`${value}°C (${hazard.label})`, '熱指數'];
                    }
                    if (name === 'temperature') return [`${value}°C`, '溫度'];
                    if (name === 'humidity') return [`${value}%`, '濕度'];
                    return [value, name];
                  }} 
                />
                {/* Reference lines for hazard levels */}
                <ReferenceLine y={32} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: '32°C 第二級', position: 'right', fontSize: 10, fill: '#f59e0b' }} />
                <ReferenceLine y={36} stroke="#ea580c" strokeDasharray="5 5" label={{ value: '36°C 第三級', position: 'right', fontSize: 10, fill: '#ea580c' }} />
                <ReferenceLine y={41} stroke="#dc2626" strokeDasharray="5 5" label={{ value: '41°C 第四級', position: 'right', fontSize: 10, fill: '#dc2626' }} />
                <Line 
                  type="monotone" 
                  dataKey="heatIndex" 
                  stroke="#ea580c" 
                  strokeWidth={2.5} 
                  dot={{ fill: '#ea580c', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: '#ea580c' }}
                  name="heatIndex"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Heat Hazard Legend Table */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded bg-amber-100 dark:bg-amber-950/30">
              <div className="w-3 h-3 rounded-sm bg-amber-400" />
              <div>
                <span className="font-medium">第一級</span>
                <span className="text-muted-foreground ml-1">(&lt;32°C)</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-amber-200 dark:bg-amber-900/30">
              <div className="w-3 h-3 rounded-sm bg-amber-500" />
              <div>
                <span className="font-medium">第二級</span>
                <span className="text-muted-foreground ml-1">(32-36°C)</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-orange-200 dark:bg-orange-900/30">
              <div className="w-3 h-3 rounded-sm bg-orange-500" />
              <div>
                <span className="font-medium">第三級</span>
                <span className="text-muted-foreground ml-1">(36-41°C)</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-red-200 dark:bg-red-900/30">
              <div className="w-3 h-3 rounded-sm bg-red-600" />
              <div>
                <span className="font-medium">第四級</span>
                <span className="text-muted-foreground ml-1">(≥41°C)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Charts Grid - 2x2 Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Temperature & Humidity Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-red-500" />
              溫溼度趨勢
              <div className="ml-auto flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-red-500 rounded" />
                  <span className="text-muted-foreground">溫度</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-sky-500 rounded" />
                  <span className="text-muted-foreground">濕度</span>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="humidGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis yAxisId="temp" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="°C" orientation="left" />
                  <YAxis yAxisId="humid" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="%" orientation="right" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }} 
                    formatter={(value: number, name: string) => {
                      if (name === 'temperature') return [`${value}°C`, '溫度'];
                      if (name === 'humidity') return [`${value}%`, '濕度'];
                      return [value, name];
                    }} 
                  />
                  <Area yAxisId="temp" type="monotone" dataKey="temperature" stroke="#ef4444" fill="url(#tempGradient)" strokeWidth={2} name="temperature" />
                  <Area yAxisId="humid" type="monotone" dataKey="humidity" stroke="#0ea5e9" fill="url(#humidGradient)" strokeWidth={2} name="humidity" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Air Quality Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wind className="w-4 h-4 text-violet-500" />
              空氣品質趨勢
              <div className="ml-auto flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-violet-500 rounded" />
                  <span className="text-muted-foreground">PM2.5</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-amber-600 rounded" />
                  <span className="text-muted-foreground">PM10</span>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="pm25Gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="pm10Gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="μg/m³" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }} 
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        pm25: 'PM2.5',
                        pm10: 'PM10',
                      };
                      return [`${value} μg/m³`, labels[name] || name];
                    }} 
                  />
                  <Area type="monotone" dataKey="pm25" stroke="#8b5cf6" fill="url(#pm25Gradient)" strokeWidth={2} name="pm25" />
                  <Area type="monotone" dataKey="pm10" stroke="#d97706" fill="url(#pm10Gradient)" strokeWidth={2} name="pm10" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Noise Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-slate-500" />
              噪音趨勢
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="noiseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64748b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="dB" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }} 
                    formatter={(value: number) => [`${value} dB`, '噪音']} 
                  />
                  <Area type="monotone" dataKey="noise" stroke="#64748b" fill="url(#noiseGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Solar Power Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              太陽能發電趨勢
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="W" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }} 
                    formatter={(value: number) => [`${value} W`, '太陽能功率']} 
                  />
                  <Area type="monotone" dataKey="solar" stroke="#f59e0b" fill="url(#solarGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnvironmentalTrends;
