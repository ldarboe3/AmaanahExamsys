import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ScanBarcode, CheckCircle2, AlertTriangle, RefreshCw, Users,
  WifiOff, Wifi, Upload, Clock, BookOpen, MapPin, Info,
} from "lucide-react";

// ─── IndexedDB helpers ────────────────────────────────────────────────────────
const DB_NAME = "attendanceScans";
const DB_VERSION = 1;
const STORE_NAME = "scans";

interface ScanRecord {
  id: string;
  studentId: number;
  studentName: string;
  indexNumber: string;
  subjectId: number;
  subjectName: string;
  centerId: number;
  hallId?: number | null;
  examYearId: number;
  scannedBarcode: string;
  checkInTime: string;
  deviceInfo: string;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  syncStatus: "pending" | "synced" | "error";
}

const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("syncStatus", "syncStatus", { unique: false });
        store.createIndex("subjectId", "subjectId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const saveScanToDB = async (item: ScanRecord) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const getAllScans = async (): Promise<ScanRecord[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () =>
      resolve((req.result as ScanRecord[]).sort((a, b) => b.checkInTime.localeCompare(a.checkInTime)));
    req.onerror = () => reject(req.error);
  });
};

const updateScanStatus = async (id: string, status: ScanRecord["syncStatus"]) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      const rec = req.result;
      if (rec) { rec.syncStatus = status; store.put(rec); }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return isOnline;
}

function getDeviceInfo(): string {
  return navigator.userAgent.substring(0, 100);
}

type FeedbackState = "idle" | "success" | "duplicate" | "not_found" | "error";

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MobileAttendanceScan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOnline = useOnlineStatus();
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedHallId, setSelectedHallId] = useState<number | null>(null);
  const [barcode, setBarcode] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackStudentName, setFeedbackStudentName] = useState("");
  const [localScans, setLocalScans] = useState<ScanRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load scan context from server
  const ctx = useQuery<{
    center: any;
    schedules: any[];
    subjects: any[];
    students: { id: number; indexNumber: string; firstName: string; lastName: string; grade: number; schoolId: number }[];
    existingScans: { id: number; studentId: number; subjectId: number; offlineId: string; scannedBarcode: string; checkInTime: string }[];
    examYearId: number;
  }>({
    queryKey: ["/api/attendance-scan/context"],
    refetchInterval: 120000,
  });

  // GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  // Load local scans from IndexedDB on mount
  useEffect(() => {
    getAllScans().then((scans) => {
      setLocalScans(scans);
      setPendingCount(scans.filter(s => s.syncStatus === "pending").length);
    });
  }, []);

  // Halls for the current center (optional - shown when center has halls configured)
  const centerId = ctx.data?.center?.id;
  const { data: centerHalls = [] } = useQuery<{ id: number; name: string; capacity: number }[]>({
    queryKey: [`/api/centers/${centerId}/halls`],
    enabled: !!centerId,
  });

  const selectedSchedule = ctx.data?.schedules?.find(s => s.subjectId === selectedSubjectId);
  const subjectScans = localScans.filter(s => s.subjectId === selectedSubjectId);
  const serverScansForSubject = (ctx.data?.existingScans || []).filter(s => s.subjectId === selectedSubjectId);

  const isAlreadyScanned = useCallback((studentId: number, subjectId: number): boolean => {
    if (localScans.some(s => s.studentId === studentId && s.subjectId === subjectId)) return true;
    return (ctx.data?.existingScans || []).some(s => s.studentId === studentId && s.subjectId === subjectId);
  }, [localScans, ctx.data?.existingScans]);

  const showFeedback = useCallback((state: FeedbackState, message: string, studentName?: string) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedback(state);
    setFeedbackMessage(message);
    setFeedbackStudentName(studentName || "");
    if (state === "success" && navigator.vibrate) navigator.vibrate(100);
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback("idle");
      setFeedbackMessage("");
      setFeedbackStudentName("");
      inputRef.current?.focus();
    }, state === "success" ? 1500 : 2500);
  }, []);

  const handleScan = useCallback(async (rawBarcode: string) => {
    const trimmed = rawBarcode.trim();
    if (!trimmed) return;
    setBarcode("");

    if (!ctx.data?.center || !selectedSubjectId || !ctx.data?.examYearId) {
      showFeedback("error", "Select a subject first");
      return;
    }

    const student = ctx.data.students.find(s => s.indexNumber === trimmed);
    if (!student) { showFeedback("not_found", `"${trimmed}" not found`); return; }
    if (isAlreadyScanned(student.id, selectedSubjectId)) { showFeedback("duplicate", "Already recorded"); return; }

    const subject = ctx.data.subjects.find(s => s.id === selectedSubjectId);
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const newScan: ScanRecord = {
      id: scanId,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      indexNumber: student.indexNumber,
      subjectId: selectedSubjectId,
      subjectName: subject?.name || `Subject ${selectedSubjectId}`,
      centerId: ctx.data.center.id,
      hallId: selectedHallId,
      examYearId: ctx.data.examYearId,
      scannedBarcode: trimmed,
      checkInTime: new Date().toISOString(),
      deviceInfo: getDeviceInfo(),
      gpsLatitude: gpsCoords?.lat ?? null,
      gpsLongitude: gpsCoords?.lng ?? null,
      syncStatus: "pending",
    };

    await saveScanToDB(newScan);
    setLocalScans(prev => [newScan, ...prev]);
    setPendingCount(prev => prev + 1);
    showFeedback("success", `${student.firstName} ${student.lastName}`, student.indexNumber);
  }, [ctx.data, selectedSubjectId, isAlreadyScanned, gpsCoords, showFeedback]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); handleScan(barcode); }
  }, [barcode, handleScan]);

  // Sync pending scans to server
  const syncScans = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const allScans = await getAllScans();
      const pendingScans = allScans.filter(s => s.syncStatus === "pending");

      if (pendingScans.length === 0) {
        toast({ title: "All synced", description: "No pending scans to upload" });
        setIsSyncing(false);
        return;
      }

      const payload = pendingScans.map(s => ({
        studentId: s.studentId, examYearId: s.examYearId, subjectId: s.subjectId,
        centerId: s.centerId, hallId: s.hallId ?? null,
        scannedBarcode: s.scannedBarcode, checkInTime: s.checkInTime,
        offlineId: s.id, deviceInfo: s.deviceInfo,
        gpsLatitude: s.gpsLatitude, gpsLongitude: s.gpsLongitude,
      }));

      const res = await apiRequest("POST", "/api/attendance-scan/sync", { records: payload });
      const data = await res.json();

      let syncedCount = 0;
      for (const result of data.results) {
        if (result.status === "created" || result.status === "duplicate") {
          await updateScanStatus(result.offlineId, "synced");
          syncedCount++;
        } else {
          await updateScanStatus(result.offlineId, "error");
        }
      }

      const updatedScans = await getAllScans();
      setLocalScans(updatedScans);
      setPendingCount(updatedScans.filter(s => s.syncStatus === "pending").length);
      toast({ title: "Sync complete", description: `${syncedCount} record${syncedCount !== 1 ? "s" : ""} uploaded` });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance-scan/context"] });
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, toast]);

  // Auto-sync when online and pending records exist
  useEffect(() => {
    if (!isOnline || pendingCount === 0) return;
    const timer = setTimeout(() => { syncScans(); }, 5000);
    return () => clearTimeout(timer);
  }, [isOnline, pendingCount, syncScans]);

  const totalScannedForSubject = subjectScans.length + serverScansForSubject.filter(
    ss => !subjectScans.some(ls => ls.id === ss.offlineId)
  ).length;

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (!ctx.data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── No center assigned ─────────────────────────────────────────────────────
  if (!ctx.data.center) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-muted-foreground" />
        <p className="text-xl font-semibold" data-testid="text-no-center">No Exam Center Assigned</p>
        <p className="text-muted-foreground">Contact your administrator to assign you to an exam center.</p>
      </div>
    );
  }

  // ─── Main UI ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto" data-testid="mobile-attendance-scan-page">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card sticky top-0 z-50">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm truncate max-w-[180px]">{ctx.data.center.name}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Attendance Scanner</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
              {pendingCount} pending
            </Badge>
          )}
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
            isOnline
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
              : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
          }`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>
      </div>

      {/* Offline / sync banner */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800" data-testid="banner-pending-sync">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
            {isOnline ? <Upload className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span>
              {pendingCount} scan{pendingCount !== 1 ? "s" : ""} {isOnline ? "pending upload" : "saved offline"}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={!isOnline || isSyncing}
            onClick={syncScans}
            data-testid="button-sync-scans"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
        </div>
      )}

      <div className="flex-1 flex flex-col gap-4 p-4">

        {/* Subject selector — Today's exams only */}
        <Card data-testid="card-subject-select">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-muted-foreground">
                <BookOpen className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Select Subject
              </label>
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-medium">
                <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
                Today only · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>

            {ctx.data.schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-5 gap-1.5 text-center text-muted-foreground border border-dashed rounded-md">
                <BookOpen className="w-8 h-8 opacity-30" />
                <p className="text-sm font-medium">No exams scheduled today</p>
                <p className="text-xs">Check back when today's exams are published.</p>
              </div>
            ) : (
              <Select
                value={selectedSubjectId?.toString() || ""}
                onValueChange={(v) => setSelectedSubjectId(parseInt(v))}
              >
                <SelectTrigger className="w-full" data-testid="select-subject">
                  <SelectValue placeholder="Choose a subject to scan for" />
                </SelectTrigger>
                <SelectContent>
                  {ctx.data.schedules.map((sch) => (
                    <SelectItem key={sch.subjectId} value={sch.subjectId.toString()} data-testid={`option-subject-${sch.subjectId}`}>
                      <span className="flex items-center gap-2">
                        <span>{sch.subject?.name || sch.subjectName || `Subject ${sch.subjectId}`}</span>
                        {sch.grade && <span className="text-muted-foreground">· Gr {sch.grade}</span>}
                        {sch.scheduledStartTime && (
                          <span className="font-mono text-xs text-muted-foreground">{sch.scheduledStartTime}</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Hall selector — only shown when center has halls configured */}
        {centerHalls.length > 0 && (
          <Card data-testid="card-hall-select">
            <CardContent className="pt-4 pb-3">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Hall / Room <span className="text-xs font-normal">(optional)</span>
              </label>
              <Select
                value={selectedHallId?.toString() || "0"}
                onValueChange={(v) => setSelectedHallId(v === "0" ? null : parseInt(v))}
              >
                <SelectTrigger className="w-full" data-testid="select-hall">
                  <SelectValue placeholder="Select hall" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">— No specific hall —</SelectItem>
                  {centerHalls.map((h) => (
                    <SelectItem key={h.id} value={h.id.toString()} data-testid={`option-hall-${h.id}`}>
                      {h.name} (cap. {h.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Scan zone */}
        {selectedSubjectId ? (
          <>
            <div
              className={`relative rounded-md border-2 transition-all duration-300 overflow-hidden ${
                feedback === "success"
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                  : feedback === "duplicate"
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                  : feedback === "not_found" || feedback === "error"
                  ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                  : "border-border"
              }`}
              data-testid="scan-feedback-zone"
            >
              {feedback === "idle" && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <ScanBarcode className="w-14 h-14 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground text-center px-4">
                    Scan student barcode or enter index number
                  </p>
                </div>
              )}

              {feedback === "success" && (
                <div className="flex flex-col items-center justify-center py-10 gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-20 h-20 text-emerald-500" />
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300" data-testid="text-scan-success">
                    {feedbackMessage}
                  </p>
                  <p className="text-sm text-muted-foreground font-mono">{feedbackStudentName}</p>
                </div>
              )}

              {feedback === "duplicate" && (
                <div className="flex flex-col items-center justify-center py-10 gap-2 animate-in fade-in duration-200">
                  <Info className="w-14 h-14 text-amber-500" />
                  <p className="text-lg font-semibold text-amber-700 dark:text-amber-300" data-testid="text-scan-duplicate">
                    Already Recorded
                  </p>
                </div>
              )}

              {(feedback === "not_found" || feedback === "error") && (
                <div className="flex flex-col items-center justify-center py-10 gap-2 animate-in fade-in duration-200">
                  <AlertTriangle className="w-14 h-14 text-red-500" />
                  <p className="text-lg font-semibold text-red-700 dark:text-red-300" data-testid="text-scan-error">
                    {feedbackMessage}
                  </p>
                </div>
              )}

              {/* Barcode input */}
              <div className="p-4 border-t">
                <Input
                  ref={inputRef}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Scan or type index number…"
                  className="text-center text-xl font-mono h-12"
                  autoFocus
                  autoComplete="off"
                  inputMode="none"
                  data-testid="input-barcode"
                />
              </div>
            </div>

            {/* Scan stats */}
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span data-testid="text-scan-count">
                  <strong>{totalScannedForSubject}</strong> scanned
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {/* Recent scans list */}
            {subjectScans.length > 0 && (
              <Card data-testid="card-recent-scans">
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Recent Scans</CardTitle>
                </CardHeader>
                <CardContent className="max-h-72 overflow-y-auto space-y-1 pb-3">
                  {subjectScans.slice(0, 30).map((scan) => (
                    <div
                      key={scan.id}
                      className="flex items-center justify-between gap-2 py-2 px-2 rounded text-sm"
                      data-testid={`scan-record-${scan.id}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="font-mono text-xs text-muted-foreground">{scan.indexNumber}</span>
                        <span className="truncate font-medium">{scan.studentName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {new Date(scan.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {scan.syncStatus === "pending" ? (
                          <Badge variant="secondary" className="text-[10px] px-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-200">
                            pending
                          </Badge>
                        ) : scan.syncStatus === "synced" ? (
                          <Badge variant="default" className="text-[10px] px-1">synced</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] px-1">error</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 py-12 text-center text-muted-foreground">
            <BookOpen className="w-12 h-12 opacity-40" />
            <p className="text-sm">Select a subject above to begin scanning</p>
          </div>
        )}
      </div>
    </div>
  );
}
