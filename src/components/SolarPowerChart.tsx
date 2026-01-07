import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load recharts components
const LazyBarChart = lazy(() => 
  import('recharts').then(mod => ({ default: mod.BarChart }))
);
const LazyBar = lazy(() => 
  import('recharts').then(mod => ({ default: mod.Bar }))
);
const LazyXAxis = lazy(() => 
  import('recharts').then(mod => ({ default: mod.XAxis }))
);
const LazyYAxis = lazy(() => 
  import('recharts').then(mod => ({ default: mod.YAxis }))
);
const LazyCartesianGrid = lazy(() => 
  import('recharts').then(mod => ({ default: mod.CartesianGrid }))
);
const LazyTooltip = lazy(() => 
  import('recharts').then(mod => ({ default: mod.Tooltip }))
);
const LazyResponsiveContainer = lazy(() => 
  import('recharts').then(mod => ({ default: mod.ResponsiveContainer }))
);
const LazyCell = lazy(() => 
  import('recharts').then(mod => ({ default: mod.Cell }))
);

interface SolarChartData {
  name: string;
  fullName: string;
  power: number;
}

interface SolarPowerChartProps {
  data: SolarChartData[];
}

const ChartFallback = () => (
  <div className="h-48 flex items-center justify-center">
    <Skeleton className="w-full h-full" />
  </div>
);

const SolarPowerChart = ({ data }: SolarPowerChartProps) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <p>目前沒有太陽能發電數據</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<ChartFallback />}>
      <div className="h-48">
        <LazyResponsiveContainer width="100%" height="100%">
          <LazyBarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <LazyCartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
            <LazyXAxis 
              type="number" 
              unit=" kW" 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <LazyYAxis 
              type="category" 
              dataKey="name" 
              width={70}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <LazyTooltip 
              formatter={(value: number) => [`${value} kW`, '發電量']}
              labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <LazyBar dataKey="power" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <LazyCell 
                  key={`cell-${index}`} 
                  fill={`hsl(${45 - index * 8}, 90%, ${55 + index * 3}%)`}
                />
              ))}
            </LazyBar>
          </LazyBarChart>
        </LazyResponsiveContainer>
      </div>
    </Suspense>
  );
};

export default SolarPowerChart;
