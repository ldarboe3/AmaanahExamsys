import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ScanBarcode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Users,
  WifiOff,
  Wifi,
  Upload,
  Clock,
  BookOpen,
  MapPin,
  Info,
} from "lucide-react";

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
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const deleteScanFromDB = async (id: string) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const updateScanStatus = async (id: string, status: ScanRecord["syncStatus"]) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const rec = getReq.result;
      if (rec) {
        rec.syncStatus = status;
        store.put(rec);
      }
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
  return `${navigator.userAgent.substring(0, 100)}`;
}

type FeedbackState = "idle" | "success" | "duplicate" | "not_found" | "error";

export default function StudentAttendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOnline = useOnlineStatus();
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [barcode, setBarcode] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackStudentName, setFeedbackStudentName] = useState("");
  const [localScans, setLocalScans] = useState<ScanRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    getAllScans().then((scans) => {
      setLocalScans(scans);
      setPendingCount(scans.filter(s => s.syncStatus === "pending").length);
    });
  }, []);

  const selectedSchedule = ctx.data?.schedules?.find(s => s.subjectId === selectedSubjectId);

  const subjectScans = localScans.filter(s => s.subjectId === selectedSubjectId);
  const serverScansForSubject = (ctx.data?.existingScans || []).filter(s => s.subjectId === selectedSubjectId);

  const isAlreadyScanned = useCallback((studentId: number, subjectId: number): boolean => {
    const localDup = localScans.some(s => s.studentId === studentId && s.subjectId === subjectId);
    if (localDup) return true;
    const serverDup = (ctx.data?.existingScans || []).some(s => s.studentId === studentId && s.subjectId === subjectId);
    return serverDup;
  }, [localScans, ctx.data?.existingScans]);

  const showFeedback = useCallback((state: FeedbackState, message: string, studentName?: string) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedback(state);
    setFeedbackMessage(message);
    setFeedbackStudentName(studentName || "");

    if (state === "success" && navigator.vibrate) {
      navigator.vibrate(100);
    }

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
    if (!student) {
      showFeedback("not_found", `Index "${trimmed}" not found`);
      return;
    }

    if (isAlreadyScanned(student.id, selectedSubjectId)) {
      showFeedback("duplicate", "Already recorded");
      return;
    }

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
    if (e.key === "Enter") {
      e.preventDefault();
      handleScan(barcode);
    }
  }, [barcode, handleScan]);

  const syncScans = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      const allScans = await getAllScans();
      const pendingScans = allScans.filter(s => s.syncStatus === "pending");

      if (pendingScans.length === 0) {
        toast({ title: "All synced", description: "No pending scans to sync" });
        setIsSyncing(false);
        return;
      }

      const payload = pendingScans.map(s => ({
        studentId: s.studentId,
        examYearId: s.examYearId,
        subjectId: s.subjectId,
        centerId: s.centerId,
        scannedBarcode: s.scannedBarcode,
        checkInTime: s.checkInTime,
        offlineId: s.id,
        deviceInfo: s.deviceInfo,
        gpsLatitude: s.gpsLatitude,
        gpsLongitude: s.gpsLongitude,
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

      toast({ title: "Sync complete", description: `${syncedCount} records synced` });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance-scan/context"] });
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, toast]);

  useEffect(() => {
    if (!isOnline || pendingCount === 0) return;
    const timer = setTimeout(() => {
      syncScans();
    }, 5000);
    return () => clearTimeout(timer);
  }, [isOnline, pendingCount, syncScans]);

  const totalScannedForSubject = subjectScans.length + serverScansForSubject.filter(
    ss => !subjectScans.some(ls => ls.id === ss.offlineId)
  ).length;

  if (!ctx.data) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="attendance-loading">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ctx.data.center) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 p-6">
        <AlertTriangle className="w-12 h-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground text-center" data-testid="text-no-center">
          No exam center assigned. Contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4 gap-4">
      {pendingCount > 0 && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" data-testid="banner-pending-sync">
          {isOnline ? (
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
              <Upload className="w-4 h-4" />
              <span>{pendingCount} scan{pendingCount !== 1 ? "s" : ""} pending sync</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
              <WifiOff className="w-4 h-4" />
              <span>{pendingCount} scan{pendingCount !== 1 ? "s" : ""} saved offline</span>
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={!isOnline || isSyncing}
            onClick={syncScans}
            data-testid="button-sync-scans"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
            Sync
          </Button>
        </div>
      )}

      <Card data-testid="card-center-info">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            {ctx.data.center.name}
          </CardTitle>
          <Badge variant={isOnline ? "default" : "secondary"}>
            {isOnline ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </CardHeader>
      </Card>

      <Card data-testid="card-subject-select">
        <CardContent className="pt-4 pb-3">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            <BookOpen className="w-4 h-4 inline mr-1 -mt-0.5" />
            Select Subject
          </label>
          <Select
            value={selectedSubjectId?.toString() || ""}
            onValueChange={(v) => setSelectedSubjectId(parseInt(v))}
          >
            <SelectTrigger data-testid="select-subject">
              <SelectValue placeholder="Choose a subject" />
            </SelectTrigger>
            <SelectContent>
              {ctx.data.schedules.map((sch) => (
                <SelectItem key={sch.subjectId} value={sch.subjectId.toString()} data-testid={`option-subject-${sch.subjectId}`}>
                  {sch.subject?.name || `Subject ${sch.subjectId}`} — Grade {sch.grade}
                </SelectItem>
              ))}
              {ctx.data.schedules.length === 0 && ctx.data.subjects.map((sub) => (
                <SelectItem key={sub.id} value={sub.id.toString()} data-testid={`option-subject-${sub.id}`}>
                  {sub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedSubjectId && (
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
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <ScanBarcode className="w-12 h-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Scan a student barcode or enter index number</p>
              </div>
            )}

            {feedback === "success" && (
              <div className="flex flex-col items-center justify-center py-8 gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300" data-testid="text-scan-success">
                  {feedbackMessage}
                </p>
                <p className="text-sm text-muted-foreground">{feedbackStudentName}</p>
              </div>
            )}

            {feedback === "duplicate" && (
              <div className="flex flex-col items-center justify-center py-8 gap-2 animate-in fade-in duration-200">
                <Info className="w-12 h-12 text-amber-500" />
                <p className="text-base font-medium text-amber-700 dark:text-amber-300" data-testid="text-scan-duplicate">
                  Already recorded
                </p>
              </div>
            )}

            {(feedback === "not_found" || feedback === "error") && (
              <div className="flex flex-col items-center justify-center py-8 gap-2 animate-in fade-in duration-200">
                <AlertTriangle className="w-12 h-12 text-red-500" />
                <p className="text-base font-medium text-red-700 dark:text-red-300" data-testid="text-scan-error">
                  {feedbackMessage}
                </p>
              </div>
            )}

            <div className="p-3 border-t">
              <Input
                ref={inputRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scan or type index number..."
                className="text-center text-lg font-mono"
                autoFocus
                autoComplete="off"
                data-testid="input-barcode"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span data-testid="text-scan-count">{totalScannedForSubject} scanned</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {subjectScans.length > 0 && (
            <Card data-testid="card-recent-scans">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Recent Scans</CardTitle>
              </CardHeader>
              <CardContent className="max-h-64 overflow-y-auto space-y-1">
                {subjectScans.slice(0, 20).map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between gap-2 py-1.5 px-2 rounded text-sm"
                    data-testid={`scan-record-${scan.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="font-mono text-xs text-muted-foreground">{scan.indexNumber}</span>
                      <span className="truncate">{scan.studentName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {new Date(scan.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {scan.syncStatus === "pending" ? (
                        <Badge variant="secondary" className="text-[10px] px-1">pending</Badge>
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
      )}
    </div>
  );
}