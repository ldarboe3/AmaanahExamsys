import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  MapPin,
  Phone,
  Mail,
  Users,
  CheckCircle2,
  XCircle,
  Building2,
  Hash,
  User,
  Calendar,
  Clock,
  ClipboardList,
  Printer,
  RefreshCw,
  Minus,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import amanahLogo from "@assets/Amana_Logo_1770390631299.jpeg";

interface Center {
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
  assignedSchoolsCount?: number;
  assignedStudentsCount?: number;
}

interface TimetableEntry {
  id: number;
  examDate: string;
  startTime: string;
  endTime: string;
  grade: number;
  subjectId: number;
  venue?: string;
  subject?: { id: number; name: string; arabicName?: string };
}

interface AttendanceMatrixSubject {
  subjectId: number;
  subjectName: string;
  subjectArabicName: string;
  grade: number;
  examDate: string;
  startTime: string;
  endTime: string;
}

interface AttendanceMatrixStudent {
  id: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  indexNumber?: string;
  grade: number;
  gender: string;
  attendance: Record<number, { isPresent: boolean; checkInTime: string | null } | null>;
}

interface AttendanceMatrix {
  subjects: AttendanceMatrixSubject[];
  students: AttendanceMatrixStudent[];
}

const DATE_COLORS = [
  { card: "border-primary/20", header: "bg-primary/5", tableHead: "bg-primary/5" },
  { card: "border-chart-2/20", header: "bg-chart-2/5", tableHead: "bg-chart-2/5" },
  { card: "border-chart-4/20", header: "bg-chart-4/5", tableHead: "bg-chart-4/5" },
  { card: "border-chart-3/20", header: "bg-chart-3/5", tableHead: "bg-chart-3/5" },
];

function buildPrintHeader(centerName: string, title: string, logoSrc: string) {
  return `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #0d9488;">
      <img src="${logoSrc}" style="height:56px;object-fit:contain;" />
      <div>
        <div style="font-size:18px;font-weight:700;color:#0d9488">Amaanah Examination Management System</div>
        <div style="font-size:13px;color:#374151;margin-top:2px;">${centerName} — ${title}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:2px;">Generated: ${new Date().toLocaleString()}</div>
      </div>
    </div>`;
}

export default function SchoolCenterInfo() {
  const { isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState("center");

  const { data: centers, isLoading: isLoadingCenter } = useQuery<Center[]>({
    queryKey: ["/api/centers"],
  });

  const center = centers?.[0] ?? null;

  const { data: timetable, isLoading: isLoadingTimetable } = useQuery<TimetableEntry[]>({
    queryKey: ["/api/timetable"],
    enabled: activeTab === "timetable",
  });

  const { data: matrix, isLoading: isLoadingMatrix, refetch: refetchMatrix } = useQuery<AttendanceMatrix>({
    queryKey: ["/api/school/attendance-matrix"],
    enabled: activeTab === "attendance",
  });

  const groupedTimetable = (timetable ?? []).reduce((acc, entry) => {
    if (!acc[entry.examDate]) acc[entry.examDate] = [];
    acc[entry.examDate].push(entry);
    return acc;
  }, {} as Record<string, TimetableEntry[]>);
  const sortedDates = Object.keys(groupedTimetable).sort();

  const handlePrintTimetable = () => {
    if (!timetable || !center) return;
    const logoSrc = window.location.origin + amanahLogo;
    const rows = sortedDates.map(date => {
      const label = new Date(date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const entries = groupedTimetable[date]
        .map(e => `<tr>
          <td>${e.startTime} – ${e.endTime}</td>
          <td>${e.subject?.name || "—"}${e.subject?.arabicName && e.subject.arabicName !== e.subject.name ? `<br><span dir="rtl" style="font-size:11px;color:#6b7280">${e.subject.arabicName}</span>` : ""}</td>
          <td>Grade ${e.grade}</td>
          <td>${e.venue || center.name}</td>
        </tr>`).join("");
      return `<div class="day-block"><div class="day-header">${label}</div><table><thead><tr><th>Time</th><th>Subject</th><th>Grade</th><th>Venue</th></tr></thead><tbody>${entries}</tbody></table></div>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Timetable</title>
      <style>* { box-sizing: border-box; } body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
        .day-block { margin-bottom: 22px; }
        .day-header { background:#0d9488; color:white; padding:7px 12px; font-weight:bold; font-size:13px; border-radius:4px 4px 0 0; }
        table { width:100%; border-collapse:collapse; } th { background:#e6f7f5; padding:7px 10px; text-align:left; font-size:12px; border:1px solid #a7f3d0; }
        td { padding:7px 10px; border:1px solid #e5e7eb; font-size:12px; vertical-align:top; }
        tr:nth-child(even) td { background:#f9fafb; }
        .footer { text-align:center; margin-top:30px; font-size:11px; color:#9ca3af; border-top:1px solid #e5e7eb; padding-top:10px; }
        @media print { @page { size: A4; margin: 12mm; } body { padding: 0; } }</style></head><body>
      ${buildPrintHeader(center.name, "Examination Timetable", logoSrc)}
      ${rows}
      <div class="footer">Generated by Amaanah Examination Management System</div></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const handlePrintAttendance = () => {
    if (!matrix || !center) return;
    const { subjects, students } = matrix;
    const logoSrc = window.location.origin + amanahLogo;

    const headerCols = subjects.map(s => `<th>${s.subjectName}<br><span style="font-size:9px;color:#9ca3af">${s.examDate}</span></th>`).join("");
    const rows = students.map(st => {
      const name = [st.firstName, st.middleName, st.lastName].filter(Boolean).join(" ");
      const cols = subjects.map(s => {
        const rec = st.attendance[s.subjectId];
        if (rec === null || rec === undefined) return `<td style="color:#9ca3af;text-align:center">—</td>`;
        if (rec.isPresent) return `<td style="color:#059669;font-weight:600;text-align:center">P</td>`;
        return `<td style="color:#dc2626;font-weight:600;text-align:center">A</td>`;
      }).join("");
      return `<tr><td>${name}</td><td style="font-family:monospace">${st.indexNumber || "—"}</td><td>G${st.grade}</td>${cols}</tr>`;
    }).join("");

    const presentTotal = students.reduce((acc, st) => acc + subjects.filter(s => st.attendance[s.subjectId]?.isPresent).length, 0);
    const absentTotal = students.reduce((acc, st) => acc + subjects.filter(s => st.attendance[s.subjectId]?.isPresent === false).length, 0);

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Attendance</title>
      <style>* { box-sizing: border-box; } body { font-family: Arial, sans-serif; padding: 20px; color: #111; font-size: 11px; }
        table { width:100%; border-collapse:collapse; }
        th { background:#0d9488; color:white; padding:5px 6px; text-align:left; font-size:10px; }
        td { padding:5px 6px; border-bottom:1px solid #e5e7eb; }
        tr:nth-child(even) td { background:#f9fafb; }
        .legend { margin-bottom:10px; font-size:11px; color:#374151; }
        .footer { text-align:center; margin-top:20px; font-size:10px; color:#9ca3af; border-top:1px solid #e5e7eb; padding-top:8px; }
        @media print { @page { size: A4 landscape; margin: 8mm; } body { padding: 0; } }</style></head><body>
      ${buildPrintHeader(center.name, "Student Subject Attendance", logoSrc)}
      <div class="legend">P = Present &nbsp;&nbsp; A = Absent &nbsp;&nbsp; — = Not Recorded &nbsp;&nbsp; | &nbsp;&nbsp; Total Present: ${presentTotal} &nbsp;&nbsp; Total Absent: ${absentTotal}</div>
      <table><thead><tr><th>Student</th><th>Index No.</th><th>Grade</th>${headerCols}</tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="footer">Generated by Amaanah Examination Management System</div></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  if (isLoadingCenter) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!center) {
    return (
      <div className="p-6" dir={isRTL ? "rtl" : "ltr"}>
        <h1 className="text-2xl font-semibold mb-1">Exam Center</h1>
        <p className="text-muted-foreground mb-6">Your assigned examination center</p>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Building2 className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-lg font-medium text-muted-foreground">No Center Assigned</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Your school has not been assigned to an examination center yet.
              Please contact the examination authority for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gradeStudents = matrix?.students ?? [];
  const gradeSubjects = matrix?.subjects ?? [];

  const presentCounts = gradeStudents.reduce((acc, st) => {
    const count = gradeSubjects.filter(s => st.attendance[s.subjectId]?.isPresent === true).length;
    return acc + count;
  }, 0);
  const absentCounts = gradeStudents.reduce((acc, st) => {
    const count = gradeSubjects.filter(s => st.attendance[s.subjectId]?.isPresent === false).length;
    return acc + count;
  }, 0);
  const totalPossible = gradeStudents.length * gradeSubjects.length;
  const notMarked = totalPossible - presentCounts - absentCounts;

  return (
    <div className="p-6 space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-semibold">Exam Center</h1>
        <p className="text-muted-foreground">Your assigned examination center</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{center.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{center.code}</span>
                  {center.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {center.address}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={center.isActive ? "border-chart-2 text-chart-2" : "border-destructive text-destructive"}
            >
              {center.isActive ? <CheckCircle2 className="w-3 h-3 me-1" /> : <XCircle className="w-3 h-3 me-1" />}
              {center.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-md border p-3 text-center">
              <p className="text-lg font-semibold text-primary">{center.assignedSchoolsCount ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Schools at Center</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-lg font-semibold text-chart-2">{center.assignedStudentsCount ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Candidates</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-lg font-semibold">{center.capacity}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Capacity</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-lg font-semibold">{center.contactPerson || "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Contact Person</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="center" data-testid="tab-center-info">
            <Building2 className="w-4 h-4 me-2" />
            Center Info
          </TabsTrigger>
          <TabsTrigger value="timetable" data-testid="tab-timetable">
            <Calendar className="w-4 h-4 me-2" />
            Timetable
          </TabsTrigger>
          <TabsTrigger value="attendance" data-testid="tab-attendance">
            <ClipboardList className="w-4 h-4 me-2" />
            Attendance
          </TabsTrigger>
        </TabsList>

        {/* Center Info Tab */}
        <TabsContent value="center" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Center Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                {[
                  { icon: Hash, label: "Center Code", value: center.code },
                  { icon: MapPin, label: "Address", value: center.address || "Not specified" },
                  { icon: User, label: "Contact Person", value: center.contactPerson || "Not specified" },
                  { icon: Phone, label: "Phone", value: center.contactPhone || "Not specified" },
                  { icon: Mail, label: "Email", value: center.contactEmail || "Not specified" },
                  { icon: Users, label: "Capacity", value: `${center.capacity} candidates` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <dt className="text-sm text-muted-foreground w-32 flex-shrink-0">{label}</dt>
                      <dd className="text-sm font-medium">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timetable Tab */}
        <TabsContent value="timetable" className="mt-4 space-y-4">
          {isLoadingTimetable ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
          ) : !timetable || timetable.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Timetable Published</h3>
                <p className="text-muted-foreground text-sm">The exam timetable has not been published yet. Check back later.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-muted-foreground">
                  {timetable.length} exam session{timetable.length !== 1 ? "s" : ""} across {sortedDates.length} day{sortedDates.length !== 1 ? "s" : ""}
                </p>
                <Button variant="outline" size="sm" onClick={handlePrintTimetable} data-testid="button-print-timetable">
                  <Printer className="w-4 h-4 me-2" />
                  Print Timetable
                </Button>
              </div>
              {sortedDates.map((date, dateIndex) => {
                const colors = DATE_COLORS[dateIndex % DATE_COLORS.length];
                const entries = groupedTimetable[date];
                return (
                  <Card key={date} className={`border ${colors.card} overflow-hidden`}>
                    <CardHeader className={`pb-3 ${colors.header}`}>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(date).toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
                          weekday: "long", year: "numeric", month: "long", day: "numeric",
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
                          {entries.map(entry => (
                            <TableRow key={entry.id}>
                              <TableCell className="ps-4 py-3 font-medium whitespace-nowrap">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                  {entry.startTime} – {entry.endTime}
                                </span>
                              </TableCell>
                              <TableCell className="py-3">
                                {entry.subject ? (
                                  <div>
                                    <span>{entry.subject.name}</span>
                                    {entry.subject.arabicName && entry.subject.arabicName !== entry.subject.name && (
                                      <span className="text-muted-foreground block text-sm" dir="rtl">
                                        {entry.subject.arabicName}
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
                                {entry.venue || center.name}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="mt-4 space-y-4">
          {isLoadingMatrix ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : !matrix || matrix.students.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Students Enrolled</h3>
                <p className="text-muted-foreground text-sm">
                  No approved students found for the current exam year.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary strip */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-semibold text-chart-2">{presentCounts}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Present (total sessions)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-semibold text-destructive">{absentCounts}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Absent (total sessions)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-semibold text-muted-foreground">{notMarked}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Not Yet Recorded</p>
                  </CardContent>
                </Card>
              </div>

              {/* Matrix table */}
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap pb-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ClipboardList className="w-4 h-4" />
                      Student Attendance by Subject
                    </CardTitle>
                    <CardDescription>
                      {gradeStudents.length} student{gradeStudents.length !== 1 ? "s" : ""} — {gradeSubjects.length} subject{gradeSubjects.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetchMatrix()} data-testid="button-refresh-attendance">
                      <RefreshCw className="w-4 h-4 me-2" />
                      Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrintAttendance} data-testid="button-print-attendance">
                      <Printer className="w-4 h-4 me-2" />
                      Print
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="ps-4 min-w-[180px] sticky left-0 bg-background z-10 border-r">Student</TableHead>
                        <TableHead className="min-w-[90px]">Index No.</TableHead>
                        {gradeSubjects.map(subject => (
                          <TableHead key={subject.subjectId} className="text-center min-w-[90px] px-2">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-medium leading-tight">
                                {subject.subjectName.length > 14 ? subject.subjectName.slice(0, 14) + "…" : subject.subjectName}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-normal">
                                {subject.examDate}
                              </span>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradeStudents.map(student => {
                        const name = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
                        const presentForStudent = gradeSubjects.filter(s => student.attendance[s.subjectId]?.isPresent === true).length;
                        const totalForStudent = gradeSubjects.filter(s => student.attendance[s.subjectId] !== null && student.attendance[s.subjectId] !== undefined).length;
                        return (
                          <TableRow key={student.id}>
                            <TableCell className="ps-4 font-medium sticky left-0 bg-background z-10 border-r">
                              <div>
                                <span className="text-sm">{name}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                    Grade {student.grade}
                                  </Badge>
                                  {totalForStudent > 0 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {presentForStudent}/{totalForStudent} present
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {student.indexNumber || "—"}
                            </TableCell>
                            {gradeSubjects.map(subject => {
                              const rec = student.attendance[subject.subjectId];
                              if (rec === null || rec === undefined) {
                                return (
                                  <TableCell key={subject.subjectId} className="text-center px-2 py-2">
                                    <Minus className="w-3.5 h-3.5 text-muted-foreground/40 mx-auto" />
                                  </TableCell>
                                );
                              }
                              if (rec.isPresent) {
                                return (
                                  <TableCell key={subject.subjectId} className="text-center px-2 py-2">
                                    <CheckCircle2 className="w-4 h-4 text-chart-2 mx-auto" />
                                  </TableCell>
                                );
                              }
                              return (
                                <TableCell key={subject.subjectId} className="text-center px-2 py-2">
                                  <XCircle className="w-4 h-4 text-destructive mx-auto" />
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Legend */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-chart-2" /> Present
                </span>
                <span className="flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-destructive" /> Absent
                </span>
                <span className="flex items-center gap-1.5">
                  <Minus className="w-4 h-4 text-muted-foreground/40" /> Not Recorded
                </span>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
