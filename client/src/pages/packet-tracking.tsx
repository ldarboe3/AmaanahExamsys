import { useState } from "react";
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
  Search, Plus, Package, MapPin, ArrowRight, ArrowLeft,
  Clock, CheckCircle, AlertTriangle, Truck, Building2,
  Eye, BarChart3, RefreshCw, Send, ArrowDownRight, ArrowUpRight,
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

type HandoverFormData = z.infer<typeof handoverFormSchema>;

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

export default function PacketTrackingPage() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showHandoverDialog, setShowHandoverDialog] = useState(false);
  const [selectedPacket, setSelectedPacket] = useState<ExamPacket | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterExamYear, setFilterExamYear] = useState<string>("all");
  const [filterGrade, setFilterGrade] = useState<string>("all");

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

  const handoverForm = useForm<HandoverFormData>({
    resolver: zodResolver(handoverFormSchema),
    defaultValues: {
      direction: "forward",
      fromLocationType: "hq",
      toLocationType: "region",
      statusAtHandover: "dispatched_to_region",
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
      setShowCreateDialog(false);
      createForm.reset();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handoverMutation = useMutation({
    mutationFn: async (data: HandoverFormData) => {
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
    if (!id) return "—";
    return centers.find((c: ExamCenter) => c.id === id)?.name || `Center ${id}`;
  };
  const getRegionLabel = (id: number | null) => {
    if (!id) return "—";
    return regions.find((r: Region) => r.id === id)?.name || `Region ${id}`;
  };
  const getClusterLabel = (id: number | null) => {
    if (!id) return "—";
    return clusters.find((c: Cluster) => c.id === id)?.name || `Cluster ${id}`;
  };
  const getStaffLabel = (id: number | null) => {
    if (!id) return "—";
    const s = staffProfiles.find((sp: StaffProfile) => sp.id === id);
    return s ? `${s.firstName} ${s.lastName}` : `Staff ${id}`;
  };

  if (showDetailView && selectedPacket) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" onClick={() => { setShowDetailView(false); setSelectedPacket(null); }} data-testid="button-back-to-list">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-xl font-bold flex-1">{selectedPacket.barcode}</h1>
          <StatusBadge status={selectedPacket.status} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Packet Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Exam Year</span><span>{getExamYearLabel(selectedPacket.examYearId)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Grade</span><span>{selectedPacket.grade}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Subject</span><span>{getSubjectLabel(selectedPacket.subjectId)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Paper Count</span><span>{selectedPacket.paperCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Seal #</span><span>{selectedPacket.securitySealNumber || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Destination</span><span>{getCenterLabel(selectedPacket.destinationCenterId)}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Current Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><Badge variant="outline">{locationLabels[selectedPacket.currentLocationType]}</Badge></div>
              {selectedPacket.currentRegionId && <div className="flex justify-between"><span className="text-muted-foreground">Region</span><span>{getRegionLabel(selectedPacket.currentRegionId)}</span></div>}
              {selectedPacket.currentClusterId && <div className="flex justify-between"><span className="text-muted-foreground">Cluster</span><span>{getClusterLabel(selectedPacket.currentClusterId)}</span></div>}
              {selectedPacket.currentCenterId && <div className="flex justify-between"><span className="text-muted-foreground">Center</span><span>{getCenterLabel(selectedPacket.currentCenterId)}</span></div>}
              {selectedPacket.lastHandoverAt && <div className="flex justify-between"><span className="text-muted-foreground">Last Handover</span><span>{new Date(selectedPacket.lastHandoverAt).toLocaleString()}</span></div>}
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

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={handoverForm.control} name="toRegionId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Region</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : null)} value={field.value?.toString() || ""}>
                        <FormControl><SelectTrigger data-testid="select-to-region"><SelectValue placeholder="Optional" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {regions.map((r: Region) => (
                            <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={handoverForm.control} name="toClusterId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Cluster</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : null)} value={field.value?.toString() || ""}>
                        <FormControl><SelectTrigger data-testid="select-to-cluster"><SelectValue placeholder="Optional" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {clusters.map((c: Cluster) => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
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
                    <FormControl><Textarea {...field} value={field.value || ""} data-testid="input-handover-notes" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowHandoverDialog(false)}>Cancel</Button>
                  <Button type="submit" disabled={handoverMutation.isPending} data-testid="button-submit-handover">
                    {handoverMutation.isPending ? "Recording..." : "Record Handover"}
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
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Exam Paper Logistics</h1>
          <p className="text-sm text-muted-foreground">Track exam packets through chain of custody</p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-packet">
            <Plus className="w-4 h-4 mr-1" /> Create Packet
          </Button>
        </div>
      </div>

      <DashboardStats stats={stats} />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-lg flex-1">Packets</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search barcode..."
                  className="pl-8 w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-barcode"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36" data-testid="select-filter-status"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(statusConfig).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger className="w-28" data-testid="select-filter-grade"><SelectValue placeholder="Grade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                    <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {packetsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredPackets.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No packets found</p>
              <p className="text-xs">Create your first exam packet to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Papers</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPackets.map((p: ExamPacket) => (
                    <TableRow key={p.id} data-testid={`row-packet-${p.id}`}>
                      <TableCell className="font-mono text-xs">{p.barcode}</TableCell>
                      <TableCell>{getExamYearLabel(p.examYearId)}</TableCell>
                      <TableCell>{p.grade}</TableCell>
                      <TableCell>{getSubjectLabel(p.subjectId)}</TableCell>
                      <TableCell className="text-xs">{getCenterLabel(p.destinationCenterId)}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <MapPin className="w-3 h-3 mr-1" />
                          {locationLabels[p.currentLocationType]}
                        </Badge>
                      </TableCell>
                      <TableCell>{p.paperCount}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setSelectedPacket(p); setShowDetailView(true); }}
                          data-testid={`button-view-packet-${p.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Exam Packet</DialogTitle>
            <DialogDescription>Register a new exam paper packet for tracking</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={createForm.control} name="examYearId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Year</FormLabel>
                    <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString() || ""}>
                      <FormControl><SelectTrigger data-testid="select-exam-year"><SelectValue placeholder="Select year" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {examYears.map((y: ExamYear) => (
                          <SelectItem key={y.id} value={y.id.toString()}>{y.year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={createForm.control} name="grade" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade</FormLabel>
                    <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                      <FormControl><SelectTrigger data-testid="select-grade"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                          <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={createForm.control} name="subjectId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString() || ""}>
                    <FormControl><SelectTrigger data-testid="select-subject"><SelectValue placeholder="Select subject" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {subjects.map((s: Subject) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={createForm.control} name="destinationCenterId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination Center</FormLabel>
                  <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString() || ""}>
                    <FormControl><SelectTrigger data-testid="select-center"><SelectValue placeholder="Select center" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {centers.map((c: ExamCenter) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={createForm.control} name="destinationRegionId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : null)} value={field.value?.toString() || ""}>
                      <FormControl><SelectTrigger data-testid="select-region"><SelectValue placeholder="Optional" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {regions.map((r: Region) => (
                          <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={createForm.control} name="destinationClusterId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cluster</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : null)} value={field.value?.toString() || ""}>
                      <FormControl><SelectTrigger data-testid="select-cluster"><SelectValue placeholder="Optional" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {clusters.map((c: Cluster) => (
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
                    <FormControl><Input type="number" {...field} data-testid="input-paper-count" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={createForm.control} name="securitySealNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Security Seal #</FormLabel>
                    <FormControl><Input {...field} value={field.value || ""} data-testid="input-seal-number" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={createForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea {...field} value={field.value || ""} data-testid="input-packet-notes" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-packet">
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
