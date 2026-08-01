import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Brain, DollarSign, Zap, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AIUsageLog {
  id: string;
  user_id: string;
  feature_type: string;
  tokens_used: number | null;
  estimated_cost: number | null;
  created_at: string;
  request_metadata: any;
}

const COLORS = ["hsl(var(--accent))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export function AdminAIUsage() {
  const [logs, setLogs] = useState<AIUsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    byFeature: [] as { name: string; value: number }[],
  });

  useEffect(() => {
    async function fetchAIUsage() {
      try {
        const { data, error } = await supabase
          .from("ai_usage_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) {
          console.error("Error fetching AI usage:", error);
        } else {
          setLogs(data || []);

          // Calculate stats
          const totalRequests = data?.length || 0;
          const totalTokens = data?.reduce((sum, log) => sum + (log.tokens_used || 0), 0) || 0;
          const totalCost = data?.reduce((sum, log) => sum + (log.estimated_cost || 0), 0) || 0;

          // Group by feature
          const featureCounts: Record<string, number> = {};
          data?.forEach((log) => {
            featureCounts[log.feature_type] = (featureCounts[log.feature_type] || 0) + 1;
          });

          const byFeature = Object.entries(featureCounts).map(([name, value]) => ({
            name,
            value,
          }));

          setStats({ totalRequests, totalTokens, totalCost, byFeature });
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAIUsage();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">AI Usage Monitor</h2>
        <p className="text-muted-foreground">Track AI requests, tokens, and costs across the platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">Total Requests</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.totalRequests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Total Tokens</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.totalTokens.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Estimated Cost</span>
            </div>
            <div className="text-2xl font-bold text-foreground">${stats.totalCost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Avg Tokens/Request</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats.totalRequests > 0 ? Math.round(stats.totalTokens / stats.totalRequests) : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Usage by Feature */}
        <Card>
          <CardHeader>
            <CardTitle>Usage by Feature</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byFeature.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.byFeature}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {stats.byFeature.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No usage data</p>
            )}
          </CardContent>
        </Card>

        {/* Feature Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.byFeature.map((feature, index) => (
                <div key={feature.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm">{feature.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{feature.value} requests</Badge>
                    <span className="text-sm text-muted-foreground">
                      ({((feature.value / stats.totalRequests) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent AI Requests</CardTitle>
          <CardDescription>Last 100 AI API calls</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length > 0 ? (
                logs.slice(0, 20).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant="outline">{log.feature_type}</Badge>
                    </TableCell>
                    <TableCell>{log.tokens_used?.toLocaleString() || "-"}</TableCell>
                    <TableCell>${log.estimated_cost?.toFixed(4) || "0.0000"}</TableCell>
                    <TableCell className="font-mono text-xs">{log.user_id.slice(0, 8)}...</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(log.created_at), "MMM d, h:mm a")}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No AI usage logs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
