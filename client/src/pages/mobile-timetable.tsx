import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, BookOpen, RefreshCw, WifiOff, MapPin, Package } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import type { ExamYear } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

type ExamStatus = "active" | "conducted" | "scheduled";

function getExamStatus(examDate: string, startTime: string, endTime: string, now: Date): ExamStatus {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const examDay = new Date(examDate + "T00:00:00"); examDay.setHours(0, 0, 0, 0);
  if (examDay < today) return "conducted";
  if (examDay > today) return "scheduled";
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin < sh * 60 + sm) return "scheduled";
  if (nowMin <= eh * 60 + em) return "active";
  return "conducted";
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

function calcDuration(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) return "";
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}

export default function MobileTimetable() {
  const [now, setNow] = useState(() => new Date());
  const [online, setOnline] = useState(navigator.onLine);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const up = () => setOnline(true);
    const dn = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", dn); };
  }, []);

  const { data: examYears = [] } = useQuery<ExamYear[]>({ queryKey: ["/api/exam-years"] });
  const activeYear = (examYears as ExamYear[]).find((y) => y.isActive) || (examYears as ExamYear[])[0];

  // Build scoped query URL based on user role
  const scopeParam = (() => {
    if (!user) return "";
    if ((user as any).centerId) return `&centerId=${(user as any).centerId}`;
    if ((user as any).assignedClusterId) return `&clusterId=${(user as any).assignedClusterId}`;
    if ((user as any).assignedRegionId) return `&regionId=${(user as any).assignedRegionId}`;
    return "";
  })();

  const scheduleUrl = activeYear
    ? `/api/exam-schedules?examYearId=${activeYear.id}&isPublished=true&includePackets=true${scopeParam}`
    : null;

  const { data: entries = [], isLoading, refetch, isFetching } = useQuery<any[]>({
    queryKey: ["/api/exam-schedules", activeYear?.id, scopeParam],
    queryFn: async () => {
      if (!scheduleUrl) return [];
      const res = await fetch(scheduleUrl, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeYear && !!user,
  });

  // Scope label text — use resolved name from auth if available
  const scopeLabel = (() => {
    if (!user) return null;
    const u = user as any;
    if (u.scopeName) return u.scopeName;
    if (u.centerId) return `Center #${u.centerId}`;
    if (u.assignedClusterId) return `Cluster #${u.assignedClusterId}`;
    if (u.assignedRegionId) return `Region #${u.assignedRegionId}`;
    return null; // HQ/admin: no scope label needed
  })();

  const todayStr = now.toISOString().slice(0, 10);

  // Sort dates: today first, then future, then past
  const dates: string[] = Array.from(new Set((entries as any[]).map((e) => e.examDate))).sort() as string[];
  const todayDates = dates.filter((d) => d === todayStr);
  const futureDates = dates.filter((d) => d > todayStr);
  const pastDates = dates.filter((d) => d < todayStr);
  const orderedDates = [...todayDates, ...futureDates, ...pastDates];

  const activeCount = (entries as any[]).filter((e) => getExamStatus(e.examDate, e.startTime, e.endTime, now) === "active").length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 pt-10 pb-5 sticky top-0 z-50 shadow-md">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 opacity-80" />
            <span className="text-lg font-bold tracking-tight">Exam Timetable</span>
          </div>
          <div className="flex items-center gap-2">
            {!online && (
              <span className="flex items-center gap-1 text-xs bg-amber-500 text-white rounded-full px-2 py-0.5">
                <WifiOff className="w-3 h-3" /> Offline
              </span>
            )}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded-full bg-white/15 active:bg-white/30 transition-colors"
              data-testid="button-refresh-timetable"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <p className="text-sm opacity-75">
          {activeYear ? activeYear.name : "No active exam year"}
          {activeCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold bg-green-500 text-white rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
              {activeCount} Active
            </span>
          )}
        </p>
        {scopeLabel && (
          <div className="flex items-center gap-1.5 mt-1.5 text-xs opacity-80">
            <MapPin className="w-3 h-3 shrink-0" />
            <span>Viewing: {scopeLabel}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 px-3 py-4 space-y-4 overflow-y-auto pb-24">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-muted animate-pulse h-28" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
            <BookOpen className="w-12 h-12 opacity-30" />
            <p className="font-medium">No timetable entries</p>
            <p className="text-sm">The exam schedule has not been published yet.</p>
          </div>
        ) : (
          orderedDates.map((date) => {
            const today = new Date(now); today.setHours(0, 0, 0, 0);
            const cardDay = new Date(date + "T00:00:00"); cardDay.setHours(0, 0, 0, 0);
            const isToday = cardDay.getTime() === today.getTime();
            const isPast = cardDay < today;
            const dayEntries = (entries as any[])
              .filter((e) => e.examDate === date)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <div
                key={date}
                className={`rounded-xl border overflow-hidden ${
                  isToday
                    ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                    : isPast
                    ? "border-border/50 bg-muted/30 opacity-75"
                    : "border-border bg-card"
                }`}
              >
                {/* Date header */}
                <div className={`px-4 py-3 flex items-center gap-2 ${isToday ? "bg-primary/10 dark:bg-primary/20" : "bg-muted/40"}`}>
                  <CalendarDays className={`w-4 h-4 shrink-0 ${isToday ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`font-semibold text-sm flex-1 ${isPast && !isToday ? "text-muted-foreground" : ""}`}>
                    {formatDate(date)}
                  </span>
                  {isToday && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">Today</span>
                  )}
                  {isPast && !isToday && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">Past</span>
                  )}
                </div>

                {/* Entries */}
                <div className="divide-y divide-border/60">
                  {dayEntries.map((entry: any) => {
                    const status = getExamStatus(entry.examDate, entry.startTime, entry.endTime, now);
                    const duration = calcDuration(entry.startTime, entry.endTime);
                    return (
                      <div
                        key={entry.id}
                        className={`px-4 py-3 cursor-pointer hover-elevate transition-all ${status === "active" ? "bg-green-50 dark:bg-green-950/30" : ""}`}
                        onClick={() => {
                          setSelectedExam(entry);
                          setSheetOpen(true);
                        }}
                        data-testid={`row-timetable-${entry.id}`}
                      >
                        {/* Status badge + time */}
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span className="font-mono">{entry.startTime} – {entry.endTime}</span>
                            {duration && <span className="text-xs">({duration})</span>}
                          </div>
                          {status === "active" && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                              Active
                            </span>
                          )}
                          {status === "scheduled" && (
                            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              Scheduled
                            </span>
                          )}
                          {status === "conducted" && (
                            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              Conducted
                            </span>
                          )}
                        </div>

                        {/* Subject name */}
                        <div className={`text-base font-semibold leading-tight ${status === "conducted" && !isToday ? "text-muted-foreground" : ""}`}>
                          {entry.subject?.arabicName && (
                            <span className="block text-right font-arabic text-lg leading-tight" dir="rtl">
                              {entry.subject.arabicName}
                            </span>
                          )}
                          {entry.subject?.name && (
                            <span className={entry.subject?.arabicName ? "text-sm text-muted-foreground" : ""}>
                              {entry.subject.name}
                            </span>
                          )}
                          {!entry.subject?.name && !entry.subject?.arabicName && (
                            <span>Subject #{entry.subjectId}</span>
                          )}
                        </div>

                        {/* Grade + Core badges */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            Grade {entry.grade}
                          </span>
                          {entry.subject?.isCore && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                              Core
                            </span>
                          )}
                          {(entry.packets || []).length > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              Tap to view packets
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer timestamp */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm border-t px-4 py-2 text-center text-xs text-muted-foreground">
        Last updated: {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        {" · "}
        {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
      </div>

      {/* Packet Details Sheet */}
      {selectedExam && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="h-[80vh] overflow-y-auto rounded-t-2xl">
            <SheetHeader className="space-y-4 pb-4 border-b">
              {/* Subject details */}
              <div>
                <SheetTitle className="text-2xl leading-tight">
                  {selectedExam.subject?.arabicName && (
                    <span className="block text-right font-arabic text-xl leading-tight mb-1" dir="rtl">
                      {selectedExam.subject.arabicName}
                    </span>
                  )}
                  {selectedExam.subject?.name || selectedExam.subjectName || `Subject ${selectedExam.subjectId}`}
                </SheetTitle>
                <SheetDescription className="text-base mt-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                      Grade {selectedExam.grade}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(selectedExam.examDate + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "long", month: "long", day: "numeric"
                      })}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono">
                      {selectedExam.startTime} – {selectedExam.endTime}
                    </span>
                  </div>
                </SheetDescription>
              </div>
            </SheetHeader>

            {/* Exam Packets Section */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Exam Packets</h3>
              </div>

              {(!selectedExam.packets || selectedExam.packets.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2">
                  <Package className="w-12 h-12 opacity-20" />
                  <p className="font-medium">No packets created yet</p>
                  <p className="text-xs">Packets will appear here once they're prepared for this exam.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedExam.packets.map((packet: any) => (
                    <div
                      key={packet.id}
                      className="flex items-start justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm text-muted-foreground truncate" title={packet.barcode}>
                          {packet.barcode}
                        </div>
                        <div className="text-base font-medium mt-0.5">
                          {packet.centerName || `Center ${packet.centerId}`}
                        </div>
                      </div>
                      <Badge
                        variant={packet.received ? "outline" : "secondary"}
                        className={
                          packet.received
                            ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                            : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                        }
                      >
                        {packet.received ? "Received" : "Not Received"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
