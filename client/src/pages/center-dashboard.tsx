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
} from "lucide-react";
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

function AttendanceTab({ centerId, examYearId, schoolId, printInfo }: { centerId: number; examYearId?: number; schoolId?: number | null; printInfo?: PrintInfo }) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [isLooking, setIsLooking] = useState(false);
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

      {/* Admin-only options */}
      {!isSchoolView && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Attendance Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
                <FileText className="w-6 h-6" />
                <span>Print Attendance Sheet</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
                <Users className="w-6 h-6" />
                <span>Bulk Mark by Grade</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6" />
                <span>Sync Attendance</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
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

function LogisticsTab({ 
  paperMovements, 
  scriptMovements 
}: { 
  paperMovements: CenterDashboardData["paperMovements"];
  scriptMovements: CenterDashboardData["scriptMovements"];
}) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      prepared: "secondary",
      dispatched: "default",
      received: "default",
      stored: "outline",
      distributed: "default",
      collected: "default",
      returned: "outline",
    };
    return colors[status] || "secondary";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Paper Movements
              </CardTitle>
              <CardDescription>
                Track question papers and materials
              </CardDescription>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 me-2" />
              Record Receipt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paperMovements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No paper movements recorded</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paperMovements.map(movement => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-medium">{movement.paperType}</TableCell>
                    <TableCell>{movement.quantity}</TableCell>
                    <TableCell>{movement.grade ? `Grade ${movement.grade}` : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(movement.status)}>
                        {movement.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(movement.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 me-2" />
              Record Collection
            </Button>
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
                      <Badge variant={getStatusColor(movement.status)}>
                        {movement.status}
                      </Badge>
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

function SchoolsTab({ schools }: { schools: CenterDashboardData["schools"] }) {
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

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {schools.map(school => (
        <Card key={school.id} className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {school.schoolBadge ? (
                <div className="shrink-0">
                  <img
                    src={school.schoolBadge}
                    alt={`${school.name} badge`}
                    className="w-16 h-16 rounded-md object-contain border border-muted shadow-sm bg-white dark:bg-background"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                  <div className="w-16 h-16 rounded-md bg-primary/10 items-center justify-center hidden">
                    <School className="w-8 h-8 text-primary" />
                  </div>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <School className="w-8 h-8 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium leading-snug">{school.name}</p>
                <Badge variant="outline" className="mt-1.5 text-xs">
                  {school.schoolType}
                </Badge>
                {school.email && (
                  <p className="text-xs text-muted-foreground mt-2 truncate">{school.email}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
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
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="timetable" data-testid="tab-timetable">Timetable</TabsTrigger>
            <TabsTrigger value="attendance" data-testid="tab-attendance">Attendance</TabsTrigger>
            <TabsTrigger value="malpractice" data-testid="tab-malpractice">Malpractice</TabsTrigger>
            <TabsTrigger value="logistics" data-testid="tab-logistics">Logistics</TabsTrigger>
            <TabsTrigger value="schools" data-testid="tab-schools">Schools</TabsTrigger>
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
                  <span>Capacity: {center.capacity}</span>
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
                paperMovements={paperMovements} 
                scriptMovements={scriptMovements} 
              />
            </TabsContent>

            <TabsContent value="schools" className="mt-4">
              <SchoolsTab schools={schools} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
