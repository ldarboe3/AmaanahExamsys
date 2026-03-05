import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Plus,
  MapPin,
  Users,
  School,
  Phone,
  Mail,
  Building2,
  Loader2,
  Wand2,
  Timer,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  TrendingUp,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Truck,
  ShieldAlert,
  PlayCircle,
  CircleDot,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ExamCenter, Region, Cluster } from "@shared/schema";

const centerSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  code: z.string().min(2, "Code is required"),
  address: z.string().optional(),
  regionId: z.coerce.number().min(1, "Region is required"),
  clusterId: z.coerce.number().min(1, "Cluster is required"),
  capacity: z.coerce.number().min(10, "Capacity must be at least 10"),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
});

type CenterFormData = z.infer<typeof centerSchema>;

interface CenterWithRelations extends ExamCenter {
  region?: { name: string };
  cluster?: { name: string };
  assignedSchoolsCount?: number;
  assignedStudentsCount?: number;
}

interface CenterMonitoringData {
  centerId: number;
  centerName: string;
  attendanceCount: number;
  malpracticeCount: number;
  assignedSchoolsCount: number;
  schools: Array<{ id: number; name: string; schoolBadge: string | null }>;
  packetByStatus: Record<string, number>;
  packetByLocation: Record<string, number>;
  totalPackets: number;
  latestSession: {
    id: number;
    status: string;
    actualStartTime: string | null;
    actualEndTime: string | null;
    startedLate: boolean;
    lateStartMinutes: number;
  } | null;
  sessionCount: number;
}

// Card color themes cycling through centers
const CARD_THEMES = [
  {
    card: "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30",
    icon: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
    accent: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    pipeline: "bg-blue-500",
  },
  {
    card: "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30",
    icon: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
    accent: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    pipeline: "bg-emerald-500",
  },
  {
    card: "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30",
    icon: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
    accent: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    pipeline: "bg-amber-500",
  },
  {
    card: "bg-violet-50/60 dark:bg-violet-950/20 border-violet-200/50 dark:border-violet-800/30",
    icon: "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400",
    accent: "text-violet-600 dark:text-violet-400",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
    pipeline: "bg-violet-500",
  },
  {
    card: "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-800/30",
    icon: "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400",
    accent: "text-rose-600 dark:text-rose-400",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
    pipeline: "bg-rose-500",
  },
  {
    card: "bg-cyan-50/60 dark:bg-cyan-950/20 border-cyan-200/50 dark:border-cyan-800/30",
    icon: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400",
    accent: "text-cyan-600 dark:text-cyan-400",
    badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300",
    pipeline: "bg-cyan-500",
  },
];

const LOGISTICS_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"];

function formatElapsedTime(startTime: string): string {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const elapsedMs = now - start;
  if (elapsedMs < 0) return "0:00:00";
  const hours = Math.floor(elapsedMs / 3600000);
  const mins = Math.floor((elapsedMs % 3600000) / 60000);
  const secs = Math.floor((elapsedMs % 60000) / 1000);
  return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function LiveTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState(() => formatElapsedTime(startTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(formatElapsedTime(startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span className="font-mono text-sm font-semibold tabular-nums">{elapsed}</span>
  );
}

const LOCATION_LABELS: Record<string, string> = {
  hq: "HQ",
  region: "Region",
  cluster: "Cluster",
  center: "Center",
};

const LOCATION_ORDER = ["hq", "region", "cluster", "center"];

function PaperLogisticsPipeline({ packetByLocation, totalPackets, themeColor }: {
  packetByLocation: Record<string, number>;
  totalPackets: number;
  themeColor: string;
}) {
  if (totalPackets === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
        <Package className="w-3.5 h-3.5" />
        <span>No packets assigned</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-2">
      {LOCATION_ORDER.map((loc, idx) => {
        const count = packetByLocation[loc] || 0;
        const isActive = count > 0;
        return (
          <div key={loc} className="flex items-center gap-1 flex-1 min-w-0">
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className={`w-full h-1.5 rounded-full transition-all ${isActive ? themeColor : "bg-muted/60"}`}
              />
              <div className="flex flex-col items-center">
                <span className={`text-[9px] font-medium leading-none mt-0.5 ${isActive ? "text-foreground" : "text-muted-foreground/50"}`}>
                  {LOCATION_LABELS[loc]}
                </span>
                {isActive && (
                  <span className={`text-[9px] font-bold leading-none ${isActive ? "text-foreground" : "text-muted-foreground/50"}`}>
                    {count}
                  </span>
                )}
              </div>
            </div>
            {idx < LOCATION_ORDER.length - 1 && (
              <span className="text-muted-foreground/40 text-[10px] shrink-0">›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExamStatusBadge({ session }: { session: CenterMonitoringData["latestSession"] }) {
  if (!session) {
    return (
      <Badge variant="outline" className="gap-1 text-xs border-dashed text-muted-foreground">
        <CircleDot className="w-3 h-3" />
        Not Started
      </Badge>
    );
  }

  const status = session.status;

  if (status === "started_on_time" || status === "started_late") {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className="gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-0">
            <PlayCircle className="w-3 h-3" />
            Running
          </Badge>
          {session.startedLate && (
            <Badge className="gap-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0">
              <AlertTriangle className="w-3 h-3" />
              {session.lateStartMinutes}m late
            </Badge>
          )}
        </div>
        {session.actualStartTime && (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <Timer className="w-3.5 h-3.5" />
            <LiveTimer startTime={session.actualStartTime} />
          </div>
        )}
      </div>
    );
  }

  if (status === "completed" || status === "ended_late") {
    return (
      <Badge className="gap-1 text-xs bg-muted text-muted-foreground border-0">
        <CheckCircle2 className="w-3 h-3" />
        Completed
        {session.status === "ended_late" && " (late end)"}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-xs border-dashed text-muted-foreground">
      <Clock className="w-3 h-3" />
      Scheduled
    </Badge>
  );
}

function CenterCard({
  center,
  monitoring,
  themeIndex,
  onEdit,
  onViewDetails,
  onDelete,
  isRTL,
  t
}: {
  center: CenterWithRelations;
  monitoring?: CenterMonitoringData;
  themeIndex: number;
  onEdit: () => void;
  onViewDetails: () => void;
  onDelete: () => void;
  isRTL: boolean;
  t: any;
}) {
  const theme = CARD_THEMES[themeIndex % CARD_THEMES.length];
  const firstSchoolWithBadge = monitoring?.schools?.find(s => s.schoolBadge);
  const session = monitoring?.latestSession || null;
  const isLate = session?.startedLate && (session?.status === "started_late" || session?.status === "started_on_time");

  return (
    <Card className={`hover-elevate overflow-hidden ${theme.card}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {firstSchoolWithBadge ? (
              <div className="shrink-0">
                <img
                  src={firstSchoolWithBadge.schoolBadge!}
                  alt={`${firstSchoolWithBadge.name} badge`}
                  className="w-14 h-14 rounded-md object-contain border border-white/80 dark:border-white/10 shadow-sm bg-white dark:bg-background"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            ) : (
              <div className={`w-14 h-14 rounded-md flex items-center justify-center shrink-0 ${theme.icon}`}>
                <MapPin className="w-7 h-7" />
              </div>
            )}
            <div className="min-w-0">
              <CardTitle className="text-base leading-snug line-clamp-2">{center.name}</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {t.common.code}: <span className={`font-semibold ${theme.accent}`}>{center.code}</span>
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-actions-${center.id}`}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? "start" : "end"}>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 me-2" />
                {t.common.edit}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/centers/${center.id}`}>
                  <Eye className="w-4 h-4 me-2" />
                  {t.centers.viewDetails}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 me-2" />
                {t.common.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span className="line-clamp-1">{center.region?.name || t.centers.noRegion} / {center.cluster?.name || t.centers.noCluster}</span>
        </div>

        {center.address && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="line-clamp-1">{center.address}</span>
          </div>
        )}

        {/* Exam Session Status */}
        <div className="pt-1 border-t border-black/5 dark:border-white/5">
          <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Exam Status</p>
          <ExamStatusBadge session={session} />
        </div>

        {/* Paper Logistics Pipeline */}
        {monitoring && (
          <div className="border-t border-black/5 dark:border-white/5 pt-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Paper Distribution</p>
            <PaperLogisticsPipeline
              packetByLocation={monitoring.packetByLocation}
              totalPackets={monitoring.totalPackets}
              themeColor={theme.pipeline}
            />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-black/5 dark:border-white/5">
          <div className="text-center">
            <p className={`text-base font-semibold ${theme.accent}`}>{(center.capacity || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{t.centers.capacity}</p>
          </div>
          <div className="text-center">
            <p className={`text-base font-semibold ${theme.accent}`}>{(center.assignedSchoolsCount || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Schools</p>
          </div>
          <div className="text-center">
            <p className={`text-base font-semibold ${theme.accent}`}>{(monitoring?.attendanceCount || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Present</p>
          </div>
          <div className="text-center">
            <p className={`text-base font-semibold ${monitoring?.malpracticeCount ? "text-destructive" : theme.accent}`}>
              {(monitoring?.malpracticeCount || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight">Cases</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <Badge variant={center.isActive ? "default" : "secondary"} className="text-xs">
            {center.isActive ? t.common.active : t.common.inactive}
          </Badge>
          {monitoring?.malpracticeCount && monitoring.malpracticeCount > 0 ? (
            <Badge className="text-xs gap-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0">
              <ShieldAlert className="w-3 h-3" />
              {monitoring.malpracticeCount} incident{monitoring.malpracticeCount > 1 ? "s" : ""}
            </Badge>
          ) : null}
          <Link href={`/centers/${center.id}`}>
            <Button size="sm" variant="outline" data-testid={`button-manage-${center.id}`}>
              <Eye className="w-3.5 h-3.5 me-1.5" />
              {t.centers.viewDetails}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function CenterCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-14 h-14 rounded-md" />
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <Skeleton className="w-8 h-8 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-6 w-full" />
        <div className="grid grid-cols-4 gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#ec4899", "#14b8a6"];

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-md shadow-md px-3 py-2 text-sm">
        <p className="font-medium mb-1 text-foreground">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.fill || p.color }} className="text-xs">
            {p.name}: <span className="font-semibold">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function MonitoringCharts({
  monitoring,
  centers,
}: {
  monitoring: CenterMonitoringData[];
  centers: CenterWithRelations[];
}) {
  const [activeTab, setActiveTab] = useState("attendance");
  const [collapsed, setCollapsed] = useState(false);

  const attendanceData = monitoring.map(m => ({
    name: m.centerName.length > 12 ? m.centerName.substring(0, 12) + "…" : m.centerName,
    fullName: m.centerName,
    Attendance: m.attendanceCount,
  }));

  const malpracticeData = monitoring.map(m => ({
    name: m.centerName.length > 12 ? m.centerName.substring(0, 12) + "…" : m.centerName,
    fullName: m.centerName,
    Cases: m.malpracticeCount,
  }));

  // Aggregate packet locations across all centers
  const locationTotals: Record<string, number> = {};
  monitoring.forEach(m => {
    Object.entries(m.packetByLocation).forEach(([loc, count]) => {
      locationTotals[loc] = (locationTotals[loc] || 0) + count;
    });
  });
  const logisticsData = Object.entries(locationTotals)
    .filter(([, v]) => v > 0)
    .map(([loc, count]) => ({
      name: LOCATION_LABELS[loc] || loc,
      value: count,
    }));

  // Session status aggregation
  const sessionStatusData: Record<string, number> = {};
  monitoring.forEach(m => {
    if (m.latestSession) {
      const s = m.latestSession.status;
      sessionStatusData[s] = (sessionStatusData[s] || 0) + 1;
    } else {
      sessionStatusData["not_started"] = (sessionStatusData["not_started"] || 0) + 1;
    }
  });
  const sessionPieData = Object.entries(sessionStatusData).map(([status, count]) => ({
    name: status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    value: count,
  }));

  // Summary metrics
  const totalAttendance = monitoring.reduce((s, m) => s + m.attendanceCount, 0);
  const totalMalpractice = monitoring.reduce((s, m) => s + m.malpracticeCount, 0);
  const totalPackets = monitoring.reduce((s, m) => s + m.totalPackets, 0);
  const activeSessions = monitoring.filter(m =>
    m.latestSession && ["started_on_time", "started_late"].includes(m.latestSession.status)
  ).length;
  const notStarted = monitoring.filter(m => !m.latestSession || m.latestSession.status === "scheduled").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Performance Dashboard</CardTitle>
              <CardDescription className="text-xs">Live monitoring across all exam centers</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(c => !c)}
            data-testid="button-toggle-dashboard"
          >
            {collapsed ? <ChevronDown className="w-4 h-4 me-1" /> : <ChevronUp className="w-4 h-4 me-1" />}
            {collapsed ? "Show Charts" : "Hide Charts"}
          </Button>
        </div>

        {/* Quick summary metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div className="bg-green-50/70 dark:bg-green-950/20 rounded-md px-3 py-2">
            <p className="text-xs text-muted-foreground">Total Present</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-400">{totalAttendance.toLocaleString()}</p>
          </div>
          <div className="bg-red-50/70 dark:bg-red-950/20 rounded-md px-3 py-2">
            <p className="text-xs text-muted-foreground">Malpractice Cases</p>
            <p className="text-lg font-bold text-red-700 dark:text-red-400">{totalMalpractice.toLocaleString()}</p>
          </div>
          <div className="bg-blue-50/70 dark:bg-blue-950/20 rounded-md px-3 py-2">
            <p className="text-xs text-muted-foreground">Active Sessions</p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{activeSessions}</p>
          </div>
          <div className="bg-amber-50/70 dark:bg-amber-950/20 rounded-md px-3 py-2">
            <p className="text-xs text-muted-foreground">Not Started</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{notStarted}</p>
          </div>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="attendance" data-testid="tab-attendance-chart">
                <Users className="w-3.5 h-3.5 me-1.5" />
                Attendance
              </TabsTrigger>
              <TabsTrigger value="malpractice" data-testid="tab-malpractice-chart">
                <ShieldAlert className="w-3.5 h-3.5 me-1.5" />
                Malpractice
              </TabsTrigger>
              <TabsTrigger value="logistics" data-testid="tab-logistics-chart">
                <Truck className="w-3.5 h-3.5 me-1.5" />
                Logistics
              </TabsTrigger>
              <TabsTrigger value="sessions" data-testid="tab-sessions-chart">
                <Timer className="w-3.5 h-3.5 me-1.5" />
                Sessions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="attendance">
              {attendanceData.some(d => d.Attendance > 0) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={attendanceData} margin={{ top: 4, right: 8, left: 0, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Attendance" radius={[4, 4, 0, 0]}>
                      {attendanceData.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                  No attendance data recorded yet
                </div>
              )}
            </TabsContent>

            <TabsContent value="malpractice">
              {malpracticeData.some(d => d.Cases > 0) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={malpracticeData} margin={{ top: 4, right: 8, left: 0, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Cases" radius={[4, 4, 0, 0]} fill="#ef4444">
                      {malpracticeData.map((_, index) => (
                        <Cell key={index} fill={`hsl(${0 + index * 10}, 70%, 55%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                  No malpractice cases reported
                </div>
              )}
            </TabsContent>

            <TabsContent value="logistics">
              {logisticsData.length > 0 ? (
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={logisticsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {logisticsData.map((_, index) => (
                          <Cell key={index} fill={LOGISTICS_COLORS[index % LOGISTICS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                  No paper packets in the system yet
                </div>
              )}
            </TabsContent>

            <TabsContent value="sessions">
              {sessionPieData.length > 0 ? (
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={sessionPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {sessionPieData.map((entry, index) => {
                          const color = entry.name.toLowerCase().includes("not started") ? "#94a3b8"
                            : entry.name.toLowerCase().includes("late") ? "#f59e0b"
                            : entry.name.toLowerCase().includes("completed") ? "#22c55e"
                            : "#6366f1";
                          return <Cell key={index} fill={color} />;
                        })}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                  No exam sessions recorded yet
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}

export default function Centers() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [clusterFilter, setClusterFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAutoAssignDialog, setShowAutoAssignDialog] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<CenterWithRelations | null>(null);

  // Build query string for API
  const queryParams = new URLSearchParams();
  if (regionFilter !== "all") queryParams.set("regionId", regionFilter);
  if (clusterFilter !== "all") queryParams.set("clusterId", clusterFilter);
  const queryString = queryParams.toString();
  const centersUrl = queryString ? `/api/centers?${queryString}` : "/api/centers";

  const { data: centers, isLoading } = useQuery<CenterWithRelations[]>({
    queryKey: [centersUrl],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: clusters } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
  });

  const { data: activeExamYear } = useQuery<any>({
    queryKey: ["/api/exam-years/active"],
  });

  const { data: monitoring } = useQuery<CenterMonitoringData[]>({
    queryKey: ["/api/centers/monitoring-dashboard", activeExamYear?.id],
    queryFn: async () => {
      const url = activeExamYear?.id
        ? `/api/centers/monitoring-dashboard?examYearId=${activeExamYear.id}`
        : `/api/centers/monitoring-dashboard`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load monitoring data");
      return res.json();
    },
    enabled: true,
    refetchInterval: 15000,
  });

  // Filter clusters based on selected region
  const clustersForFilter = clusters?.filter(
    (cluster) => regionFilter === "all" || cluster.regionId === parseInt(regionFilter)
  );

  const form = useForm<CenterFormData>({
    resolver: zodResolver(centerSchema),
    defaultValues: {
      name: "",
      code: "",
      address: "",
      regionId: 0,
      clusterId: 0,
      capacity: 500,
      contactPerson: "",
      contactPhone: "",
      contactEmail: "",
    },
  });

  const selectedRegionId = form.watch("regionId");
  const numericRegionId = selectedRegionId ? Number(selectedRegionId) : 0;
  const filteredClusters = numericRegionId
    ? clusters?.filter(c => c.regionId === numericRegionId)
    : [];

  const invalidateCenterQueries = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/centers');
      },
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data: CenterFormData) => {
      return apiRequest("POST", "/api/centers", data);
    },
    onSuccess: () => {
      invalidateCenterQueries();
      setShowCreateDialog(false);
      form.reset();
      toast({ title: t.centers.centerCreated, description: t.centers.centerCreatedDesc });
    },
    onError: () => {
      toast({ title: t.common.error, description: t.centers.failedToCreate, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CenterFormData }) => {
      return apiRequest("PATCH", `/api/centers/${id}`, data);
    },
    onSuccess: () => {
      invalidateCenterQueries();
      setShowEditDialog(false);
      setSelectedCenter(null);
      form.reset();
      toast({ title: t.centers.centerUpdated, description: t.centers.centerUpdatedDesc });
    },
    onError: () => {
      toast({ title: t.common.error, description: t.centers.failedToUpdate, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/centers/${id}`);
    },
    onSuccess: () => {
      invalidateCenterQueries();
      setShowDeleteDialog(false);
      setSelectedCenter(null);
      toast({ title: t.centers.centerDeleted, description: t.centers.centerDeletedDesc });
    },
    onError: () => {
      toast({ title: t.common.error, description: t.centers.failedToDelete, variant: "destructive" });
    },
  });

  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/center-assignments/auto-assign", {
        examYearId: (await fetch("/api/exam-years/active").then(r => r.json())).id
      });
      return response;
    },
    onSuccess: (data: any) => {
      invalidateCenterQueries();
      setShowAutoAssignDialog(false);
      toast({
        title: "Schools Assigned",
        description: `Successfully assigned ${data.assigned} schools. ${data.skipped > 0 ? `${data.skipped} schools could not be assigned.` : ''}`,
      });
    },
    onError: () => {
      toast({ title: t.common.error, description: "Failed to auto-assign schools", variant: "destructive" });
    },
  });

  const openCreateDialog = () => {
    form.reset({ name: "", code: "", address: "", regionId: 0, clusterId: 0, capacity: 500, contactPerson: "", contactPhone: "", contactEmail: "" });
    setShowCreateDialog(true);
  };

  const openEditDialog = (center: CenterWithRelations) => {
    setSelectedCenter(center);
    form.reset({
      name: center.name,
      code: center.code,
      address: center.address || "",
      regionId: center.regionId || 0,
      clusterId: center.clusterId || 0,
      capacity: center.capacity || 500,
      contactPerson: center.contactPerson || "",
      contactPhone: center.contactPhone || "",
      contactEmail: center.contactEmail || "",
    });
    setShowEditDialog(true);
  };

  const openViewDetails = (center: CenterWithRelations) => {
    setSelectedCenter(center);
    setShowDetailsDialog(true);
  };

  const openDeleteDialog = (center: CenterWithRelations) => {
    setSelectedCenter(center);
    setShowDeleteDialog(true);
  };

  const handleSubmit = (data: CenterFormData) => {
    if (showEditDialog && selectedCenter) {
      updateMutation.mutate({ id: selectedCenter.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredCenters = centers?.filter((center) =>
    center.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    center.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCapacity = centers?.reduce((sum, c) => sum + (c.capacity || 0), 0) || 0;
  const totalAssigned = centers?.reduce((sum, c) => sum + (c.assignedStudentsCount || 0), 0) || 0;

  const monitoringMap = new Map<number, CenterMonitoringData>(
    (monitoring || []).map(m => [m.centerId, m])
  );

  return (
    <div className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{t.centers.title}</h1>
          <p className="text-muted-foreground mt-1">{t.centers.manageDescription}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowAutoAssignDialog(true)} data-testid="button-auto-assign">
            <Wand2 className="w-4 h-4 me-2" />
            Auto-Assign Schools
          </Button>
          <Button onClick={openCreateDialog} data-testid="button-add-center">
            <Plus className="w-4 h-4 me-2" />
            {t.centers.addCenter}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">{t.centers.totalCenters}</p>
                <p className="text-2xl font-semibold">{(centers?.length || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">{t.centers.totalCapacity}</p>
                <p className="text-2xl font-semibold">{totalCapacity.toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-2/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">{t.centers.studentsAssigned}</p>
                <p className="text-2xl font-semibold">{totalAssigned.toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">{t.common.active}</p>
                <p className="text-2xl font-semibold">
                  {(centers?.filter(c => c.isActive).length || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-4/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-chart-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monitoring Dashboard Charts */}
      {monitoring && monitoring.length > 0 && (
        <MonitoringCharts monitoring={monitoring} centers={centers || []} />
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={t.centers.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? "pr-9" : "pl-9"}
                data-testid="input-search-centers"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={regionFilter} onValueChange={(value) => {
                setRegionFilter(value);
                setClusterFilter("all");
              }}>
                <SelectTrigger className="w-[160px]" data-testid="select-region-filter">
                  <SelectValue placeholder={t.schools.region} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.common.allRegions}</SelectItem>
                  {regions?.map((region) => (
                    <SelectItem key={region.id} value={region.id.toString()}>{region.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={clusterFilter} onValueChange={setClusterFilter} disabled={regionFilter === "all"}>
                <SelectTrigger className="w-[160px]" data-testid="select-cluster-filter">
                  <SelectValue placeholder={regionFilter === "all" ? t.common.selectRegionFirst : t.schools.cluster} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.common.allClusters}</SelectItem>
                  {clustersForFilter?.map((cluster) => (
                    <SelectItem key={cluster.id} value={cluster.id.toString()}>{cluster.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Centers Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <>
            <CenterCardSkeleton />
            <CenterCardSkeleton />
            <CenterCardSkeleton />
          </>
        ) : filteredCenters && filteredCenters.length > 0 ? (
          filteredCenters.map((center, index) => (
            <CenterCard
              key={center.id}
              center={center}
              monitoring={monitoringMap.get(center.id)}
              themeIndex={index}
              onEdit={() => openEditDialog(center)}
              onViewDetails={() => openViewDetails(center)}
              onDelete={() => openDeleteDialog(center)}
              isRTL={isRTL}
              t={t}
            />
          ))
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t.centers.noCentersFound}</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? t.centers.tryAdjustSearch : t.centers.addFirstCenter}
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 me-2" />
                  {t.centers.addCenter}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t.centers.addCenter}</DialogTitle>
            <DialogDescription>{t.centers.createNewCenter}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t.centers.centerName}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Brikama Center" data-testid="input-center-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.common.code}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. BRK-001" data-testid="input-center-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.centers.capacity}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={10} data-testid="input-center-capacity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="regionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.schools.region}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-center-region">
                            <SelectValue placeholder={t.common.selectRegion} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {regions?.map(r => (
                            <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clusterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.schools.cluster}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()} disabled={!numericRegionId}>
                        <FormControl>
                          <SelectTrigger data-testid="select-center-cluster">
                            <SelectValue placeholder={numericRegionId ? t.common.selectCluster : t.common.selectRegionFirst} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredClusters?.map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t.common.address}</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Physical address..." rows={2} data-testid="input-center-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.centers.contactPerson}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-center-contact-person" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.centers.contactPhone}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-center-contact-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t.centers.contactEmail || "Contact Email"}</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" data-testid="input-center-contact-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  {t.common.cancel}
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-center">
                  {createMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {t.centers.addCenter}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t.common.edit} {selectedCenter?.name}</DialogTitle>
            <DialogDescription>{t.centers.updateCenterDetails || "Update exam center information"}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t.centers.centerName}</FormLabel>
                      <FormControl><Input {...field} data-testid="input-edit-center-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.common.code}</FormLabel>
                      <FormControl><Input {...field} data-testid="input-edit-center-code" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.centers.capacity}</FormLabel>
                      <FormControl><Input {...field} type="number" min={10} data-testid="input-edit-center-capacity" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="regionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.schools.region}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-center-region">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {regions?.map(r => (
                            <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clusterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.schools.cluster}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-center-cluster">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredClusters?.length ? filteredClusters.map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                          )) : clusters?.map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t.common.address}</FormLabel>
                      <FormControl><Textarea {...field} rows={2} data-testid="input-edit-center-address" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.centers.contactPerson}</FormLabel>
                      <FormControl><Input {...field} data-testid="input-edit-contact-person" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.centers.contactPhone}</FormLabel>
                      <FormControl><Input {...field} data-testid="input-edit-contact-phone" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  {t.common.cancel}
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit-center">
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {t.common.save}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{selectedCenter?.name}</DialogTitle>
            <DialogDescription>{t.centers.viewDetails}</DialogDescription>
          </DialogHeader>
          {selectedCenter && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t.common.code}</p>
                  <p className="font-medium">{selectedCenter.code}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t.schools.region}</p>
                  <p className="font-medium">{selectedCenter.region?.name || t.centers.noRegion}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t.schools.cluster}</p>
                  <p className="font-medium">{selectedCenter.cluster?.name || t.centers.noCluster}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t.centers.capacity}</p>
                  <p className="font-medium">{selectedCenter.capacity?.toLocaleString(isRTL ? 'ar-EG' : 'en-US') || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t.common.status}</p>
                  <Badge variant={selectedCenter.isActive ? "default" : "secondary"}>
                    {selectedCenter.isActive ? t.common.active : t.common.inactive}
                  </Badge>
                </div>
              </div>

              {selectedCenter.address && (
                <div className="pt-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t.common.address}</p>
                  <p className="font-medium">{selectedCenter.address}</p>
                </div>
              )}

              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">{t.centers.contactInfo}</p>
                <div className="space-y-1.5">
                  {selectedCenter.contactPerson && (
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{selectedCenter.contactPerson}</span>
                    </div>
                  )}
                  {selectedCenter.contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{selectedCenter.contactPhone}</span>
                    </div>
                  )}
                  {selectedCenter.contactEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{selectedCenter.contactEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-3 grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-muted/50 rounded-md">
                  <p className="text-xl font-bold">{(selectedCenter.assignedSchoolsCount || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
                  <p className="text-xs text-muted-foreground">{t.centers.schoolsAssigned}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-md">
                  <p className="text-xl font-bold">{(selectedCenter.assignedStudentsCount || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
                  <p className="text-xs text-muted-foreground">{t.centers.studentsAssigned}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>{t.common.close}</Button>
            <Button onClick={() => {
              setShowDetailsDialog(false);
              if (selectedCenter) openEditDialog(selectedCenter);
            }}>
              <Edit className="w-4 h-4 me-2" />
              {t.common.edit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.centers.deleteCenter}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.centers.deleteConfirm.replace('this center', `"${selectedCenter?.name}"`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedCenter && deleteMutation.mutate(selectedCenter.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Auto-Assign Schools Dialog */}
      <AlertDialog open={showAutoAssignDialog} onOpenChange={setShowAutoAssignDialog}>
        <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>Auto-Assign Schools to Centers</AlertDialogTitle>
            <AlertDialogDescription>
              This will automatically assign eligible schools to examination centers based on:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Same cluster priority</li>
                <li>Same region as fallback</li>
                <li>Center capacity limits</li>
              </ul>
              <p className="mt-2 font-medium text-amber-600 dark:text-amber-400">Only schools with approved students and confirmed payment for the current exam year will be assigned.</p>
              <p className="mt-1 font-medium">Schools already assigned will not be affected.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => autoAssignMutation.mutate()} disabled={autoAssignMutation.isPending}>
              {autoAssignMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              <Wand2 className="w-4 h-4 me-2" />
              Run Auto-Assignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
