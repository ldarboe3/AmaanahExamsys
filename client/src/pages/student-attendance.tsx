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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ScanBarcode, CheckCircle2, AlertTriangle, RefreshCw, Users, WifiOff, Wifi,
  Upload, Clock, BookOpen, MapPin, Info, BarChart3, ShieldAlert, TrendingUp,
  Filter, ChevronDown,
} from "lucide-react";
import type { Region, Cluster, ExamCenter, ExamYear } from "@shared/schema";

// ─── IndexedDB helpers ─────────────────────────────────────────────────────
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
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve((req.result as ScanRecord[]).sort((a, b) => b.checkInTime.localeCompare(a.checkInTime)));
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
  return `${navigator.userAgent.substring(0, 100)}`;
}

type FeedbackState = "idle" | "success" | "duplicate" | "not_found" | "error";

// ─── Flag type config ───────────────────────────────────────────────────────
const FLAG_CONFIG = {
  attended_no_marks: {
    label: "Attended — No Marks",
    description: "Student was present but no marks have been recorded for this subject",
    color: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    badgeColor: "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200",
    icon: AlertTriangle,
  },
  marks_no_attendance: {
    label: "Marks Entered — Not Present",
    description: "Marks have been entered for a subject where no attendance record exists",
    color: "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    badgeColor: "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200",
    icon: ShieldAlert,
  },
  passing_no_attendance: {
    label: "Passing Marks — Not Present",
    description: "Student has a passing score (≥50) for a subject with no attendance record",
    color: "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    badgeColor: "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200",
    icon: ShieldAlert,
  },
};

// ─── Shared filter component ─────────────────────────────────────────────────
function AttendanceFilters({
  examYears, examYearId, setExamYearId,
  regions, regionId, setRegionId,
  clusters, clusterId, setClusterId,
  centers, centerId, setCenterId,
}: {
  examYears: ExamYear[]; examYearId: string; setExamYearId: (v: string) => void;
  regions: Region[]; regionId: string; setRegionId: (v: string) => void;
  clusters: Cluster[]; clusterId: string; setClusterId: (v: string) => void;
  centers: ExamCenter[]; centerId: string; setCenterId: (v: string) => void;
}) {
  const filteredClusters = regionId !== "all" ? clusters.filter(c => c.regionId === parseInt(regionId)) : clusters;
  const filteredCenters = clusterId !== "all"
    ? centers.filter(c => (c as any).clusterId === parseInt(clusterId))
    : regionId !== "all"
    ? centers.filter(c => (c as any).regionId === parseInt(regionId))
    : centers;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>Filter:</span>
      </div>
      <Select value={examYearId} onValueChange={setExamYearId}>
        <SelectTrigger className="w-[140px]" data-testid="select-monitoring-year">
          <SelectValue placeholder="Exam Year" />
        </SelectTrigger>
        <SelectContent>
          {examYears.map(y => <SelectItem key={y.id} value={y.id.toString()}>{y.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={regionId} onValueChange={(v) => { setRegionId(v); setClusterId("all"); setCenterId("all"); }}>
        <SelectTrigger className="w-[140px]" data-testid="select-monitoring-region">
          <SelectValue placeholder="All Regions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Regions</SelectItem>
          {regions.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={clusterId} onValueChange={(v) => { setClusterId(v); setCenterId("all"); }}>
        <SelectTrigger className="w-[140px]" data-testid="select-monitoring-cluster">
          <SelectValue placeholder="All Clusters" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Clusters</SelectItem>
          {filteredClusters.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={centerId} onValueChange={setCenterId}>
        <SelectTrigger className="w-[160px]" data-testid="select-monitoring-center">
          <SelectValue placeholder="All Centers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Centers</SelectItem>
          {filteredCenters.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function StudentAttendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOnline = useOnlineStatus();
  const inputRef = useRef<HTMLInputElement>(null);
  const isAdmin = user && !["examiner"].includes(user.role || "");

  // Scan tab state
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

  // Monitoring/Validation filter state
  const [monitorExamYearId, setMonitorExamYearId] = useState<string>("all");
  const [monitorRegionId, setMonitorRegionId] = useState<string>("all");
  const [monitorClusterId, setMonitorClusterId] = useState<string>("all");
  const [monitorCenterId, setMonitorCenterId] = useState<string>("all");
  const [flagTypeFilter, setFlagTypeFilter] = useState<string>("all");
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [validationEnabled, setValidationEnabled] = useState(false);

  // Scan context query
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

  // Reference data
  const { data: examYears = [] } = useQuery<ExamYear[]>({ queryKey: ["/api/exam-years"] });
  const { data: regions = [] } = useQuery<Region[]>({ queryKey: ["/api/regions"] });
  const { data: clusters = [] } = useQuery<Cluster[]>({ queryKey: ["/api/clusters"] });
  const { data: centers = [] } = useQuery<ExamCenter[]>({ queryKey: ["/api/exam-centers"] });

  // Set default exam year
  useEffect(() => {
    if (examYears.length > 0 && monitorExamYearId === "all") {
      const active = examYears.find((y: any) => y.status === "active") || examYears[0];
      if (active) setMonitorExamYearId(active.id.toString());
    }
  }, [examYears]);

  // Monitoring summary query
  const monitoringParams = new URLSearchParams({ examYearId: monitorExamYearId });
  if (monitorRegionId !== "all") monitoringParams.set("regionId", monitorRegionId);
  if (monitorClusterId !== "all") monitoringParams.set("clusterId", monitorClusterId);
  if (monitorCenterId !== "all") monitoringParams.set("centerId", monitorCenterId);

  const { data: monitoringData = [], isFetching: monitoringLoading, refetch: refetchMonitoring } = useQuery<any[]>({
    queryKey: ["/api/attendance/monitoring-summary", monitorExamYearId, monitorRegionId, monitorClusterId, monitorCenterId],
    queryFn: async () => {
      if (!monitorExamYearId || monitorExamYearId === "all") return [];
      const res = await fetch(`/api/attendance/monitoring-summary?${monitoringParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch monitoring data");
      return res.json();
    },
    enabled: monitoringEnabled && monitorExamYearId !== "all",
  });

  // Validation flags query
  const { data: flagsData, isFetching: flagsLoading, refetch: refetchFlags } = useQuery<any>({
    queryKey: ["/api/attendance/validation-flags", monitorExamYearId, monitorRegionId, monitorClusterId, monitorCenterId],
    queryFn: async () => {
      if (!monitorExamYearId || monitorExamYearId === "all") return null;
      const res = await fetch(`/api/attendance/validation-flags?${monitoringParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch validation flags");
      return res.json();
    },
    enabled: validationEnabled && monitorExamYearId !== "all",
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

  // Load local scans
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
    if (!student) { showFeedback("not_found", `Index "${trimmed}" not found`); return; }
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
        studentId: s.studentId, examYearId: s.examYearId, subjectId: s.subjectId,
        centerId: s.centerId, scannedBarcode: s.scannedBarcode, checkInTime: s.checkInTime,
        offlineId: s.id, deviceInfo: s.deviceInfo, gpsLatitude: s.gpsLatitude, gpsLongitude: s.gpsLongitude,
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
    const timer = setTimeout(() => { syncScans(); }, 5000);
    return () => clearTimeout(timer);
  }, [isOnline, pendingCount, syncScans]);

  const totalScannedForSubject = subjectScans.length + serverScansForSubject.filter(
    ss => !subjectScans.some(ls => ls.id === ss.offlineId)
  ).length;

  // Prepare validation flags combined list
  const allFlags = flagsData ? [
    ...(flagsData.attendedNoMarks || []),
    ...(flagsData.marksNoAttend || []),
    ...(flagsData.passingNoAttend || []),
  ].filter(f => flagTypeFilter === "all" || f.flag_type === flagTypeFilter) : [];

  // Group monitoring data by region > cluster > center
  const monitoringGrouped = monitoringData.reduce((acc: any, row: any) => {
    const rKey = row.region_id;
    const cKey = row.cluster_id;
    const ecKey = row.center_id;

    if (!acc[rKey]) acc[rKey] = { region_name: row.region_name, clusters: {} };
    if (!acc[rKey].clusters[cKey]) acc[rKey].clusters[cKey] = { cluster_name: row.cluster_name, centers: {} };
    if (!acc[rKey].clusters[cKey].centers[ecKey]) {
      acc[rKey].clusters[cKey].centers[ecKey] = {
        center_name: row.center_name,
        total_students: row.total_students,
        subjects: [],
      };
    }
    acc[rKey].clusters[cKey].centers[ecKey].subjects.push({
      subject_id: row.subject_id,
      subject_name: row.subject_name,
      attended_count: row.attended_count,
      total_students: row.total_students,
      attendance_rate: row.attendance_rate,
    });
    return acc;
  }, {});

  // ─── Scan tab content ──────────────────────────────────────────────────────
  const scanContent = () => {
    if (!ctx.data) {
      return (
        <div className="flex items-center justify-center h-64">
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
      <div className="flex flex-col max-w-2xl mx-auto gap-4">
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
            <Button size="sm" variant="outline" disabled={!isOnline || isSyncing} onClick={syncScans} data-testid="button-sync-scans">
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
                  <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300" data-testid="text-scan-success">{feedbackMessage}</p>
                  <p className="text-sm text-muted-foreground">{feedbackStudentName}</p>
                </div>
              )}
              {feedback === "duplicate" && (
                <div className="flex flex-col items-center justify-center py-8 gap-2 animate-in fade-in duration-200">
                  <Info className="w-12 h-12 text-amber-500" />
                  <p className="text-base font-medium text-amber-700 dark:text-amber-300" data-testid="text-scan-duplicate">Already recorded</p>
                </div>
              )}
              {(feedback === "not_found" || feedback === "error") && (
                <div className="flex flex-col items-center justify-center py-8 gap-2 animate-in fade-in duration-200">
                  <AlertTriangle className="w-12 h-12 text-red-500" />
                  <p className="text-base font-medium text-red-700 dark:text-red-300" data-testid="text-scan-error">{feedbackMessage}</p>
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
  };

  // ─── Monitoring tab content ────────────────────────────────────────────────
  const monitoringContent = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <AttendanceFilters
          examYears={examYears}
          examYearId={monitorExamYearId}
          setExamYearId={setMonitorExamYearId}
          regions={regions}
          regionId={monitorRegionId}
          setRegionId={setMonitorRegionId}
          clusters={clusters}
          clusterId={monitorClusterId}
          setClusterId={setMonitorClusterId}
          centers={centers}
          centerId={monitorCenterId}
          setCenterId={setMonitorCenterId}
        />
        <Button
          onClick={() => { setMonitoringEnabled(true); refetchMonitoring(); }}
          disabled={monitorExamYearId === "all" || monitoringLoading}
          data-testid="button-load-monitoring"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${monitoringLoading ? "animate-spin" : ""}`} />
          {monitoringLoading ? "Loading..." : "Load Data"}
        </Button>
      </div>

      {!monitoringEnabled ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Select an exam year and click Load Data to view attendance monitoring</p>
          </CardContent>
        </Card>
      ) : monitoringLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : monitoringData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No attendance records found for the selected filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(monitoringGrouped).map(([regionId, regionData]: [string, any]) => (
            <div key={regionId}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {regionData.region_name}
              </h3>
              <div className="space-y-4 pl-2">
                {Object.entries(regionData.clusters).map(([clusterId, clusterData]: [string, any]) => (
                  <div key={clusterId}>
                    <p className="text-xs font-medium text-muted-foreground mb-2">{clusterData.cluster_name}</p>
                    <div className="space-y-3 pl-2">
                      {Object.entries(clusterData.centers).map(([centerId, centerData]: [string, any]) => (
                        <Card key={centerId} data-testid={`card-center-${centerId}`}>
                          <CardHeader className="pb-2 pt-4">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <CardTitle className="text-sm font-medium">{centerData.center_name}</CardTitle>
                              <span className="text-xs text-muted-foreground">{centerData.total_students} registered students</span>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Subject</TableHead>
                                  <TableHead className="text-right">Attended</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                  <TableHead className="text-right">Rate</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {centerData.subjects.map((sub: any) => (
                                  <TableRow key={sub.subject_id} data-testid={`row-subject-${sub.subject_id}`}>
                                    <TableCell className="text-sm">{sub.subject_name}</TableCell>
                                    <TableCell className="text-right text-sm font-medium">{sub.attended_count}</TableCell>
                                    <TableCell className="text-right text-sm text-muted-foreground">{sub.total_students}</TableCell>
                                    <TableCell className="text-right">
                                      {sub.attendance_rate !== null ? (
                                        <Badge
                                          variant="secondary"
                                          className={
                                            sub.attendance_rate >= 90
                                              ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200"
                                              : sub.attendance_rate >= 70
                                              ? "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200"
                                              : "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200"
                                          }
                                        >
                                          {sub.attendance_rate}%
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">—</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Validation tab content ────────────────────────────────────────────────
  const validationContent = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <AttendanceFilters
          examYears={examYears}
          examYearId={monitorExamYearId}
          setExamYearId={setMonitorExamYearId}
          regions={regions}
          regionId={monitorRegionId}
          setRegionId={setMonitorRegionId}
          clusters={clusters}
          clusterId={monitorClusterId}
          setClusterId={setMonitorClusterId}
          centers={centers}
          centerId={monitorCenterId}
          setCenterId={setMonitorCenterId}
        />
        <Button
          onClick={() => { setValidationEnabled(true); refetchFlags(); }}
          disabled={monitorExamYearId === "all" || flagsLoading}
          data-testid="button-load-flags"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${flagsLoading ? "animate-spin" : ""}`} />
          {flagsLoading ? "Checking..." : "Run Check"}
        </Button>
      </div>

      {!validationEnabled ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <ShieldAlert className="h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Select an exam year and click Run Check to detect inconsistencies</p>
          </CardContent>
        </Card>
      ) : flagsLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : flagsData ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={`border ${flagsData.summary.attendedNoMarksCount > 0 ? "border-amber-200 dark:border-amber-800" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attended — No Marks</CardTitle>
                <AlertTriangle className={`h-4 w-4 ${flagsData.summary.attendedNoMarksCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${flagsData.summary.attendedNoMarksCount > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                  {flagsData.summary.attendedNoMarksCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Present but no result recorded</p>
              </CardContent>
            </Card>
            <Card className={`border ${flagsData.summary.marksNoAttendCount > 0 ? "border-red-200 dark:border-red-800" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Marks — Not Present</CardTitle>
                <ShieldAlert className={`h-4 w-4 ${flagsData.summary.marksNoAttendCount > 0 ? "text-red-500" : "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${flagsData.summary.marksNoAttendCount > 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                  {flagsData.summary.marksNoAttendCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Results with no attendance record</p>
              </CardContent>
            </Card>
            <Card className={`border ${flagsData.summary.passingNoAttendCount > 0 ? "border-red-200 dark:border-red-800" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Passing — Not Present</CardTitle>
                <ShieldAlert className={`h-4 w-4 ${flagsData.summary.passingNoAttendCount > 0 ? "text-red-500" : "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${flagsData.summary.passingNoAttendCount > 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                  {flagsData.summary.passingNoAttendCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Passing score (&ge;50) with no attendance</p>
              </CardContent>
            </Card>
          </div>

          {flagsData.summary.totalFlags === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                <p className="text-emerald-700 dark:text-emerald-300 font-medium">No inconsistencies detected</p>
                <p className="text-sm text-muted-foreground">Attendance and marks records are consistent</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base">Flag Details</CardTitle>
                  <Select value={flagTypeFilter} onValueChange={setFlagTypeFilter}>
                    <SelectTrigger className="w-[200px]" data-testid="select-flag-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types ({flagsData.summary.totalFlags})</SelectItem>
                      <SelectItem value="attended_no_marks">Attended — No Marks ({flagsData.summary.attendedNoMarksCount})</SelectItem>
                      <SelectItem value="marks_no_attendance">Marks — Not Present ({flagsData.summary.marksNoAttendCount})</SelectItem>
                      <SelectItem value="passing_no_attendance">Passing — Not Present ({flagsData.summary.passingNoAttendCount})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Flag Type</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Center</TableHead>
                      <TableHead className="text-right">Marks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allFlags.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No flags match the selected filter
                        </TableCell>
                      </TableRow>
                    ) : (
                      allFlags.slice(0, 200).map((flag: any, idx: number) => {
                        const config = FLAG_CONFIG[flag.flag_type as keyof typeof FLAG_CONFIG];
                        const FlagIcon = config?.icon || AlertTriangle;
                        return (
                          <TableRow key={idx} data-testid={`row-flag-${idx}`}>
                            <TableCell>
                              <Badge variant="secondary" className={`text-xs ${config?.badgeColor || ""}`}>
                                <FlagIcon className="h-3 w-3 mr-1" />
                                {config?.label || flag.flag_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">{flag.student_name}</div>
                              <code className="text-xs text-muted-foreground">{flag.index_number}</code>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{flag.subject_name}</div>
                              {flag.subject_arabic_name && (
                                <div className="text-xs text-muted-foreground" dir="rtl">{flag.subject_arabic_name}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{flag.center_name || "—"}</div>
                              <div className="text-xs text-muted-foreground">{flag.cluster_name}{flag.region_name ? ` · ${flag.region_name}` : ""}</div>
                            </TableCell>
                            <TableCell className="text-right">
                              {flag.marks !== null && flag.marks !== undefined ? (
                                <span className={`text-sm font-medium ${parseFloat(flag.marks) >= 50 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                                  {flag.marks}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                {allFlags.length > 200 && (
                  <p className="text-center text-sm text-muted-foreground py-3 border-t">
                    Showing first 200 of {allFlags.length} flags. Apply filters to narrow down results.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-auto p-6 space-y-6" data-testid="student-attendance-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Student Attendance</h1>
        <p className="text-muted-foreground">Subject-based attendance tracking, monitoring, and validation</p>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="scan" className="space-y-4">
          <TabsList data-testid="tabs-attendance">
            <TabsTrigger value="scan" data-testid="tab-scan">
              <ScanBarcode className="h-4 w-4 mr-2" />
              Scan
            </TabsTrigger>
            <TabsTrigger value="monitoring" data-testid="tab-monitoring">
              <BarChart3 className="h-4 w-4 mr-2" />
              Monitoring
            </TabsTrigger>
            <TabsTrigger value="validation" data-testid="tab-validation">
              <ShieldAlert className="h-4 w-4 mr-2" />
              Validation Flags
              {flagsData?.summary?.totalFlags > 0 && (
                <Badge variant="destructive" className="ml-2 text-[10px] px-1.5">
                  {flagsData.summary.totalFlags}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan">
            {scanContent()}
          </TabsContent>

          <TabsContent value="monitoring">
            {monitoringContent()}
          </TabsContent>

          <TabsContent value="validation">
            {validationContent()}
          </TabsContent>
        </Tabs>
      ) : (
        scanContent()
      )}
    </div>
  );
}
