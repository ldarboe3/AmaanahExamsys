import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2, AlertTriangle, RefreshCw, MapPin, BarChart3, ShieldAlert, Filter, Smartphone,
} from "lucide-react";
import { useLocation } from "wouter";
import type { Region, Cluster, ExamCenter, ExamYear } from "@shared/schema";

// ─── Flag type config ─────────────────────────────────────────────────────────
const FLAG_CONFIG = {
  attended_no_marks: {
    label: "Attended — No Marks",
    description: "Student was present but no marks have been recorded for this subject",
    badgeColor: "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200",
    icon: AlertTriangle,
  },
  marks_no_attendance: {
    label: "Marks Entered — Not Present",
    description: "Marks have been entered for a subject where no attendance record exists",
    badgeColor: "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200",
    icon: ShieldAlert,
  },
  passing_no_attendance: {
    label: "Passing Marks — Not Present",
    description: "Student has a passing score (≥50) for a subject with no attendance record",
    badgeColor: "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200",
    icon: ShieldAlert,
  },
};

// ─── Shared filter bar ────────────────────────────────────────────────────────
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
          {examYears.map(y => <SelectItem key={y.id} value={y.id.toString()}>{(y as any).name}</SelectItem>)}
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StudentAttendance() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Shared filter state (shared between both tabs)
  const [examYearId, setExamYearId] = useState<string>("all");
  const [regionId, setRegionId] = useState<string>("all");
  const [clusterId, setClusterId] = useState<string>("all");
  const [centerId, setCenterId] = useState<string>("all");

  // Monitoring state
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);

  // Validation state
  const [validationEnabled, setValidationEnabled] = useState(false);
  const [flagTypeFilter, setFlagTypeFilter] = useState<string>("all");

  // Reference data
  const { data: examYears = [] } = useQuery<ExamYear[]>({ queryKey: ["/api/exam-years"] });
  const { data: regions = [] } = useQuery<Region[]>({ queryKey: ["/api/regions"] });
  const { data: clusters = [] } = useQuery<Cluster[]>({ queryKey: ["/api/clusters"] });
  const { data: centers = [] } = useQuery<ExamCenter[]>({ queryKey: ["/api/exam-centers"] });

  // Set default exam year to active one
  useEffect(() => {
    if (examYears.length > 0 && examYearId === "all") {
      const active = examYears.find((y: any) => y.status === "active") || examYears[0];
      if (active) setExamYearId(active.id.toString());
    }
  }, [examYears]);

  // Build query params
  const buildParams = () => {
    const p = new URLSearchParams({ examYearId });
    if (regionId !== "all") p.set("regionId", regionId);
    if (clusterId !== "all") p.set("clusterId", clusterId);
    if (centerId !== "all") p.set("centerId", centerId);
    return p;
  };

  // Monitoring query
  const { data: monitoringData = [], isFetching: monitoringLoading, refetch: refetchMonitoring } = useQuery<any[]>({
    queryKey: ["/api/attendance/monitoring-summary", examYearId, regionId, clusterId, centerId],
    queryFn: async () => {
      if (!examYearId || examYearId === "all") return [];
      const res = await fetch(`/api/attendance/monitoring-summary?${buildParams()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch monitoring data");
      return res.json();
    },
    enabled: monitoringEnabled && examYearId !== "all",
  });

  // Validation query
  const { data: flagsData, isFetching: flagsLoading, refetch: refetchFlags } = useQuery<any>({
    queryKey: ["/api/attendance/validation-flags", examYearId, regionId, clusterId, centerId],
    queryFn: async () => {
      if (!examYearId || examYearId === "all") return null;
      const res = await fetch(`/api/attendance/validation-flags?${buildParams()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch validation flags");
      return res.json();
    },
    enabled: validationEnabled && examYearId !== "all",
  });

  // Group monitoring data by region → cluster → center
  const monitoringGrouped = monitoringData.reduce((acc: any, row: any) => {
    const rKey = row.region_id;
    const cKey = row.cluster_id;
    const ecKey = row.center_id;
    if (!acc[rKey]) acc[rKey] = { region_name: row.region_name, clusters: {} };
    if (!acc[rKey].clusters[cKey]) acc[rKey].clusters[cKey] = { cluster_name: row.cluster_name, centers: {} };
    if (!acc[rKey].clusters[cKey].centers[ecKey]) {
      acc[rKey].clusters[cKey].centers[ecKey] = {
        center_name: row.center_name, total_students: row.total_students, subjects: [],
      };
    }
    acc[rKey].clusters[cKey].centers[ecKey].subjects.push({
      subject_id: row.subject_id, subject_name: row.subject_name,
      attended_count: row.attended_count, total_students: row.total_students,
      attendance_rate: row.attendance_rate,
    });
    return acc;
  }, {});

  // Filtered flags
  const allFlags = flagsData ? [
    ...(flagsData.attendedNoMarks || []),
    ...(flagsData.marksNoAttend || []),
    ...(flagsData.passingNoAttend || []),
  ].filter(f => flagTypeFilter === "all" || f.flag_type === flagTypeFilter) : [];

  // ─── Monitoring tab ─────────────────────────────────────────────────────────
  const monitoringContent = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <AttendanceFilters
          examYears={examYears} examYearId={examYearId} setExamYearId={setExamYearId}
          regions={regions} regionId={regionId} setRegionId={setRegionId}
          clusters={clusters} clusterId={clusterId} setClusterId={setClusterId}
          centers={centers} centerId={centerId} setCenterId={setCenterId}
        />
        <Button
          onClick={() => { setMonitoringEnabled(true); refetchMonitoring(); }}
          disabled={examYearId === "all" || monitoringLoading}
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
            <p className="text-sm text-muted-foreground">Attendance is recorded via the Mobile Attendance Scanner</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(monitoringGrouped).map(([rId, regionData]: [string, any]) => (
            <div key={rId}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {regionData.region_name}
              </h3>
              <div className="space-y-4 pl-2">
                {Object.entries(regionData.clusters).map(([cId, clusterData]: [string, any]) => (
                  <div key={cId}>
                    <p className="text-xs font-medium text-muted-foreground mb-2">{clusterData.cluster_name}</p>
                    <div className="space-y-3 pl-2">
                      {Object.entries(clusterData.centers).map(([ecId, centerData]: [string, any]) => (
                        <Card key={ecId} data-testid={`card-center-${ecId}`}>
                          <CardHeader className="pb-2 pt-4">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <CardTitle className="text-sm font-medium">{centerData.center_name}</CardTitle>
                              <span className="text-xs text-muted-foreground">{centerData.total_students} registered</span>
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
                                        <Badge variant="secondary" className={
                                          sub.attendance_rate >= 90
                                            ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200"
                                            : sub.attendance_rate >= 70
                                            ? "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200"
                                            : "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200"
                                        }>
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

  // ─── Validation tab ─────────────────────────────────────────────────────────
  const validationContent = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <AttendanceFilters
          examYears={examYears} examYearId={examYearId} setExamYearId={setExamYearId}
          regions={regions} regionId={regionId} setRegionId={setRegionId}
          clusters={clusters} clusterId={clusterId} setClusterId={setClusterId}
          centers={centers} centerId={centerId} setCenterId={setCenterId}
        />
        <Button
          onClick={() => { setValidationEnabled(true); refetchFlags(); }}
          disabled={examYearId === "all" || flagsLoading}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={flagsData.summary.attendedNoMarksCount > 0 ? "border-amber-200 dark:border-amber-800" : ""}>
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
            <Card className={flagsData.summary.marksNoAttendCount > 0 ? "border-red-200 dark:border-red-800" : ""}>
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
            <Card className={flagsData.summary.passingNoAttendCount > 0 ? "border-red-200 dark:border-red-800" : ""}>
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
                <p className="text-sm text-muted-foreground">All attendance and marks records are consistent</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base">Flag Details</CardTitle>
                  <Select value={flagTypeFilter} onValueChange={setFlagTypeFilter}>
                    <SelectTrigger className="w-[220px]" data-testid="select-flag-type">
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
                      <TableHead>Flag</TableHead>
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
                    ) : allFlags.slice(0, 200).map((flag: any, idx: number) => {
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
                            <div className="text-xs text-muted-foreground">
                              {[flag.cluster_name, flag.region_name].filter(Boolean).join(" · ")}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {flag.marks !== null && flag.marks !== undefined ? (
                              <span className={`text-sm font-medium ${parseFloat(flag.marks) >= 50 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                                {flag.marks}
                              </span>
                            ) : <span className="text-muted-foreground text-sm">—</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-auto p-6 space-y-6" data-testid="student-attendance-page">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor subject-based attendance and validate records against marks
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setLocation("/mobile-attendance-scan")}
          data-testid="button-open-mobile-scanner"
        >
          <Smartphone className="h-4 w-4 mr-2" />
          Open Scanner
        </Button>
      </div>

      <Tabs defaultValue="monitoring" className="space-y-4">
        <TabsList data-testid="tabs-attendance">
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

        <TabsContent value="monitoring">{monitoringContent}</TabsContent>
        <TabsContent value="validation">{validationContent}</TabsContent>
      </Tabs>
    </div>
  );
}
