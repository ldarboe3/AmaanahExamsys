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
  Eye, BarChart3, QrCode, Printer,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import QRCode from "qrcode";
import type { ExamPacket, ExamYear, Subject, ExamCenter } from "@shared/schema";

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
  const { data: examYears = [] } = useQuery<ExamYear[]>({ queryKey: ["/api/exam-years"] });
  const { data: subjects = [] } = useQuery<Subject[]>({ queryKey: ["/api/subjects"] });
  const { data: centers = [] } = useQuery<ExamCenter[]>({ queryKey: ["/api/centers"] });

  const form = useForm<PacketFormData>({
    resolver: zodResolver(packetFormSchema),
    defaultValues: {
      examYearId: 0, subjectId: 0, grade: 6,
      destinationCenterId: 0, paperCount: 0,
      securitySealNumber: generateSealNumber(),
    },
  });

  const mutation = useMutation({
    mutationFn: (data: PacketFormData) => apiRequest("POST", "/api/exam-packets", data),
    onSuccess: () => {
      toast({ title: "Packet created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packet-events/dashboard/stats"] });
      form.reset();
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Exam Packet</DialogTitle>
          <DialogDescription>Register a new exam paper packet for tracking.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
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
                  <Select onValueChange={field.onChange} value={String(field.value)}>
                    <FormControl><SelectTrigger data-testid="select-grade"><SelectValue placeholder="Grade" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {[4,5,6,7,8,9,10,11,12].map(g => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="subjectId" render={({ field }) => (
              <FormItem>
                <FormLabel>Subject</FormLabel>
                <Select onValueChange={field.onChange} value={String(field.value)}>
                  <FormControl><SelectTrigger data-testid="select-subject"><SelectValue placeholder="Select subject" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="destinationCenterId" render={({ field }) => (
              <FormItem>
                <FormLabel>Destination Center</FormLabel>
                <Select onValueChange={field.onChange} value={String(field.value)}>
                  <FormControl><SelectTrigger data-testid="select-center"><SelectValue placeholder="Select center" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {centers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
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

async function printPacketLabel(
  packet: ExamPacket,
  subjectName: string,
  centerName: string,
  examYearLabel: string,
) {
  const qrDataUrl = await QRCode.toDataURL(packet.barcode, {
    width: 200,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const statusLabel = (STATUS_CFG[packet.status]?.label ?? packet.status);
  const printDate = new Date().toLocaleString();

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Packet Label – ${packet.barcode}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; color: #111; }
    @page { size: A5 landscape; margin: 10mm; }
    .label {
      width: 190mm; min-height: 118mm;
      border: 2px solid #0d9488; border-radius: 6px;
      padding: 10mm; display: flex; flex-direction: column; gap: 6mm;
    }
    .header {
      display: flex; align-items: center; justify-content: space-between;
      border-bottom: 1.5px solid #0d9488; padding-bottom: 4mm;
    }
    .org-name { font-size: 16pt; font-weight: 900; color: #0d9488; letter-spacing: 0.5px; }
    .org-sub  { font-size: 8pt; color: #555; margin-top: 1mm; }
    .title-badge {
      background: #0d9488; color: #fff;
      font-size: 9pt; font-weight: 700;
      padding: 3px 10px; border-radius: 4px;
    }
    .body { display: flex; gap: 8mm; flex: 1; }
    .details { flex: 1; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 6mm; }
    .field label { font-size: 7pt; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
    .field p { font-size: 10pt; font-weight: 700; color: #111; margin-top: 1px; }
    .field p.mono { font-family: 'Courier New', monospace; font-size: 9pt; }
    .qr-block { display: flex; flex-direction: column; align-items: center; gap: 2mm; }
    .qr-block img { width: 38mm; height: 38mm; border: 1px solid #e5e7eb; border-radius: 4px; }
    .qr-label { font-size: 7pt; color: #555; text-align: center; max-width: 40mm; }
    .barcode-strip {
      background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 4px;
      padding: 3mm 4mm; text-align: center;
    }
    .barcode-strip .bc-text { font-family: 'Courier New', monospace; font-size: 13pt; font-weight: 900; letter-spacing: 2px; color: #0d9488; }
    .barcode-strip .bc-hint { font-size: 7pt; color: #888; margin-top: 1mm; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 3mm; display: flex; justify-content: space-between; align-items: center; }
    .footer p { font-size: 7pt; color: #aaa; }
    .status-badge {
      display: inline-block; background: #d1fae5; color: #065f46;
      font-size: 8pt; font-weight: 700; padding: 2px 8px; border-radius: 20px;
    }
  </style>
</head>
<body>
<div class="label">
  <div class="header">
    <div>
      <div class="org-name">AMAANAH</div>
      <div class="org-sub">Examination Management System &nbsp;|&nbsp; ${examYearLabel}</div>
    </div>
    <div class="title-badge">EXAM PAPER PACKET</div>
  </div>

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

// ── Main Component ────────────────────────────────────────────────────────────

export default function PacketTracking() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [timelineBarcode, setTimelineBarcode] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/packet-events/dashboard/stats"],
    queryFn: () => apiRequest("GET", "/api/packet-events/dashboard/stats").then(r => r.json()),
  });

  const { data: packets = [], isLoading: packetsLoading } = useQuery<ExamPacket[]>({
    queryKey: ["/api/exam-packets"],
  });

  const { data: subjects = [] } = useQuery<Subject[]>({ queryKey: ["/api/subjects"] });
  const { data: centers = [] } = useQuery<ExamCenter[]>({ queryKey: ["/api/centers"] });
  const { data: examYears = [] } = useQuery<ExamYear[]>({ queryKey: ["/api/exam-years"] });

  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));
  const centerMap = Object.fromEntries(centers.map(c => [c.id, c.name]));
  const examYearMap = Object.fromEntries(examYears.map(y => [y.id, y.year]));

  const filtered = packets.filter(p => {
    const matchSearch = !search
      || p.barcode.toLowerCase().includes(search.toLowerCase())
      || (subjectMap[p.subjectId] ?? "").toLowerCase().includes(search.toLowerCase())
      || (centerMap[p.destinationCenterId] ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
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
          <Button variant="outline" onClick={() => navigate("/mobile-packet-scan")} data-testid="button-open-mobile-scanner">
            <Smartphone className="w-4 h-4 mr-2" />
            Mobile Scanner
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
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm text-teal-900 dark:text-teal-100">Field operations use the Mobile Scanner</p>
              <p className="text-xs text-teal-700 dark:text-teal-300 mt-0.5">
                All dispatching, receiving, opening, and sealing actions are performed on the mobile interface.
                This dashboard is for monitoring and oversight only.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/mobile-packet-scan")} data-testid="button-mobile-scanner-notice">
            <QrCode className="w-3.5 h-3.5 mr-1.5" />
            Open Scanner
          </Button>
        </CardContent>
      </Card>

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
              <SelectTrigger className="w-44" data-testid="select-status-filter">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(STATUS_CFG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/exam-packets"] });
              queryClient.invalidateQueries({ queryKey: ["/api/packet-events/dashboard/stats"] });
            }} data-testid="button-refresh-packets">
              <RefreshCw className="w-4 h-4" />
            </Button>
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
                            onClick={() => printPacketLabel(
                              p,
                              subjectMap[p.subjectId] ?? `Subject ${p.subjectId}`,
                              centerMap[p.destinationCenterId] ?? `Center ${p.destinationCenterId}`,
                              examYearMap[p.examYearId] ? String(examYearMap[p.examYearId]) : `Year ${p.examYearId}`,
                            )}
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
      {timelineBarcode && <TimelineModal barcode={timelineBarcode} onClose={() => setTimelineBarcode(null)} />}
    </div>
  );
}
