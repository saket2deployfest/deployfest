'use client';

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { keyMetrics, type Guard, sectors as sectorOptions } from "@/lib/data";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import {
  ArrowUp,
  ArrowDown,
  Users,
  ShieldAlert,
  Signal,
  Phone,
  User,
  PlusCircle,
  Stethoscope,
  Search,
  MessageSquareWarning,
  AlertOctagon,
  FileText,
  RefreshCw,
  AlertTriangle,
  Video,
  Camera,
  TrendingUp,
  Eye,
  Activity
} from "lucide-react";
import { collection, onSnapshot, doc, addDoc, updateDoc, query, where, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Grievance } from "@/app/(app)/grievances/page";
import { summarizeDashboard } from "@/ai/flows/summarize-dashboard.client";
import { BACKEND_URL } from '@/lib/backend-url';
import Link from 'next/link';
import AutonomousAgent from "@/components/autonomous-agent";

// Import Recharts for premium crowd monitoring charts
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface AnalyticsSummary {
  total_current_count: number;
  total_capacity: number;
  overall_density: number;
  alert_distribution: {
    critical: number;
    warning: number;
    normal: number;
  };
  active_feeds: number;
}

interface AnalyticsResponse {
  summary: AnalyticsSummary;
  trend_data: any[];
  timestamp: string;
}

const metricIcons: { [key: string]: React.ElementType } = {
  "Active Guards": ShieldAlert,
  "Active Alerts": Signal,
  "Open Grievances": AlertOctagon,
};

const getStatusBadgeVariant = (status: "Active" | "Alert" | "Standby") => {
  switch (status) {
    case "Active":
      return "default";
    case "Alert":
      return "destructive";
    case "Standby":
      return "secondary";
    default:
      return "outline";
  }
};

const CCTV_FEEDS_CONFIG = [
  { id: "feed_1", name: "Main Entrance", area: "entrance",     color: "#3b82f6" },
  { id: "feed_2", name: "Mall Stage",    area: "stage",        color: "#8b5cf6" },
  { id: "feed_3", name: "Red Street Road", area: "front_street", color: "#ec4899" },
  { id: "feed_4", name: "Exit Gate",     area: "exit_a",       color: "#f59e0b" },
  { id: "feed_5", name: "Subway",        area: "exit_b",       color: "#10b981" },
  { id: "feed_6", name: "Market",        area: "back_street",  color: "#ef4444" },
  { id: "feed_7", name: "Cross Road",    area: "crossroad",    color: "#06b6d4" },
  { id: "feed_8", name: "Lobby",         area: "lobby",        color: "#f97316" },
];

function AddGuardForm({ onGuardAdded }: { onGuardAdded: () => void }) {
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [status, setStatus] = useState<Guard["status"]>("Standby");
  const [phone, setPhone] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toast({
        title: "Missing Information",
        description: "Please fill out all required fields.",
        variant: "destructive",
      });
      return;
    }
    try {
      await addDoc(collection(db, "guards"), {
        name,
        sector,
        status,
        phone,
      });
      toast({
        title: "Guard Added",
        description: `${name} has been added to the roster.`,
      });
      onGuardAdded(); // Close dialog
      // Reset form
      setName("");
      setSector("");
      setStatus("Standby");
      setPhone("");
    } catch (error: any) {
      console.error("Error adding guard: ", error);
      toast({
        title: "Error adding guard",
        description: error.message || "Could not add guard. Please check console and Firebase rules.",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Guard Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="123-456-7890" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sector">Sector</Label>
          <Select value={sector} onValueChange={setSector}>
            <SelectTrigger id="sector">
              <SelectValue placeholder="Select a sector" />
            </SelectTrigger>
            <SelectContent>
              {sectorOptions.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as Guard['status'])}>
            <SelectTrigger id="status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Standby">Standby</SelectItem>
              <SelectItem value="Alert">Alert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit">Add Guard</Button>
      </DialogFooter>
    </form>
  );
}

export default function DashboardPage() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [metrics, setMetrics] = useState(keyMetrics);
  const [isAddGuardOpen, setAddGuardOpen] = useState(false);
  const { toast } = useToast();
  const [openGrievances, setOpenGrievances] = useState<Grievance[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [medicalStaff, setMedicalStaff] = useState<any[]>([]);
  const [summary, setSummary] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);

  // Real-time Analytics States
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [formattedTrendData, setFormattedTrendData] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [lastAnalyticsFetch, setLastAnalyticsFetch] = useState<Date | null>(null);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline'>('offline');

  // CCTV Feeds Snapshot state to avoid heavy streaming on the main page
  const [snapshotUrls, setSnapshotUrls] = useState<Record<string, string>>({});

  const analyticsIntervalRef = useRef<NodeJS.Timeout>();

  const grievanceCounts = openGrievances.reduce((acc, g) => {
    acc.total++;
    if (g.type === 'Medical Attention') acc.medical++;
    else if (g.type === 'Missing Person') acc.missing++;
    else if (g.type === 'General Grievance') acc.general++;
    return acc;
  }, { total: 0, medical: 0, missing: 0, general: 0 });

  // Store analytics data to Firestore for caching
  const storeAnalyticsInFirestore = async (summary: AnalyticsSummary, trend: any[]) => {
    try {
      const docRef = doc(db, 'dashboard_analytics', 'summary');
      await setDoc(docRef, {
        summary,
        trendData: trend,
        lastUpdated: serverTimestamp()
      });
      console.info('Cached dashboard analytics in Firestore.');
    } catch (err) {
      console.error('Error caching dashboard analytics in Firestore:', err);
    }
  };

  // Load analytics data from Firestore as a fallback
  const loadAnalyticsFromFirestore = async () => {
    try {
      const docRef = doc(db, 'dashboard_analytics', 'summary');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAnalyticsSummary(data.summary as AnalyticsSummary);
        processTrendData(data.trendData || []);
        setBackendStatus('offline');
        setAnalyticsError('Backend offline – showing cached analytics from Firestore.');
        console.info('Loaded dashboard analytics from Firestore cache.');
      } else {
        setAnalyticsError('Backend offline and no cached analytics available.');
      }
    } catch (fsErr) {
      console.error('Firestore analytics fallback failed:', fsErr);
      setAnalyticsError('Backend offline and Firestore cache unavailable.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Format trend data for plotting in Recharts
  const processTrendData = (trendData: any[]) => {
    if (!trendData || trendData.length === 0) return;

    // Group items by timestamp
    const groups: Record<string, any> = {};
    trendData.forEach(point => {
      const date = new Date(point.timestamp);
      const timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (!groups[timeLabel]) {
        groups[timeLabel] = { name: timeLabel };
      }
      groups[timeLabel][point.feed_name] = point.density_percentage;
    });

    // Convert to sorted array
    const sortedData = Object.values(groups).sort((a: any, b: any) => {
      return a.name.localeCompare(b.name);
    });
    setFormattedTrendData(sortedData);
  };

  // Force update CCTV snapshots
  const refreshSnapshots = useCallback(() => {
    const timestamp = Date.now();
    const urls: Record<string, string> = {};
    CCTV_FEEDS_CONFIG.forEach(feed => {
      urls[feed.id] = `${BACKEND_URL}/api/video/snapshot/${feed.id}?t=${timestamp}`;
    });
    setSnapshotUrls(urls);
  }, []);

  const fetchAnalyticsSummary = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/analytics/summary`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AnalyticsResponse = await response.json();
      setAnalyticsSummary(data.summary);
      processTrendData(data.trend_data || []);
      setBackendStatus('online');
      setAnalyticsError(null);
      setLastAnalyticsFetch(new Date());

      // Refresh CCTV snapshots
      refreshSnapshots();

      // Store in Firestore
      await storeAnalyticsInFirestore(data.summary, data.trend_data || []);
    } catch (err) {
      console.error('Failed to fetch analytics summary:', err);
      await loadAnalyticsFromFirestore();
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch guards data from Firestore in real-time
    const guardsUnsubscribe = onSnapshot(collection(db, "guards"), (snapshot) => {
      const guardsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guard));
      setGuards(guardsData);

      setMetrics(prevMetrics => {
        const activeGuardsCount = guardsData.filter(g => g.status === 'Active').length;
        const currentActiveGuardsMetric = prevMetrics["Active Guards"];
        if (!currentActiveGuardsMetric) return prevMetrics;

        const currentActiveGuards = parseInt(currentActiveGuardsMetric.value) || 0;
        const changeType = activeGuardsCount > currentActiveGuards ? 'increase' : activeGuardsCount < currentActiveGuards ? 'decrease' : 'neutral';

        return {
          ...prevMetrics,
          "Active Guards": {
            ...currentActiveGuardsMetric,
            value: activeGuardsCount.toString(),
            change: `${changeType === 'increase' ? '+' : ''}${activeGuardsCount - currentActiveGuards}`,
            changeType: changeType
          }
        }
      });
    });

    // Fetch alerts & update states
    const fetchAlerts = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/alerts`);
        if (response.ok) {
          const data = await response.json();
          const activeAlerts = data.alerts.filter(
            (alert: { alert_level: string; }) => alert.alert_level === 'warning' || alert.alert_level === 'critical'
          );
          setAlerts(activeAlerts);

          setMetrics(prevMetrics => {
            const activeAlertsMetric = prevMetrics["Active Alerts"];
            if (!activeAlertsMetric) return prevMetrics;

            const currentAlerts = parseInt(activeAlertsMetric.value) || 0;
            const newCount = activeAlerts.length;
            const changeType = newCount > currentAlerts ? 'increase' : newCount < currentAlerts ? 'decrease' : 'neutral';

            return {
              ...prevMetrics,
              "Active Alerts": {
                ...activeAlertsMetric,
                value: newCount.toString(),
                change: `${changeType === 'increase' ? '+' : ''}${newCount - currentAlerts}`,
                changeType: changeType,
              },
            };
          });
        }
      } catch (error) {
        console.error("Failed to fetch active alerts:", error);
      }
    };

    fetchAlerts();
    const alertsInterval = setInterval(fetchAlerts, 10000);

    // Initial analytics fetch & start polling every 5 seconds
    fetchAnalyticsSummary();
    analyticsIntervalRef.current = setInterval(fetchAnalyticsSummary, 5000);

    const grievancesQuery = query(collection(db, "grievances"), where("status", "==", "new"));
    const grievancesUnsubscribe = onSnapshot(grievancesQuery, (snapshot) => {
      const grievancesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grievance));
      setOpenGrievances(grievancesData);
    });

    const ambulancesUnsubscribe = onSnapshot(collection(db, "ambulances"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAmbulances(data);
    });

    const medicalStaffUnsubscribe = onSnapshot(collection(db, "medical_staff"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMedicalStaff(data);
    });

    return () => {
      guardsUnsubscribe();
      clearInterval(alertsInterval);
      if (analyticsIntervalRef.current) {
        clearInterval(analyticsIntervalRef.current);
      }
      grievancesUnsubscribe();
      ambulancesUnsubscribe();
      medicalStaffUnsubscribe();
    };
  }, []);

  const handleGuardUpdate = async (guardId: string, field: keyof Guard, value: string) => {
    const guardRef = doc(db, "guards", guardId);
    try {
      await updateDoc(guardRef, { [field]: value });
      toast({
        title: "Guard Updated",
        description: `Guard's ${field} has been updated.`,
      });
    } catch (error: any) {
      console.error("Error updating guard: ", error);
      toast({
        title: "Error",
        description: error.message || "Could not update guard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateSummary = async () => {
    setIsSummaryLoading(true);
    try {
      const result = await summarizeDashboard({
        guards,
        alerts,
        grievances: openGrievances
      });
      setSummary(result.summary);
      setIsSummaryDialogOpen(true);
    } catch (error) {
      console.error("Error generating summary:", error);
      toast({
        title: "Error",
        description: "Could not generate the summary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const forceRefreshAll = () => {
    setAnalyticsLoading(true);
    fetchAnalyticsSummary();
  };

  return (
    <div className="space-y-6">
      {/* Header section with real-time status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Operator Command Center</h2>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
              Real-time Event Health Dashboard
            </p>
            <div className={cn(
              "flex items-center gap-1 text-xs px-2 py-0.5 rounded font-semibold",
              backendStatus === 'online' ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
            )}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping mr-1" />
              {backendStatus === 'online' ? "Live System Online" : "System Offline"}
            </div>
            {lastAnalyticsFetch && (
              <span className="text-xs text-muted-foreground">
                Synced: {lastAnalyticsFetch.toLocaleTimeString()}
              </span>
            )}
          </div>
          {analyticsError && (
            <p className="text-xs text-yellow-500 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {analyticsError}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={forceRefreshAll} variant="outline" size="sm" disabled={analyticsLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", analyticsLoading && "animate-spin")} />
            Refresh Core
          </Button>
          <Button onClick={handleGenerateSummary} size="sm" disabled={isSummaryLoading}>
            {isSummaryLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            AI Intel Summary
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(metrics).map(([title, data]) => {
          const Icon = metricIcons[title];
          if (!Icon) return null;
          return (
            <Card key={title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{data.value}</div>
                <p
                  className={cn(
                    "text-xs text-muted-foreground flex items-center mt-1",
                    {
                      "text-green-500": data.changeType === "increase" && title !== "Active Alerts",
                      "text-red-500": data.changeType === "decrease" || (title === "Active Alerts" && data.changeType === "increase"),
                    }
                  )}
                >
                  {data.changeType === "increase" ? (
                    <ArrowUp className="h-3.5 w-3.5 mr-0.5" />
                  ) : data.changeType === "decrease" ? (
                    <ArrowDown className="h-3.5 w-3.5 mr-0.5" />
                  ) : null}
                  {data.change} from last hour
                </p>
              </CardContent>
            </Card>
          );
        })}

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Grievances</CardTitle>
            <AlertOctagon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-red-500">{grievanceCounts.total}</div>
            <div className="text-[10px] text-muted-foreground grid grid-cols-3 gap-1 mt-2">
              <div className="flex items-center gap-0.5">
                <Stethoscope className="h-3 w-3 text-red-400" />
                <span>Medical: {grievanceCounts.medical}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <Search className="h-3 w-3 text-blue-400" />
                <span>Missing: {grievanceCounts.missing}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <MessageSquareWarning className="h-3 w-3 text-purple-400" />
                <span>Gen: {grievanceCounts.general}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drishti AI Autonomous Agent Panel */}
      <AutonomousAgent 
        guards={guards}
        alerts={alerts}
        grievances={openGrievances}
        ambulances={ambulances}
        medicalStaff={medicalStaff}
      />

      {/* Real-time Crowd Analytics Summary and Trends */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Crowd Overview Card */}
        <Card className="md:col-span-1 border-l-4 border-l-blue-500 flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-blue-500" />
              Event Crowd Overview
            </CardTitle>
            <CardDescription>Live computed load metrics of the venue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex-grow flex flex-col justify-center">
            {analyticsLoading && !analyticsSummary ? (
              <div className="space-y-4">
                <div className="h-10 bg-muted animate-pulse rounded" />
                <div className="h-10 bg-muted animate-pulse rounded" />
                <div className="h-10 bg-muted animate-pulse rounded" />
              </div>
            ) : analyticsSummary ? (
              <div className="space-y-5">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground font-medium">Overall Density</span>
                  <Badge variant={analyticsSummary.overall_density > 60 ? "destructive" : analyticsSummary.overall_density > 45 ? "default" : "secondary"} className="text-sm px-2.5 font-bold">
                    {analyticsSummary.overall_density}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground font-medium">Total Current Count</span>
                  <span className="text-xl font-bold text-foreground">
                    {analyticsSummary.total_current_count} <span className="text-xs text-muted-foreground font-normal">persons</span>
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground font-medium">Total Venue Capacity</span>
                  <span className="text-sm font-semibold text-muted-foreground">
                    {analyticsSummary.total_capacity} max
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2">
                  <span className="text-sm text-muted-foreground font-medium">Alert Level Distribution</span>
                  <div className="flex gap-1.5">
                    {analyticsSummary.alert_distribution.critical > 0 && (
                      <Badge variant="destructive" className="font-bold">
                        {analyticsSummary.alert_distribution.critical} Critical
                      </Badge>
                    )}
                    {analyticsSummary.alert_distribution.warning > 0 && (
                      <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
                        {analyticsSummary.alert_distribution.warning} Warning
                      </Badge>
                    )}
                    {analyticsSummary.alert_distribution.normal > 0 && (
                      <Badge className="bg-green-600 hover:bg-green-700 text-white font-bold">
                        {analyticsSummary.alert_distribution.normal} Normal
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Analytics data unavailable
              </div>
            )}
          </CardContent>
        </Card>

        {/* Responsive Area Chart Card */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
                Crowd Density Trends (%)
              </CardTitle>
              <CardDescription>Real-time sector density tracked over the last hour</CardDescription>
            </div>
            <Link href="/map-view">
              <Button size="sm" variant="ghost" className="text-xs text-blue-500 hover:text-blue-600">
                View Heatmap
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="h-[230px] w-full">
              {analyticsLoading && formattedTrendData.length === 0 ? (
                <div className="w-full h-full bg-muted animate-pulse rounded" />
              ) : formattedTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      {CCTV_FEEDS_CONFIG.map(feed => (
                        <linearGradient key={feed.id} id={`gradient-${feed.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={feed.color} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={feed.color} stopOpacity={0.0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: 11 }} />
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 9, paddingTop: 10 }} />
                    {CCTV_FEEDS_CONFIG.map(feed => (
                      <Area
                        key={feed.id}
                        type="monotone"
                        dataKey={feed.name}
                        stroke={feed.color}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill={`url(#gradient-${feed.id})`}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-muted rounded">
                  <span className="text-sm text-muted-foreground">Waiting for density log data points...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live CCTV feeds snapshots monitor */}
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Camera className="h-5 w-5 text-blue-500" />
              Live CCTV Monitor Matrix
            </CardTitle>
            <CardDescription>Visual feed summaries with automatic incident mapping</CardDescription>
          </div>
          <Link href="/live-feed">
            <Button size="sm" variant="outline" className="text-xs">
              <Video className="mr-1.5 h-3.5 w-3.5" /> Full Screens
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {CCTV_FEEDS_CONFIG.map(feed => {
              const hasSnapshot = snapshotUrls[feed.id] != null;
              // Attempt to link current counts if available from analytics/alerts
              const matchedAlert = alerts.find(a => a.feed_id === feed.id);
              const isAlert = matchedAlert?.alert_level === 'warning' || matchedAlert?.alert_level === 'critical';
              const density = matchedAlert?.density_percentage || 0;
              const count = matchedAlert?.current_count || 0;

              return (
                <Card key={feed.id} className={cn("overflow-hidden border bg-background/50 transition-all hover:scale-102 hover:shadow-lg", isAlert && "border-red-500 shadow-red-500/10")}>
                  <div className="relative aspect-video w-full bg-slate-900 overflow-hidden flex items-center justify-center">
                    {hasSnapshot ? (
                      <img
                        src={snapshotUrls[feed.id]}
                        alt={feed.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fail gracefully if snapshot endpoint throws an error
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-2 text-center text-[10px] text-muted-foreground">
                        <Video className="h-6 w-6 mb-1 text-muted-foreground animate-pulse" />
                        <span>Feed loading</span>
                      </div>
                    )}
                    {/* Live Indicator */}
                    <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[8px] text-white">
                      <span className="w-1 h-1 bg-green-500 rounded-full animate-ping" />
                      LIVE
                    </div>
                  </div>
                  <div className="p-2 space-y-1">
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-xs font-bold truncate block max-w-[100px]">{feed.name}</span>
                      {density > 0 && (
                        <Badge variant={density > 60 ? "destructive" : "secondary"} className="text-[8px] h-4 py-0 px-1 font-bold">
                          {density}%
                        </Badge>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-muted-foreground pt-1 border-t">
                      <span>Count: <b>{count}</b></span>
                      <span className="truncate block max-w-[60px]">{feed.area.toUpperCase()}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Guard Status Table & Grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Guard Status</CardTitle>
            <CardDescription>Manage your security team in real-time.</CardDescription>
          </div>
          <Dialog open={isAddGuardOpen} onOpenChange={setAddGuardOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Guard
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Guard</DialogTitle>
                <DialogDescription>
                  Enter the details for the new guard. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <AddGuardForm onGuardAdded={() => setAddGuardOpen(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guard</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guards.map((guard) => (
                <TableRow key={guard.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{guard.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select value={guard.sector} onValueChange={(value) => handleGuardUpdate(guard.id, 'sector', value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Sector" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectorOptions.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={guard.status} onValueChange={(value) => handleGuardUpdate(guard.id, 'status', value as Guard['status'])}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue asChild>
                          <Badge variant={getStatusBadgeVariant(guard.status)} className="capitalize">{guard.status}</Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active"><Badge variant="default">Active</Badge></SelectItem>
                        <SelectItem value="Standby"><Badge variant="secondary">Standby</Badge></SelectItem>
                        <SelectItem value="Alert"><Badge variant="destructive">Alert</Badge></SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{guard.phone}</span>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${guard.phone}`}>
                          <Phone className="h-4 w-4 mr-2" />
                          Contact
                        </a>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* AI Intel Summary Dialog */}
      <Dialog open={isSummaryDialogOpen} onOpenChange={setIsSummaryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Live Event Summary</DialogTitle>
            <DialogDescription>
              An AI-generated summary of the current event status.
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert whitespace-pre-wrap">
            {summary}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSummaryDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}