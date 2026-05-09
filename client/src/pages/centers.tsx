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
  Truck,
  ShieldAlert,
  PlayCircle,
  CircleDot,
  Upload,
  FileUp,
  XCircle,
  Download,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ExamCenter, Region, Cluster } from "@shared/schema";

const centerSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  code: z.string().min(2, "Code is required"),
  address: z.string().optional(),
  regionId: z.coerce.number().min(1, "Region is required"),
  clusterId: z.coerce.number().min(1, "Cluster is required"),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
});

type CenterFormData = z.infer<typeof centerSchema>;

type CsvStep = 'select' | 'preview' | 'uploading' | 'complete';

interface CsvPreviewRow {
  rowNum: number;
  name: string;
  code: string;
  regionCluster: string;
  regionName: string;
  clusterName: string;
  address: string;
  status: 'valid' | 'error' | 'duplicate';
  errorMsg?: string;
}

interface CsvPreviewResult {
  rows: CsvPreviewRow[];
  validCount: number;
  errorCount: number;
  duplicateCount: number;
}

interface CenterWithRelations extends ExamCenter {
  region?: { name: string };
  cluster?: { name: string };
  assignedSchoolsCount?: number;
  assignedStudentsCount?: number;
  hallCount?: number;
  hallTotalCapacity?: number;
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
  t,
  isAdmin,
}: {
  center: CenterWithRelations;
  monitoring?: CenterMonitoringData;
  themeIndex: number;
  onEdit: () => void;
  onViewDetails: () => void;
  onDelete: () => void;
  isRTL: boolean;
  t: any;
  isAdmin: boolean;
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
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-destructive" data-testid={`button-delete-center-${center.id}`}>
                    <Trash2 className="w-4 h-4 me-2" />
                    {t.common.delete}
                  </DropdownMenuItem>
                </>
              )}
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
        <div className="grid grid-cols-5 gap-1 pt-2 border-t border-black/5 dark:border-white/5">
          <div className="text-center">
            <p className={`text-base font-semibold ${theme.accent}`}>
              {(center.hallTotalCapacity || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight">{t.centers.capacity}</p>
          </div>
          <div className="text-center">
            <p className={`text-base font-semibold ${theme.accent}`}>{(center.hallCount || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Halls</p>
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


export default function Centers() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [clusterFilter, setClusterFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAutoAssignDialog, setShowAutoAssignDialog] = useState(false);
  const [showCsvUploadDialog, setShowCsvUploadDialog] = useState(false);
  const [csvStep, setCsvStep] = useState<CsvStep>('select');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<CsvPreviewResult | null>(null);
  const [csvProgress, setCsvProgress] = useState(0);
  const [csvProgressLabel, setCsvProgressLabel] = useState('Uploading...');
  const [csvFinalResult, setCsvFinalResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<CenterWithRelations | null>(null);

  // Redirect school admins immediately to their dedicated center info page
  useEffect(() => {
    if (user?.role === "school_admin") {
      navigate("/center-info");
    }
  }, [user?.role]);

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
      const parts: string[] = [];
      if (data.selfAssigned > 0) parts.push(`${data.selfAssigned} self-assigned (school-as-center)`);
      if (data.assigned - (data.selfAssigned ?? 0) > 0) parts.push(`${data.assigned - (data.selfAssigned ?? 0)} assigned by region/cluster`);
      if (data.hallsGenerated > 0) parts.push(`${data.hallsGenerated} halls auto-generated`);
      if (data.skipped > 0) parts.push(`${data.skipped} skipped (no matching region/cluster)`);
      toast({
        title: `${data.assigned} Schools Assigned`,
        description: parts.join(' · ') || "Auto-assignment complete.",
      });
    },
    onError: () => {
      toast({ title: t.common.error, description: "Failed to auto-assign schools", variant: "destructive" });
    },
  });

  const closeCsvDialog = (open: boolean) => {
    setShowCsvUploadDialog(open);
    if (!open) {
      setTimeout(() => {
        setCsvStep('select');
        setCsvFile(null);
        setCsvPreviewData(null);
        setCsvProgress(0);
        setCsvProgressLabel('Uploading...');
        setCsvFinalResult(null);
      }, 200);
    }
  };

  const downloadErrorList = () => {
    if (!csvPreviewData) return;
    const problematic = csvPreviewData.rows.filter(r => r.status !== 'valid');
    const lines = [
      'Row,Name,Code,Region_Cluster,Region,Cluster,Status,Issue',
      ...problematic.map(r => `${r.rowNum},"${r.name}","${r.code}","${r.regionCluster}","${r.regionName}","${r.clusterName}","${r.status}","${r.errorMsg || ''}"`)
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'center-import-issues.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const csvPreviewMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/centers/preview-csv", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Preview failed" }));
        throw new Error(err.message || "Preview failed");
      }
      return res.json() as Promise<CsvPreviewResult>;
    },
    onSuccess: (data) => {
      setCsvPreviewData(data);
      setCsvStep('preview');
    },
    onError: (error: any) => {
      toast({ title: "Preview Failed", description: error.message || "Could not analyze CSV", variant: "destructive" });
    },
  });

  const handleCsvConfirm = async () => {
    if (!csvFile) return;
    setCsvStep('uploading');
    setCsvProgress(0);
    setCsvProgressLabel('Uploading file...');
    try {
      const result = await new Promise<{ created: number; skipped: number; errors: string[] }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append("file", csvFile);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setCsvProgress(Math.round((e.loaded / e.total) * 40));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setCsvProgress(55);
            setCsvProgressLabel('Mapping regions and clusters...');
            setTimeout(() => {
              setCsvProgress(75);
              setCsvProgressLabel('Creating examination centers...');
              setTimeout(() => {
                setCsvProgress(95);
                setCsvProgressLabel('Finalizing records...');
                setTimeout(() => {
                  setCsvProgress(100);
                  try { resolve(JSON.parse(xhr.responseText)); }
                  catch { reject(new Error("Invalid server response")); }
                }, 350);
              }, 500);
            }, 500);
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.message || "Upload failed"));
            } catch { reject(new Error(`Server error (${xhr.status})`)); }
          }
        };
        xhr.onerror = () => reject(new Error("Network error — check your connection and try again"));
        xhr.open("POST", "/api/centers/bulk-upload-csv");
        xhr.withCredentials = true;
        xhr.send(formData);
      });
      setTimeout(() => {
        setCsvFinalResult(result);
        setCsvStep('complete');
        invalidateCenterQueries();
      }, 400);
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
      setCsvStep('preview');
    }
  };

  const openCreateDialog = () => {
    form.reset({ name: "", code: "", address: "", regionId: 0, clusterId: 0, contactPerson: "", contactPhone: "", contactEmail: "" });
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

  const totalCapacity = centers?.reduce((sum, c) => sum + (c.hallTotalCapacity || 0), 0) || 0;
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
          <Button variant="outline" onClick={() => { setCsvStep('select'); setCsvPreviewData(null); setCsvFile(null); setCsvFinalResult(null); setShowCsvUploadDialog(true); }} data-testid="button-csv-upload-centers">
            <Upload className="w-4 h-4 me-2" />
            Import CSV
          </Button>
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
              isAdmin={['super_admin', 'examination_admin'].includes(user?.role || '')}
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
                  <p className="font-medium">
                    {(selectedCenter.hallTotalCapacity || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedCenter.hallCount
                      ? `from ${selectedCenter.hallCount} hall${selectedCenter.hallCount !== 1 ? "s" : ""} × 40 students`
                      : "Add halls to set capacity"}
                  </p>
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
            <AlertDialogDescription asChild>
              <div>
                <p>Automatically assigns eligible schools to examination centers using the following priority rules:</p>
                <ol className="list-decimal list-inside mt-2 space-y-1.5 text-sm">
                  <li><span className="font-medium">Self-assignment</span> — if the school is registered as an examination center, it is assigned to itself.</li>
                  <li><span className="font-medium">Same Region + Same Cluster</span> — the school is assigned to a center in its own cluster.</li>
                  <li><span className="font-medium">Same Region only</span> — fallback when all cluster centers are at capacity.</li>
                </ol>
                <p className="mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                  Schools with no center in their region are skipped — there is no cross-region assignment.
                </p>
                <p className="mt-2 text-sm font-medium">
                  After assignment, halls are auto-generated for each center at 40 students per hall.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Only schools with approved students and confirmed payment will be assigned. Already-assigned schools are not affected.</p>
              </div>
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

      {/* CSV Bulk Upload Dialog */}
      <Dialog open={showCsvUploadDialog} onOpenChange={closeCsvDialog}>
        <DialogContent className="max-w-3xl" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5 text-primary" />
              Import Examination Centers from CSV
            </DialogTitle>
            <DialogDescription>
              {csvStep === 'select' && "Upload a CSV file to bulk-create examination centers. A preview will be shown before any data is saved."}
              {csvStep === 'preview' && `Review all ${csvPreviewData?.rows.length ?? 0} detected records before confirming the import.`}
              {csvStep === 'uploading' && "Please wait while your centers are being imported..."}
              {csvStep === 'complete' && "Import complete. Review the results below."}
            </DialogDescription>
          </DialogHeader>

          {/* ── Step 1: File Select ── */}
          {csvStep === 'select' && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/60 p-3 text-xs font-mono space-y-1">
                <p className="font-semibold text-foreground text-[11px] uppercase tracking-wide mb-1.5">Required CSV columns</p>
                <p><span className="text-primary">name</span> — center name (required)</p>
                <p><span className="text-primary">region</span> or <span className="text-primary">region_id</span> or <span className="text-primary">region_cluster</span> — one of these is required</p>
                <p>cluster or cluster_id — optional (defaults to first cluster in region)</p>
                <p>code, address, contact_person, contact_phone, contact_email — optional</p>
                <p className="mt-2 text-muted-foreground font-semibold">Accepted formats:</p>
                <p className="text-foreground">By name: <span className="text-primary">region</span>=Basse, <span className="text-primary">cluster</span>=Cluster 1</p>
                <p className="text-foreground">By ID: <span className="text-primary">region_id</span>=2, <span className="text-primary">cluster_id</span>=3</p>
                <p className="text-foreground">Dot-notation: <span className="text-primary">region_cluster</span>=1.1 (region index.cluster index)</p>
              </div>
              <div
                className="border-2 border-dashed border-border rounded-md p-8 text-center cursor-pointer hover-elevate"
                onClick={() => document.getElementById('center-csv-input')?.click()}
                data-testid="dropzone-center-csv"
              >
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                {csvFile ? (
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{csvFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(csvFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium">Click to select a CSV file</p>
                    <p className="text-xs text-muted-foreground mt-1">Maximum 5 MB</p>
                  </>
                )}
                <input
                  id="center-csv-input"
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                  data-testid="input-center-csv"
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Preview Table ── */}
          {csvStep === 'preview' && csvPreviewData && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 text-center">
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{csvPreviewData.validCount}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">Ready to Import</p>
                </div>
                <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-center">
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{csvPreviewData.duplicateCount}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Duplicates (will skip)</p>
                </div>
                <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 text-center">
                  <p className="text-xl font-bold text-red-700 dark:text-red-400">{csvPreviewData.errorCount}</p>
                  <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">Errors (will skip)</p>
                </div>
              </div>
              <div className="rounded-md border overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Center Name</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Cluster</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead className="w-28">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvPreviewData.rows.map((row) => (
                        <TableRow
                          key={row.rowNum}
                          className={
                            row.status === 'error'
                              ? 'bg-red-50/50 dark:bg-red-950/10'
                              : row.status === 'duplicate'
                              ? 'bg-amber-50/50 dark:bg-amber-950/10'
                              : ''
                          }
                        >
                          <TableCell className="text-xs text-muted-foreground">{row.rowNum}</TableCell>
                          <TableCell className="font-medium text-sm">{row.name || <span className="text-muted-foreground italic">blank</span>}</TableCell>
                          <TableCell className="text-sm">{row.regionName}</TableCell>
                          <TableCell className="text-sm">{row.clusterName}</TableCell>
                          <TableCell className="text-xs font-mono">{row.code || <span className="text-muted-foreground">auto</span>}</TableCell>
                          <TableCell>
                            {row.status === 'valid' && (
                              <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">Valid</Badge>
                            )}
                            {row.status === 'duplicate' && (
                              <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0">Duplicate</Badge>
                            )}
                            {row.status === 'error' && (
                              <div>
                                <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0">Error</Badge>
                                {row.errorMsg && <p className="text-[10px] text-destructive mt-0.5 leading-tight">{row.errorMsg}</p>}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Upload Progress ── */}
          {csvStep === 'uploading' && (
            <div className="py-6 space-y-6">
              <div className="text-center space-y-2">
                <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                <p className="text-sm font-medium">{csvProgressLabel}</p>
                <p className="text-xs text-muted-foreground">{csvFile?.name}</p>
              </div>
              <div className="space-y-2">
                <Progress value={csvProgress} className="h-3" />
                <p className="text-xs text-center text-muted-foreground tabular-nums">{csvProgress}%</p>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Validating CSV structure', threshold: 20 },
                  { label: 'Mapping regions and clusters', threshold: 55 },
                  { label: 'Creating examination centers', threshold: 75 },
                  { label: 'Finalizing records', threshold: 95 },
                ].map(({ label, threshold }) => {
                  const done = csvProgress >= threshold + 15;
                  const active = csvProgress >= threshold && !done;
                  return (
                    <div key={label} className={`flex items-center gap-2 text-xs transition-colors ${done ? 'text-emerald-600 dark:text-emerald-400' : active ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {done
                        ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        : active
                        ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                        : <div className="w-3.5 h-3.5 rounded-full border border-current opacity-30 shrink-0" />
                      }
                      {label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 4: Complete ── */}
          {csvStep === 'complete' && csvFinalResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-semibold">Import Complete</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{csvFinalResult.created}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">Centers Created</p>
                </div>
                <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 text-center">
                  <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">{csvFinalResult.skipped}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Skipped</p>
                </div>
              </div>
              {csvFinalResult.errors.length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-destructive mb-1.5 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> {csvFinalResult.errors.length} Issue{csvFinalResult.errors.length > 1 ? 's' : ''}
                  </p>
                  {csvFinalResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2">
            {/* Download issues button — only in preview step when there are problems */}
            {csvStep === 'preview' && (csvPreviewData?.errorCount ?? 0) + (csvPreviewData?.duplicateCount ?? 0) > 0 && (
              <Button variant="outline" size="sm" onClick={downloadErrorList} className="me-auto" data-testid="button-download-issue-list">
                <Download className="w-4 h-4 me-2" />
                Download Issue List
              </Button>
            )}

            {csvStep !== 'uploading' && (
              <Button variant="outline" onClick={() => closeCsvDialog(false)}>
                {csvStep === 'complete' ? 'Close' : t.common.cancel}
              </Button>
            )}

            {csvStep === 'select' && (
              <Button
                onClick={() => csvFile && csvPreviewMutation.mutate(csvFile)}
                disabled={!csvFile || csvPreviewMutation.isPending}
                data-testid="button-preview-center-csv"
              >
                {csvPreviewMutation.isPending
                  ? <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  : <Eye className="w-4 h-4 me-2" />}
                {csvPreviewMutation.isPending ? 'Analyzing...' : 'Preview Import'}
              </Button>
            )}

            {csvStep === 'preview' && (
              <>
                <Button variant="outline" onClick={() => { setCsvStep('select'); setCsvPreviewData(null); }}>
                  Back
                </Button>
                <Button
                  onClick={handleCsvConfirm}
                  disabled={(csvPreviewData?.validCount ?? 0) === 0}
                  data-testid="button-submit-center-csv"
                >
                  <Upload className="w-4 h-4 me-2" />
                  Confirm Import ({csvPreviewData?.validCount} centers)
                </Button>
              </>
            )}

            {csvStep === 'complete' && (csvFinalResult?.created ?? 0) > 0 && (
              <Button onClick={() => { setCsvStep('select'); setCsvPreviewData(null); setCsvFile(null); setCsvFinalResult(null); }}>
                <Upload className="w-4 h-4 me-2" />
                Import Another File
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
