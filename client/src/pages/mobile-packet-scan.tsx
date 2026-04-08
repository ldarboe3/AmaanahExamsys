import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  QrCode, Wifi, WifiOff, RefreshCw, CheckCircle, AlertTriangle,
  Package, Truck, Building2, Lock, ArrowLeft, Clock, MapPin,
  ChevronLeft, Upload, Trash2, BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

// ── IndexedDB offline queue ───────────────────────────────────────────────────

const DB_NAME = "amaanah_packets";
const STORE_NAME = "offline_events";

async function getOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "clientEventId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveOfflineEvent(event: OfflineEvent): Promise<void> {
  const db = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(event);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllOfflineEvents(): Promise<OfflineEvent[]> {
  const db = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteOfflineEvent(clientEventId: string): Promise<void> {
  const db = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(clientEventId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearAllOfflineEvents(): Promise<void> {
  const db = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface OfflineEvent {
  clientEventId: string;
  packetId: number;
  eventType: string;
  barcode: string;
  sealNumber?: string;
  notes?: string;
  gpsLatitude?: string;
  gpsLongitude?: string;
  deviceId?: string;
  eventTime: string;
  savedAt: string;
}

interface PacketInfo {
  id: number;
  barcode: string;
  status: string;
  grade: number;
  paperCount: number;
  subjectId: number;
  destinationCenterId: number;
}

// ── Event type config per role ────────────────────────────────────────────────

const ALL_ACTIONS: Record<string, { type: string; label: string; icon: typeof Package; requiresSeal?: boolean }> = {
  packed:            { type: "packed",            label: "Mark as Packed",        icon: Package },
  dispatched_region: { type: "dispatched",        label: "Dispatch to Region",    icon: Truck },
  dispatched_cluster:{ type: "dispatched",        label: "Dispatch to Cluster",   icon: Truck },
  dispatched_center: { type: "dispatched",        label: "Dispatch to Center",    icon: Truck },
  received_region:   { type: "received",          label: "Receive at Region",     icon: Building2 },
  received_cluster:  { type: "received",          label: "Receive at Cluster",    icon: Building2 },
  received_center:   { type: "received",          label: "Receive at Center",     icon: Building2 },
  opened:            { type: "opened",            label: "Open Packet",           icon: Package },
  sealed:            { type: "sealed",            label: "Seal Packet",           icon: Lock, requiresSeal: true },
  return_to_cluster: { type: "return_dispatched", label: "Return to Cluster",     icon: ArrowLeft },
  return_to_region:  { type: "return_dispatched", label: "Return to Region",      icon: ArrowLeft },
  return_to_hq:      { type: "return_dispatched", label: "Return to HQ",          icon: ArrowLeft },
  return_received:   { type: "return_received",   label: "Return Received at HQ", icon: ArrowLeft },
  archived:          { type: "archived",           label: "Archive",               icon: CheckCircle },
};

// Which action key is valid for a given packet status (status → action key)
const STATUS_ACTION_MAP: Record<string, string> = {
  created:              "packed",
  packed:               "dispatched_region",
  dispatched_to_region: "received_region",
  at_region:            "dispatched_cluster",
  dispatched_to_cluster:"received_cluster",
  at_cluster:           "dispatched_center",
  dispatched_to_center: "received_center",
  at_center:            "opened",
  opened:               "sealed",
  administered:         "sealed",
  sealed:               "return_to_cluster",
  returned_to_cluster:  "return_to_region",
  returned_to_region:   "return_to_hq",
  returned_to_hq:       "return_received",
  completed:            "archived",
};

// Role gating: which event types each role is allowed to perform
const ROLE_ALLOWED_EVENT_TYPES: Record<string, string[]> = {
  super_admin:        ["packed","dispatched","received","opened","sealed","return_dispatched","return_received","archived"],
  examination_admin:  ["packed","dispatched","return_received","archived"],
  regional_logistics: ["received","dispatched","return_received","return_dispatched"],
  cluster_logistics:  ["received","dispatched","return_received","return_dispatched"],
  examiner:           ["received","opened","sealed","return_dispatched"],
};

const STATUS_COLORS: Record<string, string> = {
  created: "bg-slate-100 text-slate-700",
  packed: "bg-blue-100 text-blue-700",
  dispatched_to_region: "bg-orange-100 text-orange-700",
  at_region: "bg-teal-100 text-teal-700",
  dispatched_to_cluster: "bg-orange-100 text-orange-700",
  at_cluster: "bg-teal-100 text-teal-700",
  dispatched_to_center: "bg-orange-100 text-orange-700",
  at_center: "bg-green-100 text-green-700",
  opened: "bg-purple-100 text-purple-700",
  administered: "bg-purple-100 text-purple-700",
  sealed: "bg-emerald-100 text-emerald-700",
  returned_to_cluster: "bg-cyan-100 text-cyan-700",
  returned_to_region: "bg-cyan-100 text-cyan-700",
  returned_to_hq: "bg-cyan-100 text-cyan-700",
  completed: "bg-green-100 text-green-700",
  missing: "bg-red-100 text-red-700",
  damaged: "bg-red-100 text-red-700",
};

function statusLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ── GPS helper ────────────────────────────────────────────────────────────────

function getGPS(): Promise<{ lat: string; lng: string } | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: String(p.coords.latitude), lng: String(p.coords.longitude) }),
      () => resolve(null),
      { timeout: 5000 }
    );
  });
}

// ── Action confirm dialog ─────────────────────────────────────────────────────

interface ActionDialogProps {
  packet: PacketInfo;
  action: { type: string; label: string; requiresSeal?: boolean };
  onConfirm: (opts: { sealNumber?: string; notes?: string }) => void;
  onClose: () => void;
  isPending: boolean;
}

function ActionDialog({ packet, action, onConfirm, onClose, isPending }: ActionDialogProps) {
  const [sealNumber, setSealNumber] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>{action.label}</DialogTitle>
          <DialogDescription>
            Packet: <span className="font-mono font-medium">{packet.barcode}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-muted/40 text-sm space-y-1">
            <p><span className="text-muted-foreground">Grade: </span><strong>Grade {packet.grade}</strong></p>
            <p><span className="text-muted-foreground">Papers: </span><strong>{packet.paperCount}</strong></p>
            <p className="flex items-center gap-1">
              <span className="text-muted-foreground">Status: </span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[packet.status] ?? "bg-slate-100 text-slate-700"}`}>
                {statusLabel(packet.status)}
              </span>
            </p>
          </div>
          {action.requiresSeal && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Seal Number <span className="text-destructive">*</span></label>
              <Input
                placeholder="Enter seal number"
                value={sealNumber}
                onChange={e => setSealNumber(e.target.value)}
                data-testid="input-seal-number"
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Notes (optional)</label>
            <Input
              placeholder="Add any notes…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              data-testid="input-event-notes"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => onConfirm({ sealNumber: sealNumber || undefined, notes: notes || undefined })}
              disabled={isPending || (action.requiresSeal && !sealNumber)}
              data-testid="button-confirm-action"
            >
              {isPending ? "Recording…" : "Confirm"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MobilePacketScan() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const barcodeRef = useRef<HTMLInputElement>(null);

  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedPacket, setScannedPacket] = useState<PacketInfo | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  type ActionConfig = { type: string; label: string; icon: typeof Package; requiresSeal?: boolean };
  const [selectedAction, setSelectedAction] = useState<ActionConfig | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<OfflineEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [recentScans, setRecentScans] = useState<{ barcode: string; action: string; time: string }[]>([]);

  // Current user
  const { data: me } = useQuery<any>({ queryKey: ["/api/auth/user"] });

  const userRole: string = me?.role ?? "examiner";
  const allowedEventTypes = ROLE_ALLOWED_EVENT_TYPES[userRole] ?? ROLE_ALLOWED_EVENT_TYPES["examiner"];

  // Compute the single next action valid for the scanned packet's current status,
  // filtered by whether the logged-in user's role is allowed to perform it.
  const packetNextAction = scannedPacket
    ? (() => {
        const actionKey = STATUS_ACTION_MAP[scannedPacket.status];
        if (!actionKey) return null;
        const actionCfg = ALL_ACTIONS[actionKey];
        if (!actionCfg) return null;
        return allowedEventTypes.includes(actionCfg.type) ? actionCfg : null;
      })()
    : null;

  // Packet stats
  const { data: stats } = useQuery<{
    total: number; packed: number; inTransit: number; atLocation: number;
    opened: number; administered: number; sealed: number; returned: number; missing: number;
  }>({
    queryKey: ["/api/packet-events/dashboard/stats"],
    queryFn: () => apiRequest("GET", "/api/packet-events/dashboard/stats").then(r => r.json()),
    refetchInterval: 60000,
  });

  // Online/offline detection
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

  // Load offline queue on mount
  useEffect(() => {
    getAllOfflineEvents().then(setOfflineQueue).catch(() => {});
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncOfflineEvents();
    }
  }, [isOnline]);

  // Focus barcode input on mount
  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  const lookupMutation = useMutation({
    mutationFn: (barcode: string) =>
      apiRequest("GET", `/api/exam-packets/barcode/${barcode}`).then(async r => {
        if (!r.ok) throw new Error("Packet not found");
        return r.json();
      }),
    onSuccess: (packet) => {
      setScannedPacket(packet);
      setScanError(null);
    },
    onError: (e: any) => {
      setScannedPacket(null);
      setScanError(e.message ?? "Packet not found");
    },
  });

  const recordEventMutation = useMutation({
    mutationFn: (event: any) => apiRequest("POST", "/api/packet-events", event).then(r => r.json()),
    onSuccess: (_, vars) => {
      const actionCfg = Object.values(ALL_ACTIONS).find(a => a.type === vars.eventType);
      toast({ title: "Event recorded", description: actionCfg?.label ?? vars.eventType });
      setRecentScans(prev => [
        { barcode: scannedPacket!.barcode, action: actionCfg?.label ?? vars.eventType, time: new Date().toLocaleTimeString() },
        ...prev.slice(0, 9),
      ]);
      queryClient.invalidateQueries({ queryKey: ["/api/packet-events/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets"] });
      resetScan();
    },
    onError: () => toast({ title: "Failed to record — saved offline", variant: "destructive" }),
  });

  function resetScan() {
    setScannedPacket(null);
    setScanError(null);
    setBarcodeInput("");
    setSelectedAction(null);
    setTimeout(() => barcodeRef.current?.focus(), 100);
  }

  async function handleScan() {
    const barcode = barcodeInput.trim();
    if (!barcode) return;
    setIsScanning(true);
    setScanError(null);
    setScannedPacket(null);
    try {
      if (isOnline) {
        await lookupMutation.mutateAsync(barcode);
      } else {
        setScanError("Offline — barcode lookup unavailable. Actions will be queued.");
      }
    } finally {
      setIsScanning(false);
    }
  }

  async function handleActionConfirm(opts: { sealNumber?: string; notes?: string }) {
    if (!selectedAction || !scannedPacket) return;

    const gps = await getGPS();
    const clientEventId = `${scannedPacket.barcode}-${selectedAction.type}-${Date.now()}`;
    const eventPayload = {
      clientEventId,
      packetId: scannedPacket.id,
      eventType: selectedAction.type,
      sealNumber: opts.sealNumber,
      notes: opts.notes,
      gpsLatitude: gps?.lat,
      gpsLongitude: gps?.lng,
      deviceId: navigator.userAgent.slice(0, 100),
      eventTime: new Date().toISOString(),
    };

    if (!isOnline) {
      const offlineEvent: OfflineEvent = {
        ...eventPayload,
        barcode: scannedPacket.barcode,
        savedAt: new Date().toISOString(),
      };
      await saveOfflineEvent(offlineEvent);
      const updated = await getAllOfflineEvents();
      setOfflineQueue(updated);
      toast({ title: "Saved offline", description: "Will sync when connection is restored." });
      setRecentScans(prev => [
        { barcode: scannedPacket.barcode, action: selectedAction.label + " (offline)", time: new Date().toLocaleTimeString() },
        ...prev.slice(0, 9),
      ]);
      resetScan();
      return;
    }

    recordEventMutation.mutate(eventPayload);
    setSelectedAction(null);
  }

  async function syncOfflineEvents() {
    if (offlineQueue.length === 0) return;
    setIsSyncing(true);
    try {
      const result = await apiRequest("POST", "/api/packet-events/sync", {
        events: offlineQueue.map(e => ({
          clientEventId: e.clientEventId,
          packetId: e.packetId,
          eventType: e.eventType,
          sealNumber: e.sealNumber,
          notes: e.notes,
          gpsLatitude: e.gpsLatitude,
          gpsLongitude: e.gpsLongitude,
          deviceId: e.deviceId,
          eventTime: e.eventTime,
        })),
      }).then(r => r.json());
      await clearAllOfflineEvents();
      setOfflineQueue([]);
      toast({ title: `Synced ${result.created} event(s)`, description: result.skipped ? `${result.skipped} already on server.` : undefined });
      queryClient.invalidateQueries({ queryKey: ["/api/packet-events/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-packets"] });
    } catch {
      toast({ title: "Sync failed", description: "Check your connection and try again.", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  }

  async function discardOfflineQueue() {
    await clearAllOfflineEvents();
    setOfflineQueue([]);
    toast({ title: "Offline queue cleared" });
  }

  const isPending = recordEventMutation.isPending || isScanning || lookupMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => navigate("/packet-tracking")} data-testid="button-back">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-sm leading-none">Packet Scanner</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{me?.name ?? "Loading…"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {offlineQueue.length > 0 && (
            <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              {offlineQueue.length} queued
            </Badge>
          )}
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isOnline ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? "Online" : "Offline"}
          </div>
        </div>
      </div>

      {/* Packet Stats Strip */}
      {stats && (
        <div className="border-b bg-muted/30 px-3 py-2 overflow-x-auto" data-testid="stats-strip">
          <div className="flex items-center gap-1 min-w-max">
            <BarChart3 className="w-3.5 h-3.5 text-muted-foreground mr-1 shrink-0" />
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                <Package className="w-3 h-3" />
                {stats.total} Total
              </span>
              <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 font-medium">
                <Truck className="w-3 h-3" />
                {stats.inTransit} Dispatching
              </span>
              <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 font-medium">
                <Building2 className="w-3 h-3" />
                {stats.atLocation} At Locations
              </span>
              <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-medium">
                <Lock className="w-3 h-3" />
                {(stats.opened ?? 0) + (stats.administered ?? 0) + (stats.sealed ?? 0)} Active
              </span>
              <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 font-medium">
                <ArrowLeft className="w-3 h-3" />
                {stats.returned} Returned
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 p-4 space-y-4">
        {/* Scan area */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900 flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">Scan Barcode</p>
                <p className="text-xs text-muted-foreground">Use a scanner or type manually</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                ref={barcodeRef}
                placeholder="Barcode…"
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleScan()}
                className="font-mono text-lg h-12"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                data-testid="input-barcode"
              />
              <Button
                className="h-12 px-5"
                onClick={handleScan}
                disabled={!barcodeInput.trim() || isPending}
                data-testid="button-scan"
              >
                {isScanning || lookupMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Go"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {scanError && !scannedPacket && (
          <Card className="border-destructive/30">
            <CardContent className="p-4 flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {scanError}
            </CardContent>
          </Card>
        )}

        {/* Packet found — show actions */}
        {scannedPacket && (
          <div className="space-y-3">
            {/* Packet info card */}
            <Card className="border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-mono font-semibold text-sm">{scannedPacket.barcode}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Grade {scannedPacket.grade} · {scannedPacket.paperCount} papers</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLORS[scannedPacket.status] ?? "bg-slate-100 text-slate-700"}`}>
                      {statusLabel(scannedPacket.status)}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs" onClick={resetScan} data-testid="button-clear-scan">
                  Clear scan
                </Button>
              </CardContent>
            </Card>

            {/* Action buttons */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Next Action</p>
                {packetNextAction ? (
                  <Button
                    className="w-full h-auto flex-col gap-2 py-4"
                    onClick={() => setSelectedAction(packetNextAction)}
                    data-testid={`button-action-${packetNextAction.type}`}
                  >
                    <packetNextAction.icon className="w-6 h-6" />
                    <span className="text-sm font-semibold">{packetNextAction.label}</span>
                    <span className="text-xs opacity-75">Tap to confirm</span>
                  </Button>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>
                      {scannedPacket?.status === 'completed'
                        ? "This packet has completed its journey."
                        : "No action available for your role at this stage."}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Offline sync banner */}
        {offlineQueue.length > 0 && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      {offlineQueue.length} event{offlineQueue.length !== 1 ? "s" : ""} queued offline
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      {isOnline ? "Tap Sync to upload now." : "Will sync automatically when online."}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {isOnline && (
                    <Button size="sm" onClick={syncOfflineEvents} disabled={isSyncing} data-testid="button-sync-offline">
                      {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span className="ml-1 text-xs">Sync</span>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={discardOfflineQueue} data-testid="button-discard-queue">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {/* Queue items */}
              <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
                {offlineQueue.map(ev => (
                  <div key={ev.clientEventId} className="flex items-center justify-between text-xs bg-background/60 rounded p-2">
                    <span className="font-mono font-medium">{ev.barcode}</span>
                    <span className="text-muted-foreground">{ev.eventType.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">{new Date(ev.savedAt).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent scans */}
        {recentScans.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Recent Activity</p>
              <div className="space-y-2">
                {recentScans.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span className="font-mono font-medium text-xs flex-1">{s.barcode}</span>
                    <span className="text-xs text-muted-foreground">{s.action}</span>
                    <span className="text-xs text-muted-foreground">{s.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state hint */}
        {!scannedPacket && !scanError && offlineQueue.length === 0 && recentScans.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <QrCode className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Scan a packet barcode to get started.</p>
            <p className="text-xs mt-1">Works offline — events sync when connected.</p>
          </div>
        )}
      </div>

      {/* Action confirm dialog */}
      {selectedAction && scannedPacket && (
        <ActionDialog
          packet={scannedPacket}
          action={selectedAction}
          onConfirm={handleActionConfirm}
          onClose={() => setSelectedAction(null)}
          isPending={recordEventMutation.isPending}
        />
      )}
    </div>
  );
}
