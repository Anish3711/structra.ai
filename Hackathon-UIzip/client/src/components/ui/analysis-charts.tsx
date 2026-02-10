import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from "recharts";
import { CalculationResult } from "@/hooks/use-construction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Clock, Users, Box } from "lucide-react";

interface AnalysisChartsProps {
  data: CalculationResult;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function AnalysisCharts({ data }: AnalysisChartsProps) {
  const materialsData = Object.entries(data.materials).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value
  }));

  const costDistribution = [
    { name: 'Materials', value: data.materialsCost },
    { name: 'Labor', value: data.laborCost },
  ];

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Cost" 
          value={`$${data.totalCost.toLocaleString()}`} 
          icon={<DollarSign className="w-5 h-5 text-primary" />} 
        />
        <MetricCard 
          title="Cost / Sq.Ft" 
          value={`$${data.costPerSqFt}`} 
          icon={<Box className="w-5 h-5 text-emerald-500" />} 
        />
        <MetricCard 
          title="Timeline" 
          value={`${data.timelineWeeks} Weeks`} 
          icon={<Clock className="w-5 h-5 text-amber-500" />} 
        />
        <MetricCard 
          title="Team Size" 
          value={`${Object.values(data.labor).reduce((a, b) => a + b, 0)} Workers`} 
          icon={<Users className="w-5 h-5 text-purple-500" />} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cost Distribution */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {costDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#f59e0b'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Materials Breakdown */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Materials Required</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={materialsData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `${Number(value).toLocaleString()} units`} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {materialsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6 flex items-center gap-4">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold font-display">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
