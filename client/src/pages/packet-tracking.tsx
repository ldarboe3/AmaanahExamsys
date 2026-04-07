import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
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
  Search, Plus, Package, Truck, Building2, CheckCircle, AlertTriangle,
  Lock, Clock, ArrowLeft, Smartphone, RefreshCw, MapPin, GitBranch,
  Eye, BarChart3, QrCode, Printer, Info, ChevronDown, ChevronUp,
  Sparkles, Trash2, AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import QRCode from "qrcode";
import type { ExamPacket, ExamYear, Subject, ExamCenter, Region, Cluster, ExamTimetable } from "@shared/schema";
import amanahLogoUrl from "@assets/Amana_Logo_1770390631299.jpeg";

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; icon: typeof Package }> = {
  created:              { label: "Created",          color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",        icon: Package },
  packed:               { label: "Packed",           color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",            icon: Package },
  dispatched_to_region: { label: "To Region",        color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",    icon: Truck },
  at_region:            { label: "At Region",        color: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",            icon: Building2 },
  dispatched_to_cluster:{ label: "To Cluster",       color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",    icon: Truck },
  at_cluster:           { label: "At Cluster",       color: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",            icon: Building2 },
  dispatched_to_center: { label: "To Center",        color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",    icon: Truck },
  at_center:            { label: "At Center",        color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",        icon: Building2 },
  opened:               { label: "Opened",           color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",    icon: Package },
  administered:         { label: "Administered",     color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",    icon: CheckCircle },
  sealed:               { label: "Sealed",           color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",icon: Lock },
  returned_to_cluster:  { label: "Ret. Cluster",     color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",            icon: ArrowLeft },
  returned_to_region:   { label: "Ret. Region",      color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",            icon: ArrowLeft },
  returned_to_hq:       { label: "Ret. HQ",          color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",            icon: ArrowLeft },
  completed:            { label: "Completed",        color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",        icon: CheckCircle },
  missing:              { label: "Missing",          color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",                icon: AlertTriangle },
  damaged:              { label: "Damaged",          color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",                icon: AlertTriangle },
};

const EVENT_LABELS: Record<string, { label: string; color: string; icon: typeof Package }> = {
  packed:            { label: "Packed at HQ",         color: "bg-blue-500",    icon: Package },
  dispatched:        { label: "Dispatched",            color: "bg-orange-500",  icon: Truck },
  received:          { label: "Received",              color: "bg-teal-500",    icon: Building2 },
  opened:            { label: "Opened",                color: "bg-purple-500",  icon: Package },
  sealed:            { label: "Sealed",                color: "bg-emerald-500", icon: Lock },
  return_dispatched: { label: "Return Dispatched",     color: "bg-cyan-500",    icon: ArrowLeft },
  return_received:   { label: "Return Received",       color: "bg-cyan-700",    icon: ArrowLeft },
  archived:          { label: "Archived / Complete",   color: "bg-green-500",   icon: CheckCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, color: "bg-slate-100 text-slate-700", icon: Package };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── Create Packet Dialog ──────────────────────────────────────────────────────

const packetFormSchema = z.object({
  examYearId:           z.coerce.number().min(1, "Exam year required"),
  subjectId:            z.coerce.number().min(1, "Subject required"),
  grade:                z.coerce.number().min(1).max(12),
  destinationCenterId:  z.coerce.number().min(1, "Center required"),
  destinationRegionId:  z.coerce.number().optional().nullable(),
  destinationClusterId: z.coerce.number().optional().nullable(),
  paperCount:           z.coerce.number().min(0).default(0),
  securitySealNumber:   z.string().optional(),
  notes:                z.string().optional(),
});
type PacketFormData = z.infer<typeof packetFormSchema>;

function generateSealNumber(): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).toUpperCase().slice(2, 7);
  return `SEAL-${ymd}-${rand}`;
}

function CreatePacketDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);

  const { data: examYears = [] } = useQuery<ExamYear[]>({ queryKey: ["/api/exam-years"] });
  const { data: allSubjects = [] } = useQuery<Subject[]>({ queryKey: ["/api/subjects"] });
  const { data: regions = [] } = useQuery<Region[]>({ queryKey: ["/api/regions"] });
  const { data: clusters = [] } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters", selectedRegionId],
    queryFn: () => apiRequest("GET", selectedRegionId ? `/api/clusters?regionId=${selectedRegionId}` : "/api/clusters").then(r => r.json()),
  });
  const { data: centers = [] } = useQuery<ExamCenter[]>({
    queryKey: ["/api/centers", selectedClusterId],
    queryFn: () => apiRequest("GET", selectedClusterId ? `/api/centers?clusterId=${selectedClusterId}` : "/api/centers").then(r => r.json()),
  });

  // Unique grades from subjects in the system
  const availableGrades = Array.from(new Set(allSubjects.map(s => s.grade))).sort((a, b) => a - b);

  const form = useForm<PacketFormData>({
    resolver: zodResolver(packetFormSchema),
    defaultValues: {
      examYearId: 0, subjectId: 0,
      grade: availableGrades[0] ?? 6,
      destinationCenterId: 0, destinationRegionId: null, destinationClusterId: null,
      paperCount: 0,
      securitySealNumber: generateSealNumber(),
    },
  });

  const selectedGrade = form.watch("grade");
  const subjectsForGrade = allSubjects.filter(s => s.grade === Number(selectedGrade));

  // Reset subject when grade changes
  const handleGradeChange = (val: string) => {
    form.setValue("grade", Number(val));
    form.setValue("subjectId", 0);
  };

  // When region changes, reset cluster and center
  const handleRegionChange = (regionId: number | null) => {
    setSelectedRegionId(regionId);
    setSelectedClusterId(null);
    form.setValue("destinationRegionId", regionId);
    form.setValue("destinationClusterId", null);
    form.setValue("destinationCenterId", 0);
  };

  // When cluster changes, reset center
  const handleClusterChange = (clusterId: number | null) => {
    setSelectedClusterId(clusterId);
    form.setValue("destinationClusterId", clusterId);
    form.setValue("destinationCenterId", 0);
  };

  const mutation = useMutation({
    mutationFn: (data: PacketFormData) => apiRequest("POST", "/api/exam-packets", data),
    onSuccess: () => {
      toast({ title: "Packet created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packet-events/dashboard/stats"] });
      form.reset();
      setSelectedRegionId(null);
      setSelectedClusterId(null);
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Exam Packet</DialogTitle>
          <DialogDescription>Register a new exam paper packet for tracking.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">

            {/* Exam Year + Grade */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="examYearId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Exam Year</FormLabel>
                  <Select onValueChange={field.onChange} value={String(field.value)}>
                    <FormControl><SelectTrigger data-testid="select-exam-year"><SelectValue placeholder="Select year" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {examYears.map(y => <SelectItem key={y.id} value={String(y.id)}>{y.year}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="grade" render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade</FormLabel>
                  <Select onValueChange={handleGradeChange} value={String(field.value)}>
                    <FormControl><SelectTrigger data-testid="select-grade"><SelectValue placeholder="Grade" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {availableGrades.map(g => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Subject — filtered by grade */}
            <FormField control={form.control} name="subjectId" render={({ field }) => (
              <FormItem>
                <FormLabel>Subject</FormLabel>
                <Select onValueChange={field.onChange} value={String(field.value)} disabled={subjectsForGrade.length === 0}>
                  <FormControl>
                    <SelectTrigger data-testid="select-subject">
                      <SelectValue placeholder={subjectsForGrade.length === 0 ? "Select a grade first" : "Select subject"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {subjectsForGrade.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Region → Cluster → Center cascade */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Destination</p>

              {/* Region */}
              <FormItem>
                <FormLabel>Region</FormLabel>
                <Select
                  onValueChange={v => handleRegionChange(v === "0" ? null : Number(v))}
                  value={selectedRegionId ? String(selectedRegionId) : "0"}
                >
                  <SelectTrigger data-testid="select-region">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">— Select region —</SelectItem>
                    {regions.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>

              {/* Cluster — enabled after region picked */}
              <FormItem>
                <FormLabel>Cluster</FormLabel>
                <Select
                  onValueChange={v => handleClusterChange(v === "0" ? null : Number(v))}
                  value={selectedClusterId ? String(selectedClusterId) : "0"}
                  disabled={!selectedRegionId}
                >
                  <SelectTrigger data-testid="select-cluster">
                    <SelectValue placeholder={!selectedRegionId ? "Select region first" : "Select cluster"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">— Select cluster —</SelectItem>
                    {clusters.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>

              {/* Center — enabled after cluster picked */}
              <FormField control={form.control} name="destinationCenterId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Exam Center</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={String(field.value)}
                    disabled={!selectedClusterId}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-center">
                        <SelectValue placeholder={!selectedClusterId ? "Select cluster first" : centers.length === 0 ? "No centers in this cluster" : "Select center"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {centers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Paper Count + Security Seal */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="paperCount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Paper Count</FormLabel>
                  <FormControl><Input type="number" data-testid="input-paper-count" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="securitySealNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    Security Seal #
                    <button
                      type="button"
                      className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
                      onClick={() => field.onChange(generateSealNumber())}
                      data-testid="button-regenerate-seal"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Regenerate
                    </button>
                  </FormLabel>
                  <FormControl><Input data-testid="input-seal-number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-create-packet">
                {mutation.isPending ? "Creating…" : "Create Packet"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Timeline Modal ────────────────────────────────────────────────────────────

function TimelineModal({ barcode, onClose }: { barcode: string; onClose: () => void }) {
  const { data, isLoading } = useQuery<{ packet: ExamPacket; events: any[] }>({
    queryKey: ["/api/packet-events/timeline", barcode],
    queryFn: () => apiRequest("GET", `/api/packet-events/timeline/${barcode}`).then(r => r.json()),
    enabled: !!barcode,
  });

  return (
    <Dialog open={!!barcode} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-teal-600" />
            Chain of Custody
          </DialogTitle>
          <DialogDescription>
            Barcode: <span className="font-mono font-medium">{barcode}</span>
          </DialogDescription>
        </DialogHeader>
        {isLoading && (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        )}
        {data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 text-sm">
              <div><span className="text-muted-foreground">Barcode</span><p className="font-mono font-medium">{data.packet.barcode}</p></div>
              <div><span className="text-muted-foreground">Status</span><p className="mt-0.5"><StatusBadge status={data.packet.status} /></p></div>
              <div><span className="text-muted-foreground">Grade</span><p className="font-medium">Grade {data.packet.grade}</p></div>
              <div><span className="text-muted-foreground">Papers</span><p className="font-medium">{data.packet.paperCount}</p></div>
            </div>
            {data.events.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">No events recorded yet.</p>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
                {data.events.map((ev) => {
                  const cfg = EVENT_LABELS[ev.eventType] ?? { label: ev.eventType, color: "bg-slate-500", icon: Clock };
                  const Icon = cfg.icon;
                  return (
                    <div key={ev.id} className="relative mb-5">
                      <div className={`absolute -left-4 w-3 h-3 rounded-full ${cfg.color} ring-2 ring-background`} />
                      <div className="bg-muted/30 rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5" />
                            {cfg.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(ev.eventTime).toLocaleString()}
                          </span>
                        </div>
                        {ev.sealNumber && (
                          <p className="text-xs text-muted-foreground mt-1">Seal: {ev.sealNumber}</p>
                        )}
                        {ev.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{ev.notes}</p>
                        )}
                        {ev.gpsLatitude && ev.gpsLongitude && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {Number(ev.gpsLatitude).toFixed(5)}, {Number(ev.gpsLongitude).toFixed(5)}
                          </p>
                        )}
                        {ev.deviceId && (
                          <p className="text-xs text-muted-foreground mt-1">Device: {ev.deviceId}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, isLoading }: {
  label: string; value: number; icon: typeof Package; color: string; isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          {isLoading
            ? <Skeleton className="h-6 w-12 mb-1" />
            : <p className="text-2xl font-bold leading-none">{value}</p>
          }
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chain-of-Custody Search Tab ───────────────────────────────────────────────

function ChainOfCustodyTab({ onViewTimeline }: { onViewTimeline: (barcode: string) => void }) {
  const [barcode, setBarcode] = useState("");
  const [queried, setQueried] = useState("");

  const { data, isLoading, error } = useQuery<{ packet: ExamPacket; events: any[] }>({
    queryKey: ["/api/packet-events/timeline", queried],
    queryFn: () => apiRequest("GET", `/api/packet-events/timeline/${queried}`).then(async r => {
      if (!r.ok) throw new Error("Packet not found");
      return r.json();
    }),
    enabled: !!queried,
    retry: false,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 max-w-xl">
        <Input
          placeholder="Enter barcode to look up chain of custody…"
          value={barcode}
          onChange={e => setBarcode(e.target.value)}
          onKeyDown={e => e.key === "Enter" && setQueried(barcode)}
          data-testid="input-barcode-search"
        />
        <Button onClick={() => setQueried(barcode)} disabled={!barcode || isLoading} data-testid="button-search-barcode">
          <Search className="w-4 h-4 mr-2" />
          Look Up
        </Button>
      </div>

      {isLoading && <Skeleton className="h-40 w-full max-w-xl" />}

      {error && !isLoading && (
        <Card className="max-w-xl">
          <CardContent className="p-4 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Packet not found for barcode &quot;{queried}&quot;.
          </CardContent>
        </Card>
      )}

      {data && !isLoading && (
        <Card className="max-w-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono">{data.packet.barcode}</span>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={data.packet.status} />
                <Button size="sm" variant="outline" onClick={() => onViewTimeline(data.packet.barcode)} data-testid="button-full-timeline">
                  <GitBranch className="w-3.5 h-3.5 mr-1" />
                  Full View
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-3">
              Grade {data.packet.grade} · {data.events.length} event{data.events.length !== 1 ? "s" : ""} recorded
            </p>
            {data.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events recorded for this packet yet.</p>
            ) : (
              <div className="space-y-2">
                {data.events.slice(-5).map(ev => {
                  const cfg = EVENT_LABELS[ev.eventType] ?? { label: ev.eventType, color: "bg-slate-500", icon: Clock };
                  const Icon = cfg.icon;
                  return (
                    <div key={ev.id} className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.color}`} />
                      <span className="font-medium flex items-center gap-1">
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      <span className="text-muted-foreground text-xs ml-auto">
                        {new Date(ev.eventTime).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
                {data.events.length > 5 && (
                  <p className="text-xs text-muted-foreground">…and {data.events.length - 5} earlier events</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Print Label ───────────────────────────────────────────────────────────────

async function toBase64DataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function printPacketLabel(
  packet: ExamPacket,
  subjectName: string,
  centerName: string,
  examYearLabel: string,
  examDate?: string,
  startTime?: string,
  endTime?: string,
) {
  const [qrDataUrl, logoDataUrl] = await Promise.all([
    QRCode.toDataURL(packet.barcode, {
      width: 200,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    }),
    toBase64DataUrl(amanahLogoUrl).catch(() => ""),
  ]);

  const statusLabel = (STATUS_CFG[packet.status]?.label ?? packet.status);
  const printDate = new Date().toLocaleString();

  const fmtDate = examDate
    ? new Date(examDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : null;
  const timeRange = startTime && endTime ? `${startTime} – ${endTime}` : startTime ?? null;
  const hasSchedule = !!(fmtDate || timeRange);

  // Calculate duration from start/end times
  const durationLabel = (() => {
    if (!startTime || !endTime) return null;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h} hr ${m} min`;
    if (h > 0) return `${h} hr${h > 1 ? "s" : ""}`;
    return `${m} min`;
  })();

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Packet Label – ${packet.barcode}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; color: #111; }
    @page { size: A4 landscape; margin: 12mm; }
    .label {
      width: 270mm; min-height: 168mm;
      border: 2.5px solid #0d9488; border-radius: 8px;
      padding: 12mm; display: flex; flex-direction: column; gap: 7mm;
    }
    .header {
      display: flex; align-items: center; justify-content: space-between;
      border-bottom: 2px solid #0d9488; padding-bottom: 5mm;
    }
    .header-left { display: flex; align-items: center; gap: 5mm; }
    .header-logo { width: 20mm; height: 20mm; object-fit: contain; flex-shrink: 0; }
    .org-name { font-size: 26pt; font-weight: 900; color: #0d9488; letter-spacing: 0.5px; }
    .org-sub  { font-size: 12pt; color: #555; margin-top: 1.5mm; }
    .title-badge {
      background: #0d9488; color: #fff;
      font-size: 13pt; font-weight: 700;
      padding: 5px 14px; border-radius: 5px; letter-spacing: 0.5px;
    }
    .body { display: flex; gap: 10mm; flex: 1; }
    .details { flex: 1; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm 8mm; }
    .field label { font-size: 9pt; text-transform: uppercase; color: #888; letter-spacing: 0.6px; font-weight: 600; }
    .field p { font-size: 15pt; font-weight: 700; color: #111; margin-top: 1.5px; }
    .field p.mono { font-family: 'Courier New', monospace; font-size: 13pt; }
    .qr-block { display: flex; flex-direction: column; align-items: center; gap: 3mm; }
    .qr-block img { width: 52mm; height: 52mm; border: 1px solid #e5e7eb; border-radius: 5px; }
    .qr-label { font-size: 9pt; color: #555; text-align: center; max-width: 56mm; line-height: 1.4; }
    .barcode-strip {
      background: #f8fafc; border: 1.5px solid #e5e7eb; border-radius: 5px;
      padding: 4mm 6mm; text-align: center;
    }
    .barcode-strip .bc-text { font-family: 'Courier New', monospace; font-size: 20pt; font-weight: 900; letter-spacing: 3px; color: #0d9488; }
    .barcode-strip .bc-hint { font-size: 10pt; color: #888; margin-top: 2mm; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 4mm; display: flex; justify-content: space-between; align-items: center; }
    .footer p { font-size: 9pt; color: #aaa; }
    .status-badge {
      display: inline-block; background: #d1fae5; color: #065f46;
      font-size: 12pt; font-weight: 700; padding: 3px 12px; border-radius: 20px;
    }
    .schedule-banner {
      background: #0f766e; color: #fff;
      border-radius: 6px; padding: 4mm 7mm;
      display: flex; align-items: center; justify-content: space-between; gap: 8mm;
    }
    .schedule-banner .sch-label { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.7px; opacity: 0.85; margin-bottom: 1.5px; }
    .schedule-banner .sch-val  { font-size: 16pt; font-weight: 800; letter-spacing: 0.3px; }
    .schedule-banner .sch-divider { width: 1px; background: rgba(255,255,255,0.35); align-self: stretch; }
    .schedule-banner .sch-time  { font-size: 20pt; font-weight: 900; letter-spacing: 1px; }
    .schedule-banner .sch-duration { font-size: 18pt; font-weight: 900; letter-spacing: 0.5px; }
    .schedule-banner .sch-dur-pill {
      display: inline-block; background: rgba(255,255,255,0.2);
      border: 1.5px solid rgba(255,255,255,0.45);
      border-radius: 4px; padding: 2px 10px; margin-top: 2px;
      font-size: 17pt; font-weight: 900; letter-spacing: 0.5px;
    }
    .no-schedule-notice {
      background: #fef3c7; color: #92400e;
      border-radius: 6px; padding: 3mm 7mm; font-size: 10pt; font-style: italic;
    }
  </style>
</head>
<body>
<div class="label">
  <div class="header">
    <div class="header-left">
      ${logoDataUrl ? `<img class="header-logo" src="${logoDataUrl}" alt="Amaanah Logo" />` : ""}
      <div>
        <div class="org-name">AMAANAH</div>
        <div class="org-sub">Examination Management System &nbsp;|&nbsp; ${examYearLabel}</div>
      </div>
    </div>
    <div class="title-badge">EXAM PAPER PACKET</div>
  </div>

  ${hasSchedule ? `
  <div class="schedule-banner">
    ${fmtDate ? `<div>
      <div class="sch-label">Examination Date</div>
      <div class="sch-val">${fmtDate}</div>
    </div>` : ""}
    ${fmtDate && timeRange ? `<div class="sch-divider"></div>` : ""}
    ${timeRange ? `<div>
      <div class="sch-label">Session Time</div>
      <div class="sch-time">${timeRange}</div>
    </div>` : ""}
    ${timeRange && durationLabel ? `<div class="sch-divider"></div>` : ""}
    ${durationLabel ? `<div>
      <div class="sch-label">Duration</div>
      <div class="sch-dur-pill">${durationLabel}</div>
    </div>` : ""}
  </div>` : `
  <div class="no-schedule-notice">&#9888; No timetable entry found for this subject — check center timetable before dispatching.</div>`}

  <div class="body">
    <div class="details">
      <div class="grid">
        <div class="field"><label>Subject</label><p>${subjectName}</p></div>
        <div class="field"><label>Grade</label><p>Grade ${packet.grade}</p></div>
        <div class="field"><label>Destination Center</label><p>${centerName}</p></div>
        <div class="field"><label>Paper Count</label><p>${packet.paperCount} papers</p></div>
        <div class="field"><label>Security Seal #</label><p class="mono">${packet.securitySealNumber ?? "—"}</p></div>
        <div class="field"><label>Status</label><p><span class="status-badge">${statusLabel}</span></p></div>
      </div>
    </div>
    <div class="qr-block">
      <img src="${qrDataUrl}" alt="QR Code" />
      <div class="qr-label">Scan with Amaanah Mobile App to track this packet</div>
    </div>
  </div>

  <div class="barcode-strip">
    <div class="bc-text">${packet.barcode}</div>
    <div class="bc-hint">Packet Tracking Barcode &nbsp;|&nbsp; Scan on mobile app at each handover</div>
  </div>

  <div class="footer">
    <p>Printed: ${printDate}</p>
    <p>Amaanah Exam Management System</p>
  </div>
</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=650");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

// ── Auto-Generate Dialog ──────────────────────────────────────────────────────

function AutoGenerateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [examYearId, setExamYearId] = useState<number>(0);
  const [regionId, setRegionId] = useState<number>(0); // 0 = all regions
  const [bufferPercent, setBufferPercent] = useState(15);
  const [skipExisting, setSkipExisting] = useState(true);
  const [result, setResult] = useState<{ created: number; skipped: number; total: number; subjectCount: number; centerCount: number; timetableBased: boolean } | null>(null);

  const { data: examYears = [] } = useQuery<ExamYear[]>({ queryKey: ["/api/exam-years"] });
  const { data: allCenters = [] } = useQuery<ExamCenter[]>({ queryKey: ["/api/centers"] });
  const { data: regions = [] } = useQuery<Region[]>({ queryKey: ["/api/regions"] });
  const { data: timetable = [] } = useQuery<any[]>({
    queryKey: ["/api/exam-schedules", examYearId, "published"],
    queryFn: () => fetch(`/api/exam-schedules?examYearId=${examYearId}&isPublished=true`, { credentials: "include" }).then(r => r.json()),
    enabled: !!examYearId,
  });

  // Published exam schedules — the same source the backend auto-generate uses
  const timetabledSubjectIds = examYearId
    ? [...new Set((timetable as any[]).map((s: any) => s.subjectId))]
    : [];
  const timetableSubjectCount = timetabledSubjectIds.length;

  // Center count scoped to selected region
  const scopedCenters = regionId ? allCenters.filter((c: any) => c.regionId === regionId) : allCenters;
  const expectedPackets = (timetableSubjectCount || 0) * scopedCenters.length;
  const isTimetableBased = timetableSubjectCount > 0;

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/exam-packets/auto-generate", {
      examYearId,
      skipExisting,
      bufferPercent,
      regionId: regionId || null,
    }).then(r => r.json()),
    onSuccess: (data: any) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packet-events/dashboard/stats"] });
      toast({ title: `Generated ${data.created} packets`, description: `${data.skipped} already existed and were skipped.` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={result ? () => { setResult(null); onClose(); } : onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            AI Bulk Packet Generation
          </DialogTitle>
          <DialogDescription>
            Creates one packet per scheduled subject per exam center, with paper counts from enrolled student numbers.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-2">
            {/* Total */}
            <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 text-center space-y-1">
              <p className="text-4xl font-bold text-emerald-700 dark:text-emerald-300">{result.created}</p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">packets created successfully</p>
              {result.skipped > 0 && (
                <p className="text-xs text-muted-foreground">{result.skipped} already existed and were skipped</p>
              )}
            </div>

            {/* Breakdown */}
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Breakdown</p>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-background rounded-sm p-2 space-y-0.5">
                  <p className="text-lg font-bold">{result.subjectCount}</p>
                  <p className="text-xs text-muted-foreground">Subjects</p>
                </div>
                <div className="bg-background rounded-sm p-2 space-y-0.5 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold text-muted-foreground">×</p>
                </div>
                <div className="bg-background rounded-sm p-2 space-y-0.5">
                  <p className="text-lg font-bold">{result.centerCount}</p>
                  <p className="text-xs text-muted-foreground">Centers</p>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                = 1 packet per subject per center
                {result.timetableBased && (
                  <span className="ml-1 text-teal-600 dark:text-teal-400 font-medium">· subjects from published timetable</span>
                )}
              </p>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Each packet has a unique barcode and security seal number. Print labels from the Packets table below.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => { setResult(null); onClose(); }}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-1">
            {/* Exam Year */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Exam Year</label>
              <Select onValueChange={v => { setExamYearId(Number(v)); }} value={examYearId ? String(examYearId) : ""}>
                <SelectTrigger data-testid="select-autogen-year">
                  <SelectValue placeholder="Select exam year" />
                </SelectTrigger>
                <SelectContent>
                  {examYears.map(y => (
                    <SelectItem key={y.id} value={String(y.id)}>{y.year} — {y.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Region filter */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Region</label>
              <Select onValueChange={v => setRegionId(Number(v))} value={String(regionId)}>
                <SelectTrigger data-testid="select-autogen-region">
                  <SelectValue placeholder="All regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All regions</SelectItem>
                  {regions.map((r: any) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {regionId ? `Generating for centers in selected region only` : "Generating for all regions nationwide"}
              </p>
            </div>

            {/* No centers registered warning */}
            {allCenters.length === 0 && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-destructive">No exam centers registered</p>
                  <p className="text-muted-foreground text-xs">
                    You must add exam centers before generating packets. Go to{" "}
                    <a href="/regions-clusters" className="underline text-foreground font-medium">Regions &amp; Clusters</a>{" "}
                    and add centers to each cluster, then return here to generate packets.
                  </p>
                </div>
              </div>
            )}

            {/* Scope preview */}
            <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Scope Preview</p>
                {examYearId && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isTimetableBased ? "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300" : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"}`}>
                    {isTimetableBased ? "From timetable" : "No timetable yet"}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-sm bg-background p-2">
                  <p className="text-lg font-bold">{examYearId ? (timetableSubjectCount || "—") : "—"}</p>
                  <p className="text-xs text-muted-foreground">Scheduled Subjects</p>
                </div>
                <div className={`rounded-sm p-2 ${allCenters.length === 0 ? "bg-destructive/10" : "bg-background"}`}>
                  <p className={`text-lg font-bold ${allCenters.length === 0 ? "text-destructive" : ""}`}>{scopedCenters.length}</p>
                  <p className="text-xs text-muted-foreground">{regionId ? "Centers in Region" : "Centers"}</p>
                </div>
                <div className="rounded-sm bg-teal-50 dark:bg-teal-950/40 p-2">
                  <p className="text-lg font-bold text-teal-700 dark:text-teal-300">{examYearId ? expectedPackets : "—"}</p>
                  <p className="text-xs text-muted-foreground">Total Packets</p>
                </div>
              </div>
              {examYearId && !isTimetableBased && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  No published timetable found for this year — packets will use all subjects for the exam year's grades.
                </p>
              )}
            </div>

            {/* Buffer */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Paper Buffer: <span className="text-teal-600 font-bold">+{bufferPercent}%</span>
              </label>
              <p className="text-xs text-muted-foreground">
                Paper count = enrolled students + {bufferPercent}% buffer, rounded up to nearest 10
              </p>
              <div className="flex gap-2 flex-wrap">
                {[5, 10, 15, 20, 25].map(v => (
                  <Button
                    key={v}
                    type="button"
                    size="sm"
                    variant={bufferPercent === v ? "default" : "outline"}
                    onClick={() => setBufferPercent(v)}
                  >
                    {v}%
                  </Button>
                ))}
              </div>
            </div>

            {/* Skip existing */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="skip-existing"
                checked={skipExisting}
                onChange={e => setSkipExisting(e.target.checked)}
                className="w-4 h-4 rounded"
                data-testid="checkbox-skip-existing"
              />
              <label htmlFor="skip-existing" className="text-sm">
                Skip packets that already exist for this year
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                disabled={!examYearId || mutation.isPending || allCenters.length === 0}
                onClick={() => mutation.mutate()}
                data-testid="button-confirm-auto-generate"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {mutation.isPending
                  ? `Generating…`
                  : `Generate ${examYearId ? expectedPackets : ""} Packets`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PacketTracking() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [timelineBarcode, setTimelineBarcode] = useState<string | null>(null);
  const [showStatusFlow, setShowStatusFlow] = useState(false);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/exam-packets/${id}`),
    onSuccess: () => {
      toast({ title: "Packet deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packet-events/dashboard/stats"] });
      setDeleteConfirmId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/packet-events/dashboard/stats"],
    queryFn: () => apiRequest("GET", "/api/packet-events/dashboard/stats").then(r => r.json()),
    refetchInterval: 10_000,
  });

  const { data: packets = [], isLoading: packetsLoading, dataUpdatedAt } = useQuery<ExamPacket[]>({
    queryKey: ["/api/exam-packets"],
    refetchInterval: 10_000,
  });

  const { data: subjects = [] } = useQuery<Subject[]>({ queryKey: ["/api/subjects"] });
  const { data: centers = [] } = useQuery<ExamCenter[]>({ queryKey: ["/api/centers"] });
  const { data: examYears = [] } = useQuery<ExamYear[]>({ queryKey: ["/api/exam-years"] });
  const { data: timetable = [] } = useQuery<ExamTimetable[]>({ queryKey: ["/api/timetable"] });
  const { data: regions = [] } = useQuery<Region[]>({ queryKey: ["/api/regions"] });

  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));
  const centerMap = Object.fromEntries(centers.map(c => [c.id, c.name]));
  const examYearMap = Object.fromEntries(examYears.map(y => [y.id, y.year]));
  const regionMap = Object.fromEntries(regions.map(r => [r.id, r.name]));
  const availableGrades = Array.from(new Set(packets.map(p => p.grade))).sort((a, b) => a - b);
  // keyed by subjectId — last write wins if duplicates exist across years; prefer active exam year entry
  const timetableBySubject = Object.fromEntries(
    [...timetable].reverse().map(t => [t.subjectId, t])
  );

  const filtered = packets.filter(p => {
    const matchSearch = !search
      || p.barcode.toLowerCase().includes(search.toLowerCase())
      || (subjectMap[p.subjectId] ?? "").toLowerCase().includes(search.toLowerCase())
      || (centerMap[p.destinationCenterId] ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchGrade = gradeFilter === "all" || String(p.grade) === gradeFilter;
    const matchRegion = regionFilter === "all" || String(p.destinationRegionId) === regionFilter;
    return matchSearch && matchStatus && matchGrade && matchRegion;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-teal-600" />
            Packet Tracking
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor exam paper packets across the delivery chain
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowAutoGenerate(true)} data-testid="button-auto-generate">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Generate All
          </Button>
          <Button onClick={() => setShowCreate(true)} data-testid="button-create-packet-dialog">
            <Plus className="w-4 h-4 mr-2" />
            New Packet
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total"       value={stats?.total ?? 0}      icon={Package}     color="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"             isLoading={statsLoading} />
        <StatCard label="Packed"      value={stats?.packed ?? 0}     icon={Package}     color="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"                isLoading={statsLoading} />
        <StatCard label="In Transit"  value={stats?.inTransit ?? 0}  icon={Truck}       color="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300"        isLoading={statsLoading} />
        <StatCard label="At Location" value={stats?.atLocation ?? 0} icon={Building2}   color="bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-300"               isLoading={statsLoading} />
        <StatCard label="Sealed"      value={stats?.sealed ?? 0}     icon={Lock}        color="bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300"    isLoading={statsLoading} />
        <StatCard label="Returned"    value={stats?.returned ?? 0}   icon={CheckCircle} color="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300"            isLoading={statsLoading} />
      </div>

      {/* Mobile scanner notice */}
      <Card className="border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/30">
        <CardContent className="p-4 flex items-start gap-3">
          <Smartphone className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm text-teal-900 dark:text-teal-100">Field operations use the Mobile Scanner</p>
            <p className="text-xs text-teal-700 dark:text-teal-300 mt-0.5">
              All dispatching, receiving, opening, and sealing actions are performed on the mobile interface.
              This dashboard is for monitoring and oversight only.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Status Flow explanation */}
      <div className="rounded-md border bg-muted/30">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium gap-2"
          onClick={() => setShowStatusFlow(v => !v)}
          data-testid="button-toggle-status-flow"
        >
          <span className="flex items-center gap-2 text-muted-foreground">
            <Info className="w-4 h-4 shrink-0" />
            How does packet status change?
          </span>
          {showStatusFlow ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showStatusFlow && (
          <div className="px-4 pb-4 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Packet status is driven by events recorded in the <strong>Mobile Scanner</strong> app.
              Each scan at a handover point records an event that automatically advances the packet to the next status.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { event: "Packet created in system",        status: "Created",            who: "HQ Admin" },
                { event: "Packed event scanned",           status: "→ Packed",           who: "HQ Packer (mobile)" },
                { event: "Dispatch to Region scanned",     status: "→ Dispatched (Region)", who: "HQ Logistics (mobile)" },
                { event: "Region receipt scanned",         status: "→ At Region",        who: "Regional Officer (mobile)" },
                { event: "Dispatch to Cluster scanned",    status: "→ Dispatched (Cluster)", who: "Regional Officer (mobile)" },
                { event: "Cluster receipt scanned",        status: "→ At Cluster",       who: "Cluster Officer (mobile)" },
                { event: "Center delivery scanned",        status: "→ At Center",        who: "Center Examiner (mobile)" },
                { event: "Opened before exam",             status: "→ Opened",           who: "Examiner (mobile)" },
                { event: "Sealed after exam",              status: "→ Sealed",           who: "Examiner (mobile)" },
                { event: "Return dispatch chain",          status: "→ Returning",        who: "Center / Cluster / Region (mobile)" },
                { event: "Received back at HQ",            status: "→ Returned",         who: "HQ Logistics (mobile)" },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-sm bg-background">
                  <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <div>
                    <p className="font-medium text-foreground">{step.event}</p>
                    <p className="text-muted-foreground">{step.status} &mdash; <em>{step.who}</em></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="packets">
        <TabsList>
          <TabsTrigger value="packets" data-testid="tab-packets">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            Packets
          </TabsTrigger>
          <TabsTrigger value="custody" data-testid="tab-custody">
            <GitBranch className="w-3.5 h-3.5 mr-1.5" />
            Chain of Custody
          </TabsTrigger>
        </TabsList>

        {/* Packets tab */}
        <TabsContent value="packets" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search barcode, subject, center…"
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
                data-testid="input-packet-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(STATUS_CFG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-32" data-testid="select-grade-filter">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All grades</SelectItem>
                {availableGrades.map(g => (
                  <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-40" data-testid="select-region-filter">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                {regions.map(r => (
                  <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              {dataUpdatedAt > 0 && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Updated {new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <Button variant="outline" size="icon" disabled={packetsLoading} onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/exam-packets"] });
                queryClient.invalidateQueries({ queryKey: ["/api/packet-events/dashboard/stats"] });
              }} data-testid="button-refresh-packets">
                <RefreshCw className={`w-4 h-4 ${packetsLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Center</TableHead>
                    <TableHead>Papers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packetsLoading && [1,2,3,4,5].map(i => (
                    <TableRow key={i}>
                      {[1,2,3,4,5,6,7].map(j => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))}
                  {!packetsLoading && filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        {packets.length === 0 ? "No packets created yet." : "No packets match your search."}
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map(p => (
                    <TableRow key={p.id} data-testid={`row-packet-${p.id}`}>
                      <TableCell className="font-mono text-sm">{p.barcode}</TableCell>
                      <TableCell>Grade {p.grade}</TableCell>
                      <TableCell className="text-sm">{subjectMap[p.subjectId] ?? `#${p.subjectId}`}</TableCell>
                      <TableCell className="text-sm">{centerMap[p.destinationCenterId] ?? `#${p.destinationCenterId}`}</TableCell>
                      <TableCell>{p.paperCount}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const tt = timetableBySubject[p.subjectId];
                              printPacketLabel(
                                p,
                                subjectMap[p.subjectId] ?? `Subject ${p.subjectId}`,
                                centerMap[p.destinationCenterId] ?? `Center ${p.destinationCenterId}`,
                                examYearMap[p.examYearId] ? String(examYearMap[p.examYearId]) : `Year ${p.examYearId}`,
                                tt?.examDate ?? undefined,
                                tt?.startTime ?? undefined,
                                tt?.endTime ?? undefined,
                              );
                            }}
                            data-testid={`button-print-label-${p.id}`}
                          >
                            <Printer className="w-3.5 h-3.5 mr-1" />
                            Print Label
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setTimelineBarcode(p.barcode)}
                            data-testid={`button-view-timeline-${p.id}`}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Timeline
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(p.id)}
                            data-testid={`button-delete-packet-${p.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
          {filtered.length > 0 && (
            <p className="text-xs text-muted-foreground text-right">
              Showing {filtered.length} of {packets.length} packets
            </p>
          )}
        </TabsContent>

        {/* Chain of Custody tab */}
        <TabsContent value="custody" className="mt-4">
          <ChainOfCustodyTab onViewTimeline={setTimelineBarcode} />
        </TabsContent>
      </Tabs>

      {showCreate && <CreatePacketDialog open={showCreate} onClose={() => setShowCreate(false)} />}
      {showAutoGenerate && <AutoGenerateDialog open={showAutoGenerate} onClose={() => setShowAutoGenerate(false)} />}
      {timelineBarcode && <TimelineModal barcode={timelineBarcode} onClose={() => setTimelineBarcode(null)} />}

      {/* Delete confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Delete Packet
            </DialogTitle>
            <DialogDescription>
              This will permanently delete the packet and all its event history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete Packet"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
