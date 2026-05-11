import { useState, useEffect, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search, Plus, Package, Truck, Building2, CheckCircle, AlertTriangle,
  Lock, Clock, ArrowLeft, Smartphone, RefreshCw, MapPin, GitBranch,
  Eye, BarChart3, QrCode, Printer, Info, ChevronDown, ChevronUp,
  Sparkles, Trash2, AlertCircle, ChevronLeft, ChevronRight, Calendar,
  GraduationCap,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
  hallId:               z.coerce.number().optional().nullable(),
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

interface CenterHallSimple { id: number; name: string; capacity: number; }

function CreatePacketDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);
  const [selectedCenterId, setSelectedCenterId] = useState<number | null>(null);

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
  const { data: halls = [] } = useQuery<CenterHallSimple[]>({
    queryKey: [`/api/centers/${selectedCenterId}/halls`],
    enabled: !!selectedCenterId,
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
    setSelectedCenterId(null);
    form.setValue("destinationRegionId", regionId);
    form.setValue("destinationClusterId", null);
    form.setValue("destinationCenterId", 0);
    form.setValue("hallId", null);
  };

  // When cluster changes, reset center
  const handleClusterChange = (clusterId: number | null) => {
    setSelectedClusterId(clusterId);
    setSelectedCenterId(null);
    form.setValue("destinationClusterId", clusterId);
    form.setValue("destinationCenterId", 0);
    form.setValue("hallId", null);
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
      setSelectedCenterId(null);
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
                    onValueChange={v => { field.onChange(v); setSelectedCenterId(Number(v)); form.setValue("hallId", null); }}
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

              {/* Hall — optional, shown after center picked */}
              {selectedCenterId && halls.length > 0 && (
                <FormField control={form.control} name="hallId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hall <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <Select
                      onValueChange={v => field.onChange(v === "0" ? null : Number(v))}
                      value={field.value ? String(field.value) : "0"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-hall">
                          <SelectValue placeholder="Any hall" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">— Any hall —</SelectItem>
                        {halls.map(h => (
                          <SelectItem key={h.id} value={String(h.id)}>{h.name} (cap. {h.capacity})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
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

interface PrintLabelOpts {
  packet: ExamPacket;
  subjectName: string;
  centerName: string;
  centerAddress?: string;
  examYearLabel: string;
  examDate?: string;
  startTime?: string;
  endTime?: string;
  regionName?: string;
  clusterName?: string;
  hallName?: string;
}

function buildLabelHtml(opts: PrintLabelOpts, qrDataUrl: string, logoDataUrl: string): string {
  const { packet, subjectName, centerName, centerAddress, examYearLabel, examDate, startTime, endTime, regionName, clusterName, hallName } = opts;
  const statusLabel = STATUS_CFG[packet.status]?.label ?? packet.status;
  const printDate = new Date().toLocaleString();

  const fmtDate = examDate
    ? new Date(examDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : null;
  const timeRange = startTime && endTime ? `${startTime} – ${endTime}` : startTime ?? null;
  const hasSchedule = !!(fmtDate || timeRange);

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

  return `<div class="label">
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
        ${regionName ? `<div class="field"><label>Region</label><p>${regionName}</p></div>` : ""}
        ${clusterName ? `<div class="field"><label>Cluster</label><p>${clusterName}</p></div>` : ""}
        <div class="field"><label>Destination Center</label><p>${centerName}</p>${centerAddress ? `<p class="center-address">${centerAddress}</p>` : ""}</div>
        ${hallName ? `<div class="field hall-field"><label>Exam Hall</label><p class="hall-name">${hallName}</p></div>` : ""}
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
</div>`;
}

const LABEL_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #fff; color: #111; }
  @page { size: A4 landscape; margin: 12mm; }
  .label {
    width: 270mm; min-height: 168mm;
    border: 2.5px solid #0d9488; border-radius: 8px;
    padding: 12mm; display: flex; flex-direction: column; gap: 7mm;
    page-break-after: always;
  }
  .label:last-child { page-break-after: avoid; }
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
  .field p.center-address { font-size: 10pt; font-weight: 500; color: #555; margin-top: 2px; }
  .hall-field { grid-column: 1 / -1; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 5px; padding: 3mm 4mm; }
  .hall-field label { color: #166534; font-size: 10pt; }
  .hall-name { color: #14532d !important; font-size: 18pt !important; }
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
`;

async function printPacketLabel(opts: PrintLabelOpts) {
  const { packet } = opts;
  const [qrDataUrl, logoDataUrl] = await Promise.all([
    QRCode.toDataURL(packet.barcode, { width: 200, margin: 1, color: { dark: "#000000", light: "#ffffff" } }),
    toBase64DataUrl(amanahLogoUrl).catch(() => ""),
  ]);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><title>Packet Label – ${packet.barcode}</title>
<style>${LABEL_STYLES}</style></head>
<body>${buildLabelHtml(opts, qrDataUrl, logoDataUrl)}</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=650");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

async function printAllPacketLabels(items: PrintLabelOpts[]) {
  if (items.length === 0) return;
  const logoDataUrl = await toBase64DataUrl(amanahLogoUrl).catch(() => "");

  const labelBodies = await Promise.all(
    items.map(async (opts) => {
      const qrDataUrl = await QRCode.toDataURL(opts.packet.barcode, {
        width: 200, margin: 1, color: { dark: "#000000", light: "#ffffff" },
      });
      return buildLabelHtml(opts, qrDataUrl, logoDataUrl);
    })
  );

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><title>Bulk Packet Labels (${items.length})</title>
<style>${LABEL_STYLES}</style></head>
<body>${labelBodies.join("\n")}</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 600);
}

// ── Auto-Generate Dialog ──────────────────────────────────────────────────────

type GenStep = "configure" | "preview" | "generating" | "done";

interface SubjectCoverage {
  subjectId: number;
  subjectName: string;
  arabicName?: string | null;
  exists: boolean;
  packetId: number | null;
  barcode: string | null;
}

interface CenterCoverage {
  centerId: number;
  centerName: string;
  studentCount: number;
  subjects: SubjectCoverage[];
  existingCount: number;
  missingCount: number;
  total: number;
  complete: boolean;
  completionPercent: number;
}

interface CoverageSummary {
  centersComplete: number;
  centersPartial: number;
  centersEmpty: number;
  overallCoverage: number;
  totalRequired: number;
  totalExisting: number;
}

interface PreviewResult {
  previewOnly: true;
  examYearId: number;
  examYearName: string;
  grade: number;
  timetableBased: boolean;
  subjects: { id: number; name: string; arabicName?: string }[];
  eligibleCenters: { id: number; name: string; studentCount: number }[];
  centersWithNoStudents: { id: number; name: string }[];
  totalSubjects: number;
  totalCenters: number;
  existingPackets: number;
  wouldSkip: number;
  wouldCreate: number;
  totalExpected: number;
  warnings: string[];
  coverageMatrix: CenterCoverage[];
  coverageSummary: CoverageSummary;
}

interface GenResult {
  created: number;
  skipped: number;
  total: number;
  subjectCount: number;
  centerCount: number;
  timetableBased: boolean;
  grade: number;
  warnings: string[];
  centersWithNoStudents: { id: number; name: string }[];
  centersNowComplete: number;
  centersStillPartial: number;
  centersStillEmpty: number;
  totalRequired: number;
  totalCovered: number;
  coveragePercent: number;
  incompletecenters: { centerId: number; centerName: string; missingCount: number; missingSubjects: string[] }[];
}

const STEP_LABELS: Record<GenStep, string> = {
  configure: "Configure", preview: "Preview", generating: "Creating", done: "Done",
};

function AutoGenerateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState<GenStep>("configure");
  const [examYearId, setExamYearId] = useState<number>(0);
  const [grade, setGrade] = useState<number>(0);
  const [regionId, setRegionId] = useState<number>(0);
  const [bufferPercent, setBufferPercent] = useState(15);
  const [skipExisting, setSkipExisting] = useState(true);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<GenResult | null>(null);
  const [progress, setProgress] = useState(0);

  const { data: examYears = [] } = useQuery<ExamYear[]>({ queryKey: ["/api/exam-years"] });
  const { data: regions = [] } = useQuery<Region[]>({ queryKey: ["/api/regions"] });

  const selectedYear = (examYears as any[]).find((y: any) => y.id === examYearId);
  const yearGrades: number[] = selectedYear ? (selectedYear as any).grades ?? [] : [];

  // Auto-select grade when year changes and has exactly one grade
  useEffect(() => {
    if (yearGrades.length === 1) setGrade(yearGrades[0]);
    else if (yearGrades.length === 0) setGrade(0);
  }, [examYearId]);

  const resetDialog = () => {
    setStep("configure");
    setExamYearId(0);
    setGrade(0);
    setRegionId(0);
    setBufferPercent(15);
    setSkipExisting(true);
    setPreview(null);
    setResult(null);
    setProgress(0);
  };

  const handleClose = () => { resetDialog(); onClose(); };

  // Animated progress bar while generating
  useEffect(() => {
    if (step !== "generating") return;
    setProgress(5);
    const total = (preview?.wouldCreate ?? 20) * 80;
    const interval = Math.max(150, Math.min(total / 40, 600));
    const inc = 85 / (total / interval);
    const timer = setInterval(() => setProgress(p => Math.min(90, p + inc)), interval);
    return () => clearInterval(timer);
  }, [step]);

  const previewMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/exam-packets/auto-generate", {
      examYearId, grade, skipExisting, bufferPercent, regionId: regionId || null, previewOnly: true,
    }).then(r => r.json()),
    onSuccess: (data: PreviewResult) => { setPreview(data); setStep("preview"); },
    onError: (e: any) => toast({ title: "Validation failed", description: e.message, variant: "destructive" }),
  });

  const generateMutation = useMutation({
    mutationFn: () => {
      setStep("generating");
      return apiRequest("POST", "/api/exam-packets/auto-generate", {
        examYearId, grade, skipExisting, bufferPercent, regionId: regionId || null, previewOnly: false,
      }).then(r => r.json());
    },
    onSuccess: (data: GenResult) => {
      setProgress(100);
      setTimeout(() => { setResult(data); setStep("done"); }, 400);
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packet-events/dashboard/stats"] });
    },
    onError: (e: any) => {
      setStep("preview");
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    },
  });

  const stepOrder: GenStep[] = ["configure", "preview", "generating", "done"];
  const stepIdx = stepOrder.indexOf(step);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            Class-Based Packet Generation
          </DialogTitle>
          <DialogDescription>
            Generates packets for all subjects × all eligible centers for the selected examination class only.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 pb-1">
          {stepOrder.map((s, i) => (
            <div key={s} className="flex items-center gap-1 min-w-0">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                step === s
                  ? "bg-teal-600 text-white"
                  : stepIdx > i
                    ? "bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300"
                    : "bg-muted text-muted-foreground"
              }`}>{stepIdx > i ? "✓" : i + 1}</span>
              <span className={`text-xs truncate ${step === s ? "text-teal-700 dark:text-teal-300 font-semibold" : "text-muted-foreground"}`}>
                {STEP_LABELS[s]}
              </span>
              {i < stepOrder.length - 1 && <span className="text-muted-foreground text-xs mx-1 shrink-0">›</span>}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Configure ── */}
        {step === "configure" && (
          <div className="space-y-4 py-1">

            {/* Exam Year */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">
                Exam Year <span className="text-destructive">*</span>
              </label>
              <Select value={examYearId ? String(examYearId) : ""} onValueChange={v => { setExamYearId(Number(v)); setGrade(0); }}>
                <SelectTrigger data-testid="select-autogen-year">
                  <SelectValue placeholder="Select exam year…" />
                </SelectTrigger>
                <SelectContent>
                  {(examYears as any[]).map((y: any) => (
                    <SelectItem key={y.id} value={String(y.id)}>{y.year} — {y.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Examination Class */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-teal-600" />
                Examination Class <span className="text-destructive">*</span>
              </label>
              {!examYearId ? (
                <p className="text-sm text-muted-foreground italic py-1">Select an exam year first</p>
              ) : yearGrades.length === 0 ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-700 dark:text-amber-400 flex gap-2 items-start">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>This exam year has no grades configured. Edit the exam year to add grades.</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {yearGrades.map((g: number) => (
                    <Button
                      key={g}
                      type="button"
                      variant={grade === g ? "default" : "outline"}
                      onClick={() => setGrade(g)}
                      data-testid={`btn-grade-${g}`}
                      className={`min-w-[90px] ${grade === g ? "bg-teal-600 hover:bg-teal-700" : ""}`}
                    >
                      Grade {g}
                    </Button>
                  ))}
                </div>
              )}
              {grade > 0 && (
                <p className="text-xs text-teal-700 dark:text-teal-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Will create packets ONLY for Grade {grade} subjects and Grade {grade} centers
                </p>
              )}
            </div>

            {/* Region Scope */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Region Scope</label>
              <Select value={String(regionId)} onValueChange={v => setRegionId(Number(v))}>
                <SelectTrigger data-testid="select-autogen-region">
                  <SelectValue placeholder="All regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All regions (nationwide)</SelectItem>
                  {(regions as any[]).map((r: any) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {regionId ? "Generating for centers in selected region only" : "Generating for all regions nationwide"}
              </p>
            </div>

            {/* Paper Buffer */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">
                Paper Buffer: <span className="text-teal-600 font-bold">+{bufferPercent}%</span>
              </label>
              <p className="text-xs text-muted-foreground">
                Paper count = enrolled Grade {grade || "?"} students + {bufferPercent}% buffer, rounded to nearest 10
              </p>
              <div className="flex gap-2 flex-wrap">
                {[5, 10, 15, 20, 25].map(v => (
                  <Button key={v} type="button" size="sm"
                    variant={bufferPercent === v ? "default" : "outline"}
                    onClick={() => setBufferPercent(v)}
                  >{v}%</Button>
                ))}
              </div>
            </div>

            {/* Skip existing */}
            <div className="flex items-center gap-3 py-1 border rounded-md px-3">
              <input type="checkbox" id="skip-ex" checked={skipExisting}
                onChange={e => setSkipExisting(e.target.checked)}
                className="w-4 h-4 rounded" data-testid="checkbox-skip-existing"
              />
              <div>
                <label htmlFor="skip-ex" className="text-sm font-medium cursor-pointer">
                  Skip duplicate packets
                </label>
                <p className="text-xs text-muted-foreground">Packets that already exist for this year + grade will be skipped</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                disabled={!examYearId || !grade || previewMutation.isPending}
                onClick={() => previewMutation.mutate()}
                data-testid="button-validate-preview"
              >
                {previewMutation.isPending
                  ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Validating…</>
                  : <><Eye className="w-4 h-4 mr-2" />Validate &amp; Preview</>
                }
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Preview + Coverage Audit ── */}
        {step === "preview" && preview && (
          <div className="space-y-4 py-1">

            {/* Warnings */}
            {preview.warnings.length > 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-1.5">
                {preview.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Class + Year header */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border bg-teal-50 dark:bg-teal-950/30 p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Examination Class</p>
                <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">Grade {preview.grade}</p>
                <p className="text-xs text-muted-foreground truncate">{preview.examYearName}</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Subject Source</p>
                <p className="text-sm font-semibold">{preview.timetableBased ? "Published Timetable" : "All Grade Subjects"}</p>
                <p className="text-xs text-muted-foreground">{preview.timetableBased ? "Scheduled subjects only" : "No timetable published"}</p>
              </div>
            </div>

            {/* ── Packet Counts ── */}
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Packet Count</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-background rounded-sm p-2">
                  <p className="text-xl font-bold">{preview.totalExpected}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Total<br/>Required</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-sm p-2">
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{preview.existingPackets}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Already<br/>Exist</p>
                </div>
                <div className="bg-teal-50 dark:bg-teal-950/30 rounded-sm p-2">
                  <p className="text-xl font-bold text-teal-700 dark:text-teal-300">{preview.wouldCreate}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">To<br/>Create</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/30 rounded-sm p-2">
                  <p className="text-xl font-bold text-muted-foreground">{preview.wouldSkip}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Duplicate<br/>Skip</p>
                </div>
              </div>
              <div className="text-xs text-center text-muted-foreground">
                {preview.totalSubjects} subjects × {preview.totalCenters} centers = {preview.totalExpected} total packets
              </div>
            </div>

            {/* ── Coverage Audit ── */}
            {preview.coverageSummary && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Coverage Audit — Current State
                </p>

                {/* Summary chips */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-sm bg-emerald-50 dark:bg-emerald-950/30 p-2 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{preview.coverageSummary.centersComplete}</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-medium">Complete</p>
                    <p className="text-[10px] text-muted-foreground">all subjects</p>
                  </div>
                  <div className="rounded-sm bg-amber-50 dark:bg-amber-950/30 p-2 border border-amber-200 dark:border-amber-800">
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{preview.coverageSummary.centersPartial}</p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium">Partial</p>
                    <p className="text-[10px] text-muted-foreground">some missing</p>
                  </div>
                  <div className="rounded-sm bg-red-50 dark:bg-red-950/30 p-2 border border-red-200 dark:border-red-800">
                    <p className="text-lg font-bold text-red-700 dark:text-red-400">{preview.coverageSummary.centersEmpty}</p>
                    <p className="text-[10px] text-red-600 dark:text-red-500 font-medium">Not Started</p>
                    <p className="text-[10px] text-muted-foreground">0 packets</p>
                  </div>
                </div>

                {/* Overall coverage bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Overall coverage before generation</span>
                    <span className="font-semibold">{preview.coverageSummary.overallCoverage}%</span>
                  </div>
                  <Progress value={preview.coverageSummary.overallCoverage} className="h-2" />
                  <p className="text-[10px] text-muted-foreground">
                    {preview.coverageSummary.totalExisting} of {preview.coverageSummary.totalRequired} packets exist
                  </p>
                </div>

                {/* Per-center breakdown */}
                {preview.coverageMatrix.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Per-Center Status</p>
                    <div className="rounded-md border bg-background divide-y max-h-44 overflow-y-auto">
                      {preview.coverageMatrix.map(c => (
                        <div key={c.centerId} className="px-2.5 py-2">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-medium truncate">{c.centerName}</span>
                            <span className={`text-[10px] font-semibold shrink-0 ${
                              c.complete
                                ? "text-emerald-600 dark:text-emerald-400"
                                : c.existingCount > 0
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-red-600 dark:text-red-400"
                            }`}>
                              {c.existingCount}/{c.total}
                              {c.complete ? " ✓" : c.missingCount > 0 ? ` (${c.missingCount} missing)` : ""}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                c.complete
                                  ? "bg-emerald-500"
                                  : c.existingCount > 0
                                    ? "bg-amber-400"
                                    : "bg-red-400"
                              }`}
                              style={{ width: `${c.completionPercent}%` }}
                            />
                          </div>
                          {/* Show missing subjects inline for partial centers */}
                          {!c.complete && c.missingCount > 0 && c.missingCount <= 4 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Missing: {c.subjects.filter(s => !s.exists).map(s => s.subjectName).join(", ")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Centers excluded (no students of this grade) */}
            {preview.centersWithNoStudents.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Centers Excluded — No Grade {preview.grade} Students ({preview.centersWithNoStudents.length})
                </p>
                <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 divide-y max-h-24 overflow-y-auto text-xs">
                  {preview.centersWithNoStudents.map(c => (
                    <div key={c.id} className="px-3 py-1.5 text-amber-700 dark:text-amber-400">{c.name}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setStep("configure")}>
                <ChevronLeft className="w-4 h-4 mr-1" />Back
              </Button>
              <Button
                disabled={preview.wouldCreate === 0}
                onClick={() => generateMutation.mutate()}
                data-testid="button-confirm-auto-generate"
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {preview.wouldCreate === 0
                  ? "All Packets Exist"
                  : `Create ${preview.wouldCreate} Missing Packets`}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Generating ── */}
        {step === "generating" && (
          <div className="space-y-6 py-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-teal-600 animate-pulse" />
              </div>
              <div>
                <p className="text-lg font-semibold">Creating Packets…</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Grade {grade} — {preview?.wouldCreate} packets across {preview?.totalCenters} centers
                </p>
              </div>
            </div>
            <div className="space-y-2 px-4">
              <Progress value={progress} className="h-3" />
              <p className="text-xs text-muted-foreground">{Math.round(progress)}% complete — please wait…</p>
            </div>
          </div>
        )}

        {/* ── STEP 4: Done + Coverage Audit ── */}
        {step === "done" && result && (
          <div className="space-y-4 py-1">

            {/* Creation result */}
            <div className={`rounded-md border p-4 text-center space-y-1 ${
              result.coveragePercent === 100
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                : "bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800"
            }`}>
              <CheckCircle className="w-9 h-9 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="text-4xl font-bold text-emerald-700 dark:text-emerald-300">{result.created}</p>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                new packets created
              </p>
              <div className="flex justify-center gap-4 pt-1 text-xs text-muted-foreground">
                {result.skipped > 0 && <span>{result.skipped} duplicates skipped</span>}
                <span>{result.subjectCount} subjects · {result.centerCount} centers · Grade {result.grade}</span>
              </div>
            </div>

            {/* ── Post-generation Coverage Audit ── */}
            <div className="rounded-md border bg-muted/30 p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                Coverage After Generation
              </p>

              {/* Coverage bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Package Coverage</span>
                  <span className={result.coveragePercent === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                    {result.coveragePercent}%
                  </span>
                </div>
                <Progress value={result.coveragePercent} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  {result.totalCovered} of {result.totalRequired} subject×center combinations covered
                </p>
              </div>

              {/* Center status chips */}
              <div className="grid grid-cols-3 gap-2 text-center border-t pt-2">
                <div className="rounded-sm bg-emerald-50 dark:bg-emerald-950/30 p-2 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{result.centersNowComplete}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">Fully Covered</p>
                  <p className="text-[10px] text-muted-foreground">all subjects</p>
                </div>
                <div className={`rounded-sm p-2 border ${
                  result.centersStillPartial > 0
                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                    : "bg-muted/30 border-border"
                }`}>
                  <p className={`text-lg font-bold ${result.centersStillPartial > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                    {result.centersStillPartial}
                  </p>
                  <p className="text-[10px] font-semibold text-muted-foreground">Still Partial</p>
                  <p className="text-[10px] text-muted-foreground">some missing</p>
                </div>
                <div className={`rounded-sm p-2 border ${
                  result.centersStillEmpty > 0
                    ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                    : "bg-muted/30 border-border"
                }`}>
                  <p className={`text-lg font-bold ${result.centersStillEmpty > 0 ? "text-red-700 dark:text-red-400" : "text-muted-foreground"}`}>
                    {result.centersStillEmpty}
                  </p>
                  <p className="text-[10px] font-semibold text-muted-foreground">Not Covered</p>
                  <p className="text-[10px] text-muted-foreground">0 packets</p>
                </div>
              </div>

              {/* 100% coverage banner */}
              {result.coveragePercent === 100 && (
                <div className="rounded-md bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700 p-2.5 text-center">
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    100% Package Coverage Achieved
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Every center has all required subject packets
                  </p>
                </div>
              )}
            </div>

            {/* Incomplete centers detail */}
            {result.incompletecenters && result.incompletecenters.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Centers Still Incomplete ({result.incompletecenters.length})
                </p>
                <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 divide-y max-h-32 overflow-y-auto">
                  {result.incompletecenters.map(c => (
                    <div key={c.centerId} className="px-3 py-2 text-xs">
                      <div className="flex justify-between">
                        <span className="font-medium text-amber-800 dark:text-amber-300">{c.centerName}</span>
                        <span className="text-amber-600 dark:text-amber-400">{c.missingCount} missing</span>
                      </div>
                      {c.missingSubjects.length > 0 && (
                        <p className="text-muted-foreground mt-0.5 truncate">{c.missingSubjects.join(", ")}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notices */}
            {result.warnings.filter(w => !w.includes("skipped")).length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Notices</p>
                {result.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Each packet has a unique barcode and security seal. Print labels from the Packets table.
            </p>
            <div className="flex justify-end">
              <Button onClick={handleClose} data-testid="button-done-generate">Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

export default function PacketTracking() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [examYearFilter, setExamYearFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
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

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      for (const id of ids) {
        await apiRequest("DELETE", `/api/exam-packets/${id}`);
      }
    },
    onSuccess: () => {
      const count = selectedIds.size;
      toast({ title: `${count} packet${count !== 1 ? "s" : ""} deleted` });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packet-events/dashboard/stats"] });
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<any>({
    queryKey: ["/api/packet-events/dashboard/stats"],
    queryFn: () => apiRequest("GET", "/api/packet-events/dashboard/stats").then(r => r.json()),
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const { data: packets = [], isLoading: packetsLoading, dataUpdatedAt, refetch: refetchPackets } = useQuery<ExamPacket[]>({
    queryKey: ["/api/exam-packets"],
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const { data: subjects = [] } = useQuery<Subject[]>({ queryKey: ["/api/subjects"] });
  const { data: centers = [] } = useQuery<ExamCenter[]>({ queryKey: ["/api/centers"] });
  const { data: examYears = [] } = useQuery<ExamYear[]>({ queryKey: ["/api/exam-years"] });
  const { data: timetable = [] } = useQuery<ExamTimetable[]>({ queryKey: ["/api/timetable"] });
  const { data: regions = [] } = useQuery<Region[]>({ queryKey: ["/api/regions"] });
  const { data: clusters = [] } = useQuery<Cluster[]>({ queryKey: ["/api/clusters"] });
  const { data: allHalls = [] } = useQuery<CenterHallSimple[]>({ queryKey: ["/api/center-halls"] });

  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));
  const centerMap = Object.fromEntries(centers.map(c => [c.id, c.name]));
  const centerAddressMap = Object.fromEntries(centers.map(c => [c.id, c.address ?? ""]));
  const examYearMap = Object.fromEntries(examYears.map(y => [y.id, y.year]));
  const regionMap = Object.fromEntries(regions.map(r => [r.id, r.name]));
  const clusterMap = Object.fromEntries(clusters.map(c => [c.id, c.name]));
  const hallMap = Object.fromEntries(allHalls.map(h => [h.id, h.name]));

  // Build region/cluster from center data as fallback (center always carries its regionId/clusterId)
  const centerToRegionMap = Object.fromEntries(centers.map(c => [c.id, (c as any).regionId]));
  const centerToClusterMap = Object.fromEntries(centers.map(c => [c.id, (c as any).clusterId]));
  const availableGrades = Array.from(new Set(packets.map(p => p.grade))).sort((a, b) => a - b);
  // keyed by subjectId — last write wins if duplicates exist across years; prefer active exam year entry
  const timetableBySubject = Object.fromEntries(
    [...timetable].reverse().map(t => [t.subjectId, t])
  );

  // unique exam years that actually have packets
  const packetYearIds = useMemo(() => Array.from(new Set(packets.map(p => p.examYearId))).sort((a, b) => {
    const ya = examYears.find(y => y.id === a)?.year ?? 0;
    const yb = examYears.find(y => y.id === b)?.year ?? 0;
    return Number(yb) - Number(ya);
  }), [packets, examYears]);

  const filtered = packets.filter(p => {
    const matchSearch = !search
      || p.barcode.toLowerCase().includes(search.toLowerCase())
      || (subjectMap[p.subjectId] ?? "").toLowerCase().includes(search.toLowerCase())
      || (centerMap[p.destinationCenterId] ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchGrade = gradeFilter === "all" || String(p.grade) === gradeFilter;
    const matchRegion = regionFilter === "all" || String(p.destinationRegionId) === regionFilter;
    const matchYear = examYearFilter === "all" || String(p.examYearId) === examYearFilter;
    return matchSearch && matchStatus && matchGrade && matchRegion && matchYear;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedPackets = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset to page 1 when any filter changes
  useEffect(() => { setCurrentPage(1); setSelectedIds(new Set()); }, [search, statusFilter, gradeFilter, regionFilter, examYearFilter]);

  // Helper: toggle selection
  const toggleSelect = (id: number) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const isAllPageSelected = paginatedPackets.length > 0 && paginatedPackets.every(p => selectedIds.has(p.id));
  const toggleSelectAll = () => {
    if (isAllPageSelected) {
      setSelectedIds(prev => { const next = new Set(prev); paginatedPackets.forEach(p => next.delete(p.id)); return next; });
    } else {
      setSelectedIds(prev => { const next = new Set(prev); paginatedPackets.forEach(p => next.add(p.id)); return next; });
    }
  };

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

      {/* Exam Year Selector */}
      {packetYearIds.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Exam Year
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={examYearFilter === "all" ? "default" : "outline"}
              onClick={() => setExamYearFilter("all")}
              data-testid="button-year-filter-all"
            >
              All Years
              <span className="ml-1.5 text-xs opacity-75">({packets.length})</span>
            </Button>
            {packetYearIds.map(yId => {
              const yearLabel = examYearMap[yId] ? String(examYearMap[yId]) : `Year ${yId}`;
              const count = packets.filter(p => p.examYearId === yId).length;
              return (
                <Button
                  key={yId}
                  size="sm"
                  variant={examYearFilter === String(yId) ? "default" : "outline"}
                  onClick={() => setExamYearFilter(String(yId))}
                  data-testid={`button-year-filter-${yId}`}
                >
                  {yearLabel}
                  <span className="ml-1.5 text-xs opacity-75">({count})</span>
                </Button>
              );
            })}
          </div>
          {examYearFilter !== "all" && (
            <p className="text-xs text-muted-foreground">
              Showing packets for exam year <strong>{examYearMap[Number(examYearFilter)] ?? examYearFilter}</strong>.{" "}
              <button
                type="button"
                className="underline text-teal-600 dark:text-teal-400 hover:no-underline"
                onClick={() => setExamYearFilter("all")}
              >
                Show all years
              </button>
            </p>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="packets">
        <TabsList>
          <TabsTrigger value="packets" data-testid="tab-packets">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            Packets
          </TabsTrigger>
          <TabsTrigger value="byhall" data-testid="tab-byhall">
            <MapPin className="w-3.5 h-3.5 mr-1.5" />
            By Hall
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
            <div className="flex items-center gap-2 flex-wrap">
              {dataUpdatedAt > 0 && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Updated {new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
              {filtered.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteAllConfirm(true)}
                  data-testid="button-delete-all"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete All ({filtered.length})
                </Button>
              )}
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  data-testid="button-bulk-delete"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete Selected ({selectedIds.size})
                </Button>
              )}
              {filtered.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={packetsLoading}
                  onClick={() => {
                    const items: PrintLabelOpts[] = filtered.map(p => {
                      const rId = p.destinationRegionId ?? centerToRegionMap[p.destinationCenterId];
                      const cId = p.destinationClusterId ?? centerToClusterMap[p.destinationCenterId];
                      const hId = (p as any).hallId;
                      const tt = timetableBySubject[p.subjectId];
                      return {
                        packet: p,
                        subjectName: subjectMap[p.subjectId] ?? `Subject ${p.subjectId}`,
                        centerName: centerMap[p.destinationCenterId] ?? `Center ${p.destinationCenterId}`,
                        centerAddress: centerAddressMap[p.destinationCenterId] || undefined,
                        examYearLabel: examYearMap[p.examYearId] ? String(examYearMap[p.examYearId]) : `Year ${p.examYearId}`,
                        examDate: tt?.examDate ?? undefined,
                        startTime: tt?.startTime ?? undefined,
                        endTime: tt?.endTime ?? undefined,
                        regionName: rId ? regionMap[rId] : undefined,
                        clusterName: cId ? clusterMap[cId] : undefined,
                        hallName: hId ? hallMap[hId] : undefined,
                      };
                    });
                    printAllPacketLabels(items);
                  }}
                  data-testid="button-print-all-labels"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Print All ({filtered.length})
                </Button>
              )}
              <Button variant="outline" size="icon" disabled={packetsLoading} onClick={() => {
                refetchPackets();
                refetchStats();
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
                    <TableHead className="w-8">
                      <Checkbox
                        checked={isAllPageSelected}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all"
                        aria-label="Select all on page"
                      />
                    </TableHead>
                    <TableHead>Barcode</TableHead>
                    {examYearFilter === "all" && <TableHead>Year</TableHead>}
                    <TableHead>Grade</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Cluster</TableHead>
                    <TableHead>Center</TableHead>
                    <TableHead>Hall</TableHead>
                    <TableHead>Papers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packetsLoading && [1,2,3,4,5].map(i => (
                    <TableRow key={i}>
                      {[1,2,3,4,5,6,7,8,9,10,11].map(j => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))}
                  {!packetsLoading && filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-muted-foreground py-10">
                        {packets.length === 0 ? "No packets created yet." : "No packets match your search."}
                      </TableCell>
                    </TableRow>
                  )}
                  {paginatedPackets.map(p => {
                    const regionId = p.destinationRegionId ?? centerToRegionMap[p.destinationCenterId];
                    const clusterId = p.destinationClusterId ?? centerToClusterMap[p.destinationCenterId];
                    const regionLabel = regionId ? (regionMap[regionId] ?? `Region ${regionId}`) : "—";
                    const clusterLabel = clusterId ? (clusterMap[clusterId] ?? `Cluster ${clusterId}`) : "—";
                    const hallId = (p as any).hallId;
                    const hallLabel = hallId ? (hallMap[hallId] ?? `Hall ${hallId}`) : "—";
                    return (
                    <TableRow key={p.id} data-testid={`row-packet-${p.id}`} className={selectedIds.has(p.id) ? "bg-muted/40" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(p.id)}
                          onCheckedChange={() => toggleSelect(p.id)}
                          data-testid={`checkbox-packet-${p.id}`}
                          aria-label={`Select packet ${p.barcode}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{p.barcode}</TableCell>
                      {examYearFilter === "all" && (
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {examYearMap[p.examYearId] ?? `#${p.examYearId}`}
                        </TableCell>
                      )}
                      <TableCell>Grade {p.grade}</TableCell>
                      <TableCell className="text-sm">{subjectMap[p.subjectId] ?? `#${p.subjectId}`}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{regionLabel}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{clusterLabel}</TableCell>
                      <TableCell className="text-sm">{centerMap[p.destinationCenterId] ?? `#${p.destinationCenterId}`}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{hallLabel}</TableCell>
                      <TableCell>{p.paperCount}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const tt = timetableBySubject[p.subjectId];
                              printPacketLabel({
                                packet: p,
                                subjectName: subjectMap[p.subjectId] ?? `Subject ${p.subjectId}`,
                                centerName: centerMap[p.destinationCenterId] ?? `Center ${p.destinationCenterId}`,
                                centerAddress: centerAddressMap[p.destinationCenterId] || undefined,
                                examYearLabel: examYearMap[p.examYearId] ? String(examYearMap[p.examYearId]) : `Year ${p.examYearId}`,
                                examDate: tt?.examDate ?? undefined,
                                startTime: tt?.startTime ?? undefined,
                                endTime: tt?.endTime ?? undefined,
                                regionName: regionId ? regionMap[regionId] : undefined,
                                clusterName: clusterId ? clusterMap[clusterId] : undefined,
                                hallName: hallId ? hallMap[hallId] : undefined,
                              });
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
                  ); })}
                </TableBody>
              </Table>
            </div>
          </Card>
          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <p className="text-xs text-muted-foreground">
                {filtered.length === packets.length
                  ? `${filtered.length} packet${filtered.length !== 1 ? "s" : ""} total`
                  : `${filtered.length} of ${packets.length} packets`}
                {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(pg => pg === 1 || pg === totalPages || Math.abs(pg - currentPage) <= 2)
                    .reduce<(number | "…")[]>((acc, pg, idx, arr) => {
                      if (idx > 0 && pg - (arr[idx - 1] as number) > 1) acc.push("…");
                      acc.push(pg);
                      return acc;
                    }, [])
                    .map((pg, i) =>
                      pg === "…"
                        ? <span key={`ellipsis-${i}`} className="px-1.5 text-muted-foreground text-sm">…</span>
                        : <Button
                            key={pg}
                            variant={currentPage === pg ? "default" : "outline"}
                            size="sm"
                            className="min-w-8"
                            onClick={() => setCurrentPage(pg as number)}
                            data-testid={`button-page-${pg}`}
                          >
                            {pg}
                          </Button>
                    )
                  }
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-1">
                    Page {currentPage} of {totalPages} · {PAGE_SIZE} per page
                  </span>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* By Hall tab */}
        <TabsContent value="byhall" className="mt-4 space-y-4">
          {packetsLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              {packets.length === 0 ? "No packets created yet." : "No packets match your filters."}
            </div>
          ) : (() => {
            // Group packets by center, then by hall
            const byCenterHall: Record<number, Record<string, ExamPacket[]>> = {};
            for (const p of filtered) {
              const cId = p.destinationCenterId;
              const hKey = (p as any).hallId ? String((p as any).hallId) : "__none__";
              if (!byCenterHall[cId]) byCenterHall[cId] = {};
              if (!byCenterHall[cId][hKey]) byCenterHall[cId][hKey] = [];
              byCenterHall[cId][hKey].push(p);
            }
            const centerIds = Object.keys(byCenterHall).map(Number).sort((a, b) => {
              return (centerMap[a] ?? "").localeCompare(centerMap[b] ?? "");
            });
            return centerIds.map(cId => {
              const rId = centerToRegionMap[cId];
              const clId = centerToClusterMap[cId];
              const hallGroups = byCenterHall[cId];
              const hallKeys = Object.keys(hallGroups).sort((a, b) => {
                if (a === "__none__") return 1;
                if (b === "__none__") return -1;
                return (hallMap[Number(a)] ?? "").localeCompare(hallMap[Number(b)] ?? "");
              });
              const totalForCenter = hallKeys.reduce((s, k) => s + hallGroups[k].length, 0);
              return (
                <Card key={cId} data-testid={`card-center-halls-${cId}`}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-teal-600 shrink-0" />
                          {centerMap[cId] ?? `Center ${cId}`}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {rId ? regionMap[rId] : "—"}
                          {clId ? ` › ${clusterMap[clId]}` : ""}
                        </p>
                      </div>
                      <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-md">
                        {totalForCenter} packet{totalForCenter !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {hallKeys.map(hKey => {
                      const hPackets = hallGroups[hKey];
                      const hId = hKey === "__none__" ? null : Number(hKey);
                      const hName = hId ? (hallMap[hId] ?? `Hall ${hId}`) : null;
                      const statusCounts = hPackets.reduce((acc, p) => {
                        acc[p.status] = (acc[p.status] ?? 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      return (
                        <div key={hKey} className="rounded-md border bg-muted/20 p-3" data-testid={`hall-group-${cId}-${hKey}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-semibold text-sm">
                                {hName ?? <span className="italic text-muted-foreground">No Hall Assigned</span>}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                              {Object.entries(statusCounts).map(([st, cnt]) => (
                                <span
                                  key={st}
                                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium ${STATUS_CFG[st]?.color ?? "bg-slate-100 text-slate-700"}`}
                                >
                                  {cnt} {STATUS_CFG[st]?.label ?? st}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {hPackets.map(p => (
                              <div
                                key={p.id}
                                className="flex items-center gap-1.5 bg-background rounded px-2 py-1 text-xs border"
                                data-testid={`hall-packet-${p.id}`}
                              >
                                <span className="font-mono text-muted-foreground">{p.barcode.slice(-8)}</span>
                                <span className="text-foreground font-medium">{subjectMap[p.subjectId] ?? `#${p.subjectId}`}</span>
                                <StatusBadge status={p.status} />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 px-1 text-[10px]"
                                  onClick={() => {
                                    const rId2 = p.destinationRegionId ?? centerToRegionMap[p.destinationCenterId];
                                    const cId2 = p.destinationClusterId ?? centerToClusterMap[p.destinationCenterId];
                                    const tt = timetableBySubject[p.subjectId];
                                    printPacketLabel({
                                      packet: p,
                                      subjectName: subjectMap[p.subjectId] ?? `Subject ${p.subjectId}`,
                                      centerName: centerMap[p.destinationCenterId] ?? `Center ${p.destinationCenterId}`,
                                      centerAddress: centerAddressMap[p.destinationCenterId] || undefined,
                                      examYearLabel: examYearMap[p.examYearId] ? String(examYearMap[p.examYearId]) : `Year ${p.examYearId}`,
                                      examDate: tt?.examDate ?? undefined,
                                      startTime: tt?.startTime ?? undefined,
                                      endTime: tt?.endTime ?? undefined,
                                      regionName: rId2 ? regionMap[rId2] : undefined,
                                      clusterName: cId2 ? clusterMap[cId2] : undefined,
                                      hallName: hId ? hallMap[hId] : undefined,
                                    });
                                  }}
                                  data-testid={`button-hall-print-${p.id}`}
                                >
                                  <Printer className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          {hId && (
                            <div className="mt-2 flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => {
                                  const items: PrintLabelOpts[] = hPackets.map(p => {
                                    const rId2 = p.destinationRegionId ?? centerToRegionMap[p.destinationCenterId];
                                    const cId2 = p.destinationClusterId ?? centerToClusterMap[p.destinationCenterId];
                                    const tt = timetableBySubject[p.subjectId];
                                    return {
                                      packet: p,
                                      subjectName: subjectMap[p.subjectId] ?? `Subject ${p.subjectId}`,
                                      centerName: centerMap[p.destinationCenterId] ?? `Center ${p.destinationCenterId}`,
                                      centerAddress: centerAddressMap[p.destinationCenterId] || undefined,
                                      examYearLabel: examYearMap[p.examYearId] ? String(examYearMap[p.examYearId]) : `Year ${p.examYearId}`,
                                      examDate: tt?.examDate ?? undefined,
                                      startTime: tt?.startTime ?? undefined,
                                      endTime: tt?.endTime ?? undefined,
                                      regionName: rId2 ? regionMap[rId2] : undefined,
                                      clusterName: cId2 ? clusterMap[cId2] : undefined,
                                      hallName: hallMap[hId] ?? undefined,
                                    };
                                  });
                                  printAllPacketLabels(items);
                                }}
                                data-testid={`button-print-hall-all-${hId}`}
                              >
                                <Printer className="w-3 h-3 mr-1" />
                                Print Hall Labels ({hPackets.length})
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            });
          })()}
        </TabsContent>

        {/* Chain of Custody tab */}
        <TabsContent value="custody" className="mt-4">
          <ChainOfCustodyTab onViewTimeline={setTimelineBarcode} />
        </TabsContent>
      </Tabs>

      {showCreate && <CreatePacketDialog open={showCreate} onClose={() => setShowCreate(false)} />}
      {showAutoGenerate && <AutoGenerateDialog open={showAutoGenerate} onClose={() => setShowAutoGenerate(false)} />}
      {timelineBarcode && <TimelineModal barcode={timelineBarcode} onClose={() => setTimelineBarcode(null)} />}

      {/* Delete All confirmation */}
      <Dialog open={showDeleteAllConfirm} onOpenChange={() => setShowDeleteAllConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Delete All {filtered.length} Packet{filtered.length !== 1 ? "s" : ""}
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all {filtered.length} packet{filtered.length !== 1 ? "s" : ""} currently shown (matching your active filters) and all their event history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeleteAllConfirm(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={bulkDeleteMutation.isPending}
              onClick={() => {
                bulkDeleteMutation.mutate(filtered.map(p => p.id), {
                  onSuccess: () => {
                    setShowDeleteAllConfirm(false);
                    setSelectedIds(new Set());
                  },
                });
              }}
              data-testid="button-confirm-delete-all"
            >
              {bulkDeleteMutation.isPending ? "Deleting…" : `Delete ${filtered.length} Packet${filtered.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirmation */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={() => setShowBulkDeleteConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Delete {selectedIds.size} Packet{selectedIds.size !== 1 ? "s" : ""}
            </DialogTitle>
            <DialogDescription>
              This will permanently delete {selectedIds.size} selected packet{selectedIds.size !== 1 ? "s" : ""} and all their event history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={bulkDeleteMutation.isPending}
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
              data-testid="button-confirm-bulk-delete"
            >
              {bulkDeleteMutation.isPending ? `Deleting…` : `Delete ${selectedIds.size} Packet${selectedIds.size !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
