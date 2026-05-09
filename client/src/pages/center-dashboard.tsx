import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatNumber } from "@/lib/formatters";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Search,
  MapPin,
  Users,
  School,
  Calendar,
  Package,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Plus,
  QrCode,
  Hash,
  ClipboardList,
  Printer,
  Filter,
  Minus,
  Truck,
  ScanLine,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  PackageX,
  MoreVertical,
  Trash2,
  MoveRight,
  UserMinus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import amanahLogo from "@assets/Amana_Logo_1770390631299.jpeg";

interface CenterDashboardData {
  center: {
    id: number;
    name: string;
    code: string;
    address?: string;
    regionId: number;
    clusterId: number;
    capacity: number;
    contactPerson?: string;
    contactPhone?: string;
    contactEmail?: string;
    isActive: boolean;
  };
  schoolView: boolean;
  schoolId: number | null;
  examYear: {
    id: number;
    year: number;
    name: string;
  } | null;
  statistics: {
    totalSchools: number;
    totalStudents: number;
    studentsByGrade: Record<number, number>;
    totalInvigilators: number;
    pendingPapers: number;
    pendingScripts: number;
    malpracticeCount: number;
  };
  schools: Array<{
    id: number;
    name: string;
    schoolType: string;
    email?: string;
    phone?: string;
    schoolBadge?: string | null;
    studentCount?: number;
    gradeBreakdown?: Record<number, number>;
    assignmentId?: number | null;
  }>;
  timetable: Array<{
    id: number;
    examDate: string;
    startTime: string;
    endTime: string;
    subjectId: number;
    subjectName?: string;
    subjectArabicName?: string;
    grade: number;
    venue?: string;
  }>;
  paperMovements: Array<{
    id: number;
    paperType: string;
    quantity: number;
    status: string;
    subjectId?: number;
    grade?: number;
    createdAt: string;
  }>;
  scriptMovements: Array<{
    id: number;
    grade: number;
    totalScripts: number;
    presentCount: number;
    absentCount: number;
    status: string;
    subjectId: number;
    createdAt: string;
  }>;
  malpracticeReports: Array<{
    id: number;
    incidentType: string;
    malpracticeType?: string;
    description: string;
    studentId?: number;
    status: string;
    createdAt: string;
  }>;
  recentActivity: Array<{
    id: number;
    activityType: string;
    description: string;
    createdAt: string;
  }>;
  invigilators: Array<{
    id: number;
    examinerId: number;
    role: string;
    subjectId?: number;
  }>;
}

const malpracticeSchema = z.object({
  incidentType: z.string().min(1, "Incident type is required"),
  malpracticeType: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  studentId: z.coerce.number().optional(),
  subjectId: z.coerce.number().optional(),
});

type MalpracticeFormData = z.infer<typeof malpracticeSchema>;

function StatCard({ label, value, icon: Icon, variant = "default" }: { 
  label: string; 
  value: number | string; 
  icon: any;
  variant?: "default" | "success" | "warning" | "error";
}) {
  const displayValue = typeof value === 'number' ? formatNumber(value) : value;
  const colorClasses = {
    default: "bg-primary/10 text-primary",
    success: "bg-chart-2/10 text-chart-2",
    warning: "bg-chart-4/10 text-chart-4",
    error: "bg-destructive/10 text-destructive",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold">{displayValue}</p>
          </div>
          <div className={`w-10 h-10 rounded-md flex items-center justify-center ${colorClasses[variant]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const DATE_COLORS = [
  { card: "border-teal-200 dark:border-teal-800", header: "bg-teal-50 dark:bg-teal-950/40", tableHead: "bg-teal-100/60 dark:bg-teal-900/40" },
  { card: "border-blue-200 dark:border-blue-800", header: "bg-blue-50 dark:bg-blue-950/40", tableHead: "bg-blue-100/60 dark:bg-blue-900/40" },
  { card: "border-amber-200 dark:border-amber-800", header: "bg-amber-50 dark:bg-amber-950/40", tableHead: "bg-amber-100/60 dark:bg-amber-900/40" },
  { card: "border-violet-200 dark:border-violet-800", header: "bg-violet-50 dark:bg-violet-950/40", tableHead: "bg-violet-100/60 dark:bg-violet-900/40" },
  { card: "border-rose-200 dark:border-rose-800", header: "bg-rose-50 dark:bg-rose-950/40", tableHead: "bg-rose-100/60 dark:bg-rose-900/40" },
  { card: "border-emerald-200 dark:border-emerald-800", header: "bg-emerald-50 dark:bg-emerald-950/40", tableHead: "bg-emerald-100/60 dark:bg-emerald-900/40" },
];

interface PrintInfo {
  centerName: string;
  centerAddress?: string;
  examYearName?: string;
  schoolName?: string;
  schoolBadge?: string | null;
}

function buildPrintHeader(info: PrintInfo, title: string, logoSrc: string) {
  return `
    <div style="text-align:center; border-bottom: 3px solid #0d9488; padding-bottom: 16px; margin-bottom: 20px;">
      <div style="display:flex; align-items:center; justify-content:center; gap:14px; margin-bottom:8px;">
        ${info.schoolBadge ? `<img src="${info.schoolBadge}" style="width:56px;height:56px;object-fit:contain;border-radius:6px;" />` : ""}
        <img src="${logoSrc}" style="width:56px;height:56px;object-fit:contain;" />
      </div>
      <h1 style="margin:0; font-size:20px; font-weight:700; color:#0d9488;">Amaanah Examination Management</h1>
      <h2 style="margin:4px 0 0; font-size:16px; font-weight:600; color:#111;">${title}</h2>
      ${info.schoolName ? `<p style="margin:4px 0 0; font-size:13px; color:#374151;"><strong>School:</strong> ${info.schoolName}</p>` : ""}
      <p style="margin:4px 0 0; font-size:13px; color:#374151;"><strong>Center:</strong> ${info.centerName}${info.centerAddress ? ` &mdash; ${info.centerAddress}` : ""}</p>
      ${info.examYearName ? `<p style="margin:2px 0 0; font-size:12px; color:#6b7280;">Exam Year: ${info.examYearName}</p>` : ""}
      <p style="margin:2px 0 0; font-size:11px; color:#9ca3af;">Printed: ${new Date().toLocaleString()}</p>
    </div>`;
}

function TimetableTab({ timetable, printInfo }: { timetable: CenterDashboardData["timetable"]; printInfo?: PrintInfo }) {
  const { isRTL } = useLanguage();

  const handlePrint = () => {
    if (!printInfo) return;
    const grouped: Record<string, typeof timetable> = {};
    timetable.forEach(e => {
      if (!grouped[e.examDate]) grouped[e.examDate] = [];
      grouped[e.examDate].push(e);
    });
    const sortedDates = Object.keys(grouped).sort();
    const logoSrc = window.location.origin + amanahLogo;
    const rows = sortedDates.map(date => {
      const label = new Date(date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const entries = grouped[date].map(e => `
        <tr>
          <td>${e.startTime} - ${e.endTime}</td>
          <td>${e.subjectName || "—"}${e.subjectArabicName && e.subjectArabicName !== e.subjectName ? `<br><span dir="rtl" style="font-size:11px;color:#6b7280;">${e.subjectArabicName}</span>` : ""}</td>
          <td>Grade ${e.grade}</td>
          <td>${e.venue || printInfo.centerName}</td>
        </tr>`).join("");
      return `
        <div class="day-block">
          <div class="day-header">${label}</div>
          <table><thead><tr><th>Time</th><th>Subject</th><th>Grade</th><th>Venue</th></tr></thead>
          <tbody>${entries}</tbody></table>
        </div>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Timetable</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
        .day-block { margin-bottom: 22px; }
        .day-header { background:#0d9488; color:white; padding:7px 12px; font-weight:bold; font-size:13px; border-radius:4px 4px 0 0; }
        table { width:100%; border-collapse:collapse; }
        th { background:#e6f7f5; padding:7px 10px; text-align:left; font-size:12px; border:1px solid #a7f3d0; }
        td { padding:7px 10px; border:1px solid #e5e7eb; font-size:12px; vertical-align:top; }
        tr:nth-child(even) td { background:#f9fafb; }
        .footer { text-align:center; margin-top:30px; font-size:11px; color:#9ca3af; border-top:1px solid #e5e7eb; padding-top:10px; }
        @media print { @page { size: A4; margin: 12mm; } body { padding: 0; } }
      </style></head><body>
      ${buildPrintHeader(printInfo, "Examination Timetable", logoSrc)}
      ${rows}
      <div class="footer">Generated by Amaanah Examination Management System</div>
    </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const groupedByDate = timetable.reduce((acc, entry) => {
    const date = entry.examDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, typeof timetable>);

  const sortedDates = Object.keys(groupedByDate).sort();

  if (timetable.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Timetable Entries</h3>
          <p className="text-muted-foreground">The exam timetable has not been set up yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {printInfo && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print-timetable">
            <Printer className="w-4 h-4 me-2" />
            Print Timetable
          </Button>
        </div>
      )}
      {sortedDates.map((date, dateIndex) => {
        const colors = DATE_COLORS[dateIndex % DATE_COLORS.length];
        return (
          <Card key={date} className={`border ${colors.card} overflow-hidden`}>
            <CardHeader className={`pb-3 ${colors.header}`}>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(date).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className={`${colors.tableHead} border-b`}>
                    <TableHead className="ps-4">Time</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="pe-4">Venue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedByDate[date].map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium ps-4 py-3">
                        {entry.startTime} - {entry.endTime}
                      </TableCell>
                      <TableCell className="py-3">
                        {entry.subjectName ? (
                          <div>
                            <span>{entry.subjectName}</span>
                            {entry.subjectArabicName && entry.subjectArabicName !== entry.subjectName && (
                              <span className="text-muted-foreground block text-sm" dir="rtl">
                                {entry.subjectArabicName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline">Grade {entry.grade}</Badge>
                      </TableCell>
                      <TableCell className="py-3 pe-4 text-muted-foreground">
                        {entry.venue || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface CenterAttendanceRow {
  student_id: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  index_number?: string;
  grade: number;
  school_name: string;
  subject_id?: number;
  subject_name?: string;
  is_present?: boolean;
  check_in_time?: string;
}

function AttendanceTab({ centerId, examYearId, schoolId, printInfo }: { centerId: number; examYearId?: number; schoolId?: number | null; printInfo?: PrintInfo }) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [isLooking, setIsLooking] = useState(false);
  const [rosterSearch, setRosterSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const isSchoolView = !!schoolId;

  // For school admin: fetch their students' attendance records
  const { data: schoolAttendance, isLoading: isLoadingAttendance, refetch: refetchAttendance } = useQuery<Array<{
    student: { id: number; firstName: string; middleName?: string; lastName: string; indexNumber?: string; grade: number; gender: string };
    attendance: Array<{ id: number; status: string; attendanceTime: string; subjectId?: number }>;
  }>>({
    queryKey: ["/api/attendance/school-records", { schoolId, centerId, examYearId }],
    enabled: isSchoolView,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (schoolId) params.set("schoolId", String(schoolId));
      if (centerId) params.set("centerId", String(centerId));
      if (examYearId) params.set("examYearId", String(examYearId));
      const res = await fetch(`/api/attendance/school-records?${params}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    },
  });

  // For admin: fetch all students at this center with live attendance from mobile scans
  const { data: centerRecords, isLoading: isLoadingCenter, refetch: refetchCenter } = useQuery<CenterAttendanceRow[]>({
    queryKey: ["/api/attendance/center-records", { centerId, examYearId }],
    enabled: !isSchoolView,
    refetchInterval: 30000,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("centerId", String(centerId));
      if (examYearId) params.set("examYearId", String(examYearId));
      const res = await fetch(`/api/attendance/center-records?${params}`);
      if (!res.ok) throw new Error("Failed to fetch center attendance");
      return res.json();
    },
  });

  const handleLookup = async () => {
    if (!searchQuery.trim()) return;
    setIsLooking(true);
    try {
      const response = await fetch(`/api/attendance/lookup?indexNumber=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (response.ok) {
        setLookupResult(data.student);
      } else {
        setLookupResult(null);
        toast({
          title: response.status === 403 ? "Access Restricted" : "Student Not Found",
          description: data.message || "No student found with this index number",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to lookup student", variant: "destructive" });
    } finally {
      setIsLooking(false);
    }
  };

  const markAttendance = async (status: "present" | "absent") => {
    if (!lookupResult || !examYearId) return;
    try {
      await apiRequest("POST", "/api/attendance", {
        studentId: lookupResult.id,
        centerId,
        examYearId,
        status,
        attendanceTime: new Date().toISOString(),
      });
      toast({ title: "Attendance Marked", description: `${lookupResult.firstName} ${lookupResult.lastName} marked as ${status}` });
      setLookupResult(null);
      setSearchQuery("");
      if (isSchoolView) refetchAttendance();
    } catch (error) {
      toast({ title: "Error", description: "Failed to mark attendance", variant: "destructive" });
    }
  };

  const presentCount = schoolAttendance?.filter(r => r.attendance.some(a => a.status === "present")).length ?? 0;
  const absentCount = schoolAttendance?.filter(r => r.attendance.some(a => a.status === "absent")).length ?? 0;
  const unmarkedCount = schoolAttendance?.filter(r => r.attendance.length === 0).length ?? 0;

  const handlePrintAttendance = () => {
    if (!printInfo || !schoolAttendance) return;
    const logoSrc = window.location.origin + amanahLogo;
    const total = schoolAttendance.length;
    const rows = schoolAttendance.map(({ student, attendance }) => {
      const latest = attendance.sort((a, b) => new Date(b.attendanceTime).getTime() - new Date(a.attendanceTime).getTime())[0];
      const statusText = latest ? (latest.status === "present" ? "Present" : "Absent") : "Not Marked";
      const statusColor = latest ? (latest.status === "present" ? "#059669" : "#dc2626") : "#9ca3af";
      return `<tr>
        <td>${student.firstName} ${student.middleName || ""} ${student.lastName}</td>
        <td style="font-family:monospace">${student.indexNumber || "—"}</td>
        <td>Grade ${student.grade}</td>
        <td style="font-weight:600; color:${statusColor}">${statusText}</td>
        <td style="font-size:11px; color:#6b7280">${latest ? new Date(latest.attendanceTime).toLocaleString() : "—"}</td>
      </tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Attendance</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
        .summary { display:flex; gap:16px; margin-bottom:18px; }
        .stat { background:#f3f4f6; border-radius:6px; padding:10px 20px; text-align:center; flex:1; }
        .stat-num { font-size:22px; font-weight:700; }
        .stat-lbl { font-size:11px; color:#6b7280; }
        table { width:100%; border-collapse:collapse; }
        th { background:#0d9488; color:white; padding:8px 10px; text-align:left; font-size:12px; }
        td { padding:7px 10px; border-bottom:1px solid #e5e7eb; font-size:12px; vertical-align:middle; }
        tr:nth-child(even) td { background:#f9fafb; }
        .footer { text-align:center; margin-top:30px; font-size:11px; color:#9ca3af; border-top:1px solid #e5e7eb; padding-top:10px; }
        @media print { @page { size: A4 portrait; margin: 12mm; } body { padding: 0; } }
      </style></head><body>
      ${buildPrintHeader(printInfo, "Student Attendance Report", logoSrc)}
      <div class="summary">
        <div class="stat"><div class="stat-num" style="color:#059669">${presentCount}</div><div class="stat-lbl">Present</div></div>
        <div class="stat"><div class="stat-num" style="color:#dc2626">${absentCount}</div><div class="stat-lbl">Absent</div></div>
        <div class="stat"><div class="stat-num" style="color:#9ca3af">${unmarkedCount}</div><div class="stat-lbl">Not Marked</div></div>
        <div class="stat"><div class="stat-num">${total}</div><div class="stat-lbl">Total Students</div></div>
      </div>
      <table><thead><tr><th>Student Name</th><th>Index No.</th><th>Grade</th><th>Status</th><th>Time</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="footer">Generated by Amaanah Examination Management System</div>
    </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div className="space-y-4">
      {/* School-scoped attendance summary */}
      {isSchoolView && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold text-chart-2">{presentCount}</p>
              <p className="text-sm text-muted-foreground">Present</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold text-destructive">{absentCount}</p>
              <p className="text-sm text-muted-foreground">Absent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold text-muted-foreground">{unmarkedCount}</p>
              <p className="text-sm text-muted-foreground">Not Marked</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4" />
            Student Lookup
          </CardTitle>
          <CardDescription>
            {isSchoolView
              ? "Enter your student's index number to mark attendance"
              : "Enter index number or scan barcode to mark attendance"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Enter index number (e.g., 100001)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLookup()}
                className="pl-9"
                data-testid="input-attendance-search"
              />
            </div>
            <Button onClick={handleLookup} disabled={isLooking} data-testid="button-lookup">
              {isLooking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
            {!isSchoolView && (
              <Button variant="outline" disabled>
                <QrCode className="w-4 h-4 me-2" />
                Scan
              </Button>
            )}
          </div>

          {lookupResult && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-lg">
                      {lookupResult.firstName} {lookupResult.middleName || ''} {lookupResult.lastName}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                      <span>Index: {lookupResult.indexNumber}</span>
                      <span>Grade: {lookupResult.grade}</span>
                      {!isSchoolView && <span>School: {lookupResult.schoolName}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="default" onClick={() => markAttendance("present")} data-testid="button-mark-present">
                      <CheckCircle2 className="w-4 h-4 me-2" />
                      Present
                    </Button>
                    <Button variant="outline" onClick={() => markAttendance("absent")} data-testid="button-mark-absent">
                      <XCircle className="w-4 h-4 me-2" />
                      Absent
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* School admin: list of their students with attendance status */}
      {isSchoolView && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                My Students' Attendance
              </CardTitle>
              <CardDescription>Attendance status for all your registered students</CardDescription>
            </div>
            {printInfo && schoolAttendance && schoolAttendance.length > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrintAttendance} data-testid="button-print-attendance">
                <Printer className="w-4 h-4 me-2" />
                Print Attendance
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingAttendance ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !schoolAttendance || schoolAttendance.length === 0 ? (
              <p className="text-muted-foreground text-sm">No students registered for this exam year.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Index No.</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schoolAttendance.map(({ student, attendance }) => {
                    const latestRecord = attendance.sort(
                      (a, b) => new Date(b.attendanceTime).getTime() - new Date(a.attendanceTime).getTime()
                    )[0];
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.firstName} {student.middleName || ''} {student.lastName}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">
                          {student.indexNumber || '—'}
                        </TableCell>
                        <TableCell>{student.grade}</TableCell>
                        <TableCell>
                          {latestRecord ? (
                            <Badge
                              variant="outline"
                              className={latestRecord.status === "present"
                                ? "border-chart-2 text-chart-2"
                                : "border-destructive text-destructive"}
                            >
                              {latestRecord.status === "present" ? (
                                <CheckCircle2 className="w-3 h-3 me-1" />
                              ) : (
                                <XCircle className="w-3 h-3 me-1" />
                              )}
                              {latestRecord.status.charAt(0).toUpperCase() + latestRecord.status.slice(1)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Not Marked</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin-only: live attendance roster from mobile scans */}
      {!isSchoolView && (() => {
        const totalStudents = centerRecords ? new Set(centerRecords.map(r => r.student_id)).size : 0;
        const presentCount = centerRecords?.filter(r => r.is_present === true).length ?? 0;
        const absentCount = centerRecords?.filter(r => r.is_present === false).length ?? 0;
        const notScannedCount = centerRecords?.filter(r => r.is_present == null).length ?? 0;

        const grades = centerRecords
          ? [...new Set(centerRecords.map(r => r.grade))].sort((a, b) => a - b)
          : [];

        const filtered = (centerRecords ?? []).filter(row => {
          const fullName = `${row.first_name} ${row.middle_name ?? ""} ${row.last_name}`.toLowerCase();
          const matchesSearch = !rosterSearch ||
            fullName.includes(rosterSearch.toLowerCase()) ||
            (row.index_number ?? "").includes(rosterSearch) ||
            row.school_name.toLowerCase().includes(rosterSearch.toLowerCase());
          const matchesGrade = gradeFilter === "all" || String(row.grade) === gradeFilter;
          const matchesStatus = statusFilter === "all" ||
            (statusFilter === "present" && row.is_present === true) ||
            (statusFilter === "absent" && row.is_present === false) ||
            (statusFilter === "not_scanned" && row.is_present == null);
          return matchesSearch && matchesGrade && matchesStatus;
        });

        return (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Student Attendance Roster
                </CardTitle>
                <CardDescription>
                  Live from mobile scanner — auto-refreshes every 30 seconds
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchCenter()}
                data-testid="button-refresh-roster"
              >
                <RefreshCw className="w-4 h-4 me-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-md border p-3 text-center">
                  <p className="text-xl font-semibold">{totalStudents}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total Students</p>
                </div>
                <div className="rounded-md border p-3 text-center">
                  <p className="text-xl font-semibold text-chart-2">{presentCount}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Present</p>
                </div>
                <div className="rounded-md border p-3 text-center">
                  <p className="text-xl font-semibold text-destructive">{absentCount}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Absent</p>
                </div>
                <div className="rounded-md border p-3 text-center">
                  <p className="text-xl font-semibold text-muted-foreground">{notScannedCount}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Not Scanned</p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search student, school..."
                    value={rosterSearch}
                    onChange={e => setRosterSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-roster-search"
                  />
                </div>
                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger className="w-36" data-testid="select-grade-filter">
                    <Filter className="w-4 h-4 me-2 text-muted-foreground" />
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {grades.map(g => (
                      <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40" data-testid="select-status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="not_scanned">Not Scanned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              {isLoadingCenter ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-11 w-full" />)}
                </div>
              ) : !centerRecords || centerRecords.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No students assigned to this center yet.</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No students match your search.</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Index No.</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Exam Status</TableHead>
                        <TableHead className="text-muted-foreground">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((row, idx) => {
                        const fullName = [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(" ");
                        const isPresent = row.is_present === true;
                        const isAbsent = row.is_present === false;
                        const notScanned = row.is_present == null;
                        return (
                          <TableRow key={`${row.student_id}-${row.subject_id ?? idx}`} data-testid={`row-attendance-${row.student_id}`}>
                            <TableCell className="font-medium">{fullName}</TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {row.index_number || "—"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{row.school_name}</TableCell>
                            <TableCell className="text-sm">
                              {row.subject_name || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              {notScanned ? (
                                <Badge variant="outline" className="text-muted-foreground gap-1">
                                  <Minus className="w-3 h-3" />
                                  Not Scanned
                                </Badge>
                              ) : isPresent ? (
                                <Badge variant="outline" className="border-chart-2 text-chart-2 gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Present
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-destructive text-destructive gap-1">
                                  <XCircle className="w-3 h-3" />
                                  Absent
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {row.check_in_time
                                ? new Date(row.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              <p className="text-xs text-muted-foreground text-right">
                Showing {filtered.length} of {centerRecords?.length ?? 0} records
              </p>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

function MalpracticeTab({ 
  centerId, 
  examYearId, 
  reports 
}: { 
  centerId: number; 
  examYearId?: number;
  reports: CenterDashboardData["malpracticeReports"];
}) {
  const { toast } = useToast();
  const [showReportDialog, setShowReportDialog] = useState(false);

  const form = useForm<MalpracticeFormData>({
    resolver: zodResolver(malpracticeSchema),
    defaultValues: {
      incidentType: "",
      malpracticeType: "",
      description: "",
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (data: MalpracticeFormData) => {
      return apiRequest("POST", "/api/malpractice", {
        ...data,
        centerId,
        examYearId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/centers/${centerId}/dashboard`] });
      setShowReportDialog(false);
      form.reset();
      toast({
        title: "Report Submitted",
        description: "Malpractice report has been recorded",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit report",
        variant: "destructive",
      });
    },
  });

  const malpracticeTypes = [
    { value: "cheating", label: "Cheating" },
    { value: "smuggling_notes", label: "Smuggling Notes" },
    { value: "misconduct", label: "Misconduct" },
    { value: "teacher_interference", label: "Teacher Interference" },
    { value: "impersonation", label: "Impersonation" },
    { value: "collusion", label: "Collusion" },
    { value: "unauthorized_materials", label: "Unauthorized Materials" },
    { value: "other", label: "Other" },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      reported: "secondary",
      under_review: "default",
      confirmed: "destructive",
      dismissed: "outline",
      action_taken: "default",
    };
    return <Badge variant={variants[status] || "secondary"}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Malpractice Reports</h3>
          <p className="text-sm text-muted-foreground">
            {reports.length} report(s) recorded
          </p>
        </div>
        <Button onClick={() => setShowReportDialog(true)} data-testid="button-new-report">
          <Plus className="w-4 h-4 me-2" />
          New Report
        </Button>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Reports</h3>
            <p className="text-muted-foreground">No malpractice incidents have been reported.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <Card key={report.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{report.incidentType}</Badge>
                      {report.malpracticeType && (
                        <Badge variant="secondary">{report.malpracticeType.replace('_', ' ')}</Badge>
                      )}
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-sm">{report.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Reported: {new Date(report.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Malpractice</DialogTitle>
            <DialogDescription>
              Document details of the incident for review
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => reportMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="incidentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-incident-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="malpractice">Malpractice</SelectItem>
                        <SelectItem value="disturbance">Disturbance</SelectItem>
                        <SelectItem value="medical">Medical Emergency</SelectItem>
                        <SelectItem value="security">Security Issue</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="malpracticeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Malpractice Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-malpractice-type">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {malpracticeTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the incident in detail..." 
                        className="min-h-[100px]"
                        {...field} 
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowReportDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={reportMutation.isPending} data-testid="button-submit-report">
                  {reportMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  Submit Report
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CenterPacketRow {
  id: number;
  barcode: string;
  grade: number;
  paper_count: number;
  status: string;
  current_location_type: string;
  created_at: string;
  updated_at: string;
  last_handover_at?: string;
  subject_name: string;
  last_scanner_name?: string;
  last_scanned_at?: string;
  last_scanner_role?: string;
  total_scans: number;
  received_at_center: boolean;
}

const PACKET_STATUS_LABELS: Record<string, string> = {
  created: "Created",
  packed: "Packed",
  dispatched_to_region: "Dispatched to Region",
  at_region: "At Region",
  dispatched_to_cluster: "Dispatched to Cluster",
  at_cluster: "At Cluster",
  dispatched_to_center: "In Transit to Center",
  at_center: "Received at Center",
  opened: "Opened",
  administered: "Administered",
  sealed: "Sealed",
  collected: "Collected",
  returned_to_cluster: "Returned to Cluster",
  returned_to_region: "Returned to Region",
  returned_to_hq: "Returned to HQ",
  completed: "Completed",
  missing: "Missing",
  damaged: "Damaged",
};

function PacketStatusBadge({ status }: { status: string }) {
  const receivedStatuses = new Set(['at_center', 'opened', 'administered', 'sealed', 'collected', 'returned_to_cluster', 'returned_to_region', 'returned_to_hq', 'completed']);
  const inTransitStatuses = new Set(['dispatched_to_region', 'dispatched_to_cluster', 'dispatched_to_center', 'at_region', 'at_cluster']);
  const isReceived = receivedStatuses.has(status);
  const isInTransit = inTransitStatuses.has(status);
  const isDanger = status === 'missing' || status === 'damaged';

  if (isDanger) return (
    <Badge variant="outline" className="border-destructive text-destructive gap-1 whitespace-nowrap">
      <XCircle className="w-3 h-3" />
      {PACKET_STATUS_LABELS[status] ?? status}
    </Badge>
  );
  if (isReceived) return (
    <Badge variant="outline" className="border-chart-2 text-chart-2 gap-1 whitespace-nowrap">
      <PackageCheck className="w-3 h-3" />
      {PACKET_STATUS_LABELS[status] ?? status}
    </Badge>
  );
  if (isInTransit) return (
    <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 gap-1 whitespace-nowrap">
      <Truck className="w-3 h-3" />
      {PACKET_STATUS_LABELS[status] ?? status}
    </Badge>
  );
  return (
    <Badge variant="outline" className="text-muted-foreground gap-1 whitespace-nowrap">
      <PackageX className="w-3 h-3" />
      {PACKET_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function LogisticsTab({ 
  centerId,
  examYearId,
  scriptMovements 
}: { 
  centerId: number;
  examYearId?: number;
  scriptMovements: CenterDashboardData["scriptMovements"];
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [barcodeSearch, setBarcodeSearch] = useState("");

  const { data: packets, isLoading, refetch } = useQuery<CenterPacketRow[]>({
    queryKey: ["/api/exam-packets/for-center", centerId, examYearId],
    refetchInterval: 30000,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (examYearId) params.set("examYearId", String(examYearId));
      const res = await fetch(`/api/exam-packets/for-center/${centerId}?${params}`);
      if (!res.ok) throw new Error("Failed to load packets");
      return res.json();
    },
  });

  const grades = packets ? [...new Set(packets.map(p => p.grade))].sort((a, b) => a - b) : [];

  const filtered = (packets ?? []).filter(p => {
    const matchesGrade = gradeFilter === "all" || String(p.grade) === gradeFilter;
    const matchesBarcode = !barcodeSearch || p.barcode.toLowerCase().includes(barcodeSearch.toLowerCase()) || p.subject_name.toLowerCase().includes(barcodeSearch.toLowerCase());
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "received" && p.received_at_center) ||
      (statusFilter === "in_transit" && ['dispatched_to_center', 'dispatched_to_cluster', 'dispatched_to_region', 'at_cluster', 'at_region'].includes(p.status)) ||
      (statusFilter === "not_dispatched" && ['created', 'packed'].includes(p.status));
    return matchesGrade && matchesBarcode && matchesStatus;
  });

  const totalPackets = packets?.length ?? 0;
  const receivedCount = packets?.filter(p => p.received_at_center).length ?? 0;
  const inTransitCount = packets?.filter(p => ['dispatched_to_center', 'dispatched_to_cluster', 'dispatched_to_region', 'at_cluster', 'at_region'].includes(p.status)).length ?? 0;
  const notDispatchedCount = packets?.filter(p => ['created', 'packed'].includes(p.status)).length ?? 0;

  return (
    <div className="space-y-4">
      {/* Packet Tracking Section */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" />
              Exam Packet Tracking
            </CardTitle>
            <CardDescription>
              All packets assigned to this center — live from logistics system
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-packets">
            <RefreshCw className="w-4 h-4 me-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-md border p-3 text-center">
              <p className="text-xl font-semibold">{totalPackets}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Packets</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-xl font-semibold text-chart-2">{receivedCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Received</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-xl font-semibold text-amber-600 dark:text-amber-400">{inTransitCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">In Transit</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-xl font-semibold text-muted-foreground">{notDispatchedCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Not Dispatched</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-44">
              <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search barcode or subject..."
                value={barcodeSearch}
                onChange={e => setBarcodeSearch(e.target.value)}
                className="pl-9"
                data-testid="input-packet-search"
              />
            </div>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-36" data-testid="select-packet-grade">
                <Filter className="w-4 h-4 me-2 text-muted-foreground" />
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {grades.map(g => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44" data-testid="select-packet-status">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="received">Received at Center</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="not_dispatched">Not Dispatched</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !packets || packets.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No exam packets have been assigned to this center yet.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No packets match your filter.</div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Papers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Update</TableHead>
                    <TableHead>Scans</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(packet => (
                    <>
                      <TableRow
                        key={packet.id}
                        className="cursor-pointer"
                        onClick={() => setExpandedId(expandedId === packet.id ? null : packet.id)}
                        data-testid={`row-packet-${packet.id}`}
                      >
                        <TableCell className="text-muted-foreground">
                          {expandedId === packet.id
                            ? <ChevronUp className="w-4 h-4" />
                            : <ChevronDown className="w-4 h-4" />}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{packet.barcode}</TableCell>
                        <TableCell className="font-medium text-sm">{packet.subject_name}</TableCell>
                        <TableCell className="text-sm">Grade {packet.grade}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{packet.paper_count}</TableCell>
                        <TableCell>
                          <PacketStatusBadge status={packet.status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {packet.last_scanned_at
                            ? new Date(packet.last_scanned_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
                            : packet.updated_at
                            ? new Date(packet.updated_at).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{packet.total_scans}</TableCell>
                      </TableRow>
                      {expandedId === packet.id && (
                        <TableRow key={`${packet.id}-detail`}>
                          <TableCell colSpan={8} className="bg-muted/30 p-0">
                            <div className="px-6 py-4 space-y-3">
                              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Current Location</p>
                                  <div className="flex items-center gap-1.5 font-medium">
                                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                    {packet.current_location_type.charAt(0).toUpperCase() + packet.current_location_type.slice(1)}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Last Scanned By</p>
                                  <div className="flex items-center gap-1.5 font-medium">
                                    <ScanLine className="w-3.5 h-3.5 text-muted-foreground" />
                                    {packet.last_scanner_name
                                      ? `${packet.last_scanner_name} (${packet.last_scanner_role?.replace(/_/g, " ")})`
                                      : "Not yet scanned"}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Received at Center</p>
                                  <div className="flex items-center gap-1.5 font-medium">
                                    {packet.received_at_center
                                      ? <><CheckCircle2 className="w-3.5 h-3.5 text-chart-2" /><span className="text-chart-2">Yes</span></>
                                      : <><XCircle className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-muted-foreground">Not yet</span></>}
                                  </div>
                                </div>
                              </div>
                              {packet.last_scanned_at && (
                                <p className="text-xs text-muted-foreground">
                                  Last scan: {new Date(packet.last_scanned_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-xs text-muted-foreground text-right">
            Showing {filtered.length} of {totalPackets} packets · auto-refreshes every 30 seconds
          </p>
        </CardContent>
      </Card>

      {/* Script Collections - legacy section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Script Collections
              </CardTitle>
              <CardDescription>
                Track answer script handling
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {scriptMovements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No script collections recorded</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade</TableHead>
                  <TableHead>Total Scripts</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>Absent</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scriptMovements.map(movement => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-medium">Grade {movement.grade}</TableCell>
                    <TableCell>{movement.totalScripts}</TableCell>
                    <TableCell className="text-chart-2">{movement.presentCount || 0}</TableCell>
                    <TableCell className="text-destructive">{movement.absentCount || 0}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{movement.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface CenterHall { id: number; centerId: number; name: string; capacity: number; }

function HallsTab({ centerId, canManage }: { centerId: number; canManage: boolean }) {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingHall, setEditingHall] = useState<CenterHall | null>(null);

  const { data: halls = [], isLoading } = useQuery<CenterHall[]>({
    queryKey: [`/api/centers/${centerId}/halls`],
  });

  const hallSchema = z.object({
    name: z.string().min(1, "Name is required"),
    capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").default(40),
  });
  type HallFormData = z.infer<typeof hallSchema>;

  const form = useForm<HallFormData>({
    resolver: zodResolver(hallSchema),
    defaultValues: { name: "", capacity: 40 },
  });

  const createMutation = useMutation({
    mutationFn: (data: HallFormData) =>
      apiRequest("POST", `/api/centers/${centerId}/halls`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/centers/${centerId}/halls`] });
      setShowDialog(false);
      form.reset();
      toast({ title: "Hall created" });
    },
    onError: () => toast({ title: "Error", description: "Failed to create hall", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: HallFormData) =>
      apiRequest("PATCH", `/api/center-halls/${editingHall!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/centers/${centerId}/halls`] });
      setShowDialog(false);
      setEditingHall(null);
      form.reset();
      toast({ title: "Hall updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update hall", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/center-halls/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/centers/${centerId}/halls`] });
      toast({ title: "Hall deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete hall", variant: "destructive" }),
  });

  function openCreate() {
    setEditingHall(null);
    form.reset({ name: "", capacity: 30 });
    setShowDialog(true);
  }

  function openEdit(hall: CenterHall) {
    setEditingHall(hall);
    form.reset({ name: hall.name, capacity: hall.capacity });
    setShowDialog(true);
  }

  function onSubmit(data: HallFormData) {
    if (editingHall) updateMutation.mutate(data);
    else createMutation.mutate(data);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Exam Halls</h3>
          <p className="text-sm text-muted-foreground">Rooms / halls within this center used during examinations</p>
        </div>
        {canManage && (
          <Button size="sm" onClick={openCreate} data-testid="button-add-hall">
            <Plus className="w-4 h-4 me-2" />
            Add Hall
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}
        </div>
      ) : halls.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Halls Configured</h3>
            <p className="text-muted-foreground">Add halls / rooms to organise students and exam packets by location.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hall Name</TableHead>
                <TableHead>Capacity</TableHead>
                {canManage && <TableHead className="text-end">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {halls.map(hall => (
                <TableRow key={hall.id} data-testid={`row-hall-${hall.id}`}>
                  <TableCell className="font-medium">{hall.name}</TableCell>
                  <TableCell>{hall.capacity} students</TableCell>
                  {canManage && (
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(hall)} data-testid={`button-edit-hall-${hall.id}`}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(hall.id)} data-testid={`button-delete-hall-${hall.id}`}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingHall ? "Edit Hall" : "Add Hall"}</DialogTitle>
            <DialogDescription>
              {editingHall ? "Update hall details." : "Add a new hall / room to this exam center."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Hall Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Hall A, Room 1" data-testid="input-hall-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="capacity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity (students)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} data-testid="input-hall-capacity" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-hall">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {editingHall ? "Save Changes" : "Add Hall"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SchoolsTab({
  schools,
  centerId,
  examYearId,
  canManage,
  onRefetch,
}: {
  schools: CenterDashboardData["schools"];
  centerId: number;
  examYearId?: number;
  canManage: boolean;
  onRefetch: () => void;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [actionSchool, setActionSchool] = useState<CenterDashboardData["schools"][0] | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState<string>("");

  const { data: allCenters } = useQuery<{ id: number; name: string; code: string }[]>({
    queryKey: ["/api/centers"],
    enabled: canManage,
  });

  const otherCenters = (allCenters || []).filter(c => c.id !== centerId);

  const moveMutation = useMutation({
    mutationFn: async ({ schoolId, targetCenterId }: { schoolId: number; targetCenterId: number }) => {
      return apiRequest("PATCH", `/api/schools/${schoolId}/move-center`, {
        targetCenterId,
        examYearId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: q => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/centers") });
      setShowMoveDialog(false);
      setActionSchool(null);
      setMoveTargetId("");
      onRefetch();
      toast({ title: "School Moved", description: `${actionSchool?.name} has been moved to the selected center.` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message || "Failed to move school", variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async ({ schoolId }: { schoolId: number }) => {
      return apiRequest("DELETE", `/api/schools/${schoolId}/unassign-center`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: q => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/centers") });
      setShowRemoveDialog(false);
      setActionSchool(null);
      onRefetch();
      toast({ title: "School Removed", description: `${actionSchool?.name} has been unassigned from this center.` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message || "Failed to remove school", variant: "destructive" }),
  });

  const filtered = schools.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(search.toLowerCase())
  );

  if (schools.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <School className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Schools Assigned</h3>
          <p className="text-muted-foreground">No schools have been assigned to this center yet.</p>
        </CardContent>
      </Card>
    );
  }

  const totalStudents = schools.reduce((sum, s) => sum + (s.studentCount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <div className="bg-primary/10 text-primary rounded-md px-3 py-1.5 text-sm font-medium flex items-center gap-2">
            <School className="w-4 h-4" />
            {schools.length} {schools.length === 1 ? "School" : "Schools"}
          </div>
          <div className="bg-muted rounded-md px-3 py-1.5 text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            {totalStudents} Students enrolled
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search schools..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-schools-search"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">No schools match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(school => (
            <Card key={school.id} className="hover-elevate" data-testid={`card-school-${school.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {school.schoolBadge ? (
                    <div className="shrink-0">
                      <img
                        src={school.schoolBadge}
                        alt={`${school.name} badge`}
                        className="w-14 h-14 rounded-md object-contain border border-muted bg-white dark:bg-background"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                      <div className="w-14 h-14 rounded-md bg-primary/10 items-center justify-center hidden">
                        <School className="w-7 h-7 text-primary" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <School className="w-7 h-7 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium leading-snug line-clamp-2" dir="auto">{school.name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <Badge variant="outline" className="text-xs">{school.schoolType}</Badge>
                      {(school.studentCount ?? 0) > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {school.studentCount} {school.studentCount === 1 ? "student" : "students"}
                        </Badge>
                      )}
                    </div>
                    {school.gradeBreakdown && Object.keys(school.gradeBreakdown).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(school.gradeBreakdown)
                          .sort(([a], [b]) => Number(a) - Number(b))
                          .map(([grade, count]) => (
                            <span key={grade} className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                              G{grade}: {count}
                            </span>
                          ))}
                      </div>
                    )}
                    {school.email && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{school.email}</p>
                    )}
                  </div>

                  {/* Action menu — admins only */}
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 -mt-1 -me-1"
                          data-testid={`button-school-actions-${school.id}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => { setActionSchool(school); setMoveTargetId(""); setShowMoveDialog(true); }}
                          data-testid={`menuitem-move-school-${school.id}`}
                        >
                          <MoveRight className="w-4 h-4 me-2" />
                          Move to Another Center
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => { setActionSchool(school); setShowRemoveDialog(true); }}
                          data-testid={`menuitem-remove-school-${school.id}`}
                        >
                          <UserMinus className="w-4 h-4 me-2" />
                          Remove from Center
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Move to Another Center Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={(open) => { setShowMoveDialog(open); if (!open) { setActionSchool(null); setMoveTargetId(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MoveRight className="w-5 h-5 text-primary" />
              Move School to Another Center
            </DialogTitle>
            <DialogDescription>
              Select the destination center for <span className="font-medium">{actionSchool?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={moveTargetId} onValueChange={setMoveTargetId}>
              <SelectTrigger data-testid="select-move-target-center">
                <SelectValue placeholder="Select destination center…" />
              </SelectTrigger>
              <SelectContent>
                {otherCenters.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} <span className="text-muted-foreground text-xs">({c.code})</span>
                  </SelectItem>
                ))}
                {otherCenters.length === 0 && (
                  <SelectItem value="__none" disabled>No other centers available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowMoveDialog(false); setActionSchool(null); setMoveTargetId(""); }}>
              Cancel
            </Button>
            <Button
              onClick={() => actionSchool && moveTargetId && moveTargetId !== "__none" && moveMutation.mutate({ schoolId: actionSchool.id, targetCenterId: parseInt(moveTargetId) })}
              disabled={!moveTargetId || moveTargetId === "__none" || moveMutation.isPending}
              data-testid="button-confirm-move-school"
            >
              {moveMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              <MoveRight className="w-4 h-4 me-2" />
              Move School
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove from Center Confirmation */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-amber-500" />
              Remove School from Center
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will unassign <span className="font-medium">{actionSchool?.name}</span> from this center. The school record and its students will remain intact. You can reassign the school to a center later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setActionSchool(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionSchool && removeMutation.mutate({ schoolId: actionSchool.id })}
              disabled={removeMutation.isPending}
              className="bg-amber-600 text-white hover:bg-amber-700"
              data-testid="button-confirm-remove-school"
            >
              {removeMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              Remove from Center
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

function ActivityTab({ activities }: { activities: CenterDashboardData["recentActivity"] }) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Activity</h3>
          <p className="text-muted-foreground">No activity has been recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map(activity => (
            <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <Badge variant="outline" className="mb-1">{activity.activityType}</Badge>
                <p className="text-sm">{activity.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(activity.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CenterDashboard() {
  const { id } = useParams<{ id: string }>();
  const centerId = parseInt(id || "0");
  const { toast } = useToast();
  const { isRTL } = useLanguage();
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery<CenterDashboardData>({
    queryKey: [`/api/centers/${centerId}/dashboard`],
    enabled: centerId > 0,
  });

  const { data: halls = [] } = useQuery<CenterHall[]>({
    queryKey: [`/api/centers/${centerId}/halls`],
    enabled: centerId > 0,
  });

  const isSchoolAdmin = user?.role === "school_admin";
  const backUrl = isSchoolAdmin ? "/center-info" : "/centers";
  const backLabel = isSchoolAdmin ? "Back to Exam Center" : "Back to Centers";

  // Must be declared before any conditional returns to comply with React hooks rules
  const isSchoolView = data?.schoolView === true;
  const schoolId = data?.schoolId;
  const { data: schoolData } = useQuery<{ id: number; name: string; schoolBadge?: string | null }>({
    queryKey: [`/api/schools/${schoolId}`],
    enabled: isSchoolView && !!schoolId,
  });

  if (!centerId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Invalid center ID</p>
        <Link href={backUrl}>
          <Button className="mt-4">
            <ArrowLeft className="w-4 h-4 me-2" />
            {backLabel}
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">Failed to load center dashboard</p>
        <div className="flex justify-center gap-2">
          <Button onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 me-2" />
            Retry
          </Button>
          <Link href={backUrl}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 me-2" />
              {backLabel}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { center, examYear, statistics, schools, timetable, paperMovements, scriptMovements, malpracticeReports, recentActivity, invigilators } = data;

  const printInfo: PrintInfo | undefined = isSchoolView ? {
    centerName: center.name,
    centerAddress: center.address,
    examYearName: examYear?.name,
    schoolName: schoolData?.name,
    schoolBadge: schoolData?.schoolBadge,
  } : undefined;

  return (
    <div className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={backUrl}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{center.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Code: {center.code}</span>
              {examYear && (
                <Badge variant="outline">{examYear.name}</Badge>
              )}
            </div>
          </div>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 me-2" />
          Refresh
        </Button>
      </div>

      {isSchoolView ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard label="My Students" value={statistics.totalStudents} icon={Users} variant="success" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard label="Schools" value={statistics.totalSchools} icon={School} />
          <StatCard label="Students" value={statistics.totalStudents} icon={Users} variant="success" />
          <StatCard label="Examiners" value={statistics.totalInvigilators} icon={Users} />
          <StatCard label="Pending Papers" value={statistics.pendingPapers} icon={Package} variant="warning" />
          <StatCard label="Pending Scripts" value={statistics.pendingScripts} icon={FileText} variant="warning" />
          <StatCard label="Malpractice" value={statistics.malpracticeCount} icon={AlertTriangle} variant="error" />
        </div>
      )}

      <Tabs defaultValue="overview">
        {isSchoolView ? (
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="timetable" data-testid="tab-timetable">Timetable</TabsTrigger>
            <TabsTrigger value="attendance" data-testid="tab-attendance">Attendance</TabsTrigger>
          </TabsList>
        ) : (
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="timetable" data-testid="tab-timetable">Timetable</TabsTrigger>
            <TabsTrigger value="attendance" data-testid="tab-attendance">Attendance</TabsTrigger>
            <TabsTrigger value="malpractice" data-testid="tab-malpractice">Malpractice</TabsTrigger>
            <TabsTrigger value="logistics" data-testid="tab-logistics">Logistics</TabsTrigger>
            <TabsTrigger value="schools" data-testid="tab-schools">Schools</TabsTrigger>
            <TabsTrigger value="halls" data-testid="tab-halls">Halls</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isSchoolView ? "My Students by Grade" : "Students by Grade"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(statistics.studentsByGrade).length === 0 ? (
                  <p className="text-muted-foreground">No students enrolled</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(statistics.studentsByGrade).map(([grade, count]) => (
                      <div key={grade} className="flex items-center justify-between">
                        <span>Grade {grade}</span>
                        <Badge variant="outline">{count} students</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Center Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{center.address || "No address"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>Capacity: {halls && halls.length > 0 ? `${halls.reduce((s: number, h: any) => s + (h.capacity || 0), 0)} (${halls.length} hall${halls.length !== 1 ? 's' : ''})` : '0 (no halls)'}</span>
                </div>
                {center.contactPerson && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Contact:</span>
                    <span>{center.contactPerson}</span>
                    {center.contactPhone && <span>({center.contactPhone})</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {!isSchoolView && <ActivityTab activities={recentActivity} />}
        </TabsContent>

        <TabsContent value="timetable" className="mt-4">
          <TimetableTab timetable={timetable} printInfo={printInfo} />
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <AttendanceTab centerId={centerId} examYearId={examYear?.id} schoolId={isSchoolView ? schoolId : null} printInfo={printInfo} />
        </TabsContent>

        {!isSchoolView && (
          <>
            <TabsContent value="malpractice" className="mt-4">
              <MalpracticeTab 
                centerId={centerId} 
                examYearId={examYear?.id} 
                reports={malpracticeReports} 
              />
            </TabsContent>

            <TabsContent value="logistics" className="mt-4">
              <LogisticsTab 
                centerId={centerId}
                examYearId={examYear?.id}
                scriptMovements={scriptMovements} 
              />
            </TabsContent>

            <TabsContent value="schools" className="mt-4">
              <SchoolsTab
                schools={schools}
                centerId={centerId}
                examYearId={examYear?.id}
                canManage={['super_admin', 'examination_admin'].includes(user?.role || '')}
                onRefetch={refetch}
              />
            </TabsContent>

            <TabsContent value="halls" className="mt-4">
              <HallsTab
                centerId={centerId}
                canManage={['super_admin', 'examination_admin'].includes(user?.role || '')}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
