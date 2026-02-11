import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Search, Plus, Package, MapPin, ArrowRight, ArrowLeft,
  Clock, CheckCircle, AlertTriangle, Truck, Building2,
  Eye, BarChart3, RefreshCw, Send, ArrowDownRight, ArrowUpRight,
  Download, Upload, WifiOff, Wifi,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ExamPacket, ExamYear, Subject, ExamCenter, Region, Cluster, StaffProfile } from "@shared/schema";

const packetFormSchema = z.object({
  examYearId: z.coerce.number().min(1, "Exam year required"),
  subjectId: z.coerce.number().min(1, "Subject required"),
  grade: z.coerce.number().min(1).max(12),
  destinationCenterId: z.coerce.number().min(1, "Center required"),
  destinationRegionId: z.coerce.number().optional().nullable(),
  destinationClusterId: z.coerce.number().optional().nullable(),
  paperCount: z.coerce.number().min(0).default(0),
  securitySealNumber: z.string().optional(),
  notes: z.string().optional(),
});

type PacketFormData = z.infer<typeof packetFormSchema>;

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Package }> = {
  created: { label: "Created", variant: "secondary", icon: Package },
  packed: { label: "Packed", variant: "secondary", icon: Package },
  dispatched_to_region: { label: "To Region", variant: "default", icon: Truck },
  at_region: { label: "At Region", variant: "default", icon: Building2 },
  dispatched_to_cluster: { label: "To Cluster", variant: "default", icon: Truck },
  at_cluster: { label: "At Cluster", variant: "default", icon: Building2 },
  dispatched_to_center: { label: "To Center", variant: "default", icon: Truck },
  at_center: { label: "At Center", variant: "default", icon: Building2 },
  opened: { label: "Opened", variant: "outline", icon: Package },
  administered: { label: "Administered", variant: "outline", icon: CheckCircle },
  collected: { label: "Collected", variant: "default", icon: ArrowUpRight },
  returned_to_cluster: { label: "Ret. Cluster", variant: "default", icon: ArrowLeft },
  returned_to_region: { label: "Ret. Region", variant: "default", icon: ArrowLeft },
  returned_to_hq: { label: "Ret. HQ", variant: "default", icon: ArrowLeft },
  completed: { label: "Completed", variant: "default", icon: CheckCircle },
  missing: { label: "Missing", variant: "destructive", icon: AlertTriangle },
  damaged: { label: "Damaged", variant: "destructive", icon: AlertTriangle },
};

const locationLabels: Record<string, string> = {
  hq: "HQ",
  region: "Region",
  cluster: "Cluster",
  center: "Center",
};

const LOCATION_HIERARCHY = ["hq", "region", "cluster", "center"];

const OFFLINE_QUEUE_KEY = "offlineHandoverQueue";

interface OfflineHandoverEvent {
  packetId: number;
  clientEventId: string;
  clientTimestamp: string;
  senderStaffId: number | null;
  receiverStaffId: number | null;
  direction: "forward" | "return";
  fromLocationType: string;
  toLocationType: string;
  fromRegionId: number | null;
  fromClusterId: number | null;
  fromCenterId: number | null;
  toRegionId: number | null;
  toClusterId: number | null;
  toCenterId: number | null;
  statusAtHandover: string;
  notes: string;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  handoverTime: string;
}

function getOfflineQueue(): OfflineHandoverEvent[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: OfflineHandoverEvent[]) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

function getLocationLevel(locType: string): number {
  return LOCATION_HIERARCHY.indexOf(locType);
}

function determineDirection(fromLocationType: string, toLocationType: string): "forward" | "return" {
  const fromLevel = getLocationLevel(fromLocationType);
  const toLevel = getLocationLevel(toLocationType);
  if (toLevel > fromLevel) return "forward";
  if (toLevel < fromLevel) return "return";
  return "forward";
}

function determineReceiveStatus(toLocationType: string, direction: "forward" | "return"): string {
  if (direction === "forward") {
    if (toLocationType === "region") return "at_region";
    if (toLocationType === "cluster") return "at_cluster";
    if (toLocationType === "center") return "at_center";
    if (toLocationType === "hq") return "at_hq";
  } else {
    if (toLocationType === "cluster") return "returned_to_cluster";
    if (toLocationType === "region") return "returned_to_region";
    if (toLocationType === "hq") return "returned_to_hq";
  }
  return "at_region";
}

function determineDispatchStatus(toLocationType: string, direction: "forward" | "return"): string {
  if (direction === "forward") {
    if (toLocationType === "region") return "dispatched_to_region";
    if (toLocationType === "cluster") return "dispatched_to_cluster";
    if (toLocationType === "center") return "dispatched_to_center";
  } else {
    return "collected";
  }
  return "dispatched_to_region";
}

function isLocationSelectionValid(locationType: string, regionId: number | null, clusterId: number | null, centerId: number | null): boolean {
  if (locationType === "hq") return true;
  if (locationType === "region") return regionId !== null;
  if (locationType === "cluster") return regionId !== null && clusterId !== null;
  if (locationType === "center") return regionId !== null && clusterId !== null && centerId !== null;
  return false;
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, variant: "secondary" as const, icon: Package };
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} data-testid={`badge-status-${status}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}

function DashboardStats({ stats }: { stats: any }) {
  if (!stats) return null;
  const forward = (stats.statusCounts?.dispatched_to_region || 0) + (stats.statusCounts?.dispatched_to_cluster || 0) + (stats.statusCounts?.dispatched_to_center || 0);
  const atLocation = (stats.statusCounts?.at_region || 0) + (stats.statusCounts?.at_cluster || 0) + (stats.statusCounts?.at_center || 0);
  const returning = (stats.statusCounts?.collected || 0) + (stats.statusCounts?.returned_to_cluster || 0) + (stats.statusCounts?.returned_to_region || 0);
  const completed = (stats.statusCounts?.returned_to_hq || 0) + (stats.statusCounts?.completed || 0);
  const issues = (stats.statusCounts?.missing || 0) + (stats.statusCounts?.damaged || 0);

  const cards = [
    { label: "Total Packets", value: stats.total, icon: Package, color: "text-foreground" },
    { label: "In Transit", value: forward, icon: Truck, color: "text-chart-1" },
    { label: "At Location", value: atLocation, icon: Building2, color: "text-chart-2" },
    { label: "Returning", value: returning, icon: ArrowLeft, color: "text-chart-4" },
    { label: "Completed", value: completed, icon: CheckCircle, color: "text-chart-2" },
    { label: "Issues", value: issues, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <c.icon className={`w-4 h-4 ${c.color}`} />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <p className={`text-2xl font-bold ${c.color}`} data-testid={`stat-${c.label.toLowerCase().replace(/\s/g, '-')}`}>{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LogisticsChainVisualization({ packet, handoverLogs }: { packet: ExamPacket; handoverLogs: any[] }) {
  const stages = ["hq", "region", "cluster", "center"];
  const stageLabels = ["HQ", "Region", "Cluster", "Center"];
  const currentLevel = getLocationLevel(packet.currentLocationType);

  const forwardCompleted = new Set<string>();
  const returnCompleted = new Set<string>();

  if (Array.isArray(handoverLogs)) {
    handoverLogs.forEach((log: any) => {
      if (log.direction === "forward") {
        forwardCompleted.add(log.toLocationType);
      } else {
        returnCompleted.add(log.toLocationType);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Logistics Chain</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative py-4">
          <div className="flex items-center justify-between gap-2" data-testid="logistics-chain">
            {stages.map((stage, i) => {
              const isCurrent = i === currentLevel;
              const isForwardDone = forwardCompleted.has(stage);
              const isReturnDone = returnCompleted.has(stage);
              return (
                <div key={stage} className="flex flex-col items-center flex-1 relative">
                  {i < stages.length - 1 && (
                    <div className="absolute top-5 left-1/2 w-full h-0.5 bg-border z-0" />
                  )}
                  <div className="relative z-10 flex flex-col items-center">
                    {isForwardDone && (
                      <span className="text-[10px] text-chart-1 mb-1">FWD</span>
                    )}
                    {!isForwardDone && <span className="text-[10px] text-transparent mb-1">-</span>}
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                        isCurrent
                          ? "bg-primary border-primary text-primary-foreground"
                          : i <= currentLevel
                          ? "bg-primary/20 border-primary/50 text-primary"
                          : "bg-muted border-border text-muted-foreground"
                      }`}
                      data-testid={`chain-node-${stage}`}
                    >
                      {i + 1}
                    </div>
                    {isReturnDone && (
                      <span className="text-[10px] text-chart-4 mt-1">RET</span>
                    )}
                    {!isReturnDone && <span className="text-[10px] text-transparent mt-1">-</span>}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">{stageLabels[i]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function useGeoLocation() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords(null)
      );
    }
  }, []);

  return coords;
}

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

function LocationDropdowns({
  locationType,
  regionId,
  clusterId,
  centerId,
  onRegionChange,
  onClusterChange,
  onCenterChange,
  regions,
  clusters,
  centers,
  prefix,
}: {
  locationType: string;
  regionId: number | null;
  clusterId: number | null;
  centerId: number | null;
  onRegionChange: (v: number | null) => void;
  onClusterChange: (v: number | null) => void;
  onCenterChange: (v: number | null) => void;
  regions: Region[];
  clusters: Cluster[];
  centers: ExamCenter[];
  prefix: string;
}) {
  const filteredClusters = regionId ? clusters.filter((c: Cluster) => c.regionId === regionId) : clusters;
  const filteredCenters = clusterId ? centers.filter((c: ExamCenter) => c.clusterId === clusterId) : (regionId ? centers.filter((c: ExamCenter) => c.regionId === regionId) : centers);

  if (locationType === "hq") return null;

  return (
    <div className="space-y-3">
      {(locationType === "region" || locationType === "cluster" || locationType === "center") && (
        <div>
          <label className="text-sm font-medium">Region</label>
          <Select
            value={regionId?.toString() || ""}
            onValueChange={(v) => { onRegionChange(v ? parseInt(v) : null); onClusterChange(null); onCenterChange(null); }}
          >
            <SelectTrigger data-testid={`select-${prefix}-region`}><SelectValue placeholder="Select region" /></SelectTrigger>
            <SelectContent>
              {regions.map((r: Region) => (
                <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {(locationType === "cluster" || locationType === "center") && (
        <div>
          <label className="text-sm font-medium">Cluster</label>
          <Select
            value={clusterId?.toString() || ""}
            onValueChange={(v) => { onClusterChange(v ? parseInt(v) : null); onCenterChange(null); }}
          >
            <SelectTrigger data-testid={`select-${prefix}-cluster`}><SelectValue placeholder="Select cluster" /></SelectTrigger>
            <SelectContent>
              {filteredClusters.map((c: Cluster) => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {locationType === "center" && (
        <div>
          <label className="text-sm font-medium">Center</label>
          <Select
            value={centerId?.toString() || ""}
            onValueChange={(v) => onCenterChange(v ? parseInt(v) : null)}
          >
            <SelectTrigger data-testid={`select-${prefix}-center`}><SelectValue placeholder="Select center" /></SelectTrigger>
            <SelectContent>
              {filteredCenters.map((c: ExamCenter) => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

function OfflineBanner({ queueCount, onSync, isSyncing }: { queueCount: number; onSync: () => void; isSyncing: boolean }) {
  if (queueCount === 0) return null;
  return (
    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3 flex items-center justify-between gap-2 flex-wrap" data-testid="offline-banner">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm text-amber-800 dark:text-amber-200">{queueCount} event{queueCount !== 1 ? "s" : ""} pending sync</span>
      </div>
      <Button size="sm" onClick={onSync} disabled={isSyncing} data-testid="button-sync-now">
        <RefreshCw className={`w-4 h-4 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
        {isSyncing ? "Syncing..." : "Sync Now"}
      </Button>
    </div>
  );
}

export default function PacketTrackingPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPacket, setSelectedPacket] = useState<ExamPacket | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterExamYear, setFilterExamYear] = useState<string>("all");
  const [filterGrade, setFilterGrade] = useState<string>("all");

  const [receiveBarcode, setReceiveBarcode] = useState("");
  const [receivePacket, setReceivePacket] = useState<ExamPacket | null>(null);
  const [receiveLocationType, setReceiveLocationType] = useState("region");
  const [receiveRegionId, setReceiveRegionId] = useState<number | null>(null);
  const [receiveClusterId, setReceiveClusterId] = useState<number | null>(null);
  const [receiveCenterId, setReceiveCenterId] = useState<number | null>(null);
  const [receiveSenderId, setReceiveSenderId] = useState<number | null>(null);
  const [receiveReceiverId, setReceiveReceiverId] = useState<number | null>(null);
  const [receiveNotes, setReceiveNotes] = useState("");
  const [receiveLookupLoading, setReceiveLookupLoading] = useState(false);

  const [dispatchBarcode, setDispatchBarcode] = useState("");
  const [dispatchPacket, setDispatchPacket] = useState<ExamPacket | null>(null);
  const [dispatchLocationType, setDispatchLocationType] = useState("region");
  const [dispatchRegionId, setDispatchRegionId] = useState<number | null>(null);
  const [dispatchClusterId, setDispatchClusterId] = useState<number | null>(null);
  const [dispatchCenterId, setDispatchCenterId] = useState<number | null>(null);
  const [dispatchSenderId, setDispatchSenderId] = useState<number | null>(null);
  const [dispatchReceiverId, setDispatchReceiverId] = useState<number | null>(null);
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [dispatchLookupLoading, setDispatchLookupLoading] = useState(false);

  const [offlineQueue, setOfflineQueue] = useState<OfflineHandoverEvent[]>(getOfflineQueue());
  const [isSyncing, setIsSyncing] = useState(false);

  const isOnline = useOnlineStatus();
  const gps = useGeoLocation();

  useEffect(() => {
    setOfflineQueue(getOfflineQueue());
  }, [isOnline]);

  const { data: packets = [], isLoading: packetsLoading } = useQuery<ExamPacket[]>({
    queryKey: ["/api/exam-packets"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/exam-packets/dashboard/stats"],
  });

  const { data: examYears = [] } = useQuery<ExamYear[]>({
    queryKey: ["/api/exam-years"],
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const { data: centers = [] } = useQuery<ExamCenter[]>({
    queryKey: ["/api/exam-centers"],
  });

  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: clusters = [] } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
  });

  const { data: staffProfiles = [] } = useQuery<StaffProfile[]>({
    queryKey: ["/api/staff-profiles"],
  });

  const { data: handoverLogs = [] } = useQuery({
    queryKey: ["/api/exam-packets", selectedPacket?.id, "handovers"],
    queryFn: () => selectedPacket ? apiRequest("GET", `/api/exam-packets/${selectedPacket.id}/handovers`).then(r => r.json()) : [],
    enabled: !!selectedPacket && showDetailView,
  });

  const createForm = useForm<PacketFormData>({
    resolver: zodResolver(packetFormSchema),
    defaultValues: {
      examYearId: 0,
      subjectId: 0,
      grade: 6,
      destinationCenterId: 0,
      paperCount: 0,
      securitySealNumber: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PacketFormData) => {
      const res = await apiRequest("POST", "/api/exam-packets", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Packet created", description: "Exam packet created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets/dashboard/stats"] });
      setShowCreateDialog(false);
      createForm.reset();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const statusUpdateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/exam-packets/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets/dashboard/stats"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filteredPackets = packets.filter((p: ExamPacket) => {
    if (searchTerm && !p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterExamYear !== "all" && p.examYearId !== parseInt(filterExamYear)) return false;
    if (filterGrade !== "all" && p.grade !== parseInt(filterGrade)) return false;
    return true;
  });

  const getExamYearLabel = (id: number) => examYears.find((y: ExamYear) => y.id === id)?.year || id;
  const getSubjectLabel = (id: number) => subjects.find((s: Subject) => s.id === id)?.name || id;
  const getCenterLabel = (id: number | null) => {
    if (!id) return "--";
    return centers.find((c: ExamCenter) => c.id === id)?.name || `Center ${id}`;
  };
  const getRegionLabel = (id: number | null) => {
    if (!id) return "--";
    return regions.find((r: Region) => r.id === id)?.name || `Region ${id}`;
  };
  const getClusterLabel = (id: number | null) => {
    if (!id) return "--";
    return clusters.find((c: Cluster) => c.id === id)?.name || `Cluster ${id}`;
  };
  const getStaffLabel = (id: number | null) => {
    if (!id) return "--";
    const s = staffProfiles.find((sp: StaffProfile) => sp.id === id);
    return s ? `${s.firstName} ${s.lastName}` : `Staff ${id}`;
  };

  const lookupBarcode = useCallback(async (barcode: string): Promise<ExamPacket | null> => {
    if (!barcode.trim()) return null;
    try {
      const res = await apiRequest("GET", `/api/exam-packets/barcode/${encodeURIComponent(barcode.trim())}`);
      return await res.json();
    } catch {
      toast({ title: "Not found", description: `No packet found with barcode "${barcode}"`, variant: "destructive" });
      return null;
    }
  }, [toast]);

  const handleReceiveLookup = async () => {
    setReceiveLookupLoading(true);
    const pkt = await lookupBarcode(receiveBarcode);
    setReceivePacket(pkt);
    setReceiveLookupLoading(false);
  };

  const handleDispatchLookup = async () => {
    setDispatchLookupLoading(true);
    const pkt = await lookupBarcode(dispatchBarcode);
    setDispatchPacket(pkt);
    setDispatchLookupLoading(false);
  };

  const buildHandoverPayload = (
    packet: ExamPacket,
    mode: "receive" | "dispatch",
    locationType: string,
    regionId: number | null,
    clusterId: number | null,
    centerId: number | null,
    senderId: number | null,
    receiverId: number | null,
    notes: string
  ): OfflineHandoverEvent => {
    const direction = determineDirection(packet.currentLocationType, locationType);
    const statusAtHandover = mode === "receive"
      ? determineReceiveStatus(locationType, direction)
      : determineDispatchStatus(locationType, direction);

    const now = new Date().toISOString();
    return {
      packetId: packet.id,
      clientEventId: crypto.randomUUID(),
      clientTimestamp: now,
      handoverTime: now,
      senderStaffId: senderId,
      receiverStaffId: receiverId,
      direction,
      fromLocationType: packet.currentLocationType,
      toLocationType: locationType,
      fromRegionId: packet.currentRegionId ?? null,
      fromClusterId: packet.currentClusterId ?? null,
      fromCenterId: packet.currentCenterId ?? null,
      toRegionId: regionId,
      toClusterId: clusterId,
      toCenterId: centerId,
      statusAtHandover,
      notes,
      gpsLatitude: gps?.lat ?? null,
      gpsLongitude: gps?.lng ?? null,
    };
  };

  const submitHandover = async (payload: OfflineHandoverEvent) => {
    if (!isOnline) {
      const queue = getOfflineQueue();
      queue.push(payload);
      saveOfflineQueue(queue);
      setOfflineQueue(queue);
      toast({ title: "Saved offline", description: "Event queued for sync when back online" });
      return true;
    }

    try {
      const { packetId, ...rest } = payload;
      await apiRequest("POST", `/api/exam-packets/${packetId}/handover`, rest);
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets/dashboard/stats"] });
      toast({ title: "Handover recorded", description: "Chain of custody updated" });
      return true;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      return false;
    }
  };

  const receiveLocationValid = isLocationSelectionValid(receiveLocationType, receiveRegionId, receiveClusterId, receiveCenterId);
  const dispatchLocationValid = isLocationSelectionValid(dispatchLocationType, dispatchRegionId, dispatchClusterId, dispatchCenterId);

  const handleReceiveSubmit = async () => {
    if (!receivePacket) return;
    if (!receiveLocationValid) {
      toast({ title: "Missing location", description: "Please select all required location fields", variant: "destructive" });
      return;
    }
    const payload = buildHandoverPayload(
      receivePacket, "receive", receiveLocationType,
      receiveRegionId, receiveClusterId, receiveCenterId,
      receiveSenderId, receiveReceiverId, receiveNotes
    );
    const ok = await submitHandover(payload);
    if (ok) {
      setReceivePacket(null);
      setReceiveBarcode("");
      setReceiveNotes("");
      setReceiveSenderId(null);
      setReceiveReceiverId(null);
      setReceiveRegionId(null);
      setReceiveClusterId(null);
      setReceiveCenterId(null);
    }
  };

  const handleDispatchSubmit = async () => {
    if (!dispatchPacket) return;
    if (!dispatchLocationValid) {
      toast({ title: "Missing location", description: "Please select all required location fields", variant: "destructive" });
      return;
    }
    const payload = buildHandoverPayload(
      dispatchPacket, "dispatch", dispatchLocationType,
      dispatchRegionId, dispatchClusterId, dispatchCenterId,
      dispatchSenderId, dispatchReceiverId, dispatchNotes
    );
    const ok = await submitHandover(payload);
    if (ok) {
      setDispatchPacket(null);
      setDispatchBarcode("");
      setDispatchNotes("");
      setDispatchSenderId(null);
      setDispatchReceiverId(null);
      setDispatchRegionId(null);
      setDispatchClusterId(null);
      setDispatchCenterId(null);
    }
  };

  const handleSync = async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;
    setIsSyncing(true);
    try {
      await apiRequest("POST", "/api/exam-packets/sync-handovers", { handovers: queue });
      saveOfflineQueue([]);
      setOfflineQueue([]);
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets/dashboard/stats"] });
      toast({ title: "Sync complete", description: `${queue.length} event(s) synced successfully` });
    } catch {
      let syncedCount = 0;
      const remaining: OfflineHandoverEvent[] = [];
      for (const event of queue) {
        try {
          const { packetId, ...rest } = event;
          await apiRequest("POST", `/api/exam-packets/${packetId}/handover`, rest);
          syncedCount++;
        } catch {
          remaining.push(event);
        }
      }
      saveOfflineQueue(remaining);
      setOfflineQueue(remaining);
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets/dashboard/stats"] });
      if (remaining.length === 0) {
        toast({ title: "Sync complete", description: `${syncedCount} event(s) synced successfully` });
      } else if (syncedCount > 0) {
        toast({ title: "Partial sync", description: `${syncedCount} synced, ${remaining.length} failed and remain in queue`, variant: "destructive" });
      } else {
        toast({ title: "Sync failed", description: `All ${remaining.length} events failed to sync`, variant: "destructive" });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handoverMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedPacket) throw new Error("No packet selected");
      const res = await apiRequest("POST", `/api/exam-packets/${selectedPacket.id}/handover`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Handover recorded", description: "Chain of custody updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets", selectedPacket?.id, "handovers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets/dashboard/stats"] });
      setShowHandoverDialog(false);
      handoverForm.reset();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [showHandoverDialog, setShowHandoverDialog] = useState(false);

  const handoverFormSchema = z.object({
    senderStaffId: z.coerce.number().optional().nullable(),
    receiverStaffId: z.coerce.number().optional().nullable(),
    direction: z.enum(["forward", "return"]),
    fromLocationType: z.enum(["hq", "region", "cluster", "center"]),
    toLocationType: z.enum(["hq", "region", "cluster", "center"]),
    fromRegionId: z.coerce.number().optional().nullable(),
    fromClusterId: z.coerce.number().optional().nullable(),
    fromCenterId: z.coerce.number().optional().nullable(),
    toRegionId: z.coerce.number().optional().nullable(),
    toClusterId: z.coerce.number().optional().nullable(),
    toCenterId: z.coerce.number().optional().nullable(),
    statusAtHandover: z.string().min(1, "Status required"),
    notes: z.string().optional(),
  });

  const handoverForm = useForm<z.infer<typeof handoverFormSchema>>({
    resolver: zodResolver(handoverFormSchema),
    defaultValues: {
      senderStaffId: null,
      receiverStaffId: null,
      direction: "forward" as const,
      fromLocationType: "hq" as const,
      toLocationType: "region" as const,
      fromRegionId: null,
      fromClusterId: null,
      fromCenterId: null,
      toRegionId: null,
      toClusterId: null,
      toCenterId: null,
      statusAtHandover: "dispatched_to_region",
      notes: "",
    },
  });

  if (showDetailView && selectedPacket) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
        <OfflineBanner queueCount={offlineQueue.length} onSync={handleSync} isSyncing={isSyncing} />

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" onClick={() => { setShowDetailView(false); setSelectedPacket(null); }} data-testid="button-back-to-list">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-xl font-bold flex-1">{selectedPacket.barcode}</h1>
          <StatusBadge status={selectedPacket.status} />
        </div>

        <LogisticsChainVisualization packet={selectedPacket} handoverLogs={handoverLogs} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Packet Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Exam Year</span><span>{getExamYearLabel(selectedPacket.examYearId)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Grade</span><span>{selectedPacket.grade}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Subject</span><span>{getSubjectLabel(selectedPacket.subjectId)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Paper Count</span><span>{selectedPacket.paperCount}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Seal #</span><span>{selectedPacket.securitySealNumber || "--"}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Destination</span><span>{getCenterLabel(selectedPacket.destinationCenterId)}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Current Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Type</span><Badge variant="outline">{locationLabels[selectedPacket.currentLocationType]}</Badge></div>
              {selectedPacket.currentRegionId && <div className="flex justify-between gap-2"><span className="text-muted-foreground">Region</span><span>{getRegionLabel(selectedPacket.currentRegionId)}</span></div>}
              {selectedPacket.currentClusterId && <div className="flex justify-between gap-2"><span className="text-muted-foreground">Cluster</span><span>{getClusterLabel(selectedPacket.currentClusterId)}</span></div>}
              {selectedPacket.currentCenterId && <div className="flex justify-between gap-2"><span className="text-muted-foreground">Center</span><span>{getCenterLabel(selectedPacket.currentCenterId)}</span></div>}
              {selectedPacket.lastHandoverAt && <div className="flex justify-between gap-2"><span className="text-muted-foreground">Last Handover</span><span>{new Date(selectedPacket.lastHandoverAt).toLocaleString()}</span></div>}
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-semibold flex-1">Chain of Custody</h2>
          <Button onClick={() => { setShowHandoverDialog(true); }} data-testid="button-record-handover">
            <Send className="w-4 h-4 mr-1" /> Record Handover
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {Array.isArray(handoverLogs) && handoverLogs.length > 0 ? (
              <div className="relative pl-6 py-4 space-y-4">
                <div className="absolute left-8 top-6 bottom-6 w-0.5 bg-border" />
                {handoverLogs.map((log: any, i: number) => (
                  <div key={log.id} className="relative flex items-start gap-3" data-testid={`handover-log-${log.id}`}>
                    <div className={`absolute left-2 w-3 h-3 rounded-full border-2 ${i === handoverLogs.length - 1 ? 'bg-primary border-primary' : 'bg-background border-muted-foreground'}`} />
                    <div className="ml-6 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {log.direction === "forward" ? (
                          <ArrowDownRight className="w-4 h-4 text-chart-1" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-chart-4" />
                        )}
                        <span className="font-medium text-sm">
                          {locationLabels[log.fromLocationType]} <ArrowRight className="w-3 h-3 inline" /> {locationLabels[log.toLocationType]}
                        </span>
                        <StatusBadge status={log.statusAtHandover} />
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(log.handoverTime).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 space-x-3">
                        {log.senderStaffId && <span>From: {getStaffLabel(log.senderStaffId)}</span>}
                        {log.receiverStaffId && <span>To: {getStaffLabel(log.receiverStaffId)}</span>}
                        {log.gpsLatitude && log.gpsLongitude && (
                          <span><MapPin className="w-3 h-3 inline" /> {log.gpsLatitude}, {log.gpsLongitude}</span>
                        )}
                      </div>
                      {log.notes && <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No handover events recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showHandoverDialog} onOpenChange={setShowHandoverDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Record Handover</DialogTitle>
              <DialogDescription>Log a custody transfer for {selectedPacket.barcode}</DialogDescription>
            </DialogHeader>
            <Form {...handoverForm}>
              <form onSubmit={handoverForm.handleSubmit((data) => handoverMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={handoverForm.control} name="direction" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Direction</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-direction"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="forward">Forward (Dispatch)</SelectItem>
                          <SelectItem value="return">Return (Collect)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={handoverForm.control} name="statusAtHandover" render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-status-handover"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([key, val]) => (
                            <SelectItem key={key} value={key}>{val.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={handoverForm.control} name="fromLocationType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>From</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-from-location"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="hq">HQ</SelectItem>
                          <SelectItem value="region">Region</SelectItem>
                          <SelectItem value="cluster">Cluster</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={handoverForm.control} name="toLocationType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-to-location"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="hq">HQ</SelectItem>
                          <SelectItem value="region">Region</SelectItem>
                          <SelectItem value="cluster">Cluster</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={handoverForm.control} name="senderStaffId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sender (Staff)</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : null)} value={field.value?.toString() || ""}>
                        <FormControl><SelectTrigger data-testid="select-sender"><SelectValue placeholder="Select staff" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {staffProfiles.map((s: StaffProfile) => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.firstName} {s.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={handoverForm.control} name="receiverStaffId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receiver (Staff)</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : null)} value={field.value?.toString() || ""}>
                        <FormControl><SelectTrigger data-testid="select-receiver"><SelectValue placeholder="Select staff" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {staffProfiles.map((s: StaffProfile) => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.firstName} {s.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={handoverForm.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea {...field} data-testid="input-handover-notes" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <DialogFooter>
                  <Button type="submit" disabled={handoverMutation.isPending} data-testid="button-submit-handover">
                    {handoverMutation.isPending ? "Submitting..." : "Record Handover"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      <OfflineBanner queueCount={offlineQueue.length} onSync={handleSync} isSyncing={isSyncing} />

      <div className="flex items-center gap-2 flex-wrap">
        <Package className="w-6 h-6" />
        <h1 className="text-xl font-bold flex-1">Packet Tracking</h1>
        {!isOnline && (
          <Badge variant="destructive" data-testid="badge-offline">
            <WifiOff className="w-3 h-3 mr-1" /> Offline
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-navigation">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <BarChart3 className="w-4 h-4 mr-1" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="receive" data-testid="tab-receive">
            <Download className="w-4 h-4 mr-1" /> Receive
          </TabsTrigger>
          <TabsTrigger value="dispatch" data-testid="tab-dispatch">
            <Upload className="w-4 h-4 mr-1" /> Dispatch
          </TabsTrigger>
          <TabsTrigger value="packets" data-testid="tab-packets">
            <Package className="w-4 h-4 mr-1" /> Packets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 mt-4">
          {stats ? <DashboardStats stats={stats} /> : <Skeleton className="h-24 w-full" />}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3 flex-wrap">
              <Button onClick={() => setActiveTab("receive")} data-testid="button-go-receive">
                <Download className="w-4 h-4 mr-1" /> Receive Packet
              </Button>
              <Button onClick={() => setActiveTab("dispatch")} data-testid="button-go-dispatch">
                <Upload className="w-4 h-4 mr-1" /> Dispatch Packet
              </Button>
              <Button variant="outline" onClick={() => setActiveTab("packets")} data-testid="button-go-packets">
                <Package className="w-4 h-4 mr-1" /> View All Packets
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receive" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Receive Packet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Scan or enter barcode..."
                  value={receiveBarcode}
                  onChange={(e) => setReceiveBarcode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleReceiveLookup(); }}
                  className="text-lg"
                  data-testid="input-receive-barcode"
                />
                <Button onClick={handleReceiveLookup} disabled={receiveLookupLoading || !receiveBarcode.trim()} data-testid="button-receive-lookup">
                  {receiveLookupLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>

              {receivePacket && (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-muted-foreground block">Barcode</span><span className="font-medium" data-testid="text-receive-barcode">{receivePacket.barcode}</span></div>
                        <div><span className="text-muted-foreground block">Subject</span><span>{getSubjectLabel(receivePacket.subjectId)}</span></div>
                        <div><span className="text-muted-foreground block">Grade</span><span>{receivePacket.grade}</span></div>
                        <div><span className="text-muted-foreground block">Status</span><StatusBadge status={receivePacket.status} /></div>
                        <div><span className="text-muted-foreground block">Current Location</span><span>{locationLabels[receivePacket.currentLocationType]}</span></div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Sender</label>
                        <Select value={receiveSenderId?.toString() || ""} onValueChange={(v) => setReceiveSenderId(v ? parseInt(v) : null)}>
                          <SelectTrigger data-testid="select-receive-sender"><SelectValue placeholder="Select sender" /></SelectTrigger>
                          <SelectContent>
                            {staffProfiles.map((s: StaffProfile) => (
                              <SelectItem key={s.id} value={s.id.toString()}>{s.firstName} {s.lastName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Receiver</label>
                        <Select value={receiveReceiverId?.toString() || ""} onValueChange={(v) => setReceiveReceiverId(v ? parseInt(v) : null)}>
                          <SelectTrigger data-testid="select-receive-receiver"><SelectValue placeholder="Select receiver" /></SelectTrigger>
                          <SelectContent>
                            {staffProfiles.map((s: StaffProfile) => (
                              <SelectItem key={s.id} value={s.id.toString()}>{s.firstName} {s.lastName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Your Location Type</label>
                        <Select value={receiveLocationType} onValueChange={(v) => { setReceiveLocationType(v); setReceiveRegionId(null); setReceiveClusterId(null); setReceiveCenterId(null); }}>
                          <SelectTrigger data-testid="select-receive-location-type"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hq">HQ</SelectItem>
                            <SelectItem value="region">Region</SelectItem>
                            <SelectItem value="cluster">Cluster</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <LocationDropdowns
                        locationType={receiveLocationType}
                        regionId={receiveRegionId}
                        clusterId={receiveClusterId}
                        centerId={receiveCenterId}
                        onRegionChange={setReceiveRegionId}
                        onClusterChange={setReceiveClusterId}
                        onCenterChange={setReceiveCenterId}
                        regions={regions}
                        clusters={clusters}
                        centers={centers}
                        prefix="receive"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea value={receiveNotes} onChange={(e) => setReceiveNotes(e.target.value)} placeholder="Optional notes..." data-testid="input-receive-notes" />
                  </div>

                  {gps && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span data-testid="text-receive-gps">GPS: {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}</span>
                    </div>
                  )}

                  <Button className="w-full" onClick={handleReceiveSubmit} disabled={!receiveLocationValid} data-testid="button-receive-submit">
                    <Download className="w-4 h-4 mr-1" /> Confirm Receive
                  </Button>
                  {!receiveLocationValid && receiveLocationType !== "hq" && (
                    <p className="text-xs text-destructive">Please select all required location fields above</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispatch" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Upload className="w-4 h-4" /> Dispatch Packet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Scan or enter barcode..."
                  value={dispatchBarcode}
                  onChange={(e) => setDispatchBarcode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleDispatchLookup(); }}
                  className="text-lg"
                  data-testid="input-dispatch-barcode"
                />
                <Button onClick={handleDispatchLookup} disabled={dispatchLookupLoading || !dispatchBarcode.trim()} data-testid="button-dispatch-lookup">
                  {dispatchLookupLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>

              {dispatchPacket && (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-muted-foreground block">Barcode</span><span className="font-medium" data-testid="text-dispatch-barcode">{dispatchPacket.barcode}</span></div>
                        <div><span className="text-muted-foreground block">Subject</span><span>{getSubjectLabel(dispatchPacket.subjectId)}</span></div>
                        <div><span className="text-muted-foreground block">Grade</span><span>{dispatchPacket.grade}</span></div>
                        <div><span className="text-muted-foreground block">Status</span><StatusBadge status={dispatchPacket.status} /></div>
                        <div><span className="text-muted-foreground block">Current Location</span><span>{locationLabels[dispatchPacket.currentLocationType]}</span></div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Sender</label>
                        <Select value={dispatchSenderId?.toString() || ""} onValueChange={(v) => setDispatchSenderId(v ? parseInt(v) : null)}>
                          <SelectTrigger data-testid="select-dispatch-sender"><SelectValue placeholder="Select sender" /></SelectTrigger>
                          <SelectContent>
                            {staffProfiles.map((s: StaffProfile) => (
                              <SelectItem key={s.id} value={s.id.toString()}>{s.firstName} {s.lastName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Receiver</label>
                        <Select value={dispatchReceiverId?.toString() || ""} onValueChange={(v) => setDispatchReceiverId(v ? parseInt(v) : null)}>
                          <SelectTrigger data-testid="select-dispatch-receiver"><SelectValue placeholder="Select receiver" /></SelectTrigger>
                          <SelectContent>
                            {staffProfiles.map((s: StaffProfile) => (
                              <SelectItem key={s.id} value={s.id.toString()}>{s.firstName} {s.lastName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Destination Type</label>
                        <Select value={dispatchLocationType} onValueChange={(v) => { setDispatchLocationType(v); setDispatchRegionId(null); setDispatchClusterId(null); setDispatchCenterId(null); }}>
                          <SelectTrigger data-testid="select-dispatch-location-type"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hq">HQ</SelectItem>
                            <SelectItem value="region">Region</SelectItem>
                            <SelectItem value="cluster">Cluster</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <LocationDropdowns
                        locationType={dispatchLocationType}
                        regionId={dispatchRegionId}
                        clusterId={dispatchClusterId}
                        centerId={dispatchCenterId}
                        onRegionChange={setDispatchRegionId}
                        onClusterChange={setDispatchClusterId}
                        onCenterChange={setDispatchCenterId}
                        regions={regions}
                        clusters={clusters}
                        centers={centers}
                        prefix="dispatch"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea value={dispatchNotes} onChange={(e) => setDispatchNotes(e.target.value)} placeholder="Optional notes..." data-testid="input-dispatch-notes" />
                  </div>

                  {gps && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span data-testid="text-dispatch-gps">GPS: {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}</span>
                    </div>
                  )}

                  <Button className="w-full" onClick={handleDispatchSubmit} disabled={!dispatchLocationValid} data-testid="button-dispatch-submit">
                    <Upload className="w-4 h-4 mr-1" /> Confirm Dispatch
                  </Button>
                  {!dispatchLocationValid && dispatchLocationType !== "hq" && (
                    <p className="text-xs text-destructive">Please select all required location fields above</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packets" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-packets"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]" data-testid="select-filter-status"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(statusConfig).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterExamYear} onValueChange={setFilterExamYear}>
              <SelectTrigger className="w-[120px]" data-testid="select-filter-year"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {examYears.map((y: ExamYear) => (
                  <SelectItem key={y.id} value={y.id.toString()}>{y.year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="w-[120px]" data-testid="select-filter-grade"><SelectValue placeholder="Grade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                  <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-packet">
              <Plus className="w-4 h-4 mr-1" /> Create Packet
            </Button>
          </div>

          {packetsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredPackets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No packets found</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPackets.map((p: ExamPacket) => (
                      <TableRow key={p.id} data-testid={`packet-row-${p.id}`}>
                        <TableCell className="font-mono text-sm">{p.barcode}</TableCell>
                        <TableCell>{getSubjectLabel(p.subjectId)}</TableCell>
                        <TableCell>{p.grade}</TableCell>
                        <TableCell><StatusBadge status={p.status} /></TableCell>
                        <TableCell>{locationLabels[p.currentLocationType]}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setSelectedPacket(p); setShowDetailView(true); }}
                            data-testid={`button-view-${p.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Exam Packet</DialogTitle>
            <DialogDescription>Register a new exam packet for tracking</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={createForm.control} name="examYearId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Year</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                      <FormControl><SelectTrigger data-testid="select-create-exam-year"><SelectValue placeholder="Select year" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {examYears.map((y: ExamYear) => (
                          <SelectItem key={y.id} value={y.id.toString()}>{y.year} - {y.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={createForm.control} name="subjectId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                      <FormControl><SelectTrigger data-testid="select-create-subject"><SelectValue placeholder="Select subject" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {subjects.map((s: Subject) => (
                          <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField control={createForm.control} name="grade" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                      <FormControl><SelectTrigger data-testid="select-create-grade"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                          <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={createForm.control} name="destinationCenterId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Center</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                      <FormControl><SelectTrigger data-testid="select-create-center"><SelectValue placeholder="Select center" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {centers.map((c: ExamCenter) => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField control={createForm.control} name="paperCount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paper Count</FormLabel>
                    <FormControl><Input type="number" {...field} data-testid="input-create-paper-count" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={createForm.control} name="securitySealNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Security Seal #</FormLabel>
                    <FormControl><Input {...field} data-testid="input-create-seal" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={createForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea {...field} data-testid="input-create-notes" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                  {createMutation.isPending ? "Creating..." : "Create Packet"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
